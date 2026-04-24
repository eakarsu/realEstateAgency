import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leadsAPI, leadSourcesAPI, agentsAPI, tagsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../../utils/validation';

const validationSchema = {
  firstName: ['required'],
  lastName: ['required'],
  email: ['required', 'email'],
  phone: ['phone'],
  budget: ['number']
};

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [sources, setSources] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    sourceId: '',
    agentId: '',
    status: 'NEW',
    budget: '',
    timeline: '',
    propertyType: '',
    preferredAreas: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [sourcesRes, agentsRes, tagsRes] = await Promise.all([
        leadSourcesAPI.getAll(),
        agentsAPI.getAll(),
        tagsAPI.getAll()
      ]);
      setSources(sourcesRes.data);
      setAgents(agentsRes.data.agents);
      setTags(tagsRes.data);

      if (isEdit) {
        const leadRes = await leadsAPI.getById(id);
        const lead = leadRes.data;
        setFormData({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone || '',
          sourceId: lead.sourceId || '',
          agentId: lead.agentId || '',
          status: lead.status,
          budget: lead.budget || '',
          timeline: lead.timeline || '',
          propertyType: lead.propertyType || '',
          preferredAreas: lead.preferredAreas?.join(', ') || '',
          notes: lead.notes || '',
          tags: lead.tags?.map(t => t.tag.id) || []
        });
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validateForm(formData, validationSchema));
  };

  const handleTagToggle = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, validationSchema);
    setErrors(validationErrors);
    setTouched({ firstName: true, lastName: true, email: true, phone: true, budget: true });

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);

    try {
      const data = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        preferredAreas: formData.preferredAreas
          ? formData.preferredAreas.split(',').map(a => a.trim()).filter(Boolean)
          : []
      };

      if (isEdit) {
        await leadsAPI.update(id, data);
        toast.success('Lead updated');
      } else {
        await leadsAPI.create(data);
        toast.success('Lead created');
      }
      navigate('/leads');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save lead');
    } finally {
      setSaving(false);
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
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/leads" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          &larr; Back to Leads
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Lead' : 'Add New Lead'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={() => handleBlur('firstName')}
              className={`input ${touched.firstName && errors.firstName ? 'border-red-300 focus:ring-red-500' : ''}`}
              required
            />
            {touched.firstName && errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={() => handleBlur('lastName')}
              className={`input ${touched.lastName && errors.lastName ? 'border-red-300 focus:ring-red-500' : ''}`}
              required
            />
            {touched.lastName && errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              className={`input ${touched.email && errors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
              required
            />
            {touched.email && errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={() => handleBlur('phone')}
              className={`input ${touched.phone && errors.phone ? 'border-red-300 focus:ring-red-500' : ''}`}
            />
            {touched.phone && errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select name="sourceId" value={formData.sourceId} onChange={handleChange} className="select">
              <option value="">Select source</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="select">
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NURTURING">Nurturing</option>
              <option value="SHOWING">Showing</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Agent</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              onBlur={() => handleBlur('budget')}
              className={`input ${touched.budget && errors.budget ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="e.g., 500000"
            />
            {touched.budget && errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
            <select name="timeline" value={formData.timeline} onChange={handleChange} className="select">
              <option value="">Select timeline</option>
              <option value="Immediate">Immediate</option>
              <option value="1-3 months">1-3 months</option>
              <option value="3-6 months">3-6 months</option>
              <option value="6-12 months">6-12 months</option>
              <option value="Just browsing">Just browsing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select name="propertyType" value={formData.propertyType} onChange={handleChange} className="select">
              <option value="">Select type</option>
              <option value="SINGLE_FAMILY">Single Family</option>
              <option value="CONDO">Condo</option>
              <option value="TOWNHOUSE">Townhouse</option>
              <option value="MULTI_FAMILY">Multi Family</option>
              <option value="LAND">Land</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Areas</label>
            <input
              type="text"
              name="preferredAreas"
              value={formData.preferredAreas}
              onChange={handleChange}
              className="input"
              placeholder="Comma separated, e.g., Downtown, Westside"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.id)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  formData.tags.includes(tag.id)
                    ? 'border-transparent'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
                style={formData.tags.includes(tag.id) ? {
                  backgroundColor: tag.color + '20',
                  color: tag.color,
                  borderColor: tag.color
                } : {}}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="input"
            rows={4}
          />
        </div>

        <div className="flex gap-4 mt-8">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isEdit ? 'Update Lead' : 'Create Lead'}
          </button>
          <Link to="/leads" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
