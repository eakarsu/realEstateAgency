import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import api from '../services/api';

const STATUS_COLOR = {
  ACTIVE: '#10b981',
  PENDING: '#f59e0b',
  SOLD: '#ef4444',
  DRAFT: '#9ca3af',
  WITHDRAWN: '#6b7280',
  EXPIRED: '#6b7280',
  OFF_MARKET: '#6b7280',
};

export default function PropertyMap() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/custom-views/property-map');
        setItems(r.data.items || []);
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const center = items.length
    ? [items[0].latitude, items[0].longitude]
    : [39.5, -98.35];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Property Map</h3>
        <div className="flex gap-3 text-xs">
          <span><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: STATUS_COLOR.ACTIVE }}></span>Active</span>
          <span><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: STATUS_COLOR.PENDING }}></span>Pending</span>
          <span><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: STATUS_COLOR.SOLD }}></span>Sold</span>
        </div>
      </div>
      {loading && <p className="text-gray-500">Loading map...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div style={{ height: 460, width: '100%' }}>
          <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {items.map(p => (
              <CircleMarker
                key={p.id}
                center={[p.latitude, p.longitude]}
                radius={7}
                pathOptions={{
                  color: STATUS_COLOR[p.status] || '#3b82f6',
                  fillColor: STATUS_COLOR[p.status] || '#3b82f6',
                  fillOpacity: 0.8,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{p.title}</div>
                    <div>{p.address}, {p.city} {p.state}</div>
                    <div className="mt-1 font-bold text-green-700">
                      ${Number(p.price || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {p.bedrooms ?? '-'} bd • {p.bathrooms ?? '-'} ba • {p.squareFeet ?? '-'} sqft
                    </div>
                    <div className="text-xs mt-1">Status: {p.status}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">{items.length} properties shown</p>
    </div>
  );
}
