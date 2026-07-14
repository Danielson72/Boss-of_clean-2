'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  User, MapPin, Save, Bell, Settings, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { normalizeToE164, formatPhoneForDisplay } from '@/lib/phone';

interface CustomerProfile {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
  city?: string;
  zip_code?: string;
  email: string;
}

export default function CustomerProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, address, city, zip_code, email')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Show the stored E.164 number in friendly national format.
        setProfile({ ...data, phone: formatPhoneForDisplay(data.phone) });
      } else {
        setProfile({
          id: user?.id || '',
          full_name: '',
          phone: '',
          address: '',
          city: '',
          zip_code: '',
          email: user?.email || '',
        });
      }
    } catch {
      // Don't fail silently — tell the user the profile didn't load (DLD-583).
      setMessage('We couldn\'t load your profile. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!profile) return;

    // Phone is optional here; normalize to E.164 when present, reject if invalid.
    let phoneToStore: string | null = null;
    if (profile.phone?.trim()) {
      phoneToStore = normalizeToE164(profile.phone);
      if (!phoneToStore) {
        setMessage('Please enter a valid US phone number.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          phone: phoneToStore,
          address: profile.address,
          city: profile.city,
          zip_code: profile.zip_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setMessage('Profile updated successfully!');
      setEditingProfile(false);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Error saving profile');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (field: keyof CustomerProfile, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
              </div>
              <div className="flex gap-2">
                {editingProfile ? (
                  <>
                    <button
                      onClick={() => {
                        setEditingProfile(false);
                        loadProfile();
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProfileSave}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingProfile(true)}
                    disabled={loading || !profile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-md ${
                message.includes('Error')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.includes('Error') ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {message}
              </div>
            </div>
          )}

          {loading ? (
            <div className="bg-white border rounded-lg p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">Loading profile...</p>
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profile?.full_name || ''}
                          onChange={(e) => handleProfileChange('full_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.full_name || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-900">{profile?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Contact support to change your email address
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      {editingProfile ? (
                        <input
                          type="tel"
                          value={profile?.phone || ''}
                          onChange={(e) => handleProfileChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="(555) 123-4567"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.phone || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profile?.address || ''}
                          onChange={(e) => handleProfileChange('address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="123 Main Street"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.address || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profile?.city || ''}
                          onChange={(e) => handleProfileChange('city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Orlando"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.city || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code
                      </label>
                      {editingProfile ? (
                        <input
                          type="text"
                          value={profile?.zip_code || ''}
                          onChange={(e) => handleProfileChange('zip_code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="32801"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.zip_code || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Account Settings</h4>
                <div className="space-y-3">
                  <Link
                    href="/dashboard/customer/notifications"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Notification Preferences
                  </Link>
                  <Link
                    href="/forgot-password"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Change Password
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
