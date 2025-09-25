'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import {
  Clock,
  DollarSign,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Calendar as CalendarIcon,
  User,
  CreditCard,
  Zap
} from 'lucide-react'
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns'
import { loadStripe } from '@stripe/stripe-js'

interface ServicePricing {
  id: string
  service_type: string
  service_name: string
  description: string
  base_price: number
  price_unit: string
  minimum_charge: number
  instant_booking_available: boolean
  featured: boolean
  pricing_tiers: Array<{
    name: string
    multiplier: number
  }>
  add_ons: Array<{
    name: string
    price: number
    description: string
    unit?: string
  }>
  package_deals: Array<{
    name: string
    discount: number
    description: string
  }>
}

interface ProfessionalProfile {
  id: string
  businessName: string
  businessSlug: string
  hourlyRate: number
  minimumHours: number
  servicePricing: ServicePricing[]
  businessHours: any
  features: {
    instantBooking: boolean
    bringsSupplies: boolean
    ecoFriendly: boolean
    petFriendly: boolean
  }
  serviceAreas: Array<{
    zipCode: string
    city: string
    county: string
    travelFee: number
    isPrimary: boolean
  }>
}

interface BookingFlowProps {
  profile: ProfessionalProfile
  isOpen: boolean
  onClose: () => void
  onBookingComplete: (bookingDetails: any) => void
}

interface BookingDetails {
  serviceId: string
  serviceName: string
  serviceType: string
  date: Date | undefined
  timeSlot: string
  duration: number
  homeSize: string
  addOns: string[]
  packageDeal: string | null
  customerInfo: {
    name: string
    email: string
    phone: string
    address: string
    zipCode: string
  }
  specialRequests: string
  pricing: {
    basePrice: number
    addOnTotal: number
    travelFee: number
    discount: number
    totalPrice: number
  }
}

const timeSlots = [
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' }
]

