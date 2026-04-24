import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { validateForm, validators } from '../../utils/validation';

const validationSchema = {
  email: ['required', 'email'],
  password: ['required', validators.minLength(6)]
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const formData = { email, password };
    setErrors(validateForm(formData, validationSchema));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = { email, password };
    const validationErrors = validateForm(formData, validationSchema);
    setErrors(validationErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      if (user.role === 'CLIENT') {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BuildingOfficeIcon className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Real Estate Platform</h2>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`input ${touched.email && errors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
                required
              />
              {touched.email && errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`input ${touched.password && errors.password ? 'border-red-300 focus:ring-red-500' : ''}`}
                required
              />
              {touched.password && errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-3">Demo Accounts (Click to auto-fill):</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setEmail('admin@realestate.com'); setPassword('password123'); }}
              className="text-left px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <span className="block text-xs font-semibold text-blue-800">Admin</span>
              <span className="block text-xs text-blue-600 truncate">admin@realestate.com</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('manager@realestate.com'); setPassword('password123'); }}
              className="text-left px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <span className="block text-xs font-semibold text-blue-800">Manager</span>
              <span className="block text-xs text-blue-600 truncate">manager@realestate.com</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('john@realestate.com'); setPassword('password123'); }}
              className="text-left px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <span className="block text-xs font-semibold text-blue-800">Agent</span>
              <span className="block text-xs text-blue-600 truncate">john@realestate.com</span>
            </button>
            <button
              type="button"
              onClick={() => { setEmail('client@example.com'); setPassword('password123'); }}
              className="text-left px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <span className="block text-xs font-semibold text-blue-800">Client</span>
              <span className="block text-xs text-blue-600 truncate">client@example.com</span>
            </button>
          </div>
          <p className="text-xs text-blue-600 mt-2 text-center">Password: password123</p>
        </div>
      </div>
    </div>
  );
}
