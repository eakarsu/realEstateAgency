import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showingsAPI, propertiesAPI, leadsAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AIResponseModal from '../../components/AIResponseModal';
import SortableHeader from '../../components/common/SortableHeader';
import BulkActionBar from '../../components/common/BulkActionBar';
import useBulkSelect from '../../hooks/useBulkSelect';
import { PlusIcon, CalendarIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

const statusColors = { SCHEDULED: 'badge-blue', CONFIRMED: 'badge-green', COMPLETED: 'badge-gray', CANCELLED: 'badge-red', NO_SHOW: 'badge-yellow' };

export default function ShowingsList() {
  const navigate = useNavigate();
  const [showings, setShowings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ propertyId: '', leadId: '', scheduledAt: '', duration: 30 });
  const [showAIScheduler, setShowAIScheduler] = useState(false);
  const [aiSchedulerData, setAiSchedulerData] = useState({ propertyId: '', leadId: '' });
  const [aiScheduling, setAiScheduling] = useState(false);
  const [aiModal, setAiModal] = useState({ isOpen: false, data: null });
  const [sortBy, setSortBy] = useState('scheduledAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const { selectedIds, toggleOne, toggleAll, clearSelection, isSelected, isAllSelected, isIndeterminate, selectedCount } = useBulkSelect(showings);

  useEffect(() => { Promise.all([showingsAPI.getAll(), propertiesAPI.getAll({ status: 'ACTIVE' }), leadsAPI.getAll()]).then(([s, p, l]) => { setShowings(s.data.showings); setProperties(p.data.properties); setLeads(l.data.leads); }).finally(() => setLoading(false)); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await showingsAPI.create(formData); toast.success('Showing scheduled'); setShowForm(false); showingsAPI.getAll().then(res => setShowings(res.data.showings)); }
    catch (error) { toast.error('Failed'); }
  };

  const handleComplete = async (id) => {
    try { await showingsAPI.update(id, { status: 'COMPLETED' }); toast.success('Completed'); showingsAPI.getAll().then(res => setShowings(res.data.showings)); }
    catch (error) { toast.error('Failed'); }
  };

  const handleAIScheduler = async (e) => {
    e.preventDefault();
    if (!aiSchedulerData.propertyId) {
      toast.error('Please select a property');
      return;
    }
    setAiScheduling(true);
    try {
      const property = properties.find(p => p.id === aiSchedulerData.propertyId);
      const lead = leads.find(l => l.id === aiSchedulerData.leadId);
      const res = await aiAPI.scheduleShowing({
        propertyId: aiSchedulerData.propertyId,
        leadId: aiSchedulerData.leadId,
        propertyAddress: property?.address,
        leadName: lead ? `${lead.firstName} ${lead.lastName}` : 'General Buyer',
        leadPreferences: lead?.timeline || 'Flexible'
      });
      setAiModal({ isOpen: true, data: res.data });
      setShowAIScheduler(false);
      setAiSchedulerData({ propertyId: '', leadId: '' });
    } catch (error) {
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiScheduling(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedShowings = [...showings].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'property': aVal = a.property?.address || ''; bVal = b.property?.address || ''; break;
      case 'scheduledAt': aVal = a.scheduledAt || ''; bVal = b.scheduledAt || ''; break;
      case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
      default: aVal = ''; bVal = '';
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleBulkDelete = async () => {
    try {
      await showingsAPI.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} showings deleted`);
      clearSelection();
      // reload showings
      const res = await showingsAPI.getAll();
      setShowings(res.data.showings);
    } catch (error) {
      toast.error('Failed to delete showings');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Showings</h1><p className="text-gray-600">Manage property showings</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAIScheduler(true)} className="btn-secondary flex items-center gap-2"><SparklesIcon className="h-5 w-5" />AI Scheduler</button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />Schedule Showing</button>
        </div>
      </div>
      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
            <select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="select" required>
              <option value="">Select property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
            <select value={formData.leadId} onChange={(e) => setFormData({ ...formData, leadId: e.target.value })} className="select">
              <option value="">Select lead</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
            </select>
            <input type="datetime-local" value={formData.scheduledAt} onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} className="input" required />
            <select value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} className="select">
              <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hour</option>
            </select>
            <div className="col-span-4 flex gap-2"><button type="submit" className="btn-primary">Schedule</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 w-12">
                <input type="checkbox" checked={isAllSelected} ref={el => { if (el) el.indeterminate = isIndeterminate; }} onChange={toggleAll} className="rounded border-gray-300" />
              </th>
              <SortableHeader label="Property" field="property" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Client</th>
              <SortableHeader label="Date/Time" field="scheduledAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedShowings.map((s) => (
              <tr key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => s.property?.id && navigate(`/properties/${s.property.id}`)}>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected(s.id)} onChange={() => toggleOne(s.id)} className="rounded border-gray-300" />
                </td>
                <td><p className="font-medium">{s.property?.address}</p><p className="text-sm text-gray-500">{s.property?.city}</p></td>
                <td onClick={(e) => { e.stopPropagation(); if(s.lead?.id) navigate(`/leads/${s.lead.id}`); }} className="cursor-pointer hover:text-blue-600">{s.lead ? `${s.lead.firstName} ${s.lead.lastName}` : '-'}</td>
                <td>{new Date(s.scheduledAt).toLocaleString()}</td>
                <td><span className={`badge ${statusColors[s.status]}`}>{s.status}</span></td>
                <td onClick={(e) => e.stopPropagation()}>{s.status === 'SCHEDULED' || s.status === 'CONFIRMED' ? <button onClick={() => handleComplete(s.id)} className="text-green-600 hover:underline text-sm">Complete</button> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {showings.length === 0 && <div className="text-center py-12 text-gray-500">No showings scheduled</div>}
      </div>

      {/* AI Scheduler Modal */}
      {showAIScheduler && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAIScheduler(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">AI Smart Scheduler</h3>
                </div>
                <button onClick={() => setShowAIScheduler(false)} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAIScheduler} className="p-6 space-y-4">
                <p className="text-gray-600 text-sm">Let AI suggest the best times for your property showing based on buyer preferences and market patterns.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                  <select
                    value={aiSchedulerData.propertyId}
                    onChange={(e) => setAiSchedulerData({ ...aiSchedulerData, propertyId: e.target.value })}
                    className="select"
                    required
                  >
                    <option value="">Select a property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead (Optional)</label>
                  <select
                    value={aiSchedulerData.leadId}
                    onChange={(e) => setAiSchedulerData({ ...aiSchedulerData, leadId: e.target.value })}
                    className="select"
                  >
                    <option value="">Select a lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={aiScheduling}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="h-5 w-5" />
                  {aiScheduling ? 'Finding Best Times...' : 'Get AI Suggestions'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <AIResponseModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ isOpen: false, data: null })}
        title="AI Showing Time Suggestions"
        data={aiModal.data}
        type="showing-scheduler"
      />

      <BulkActionBar selectedCount={selectedCount} onDelete={handleBulkDelete} onClearSelection={clearSelection} entityName="showings" />
    </div>
  );
}
