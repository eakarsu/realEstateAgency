import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { campaignsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'EMAIL', subject: '', content: '', scheduledAt: '' });

  useEffect(() => {
    if (isEdit) campaignsAPI.getById(id).then(res => { setFormData({ name: res.data.name, type: res.data.type, subject: res.data.subject || '', content: res.data.content || '', scheduledAt: res.data.scheduledAt?.split('T')[0] || '' }); setLoading(false); }).catch(() => navigate('/campaigns'));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) await campaignsAPI.update(id, formData);
      else await campaignsAPI.create(formData);
      toast.success(isEdit ? 'Updated' : 'Created');
      navigate('/campaigns');
    } catch (error) { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/campaigns" className="text-blue-600 hover:underline text-sm">&larr; Back</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="select"><option value="EMAIL">Email</option><option value="SMS">SMS</option></select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="input" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="input" rows={6} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label><input type="date" value={formData.scheduledAt} onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} className="input" /></div>
        <div className="flex gap-4"><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button><Link to="/campaigns" className="btn-secondary">Cancel</Link></div>
      </form>
    </div>
  );
}
