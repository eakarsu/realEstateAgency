import { useState, useEffect } from 'react';
import { commissionsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { XMarkIcon, CurrencyDollarIcon, HomeIcon, UserIcon } from '@heroicons/react/24/outline';
import SortableHeader from '../../components/common/SortableHeader';
import ExportButton from '../../components/common/ExportButton';

export default function CommissionsReport() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    Promise.all([
      commissionsAPI.getAll(),
      user?.agentId ? commissionsAPI.getSummary(user.agentId) : Promise.resolve({ data: null })
    ]).then(([c, s]) => { setCommissions(c.data.commissions); setSummary(s.data); }).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, [user]);

  const sortedCommissions = [...commissions].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'amount': aVal = a.amount || 0; bVal = b.amount || 0; break;
      case 'splitAmount': aVal = a.splitAmount || 0; bVal = b.splitAmount || 0; break;
      case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
      case 'createdAt': aVal = a.createdAt || ''; bVal = b.createdAt || ''; break;
      case 'type': aVal = a.type || ''; bVal = b.type || ''; break;
      default: aVal = ''; bVal = '';
    }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Commissions</h1><p className="text-gray-600">Track your earnings</p></div>
        <ExportButton entity="commissions" />
      </div>
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card p-6"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">${(summary.pending?.amount || 0).toLocaleString()}</p><p className="text-xs text-gray-500">{summary.pending?.count || 0} transactions</p></div>
          <div className="card p-6"><p className="text-sm text-gray-500">Paid This Year</p><p className="text-2xl font-bold text-green-600">${(summary.paid?.amount || 0).toLocaleString()}</p><p className="text-xs text-gray-500">{summary.paid?.count || 0} transactions</p></div>
          <div className="card p-6"><p className="text-sm text-gray-500">Year to Date</p><p className="text-2xl font-bold text-blue-600">${(summary.yearToDate || 0).toLocaleString()}</p></div>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Property</th>
              <SortableHeader label="Type" field="type" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Amount" field="amount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Your Split" field="splitAmount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortableHeader label="Date" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedCommissions.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedCommission(c)}>
                <td><p className="font-medium">{c.transaction?.property?.address}</p><p className="text-sm text-gray-500">{c.transaction?.property?.city}</p></td>
                <td>{c.type}</td>
                <td>${c.amount?.toLocaleString()}</td>
                <td><p className="font-medium">${c.splitAmount?.toLocaleString()}</p><p className="text-xs text-gray-500">{c.splitPercentage}%</p></td>
                <td><span className={`badge ${c.status === 'PAID' ? 'badge-green' : c.status === 'APPROVED' ? 'badge-blue' : 'badge-yellow'}`}>{c.status}</span></td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {commissions.length === 0 && <div className="text-center py-12 text-gray-500">No commissions yet</div>}
      </div>

      {/* Commission Detail Modal */}
      {selectedCommission && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedCommission(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <CurrencyDollarIcon className="h-8 w-8 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Commission Details</h3>
                    <p className="text-sm text-white/80">{selectedCommission.type}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCommission(null)} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Amount Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">${selectedCommission.splitAmount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Your Commission</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-gray-600">${selectedCommission.amount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total Amount</p>
                  </div>
                </div>

                {/* Property Info */}
                {selectedCommission.transaction?.property && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HomeIcon className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Property</span>
                    </div>
                    <p className="font-medium">{selectedCommission.transaction.property.address}</p>
                    <p className="text-sm text-gray-600">{selectedCommission.transaction.property.city}, {selectedCommission.transaction.property.state}</p>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Status</span>
                    <span className={`badge ${selectedCommission.status === 'PAID' ? 'badge-green' : selectedCommission.status === 'APPROVED' ? 'badge-blue' : 'badge-yellow'}`}>{selectedCommission.status}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Split Percentage</span>
                    <span className="font-medium">{selectedCommission.splitPercentage}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Commission Type</span>
                    <span className="font-medium">{selectedCommission.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{new Date(selectedCommission.createdAt).toLocaleDateString()}</span>
                  </div>
                  {selectedCommission.paidAt && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Paid On</span>
                      <span className="font-medium">{new Date(selectedCommission.paidAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Agent Info */}
                {selectedCommission.agent && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="h-5 w-5 text-gray-600" />
                      <span className="font-semibold text-gray-800">Agent</span>
                    </div>
                    <p className="font-medium">{selectedCommission.agent.user?.firstName} {selectedCommission.agent.user?.lastName}</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                <button onClick={() => setSelectedCommission(null)} className="btn-primary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
