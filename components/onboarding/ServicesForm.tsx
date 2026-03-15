'use client'

import { useState } from 'react'
import { StepProps, SERVICE_TYPES } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DollarSign, Clock, ArrowRight, ArrowLeft } from 'lucide-react'

export default function ServicesForm({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!data.services || data.services.length === 0) {
      newErrors.services = 'Please select at least one service'
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Services You Offer</h2>
        <p className="text-gray-600 mt-1">Select the services you provide and set your rate</p>
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
              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                data.services?.includes(service.value)
                  ? 'border-blue-400 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
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
