import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { leadsAPI, leadSourcesAPI, agentsAPI, tagsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import SortableHeader from '../../components/common/SortableHeader';
import useBulkSelect from '../../hooks/useBulkSelect';
import BulkActionBar from '../../components/common/BulkActionBar';
import ExportButton from '../../components/common/ExportButton';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const statusColors = {
  NEW: 'badge-blue',
  CONTACTED: 'badge-gray',
  QUALIFIED: 'badge-green',
  NURTURING: 'badge-purple',
  SHOWING: 'badge-yellow',
  NEGOTIATING: 'badge-orange',
  CLOSED_WON: 'badge-green',
  CLOSED_LOST: 'badge-red'
};

export default function LeadsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [sources, setSources] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    sourceId: '',
    agentId: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  // Sort state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Bulk select
  const { selectedIds, toggleOne, toggleAll, clearSelection, isSelected, isAllSelected, isIndeterminate, selectedCount } = useBulkSelect(leads);

  // Confirm dialog state for single delete
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters, pagination.page, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [leadsRes, sourcesRes, agentsRes, tagsRes] = await Promise.all([
        leadsAPI.getAll({ ...filters, page: pagination.page, limit: pagination.limit, sortBy, sortOrder }),
        leadSourcesAPI.getAll(),
        agentsAPI.getAll(),
        tagsAPI.getAll()
      ]);
      setLeads(leadsRes.data.leads);
      setPagination(prev => ({ ...prev, total: leadsRes.data.total }));
      setSources(sourcesRes.data);
      setAgents(agentsRes.data.agents);
      setTags(tagsRes.data);
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await leadsAPI.delete(deleteId);
      toast.success('Lead deleted');
      setShowDeleteConfirm(false);
      setDeleteId(null);
      loadData();
    } catch (error) {
      toast.error('Failed to delete lead');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await leadsAPI.bulkDelete([...selectedIds]);
      toast.success(`${selectedCount} lead${selectedCount !== 1 ? 's' : ''} deleted`);
      clearSelection();
      loadData();
    } catch (error) {
      toast.error('Failed to delete leads');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage your leads and contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton entity="leads" selectedIds={[...selectedIds]} />
          <Link to="/leads/new" className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Add Lead
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="select"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="NURTURING">Nurturing</option>
            <option value="SHOWING">Showing</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="CLOSED_WON">Closed Won</option>
            <option value="CLOSED_LOST">Closed Lost</option>
          </select>
          <select
            value={filters.sourceId}
            onChange={(e) => handleFilterChange('sourceId', e.target.value)}
            className="select"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <select
              value={filters.agentId}
              onChange={(e) => handleFilterChange('agentId', e.target.value)}
              className="select"
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.user?.firstName} {agent.user?.lastName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : leads.length > 0 ? (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={() => toggleAll()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <SortableHeader label="Name" field="firstName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <th>Contact</th>
                    <th>Source</th>
                    <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <SortableHeader label="Score" field="score" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <th>Agent</th>
                    <SortableHeader label="Created" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                          <div className="flex gap-1 mt-1">
                            {lead.tags?.slice(0, 2).map((t) => (
                              <span
                                key={t.tag.id}
                                className="inline-block px-2 py-0.5 text-xs rounded-full"
                                style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                              >
                                {t.tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <EnvelopeIcon className="h-4 w-4" />
                            {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <PhoneIcon className="h-4 w-4" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{lead.source?.name || '-'}</td>
                      <td>
                        <span className={`badge ${statusColors[lead.status]}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                lead.score >= 70 ? 'bg-green-500' :
                                lead.score >= 40 ? 'bg-yellow-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-sm">{lead.score}</span>
                        </div>
                      </td>
                      <td>
                        {lead.agent ? (
                          <span>{lead.agent.user?.firstName} {lead.agent.user?.lastName}</span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="text-gray-500 text-sm">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No leads found</p>
            <Link to="/leads/new" className="btn-primary">Add your first lead</Link>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar selectedCount={selectedCount} onDelete={handleBulkDelete} onClear={clearSelection} />

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
        onConfirm={confirmDelete}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
