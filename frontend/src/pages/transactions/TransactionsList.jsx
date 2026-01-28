import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { transactionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

const statusColors = { INITIATED: 'badge-gray', UNDER_CONTRACT: 'badge-blue', PENDING: 'badge-yellow', CONTINGENT: 'badge-purple', CLEAR_TO_CLOSE: 'badge-green', CLOSED: 'badge-green', CANCELLED: 'badge-red', EXPIRED: 'badge-red' };

export default function TransactionsList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '' });

  useEffect(() => { loadTransactions(); }, [filters]);

  const loadTransactions = async () => {
    try {
      const res = await transactionsAPI.getAll(filters);
      setTransactions(res.data.transactions);
    } catch (error) { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Transactions</h1><p className="text-gray-600">Manage your deals and closings</p></div>
        <Link to="/transactions/new" className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />New Transaction</Link>
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
            <thead><tr><th>Property</th><th>Type</th><th>Status</th><th>List Price</th><th>Closing Date</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/transactions/${t.id}`)}>
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
    </div>
  );
}
