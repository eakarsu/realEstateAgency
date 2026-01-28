import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

const statusColors = {
  DRAFT: 'badge-gray',
  ACTIVE: 'badge-green',
  PENDING: 'badge-yellow',
  SOLD: 'badge-blue',
  WITHDRAWN: 'badge-red',
  EXPIRED: 'badge-red',
  OFF_MARKET: 'badge-gray'
};

export default function PropertiesList() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });

  useEffect(() => {
    loadProperties();
  }, [filters, pagination.page]);

  const loadProperties = async () => {
    try {
      const res = await propertiesAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setProperties(res.data.properties);
      setPagination(prev => ({ ...prev, total: res.data.total }));
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600">Manage your property listings</p>
        </div>
        <Link to="/properties/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Property
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="select"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SOLD">Sold</option>
            <option value="DRAFT">Draft</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="select"
          >
            <option value="">All Types</option>
            <option value="SINGLE_FAMILY">Single Family</option>
            <option value="CONDO">Condo</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="MULTI_FAMILY">Multi Family</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : properties.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link
                key={property.id}
                to={`/properties/${property.id}`}
                className="card overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-gray-200 relative">
                  {property.photos?.[0]?.url ? (
                    <img
                      src={property.photos[0].url}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Photo
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 badge ${statusColors[property.status]}`}>
                    {property.status}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xl font-bold text-gray-900">
                    ${property.price?.toLocaleString()}
                  </p>
                  <p className="text-gray-600 font-medium mt-1 truncate">{property.title}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPinIcon className="h-4 w-4" />
                    {property.address}, {property.city}
                  </p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-600">
                    <span>{property.bedrooms} bed</span>
                    <span>{property.bathrooms} bath</span>
                    {property.squareFeet && <span>{property.squareFeet.toLocaleString()} sqft</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 card">
          <p className="text-gray-500 mb-4">No properties found</p>
          <Link to="/properties/new" className="btn-primary">Add your first property</Link>
        </div>
      )}
    </div>
  );
}
