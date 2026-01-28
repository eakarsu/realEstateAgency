import { useState, useEffect } from 'react';
import { tasksAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CalendarIcon,
  FlagIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const priorityColors = { LOW: 'badge-gray', MEDIUM: 'badge-blue', HIGH: 'badge-yellow', URGENT: 'badge-red' };
const priorityBgColors = { LOW: 'bg-gray-100 text-gray-700', MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-yellow-100 text-yellow-700', URGENT: 'bg-red-100 text-red-700' };
const statusColors = { PENDING: 'bg-gray-100 text-gray-700', IN_PROGRESS: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700' };

export default function TasksList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [formData, setFormData] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => { loadTasks(); }, [filter]);
  const loadTasks = () => tasksAPI.getAll(filter).then(res => setTasks(res.data.tasks)).finally(() => setLoading(false));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await tasksAPI.create(formData); toast.success('Task created'); setShowForm(false); setFormData({ title: '', description: '', dueDate: '', priority: 'MEDIUM' }); loadTasks(); }
    catch (error) { toast.error('Failed'); }
  };

  const handleComplete = async (id, e) => {
    if (e) e.stopPropagation();
    try { await tasksAPI.complete(id); toast.success('Completed'); loadTasks(); setSelectedTask(null); }
    catch (error) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.update(selectedTask.id, editData);
      toast.success('Task updated');
      setEditMode(false);
      setSelectedTask({ ...selectedTask, ...editData });
      loadTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setEditData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      priority: task.priority
    });
    setEditMode(false);
  };

  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', class: 'text-red-600 bg-red-50' };
    if (diffDays === 0) return { text: 'Due Today', class: 'text-orange-600 bg-orange-50' };
    if (diffDays === 1) return { text: 'Due Tomorrow', class: 'text-yellow-600 bg-yellow-50' };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, class: 'text-blue-600 bg-blue-50' };
    return { text: `Due in ${diffDays} days`, class: 'text-gray-600 bg-gray-50' };
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Tasks</h1><p className="text-gray-600">Manage your tasks and to-dos</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="h-5 w-5" />Add Task</button>
      </div>
      <div className="flex gap-4 mb-6">
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="select w-40">
          <option value="">All Status</option><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option>
        </select>
        <select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })} className="select w-40">
          <option value="">All Priority</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
        </select>
      </div>
      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Task title" required />
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} placeholder="Description" />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="input" />
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="select">
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn-primary">Create</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
          </form>
        </div>
      )}
      <div className="space-y-3">
        {tasks.map((task) => {
          const dueDateStatus = getDueDateStatus(task.dueDate);
          return (
            <div
              key={task.id}
              className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openTaskDetail(task)}
            >
              <button
                onClick={(e) => task.status !== 'COMPLETED' && handleComplete(task.id, e)}
                disabled={task.status === 'COMPLETED'}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${task.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}
              >
                {task.status === 'COMPLETED' && <CheckIcon className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>{task.title}</p>
                {task.description && <p className="text-sm text-gray-500 truncate">{task.description}</p>}
              </div>
              <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
              {task.dueDate && (
                <span className={`text-sm px-2 py-1 rounded ${dueDateStatus?.class || 'text-gray-500'}`}>
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
        {tasks.length === 0 && <div className="text-center py-12 text-gray-500">No tasks</div>}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedTask(null)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
              {/* Header */}
              <div className={`flex items-center justify-between px-6 py-4 rounded-t-xl ${
                selectedTask.priority === 'URGENT' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                selectedTask.priority === 'HIGH' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                selectedTask.priority === 'MEDIUM' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                'bg-gradient-to-r from-gray-500 to-gray-600'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-lg p-2">
                    <FlagIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Task Details</h3>
                    <p className="text-white/80 text-sm">{selectedTask.priority} Priority</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-white/80 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {!editMode ? (
                  <div className="space-y-6">
                    {/* Title & Status */}
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h2 className={`text-xl font-bold text-gray-900 ${selectedTask.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                          {selectedTask.title}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedTask.status]}`}>
                          {selectedTask.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedTask.description && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 mb-1">Description</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Priority */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FlagIcon className="h-5 w-5 text-gray-400" />
                          <p className="text-sm text-gray-500">Priority</p>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${priorityBgColors[selectedTask.priority]}`}>
                          {selectedTask.priority}
                        </span>
                      </div>

                      {/* Due Date */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="h-5 w-5 text-gray-400" />
                          <p className="text-sm text-gray-500">Due Date</p>
                        </div>
                        {selectedTask.dueDate ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(selectedTask.dueDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {getDueDateStatus(selectedTask.dueDate) && (
                              <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${getDueDateStatus(selectedTask.dueDate).class}`}>
                                {getDueDateStatus(selectedTask.dueDate).text}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400">No due date</p>
                        )}
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="border-t pt-4 space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        <span>Created: {new Date(selectedTask.createdAt).toLocaleString()}</span>
                      </div>
                      {selectedTask.completedAt && (
                        <div className="flex items-center gap-2">
                          <CheckIcon className="h-4 w-4 text-green-500" />
                          <span>Completed: {new Date(selectedTask.completedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedTask.assignee && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Assigned to: {selectedTask.assignee.firstName} {selectedTask.assignee.lastName}</span>
                        </div>
                      )}
                    </div>

                    {/* Overdue Warning */}
                    {selectedTask.status !== 'COMPLETED' && selectedTask.dueDate && new Date(selectedTask.dueDate) < new Date() && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-800">This task is overdue</p>
                          <p className="text-sm text-red-600">Please complete or reschedule this task.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit Form */
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="input"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={editData.dueDate}
                          onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                          value={editData.priority}
                          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                          className="select"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary">Save Changes</button>
                      <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer Actions */}
              {!editMode && (
                <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(true)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedTask.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {selectedTask.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleComplete(selectedTask.id)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Mark Complete
                      </button>
                    )}
                    <button onClick={() => setSelectedTask(null)} className="btn-secondary">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
