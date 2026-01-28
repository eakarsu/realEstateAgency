import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { XMarkIcon, UserIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function PerformanceReports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => { dashboardAPI.getPerformance().then(res => setData(res.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1><p className="text-gray-600">Track your performance metrics</p></div>
      {data?.type === 'team' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.agents?.map((agent) => (
            <div key={agent.id} className="card p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAgent(agent)}>
              <h3 className="font-semibold text-gray-900 mb-4">{agent.user?.firstName} {agent.user?.lastName}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-2xl font-bold text-blue-600">{agent._count?.leads || 0}</p><p className="text-xs text-gray-500">Leads</p></div>
                <div><p className="text-2xl font-bold text-green-600">{agent._count?.transactions || 0}</p><p className="text-xs text-gray-500">Transactions</p></div>
              </div>
              {agent.performanceMetrics?.[0] && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Latest Period: {agent.performanceMetrics[0].period}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Volume: ${((agent.performanceMetrics[0].totalVolume || 0) / 1000000).toFixed(1)}M</p>
                    <p>Commission: ${((agent.performanceMetrics[0].totalCommission || 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Performance</h3>
          {data?.metrics?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Period</th><th>Listings Sold</th><th>Volume</th><th>Commission</th><th>Leads</th></tr></thead>
                <tbody className="divide-y">
                  {data.metrics.map((m) => (
                    <tr key={m.id}><td>{m.period}</td><td>{m.listingsSold}</td><td>${(m.totalVolume / 1000000).toFixed(2)}M</td><td>${(m.totalCommission / 1000).toFixed(0)}K</td><td>{m.leadsConverted}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-500 text-center py-8">No performance data yet</p>}
        </div>
      )}

      {/* Agent Performance Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedAgent(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-green-600 to-blue-600 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <UserIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedAgent.user?.firstName} {selectedAgent.user?.lastName}</h3>
                    <p className="text-sm text-white/80">{selectedAgent.specialization || 'Real Estate Agent'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{selectedAgent._count?.leads || 0}</p>
                    <p className="text-xs text-gray-500">Leads</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{selectedAgent._count?.transactions || 0}</p>
                    <p className="text-xs text-gray-500">Transactions</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{selectedAgent._count?.properties || 0}</p>
                    <p className="text-xs text-gray-500">Properties</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{selectedAgent._count?.showings || 0}</p>
                    <p className="text-xs text-gray-500">Showings</p>
                  </div>
                </div>

                {/* Performance History */}
                {selectedAgent.performanceMetrics?.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ChartBarIcon className="h-5 w-5" /> Performance History
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Listings Sold</th>
                            <th>Volume</th>
                            <th>Commission</th>
                            <th>Leads Converted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedAgent.performanceMetrics.map((m) => (
                            <tr key={m.id}>
                              <td className="font-medium">{m.period}</td>
                              <td>{m.listingsSold || 0}</td>
                              <td>${((m.totalVolume || 0) / 1000000).toFixed(2)}M</td>
                              <td>${((m.totalCommission || 0) / 1000).toFixed(0)}K</td>
                              <td>{m.leadsConverted || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No performance history available</p>
                )}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                <button onClick={() => setSelectedAgent(null)} className="btn-primary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
