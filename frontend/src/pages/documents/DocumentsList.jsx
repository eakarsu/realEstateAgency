import { useState, useEffect, useRef } from 'react';
import { documentsAPI, transactionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  PlusIcon,
  DocumentIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

const docTypes = ['CONTRACT', 'DISCLOSURE', 'INSPECTION', 'ADDENDUM', 'OTHER'];
const signatureStatuses = ['NOT_REQUIRED', 'PENDING', 'SIGNED', 'REJECTED'];

export default function DocumentsList() {
  const [documents, setDocuments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [formData, setFormData] = useState({
    name: '',
    type: 'CONTRACT',
    transactionId: '',
    url: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsRes, txRes] = await Promise.all([
        documentsAPI.getAll(),
        transactionsAPI.getAll()
      ]);
      setDocuments(docsRes.data.documents || docsRes.data || []);
      setTransactions(txRes.data.transactions || txRes.data || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name from file name if empty
      if (!formData.name) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setFormData({ ...formData, name: fileName });
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let documentUrl = formData.url;

      // If a file was selected, upload it first
      if (selectedFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', selectedFile);

          const uploadRes = await documentsAPI.upload(uploadFormData);
          documentUrl = uploadRes.data.url || uploadRes.data.fileUrl || '';
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          // If upload fails, we'll still create the document record
          // Some systems might not have file storage configured
          toast.error('File upload not available - saving document info only');
        }
      }

      const docData = {
        ...formData,
        url: documentUrl
      };

      if (selectedDoc) {
        await documentsAPI.update(selectedDoc.id, docData);
        toast.success('Document updated');
      } else {
        await documentsAPI.create(docData);
        toast.success('Document created');
      }

      closeForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save document');
    } finally {
      setUploading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedDoc(null);
    setSelectedFile(null);
    setFormData({ name: '', type: 'CONTRACT', transactionId: '', url: '', notes: '' });
  };

  const handleEdit = (doc) => {
    setSelectedDoc(doc);
    setFormData({
      name: doc.name,
      type: doc.type,
      transactionId: doc.transactionId || '',
      url: doc.url || '',
      notes: doc.notes || ''
    });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await documentsAPI.delete(id);
          toast.success('Document deleted');
          loadData();
        } catch (error) {
          toast.error('Failed to delete document');
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleSignatureUpdate = async (id, status) => {
    try {
      await documentsAPI.updateSignature(id, status);
      toast.success('Signature status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update signature status');
    }
  };

  const getSignatureIcon = (status) => {
    switch (status) {
      case 'SIGNED': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'PENDING': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'REJECTED': return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default: return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your transaction documents</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setSelectedDoc(null); setSelectedFile(null); setFormData({ name: '', type: 'CONTRACT', transactionId: '', url: '', notes: '' }); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Document
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={closeForm}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <DocumentArrowUpIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">{selectedDoc ? 'Edit Document' : 'Upload Document'}</h3>
                </div>
                <button onClick={closeForm} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* File Upload Area */}
                {!selectedDoc && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive ? 'border-blue-500 bg-blue-50' :
                        selectedFile ? 'border-green-500 bg-green-50' :
                        'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                      />

                      {selectedFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-3">
                            <DocumentIcon className="h-10 w-10 text-green-600" />
                            <div className="text-left">
                              <p className="font-medium text-gray-900">{selectedFile.name}</p>
                              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-2">
                            <span className="font-medium">Drag and drop</span> your file here, or
                          </p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-secondary"
                          >
                            Browse Files
                          </button>
                          <p className="text-xs text-gray-400 mt-3">
                            PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Or URL option */}
                {!selectedDoc && !selectedFile && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white text-gray-500">or paste URL</span>
                    </div>
                  </div>
                )}

                {/* URL Input (shown when no file selected or editing) */}
                {(selectedDoc || !selectedFile) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Purchase Agreement"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="select"
                    >
                      {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction</label>
                    <select
                      value={formData.transactionId}
                      onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                      className="select"
                    >
                      <option value="">No Transaction</option>
                      {transactions.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.property?.address || `Transaction #${t.id.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Add any notes about this document..."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-5 w-5" />
                        {selectedDoc ? 'Update Document' : 'Save Document'}
                      </>
                    )}
                  </button>
                  <button type="button" onClick={closeForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <div key={doc.id} className="card p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEdit(doc)}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DocumentIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                  <span className="badge badge-gray text-xs">{doc.type}</span>
                </div>
              </div>
              {getSignatureIcon(doc.signatureStatus)}
            </div>

            {doc.transaction && (
              <p className="text-sm text-gray-500 mb-3">
                {doc.transaction.property?.address || 'Transaction linked'}
              </p>
            )}

            {doc.notes && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.notes}</p>
            )}

            <div className="flex items-center justify-between pt-4 border-t" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-1">
                <select
                  value={doc.signatureStatus}
                  onChange={(e) => handleSignatureUpdate(doc.id, e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  {signatureStatuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => handleEdit(doc)} className="p-2 text-gray-400 hover:text-blue-600">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12 text-gray-500 card">
          <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm">Click "Add Document" to upload your first document</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
}
