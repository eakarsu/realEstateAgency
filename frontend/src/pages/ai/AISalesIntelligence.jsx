import { useState } from 'react';
import { aiAPI } from '../../services/api';
import {
  ChartBarIcon,
  UsersIcon,
  HeartIcon,
  ArrowPathIcon,
  PlayIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const tools = [
  {
    id: 'predictive-lead-scoring',
    name: 'Predictive Lead Scoring',
    description: 'Score leads on likelihood-to-close using historical signals',
    icon: UsersIcon,
    color: 'indigo',
  },
  {
    id: 'buyer-journey-personalization',
    name: 'Buyer Journey Personalization',
    description: 'Generate personalized email/SMS triggers per buyer stage',
    icon: HeartIcon,
    color: 'pink',
  },
  {
    id: 'pipeline-forecast',
    name: 'Pipeline Forecast',
    description: 'Forecast closings, GCI, and risks across your pipeline',
    icon: PresentationChartLineIcon,
    color: 'emerald',
  },
];

function describeError(err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error || err?.message || 'Request failed';
  if (status === 503) {
    return msg || 'AI service unavailable: API key not configured on the server.';
  }
  return msg;
}

function ResultBlock({ result }) {
  if (!result) return null;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
      <h4 className="font-semibold text-sm mb-2 text-gray-700">Result</h4>
      <pre className="text-xs whitespace-pre-wrap text-gray-800 max-h-96 overflow-auto">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function PredictiveLeadScoringForm() {
  const [leads, setLeads] = useState(JSON.stringify([
    { leadId: 'L-1', name: 'Alice', budget: 600000, timeline: '0-3 months', preApproved: true, sourceEngagement: 8 },
    { leadId: 'L-2', name: 'Bob', budget: 350000, timeline: '6-12 months', preApproved: false, sourceEngagement: 3 },
  ], null, 2));
  const [historicalContext, setHistoricalContext] = useState(JSON.stringify({
    avgCloseRateBySource: { Zillow: 0.06, Referral: 0.18, Web: 0.04 },
    avgDaysToClose: 42,
  }, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null); setError(null);
    try {
      let l, h;
      try { l = JSON.parse(leads); } catch { setError('Leads must be valid JSON array'); setLoading(false); return; }
      try { h = historicalContext ? JSON.parse(historicalContext) : {}; } catch { setError('Historical context must be valid JSON'); setLoading(false); return; }
      const res = await aiAPI.predictiveLeadScoring({ leads: l, historicalDealsContext: h });
      setResult(res.data);
      toast.success('Lead scoring complete');
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Leads (JSON array)</label>
        <textarea value={leads} onChange={(e) => setLeads(e.target.value)} rows={10}
          className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Historical Deals Context (optional, JSON)</label>
        <textarea value={historicalContext} onChange={(e) => setHistoricalContext(e.target.value)} rows={6}
          className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
        {loading ? 'Scoring...' : 'Score Leads'}
      </button>
      <ResultBlock result={result} />
    </form>
  );
}

function BuyerJourneyPersonalizationForm() {
  const [buyer, setBuyer] = useState(JSON.stringify({
    id: 'B-100',
    name: 'Carol',
    budget: 500000,
    preferredAreas: ['Downtown', 'Riverside'],
    propertyType: 'Single-family',
    bedrooms: 3,
  }, null, 2));
  const [stage, setStage] = useState('exploring');
  const [channels, setChannels] = useState('email,sms');
  const [recentInteractions, setRecentInteractions] = useState(JSON.stringify([
    { type: 'open-house', when: '2026-04-30', notes: 'Liked the kitchen, worried about commute' },
    { type: 'email-open', when: '2026-05-02' },
  ], null, 2));
  const [shortlist, setShortlist] = useState(JSON.stringify([
    { mlsId: 'MLS-101', address: '123 Oak St', price: 489000 },
  ], null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null); setError(null);
    try {
      let b, ri, sl;
      try { b = JSON.parse(buyer); } catch { setError('Buyer must be valid JSON'); setLoading(false); return; }
      try { ri = recentInteractions ? JSON.parse(recentInteractions) : []; } catch { setError('Recent interactions must be valid JSON'); setLoading(false); return; }
      try { sl = shortlist ? JSON.parse(shortlist) : []; } catch { setError('Shortlist must be valid JSON'); setLoading(false); return; }
      const channelArr = channels.split(',').map(s => s.trim()).filter(Boolean);
      const res = await aiAPI.buyerJourneyPersonalization({
        buyer: b, stage, recentInteractions: ri, propertyShortlist: sl, channels: channelArr,
      });
      setResult(res.data);
      toast.success('Personalization plan generated');
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="awareness">Awareness</option>
            <option value="exploring">Exploring</option>
            <option value="touring">Touring</option>
            <option value="negotiating">Negotiating</option>
            <option value="under-contract">Under Contract</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Channels (comma-separated)</label>
          <input value={channels} onChange={(e) => setChannels(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="email,sms" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Buyer (JSON)</label>
        <textarea value={buyer} onChange={(e) => setBuyer(e.target.value)} rows={8} className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Recent Interactions (JSON array)</label>
        <textarea value={recentInteractions} onChange={(e) => setRecentInteractions(e.target.value)} rows={6} className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Property Shortlist (JSON array)</label>
        <textarea value={shortlist} onChange={(e) => setShortlist(e.target.value)} rows={5} className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
        {loading ? 'Generating...' : 'Generate Plan'}
      </button>
      <ResultBlock result={result} />
    </form>
  );
}

function PipelineForecastForm() {
  const [pipeline, setPipeline] = useState(JSON.stringify([
    { dealId: 'D-1', stage: 'under-contract', listPrice: 480000, expectedCloseDate: '2026-06-01', probability: 0.85 },
    { dealId: 'D-2', stage: 'offer-out', listPrice: 720000, expectedCloseDate: '2026-07-15', probability: 0.4 },
    { dealId: 'D-3', stage: 'showing', listPrice: 350000, expectedCloseDate: '2026-08-30', probability: 0.2 },
  ], null, 2));
  const [horizonMonths, setHorizonMonths] = useState(3);
  const [commissionStructure, setCommissionStructure] = useState(JSON.stringify({
    sellSidePct: 0.025,
    buySidePct: 0.025,
    splitToAgent: 0.7,
  }, null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null); setError(null);
    try {
      let p, c;
      try { p = JSON.parse(pipeline); } catch { setError('Pipeline must be valid JSON array'); setLoading(false); return; }
      try { c = commissionStructure ? JSON.parse(commissionStructure) : {}; } catch { setError('Commission structure must be valid JSON'); setLoading(false); return; }
      const res = await aiAPI.pipelineForecast({ pipeline: p, horizonMonths: Number(horizonMonths) || 3, commissionStructure: c });
      setResult(res.data);
      toast.success('Pipeline forecast generated');
    } catch (err) {
      const msg = describeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horizon (months, 1-24)</label>
          <input type="number" min="1" max="24" value={horizonMonths} onChange={(e) => setHorizonMonths(e.target.value)}
            className="w-full border rounded-lg px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline (JSON array)</label>
        <textarea value={pipeline} onChange={(e) => setPipeline(e.target.value)} rows={10}
          className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Commission Structure (JSON, optional)</label>
        <textarea value={commissionStructure} onChange={(e) => setCommissionStructure(e.target.value)} rows={5}
          className="w-full font-mono text-xs border rounded-lg px-3 py-2" />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}
      <button type="submit" disabled={loading}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
        {loading ? 'Forecasting...' : 'Run Forecast'}
      </button>
      <ResultBlock result={result} />
    </form>
  );
}

export default function AISalesIntelligence() {
  const [activeTab, setActiveTab] = useState('predictive-lead-scoring');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-100 text-indigo-700 rounded-lg p-2">
          <ChartBarIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Sales Intelligence</h1>
          <p className="text-sm text-gray-600">Predict close-probability, personalize buyer journeys, and forecast your pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {tools.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full text-left p-4 rounded-lg border ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'} hover:border-indigo-400`}
              >
                <Icon className="h-5 w-5 mb-2 text-gray-700" />
                <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                <div className="text-xs text-gray-500 mt-1">{t.description}</div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'predictive-lead-scoring' && <PredictiveLeadScoringForm />}
          {activeTab === 'buyer-journey-personalization' && <BuyerJourneyPersonalizationForm />}
          {activeTab === 'pipeline-forecast' && <PipelineForecastForm />}
        </div>
      </div>
    </div>
  );
}
