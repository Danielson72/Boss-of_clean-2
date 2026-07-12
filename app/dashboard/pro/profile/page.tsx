'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  Camera, Save, ArrowLeft, Upload, X, CheckCircle,
  User, Phone, Mail, MapPin, DollarSign, Calendar,
  FileText, Shield, Award, BadgeCheck, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/utils/logger';
import CategorySelector from '@/components/onboarding/CategorySelector';
import { recordProSmsConsent, revokeProSmsConsent } from '@/lib/actions/tcpa';
import { PRO_SMS_CONSENT_TEXT } from '@/lib/sms/consent-copy';

const logger = createLogger({ file: 'app/dashboard/pro/profile/page.tsx' });

interface CleanerProfile {
  id: string;
  business_name: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  is_certified?: boolean;
  website_url?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  business_images: string[];
  profile_image_url?: string | null;
  // DLD-449
  primary_category?: string | null;
  secondary_categories?: string[];
  // SMS consent audit (mirrors users.tcpa_consent_*)
  sms_consent_at?: string | null;
  sms_consent_phone?: string | null;
}

export default function CleanerProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  // Separate, opt-in SMS consent. Reflects whether valid consent is on file for
  // the current business_phone; the pro toggles it and it applies on save.
  const [smsConsent, setSmsConsent] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      // DLD-449: source from `pros` directly; the `cleaners` view is legacy.
      const { data, error } = await supabase
        .from('pros')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const { data: catRows } = await supabase
          .from('pro_categories')
          .select('category, is_primary')
          .eq('pro_id', data.id);
        type CategoryRow = { category: string; is_primary: boolean };
        const secondary = ((catRows ?? []) as CategoryRow[])
          .filter((r: CategoryRow) => !r.is_primary)
          .map((r: CategoryRow) => r.category);
        setProfile({
          ...data,
          secondary_categories: secondary,
        });
        // Show as opted-in only when consent is on file for the current number.
        setSmsConsent(!!(data.sms_consent_at && data.sms_consent_phone === data.business_phone));
      } else {
        // Create default profile if none exists
        const newProfile = {
          user_id: user?.id,
          business_name: '',
          business_description: '',
          business_phone: '',
          business_email: user?.email || '',
          services: [],
          service_areas: [],
          hourly_rate: 25,
          minimum_hours: 2,
          years_experience: 1,
          insurance_verified: false,
          license_verified: false,
          business_images: [],
          approval_status: 'pending'
        };
        
        const { data: created, error: createError } = await supabase
          .from('pros')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) throw createError;
        setProfile(created);
      }
    } catch (error) {
      logger.error('Error loading profile', { function: 'loadProfile', error });
      setMessage('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleCategoriesChange = ({
    primary,
    secondary,
  }: {
    primary: string | null;
    secondary: string[];
  }) => {
    if (!profile) return;
    const legacyServices = primary ? [primary, ...secondary] : secondary;
    setProfile({
      ...profile,
      primary_category: primary,
      secondary_categories: secondary,
      services: legacyServices,
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !user) return;

    // profile-images bucket has a 2MB limit
    const MAX_LOGO_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_LOGO_SIZE) {
      setMessage('Logo is too large. Maximum size is 2MB. Please choose a smaller image.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Logo must be a JPEG, PNG, or WebP image.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Path MUST start with user.id to satisfy storage RLS:
      // (storage.foldername(name))[1] = auth.uid()
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Persist immediately so the logo shows on the public profile right away
      const { error: updateError } = await supabase
        .from('pros')
        .update({ profile_image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image_url: publicUrl });
      setMessage('Logo updated successfully!');
    } catch (error) {
      logger.error('Error uploading logo', { function: 'handleLogoUpload', error });
      setMessage('Error uploading logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!profile || !user) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from('pros')
        .update({ profile_image_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      setProfile({ ...profile, profile_image_url: null });
      setMessage('Logo removed.');
    } catch (error) {
      logger.error('Error removing logo', { function: 'handleLogoRemove', error });
      setMessage('Error removing logo.');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const updatedPhotos = [...profile.business_images, publicUrl];
      setProfile({ ...profile, business_images: updatedPhotos });

      setMessage('Photo uploaded successfully!');
    } catch (error) {
      logger.error('Error uploading photo', { function: 'handlePhotoUpload', error });
      setMessage('Error uploading photo');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoRemove = (photoUrl: string) => {
    if (!profile) return;
    const updatedPhotos = profile.business_images.filter(url => url !== photoUrl);
    setProfile({ ...profile, business_images: updatedPhotos });
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validate required address fields
    if (!profile.business_address?.trim()) {
      setMessage('Business street address is required');
      return;
    }
    if (!profile.business_city?.trim()) {
      setMessage('City is required');
      return;
    }
    if (!profile.business_zip?.trim() || profile.business_zip.length !== 5) {
      setMessage('A valid 5-digit ZIP code is required');
      return;
    }
    
    setSaving(true);
    try {
      // DLD-449: route category changes through the dedicated endpoint so
      // pro_categories stays in sync with pros.primary_category.
      const categoriesResponse = await fetch('/api/pros/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_category: profile.primary_category ?? null,
          secondary_categories: profile.secondary_categories ?? [],
        }),
      });
      if (!categoriesResponse.ok) {
        const result = await categoriesResponse.json().catch(() => ({}));
        setMessage(`Error saving categories: ${result.error || 'Unknown error'}`);
        return;
      }

      const { error } = await supabase
        .from('pros')
        .update({
          business_name: profile.business_name,
          business_description: profile.business_description,
          business_phone: profile.business_phone,
          business_email: profile.business_email,
          hourly_rate: profile.hourly_rate,
          minimum_hours: profile.minimum_hours,
          years_experience: profile.years_experience,
          website_url: profile.website_url,
          business_address: profile.business_address,
          business_city: profile.business_city,
          business_state: profile.business_state,
          business_zip: profile.business_zip,
          business_images: profile.business_images,
          profile_image_url: profile.profile_image_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) {
        logger.error('Error saving profile', { function: 'handleSave', error });
        setMessage(`Error saving profile: ${error.message}`);
        return;
      }

      // Apply SMS consent choice. Consent binds to the phone just saved; an
      // unchecked box revokes any prior consent so sends stop. Both run through
      // service-role server actions (IP captured server-side).
      if (user?.id) {
        if (smsConsent) {
          await recordProSmsConsent(user.id, navigator.userAgent).catch(() => {});
        } else if (profile.sms_consent_at) {
          await revokeProSmsConsent(user.id).catch(() => {});
        }
      }

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving profile', { function: 'handleSave', error });
      setMessage(`Error saving profile: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/pro"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Business Profile
                </h1>
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
          {/* Boss of Clean Certified Badge */}
          {profile?.is_certified && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <BadgeCheck className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-bold text-green-800">Boss of Clean Certified™</h3>
                  <p className="text-sm text-green-700">Your business meets all verification requirements</p>
                </div>
              </div>
            </div>
          )}

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

          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={profile.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your Business Name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={profile.business_email}
                    onChange={(e) => handleInputChange('business_email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="business@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Phone *
                  </label>
                  <input
                    type="tel"
                    value={profile.business_phone}
                    onChange={(e) => handleInputChange('business_phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                  {/* SMS consent — separate, opt-in, not a condition of service */}
                  <label className="mt-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-600 leading-snug">
                      {PRO_SMS_CONSENT_TEXT}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={profile.website_url || ''}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profile.business_address || ''}
                  onChange={(e) => handleInputChange('business_address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Street address"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.business_city || ''}
                    onChange={(e) => handleInputChange('business_city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Orlando"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={profile.business_state || 'FL'}
                    onChange={(e) => handleInputChange('business_state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  >
                    <option value="FL">Florida (FL)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 w-40">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  pattern="[0-9]{5}"
                  value={profile.business_zip || ''}
                  onChange={(e) => handleInputChange('business_zip', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="32801"
                />
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description *
                </label>
                <textarea
                  value={profile.business_description}
                  onChange={(e) => handleInputChange('business_description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your cleaning business, experience, and what makes you unique..."
                />
              </div>
            </div>

            {/* Pricing & Experience */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Experience
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={profile.hourly_rate}
                    onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value))}
                    min="10"
                    max="200"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Hours
                  </label>
                  <input
                    type="number"
                    value={profile.minimum_hours}
                    onChange={(e) => handleInputChange('minimum_hours', parseInt(e.target.value))}
                    min="1"
                    max="8"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years Experience
                  </label>
                  <input
                    type="number"
                    value={profile.years_experience}
                    onChange={(e) => handleInputChange('years_experience', parseInt(e.target.value))}
                    min="0"
                    max="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Services Offered (DLD-449) */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Services Offered
              </h2>

              <CategorySelector
                primary={profile.primary_category ?? null}
                secondary={profile.secondary_categories ?? []}
                onChange={handleCategoriesChange}
                disabled={saving}
              />
            </div>

            {/* Business Logo / Profile Picture */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Business Logo
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This is the main image customers see at the top of your profile. Use your logo or a clear photo of your business.
              </p>

              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  {profile.profile_image_url ? (
                    <Image
                      src={profile.profile_image_url}
                      alt="Business logo"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-xl object-cover border border-gray-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                      <Camera className="h-8 w-8" />
                      <span className="text-xs mt-1">No logo yet</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition cursor-pointer font-medium text-sm w-fit">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : profile.profile_image_url ? 'Replace Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {profile.profile_image_url && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={uploading}
                      className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 w-fit"
                    >
                      <X className="h-4 w-4" />
                      Remove logo
                    </button>
                  )}
                  <p className="text-xs text-gray-500">JPEG, PNG, or WebP. Max 2MB. Square images look best.</p>
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photo Gallery
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Show off your work. These photos appear in the gallery section of your public profile.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {profile.business_images.map((photo, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={photo}
                      alt={`Business photo ${index + 1}`}
                      width={300}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handlePhotoRemove(photo)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {profile.business_images.length < 10 && (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600 mt-2">
                      {uploading ? 'Uploading...' : 'Add Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                Upload up to 10 high-quality photos of your work.
              </p>
            </div>

            {/* Verification Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-5 w-5 ${profile.insurance_verified ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium">Insurance Verification</p>
                      <p className="text-sm text-gray-600">Upload proof of liability insurance</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    profile.insurance_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile.insurance_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className={`h-5 w-5 ${profile.background_check ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium">Background Documentation</p>
                      <p className="text-sm text-gray-600">Complete criminal background screening</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    profile.background_check 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile.background_check ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`h-5 w-5 ${profile.license_verified ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium">Business License</p>
                      <p className="text-sm text-gray-600">Upload business license or registration</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    profile.license_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profile.license_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-4">
                Contact support to submit verification documents and get your badges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}