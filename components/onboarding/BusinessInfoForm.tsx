'use client'

import { useState } from 'react'
import { StepProps } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, Phone, Mail, Globe, Users, Calendar, ArrowRight } from 'lucide-react'

export default function BusinessInfoForm({ data, onChange, onNext, isSubmitting }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!data.business_name?.trim()) {
      newErrors.business_name = 'Business name is required'
    }
    if (!data.business_phone?.trim()) {
      newErrors.business_phone = 'Phone number is required'
    } else if (!/^\+?[\d\s\-()]+$/.test(data.business_phone)) {
      newErrors.business_phone = 'Please enter a valid phone number'
    }
    if (!data.business_email?.trim()) {
      newErrors.business_email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.business_email)) {
      newErrors.business_email = 'Please enter a valid email address'
    }
    if (data.website_url && !/^https?:\/\/.+/.test(data.website_url)) {
      newErrors.website_url = 'Please enter a valid URL (starting with http:// or https://)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const handleChange = (field: string, value: string | number) => {
    onChange({ ...data, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
        <p className="text-gray-600 mt-1">Tell us about your cleaning business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="business_name">Business Name *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="business_name"
              value={data.business_name || ''}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="Your Business Name"
              className={`pl-10 ${errors.business_name ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.business_name && (
            <p className="text-sm text-red-500">{errors.business_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_phone">Business Phone *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="business_phone"
              type="tel"
              value={data.business_phone || ''}
              onChange={(e) => handleChange('business_phone', e.target.value)}
              placeholder="(555) 123-4567"
              className={`pl-10 ${errors.business_phone ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.business_phone && (
            <p className="text-sm text-red-500">{errors.business_phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_email">Business Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="business_email"
              type="email"
              value={data.business_email || ''}
              onChange={(e) => handleChange('business_email', e.target.value)}
              placeholder="contact@yourbusiness.com"
              className={`pl-10 ${errors.business_email ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.business_email && (
            <p className="text-sm text-red-500">{errors.business_email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website_url">Website (Optional)</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="website_url"
              type="url"
              value={data.website_url || ''}
              onChange={(e) => handleChange('website_url', e.target.value)}
              placeholder="https://www.yourbusiness.com"
              className={`pl-10 ${errors.website_url ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.website_url && (
            <p className="text-sm text-red-500">{errors.website_url}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="employees_count">Number of Employees</Label>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="employees_count"
              type="number"
              min="1"
              max="100"
              value={data.employees_count || 1}
              onChange={(e) => handleChange('employees_count', parseInt(e.target.value) || 1)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="years_experience">Years of Experience</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="years_experience"
              type="number"
              min="0"
              max="50"
              value={data.years_experience || 0}
              onChange={(e) => handleChange('years_experience', parseInt(e.target.value) || 0)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_description">Business Description</Label>
        <Textarea
          id="business_description"
          value={data.business_description || ''}
          onChange={(e) => handleChange('business_description', e.target.value)}
          placeholder="Tell customers about your business, experience, and what makes you unique..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          {(data.business_description?.length || 0)}/500 characters
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} disabled={isSubmitting}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
