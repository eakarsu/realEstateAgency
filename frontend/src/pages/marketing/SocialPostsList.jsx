import { useState, useEffect } from 'react';
import { socialPostsAPI, propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AIResponseModal from '../../components/AIResponseModal';
import { PlusIcon, SparklesIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function SocialPostsList() {
  const [posts, setPosts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({ platform: 'INSTAGRAM', propertyId: '', content: '' });
  const [aiModal, setAiModal] = useState({ isOpen: false, data: null });
  const [selectedPost, setSelectedPost] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { Promise.all([socialPostsAPI.getAll(), propertiesAPI.getAll({ status: 'ACTIVE' })]).then(([sp, p]) => { setPosts(sp.data.posts); setProperties(p.data.properties); }).finally(() => setLoading(false)); }, []);

  const handleGenerate = async () => {
    if (!formData.propertyId) { toast.error('Select a property'); return; }
    setGenerating(true);
    try {
      const res = await socialPostsAPI.generate(formData.propertyId, formData.platform);
      setAiModal({ isOpen: true, data: { platform: formData.platform, content: res.data.content, hashtags: res.data.hashtags || [] } });
      setFormData({ ...formData, content: res.data.content });
    }
    catch (error) { toast.error('Failed to generate'); }
    finally { setGenerating(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await socialPostsAPI.create(formData); toast.success('Created'); setShowForm(false); socialPostsAPI.getAll().then(res => setPosts(res.data.posts)); }
    catch (error) { toast.error('Failed'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Social Posts</h1><p className="text-gray-600">Create and schedule social media posts</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />Create Post</button>
      </div>
      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <select value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="select">
                <option value="INSTAGRAM">Instagram</option><option value="FACEBOOK">Facebook</option><option value="TWITTER">Twitter</option><option value="LINKEDIN">LinkedIn</option>
              </select>
              <select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="select">
                <option value="">Select property (optional)</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
              <button type="button" onClick={handleGenerate} disabled={generating} className="btn-secondary flex items-center justify-center gap-2">
                <SparklesIcon className="h-5 w-5" />{generating ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="input" rows={4} placeholder="Post content..." required />
            <div className="flex gap-2"><button type="submit" className="btn-primary">Create Post</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div key={post.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPost(post)}>
            <div className="flex items-center justify-between mb-2">
              <span className="badge badge-blue">{post.platform}</span>
              <span className={`badge ${post.status === 'PUBLISHED' ? 'badge-green' : post.status === 'SCHEDULED' ? 'badge-yellow' : 'badge-gray'}`}>{post.status}</span>
            </div>
            <p className="text-gray-700 text-sm line-clamp-4">{post.content}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(post.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
        {posts.length === 0 && <div className="col-span-3 text-center py-12 text-gray-500">No posts yet</div>}
      </div>

      <AIResponseModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ isOpen: false, data: null })}
        title="AI Generated Social Post"
        data={aiModal.data}
        type="social-post"
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedPost(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <span className="badge badge-blue">{selectedPost.platform}</span>
                  <span className={`badge ${selectedPost.status === 'PUBLISHED' ? 'badge-green' : selectedPost.status === 'SCHEDULED' ? 'badge-yellow' : 'badge-gray'}`}>{selectedPost.status}</span>
                </div>
                <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700 whitespace-pre-wrap mb-4">{selectedPost.content}</p>
                {selectedPost.property && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-500">Property</p>
                    <p className="font-medium">{selectedPost.property.address}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created: {new Date(selectedPost.createdAt).toLocaleString()}</span>
                  {selectedPost.scheduledAt && <span>Scheduled: {new Date(selectedPost.scheduledAt).toLocaleString()}</span>}
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
                <button onClick={() => copyToClipboard(selectedPost.content)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                  {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy content'}
                </button>
                <button onClick={() => setSelectedPost(null)} className="btn-primary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
