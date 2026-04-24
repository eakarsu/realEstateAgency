import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { transactionsAPI, propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../../utils/validation';

const validationSchema = {
  propertyId: ['required'],
  type: ['required'],
  listPrice: ['required', 'number']
};

export default function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    propertyId: '', type: 'BUYER', listPrice: '', closingDate: '', financingType: '',
    buyerName: '', buyerEmail: '', buyerPhone: '', sellerName: '', sellerEmail: '', sellerPhone: '', notes: ''
  });

  useEffect(() => {
    propertiesAPI.getAll({ status: 'ACTIVE' }).then(res => setProperties(res.data.properties));
    if (isEdit) {
      transactionsAPI.getById(id).then(res => {
        const t = res.data;
        setFormData({ propertyId: t.propertyId, type: t.type, listPrice: t.listPrice || '', closingDate: t.closingDate?.split('T')[0] || '',
          financingType: t.financingType || '', buyerName: t.buyerName || '', buyerEmail: t.buyerEmail || '', buyerPhone: t.buyerPhone || '',
          sellerName: t.sellerName || '', sellerEmail: t.sellerEmail || '', sellerPhone: t.sellerPhone || '', notes: t.notes || '' });
        setLoading(false);
      }).catch(() => { toast.error('Failed to load'); navigate('/transactions'); });
    } else { setLoading(false); }
  }, [id]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(validateForm(formData, validationSchema));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, validationSchema);
    setErrors(validationErrors);
    setTouched({ propertyId: true, type: true, listPrice: true });

    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const data = { ...formData, listPrice: parseFloat(formData.listPrice) || 0, closingDate: formData.closingDate || null };
      if (isEdit) await transactionsAPI.update(id, data);
      else await transactionsAPI.create(data);
      toast.success(isEdit ? 'Transaction updated' : 'Transaction created');
      navigate('/transactions');
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/transactions" className="text-blue-600 hover:underline text-sm">&larr; Back</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{isEdit ? 'Edit Transaction' : 'New Transaction'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
            <select name="propertyId" value={formData.propertyId} onChange={handleChange} onBlur={() => handleBlur('propertyId')} className={`select ${touched.propertyId && errors.propertyId ? 'border-red-300 focus:ring-red-500' : ''}`} required>
              <option value="">Select property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}, {p.city}</option>)}
            </select>
            {touched.propertyId && errors.propertyId && <p className="mt-1 text-sm text-red-600">{errors.propertyId}</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select name="type" value={formData.type} onChange={handleChange} onBlur={() => handleBlur('type')} className={`select ${touched.type && errors.type ? 'border-red-300 focus:ring-red-500' : ''}`}>
              <option value="BUYER">Buyer</option><option value="LISTING">Listing</option><option value="DUAL">Dual</option>
            </select>
            {touched.type && errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">List Price *</label>
            <input type="number" name="listPrice" value={formData.listPrice} onChange={handleChange} onBlur={() => handleBlur('listPrice')} className={`input ${touched.listPrice && errors.listPrice ? 'border-red-300 focus:ring-red-500' : ''}`} required />
            {touched.listPrice && errors.listPrice && <p className="mt-1 text-sm text-red-600">{errors.listPrice}</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Closing Date</label>
            <input type="date" name="closingDate" value={formData.closingDate} onChange={handleChange} className="input" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Financing Type</label>
            <select name="financingType" value={formData.financingType} onChange={handleChange} className="select">
              <option value="">Select</option><option value="Conventional">Conventional</option><option value="FHA">FHA</option>
              <option value="VA">VA</option><option value="Cash">Cash</option>
            </select></div>
        </div>
        <div className="border-t pt-6"><h3 className="font-medium text-gray-900 mb-4">Buyer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" name="buyerName" value={formData.buyerName} onChange={handleChange} className="input" placeholder="Name" />
            <input type="email" name="buyerEmail" value={formData.buyerEmail} onChange={handleChange} className="input" placeholder="Email" />
            <input type="tel" name="buyerPhone" value={formData.buyerPhone} onChange={handleChange} className="input" placeholder="Phone" />
          </div></div>
        <div className="border-t pt-6"><h3 className="font-medium text-gray-900 mb-4">Seller Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" name="sellerName" value={formData.sellerName} onChange={handleChange} className="input" placeholder="Name" />
            <input type="email" name="sellerEmail" value={formData.sellerEmail} onChange={handleChange} className="input" placeholder="Email" />
            <input type="tel" name="sellerPhone" value={formData.sellerPhone} onChange={handleChange} className="input" placeholder="Phone" />
          </div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} className="input" rows={3} /></div>
        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</button>
          <Link to="/transactions" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
