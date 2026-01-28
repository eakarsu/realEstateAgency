import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { favoritesAPI, savedSearchesAPI, messagesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HomeIcon, HeartIcon, MagnifyingGlassIcon, EnvelopeIcon, DocumentIcon } from '@heroicons/react/24/outline';

export default function ClientPortal() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ favorites: 0, savedSearches: 0, messages: 0 });
  const [recentFavorites, setRecentFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      favoritesAPI.getAll(),
      savedSearchesAPI.getAll(),
      messagesAPI.getAll()
    ]).then(([fav, searches, msgs]) => {
      setStats({
        favorites: fav.data.length,
        savedSearches: searches.data.length,
        messages: msgs.data.filter(m => !m.isRead).length
      });
      setRecentFavorites(fav.data.slice(0, 4));
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName}!</h1>
        <p className="text-gray-600">Your personal real estate portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/portal/favorites" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg"><HeartIcon className="h-6 w-6 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.favorites}</p>
              <p className="text-sm text-gray-500">Favorite Properties</p>
            </div>
          </div>
        </Link>
        <Link to="/portal/saved-searches" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg"><MagnifyingGlassIcon className="h-6 w-6 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.savedSearches}</p>
              <p className="text-sm text-gray-500">Saved Searches</p>
            </div>
          </div>
        </Link>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg"><EnvelopeIcon className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.messages}</p>
              <p className="text-sm text-gray-500">Unread Messages</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/portal/search" className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <HomeIcon className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Search Properties</span>
            </Link>
            <Link to="/portal/favorites" className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <HeartIcon className="h-8 w-8 text-red-600 mb-2" />
              <span className="text-sm font-medium">View Favorites</span>
            </Link>
            <Link to="/portal/saved-searches" className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <MagnifyingGlassIcon className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">Saved Searches</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <DocumentIcon className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">My Documents</span>
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Favorites</h2>
            <Link to="/portal/favorites" className="text-blue-600 text-sm hover:underline">View All</Link>
          </div>
          {recentFavorites.length > 0 ? (
            <div className="space-y-3">
              {recentFavorites.map((fav) => (
                <Link key={fav.id} to={`/properties/${fav.propertyId}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden">
                    {fav.property?.photos?.[0] ? (
                      <img src={fav.property.photos[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><HomeIcon className="h-6 w-6 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{fav.property?.address}</p>
                    <p className="text-xs text-gray-500">${fav.property?.price?.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No favorites yet. Start searching!</p>
          )}
        </div>
      </div>
    </div>
  );
}
