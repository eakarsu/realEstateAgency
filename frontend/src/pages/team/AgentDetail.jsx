import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { UserCircleIcon } from '@heroicons/react/24/outline';

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { agentsAPI.getById(id).then(res => setAgent(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!agent) return null;

  return (
    <div>
      <Link to="/agents" className="text-blue-600 hover:underline text-sm">&larr; Back to Agents</Link>
      <div className="card p-6 mt-4">
        <div className="flex items-center gap-6">
          <UserCircleIcon className="h-24 w-24 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.user?.firstName} {agent.user?.lastName}</h1>
            <p className="text-gray-600">{agent.user?.email}</p>
            {agent.licenseNumber && <p className="text-sm text-gray-500 mt-1">License: {agent.licenseNumber}</p>}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{agent._count?.leads || 0}</p><p className="text-sm text-gray-500">Leads</p></div>
          <div className="text-center p-4 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{agent._count?.properties || 0}</p><p className="text-sm text-gray-500">Listings</p></div>
          <div className="text-center p-4 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{agent._count?.transactions || 0}</p><p className="text-sm text-gray-500">Transactions</p></div>
          <div className="text-center p-4 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{agent.yearsExperience || 0}</p><p className="text-sm text-gray-500">Years Exp</p></div>
        </div>
        {agent.bio && <div className="mt-6"><h2 className="font-semibold mb-2">Bio</h2><p className="text-gray-700">{agent.bio}</p></div>}
        {agent.specializations?.length > 0 && <div className="mt-4"><h2 className="font-semibold mb-2">Specializations</h2><div className="flex gap-2">{agent.specializations.map((s, i) => <span key={i} className="badge badge-blue">{s}</span>)}</div></div>}
      </div>
    </div>
  );
}
