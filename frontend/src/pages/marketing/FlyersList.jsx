import { useState, useEffect } from 'react';
import { flyersAPI, propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const flyerTypes = ['JUST_LISTED', 'OPEN_HOUSE', 'PRICE_REDUCED', 'JUST_SOLD', 'COMING_SOON'];

export default function FlyersList() {
  const [flyers, setFlyers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFlyer, setSelectedFlyer] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [formData, setFormData] = useState({
    propertyId: '',
    type: 'JUST_LISTED'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [flyersRes, propsRes] = await Promise.all([
        flyersAPI.getAll(),
        propertiesAPI.getAll({ status: 'ACTIVE' })
      ]);
      setFlyers(flyersRes.data.flyers || flyersRes.data);
      setProperties(propsRes.data.properties || propsRes.data);
    } catch (error) {
      toast.error('Failed to load flyers');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.propertyId) {
      toast.error('Please select a property');
      return;
    }
    setGenerating(true);
    try {
      const res = await flyersAPI.generate(formData.propertyId, formData.type);
      toast.success('Flyer generated successfully!');
      setShowForm(false);
      setFormData({ propertyId: '', type: 'JUST_LISTED' });
      loadData();
      // Show generated flyer
      if (res.data) {
        setSelectedFlyer(res.data);
      }
    } catch (error) {
      toast.error('Failed to generate flyer');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Flyer',
      message: 'Are you sure you want to delete this flyer? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await flyersAPI.delete(id);
          toast.success('Flyer deleted');
          loadData();
        } catch (error) {
          toast.error('Failed to delete flyer');
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'JUST_LISTED': return 'badge-blue';
      case 'OPEN_HOUSE': return 'badge-green';
      case 'PRICE_REDUCED': return 'badge-red';
      case 'JUST_SOLD': return 'badge-purple';
      case 'COMING_SOON': return 'badge-yellow';
      default: return 'badge-gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Flyers</h1>
          <p className="text-gray-600">Generate and manage marketing flyers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <SparklesIcon className="h-5 w-5" />
          Generate Flyer
        </button>
      </div>

      {/* Generate Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowForm(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Generate AI Flyer</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleGenerate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="select"
                    required
                  >
                    <option value="">Select a property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flyer Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="select"
                  >
                    {flyerTypes.map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={generating}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="h-5 w-5" />
                  {generating ? 'Generating...' : 'Generate Flyer'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Flyer Preview Modal */}
      {selectedFlyer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedFlyer(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-semibold">{selectedFlyer.property?.address || 'Flyer Preview'}</h3>
                    <span className={`badge ${getTypeColor(selectedFlyer.type)}`}>
                      {selectedFlyer.type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedFlyer(null)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                {selectedFlyer.imageUrl ? (
                  <img src={selectedFlyer.imageUrl} alt="Flyer" className="w-full rounded-lg" />
                ) : (
                  <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-8">
                    {selectedFlyer.property && (
                      <div className="text-center">
                        <span className={`badge ${getTypeColor(selectedFlyer.type)} mb-4`}>
                          {selectedFlyer.type?.replace(/_/g, ' ')}
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedFlyer.property.address}</h2>
                        <p className="text-gray-600 mb-4">{selectedFlyer.property.city}, {selectedFlyer.property.state} {selectedFlyer.property.zipCode}</p>
                        <p className="text-3xl font-bold text-purple-600 mb-4">${selectedFlyer.property.price?.toLocaleString()}</p>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                          <div><p className="text-2xl font-bold">{selectedFlyer.property.bedrooms}</p><p className="text-sm text-gray-500">Beds</p></div>
                          <div><p className="text-2xl font-bold">{selectedFlyer.property.bathrooms}</p><p className="text-sm text-gray-500">Baths</p></div>
                          <div><p className="text-2xl font-bold">{selectedFlyer.property.squareFeet?.toLocaleString()}</p><p className="text-sm text-gray-500">Sq Ft</p></div>
                        </div>
                        {selectedFlyer.content && (
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedFlyer.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
                {selectedFlyer.pdfUrl && (
                  <a
                    href={selectedFlyer.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Download PDF
                  </a>
                )}
                <button onClick={() => setSelectedFlyer(null)} className="btn-primary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flyers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flyers.map((flyer) => (
          <div
            key={flyer.id}
            className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedFlyer(flyer)}
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              {flyer.imageUrl ? (
                <img src={flyer.imageUrl} alt="Flyer" className="w-full h-full object-cover" />
              ) : (
                <DocumentTextIcon className="h-16 w-16 text-purple-300" />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`badge ${getTypeColor(flyer.type)}`}>
                  {flyer.type?.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(flyer.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 truncate">
                {flyer.property?.address || 'Property Flyer'}
              </h3>
              {flyer.property && (
                <p className="text-sm text-gray-500">{flyer.property.city}, {flyer.property.state}</p>
              )}
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setSelectedFlyer(flyer)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(flyer.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {flyers.length === 0 && (
        <div className="text-center py-12 text-gray-500 card">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No flyers yet. Generate your first AI-powered flyer above.</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
}
