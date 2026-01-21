'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Save, User, Bell, Shield, CreditCard, 
  LogOut, Trash2, Mail, Phone, MapPin, CheckCircle, X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserSettings {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address?: string;
  city?: string;
  zip_code?: string;
  role: string;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setSettings({
        ...data,
        email_notifications: data.email_notifications ?? true,
        sms_notifications: data.sms_notifications ?? false
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: settings.full_name,
          phone: settings.phone,
          address: settings.address,
          city: settings.city,
          zip_code: settings.zip_code,
          email_notifications: settings.email_notifications,
          sms_notifications: settings.sms_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // In a real app, this would delete the user account
    // For now, we'll just sign them out
    await signOut();
    router.push('/');
  };

  const handleInputChange = (field: keyof UserSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-4">
                <Link
                  href={settings?.role === 'cleaner' ? '/dashboard/cleaner' : '/dashboard/customer'}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.includes('Error') ? (
                  <X className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {message}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="h-5 w-5" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    activeTab === 'notifications' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="h-5 w-5" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    activeTab === 'security' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="h-5 w-5" />
                  Security
                </button>
                {settings?.role === 'cleaner' && (
                  <button
                    onClick={() => setActiveTab('billing')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                      activeTab === 'billing' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    Billing
                  </button>
                )}
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-6">
                {activeTab === 'profile' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={settings?.full_name || ''}
                            onChange={(e) => handleInputChange('full_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={settings?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Contact support to change your email
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={settings?.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                          </label>
                          <input
                            type="text"
                            value={settings?.role === 'cleaner' ? 'Cleaning Business' : 'Customer'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Address</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={settings?.address || ''}
                              onChange={(e) => handleInputChange('address', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="123 Main Street"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                value={settings?.city || ''}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Orlando"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                ZIP Code
                              </label>
                              <input
                                type="text"
                                value={settings?.zip_code || ''}
                                onChange={(e) => handleInputChange('zip_code', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="32801"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Email Notifications</h3>
                        <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900">Marketing emails</p>
                            <p className="text-sm text-gray-600">Receive updates about new features and promotions</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings?.email_notifications || false}
                            onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                            className="h-4 w-4 text-blue-600"
                          />
                        </label>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-4">SMS Notifications</h3>
                        <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900">Text messages</p>
                            <p className="text-sm text-gray-600">Receive important updates via SMS</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings?.sms_notifications || false}
                            onChange={(e) => handleInputChange('sms_notifications', e.target.checked)}
                            className="h-4 w-4 text-blue-600"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Password</h3>
                        <Link
                          href="/forgot-password"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Change Password
                        </Link>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Account</h3>
                        <div className="space-y-4">
                          <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                          
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium text-red-900 mb-2">Danger Zone</h4>
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="flex items-center gap-2 px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'billing' && settings?.role === 'cleaner' && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing & Subscription</h2>
                    
                    <div className="space-y-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900">
                          Manage your subscription and billing details through your cleaner dashboard.
                        </p>
                        <Link
                          href="/dashboard/cleaner"
                          className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Go to Dashboard →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Account
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot be undone and you will lose all your data.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}