import React, { useEffect, useState } from 'react';
import api from '../services/api';

function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ShowingScheduler() {
  const [ctx, setCtx] = useState({ properties: [], leads: [] });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setMinutes(0, 0, 0);
  const [form, setForm] = useState({
    propertyId: '',
    leadId: '',
    scheduledAt: toLocalInputValue(tomorrow),
    duration: 30,
    notes: ''
  });

  const loadAll = async () => {
    try {
      const [ctxR, recR] = await Promise.all([
        api.get('/custom-views/scheduler-context'),
        api.get('/custom-views/recent-showings'),
      ]);
      setCtx(ctxR.data);
      setRecent(recR.data.showings || []);
      if (ctxR.data.properties?.length && !form.propertyId) {
        setForm(f => ({ ...f, propertyId: ctxR.data.properties[0].id }));
      }
      if (ctxR.data.leads?.length && !form.leadId) {
        setForm(f => ({ ...f, leadId: ctxR.data.leads[0].id }));
      }
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/custom-views/schedule-showing', form);
      setMessage('Showing scheduled.');
      const recR = await api.get('/custom-views/recent-showings');
      setRecent(recR.data.showings || []);
    } catch (err) {
      setMessage(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="bg-white rounded-lg shadow p-4">Loading scheduler...</div>;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Showing Scheduler</h3>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-700">Property</label>
          <select
            className="w-full border rounded p-2"
            value={form.propertyId}
            onChange={e => setForm({ ...form, propertyId: e.target.value })}
            required
          >
            <option value="">-- choose --</option>
            {ctx.properties.map(p => (
              <option key={p.id} value={p.id}>{p.title} — {p.address}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Interested Party (Lead)</label>
          <select
            className="w-full border rounded p-2"
            value={form.leadId}
            onChange={e => setForm({ ...form, leadId: e.target.value })}
          >
            <option value="">-- none --</option>
            {ctx.leads.map(l => (
              <option key={l.id} value={l.id}>{l.firstName} {l.lastName} ({l.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Time Slot</label>
          <input
            type="datetime-local"
            className="w-full border rounded p-2"
            value={form.scheduledAt}
            onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Duration (min)</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            min={15}
            step={15}
            value={form.duration}
            onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 30 })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700">Notes</label>
          <textarea
            className="w-full border rounded p-2"
            rows={2}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Schedule Showing'}
          </button>
          {message && <span className="ml-3 text-sm text-gray-600">{message}</span>}
        </div>
      </form>

      <h4 className="mt-6 mb-2 font-semibold text-gray-800">Recent Showings</h4>
      {recent.length === 0 ? (
        <p className="text-sm text-gray-500">No recent showings.</p>
      ) : (
        <ul className="divide-y border rounded">
          {recent.map(s => (
            <li key={s.id} className="p-2 text-sm flex justify-between">
              <span>
                <span className="font-medium">{s.property?.title || 'Property'}</span>
                {s.lead && ` — ${s.lead.firstName} ${s.lead.lastName}`}
              </span>
              <span className="text-gray-600">
                {new Date(s.scheduledAt).toLocaleString()} ({s.status})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
