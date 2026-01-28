import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await usersAPI.update(user.id, profile);
      updateUser({ ...user, ...res.data });
      toast.success('Profile updated');
    } catch (error) { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await authAPI.updatePassword({ currentPassword: password.current, newPassword: password.new });
      toast.success('Password updated');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (error) { toast.error(error.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className="input" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} className="input" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={user?.email} className="input bg-gray-50" disabled /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="input" /></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={password.new} onChange={(e) => setPassword({ ...password, new: e.target.value })} className="input" required minLength={6} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label><input type="password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} className="input" required /></div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}
