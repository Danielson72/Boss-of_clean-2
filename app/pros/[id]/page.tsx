'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Shield,
  CheckCircle,
  Award,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  Camera,
  Play,
  ArrowLeft,
  Heart,
  Share,
  ChevronRight,
  BadgeCheck,
  Zap,
  Leaf,
  PawPrint,
  Package
} from 'lucide-react'
import Link from 'next/link'
import BookingFlow from '@/components/BookingFlow'

interface ProfessionalProfile {
  id: string
  businessName: string
  businessSlug: string
  ownerName: string
  tagline: string
  bio: string
  phone: string
  email: string
  website: string
  city: string
  state: string
  serviceAreas: Array<{
    zipCode: string
    city: string
    county: string
    travelFee: number
    isPrimary: boolean
  }>
  services: string[]
  servicePricing: Array<{
    id: string
    service_type: string
    service_name: string
    description: string
    base_price: number
    price_unit: string
    minimum_charge: number
    instant_booking_available: boolean
    featured: boolean
  }>
  hourlyRate: number
  minimumHours: number
  yearsExperience: number
  teamSize: number
  specialties: string[]
  languagesSpoken: string[]
  verifications: {
    insurance: boolean
    license: boolean
    backgroundCheck: boolean
    photoVerified: boolean
  }
  trustScore: number
  guaranteeEligible: boolean
  certifications: any[]
  rating: {
    average: number
    total: number
    breakdown: Record<string, number>
  }
  reviews: Array<{
    id: string
    rating: number
    title: string
    comment: string
    serviceDate: string
    verifiedBooking: boolean
    customerName: string
    customerAvatar: string
    cleanerResponse?: string
    responseDate?: string
    createdAt: string
  }>
  stats: {
    totalJobs: number
    responseRate: number
    responseTimeHours: number
    acceptanceRate: number
    onTimeRate: number
    completionRate: number
    repeatCustomerRate: number
    recentBookings: number
    recentCompletions: number
    avgBookingValue: number
  }
  features: {
    instantBooking: boolean
    bringsSupplies: boolean
    ecoFriendly: boolean
    petFriendly: boolean
  }
  profileImage: string
  businessImages: string[]
  featuredImage: string
  portfolioImages: any[]
  introVideo?: string
  businessHours: any
  subscriptionTier: string
  badges: string[]
  availability: any[]
  nextAvailableDate: string | null
}

