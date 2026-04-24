import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { agentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import ExportButton from '../../components/common/ExportButton';

export default function AgentsList() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    agentsAPI.getAll().then(res => setAgents(res.data.agents)).catch(() => toast.error('Failed to load agents')).finally(() => setLoading(false));
  }, []);

  const sortedAgents = [...agents].sort((a, b) => {
    switch (sortBy) {
      case 'name': {
        const aName = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`;
        const bName = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`;
        return aName.localeCompare(bName);
      }
      case 'leads': return (b._count?.leads || 0) - (a._count?.leads || 0);
      case 'listings': return (b._count?.properties || 0) - (a._count?.properties || 0);
      case 'transactions': return (b._count?.transactions || 0) - (a._count?.transactions || 0);
      default: return 0;
    }
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Agents</h1><p className="text-gray-600">View and manage your team</p></div>
        <div className="flex items-center gap-3">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select w-44">
            <option value="name">Sort by Name</option>
            <option value="leads">Sort by Leads</option>
            <option value="listings">Sort by Listings</option>
            <option value="transactions">Sort by Transactions</option>
          </select>
          <ExportButton entity="agents" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAgents.map((agent) => (
          <div key={agent.id} onClick={() => navigate(`/agents/${agent.id}`)} className="card p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <UserCircleIcon className="h-16 w-16 text-gray-400" />
              <div><p className="font-semibold text-gray-900">{agent.user?.firstName} {agent.user?.lastName}</p>
                <p className="text-sm text-gray-500">{agent.user?.email}</p>
                {agent.team && <p className="text-xs text-blue-600 mt-1">{agent.team.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div><p className="text-xl font-bold">{agent._count?.leads || 0}</p><p className="text-xs text-gray-500">Leads</p></div>
              <div><p className="text-xl font-bold">{agent._count?.properties || 0}</p><p className="text-xs text-gray-500">Listings</p></div>
              <div><p className="text-xl font-bold">{agent._count?.transactions || 0}</p><p className="text-xs text-gray-500">Transactions</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
