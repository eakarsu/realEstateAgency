import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';
import AIChatbotWidget from '../AIChatbotWidget';
import {
  HomeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CalendarIcon,
  MegaphoneIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  LinkIcon,
  EnvelopeIcon,
  DocumentIcon,
  SparklesIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Leads', href: '/leads', icon: UserGroupIcon },
  { name: 'Properties', href: '/properties', icon: BuildingOfficeIcon },
  { name: 'Transactions', href: '/transactions', icon: DocumentTextIcon },
  { name: 'Documents', href: '/documents', icon: DocumentIcon },
  { name: 'Showings', href: '/showings', icon: CalendarIcon },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Messages', href: '/messages', icon: EnvelopeIcon },
];

const marketingNav = [
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Open Houses', href: '/open-houses', icon: CalendarIcon },
  { name: 'Social Posts', href: '/social-posts', icon: MegaphoneIcon },
  { name: 'Flyers', href: '/flyers', icon: DocumentTextIcon },
];

const teamNav = [
  { name: 'Agents', href: '/agents', icon: UsersIcon },
  { name: 'Teams', href: '/teams', icon: UserGroupIcon },
];

const reportsNav = [
  { name: 'Market Reports', href: '/market-reports', icon: ChartBarIcon },
  { name: 'Performance', href: '/performance', icon: ChartBarIcon },
  { name: 'Commissions', href: '/commissions', icon: CurrencyDollarIcon },
];

const settingsNav = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Integrations', href: '/integrations', icon: LinkIcon },
];

const aiNav = [
  { name: 'AI Hub', href: '/ai-hub', icon: SparklesIcon },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsAPI.getAll({ limit: 10 }),
        notificationsAPI.getUnreadCount()
      ]);
      setNotifications(notifRes.data.notifications || notifRes.data || []);
      setUnreadCount(countRes.data.count || 0);
    } catch (error) {
      console.error('Failed to load notifications');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LEAD': return <UserGroupIcon className="h-5 w-5 text-blue-500" />;
      case 'SHOWING': return <CalendarIcon className="h-5 w-5 text-purple-500" />;
      case 'TRANSACTION': return <DocumentIcon className="h-5 w-5 text-green-500" />;
      case 'MESSAGE': return <EnvelopeIcon className="h-5 w-5 text-orange-500" />;
      default: return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    return (
      <Link
        to={item.href}
        className={`sidebar-link min-h-[44px] ${isActive ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      >
        <item.icon className="h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  const NavSection = ({ title, items }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <div className="mb-4">
        <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>{title}</span>
          <button
            type="button"
            className="lg:hidden cursor-pointer p-1"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
          >
            <ChevronDownIcon
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isExpanded ? '' : 'rotate-180'
              }`}
            />
          </button>
        </h3>
        {/* Always visible on desktop (lg:block), toggled on mobile */}
        <nav className={`space-y-1 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
          {items.map((item) => (
            <NavLink key={item.name} item={item} />
          ))}
        </nav>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-xl">RealEstate</span>
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2">
          <nav className="space-y-1 mb-4">
            {navigation.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </nav>

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'AGENT') && (
            <NavSection title="Marketing" items={marketingNav} />
          )}

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <NavSection title="Team" items={teamNav} />
          )}

          <NavSection title="Reports" items={reportsNav} />

          <NavSection title="AI Tools" items={aiNav} />

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <NavSection title="Settings" items={settingsNav} />
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <UserCircleIcon className="h-10 w-10 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 relative"
                >
                  <BellIcon className="h-6 w-6 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              handleMarkRead(notif.id);
                              if (notif.link) navigate(notif.link);
                              setNotificationsOpen(false);
                            }}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                              !notif.isRead ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notif.isRead ? 'font-semibold' : ''}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {!notif.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t bg-gray-50 rounded-b-xl">
                      <Link
                        to="/messages"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-sm text-blue-600 hover:text-blue-800 block text-center"
                      >
                        View all messages
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link to="/settings" className="flex items-center gap-2">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* AI Chatbot Widget */}
      <AIChatbotWidget />
    </div>
  );
}
