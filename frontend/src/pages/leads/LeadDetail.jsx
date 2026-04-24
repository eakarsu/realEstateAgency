import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { leadsAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AIResponseModal from '../../components/AIResponseModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  HomeIcon,
  EnvelopeOpenIcon
} from '@heroicons/react/24/outline';

const statusColors = {
  NEW: 'badge-blue',
  CONTACTED: 'badge-gray',
  QUALIFIED: 'badge-green',
  NURTURING: 'badge-purple',
  SHOWING: 'badge-yellow',
  NEGOTIATING: 'badge-orange',
  CLOSED_WON: 'badge-green',
  CLOSED_LOST: 'badge-red'
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityForm, setActivityForm] = useState({
    type: 'NOTE',
    subject: '',
    description: ''
  });
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [matcherLoading, setMatcherLoading] = useState(false);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [aiModal, setAiModal] = useState({ isOpen: false, data: null, type: 'lead-qualify' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const [leadRes, activitiesRes] = await Promise.all([
        leadsAPI.getById(id),
        leadsAPI.getActivities(id)
      ]);
      setLead(leadRes.data);
      setActivities(activitiesRes.data);
    } catch (error) {
      toast.error('Failed to load lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await leadsAPI.addActivity(id, activityForm);
      toast.success('Activity added');
      setActivityForm({ type: 'NOTE', subject: '', description: '' });
      setShowActivityForm(false);
      loadLead();
    } catch (error) {
      toast.error('Failed to add activity');
    }
  };

  const handleAIQualify = async () => {
    setAiLoading(true);
    try {
      const res = await aiAPI.qualifyLead(id);
      setAiModal({ isOpen: true, data: res.data, type: 'lead-qualify' });
      loadLead();
    } catch (error) {
      toast.error('Failed to qualify lead');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePropertyMatcher = async () => {
    setMatcherLoading(true);
    try {
      const res = await aiAPI.matchProperties(id, 5);
      setAiModal({ isOpen: true, data: res.data, type: 'property-matcher' });
    } catch (error) {
      toast.error('Failed to match properties');
    } finally {
      setMatcherLoading(false);
    }
  };

  const handleFollowUpSequence = async () => {
    setSequenceLoading(true);
    try {
      const res = await aiAPI.followUpSequence(id, 'general');
      setAiModal({ isOpen: true, data: res.data, type: 'follow-up-sequence' });
    } catch (error) {
      toast.error('Failed to generate follow-up sequence');
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmedDelete = async () => {
    try {
      await leadsAPI.delete(id);
      toast.success('Lead deleted');
      navigate('/leads');
    } catch (error) {
      toast.error('Failed to delete lead');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/leads" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            &larr; Back to Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className={`badge ${statusColors[lead.status]}`}>
              {lead.status.replace('_', ' ')}
            </span>
            <span className="text-gray-500">Score: {lead.score}/100</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleAIQualify} disabled={aiLoading} className="btn-secondary flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            {aiLoading ? 'Analyzing...' : 'AI Qualify'}
          </button>
          <button onClick={handlePropertyMatcher} disabled={matcherLoading} className="btn-secondary flex items-center gap-2">
            <HomeIcon className="h-5 w-5" />
            {matcherLoading ? 'Matching...' : 'Match Properties'}
          </button>
          <button onClick={handleFollowUpSequence} disabled={sequenceLoading} className="btn-secondary flex items-center gap-2">
            <EnvelopeOpenIcon className="h-5 w-5" />
            {sequenceLoading ? 'Generating...' : 'Follow-up Emails'}
          </button>
          <Link to={`/leads/${id}/edit`} className="btn-secondary flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <TrashIcon className="h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Lead Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Source</dt>
                <dd className="font-medium">{lead.source?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Budget</dt>
                <dd className="font-medium">{lead.budget ? `$${lead.budget.toLocaleString()}` : '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Timeline</dt>
                <dd className="font-medium">{lead.timeline || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Property Type</dt>
                <dd className="font-medium">{lead.propertyType || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Preferred Areas</dt>
                <dd className="font-medium">
                  {lead.preferredAreas?.length > 0 ? lead.preferredAreas.join(', ') : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Assigned Agent</dt>
                <dd className="font-medium">
                  {lead.agent ? `${lead.agent.user?.firstName} ${lead.agent.user?.lastName}` : 'Unassigned'}
                </dd>
              </div>
            </dl>
          </div>

          {lead.tags?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((t) => (
                  <span
                    key={t.tag.id}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: t.tag.color + '20', color: t.tag.color }}
                  >
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {lead.notes && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Activities */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Activity Timeline</h2>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="btn-primary"
              >
                Log Activity
              </button>
            </div>

            {showActivityForm && (
              <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={activityForm.type}
                      onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                      className="select"
                    >
                      <option value="NOTE">Note</option>
                      <option value="CALL">Call</option>
                      <option value="EMAIL">Email</option>
                      <option value="MEETING">Meeting</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={activityForm.subject}
                      onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={activityForm.description}
                    onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">Save Activity</button>
                  <button type="button" onClick={() => setShowActivityForm(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'CALL' ? 'bg-green-100 text-green-600' :
                      activity.type === 'EMAIL' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'MEETING' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'CALL' ? <PhoneIcon className="h-5 w-5" /> :
                       activity.type === 'EMAIL' ? <EnvelopeIcon className="h-5 w-5" /> :
                       activity.type === 'MEETING' ? <CalendarIcon className="h-5 w-5" /> :
                       <ChatBubbleLeftIcon className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{activity.subject}</p>
                        <span className="text-sm text-gray-500">
                          {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-gray-600 mt-1">{activity.description}</p>
                      )}
                      {activity.user && (
                        <p className="text-sm text-gray-500 mt-1">
                          by {activity.user.firstName} {activity.user.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No activities yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AIResponseModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ isOpen: false, data: null, type: 'lead-qualify' })}
        title={
          aiModal.type === 'lead-qualify' ? 'Lead Qualification Analysis' :
          aiModal.type === 'property-matcher' ? 'AI Property Matches' :
          aiModal.type === 'follow-up-sequence' ? 'AI Follow-up Email Sequence' :
          'AI Response'
        }
        data={aiModal.data}
        type={aiModal.type}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmedDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this lead?"
        variant="danger"
      />
    </div>
  );
}
