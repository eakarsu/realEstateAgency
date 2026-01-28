import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favoritesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { HeartIcon, MapPinIcon, HomeIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    favoritesAPI.getAll()
      .then(res => setFavorites(res.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (propertyId) => {
    try {
      await favoritesAPI.remove(propertyId);
      setFavorites(prev => prev.filter(f => f.propertyId !== propertyId));
      toast.success('Removed from favorites');
    } catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
        <p className="text-gray-600">Properties you've saved</p>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fav) => (
            <div key={fav.id} className="card overflow-hidden">
              <div className="relative h-48 bg-gray-200">
                {fav.property?.photos?.[0] ? (
                  <img src={fav.property.photos[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><HomeIcon className="h-12 w-12 text-gray-400" /></div>
                )}
                <button onClick={() => handleRemove(fav.propertyId)} className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-red-50 transition-colors">
                  <TrashIcon className="h-5 w-5 text-red-500" />
                </button>
                <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded ${fav.property?.status === 'ACTIVE' ? 'bg-green-500 text-white' : fav.property?.status === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {fav.property?.status}
                </span>
              </div>
              <div className="p-4">
                <p className="text-xl font-bold text-gray-900">${fav.property?.price?.toLocaleString()}</p>
                <p className="text-gray-600 flex items-center gap-1 mb-2">
                  <MapPinIcon className="h-4 w-4" />{fav.property?.address}, {fav.property?.city}
                </p>
                <div className="flex gap-4 text-sm text-gray-500 mb-3">
                  <span>{fav.property?.bedrooms} beds</span>
                  <span>{fav.property?.bathrooms} baths</span>
                  <span>{fav.property?.sqft?.toLocaleString()} sqft</span>
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Saved on {new Date(fav.createdAt).toLocaleDateString()}
                </div>
                <Link to={`/properties/${fav.propertyId}`} className="btn-secondary w-full text-center block">View Details</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-500 mb-4">Start browsing properties and save your favorites here</p>
          <Link to="/portal/search" className="btn-primary">Search Properties</Link>
        </div>
      )}
    </div>
  );
}
