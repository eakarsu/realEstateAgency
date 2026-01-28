import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HomeIcon, MagnifyingGlassIcon, HeartIcon, BookmarkIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const navItems = [
  { name: 'Dashboard', href: '/portal', icon: HomeIcon },
  { name: 'Search', href: '/portal/search', icon: MagnifyingGlassIcon },
  { name: 'Favorites', href: '/portal/favorites', icon: HeartIcon },
  { name: 'Saved Searches', href: '/portal/saved-searches', icon: BookmarkIcon },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/portal" className="flex items-center gap-2">
                <HomeIcon className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Client Portal</span>
              </Link>
              <div className="hidden md:flex ml-10 gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/settings" className="p-2 text-gray-500 hover:text-gray-700">
                <Cog6ToothIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user?.firstName} {user?.lastName}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center px-3 py-2 text-xs ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <item.icon className="h-6 w-6 mb-1" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
