import { useState, useEffect } from 'react';
import { integrationsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { LinkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { Promise.all([integrationsAPI.getAll(), integrationsAPI.getAvailable()]).then(([i, a]) => { setIntegrations(i.data); setAvailable(a.data); }).catch(() => toast.error('Failed')).finally(() => setLoading(false)); }, []);

  const handleToggle = async (id, isActive) => {
    try {
      if (isActive) await integrationsAPI.deactivate(id);
      else await integrationsAPI.activate(id);
      toast.success(isActive ? 'Deactivated' : 'Activated');
      integrationsAPI.getAll().then(res => setIntegrations(res.data));
    } catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Integrations</h1><p className="text-gray-600">Connect with third-party services</p></div>
      {integrations.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Connected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((i) => (
              <div key={i.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-8 w-8 text-blue-500" />
                  <div><p className="font-medium">{i.name}</p><p className="text-xs text-gray-500">{i.provider}</p></div>
                </div>
                <button onClick={() => handleToggle(i.id, i.isActive)} className={`${i.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                  {i.isActive ? <CheckCircleIcon className="h-6 w-6" /> : <XCircleIcon className="h-6 w-6" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <h2 className="font-semibold text-gray-900 mb-4">Available Integrations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {available.map((i) => (
          <div key={i.id} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <LinkIcon className="h-8 w-8 text-gray-400" />
              <div><p className="font-medium">{i.name}</p><p className="text-xs text-gray-500">{i.type}</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{i.description}</p>
            <button className="btn-secondary w-full text-sm">Configure</button>
          </div>
        ))}
      </div>
    </div>
  );
}
