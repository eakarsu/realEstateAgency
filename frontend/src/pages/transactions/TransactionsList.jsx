import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transactionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';
import SortableHeader from '../../components/common/SortableHeader';
import useBulkSelect from '../../hooks/useBulkSelect';
import BulkActionBar from '../../components/common/BulkActionBar';
import ExportButton from '../../components/common/ExportButton';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const statusColors = { INITIATED: 'badge-gray', UNDER_CONTRACT: 'badge-blue', PENDING: 'badge-yellow', CONTINGENT: 'badge-purple', CLEAR_TO_CLOSE: 'badge-green', CLOSED: 'badge-green', CANCELLED: 'badge-red', EXPIRED: 'badge-red' };

export default function TransactionsList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const { selectedIds, toggleOne, toggleAll, clearSelection, isSelected, isAllSelected, isIndeterminate, selectedCount } = useBulkSelect(transactions);

  useEffect(() => { loadTransactions(); }, [filters, sortBy, sortOrder]);

  const loadTransactions = async () => {
    try {
      const params = { ...filters };
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }
      const res = await transactionsAPI.getAll(params);
      setTransactions(res.data.transactions);
    } catch (error) { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await transactionsAPI.bulkDelete([...selectedIds]);
      toast.success(`Deleted ${selectedIds.size} transaction${selectedIds.size !== 1 ? 's' : ''}`);
      clearSelection();
      loadTransactions();
    } catch (error) {
      toast.error('Failed to delete transactions');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Transactions</h1><p className="text-gray-600">Manage your deals and closings</p></div>
        <div className="flex items-center gap-3">
          <ExportButton entity="transactions" selectedIds={[...selectedIds]} />
          <Link to="/transactions/new" className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />New Transaction</Link>
        </div>
      </div>
      <div className="card p-4 mb-6">
        <div className="flex gap-4">
          <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="select">
            <option value="">All Statuses</option>
            <option value="INITIATED">Initiated</option><option value="UNDER_CONTRACT">Under Contract</option>
            <option value="PENDING">Pending</option><option value="CLOSED">Closed</option>
          </select>
          <select value={filters.type} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))} className="select">
            <option value="">All Types</option>
            <option value="LISTING">Listing</option><option value="BUYER">Buyer</option><option value="DUAL">Dual</option>
          </select>
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> :
        transactions.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th>Property</th>
                <SortableHeader label="Type" field="type" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="List Price" field="listPrice" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Closing Date" field="closingDate" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((t) => (
                <tr key={t.id} className={`cursor-pointer hover:bg-gray-50 ${isSelected(t.id) ? 'bg-blue-50' : ''}`} onClick={() => navigate(`/transactions/${t.id}`)}>
                  <td className="px-6 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td><p className="font-medium">{t.property?.address}</p><p className="text-sm text-gray-500">{t.property?.city}</p></td>
                  <td>{t.type}</td>
                  <td><span className={`badge ${statusColors[t.status]}`}>{t.status.replace('_', ' ')}</span></td>
                  <td>${t.listPrice?.toLocaleString()}</td>
                  <td>{t.closingDate ? new Date(t.closingDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-center py-12"><p className="text-gray-500 mb-4">No transactions found</p><Link to="/transactions/new" className="btn-primary">Create your first transaction</Link></div>}
      </div>

      <BulkActionBar
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Confirm"
        variant="danger"
      />
    </div>
  );
}
