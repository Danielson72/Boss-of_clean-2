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
  business_images: string[];
}

const AVAILABLE_SERVICES = [
  'House Cleaning', 'Deep Cleaning', 'Move-in/Move-out Cleaning',
  'Post-Construction Cleaning', 'Office Cleaning', 'Carpet Cleaning',
  'Window Cleaning', 'Pressure Washing', 'Organizing Services',
  'Laundry Services', 'Pet-Friendly Cleaning', 'Green/Eco Cleaning'
];

export default function CleanerProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaners')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
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
          .from('cleaners')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) throw createError;
        setProfile(created);
      }
    } catch (error) {
      // console.error('Error loading profile:', error);
      setMessage('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleServiceToggle = (service: string) => {
    if (!profile) return;
    const services = profile.services.includes(service)
      ? profile.services.filter(s => s !== service)
      : [...profile.services, service];
    setProfile({ ...profile, services });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cleaner-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cleaner-photos')
        .getPublicUrl(fileName);

      const updatedPhotos = [...profile.business_images, publicUrl];
      setProfile({ ...profile, business_images: updatedPhotos });

      setMessage('Photo uploaded successfully!');
    } catch (error) {
      // console.error('Error uploading photo:', error);
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
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cleaners')
        .update({
          business_name: profile.business_name,
          business_description: profile.business_description,
          business_phone: profile.business_phone,
          business_email: profile.business_email,
          services: profile.services,
          hourly_rate: profile.hourly_rate,
          minimum_hours: profile.minimum_hours,
          years_experience: profile.years_experience,
          website_url: profile.website_url,
          business_address: profile.business_address,
          business_images: profile.business_images,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      // console.error('Error saving profile:', error);
      setMessage('Error saving profile');
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
                  href="/dashboard/cleaner"
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
                  Business Address
                </label>
                <input
                  type="text"
                  value={profile.business_address || ''}
                  onChange={(e) => handleInputChange('business_address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main St, City, FL 12345"
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

            {/* Services Offered */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Services Offered
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_SERVICES.map((service) => (
                  <label key={service} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.services.includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="mr-3"
                    />
                    <span className="text-sm">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photo Gallery
              </h2>
              
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
                Upload up to 10 high-quality photos of your work. First photo will be your main profile image.
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
                      <p className="font-medium">Background Check</p>
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