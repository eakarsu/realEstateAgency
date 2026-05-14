import { useState } from 'react';
import { aiAPI } from '../../services/api';
import {
  ScaleIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const tools = [
  {
    id: 'comparable-analysis',
    name: 'Comparable Market Analysis (CMA)',
    description: 'Generate AI-driven comp analysis for a subject property',
    icon: HomeIcon,
    color: 'blue',
  },
  {
    id: 'compliance-checker',
    name: 'Compliance Checker',
    description: 'Check listings, disclosures, or filings for compliance issues',
    icon: ClipboardDocumentCheckIcon,
    color: 'amber',
  },
];

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

function ComparableAnalysisForm() {
  const [subject, setSubject] = useState(JSON.stringify({
    address: '123 Main St, Anytown',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    yearBuilt: 1998,
    lotSize: 0.25,
    features: ['updated kitchen', 'finished basement'],
  }, null, 2));
  const [comps, setComps] = useState(JSON.stringify([
    { address: '120 Main St', soldPrice: 425000, soldDate: '2025-12-01', bedrooms: 3, bathrooms: 2, squareFeet: 1750 },
    { address: '300 Oak Ave', soldPrice: 449000, soldDate: '2026-01-15', bedrooms: 3, bathrooms: 2.5, squareFeet: 1900 },
  ], null, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null); setError(null);
    try {
      let s, c;
      try { s = JSON.parse(subject); } catch { setError('Subject property must be valid JSON'); setLoading(false); return; }
      try { c = JSON.parse(comps); } catch { setError('Comps must be valid JSON'); setLoading(false); return; }
      const res = await aiAPI.comparableAnalysis({ subject: s, comps: c });
      setResult(res.data);
      toast.success('Comparable analysis generated');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Property (JSON)</label>
        <textarea
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          rows={8}
          className="w-full font-mono text-xs border rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comparable Sales (JSON array)</label>
        <textarea
          value={comps}
          onChange={(e) => setComps(e.target.value)}
          rows={8}
          className="w-full font-mono text-xs border rounded-lg px-3 py-2"
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
        {loading ? 'Analyzing...' : 'Run CMA'}
      </button>
      <ResultBlock result={result} />
    </form>
  );
}

function ComplianceCheckerForm() {
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('listing');
  const [jurisdiction, setJurisdiction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) { toast.error('Content is required'); return; }
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await aiAPI.complianceChecker({ content, contentType, jurisdiction });
      setResult(res.data);
      toast.success('Compliance check complete');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="listing">Listing Description</option>
            <option value="disclosure">Disclosure</option>
            <option value="contract">Contract</option>
            <option value="advertisement">Advertisement</option>
            <option value="email">Outreach Email</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
          <input
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="e.g., California, FHA"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content to Check</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Paste listing copy, disclosure, contract clause, etc."
          className="w-full text-sm border rounded-lg px-3 py-2"
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
        {loading ? 'Checking...' : 'Check Compliance'}
      </button>
      <ResultBlock result={result} />
    </form>
  );
}

export default function AILegalTools() {
  const [activeTab, setActiveTab] = useState('comparable-analysis');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-100 text-amber-700 rounded-lg p-2">
          <ScaleIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CMA &amp; Compliance Tools</h1>
          <p className="text-sm text-gray-600">AI-powered comparable analysis and compliance checking.</p>
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
                className={`w-full text-left p-4 rounded-lg border ${active ? `border-${t.color}-500 bg-${t.color}-50` : 'border-gray-200 bg-white'} hover:border-${t.color}-400`}
              >
                <Icon className="h-5 w-5 mb-2 text-gray-700" />
                <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                <div className="text-xs text-gray-500 mt-1">{t.description}</div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'comparable-analysis' && <ComparableAnalysisForm />}
          {activeTab === 'compliance-checker' && <ComplianceCheckerForm />}
        </div>
      </div>
    </div>
  );
}
