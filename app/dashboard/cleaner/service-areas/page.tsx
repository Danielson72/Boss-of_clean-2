'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  MapPin, Plus, X, ArrowLeft, Save, DollarSign,
  Search, CheckCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/service-areas/page.tsx' });

interface ServiceArea {
  zip_code: string;
  city: string;
  county: string;
  travel_fee: number;
}

interface FloridaZipCode {
  zip_code: string;
  city: string;
  county: string;
  latitude: number;
  longitude: number;
}

export default function ServiceAreasPage() {
  const { user } = useAuth();
  const [cleanerId, setCleanerId] = useState<string>('');
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [floridaZips, setFloridaZips] = useState<FloridaZipCode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadServiceAreas();
    }
  }, [user]);

  const loadServiceAreas = async () => {
    try {
      // First get the cleaner ID
      const { data: cleanerData, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id, service_areas')
        .eq('user_id', user?.id)
        .single();

      if (cleanerError) throw cleanerError;
      
      setCleanerId(cleanerData.id);

      // Load Florida ZIP codes from database
      const { data: zipsData, error: zipsError } = await supabase
        .from('florida_zipcodes')
        .select('*')
        .order('city');

      if (zipsError) throw zipsError;
      setFloridaZips(zipsData || []);
      
      // Convert the service_areas array to ServiceArea objects
      const areas: ServiceArea[] = (cleanerData.service_areas || []).map((zipCode: string) => {
        const location = (zipsData || []).find((loc: FloridaZipCode) => loc.zip_code === zipCode);
        return {
          zip_code: zipCode,
          city: location?.city || 'Unknown',
          county: location?.county || 'Unknown',
          travel_fee: 0 // Default travel fee
        };
      });

      setServiceAreas(areas);
    } catch (error) {
      logger.error('Error loading service areas', { function: 'loadServiceAreas', error });
      setMessage('Error loading service areas');
    } finally {
      setLoading(false);
    }
  };

  const addServiceArea = (location: FloridaZipCode) => {
    const exists = serviceAreas.some(area => area.zip_code === location.zip_code);
    if (exists) {
      setMessage('This ZIP code is already in your service areas');
      return;
    }

    const newArea: ServiceArea = {
      zip_code: location.zip_code,
      city: location.city,
      county: location.county,
      travel_fee: 0
    };

    setServiceAreas([...serviceAreas, newArea]);
    setSearchTerm('');
    setMessage('');
  };

  const removeServiceArea = (zipCode: string) => {
    setServiceAreas(serviceAreas.filter(area => area.zip_code !== zipCode));
  };

  const updateTravelFee = (zipCode: string, fee: number) => {
    setServiceAreas(serviceAreas.map(area =>
      area.zip_code === zipCode ? { ...area, travel_fee: fee } : area
    ));
  };

  const saveServiceAreas = async () => {
    setSaving(true);
    try {
      // Update the cleaners table with the new service areas
      const zipCodes = serviceAreas.map(area => area.zip_code);
      
      const { error } = await supabase
        .from('cleaners')
        .update({
          service_areas: zipCodes,
          updated_at: new Date().toISOString()
        })
        .eq('id', cleanerId);

      if (error) throw error;

      setMessage('Service areas updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      logger.error('Error saving service areas', { function: 'saveServiceAreas', error });
      setMessage('Error saving service areas');
    } finally {
      setSaving(false);
    }
  };

  const filteredLocations = floridaZips.filter(location =>
    (location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
     location.zip_code.includes(searchTerm) ||
     location.county.toLowerCase().includes(searchTerm.toLowerCase())) &&
    !serviceAreas.some(area => area.zip_code === location.zip_code)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service areas...</p>
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
                  Manage Service Areas
                </h1>
              </div>
              <button
                onClick={saveServiceAreas}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.includes('Error') ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {message}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Service Areas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Your Service Areas ({serviceAreas.length})
              </h2>

              {serviceAreas.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No service areas yet
                  </h3>
                  <p className="text-gray-600">
                    Add ZIP codes where you provide cleaning services
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceAreas.map((area) => (
                    <div key={area.zip_code} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">
                              {area.zip_code}
                            </span>
                            <span className="text-gray-600">
                              {area.city}, {area.county} County
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <label className="text-sm text-gray-600">
                              Travel Fee:
                            </label>
                            <input
                              type="number"
                              value={area.travel_fee}
                              onChange={(e) => updateTravelFee(area.zip_code, parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              step="5"
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-sm text-gray-600">per trip</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeServiceArea(area.zip_code)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Service Areas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Service Areas
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Florida Locations
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by city, ZIP code, or county..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLocations.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">
                    {searchTerm ? 'No matching locations found' : 'Search for locations to add'}
                  </p>
                ) : (
                  filteredLocations.map((location) => (
                    <div
                      key={location.zip_code}
                      className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => addServiceArea(location)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {location.zip_code} - {location.city}
                        </div>
                        <div className="text-sm text-gray-600">
                          {location.county} County
                        </div>
                      </div>
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Service Area Tips */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Service Area Tips
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 text-blue-600" />
                <span>Add all ZIP codes where you're willing to travel for cleaning jobs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 text-blue-600" />
                <span>Set travel fees for areas that are farther from your base location</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 text-blue-600" />
                <span>More service areas = more potential customers finding your business</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 text-blue-600" />
                <span>Customers will see your travel fee upfront when requesting quotes</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}