export default function ProfessionalProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/pros/${params.id}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`)
        }
        const result = await response.json()

        if (result.success && result.data) {
          setProfile(result.data)
        } else {
          throw new Error(result.error || 'Failed to load profile')
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProfile()
    }
  }, [params.id])

  const handleBookNow = () => {
    setIsBookingOpen(true)
  }

  const handleBookingComplete = (bookingDetails: any) => {
    // Handle successful booking completion
    console.log('Booking completed:', bookingDetails)
    // You could show a success message, redirect, or update the UI
  }

  const handleContactPro = () => {
    // Open contact modal or navigate to contact form
    if (profile?.phone) {
      window.open(`tel:${profile.phone}`, '_self')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading professional profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested professional could not be found.'}</p>
          <Link
            href="/pros"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    )
  }

  const allImages = [
    profile.featuredImage || profile.profileImage,
    ...(profile.businessImages || []),
    ...(profile.portfolioImages || [])
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/pros" className="flex items-center text-gray-600 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Search
            </Link>
            <div className="text-sm text-gray-500">
              🐱 <span className="font-medium">Purrfection is our Standard</span>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Heart className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Share className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Images */}
            <div className="space-y-4">
              <div className="aspect-w-16 aspect-h-10 rounded-xl overflow-hidden bg-gray-100">
                {allImages.length > 0 ? (
                  <img
                    src={allImages[selectedImageIndex]}
                    alt={profile.businessName}
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Camera className="h-16 w-16 text-blue-400" />
                  </div>
                )}
                {profile.introVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="bg-white/90 backdrop-blur-sm rounded-full p-4 hover:bg-white transition-colors">
                      <Play className="h-8 w-8 text-blue-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIndex === index ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${profile.businessName} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right - Profile Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.businessName}</h1>
                  {profile.verifications.photoVerified && (
                    <BadgeCheck className="h-6 w-6 text-blue-600" />
                  )}
                </div>

                {profile.tagline && (
                  <p className="text-xl text-gray-600 mb-4">{profile.tagline}</p>
                )}

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="ml-1 text-lg font-semibold">{profile.rating.average.toFixed(1)}</span>
                    <span className="ml-1 text-gray-500">({profile.rating.total} reviews)</span>
                  </div>

                  {profile.city && profile.state && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{profile.city}, {profile.state}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.features.instantBooking && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Zap className="h-3 w-3 mr-1" />
                      Instant Booking
                    </span>
                  )}
                  {profile.features.ecoFriendly && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Leaf className="h-3 w-3 mr-1" />
                      Eco-Friendly
                    </span>
                  )}
                  {profile.features.petFriendly && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <PawPrint className="h-3 w-3 mr-1" />
                      Pet Friendly
                    </span>
                  )}
                  {profile.features.bringsSupplies && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Package className="h-3 w-3 mr-1" />
                      Brings Supplies
                    </span>
                  )}
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile.stats.totalJobs}</div>
                    <div className="text-sm text-gray-600">Jobs Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile.yearsExperience}</div>
                    <div className="text-sm text-gray-600">Years Experience</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile.stats.responseRate}%</div>
                    <div className="text-sm text-gray-600">Response Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{profile.stats.onTimeRate}%</div>
                    <div className="text-sm text-gray-600">On-Time Rate</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleBookNow}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Book Now
                </button>
                <button
                  onClick={handleContactPro}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Contact
                </button>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 pt-4 border-t">
                {profile.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center text-gray-600">
                    <Globe className="h-4 w-4 mr-2" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'services', label: 'Services & Pricing' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'about', label: 'About' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              {profile.bio && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">About {profile.businessName}</h3>
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Specialties */}
              {profile.specialties.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Reviews Preview */}
              {profile.reviews.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Recent Reviews</h3>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View all {profile.rating.total} reviews
                    </button>
                  </div>
                  <div className="space-y-4">
                    {profile.reviews.slice(0, 2).map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium text-sm">{review.customerName}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.title && (
                          <h4 className="font-medium text-sm mb-1">{review.title}</h4>
                        )}
                        <p className="text-gray-700 text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trust & Safety */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-600" />
                  Trust & Safety
                </h3>
                <div className="space-y-3">
                  {Object.entries(profile.verifications).map(([key, verified]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      {verified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
                {profile.trustScore > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Trust Score</span>
                      <span className="text-lg font-bold text-green-600">{profile.trustScore}/100</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Areas */}
              {profile.serviceAreas.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Service Areas</h3>
                  <div className="space-y-2">
                    {profile.serviceAreas.slice(0, 5).map((area, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{area.city}, {area.zipCode}</span>
                        {area.travelFee > 0 && (
                          <span className="text-gray-500">${area.travelFee}</span>
                        )}
                      </div>
                    ))}
                    {profile.serviceAreas.length > 5 && (
                      <div className="text-sm text-blue-600 cursor-pointer">
                        +{profile.serviceAreas.length - 5} more areas
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languagesSpoken.length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languagesSpoken.map((language, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Services & Pricing</h3>
            {profile.servicePricing.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.servicePricing.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{service.service_name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{service.service_type}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          ${service.base_price}
                          <span className="text-sm font-normal text-gray-500">/{service.price_unit}</span>
                        </div>
                        {service.minimum_charge > 0 && (
                          <div className="text-xs text-gray-500">
                            Min: ${service.minimum_charge}
                          </div>
                        )}
                      </div>
                    </div>

                    {service.description && (
                      <p className="text-gray-700 text-sm mb-3">{service.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {service.featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Featured
                          </span>
                        )}
                        {service.instant_booking_available && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <Zap className="h-3 w-3 inline mr-1" />
                            Instant Book
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleBookNow}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Book This Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No specific pricing information available.</p>
                <p className="text-sm text-gray-500">Contact {profile.businessName} for custom quotes.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">{profile.rating.average.toFixed(1)}</div>
                  <div className="flex items-center justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${
                          i < Math.floor(profile.rating.average) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-gray-600">{profile.rating.total} reviews</div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center">
                      <span className="text-sm text-gray-600 w-8">{rating}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-current mx-2" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{
                            width: `${profile.rating.total > 0 ? (profile.rating.breakdown[rating] || 0) / profile.rating.total * 100 : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {profile.rating.breakdown[rating] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-lg shadow-sm">
              {profile.reviews.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {profile.reviews.map((review) => (
                    <div key={review.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            {review.customerAvatar ? (
                              <img
                                src={review.customerAvatar}
                                alt={review.customerName}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {review.customerName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{review.customerName}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(review.serviceDate || review.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          {review.verifiedBooking && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>

                      {review.title && (
                        <h4 className="font-semibold mb-2">{review.title}</h4>
                      )}

                      <p className="text-gray-700 mb-4">{review.comment}</p>

                      {review.cleanerResponse && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                          <div className="flex items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Response from {profile.businessName}:</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {review.responseDate && new Date(review.responseDate).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{review.cleanerResponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reviews yet.</p>
                  <p className="text-sm text-gray-500">Be the first to leave a review!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-6">Professional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Business Owner</label>
                    <p className="text-gray-900">{profile.ownerName || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Years of Experience</label>
                    <p className="text-gray-900">{profile.yearsExperience} years</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Team Size</label>
                    <p className="text-gray-900">{profile.teamSize} {profile.teamSize === 1 ? 'person' : 'people'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Subscription Tier</label>
                    <p className="text-gray-900 capitalize">{profile.subscriptionTier}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Response Time</label>
                    <p className="text-gray-900">{profile.stats.responseTimeHours} hours</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Completion Rate</label>
                    <p className="text-gray-900">{profile.stats.completionRate}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Repeat Customers</label>
                    <p className="text-gray-900">{profile.stats.repeatCustomerRate}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Average Job Value</label>
                    <p className="text-gray-900">${profile.stats.avgBookingValue}</p>
                  </div>
                </div>
              </div>
            </div>

            {profile.certifications.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Certifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.certifications.map((cert, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Award className="h-5 w-5 text-yellow-600" />
                      <span>{cert.name || cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.badges.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Badges & Awards</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((badge, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom CTA */}
      <div className="sticky bottom-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="font-semibold">{profile.businessName}</div>
              <div className="text-gray-600">
                Starting at ${profile.hourlyRate || profile.servicePricing[0]?.base_price || 'N/A'}/hour
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleContactPro}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Contact
            </button>
            <button
              onClick={handleBookNow}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      {/* Booking Flow Modal */}
      {profile && (
        <BookingFlow
          profile={profile}
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  )
}