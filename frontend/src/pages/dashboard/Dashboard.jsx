import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showings, setShowings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [overviewRes, tasksRes, showingsRes] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getTasks(5),
        dashboardAPI.getShowings(5)
      ]);
      setOverview(overviewRes.data);
      setTasks(tasksRes.data);
      setShowings(showingsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Leads',
      value: overview?.leads?.total || 0,
      subtext: `${overview?.leads?.newThisMonth || 0} new this month`,
      icon: UserGroupIcon,
      color: 'bg-blue-500',
      href: '/leads'
    },
    {
      name: 'Active Listings',
      value: overview?.listings?.active || 0,
      icon: BuildingOfficeIcon,
      color: 'bg-green-500',
      href: '/properties'
    },
    {
      name: 'Pending Transactions',
      value: overview?.transactions?.pending || 0,
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
      href: '/transactions'
    },
    {
      name: 'Closed This Year',
      value: overview?.transactions?.closedThisYear || 0,
      subtext: `$${((overview?.transactions?.volumeThisYear || 0) / 1000000).toFixed(1)}M volume`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      href: '/transactions'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="stat-card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-card-label">{stat.name}</p>
                <p className="stat-card-value">{stat.value}</p>
                {stat.subtext && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                )}
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Showings */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Showings</h2>
            <Link to="/showings" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {showings.length > 0 ? (
            <div className="space-y-4">
              {showings.map((showing) => (
                <div key={showing.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {showing.property?.address}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(showing.scheduledAt).toLocaleString()} •{' '}
                      {showing.lead?.firstName} {showing.lead?.lastName}
                    </p>
                  </div>
                  <span className={`badge ${
                    showing.status === 'CONFIRMED' ? 'badge-green' : 'badge-blue'
                  }`}>
                    {showing.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming showings</p>
          )}
        </div>

        {/* Tasks Due */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tasks Due</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <ClipboardDocumentListIcon className={`h-8 w-8 ${
                      task.priority === 'URGENT' ? 'text-red-500' :
                      task.priority === 'HIGH' ? 'text-orange-500' :
                      'text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                  <span className={`badge ${
                    task.priority === 'URGENT' ? 'badge-red' :
                    task.priority === 'HIGH' ? 'badge-yellow' :
                    'badge-gray'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No tasks due</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/leads/new"
            className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <UserGroupIcon className="h-8 w-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Add Lead</span>
          </Link>
          <Link
            to="/properties/new"
            className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <BuildingOfficeIcon className="h-8 w-8 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Add Listing</span>
          </Link>
          <Link
            to="/transactions/new"
            className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <DocumentTextIcon className="h-8 w-8 text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">New Transaction</span>
          </Link>
          <Link
            to="/showings"
            className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <CalendarIcon className="h-8 w-8 text-orange-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Schedule Showing</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
