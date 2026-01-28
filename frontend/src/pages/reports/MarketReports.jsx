import { useState, useEffect } from 'react';
import { marketReportsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AIResponseModal from '../../components/AIResponseModal';
import { PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function MarketReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [area, setArea] = useState('');
  const [aiModal, setAiModal] = useState({ isOpen: false, data: null });

  useEffect(() => { marketReportsAPI.getAll().then(res => setReports(res.data.reports)).finally(() => setLoading(false)); }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!area) return;
    setGenerating(true);
    try {
      const res = await marketReportsAPI.generate(area, `${area} Market Report`);
      setAiModal({ isOpen: true, data: res.data });
      setReports(prev => [res.data, ...prev]);
      setArea('');
    } catch (error) { toast.error('Failed to generate report'); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Market Reports</h1><p className="text-gray-600">AI-generated market analysis</p></div>
      </div>
      <form onSubmit={handleGenerate} className="card p-4 mb-6 flex gap-4">
        <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="input flex-1" placeholder="Enter city or zip code..." />
        <button type="submit" disabled={generating} className="btn-primary flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5" />{generating ? 'Generating...' : 'Generate Report'}
        </button>
      </form>
      <div className="space-y-6">
        {reports.map((report) => (
          <div key={report.id} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{report.title}</h2>
              <span className="text-sm text-gray-500">{new Date(report.reportDate).toLocaleDateString()}</span>
            </div>
            {report.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{report.data.activeListings}</p><p className="text-xs text-gray-500">Active Listings</p></div>
                <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{report.data.recentSales}</p><p className="text-xs text-gray-500">Recent Sales</p></div>
                <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">${(report.data.avgSoldPrice / 1000).toFixed(0)}K</p><p className="text-xs text-gray-500">Avg Sold Price</p></div>
                <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-2xl font-bold">{report.data.avgDaysOnMarket}</p><p className="text-xs text-gray-500">Avg DOM</p></div>
              </div>
            )}
            {report.analysis && <p className="text-gray-700 whitespace-pre-wrap text-sm">{report.analysis}</p>}
          </div>
        ))}
        {reports.length === 0 && <div className="text-center py-12 text-gray-500 card">No reports yet. Generate one above!</div>}
      </div>

      <AIResponseModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ isOpen: false, data: null })}
        title="Market Report Analysis"
        data={aiModal.data}
        type="market-report"
      />
    </div>
  );
}
