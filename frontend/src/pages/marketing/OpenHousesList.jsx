import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openHousesAPI, propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function OpenHousesList() {
  const navigate = useNavigate();
  const [openHouses, setOpenHouses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ propertyId: '', date: '', startTime: '10:00', endTime: '14:00' });

  useEffect(() => { Promise.all([openHousesAPI.getAll(), propertiesAPI.getAll({ status: 'ACTIVE' })]).then(([oh, p]) => { setOpenHouses(oh.data.openHouses); setProperties(p.data.properties); }).finally(() => setLoading(false)); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await openHousesAPI.create(formData); toast.success('Created'); setShowForm(false); openHousesAPI.getAll().then(res => setOpenHouses(res.data.openHouses)); }
    catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Open Houses</h1><p className="text-gray-600">Schedule and manage open houses</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />Schedule Open House</button>
      </div>
      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
            <select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="select" required>
              <option value="">Select property</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input" required />
            <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="input" />
            <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="input" />
            <div className="col-span-4 flex gap-2"><button type="submit" className="btn-primary">Create</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {openHouses.map((oh) => (
          <div key={oh.id} className="card p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => oh.property?.id && navigate(`/properties/${oh.property.id}`)}>
            <div className="flex items-center gap-3 mb-3"><CalendarIcon className="h-8 w-8 text-blue-500" />
              <div><p className="font-semibold">{new Date(oh.date).toLocaleDateString()}</p><p className="text-sm text-gray-500">{oh.startTime} - {oh.endTime}</p></div>
            </div>
            <p className="text-gray-700">{oh.property?.address}</p>
            <p className="text-sm text-gray-500">{oh.property?.city}</p>
            <span className={`badge mt-3 ${oh.status === 'SCHEDULED' ? 'badge-blue' : oh.status === 'COMPLETED' ? 'badge-green' : 'badge-gray'}`}>{oh.status}</span>
          </div>
        ))}
        {openHouses.length === 0 && <div className="col-span-3 text-center py-12 text-gray-500">No open houses scheduled</div>}
      </div>
    </div>
  );
}
