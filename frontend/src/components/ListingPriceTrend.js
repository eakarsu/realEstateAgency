import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ListingPriceTrend() {
  const [series, setSeries] = useState([]);
  const [zips, setZips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/custom-views/price-trend');
        setSeries(r.data.series || []);
        setZips(r.data.zips || []);
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Median Listing Price by Zip — Trend</h3>
      {loading && <p className="text-gray-500">Loading trend...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && series.length === 0 && (
        <p className="text-gray-500">No price-trend data available.</p>
      )}
      {!loading && !error && series.length > 0 && (
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => v ? `$${Number(v).toLocaleString()}` : '—'} />
              <Legend />
              {zips.map((z, i) => (
                <Line key={z} type="monotone" dataKey={z} stroke={COLORS[i % COLORS.length]} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Top {zips.length} zip codes by listing volume.
      </p>
    </div>
  );
}