const homeSizes = [
  { value: 'small', label: 'Small (1-2 rooms)', multiplier: 1 },
  { value: 'medium', label: 'Medium (3-4 rooms)', multiplier: 1.3 },
  { value: 'large', label: 'Large (5+ rooms)', multiplier: 1.6 }
]

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function BookingFlow({ profile, isOpen, onClose, onBookingComplete }: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [tierInfo, setTierInfo] = useState<any>(null)
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    serviceId: '',
    serviceName: '',
    serviceType: '',
    date: undefined,
    timeSlot: '',
    duration: profile.minimumHours,
    homeSize: 'medium',
    addOns: [],
    packageDeal: null,
    customerInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
      zipCode: ''
    },
    specialRequests: '',
    pricing: {
      basePrice: 0,
      addOnTotal: 0,
      travelFee: 0,
      discount: 0,
      totalPrice: 0
    }
  })

  const [selectedService, setSelectedService] = useState<ServicePricing | null>(null)
  const [availableDates, setAvailableDates] = useState<Date[]>([])

  useEffect(() => {
    // Generate available dates (next 30 days, excluding unavailable dates)
    const dates = []
    for (let i = 1; i <= 30; i++) {
      const date = addDays(new Date(), i)
      // Skip Sundays for this example (would be based on actual business hours)
      if (date.getDay() !== 0) {
        dates.push(date)
      }
    }
    setAvailableDates(dates)

    // Fetch user's tier information when component opens
    if (isOpen) {
      fetchTierInfo()
    }
  }, [isOpen])

  const fetchTierInfo = async () => {
    try {
      const response = await fetch('/api/customer/tier')
      if (response.ok) {
        const data = await response.json()
        setTierInfo(data)
      } else {
        console.error('Failed to fetch tier info:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching tier info:', error)
    }
  }

  useEffect(() => {
    if (selectedService) {
      calculatePricing()
    }
  }, [selectedService, bookingDetails.homeSize, bookingDetails.addOns, bookingDetails.packageDeal, bookingDetails.duration])

  const calculatePricing = () => {
    if (!selectedService) return

    const homeSizeMultiplier = homeSizes.find(size => size.value === bookingDetails.homeSize)?.multiplier || 1
    const basePrice = selectedService.base_price * bookingDetails.duration * homeSizeMultiplier

    const addOnTotal = bookingDetails.addOns.reduce((total, addOnName) => {
      const addOn = selectedService.add_ons.find(a => a.name === addOnName)
      return total + (addOn?.price || 0)
    }, 0)

    const travelFee = profile.serviceAreas.find(area => area.zipCode === bookingDetails.customerInfo.zipCode)?.travelFee || 0

    let discount = 0
    if (bookingDetails.packageDeal) {
      const packageDealData = selectedService.package_deals.find(p => p.name === bookingDetails.packageDeal)
      discount = packageDealData ? (basePrice + addOnTotal) * packageDealData.discount : 0
    }

    const totalPrice = Math.max(basePrice + addOnTotal + travelFee - discount, selectedService.minimum_charge)

    setBookingDetails(prev => ({
      ...prev,
      pricing: {
        basePrice,
        addOnTotal,
        travelFee,
        discount,
        totalPrice
      }
    }))
  }

  const handleServiceSelect = (service: ServicePricing) => {
    setSelectedService(service)
    setBookingDetails(prev => ({
      ...prev,
      serviceId: service.id,
      serviceName: service.service_name,
      serviceType: service.service_type
    }))
    setCurrentStep(2)
  }

  const handleDateTimeSelect = () => {
    if (bookingDetails.date && bookingDetails.timeSlot) {
      setCurrentStep(3)
    }
  }

  const handleCustomerInfo = () => {
    if (bookingDetails.customerInfo.name && bookingDetails.customerInfo.email &&
        bookingDetails.customerInfo.phone && bookingDetails.customerInfo.address) {
      setCurrentStep(4)
    }
  }

  const handleBookingSubmit = async () => {
    if (isProcessingPayment) return;

    try {
      setIsProcessingPayment(true);

      // Create booking and payment intent
      const bookingData = {
        cleanerId: profile.id,
        serviceId: bookingDetails.serviceId,
        serviceName: bookingDetails.serviceName,
        serviceType: bookingDetails.serviceType,
        scheduledDate: bookingDetails.date?.toISOString().split('T')[0],
        scheduledTime: bookingDetails.timeSlot,
        duration: bookingDetails.duration,
        homeSize: bookingDetails.homeSize,
        addOns: bookingDetails.addOns,
        customerInfo: bookingDetails.customerInfo,
        specialRequests: bookingDetails.specialRequests,
        pricing: bookingDetails.pricing
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle tier limit errors specially
        if (response.status === 403 && result.upgradeRequired) {
          alert(`${result.message}\n\nUpgrade your plan to continue booking.`);
          return;
        }
        throw new Error(result.error || 'Failed to create booking');
      }

      // Initialize Stripe and redirect to checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Confirm payment using the client secret
      const { error } = await stripe.confirmPayment({
        clientSecret: result.client_secret,
        confirmParams: {
          // Return URL after payment
          return_url: `${window.location.origin}/dashboard/customer?booking_success=${result.booking_id}`,
        },
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        throw new Error(error.message || 'Payment failed');
      }

      // If we get here, payment was successful
      onBookingComplete({
        bookingId: result.booking_id,
        amount: result.amount,
        ...bookingData
      });

      onClose();
    } catch (error) {
      console.error('Booking submission error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while processing your booking');
    } finally {
      setIsProcessingPayment(false);
    }
  }

  const isDateAvailable = (date: Date) => {
    return availableDates.some(availableDate =>
      availableDate.toDateString() === date.toDateString()
    )
  }

  const isDateSelectable = (date: Date) => {
    const today = startOfDay(new Date())
    return isAfter(date, today) && isDateAvailable(date)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold">Book {profile.businessName}</h2>
            <div className="text-sm text-gray-500">
              🐱 <span className="font-medium">Purrfection is our Standard</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tier Limit Banner */}
        {tierInfo && (
          <div className={`px-6 py-3 ${
            tierInfo.isAtLimit
              ? 'bg-red-50 border-b border-red-200'
              : tierInfo.remaining <= 1
                ? 'bg-yellow-50 border-b border-yellow-200'
                : 'bg-blue-50 border-b border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {tierInfo.tierName} Plan
                </span>
                {tierInfo.isUnlimited ? (
                  <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    Unlimited bookings
                  </span>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tierInfo.isAtLimit
                      ? 'text-red-700 bg-red-100'
                      : tierInfo.remaining <= 1
                        ? 'text-yellow-700 bg-yellow-100'
                        : 'text-blue-700 bg-blue-100'
                  }`}>
                    {tierInfo.used}/{tierInfo.limit} bookings used this month
                  </span>
                )}
              </div>
              {tierInfo.isAtLimit ? (
                <span className="text-sm text-red-700 font-medium">
                  🚫 Booking limit reached - Upgrade to continue
                </span>
              ) : tierInfo.remaining <= 1 ? (
                <span className="text-sm text-yellow-700 font-medium">
                  ⚠️ {tierInfo.remaining} booking{tierInfo.remaining === 1 ? '' : 's'} remaining
                </span>
              ) : (
                <span className="text-sm text-blue-700">
                  ✨ {tierInfo.remaining} bookings available
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, title: 'Service', icon: DollarSign },
              { step: 2, title: 'Date & Time', icon: CalendarIcon },
              { step: 3, title: 'Details', icon: User },
              { step: 4, title: 'Payment', icon: CreditCard }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= item.step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > item.step ? <Check className="h-4 w-4" /> : item.step}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= item.step ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {item.title}
                </span>
                {index < 3 && <ChevronRight className="h-4 w-4 text-gray-400 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select a Service</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.servicePricing.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => !tierInfo?.isAtLimit && handleServiceSelect(service)}
                    className={`border rounded-lg p-4 transition-all ${
                      tierInfo?.isAtLimit
                        ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-50'
                        : `cursor-pointer hover:shadow-md ${
                            service.featured ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{service.service_name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{service.service_type.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">
                          ${service.base_price}
                          <span className="text-sm font-normal text-gray-500">/{service.price_unit}</span>
                        </div>
                        {service.minimum_charge > 0 && (
                          <div className="text-xs text-gray-500">Min: ${service.minimum_charge}</div>
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
                        {service.instant_booking_available && profile.features.instantBooking && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <Zap className="h-3 w-3 inline mr-1" />
                            Instant Book
                          </span>
                        )}
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Select Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && selectedService && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Select Date & Time</h3>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Change Service
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <div>
                  <h4 className="font-medium mb-3">Choose Date</h4>
                  <Calendar
                    mode="single"
                    selected={bookingDetails.date}
                    onSelect={(date) => setBookingDetails(prev => ({ ...prev, date }))}
                    disabled={(date) => !isDateSelectable(date)}
                    initialFocus
                    className="rounded-md border"
                  />
                </div>

                {/* Time & Options */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Choose Time</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.value}
                          onClick={() => setBookingDetails(prev => ({ ...prev, timeSlot: slot.value }))}
                          className={`p-2 border rounded-md text-sm transition-colors ${
                            bookingDetails.timeSlot === slot.value
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Home Size</h4>
                    <div className="space-y-2">
                      {homeSizes.map((size) => (
                        <label key={size.value} className="flex items-center">
                          <input
                            type="radio"
                            value={size.value}
                            checked={bookingDetails.homeSize === size.value}
                            onChange={(e) => setBookingDetails(prev => ({ ...prev, homeSize: e.target.value }))}
                            className="mr-3"
                          />
                          <span className="text-sm">{size.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Duration</h4>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setBookingDetails(prev => ({
                          ...prev,
                          duration: Math.max(profile.minimumHours, prev.duration - 0.5)
                        }))}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="text-lg font-medium">{bookingDetails.duration} hours</span>
                      <button
                        onClick={() => setBookingDetails(prev => ({
                          ...prev,
                          duration: prev.duration + 0.5
                        }))}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum {profile.minimumHours} hours
                    </p>
                  </div>

                  {/* Add-ons */}
                  {selectedService.add_ons.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Add-ons</h4>
                      <div className="space-y-2">
                        {selectedService.add_ons.map((addOn) => (
                          <label key={addOn.name} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={bookingDetails.addOns.includes(addOn.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBookingDetails(prev => ({
                                      ...prev,
                                      addOns: [...prev.addOns, addOn.name]
                                    }))
                                  } else {
                                    setBookingDetails(prev => ({
                                      ...prev,
                                      addOns: prev.addOns.filter(name => name !== addOn.name)
                                    }))
                                  }
                                }}
                                className="mr-3"
                              />
                              <div>
                                <span className="text-sm font-medium">{addOn.name}</span>
                                <p className="text-xs text-gray-600">{addOn.description}</p>
                              </div>
                            </div>
                            <span className="text-sm font-medium">+${addOn.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <button
                  onClick={handleDateTimeSelect}
                  disabled={!bookingDetails.date || !bookingDetails.timeSlot}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={bookingDetails.customerInfo.name}
                    onChange={(e) => setBookingDetails(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, name: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={bookingDetails.customerInfo.email}
                    onChange={(e) => setBookingDetails(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, email: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={bookingDetails.customerInfo.phone}
                    onChange={(e) => setBookingDetails(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, phone: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code *</label>
                  <input
                    type="text"
                    value={bookingDetails.customerInfo.zipCode}
                    onChange={(e) => setBookingDetails(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, zipCode: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="12345"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <input
                    type="text"
                    value={bookingDetails.customerInfo.address}
                    onChange={(e) => setBookingDetails(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, address: e.target.value }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Special Requests</label>
                  <textarea
                    value={bookingDetails.specialRequests}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, specialRequests: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg h-24"
                    placeholder="Any special requests or notes for the cleaner..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <button
                  onClick={handleCustomerInfo}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Booking Summary & Payment</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Summary */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Service Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span className="font-medium">{bookingDetails.serviceName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">
                          {bookingDetails.date && format(bookingDetails.date, 'MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-medium">
                          {timeSlots.find(slot => slot.value === bookingDetails.timeSlot)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">{bookingDetails.duration} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Home Size:</span>
                        <span className="font-medium">
                          {homeSizes.find(size => size.value === bookingDetails.homeSize)?.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Customer Info</h4>
                    <div className="space-y-1 text-sm">
                      <p>{bookingDetails.customerInfo.name}</p>
                      <p>{bookingDetails.customerInfo.email}</p>
                      <p>{bookingDetails.customerInfo.phone}</p>
                      <p>{bookingDetails.customerInfo.address}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Pricing Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base Service ({bookingDetails.duration}h)</span>
                        <span>${bookingDetails.pricing.basePrice.toFixed(2)}</span>
                      </div>
                      {bookingDetails.addOns.length > 0 && (
                        <div className="flex justify-between">
                          <span>Add-ons</span>
                          <span>${bookingDetails.pricing.addOnTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {bookingDetails.pricing.travelFee > 0 && (
                        <div className="flex justify-between">
                          <span>Travel Fee</span>
                          <span>${bookingDetails.pricing.travelFee.toFixed(2)}</span>
                        </div>
                      )}
                      {bookingDetails.pricing.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-${bookingDetails.pricing.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>${bookingDetails.pricing.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {profile.features.instantBooking && selectedService?.instant_booking_available && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Zap className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">Instant Booking Available</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        Your booking will be confirmed immediately after payment.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <button
                  onClick={handleBookingSubmit}
                  disabled={isProcessingPayment}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    `Complete Booking - $${bookingDetails.pricing.totalPrice.toFixed(2)}`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}