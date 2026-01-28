import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { transactionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PencilIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTransaction(); }, [id]);

  const loadTransaction = async () => {
    try { const res = await transactionsAPI.getById(id); setTransaction(res.data); }
    catch (error) { toast.error('Failed to load transaction'); navigate('/transactions'); }
    finally { setLoading(false); }
  };

  const handleMilestoneComplete = async (milestoneId) => {
    try {
      await transactionsAPI.updateMilestone(id, milestoneId, { completedAt: new Date().toISOString() });
      toast.success('Milestone completed');
      loadTransaction();
    } catch (error) { toast.error('Failed to update milestone'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!transaction) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/transactions" className="text-blue-600 hover:underline text-sm">&larr; Back to Transactions</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{transaction.property?.address}</h1>
          <p className="text-gray-600">{transaction.property?.city}, {transaction.property?.state}</p>
        </div>
        <Link to={`/transactions/${id}/edit`} className="btn-secondary flex items-center gap-2"><PencilIcon className="h-5 w-5" />Edit</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Transaction Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Type</p><p className="font-medium">{transaction.type}</p></div>
              <div><p className="text-sm text-gray-500">Status</p><p className="font-medium">{transaction.status.replace('_', ' ')}</p></div>
              <div><p className="text-sm text-gray-500">List Price</p><p className="font-medium">${transaction.listPrice?.toLocaleString()}</p></div>
              <div><p className="text-sm text-gray-500">Sale Price</p><p className="font-medium">{transaction.salePrice ? `$${transaction.salePrice.toLocaleString()}` : '-'}</p></div>
              <div><p className="text-sm text-gray-500">Closing Date</p><p className="font-medium">{transaction.closingDate ? new Date(transaction.closingDate).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-sm text-gray-500">Financing</p><p className="font-medium">{transaction.financingType || '-'}</p></div>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Milestones</h2>
            <div className="space-y-3">
              {transaction.milestones?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <button onClick={() => !m.completedAt && handleMilestoneComplete(m.id)} disabled={!!m.completedAt}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${m.completedAt ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-blue-500'}`}>
                    {m.completedAt && <CheckIcon className="h-4 w-4" />}
                  </button>
                  <span className={m.completedAt ? 'line-through text-gray-400' : ''}>{m.name}</span>
                  {m.completedAt && <span className="text-xs text-gray-400 ml-auto">{new Date(m.completedAt).toLocaleDateString()}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Documents ({transaction.documents?.length || 0})</h2>
            {transaction.documents?.length > 0 ? (
              <div className="space-y-2">
                {transaction.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>{doc.name}</span>
                    <span className="badge badge-gray">{doc.signatureStatus.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-center py-4">No documents yet</p>}
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Parties</h2>
            <div className="space-y-4">
              {transaction.buyerName && (<div><p className="text-sm text-gray-500">Buyer</p><p className="font-medium">{transaction.buyerName}</p><p className="text-sm text-gray-500">{transaction.buyerEmail}</p></div>)}
              {transaction.sellerName && (<div><p className="text-sm text-gray-500">Seller</p><p className="font-medium">{transaction.sellerName}</p><p className="text-sm text-gray-500">{transaction.sellerEmail}</p></div>)}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Tasks ({transaction.tasks?.filter(t => t.status !== 'COMPLETED').length || 0})</h2>
            {transaction.tasks?.filter(t => t.status !== 'COMPLETED').slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                <span className={`w-2 h-2 rounded-full ${task.priority === 'URGENT' ? 'bg-red-500' : task.priority === 'HIGH' ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                <span className="text-sm">{task.title}</span>
              </div>
            )) || <p className="text-gray-500 text-sm">No pending tasks</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
