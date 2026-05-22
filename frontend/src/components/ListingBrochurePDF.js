import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function ListingBrochurePDF() {
  const [properties, setProperties] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/custom-views/properties-list');
        setProperties(r.data.properties || []);
        if (r.data.properties?.length) setSelectedId(r.data.properties[0].id);
      } catch (e) {
        setMessage(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setMessage('');
    try {
      const r = await api.get(`/custom-views/brochure/${selectedId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `brochure-${selectedId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Brochure downloaded.');
    } catch (e) {
      setMessage(e.response?.data?.error || e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Listing Brochure PDF</h3>
      {loading ? (
        <p className="text-gray-500">Loading properties...</p>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">Select a property</label>
          <select
            className="w-full border rounded p-2"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.address}, {p.city} ({p.status})
              </option>
            ))}
          </select>
          <button
            onClick={onGenerate}
            disabled={generating || !selectedId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Brochure'}
          </button>
          {message && <p className="text-sm text-gray-600">{message}</p>}
          <p className="text-xs text-gray-500">
            Includes address, beds/baths/sqft, features, agent contact, and photo placeholders.
          </p>
        </div>
      )}
    </div>
  );
}
