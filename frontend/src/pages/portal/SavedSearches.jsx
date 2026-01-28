import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { savedSearchesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, TrashIcon, BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';

export default function SavedSearches() {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    savedSearchesAPI.getAll()
      .then(res => setSearches(res.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this saved search?')) return;
    try {
      await savedSearchesAPI.delete(id);
      setSearches(prev => prev.filter(s => s.id !== id));
      toast.success('Search deleted');
    } catch (error) { toast.error('Failed'); }
  };

  const handleToggleAlerts = async (id, currentState) => {
    try {
      await savedSearchesAPI.update(id, { alertsEnabled: !currentState });
      setSearches(prev => prev.map(s => s.id === id ? {...s, alertsEnabled: !currentState} : s));
      toast.success(currentState ? 'Alerts disabled' : 'Alerts enabled');
    } catch (error) { toast.error('Failed'); }
  };

  const formatCriteria = (criteria) => {
    if (!criteria) return 'No criteria';
    const parts = [];
    if (criteria.city) parts.push(criteria.city);
    if (criteria.minPrice || criteria.maxPrice) {
      const min = criteria.minPrice ? `$${Number(criteria.minPrice).toLocaleString()}` : '';
      const max = criteria.maxPrice ? `$${Number(criteria.maxPrice).toLocaleString()}` : '';
      parts.push(`${min} - ${max}`.replace(/^ - /, '').replace(/ - $/, ''));
    }
    if (criteria.bedrooms) parts.push(`${criteria.bedrooms}+ beds`);
    if (criteria.bathrooms) parts.push(`${criteria.bathrooms}+ baths`);
    if (criteria.propertyType) parts.push(criteria.propertyType.replace('_', ' '));
    return parts.length > 0 ? parts.join(' | ') : 'All properties';
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>
          <p className="text-gray-600">Get notified when new properties match your criteria</p>
        </div>
        <Link to="/portal/search" className="btn-primary flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5" />New Search
        </Link>
      </div>

      {searches.length > 0 ? (
        <div className="space-y-4">
          {searches.map((search) => (
            <div key={search.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{search.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{formatCriteria(search.criteria)}</p>
                  <p className="text-xs text-gray-400 mt-2">Created {new Date(search.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleAlerts(search.id, search.alertsEnabled)} className={`p-2 rounded-lg transition-colors ${search.alertsEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`} title={search.alertsEnabled ? 'Disable alerts' : 'Enable alerts'}>
                    {search.alertsEnabled ? <BellIcon className="h-5 w-5" /> : <BellSlashIcon className="h-5 w-5" />}
                  </button>
                  <Link to={`/portal/search?${new URLSearchParams(search.criteria || {}).toString()}`} className="btn-secondary">
                    Run Search
                  </Link>
                  <button onClick={() => handleDelete(search.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved searches</h3>
          <p className="text-gray-500 mb-4">Save your searches to get notified when new properties match</p>
          <Link to="/portal/search" className="btn-primary">Search Properties</Link>
        </div>
      )}
    </div>
  );
}
