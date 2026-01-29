'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, Loader2 } from 'lucide-react'

/** Cleaner data from database */
interface CleanerData {
  id: string;
  business_name: string;
  description?: string;
  hourly_rate?: number;
  years_experience?: number;
  service_types?: string[];
  insurance_verified?: boolean;
  background_checked?: boolean;
}

/** User data from database */
interface UserData {
  display_name?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface CleanerProfileFormProps {
  cleanerData: CleanerData | null
  userData: UserData | null
  userId: string
}

export default function CleanerProfileForm({ cleanerData, userData, userId }: CleanerProfileFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    business_name: cleanerData?.business_name || '',
    description: cleanerData?.description || '',
    hourly_rate: cleanerData?.hourly_rate || '',
    years_experience: cleanerData?.years_experience || '',
    service_types: cleanerData?.service_types || [],
    insurance_verified: cleanerData?.insurance_verified || false,
    background_checked: cleanerData?.background_checked || false,
    // User data
    display_name: userData?.display_name || '',
    city: userData?.city || '',
    state: userData?.state || '',
    zip_code: userData?.zip_code || '',
  })

  const serviceOptions = [
    'residential',
    'commercial',
    'deep_clean',
    'move_in_out',
    'post_construction',
    'office',
    'retail'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Update user data
      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: formData.display_name,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
        })
        .eq('id', userId)

      if (userError) throw userError

      // Update or create cleaner profile
      if (cleanerData) {
        // Update existing profile
        const { error: cleanerError } = await supabase
          .from('cleaners')
          .update({
            business_name: formData.business_name,
            description: formData.description,
            hourly_rate: parseFloat(String(formData.hourly_rate)),
            years_experience: parseInt(String(formData.years_experience)),
            service_types: formData.service_types,
            insurance_verified: formData.insurance_verified,
            background_checked: formData.background_checked,
          })
          .eq('id', cleanerData.id)

        if (cleanerError) throw cleanerError
      } else {
        // Create new profile
        const { error: cleanerError } = await supabase
          .from('cleaners')
          .insert({
            user_id: userId,
            business_name: formData.business_name,
            description: formData.description,
            hourly_rate: parseFloat(String(formData.hourly_rate)),
            years_experience: parseInt(String(formData.years_experience)),
            service_types: formData.service_types,
            insurance_verified: formData.insurance_verified,
            background_checked: formData.background_checked,
            approval_status: 'pending',
            directory_visible: false,
          })

        if (cleanerError) throw cleanerError
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error updating profile';
      setMessage({ type: 'error', text: message })
    } finally {
      setLoading(false)
    }
  }

  const handleServiceTypeChange = (service: string) => {
    if (formData.service_types.includes(service)) {
      setFormData({
        ...formData,
        service_types: formData.service_types.filter((s: string) => s !== service)
      })
    } else {
      setFormData({
        ...formData,
        service_types: [...formData.service_types, service]
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Business Information</h3>
          
          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
            <Input
              id="hourly_rate"
              type="number"
              min="15"
              max="200"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="years_experience">Years of Experience</Label>
            <Input
              id="years_experience"
              type="number"
              min="0"
              max="50"
              value={formData.years_experience}
              onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Location Information</h3>
          
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                maxLength={2}
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Business Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          placeholder="Describe your cleaning services, specialties, and what makes your business unique..."
          disabled={loading}
        />
      </div>

      {/* Service Types */}
      <div>
        <Label>Service Types</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {serviceOptions.map((service) => (
            <div key={service} className="flex items-center space-x-2">
              <Checkbox
                id={service}
                checked={formData.service_types.includes(service)}
                onCheckedChange={() => handleServiceTypeChange(service)}
                disabled={loading}
              />
              <Label 
                htmlFor={service} 
                className="text-sm font-normal capitalize cursor-pointer"
              >
                {service.replace('_', ' ')}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Verifications */}
      <div className="space-y-3">
        <Label>Verifications</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="insurance"
              checked={formData.insurance_verified}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, insurance_verified: checked as boolean })
              }
              disabled={loading}
            />
            <Label htmlFor="insurance" className="text-sm font-normal cursor-pointer">
              I have valid liability insurance
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="background"
              checked={formData.background_checked}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, background_checked: checked as boolean })
              }
              disabled={loading}
            />
            <Label htmlFor="background" className="text-sm font-normal cursor-pointer">
              I have completed a background check
            </Label>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Profile
          </>
        )}
      </Button>
    </form>
  )
}