import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { campaignsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, PaperAirplaneIcon, PauseIcon } from '@heroicons/react/24/outline';

const statusColors = { DRAFT: 'badge-gray', SCHEDULED: 'badge-blue', ACTIVE: 'badge-green', PAUSED: 'badge-yellow', COMPLETED: 'badge-purple' };

export default function CampaignsList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCampaigns(); }, []);
  const loadCampaigns = () => campaignsAPI.getAll().then(res => setCampaigns(res.data.campaigns)).catch(() => toast.error('Failed')).finally(() => setLoading(false));

  const handleLaunch = async (id) => {
    try { await campaignsAPI.launch(id); toast.success('Campaign launched'); loadCampaigns(); }
    catch (error) { toast.error('Failed to launch'); }
  };

  const handlePause = async (id) => {
    try { await campaignsAPI.pause(id); toast.success('Campaign paused'); loadCampaigns(); }
    catch (error) { toast.error('Failed to pause'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Campaigns</h1><p className="text-gray-600">Manage your marketing campaigns</p></div>
        <Link to="/campaigns/new" className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />Create Campaign</Link>
      </div>
      <div className="card overflow-hidden">
        {campaigns.length > 0 ? (
          <table className="table">
            <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/campaigns/${c.id}/edit`)}>
                  <td><p className="font-medium">{c.name}</p><p className="text-sm text-gray-500">{c.subject}</p></td>
                  <td>{c.type}</td>
                  <td><span className={`badge ${statusColors[c.status]}`}>{c.status}</span></td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/campaigns/${c.id}/edit`} className="text-blue-600 hover:underline text-sm">Edit</Link>
                    {c.status === 'DRAFT' && <button onClick={() => handleLaunch(c.id)} className="text-green-600 hover:underline text-sm">Launch</button>}
                    {c.status === 'ACTIVE' && <button onClick={() => handlePause(c.id)} className="text-yellow-600 hover:underline text-sm">Pause</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="text-center py-12"><p className="text-gray-500 mb-4">No campaigns yet</p><Link to="/campaigns/new" className="btn-primary">Create your first campaign</Link></div>}
      </div>
    </div>
  );
}
