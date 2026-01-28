import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertiesAPI, savedSearchesAPI, favoritesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, HeartIcon, BookmarkIcon, MapPinIcon, HomeIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

export default function PropertySearch() {
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minPrice: '', maxPrice: '', bedrooms: '', bathrooms: '', propertyType: '', city: '', status: 'ACTIVE'
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.bedrooms) params.bedrooms = filters.bedrooms;
      if (filters.bathrooms) params.bathrooms = filters.bathrooms;
      if (filters.propertyType) params.propertyType = filters.propertyType;
      if (filters.city) params.city = filters.city;
      if (filters.status) params.status = filters.status;
      const res = await propertiesAPI.getAll(params);
      setProperties(res.data.properties);
    } catch (error) { toast.error('Failed to search'); }
    finally { setLoading(false); }
  };

  const fetchFavorites = async () => {
    try {
      const res = await favoritesAPI.getAll();
      setFavorites(res.data.map(f => f.propertyId));
    } catch (error) {}
  };

  useEffect(() => { fetchProperties(); fetchFavorites(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleToggleFavorite = async (propertyId) => {
    try {
      if (favorites.includes(propertyId)) {
        await favoritesAPI.remove(propertyId);
        setFavorites(prev => prev.filter(id => id !== propertyId));
        toast.success('Removed from favorites');
      } else {
        await favoritesAPI.add(propertyId);
        setFavorites(prev => [...prev, propertyId]);
        toast.success('Added to favorites');
      }
    } catch (error) { toast.error('Failed'); }
  };

  const handleSaveSearch = async () => {
    if (!searchName) { toast.error('Enter a name'); return; }
    try {
      await savedSearchesAPI.create({ name: searchName, criteria: filters });
      toast.success('Search saved');
      setShowSaveModal(false);
      setSearchName('');
    } catch (error) { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Property Search</h1>
        <p className="text-gray-600">Find your dream home</p>
      </div>

      <form onSubmit={handleSearch} className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
          <input type="text" placeholder="City" value={filters.city} onChange={(e) => setFilters({...filters, city: e.target.value})} className="input" />
          <input type="number" placeholder="Min Price" value={filters.minPrice} onChange={(e) => setFilters({...filters, minPrice: e.target.value})} className="input" />
          <input type="number" placeholder="Max Price" value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} className="input" />
          <select value={filters.bedrooms} onChange={(e) => setFilters({...filters, bedrooms: e.target.value})} className="input">
            <option value="">Beds</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
          <select value={filters.bathrooms} onChange={(e) => setFilters({...filters, bathrooms: e.target.value})} className="input">
            <option value="">Baths</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
          <select value={filters.propertyType} onChange={(e) => setFilters({...filters, propertyType: e.target.value})} className="input">
            <option value="">Type</option>
            <option value="SINGLE_FAMILY">Single Family</option>
            <option value="CONDO">Condo</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="MULTI_FAMILY">Multi Family</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="input">
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SOLD">Sold</option>
            <option value="">All</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex items-center gap-2">
            <MagnifyingGlassIcon className="h-5 w-5" />Search
          </button>
          <button type="button" onClick={() => setShowSaveModal(true)} className="btn-secondary flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5" />Save Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <>
          <p className="text-gray-600 mb-4">{properties.length} properties found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="card overflow-hidden group">
                <div className="relative h-48 bg-gray-200">
                  {property.photos?.[0] ? (
                    <img src={property.photos[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><HomeIcon className="h-12 w-12 text-gray-400" /></div>
                  )}
                  <button onClick={() => handleToggleFavorite(property.id)} className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:scale-110 transition-transform">
                    {favorites.includes(property.id) ? (
                      <HeartSolid className="h-5 w-5 text-red-500" />
                    ) : (
                      <HeartIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded ${property.status === 'ACTIVE' ? 'bg-green-500 text-white' : property.status === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {property.status}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xl font-bold text-gray-900">${property.price?.toLocaleString()}</p>
                  <p className="text-gray-600 flex items-center gap-1 mb-2">
                    <MapPinIcon className="h-4 w-4" />{property.address}, {property.city}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500 mb-3">
                    <span>{property.bedrooms} beds</span>
                    <span>{property.bathrooms} baths</span>
                    <span>{property.sqft?.toLocaleString()} sqft</span>
                  </div>
                  <Link to={`/properties/${property.id}`} className="btn-secondary w-full text-center block">View Details</Link>
                </div>
              </div>
            ))}
          </div>
          {properties.length === 0 && <div className="text-center py-12 text-gray-500 card">No properties match your criteria</div>}
        </>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Search name..." className="input w-full mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveSearch} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
