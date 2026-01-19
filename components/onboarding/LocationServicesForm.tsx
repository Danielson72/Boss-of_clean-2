'use client'

import { useState } from 'react'
import { StepProps, SERVICE_TYPES } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { DollarSign, Clock, MapPin, ArrowRight, ArrowLeft, Plus, X } from 'lucide-react'

const POPULAR_ZIP_CODES = [
  { zip: '33109', city: 'Miami Beach' },
  { zip: '33139', city: 'Miami Beach' },
  { zip: '32801', city: 'Orlando' },
  { zip: '32803', city: 'Orlando' },
  { zip: '33602', city: 'Tampa' },
  { zip: '33606', city: 'Tampa' },
  { zip: '32204', city: 'Jacksonville' },
  { zip: '32207', city: 'Jacksonville' },
  { zip: '33301', city: 'Fort Lauderdale' },
  { zip: '33304', city: 'Fort Lauderdale' }
]

export default function LocationServicesForm({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customZipCode, setCustomZipCode] = useState('')

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!data.services || data.services.length === 0) {
      newErrors.services = 'Please select at least one service'
    }
    if (!data.service_areas || data.service_areas.length === 0) {
      newErrors.service_areas = 'Please add at least one service area'
    }
    if (!data.hourly_rate || data.hourly_rate < 15) {
      newErrors.hourly_rate = 'Please enter a valid hourly rate (minimum $15)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const handleServiceToggle = (service: string) => {
    const currentServices = data.services || []
    const newServices = currentServices.includes(service)
      ? currentServices.filter((s) => s !== service)
      : [...currentServices, service]
    onChange({ ...data, services: newServices })
    if (errors.services) {
      setErrors({ ...errors, services: '' })
    }
  }

  const handleZipToggle = (zip: string) => {
    const currentAreas = data.service_areas || []
    const newAreas = currentAreas.includes(zip)
      ? currentAreas.filter((z) => z !== zip)
      : [...currentAreas, zip]
    onChange({ ...data, service_areas: newAreas })
    if (errors.service_areas) {
      setErrors({ ...errors, service_areas: '' })
    }
  }

  const addCustomZipCode = () => {
    if (customZipCode && /^\d{5}$/.test(customZipCode)) {
      const currentAreas = data.service_areas || []
      if (!currentAreas.includes(customZipCode)) {
        onChange({ ...data, service_areas: [...currentAreas, customZipCode] })
      }
      setCustomZipCode('')
      if (errors.service_areas) {
        setErrors({ ...errors, service_areas: '' })
      }
    }
  }

  const removeZipCode = (zip: string) => {
    const currentAreas = data.service_areas || []
    onChange({ ...data, service_areas: currentAreas.filter((z) => z !== zip) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Services & Location</h2>
        <p className="text-gray-600 mt-1">Define your service offerings and areas</p>
      </div>

      {/* Services Selection */}
      <div className="space-y-4">
        <Label className="text-lg">Services Offered *</Label>
        {errors.services && (
          <p className="text-sm text-red-500">{errors.services}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICE_TYPES.map((service) => (
            <div
              key={service.value}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleServiceToggle(service.value)}
            >
              <Checkbox
                checked={data.services?.includes(service.value) || false}
                onCheckedChange={() => handleServiceToggle(service.value)}
              />
              <Label className="cursor-pointer font-normal">{service.label}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Hourly Rate ($) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="hourly_rate"
              type="number"
              min="15"
              max="500"
              step="5"
              value={data.hourly_rate || ''}
              onChange={(e) => {
                onChange({ ...data, hourly_rate: parseFloat(e.target.value) || 0 })
                if (errors.hourly_rate) setErrors({ ...errors, hourly_rate: '' })
              }}
              placeholder="50"
              className={`pl-10 ${errors.hourly_rate ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.hourly_rate && (
            <p className="text-sm text-red-500">{errors.hourly_rate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum_hours">Minimum Hours</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="minimum_hours"
              type="number"
              min="1"
              max="8"
              value={data.minimum_hours || 2}
              onChange={(e) => onChange({ ...data, minimum_hours: parseInt(e.target.value) || 2 })}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Instant Booking */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label className="font-medium">Enable Instant Booking</Label>
          <p className="text-sm text-gray-500 mt-1">
            Allow customers to book directly without quote requests
          </p>
        </div>
        <Switch
          checked={data.instant_booking || false}
          onCheckedChange={(checked) => onChange({ ...data, instant_booking: checked })}
        />
      </div>

      {/* Service Areas */}
      <div className="space-y-4">
        <Label className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Service Areas (ZIP Codes) *
        </Label>
        {errors.service_areas && (
          <p className="text-sm text-red-500">{errors.service_areas}</p>
        )}

        <p className="text-sm text-gray-600">Select popular Florida ZIP codes:</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ZIP_CODES.map(({ zip, city }) => (
            <button
              key={zip}
              type="button"
              onClick={() => handleZipToggle(zip)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                data.service_areas?.includes(zip)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {zip} ({city})
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            type="text"
            value={customZipCode}
            onChange={(e) => setCustomZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="Add custom ZIP code"
            maxLength={5}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomZipCode())}
          />
          <Button type="button" variant="outline" onClick={addCustomZipCode}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {data.service_areas && data.service_areas.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Selected areas:</p>
            <div className="flex flex-wrap gap-2">
              {data.service_areas.map((zip) => (
                <span
                  key={zip}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {zip}
                  <button
                    type="button"
                    onClick={() => removeZipCode(zip)}
                    className="hover:text-green-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
