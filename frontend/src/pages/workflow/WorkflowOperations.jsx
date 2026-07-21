import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { workflowAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function CountCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function WorkflowOperations() {
  const { user } = useAuth();
  const [queue, setQueue] = useState({ handoffs: [], outreach: [], operations: [] });
  const [metrics, setMetrics] = useState(null);
  const [audit, setAudit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const requests = [workflowAPI.queue(), workflowAPI.metrics()];
      if (user?.role === 'ADMIN') requests.push(workflowAPI.verifyAudit());
      const [queueResponse, metricsResponse, auditResponse] = await Promise.all(requests);
      setQueue(queueResponse.data);
      setMetrics(metricsResponse.data);
      if (auditResponse) setAudit(auditResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load workflow controls');
    }
  }, [user?.role]);

  useEffect(() => { load(); }, [load]);

  const act = async (operation, success) => {
    setBusy(true);
    try {
      await operation();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Workflow action failed');
    } finally {
      setBusy(false);
    }
  };

  const decide = (kind, id, decision) => {
    const reason = window.prompt(`${decision === 'approve' ? 'Approval' : 'Rejection'} reason`);
    if (!reason) return;
    const request = kind === 'handoff'
      ? workflowAPI.reviewHandoff(id, decision, reason)
      : workflowAPI.reviewOutreach(id, decision, reason);
    act(() => request, `${kind === 'handoff' ? 'Handoff' : 'Outreach'} ${decision}d`);
  };

  if (!['ADMIN', 'MANAGER'].includes(user?.role)) {
    return <div className="card p-6">Workflow controls require a manager or administrator account.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Control</h1>
          <p className="text-sm text-gray-500">Human approvals, delivery retries, conversion, and data-quality evidence.</p>
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => act(() => workflowAPI.runOperations(), 'Due operations processed')}>Run due operations</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard label="Total leads" value={metrics?.totalLeads ?? '—'} />
        <CountCard label="Conversion rate" value={metrics ? `${(metrics.conversionRate * 100).toFixed(1)}%` : '—'} />
        <CountCard label="Missing consent" value={metrics?.dataQuality?.missingConsent ?? '—'} />
        <CountCard label="Suppressed" value={metrics?.dataQuality?.suppressed ?? '—'} />
      </div>

      {user.role === 'ADMIN' && (
        <div className={`rounded-xl border p-4 ${audit?.valid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          Audit chain: {audit ? (audit.valid ? `verified (${audit.checked} events)` : 'verification failed') : 'checking…'}
        </div>
      )}

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Handoff approvals ({queue.handoffs.length})</h2>
        <div className="space-y-3">
          {queue.handoffs.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <span>{item.lead.firstName} {item.lead.lastName} · {item.status}</span>
              {item.status === 'REQUESTED' && <div className="flex gap-2"><button disabled={busy} className="btn-primary" onClick={() => decide('handoff', item.id, 'approve')}>Approve</button><button disabled={busy} className="btn-secondary" onClick={() => decide('handoff', item.id, 'reject')}>Reject</button></div>}
            </div>
          ))}
          {!queue.handoffs.length && <p className="text-sm text-gray-500">No handoffs await review.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Outreach review ({queue.outreach.length})</h2>
        <div className="space-y-3">
          {queue.outreach.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <span>{item.lead.firstName} {item.lead.lastName} · {item.subject}</span>
              <div className="flex gap-2"><button disabled={busy} className="btn-primary" onClick={() => decide('outreach', item.id, 'approve')}>Approve</button><button disabled={busy} className="btn-secondary" onClick={() => decide('outreach', item.id, 'reject')}>Reject</button></div>
            </div>
          ))}
          {!queue.outreach.length && <p className="text-sm text-gray-500">No outreach drafts await review.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Integration operations ({queue.operations.length})</h2>
        <div className="space-y-3">
          {queue.operations.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <span>{item.providerConnection.name} · {item.kind} · {item.status} · attempt {item.attempts}</span>
              {user.role === 'ADMIN' && item.status === 'DEAD_LETTER' && <button disabled={busy} className="btn-secondary" onClick={() => act(() => workflowAPI.retryOperation(item.id), 'Operation queued for retry')}>Retry</button>}
            </div>
          ))}
          {!queue.operations.length && <p className="text-sm text-gray-500">No operations need attention.</p>}
        </div>
      </section>
    </div>
  );
}
