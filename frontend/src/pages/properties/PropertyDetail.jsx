import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { propertiesAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AIResponseModal from '../../components/AIResponseModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { PencilIcon, TrashIcon, SparklesIcon, MapPinIcon, HeartIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pricePredicting, setPricePredicting] = useState(false);
  const [cmaGenerating, setCmaGenerating] = useState(false);
  const [aiModal, setAiModal] = useState({ isOpen: false, data: null, type: 'property-description' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    try {
      const res = await propertiesAPI.getById(id);
      setProperty(res.data);
    } catch (error) {
      toast.error('Failed to load property');
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    setGenerating(true);
    try {
      const res = await aiAPI.generateDescription(id);
      setAiModal({ isOpen: true, data: { description: res.data.description }, type: 'property-description' });
      setProperty(prev => ({ ...prev, aiDescription: res.data.description }));
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  const handlePricePredictor = async () => {
    setPricePredicting(true);
    try {
      const res = await aiAPI.predictPrice({
        propertyId: id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        yearBuilt: property.yearBuilt,
        propertyType: property.type
      });
      setAiModal({ isOpen: true, data: res.data, type: 'price-predictor' });
    } catch (error) {
      toast.error('Failed to predict price');
    } finally {
      setPricePredicting(false);
    }
  };

  const handleCMA = async () => {
    setCmaGenerating(true);
    try {
      const res = await aiAPI.marketAnalysis({
        propertyId: id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet
      });
      setAiModal({ isOpen: true, data: res.data, type: 'cma' });
    } catch (error) {
      toast.error('Failed to generate CMA');
    } finally {
      setCmaGenerating(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmedDelete = async () => {
    try {
      await propertiesAPI.delete(id);
      toast.success('Property deleted');
      navigate('/properties');
    } catch (error) {
      toast.error('Failed to delete property');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/properties" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            &larr; Back to Properties
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          <p className="text-gray-600 flex items-center gap-1 mt-1">
            <MapPinIcon className="h-5 w-5" />
            {property.address}, {property.city}, {property.state} {property.zipCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGenerateDescription} disabled={generating} className="btn-secondary flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            {generating ? 'Generating...' : 'AI Description'}
          </button>
          <button onClick={handlePricePredictor} disabled={pricePredicting} className="btn-secondary flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5" />
            {pricePredicting ? 'Predicting...' : 'Price Predictor'}
          </button>
          <button onClick={handleCMA} disabled={cmaGenerating} className="btn-secondary flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            {cmaGenerating ? 'Analyzing...' : 'AI CMA'}
          </button>
          <Link to={`/properties/${id}/edit`} className="btn-secondary flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <TrashIcon className="h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          <div className="card overflow-hidden">
            {property.photos?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 p-2">
                {property.photos.slice(0, 4).map((photo, idx) => (
                  <div key={photo.id} className={`${idx === 0 ? 'col-span-2 aspect-video' : 'aspect-video'} bg-gray-200 rounded-lg overflow-hidden`}>
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video bg-gray-200 flex items-center justify-center text-gray-400">
                No Photos
              </div>
            )}
          </div>

          {/* Details */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Property Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{property.bedrooms}</p>
                <p className="text-sm text-gray-500">Bedrooms</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{property.bathrooms}</p>
                <p className="text-sm text-gray-500">Bathrooms</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{property.squareFeet?.toLocaleString() || '-'}</p>
                <p className="text-sm text-gray-500">Sq Ft</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{property.yearBuilt || '-'}</p>
                <p className="text-sm text-gray-500">Year Built</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {property.description || 'No description available.'}
            </p>
            {property.aiDescription && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                  <SparklesIcon className="h-4 w-4" /> AI Generated Description
                </p>
                <p className="text-blue-700">{property.aiDescription}</p>
              </div>
            )}
          </div>

          {/* Features */}
          {property.features?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Features</h2>
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Price Card */}
          <div className="card p-6">
            <p className="text-3xl font-bold text-gray-900">${property.price?.toLocaleString()}</p>
            {property.pricePerSqft && (
              <p className="text-gray-500">${Math.round(property.pricePerSqft)}/sqft</p>
            )}
            <div className="mt-4 space-y-2">
              <span className={`badge ${
                property.status === 'ACTIVE' ? 'badge-green' :
                property.status === 'PENDING' ? 'badge-yellow' :
                property.status === 'SOLD' ? 'badge-blue' :
                'badge-gray'
              }`}>
                {property.status}
              </span>
              <p className="text-sm text-gray-500">
                Type: {property.type?.replace('_', ' ')}
              </p>
              {property.mlsNumber && (
                <p className="text-sm text-gray-500">MLS#: {property.mlsNumber}</p>
              )}
            </div>
          </div>

          {/* Agent Info */}
          {property.agent && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Listing Agent</h2>
              <p className="font-medium">{property.agent.user?.firstName} {property.agent.user?.lastName}</p>
              <p className="text-sm text-gray-500">{property.agent.user?.email}</p>
              {property.agent.user?.phone && (
                <p className="text-sm text-gray-500">{property.agent.user?.phone}</p>
              )}
            </div>
          )}

          {/* Additional Info */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Additional Info</h2>
            <dl className="space-y-2 text-sm">
              {property.garage > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Garage</dt>
                  <dd>{property.garage} car</dd>
                </div>
              )}
              {property.lotSize && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Lot Size</dt>
                  <dd>{property.lotSize} acres</dd>
                </div>
              )}
              {property.hoaFee && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">HOA Fee</dt>
                  <dd>${property.hoaFee}/mo</dd>
                </div>
              )}
              {property.taxAmount && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Taxes ({property.taxYear})</dt>
                  <dd>${property.taxAmount.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <AIResponseModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ isOpen: false, data: null, type: 'property-description' })}
        title={
          aiModal.type === 'property-description' ? 'AI Generated Property Description' :
          aiModal.type === 'price-predictor' ? 'AI Price Prediction' :
          aiModal.type === 'cma' ? 'Comparative Market Analysis' :
          'AI Response'
        }
        data={aiModal.data}
        type={aiModal.type}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmedDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this property?"
        variant="danger"
      />
    </div>
  );
}
