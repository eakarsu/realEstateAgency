import { useState, useEffect } from 'react';
import { messagesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  EnvelopeIcon,
  EnvelopeOpenIcon,
  TrashIcon,
  XMarkIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

export default function MessagesList() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const res = await messagesAPI.getAll();
      setMessages(res.data.messages || res.data);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await messagesAPI.markRead(id);
      loadMessages();
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await messagesAPI.delete(id);
          toast.success('Message deleted');
          if (selectedMessage?.id === id) {
            setSelectedMessage(null);
          }
          loadMessages();
        } catch (error) {
          toast.error('Failed to delete message');
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const openMessage = async (message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await handleMarkRead(message.id);
    }
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600">Your inbox and communications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold">Inbox</h3>
              <p className="text-sm text-gray-500">
                {messages.filter(m => !m.isRead).length} unread
              </p>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => openMessage(message)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedMessage?.id === message.id ? 'bg-blue-50' : ''
                  } ${!message.isRead ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {message.isRead ? (
                        <EnvelopeOpenIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${!message.isRead ? 'font-semibold' : ''}`}>
                          {message.sender?.firstName} {message.sender?.lastName || message.senderName || 'System'}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!message.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {message.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {message.content?.substring(0, 50)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <EnvelopeIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="card">
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserCircleIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">
                        {selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName || selectedMessage.senderName || 'System'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedMessage.sender?.email || selectedMessage.senderEmail || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-xl mb-4">{selectedMessage.subject}</h3>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{selectedMessage.content}</p>
                </div>
              </div>
              {selectedMessage.lead && (
                <div className="px-6 py-4 border-t bg-gray-50">
                  <p className="text-sm text-gray-500">
                    Related to lead: <span className="font-medium text-gray-700">
                      {selectedMessage.lead.firstName} {selectedMessage.lead.lastName}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              <EnvelopeIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a message to read</p>
              <p className="text-sm">Choose a message from your inbox to view its contents</p>
            </div>
          )}
        </div>
      </div>

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
