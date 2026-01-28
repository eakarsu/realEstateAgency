import { useState, useEffect } from 'react';
import { teamsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, UserGroupIcon, XMarkIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

export default function TeamsList() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => { loadTeams(); }, []);
  const loadTeams = () => teamsAPI.getAll().then(res => setTeams(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await teamsAPI.create(formData); toast.success('Team created'); setFormData({ name: '', description: '' }); setShowForm(false); loadTeams(); }
    catch (error) { toast.error('Failed to create team'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Teams</h1><p className="text-gray-600">Organize your agents into teams</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />Create Team</button>
      </div>
      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input flex-1" placeholder="Team name" required />
            <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input flex-1" placeholder="Description" />
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="card p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTeam(team)}>
            <div className="flex items-center gap-3 mb-4">
              <UserGroupIcon className="h-10 w-10 text-blue-500" />
              <div><h3 className="font-semibold text-gray-900">{team.name}</h3><p className="text-sm text-gray-500">{team._count?.agents || 0} members</p></div>
            </div>
            {team.description && <p className="text-gray-600 text-sm mb-4">{team.description}</p>}
            <div className="flex -space-x-2">
              {team.agents?.slice(0, 5).map((agent) => (
                <div key={agent.id} className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium">
                  {agent.user?.firstName?.[0]}{agent.user?.lastName?.[0]}
                </div>
              ))}
              {team.agents?.length > 5 && <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">+{team.agents.length - 5}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Team Detail Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedTeam(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <UserGroupIcon className="h-8 w-8 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedTeam.name}</h3>
                    <p className="text-sm text-white/80">{selectedTeam._count?.agents || selectedTeam.agents?.length || 0} members</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTeam(null)} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {selectedTeam.description && (
                  <p className="text-gray-600 mb-6">{selectedTeam.description}</p>
                )}
                <h4 className="font-semibold text-gray-900 mb-4">Team Members</h4>
                {selectedTeam.agents?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTeam.agents.map((agent) => (
                      <div key={agent.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {agent.user?.firstName?.[0]}{agent.user?.lastName?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{agent.user?.firstName} {agent.user?.lastName}</p>
                          <p className="text-sm text-gray-500">{agent.specialization || 'Real Estate Agent'}</p>
                        </div>
                        <div className="flex gap-2">
                          {agent.user?.email && (
                            <a href={`mailto:${agent.user.email}`} className="p-2 text-gray-400 hover:text-blue-600">
                              <EnvelopeIcon className="h-5 w-5" />
                            </a>
                          )}
                          {agent.user?.phone && (
                            <a href={`tel:${agent.user.phone}`} className="p-2 text-gray-400 hover:text-blue-600">
                              <PhoneIcon className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No members in this team yet</p>
                )}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                <button onClick={() => setSelectedTeam(null)} className="btn-primary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
