'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Star, MapPin, Clock, Shield, Sparkles, Heart, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface FavoriteCleaner {
  id: string;
  created_at: string;
  cleaner: {
    id: string;
    business_name: string;
    business_slug: string;
    business_description: string | null;
    profile_image_url: string | null;
    average_rating: number | null;
    total_reviews: number;
    services: string[] | null;
    hourly_rate: number | null;
    instant_booking: boolean;
    insurance_verified: boolean;
    users: {
      city: string | null;
      state: string | null;
    };
  };
}

export default function CustomerFavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteCleaner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/customer/favorites');
      if (!response.ok) throw new Error('Failed to fetch favorites');

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (error) {
      // console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = (cleanerId: string) => {
    // Remove from local state immediately for better UX
    setFavorites((prev) => prev.filter((f) => f.cleaner.id !== cleanerId));
  };

  const formatServices = (services: string[] | null) => {
    if (!services || services.length === 0) return 'General cleaning';
    if (services.length <= 2) return services.join(', ');
    return `${services.slice(0, 2).join(', ')} +${services.length - 2} more`;
  };

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/dashboard/customer"
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Favorite Cleaners</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {favorites.length} {favorites.length === 1 ? 'cleaner' : 'cleaners'} saved
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Save your favorite cleaners to quickly find and book them later.
                Click the heart icon on any cleaner profile to add them here.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find Cleaners
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Image Section */}
                  <div className="relative h-48">
                    {favorite.cleaner.profile_image_url ? (
                      <Image
                        src={favorite.cleaner.profile_image_url}
                        alt={favorite.cleaner.business_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <span className="text-4xl font-bold text-blue-400">
                          {favorite.cleaner.business_name.charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Favorite Button */}
                    <div className="absolute top-3 right-3">
                      <FavoriteButton
                        cleanerId={favorite.cleaner.id}
                        initialFavorited={true}
                        size="md"
                      />
                    </div>

                    {/* Badges */}
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      {favorite.cleaner.instant_booking && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Instant Book
                        </span>
                      )}
                      {favorite.cleaner.insurance_verified && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Insured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-4">
                    <Link
                      href={`/cleaner/${favorite.cleaner.business_slug}`}
                      className="block"
                    >
                      <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors">
                        {favorite.cleaner.business_name}
                      </h3>
                    </Link>

                    {/* Location */}
                    {favorite.cleaner.users?.city && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {favorite.cleaner.users.city}, {favorite.cleaner.users.state}
                      </p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-2">
                      {favorite.cleaner.average_rating ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">
                              {favorite.cleaner.average_rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            ({favorite.cleaner.total_reviews} {favorite.cleaner.total_reviews === 1 ? 'review' : 'reviews'})
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">No reviews yet</span>
                      )}
                    </div>

                    {/* Services */}
                    <p className="text-sm text-gray-600 mt-2">
                      {formatServices(favorite.cleaner.services)}
                    </p>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      {favorite.cleaner.hourly_rate ? (
                        <div>
                          <span className="text-lg font-bold text-gray-900">
                            ${favorite.cleaner.hourly_rate}
                          </span>
                          <span className="text-sm text-gray-500">/hr</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Contact for pricing</span>
                      )}

                      <Link
                        href={`/cleaner/${favorite.cleaner.business_slug}`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
