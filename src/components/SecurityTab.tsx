'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoginHistory {
  id: string;
  date: string;
  ip: string;
  location: string;
  device: string;
  status: 'success' | 'failed';
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeout: number;
  passwordLastChanged: string;
}

export default function SecurityTab() {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: 30,
    passwordLastChanged: '2024-09-15'
  });

  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      const response = await fetch('/api/security');
      const data = await response.json();

      setSecuritySettings({
        twoFactorEnabled: data.twoFactorEnabled,
        loginAlerts: data.loginAlerts,
        sessionTimeout: data.sessionTimeout,
        passwordLastChanged: data.passwordLastChanged
      });

      setLoginHistory(data.loginHistory);
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'changePassword',
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSecuritySettings(prev => ({
          ...prev,
          passwordLastChanged: new Date().toISOString().split('T')[0]
        }));

        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        alert('Password changed successfully!');
      } else {
        alert('Failed to change password: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    setIsEnabling2FA(true);
    try {
      const response = await fetch('/api/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle2FA',
          enabled: !securitySettings.twoFactorEnabled
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: result.twoFactorEnabled
        }));

        alert(result.twoFactorEnabled ? '2FA enabled successfully!' : '2FA disabled successfully!');
      } else {
        alert('Failed to update 2FA settings: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to update 2FA settings. Please try again.');
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    try {
      const response = await fetch('/api/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateSecuritySettings',
          loginAlerts: securitySettings.loginAlerts,
          sessionTimeout: securitySettings.sessionTimeout
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Security settings updated successfully!');
      } else {
        alert('Failed to update security settings: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to update security settings. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-8">
      {/* Password Change */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <h3 className="text-xl font-semibold text-slate-900 mb-6">Change Password</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={isChangingPassword}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Last changed: {formatDate(securitySettings.passwordLastChanged)}
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Two-Factor Authentication</h3>
            <p className="text-slate-600 text-sm">Add an extra layer of security to your account</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              securitySettings.twoFactorEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={handleToggle2FA}
              disabled={isEnabling2FA}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                securitySettings.twoFactorEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isEnabling2FA ? 'Processing...' : securitySettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>

        {securitySettings.twoFactorEnabled && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">Two-factor authentication is enabled</p>
                <p className="text-sm text-green-700">Your account is protected with an additional security layer</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <h3 className="text-xl font-semibold text-slate-900 mb-6">Security Settings</h3>
        <div className="space-y-6 max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-slate-900">Login Alerts</label>
              <p className="text-sm text-slate-600">Get notified of new login attempts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={securitySettings.loginAlerts}
                onChange={(e) => setSecuritySettings(prev => ({ ...prev, loginAlerts: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout (minutes)</label>
            <select
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
            </select>
          </div>

          <button
            onClick={handleSaveSecuritySettings}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Security Settings
          </button>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <h3 className="text-xl font-semibold text-slate-900 mb-6">Recent Login Activity</h3>
        <div className="space-y-4">
          {loginHistory.map((login) => (
            <motion.div
              key={login.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  login.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <p className="font-medium text-slate-900">{login.device}</p>
                  <div className="flex items-center space-x-3 text-sm text-slate-500">
                    <span>{formatDate(login.date)}</span>
                    <span>•</span>
                    <span>{login.ip}</span>
                    <span>•</span>
                    <span>{login.location}</span>
                  </div>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(login.status)}`}>
                {login.status.charAt(0).toUpperCase() + login.status.slice(1)}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-900">Security Tip</p>
              <p className="text-sm text-blue-700">If you see any suspicious activity, change your password immediately and contact support.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}