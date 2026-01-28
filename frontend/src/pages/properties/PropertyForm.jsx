import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertiesAPI, agentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '', type: 'SINGLE_FAMILY', status: 'DRAFT', address: '', city: '', state: '', zipCode: '',
    price: '', bedrooms: '', bathrooms: '', squareFeet: '', yearBuilt: '', garage: '',
    lotSize: '', description: '', features: '', hoaFee: '', taxAmount: '', agentId: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const agentsRes = await agentsAPI.getAll();
      setAgents(agentsRes.data.agents || []);

      if (isEdit) {
        const propRes = await propertiesAPI.getById(id);
        const p = propRes.data;
        setFormData({
          title: p.title || '', type: p.type, status: p.status, address: p.address || '',
          city: p.city || '', state: p.state || '', zipCode: p.zipCode || '',
          price: p.price || '', bedrooms: p.bedrooms || '', bathrooms: p.bathrooms || '',
          squareFeet: p.squareFeet || '', yearBuilt: p.yearBuilt || '', garage: p.garage || '',
          lotSize: p.lotSize || '', description: p.description || '',
          features: p.features?.join(', ') || '', hoaFee: p.hoaFee || '', taxAmount: p.taxAmount || '',
          agentId: p.agentId || ''
        });
        setExistingPhotos(p.photos || []);
      }
    } catch (error) {
      toast.error('Failed to load data');
      if (isEdit) navigate('/properties');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoId) => {
    if (!confirm('Remove this photo?')) return;
    try {
      await propertiesAPI.deletePhoto(id, photoId);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success('Photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseFloat(formData.bathrooms) || 0,
        squareFeet: parseInt(formData.squareFeet) || null,
        yearBuilt: parseInt(formData.yearBuilt) || null,
        garage: parseInt(formData.garage) || 0,
        lotSize: parseFloat(formData.lotSize) || null,
        hoaFee: parseFloat(formData.hoaFee) || null,
        taxAmount: parseFloat(formData.taxAmount) || null,
        features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(Boolean) : [],
        agentId: formData.agentId || null
      };

      let propertyId = id;
      if (isEdit) {
        await propertiesAPI.update(id, data);
      } else {
        const res = await propertiesAPI.create(data);
        propertyId = res.data.id;
      }

      // Upload photos if any selected
      if (selectedFiles.length > 0) {
        setUploading(true);
        try {
          await propertiesAPI.uploadPhotos(propertyId, selectedFiles);
          toast.success(`${selectedFiles.length} photo(s) uploaded`);
        } catch (uploadError) {
          toast.error('Property saved but failed to upload some photos');
        }
        setUploading(false);
      }

      toast.success(isEdit ? 'Property updated' : 'Property created');
      navigate('/properties');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save property');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/properties" className="text-blue-600 hover:underline text-sm">&larr; Back to Properties</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="select">
              <option value="SINGLE_FAMILY">Single Family</option>
              <option value="CONDO">Condo</option>
              <option value="TOWNHOUSE">Townhouse</option>
              <option value="MULTI_FAMILY">Multi Family</option>
              <option value="LAND">Land</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="select">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SOLD">Sold</option>
              <option value="OFF_MARKET">Off Market</option>
            </select>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Agent</label>
              <select name="agentId" value={formData.agentId} onChange={handleChange} className="select">
                <option value="">Select agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.user?.firstName} {agent.user?.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <select name="state" value={formData.state} onChange={handleChange} className="select" required>
              <option value="">Select state</option>
              <option value="AL">Alabama</option><option value="AK">Alaska</option><option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option><option value="CA">California</option><option value="CO">Colorado</option>
              <option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="FL">Florida</option>
              <option value="GA">Georgia</option><option value="HI">Hawaii</option><option value="ID">Idaho</option>
              <option value="IL">Illinois</option><option value="IN">Indiana</option><option value="IA">Iowa</option>
              <option value="KS">Kansas</option><option value="KY">Kentucky</option><option value="LA">Louisiana</option>
              <option value="ME">Maine</option><option value="MD">Maryland</option><option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option><option value="MN">Minnesota</option><option value="MS">Mississippi</option>
              <option value="MO">Missouri</option><option value="MT">Montana</option><option value="NE">Nebraska</option>
              <option value="NV">Nevada</option><option value="NH">New Hampshire</option><option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option><option value="NY">New York</option><option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option><option value="OH">Ohio</option><option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option><option value="PA">Pennsylvania</option><option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option><option value="SD">South Dakota</option><option value="TN">Tennessee</option>
              <option value="TX">Texas</option><option value="UT">Utah</option><option value="VT">Vermont</option>
              <option value="VA">Virginia</option><option value="WA">Washington</option><option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option><option value="WY">Wyoming</option><option value="DC">Washington DC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code *</label>
            <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
            <select name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="select">
              <option value="">Select</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
            <select name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="select">
              <option value="">Select</option>
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sq Ft</label>
            <input type="number" name="squareFeet" value={formData.squareFeet} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
            <input type="number" name="yearBuilt" value={formData.yearBuilt} onChange={handleChange} className="input" placeholder="e.g., 2020" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Garage</label>
            <select name="garage" value={formData.garage} onChange={handleChange} className="select">
              <option value="">Select</option>
              {[0, 1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} car</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lot Size (acres)</label>
            <input type="number" step="0.01" name="lotSize" value={formData.lotSize} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HOA Fee (monthly)</label>
            <input type="number" name="hoaFee" value={formData.hoaFee} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Tax</label>
            <input type="number" name="taxAmount" value={formData.taxAmount} onChange={handleChange} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="input" rows={4} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma separated)</label>
            <input type="text" name="features" value={formData.features} onChange={handleChange} className="input" placeholder="Hardwood floors, Granite counters, Pool, Smart home" />
          </div>

          {/* Photo Upload Section */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Photos</label>

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Current Photos:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.url.startsWith('http') ? photo.url : `${API_URL}${photo.url}`}
                        alt=""
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photo.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      {photo.isPrimary && (
                        <span className="absolute bottom-1 left-1 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Input */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <PhotoIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload photos</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Selected ({selectedFiles.length}):</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-xs bg-gray-800 text-white px-2 py-0.5 rounded truncate max-w-[90%]">
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {uploading ? 'Uploading photos...' : saving ? 'Saving...' : isEdit ? 'Update Property' : 'Create Property'}
          </button>
          <Link to="/properties" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
