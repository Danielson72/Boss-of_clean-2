'use client'

import { useState } from 'react'
import { StepProps, SERVICE_TYPES, DOCUMENT_TYPES, OnboardingStep, STEP_LABELS } from './types'
import { useServiceCategories } from '@/lib/hooks/useServiceCategories'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft, Send, Building2, MapPin, FileText,
  Camera, Check, AlertCircle, Loader2,
  DollarSign, Clock, Users, Calendar
} from 'lucide-react'
import Image from 'next/image'

interface ReviewSubmitFormProps extends StepProps {
  onSubmit: () => Promise<void>
}

export default function ReviewSubmitForm({
  data,
  onChange,
  onBack,
  onGoToStep,
  onSubmit,
  isSubmitting
}: ReviewSubmitFormProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { categories: serviceCategories } = useServiceCategories()

  const documents = data.documents || []
  const services = data.services || []
  const serviceAreas = data.service_areas || []
  const portfolioImages = data.portfolio_images || []

  const getServiceLabel = (value: string) => {
    // DLD-458: prefer DB display_name so the 9 new categories from DLD-442
    // (handyman, hvac, plumbing, etc.) render correctly. Fall back to the
    // legacy onboarding constant for backwards compatibility, then raw slug.
    const dbMatch = serviceCategories.find((c) => c.slug === value)
    if (dbMatch) return dbMatch.display_name
    return SERVICE_TYPES.find((s) => s.value === value)?.label || value
  }

  const getDocumentLabel = (type: string) => {
    return DOCUMENT_TYPES.find((d) => d.value === type)?.label || type
  }

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions')
      return
    }

    setError(null)
    try {
      await onSubmit()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setError(message);
    }
  }

  // Mirrors the submit route: business name/phone/email, primary_category,
  // and at least one service area are required. Documents and photos are not.
  const completionStatus = {
    business: !!(data.business_name && data.business_phone && data.business_email),
    services: !!data.primary_category,
    areas: serviceAreas.length > 0,
    documents: documents.length > 0,
    photos: !!(data.profile_image_url || portfolioImages.length > 0)
  }

  const checklist: Array<{
    key: keyof typeof completionStatus
    label: string
    icon: typeof Building2
    step: OnboardingStep
    required: boolean
  }> = [
    { key: 'business', label: 'Business', icon: Building2, step: OnboardingStep.BUSINESS_INFO, required: true },
    { key: 'services', label: 'Services', icon: DollarSign, step: OnboardingStep.SERVICES, required: true },
    { key: 'areas', label: 'Areas', icon: MapPin, step: OnboardingStep.SERVICE_AREAS, required: true },
    { key: 'documents', label: 'Docs', icon: FileText, step: OnboardingStep.DOCUMENTS, required: false },
    { key: 'photos', label: 'Photos', icon: Camera, step: OnboardingStep.PHOTOS, required: false }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
        <p className="text-gray-600 mt-1">
          Review your information before submitting for approval
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Completion checklist — each chip jumps back to its step */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {checklist.map(({ key, label, icon: Icon, step, required }) => {
          const done = completionStatus[key]
          const state = done ? 'complete' : required ? 'incomplete' : 'optional, not added'
          return (
            <button
              key={key}
              type="button"
              onClick={() => onGoToStep?.(step)}
              disabled={!onGoToStep || isSubmitting}
              aria-label={`${STEP_LABELS[step - 1]}: ${state}. Go to step ${step}`}
              className={`p-3 rounded-lg border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-default ${
                done
                  ? 'border-green-200 bg-green-50 hover:bg-green-100'
                  : required
                  ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {done ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : required ? (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <Icon className="h-4 w-4 text-gray-400" />
                )}
                {(done || required) && <Icon className="h-4 w-4 text-gray-500" />}
              </div>
              <p className="text-xs font-medium mt-1">{label}</p>
              <p className="text-[11px] text-gray-500">
                {done ? 'Complete' : required ? 'Needs attention' : 'Optional'}
              </p>
            </button>
          )
        })}
      </div>

      {/* Business Info Summary */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Business Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Business Name:</span>
            <p className="font-medium">{data.business_name || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-gray-500">Phone:</span>
            <p className="font-medium">{data.business_phone || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium">{data.business_email || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-gray-500">Website:</span>
            <p className="font-medium">{data.website_url || 'Not provided'}</p>
          </div>
        </div>
        {data.business_description && (
          <div className="pt-2 border-t">
            <span className="text-gray-500 text-sm">Description:</span>
            <p className="text-sm mt-1">{data.business_description}</p>
          </div>
        )}
      </div>

      {/* Services & Pricing Summary */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Services & Pricing
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Hourly Rate:</span>
              <p className="font-medium">${data.hourly_rate || 0}/hr</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Min Hours:</span>
              <p className="font-medium">{data.minimum_hours || 2} hours</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Team Size:</span>
              <p className="font-medium">{data.employees_count || 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-gray-500">Experience:</span>
              <p className="font-medium">{data.years_experience || 0} years</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <span className="text-gray-500 text-sm">Services Offered:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {services.length > 0 ? (
              services.map((service) => (
                <span
                  key={service}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {getServiceLabel(service)}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-sm">No services selected</span>
            )}
          </div>
        </div>
      </div>

      {/* Service Areas Summary */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Service Areas
        </h3>
        <div className="flex flex-wrap gap-2">
          {serviceAreas.length > 0 ? (
            serviceAreas.map((zip) => (
              <span
                key={zip}
                className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
              >
                {zip}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">No areas selected</span>
          )}
        </div>
      </div>

      {/* Documents Summary */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Uploaded Documents
        </h3>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium">{getDocumentLabel(doc.document_type)}:</span>
                <span className="text-gray-600">{doc.file_name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No documents uploaded</p>
        )}
      </div>

      {/* Photos Summary */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-600" />
          Photos
        </h3>
        <div className="flex items-start gap-4">
          {data.profile_image_url ? (
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border">
                <Image src={data.profile_image_url} alt="Profile" fill className="object-cover" />
              </div>
              <span className="text-sm text-green-600">Profile photo uploaded</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">No profile photo</span>
          )}
        </div>
        {portfolioImages.length > 0 && (
          <p className="text-sm text-green-600">
            {portfolioImages.length} portfolio image{portfolioImages.length !== 1 ? 's' : ''} uploaded
          </p>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          />
          <Label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
            I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            . I confirm that all information provided is accurate and I have the right to
            offer services in my listed service areas.
          </Label>
        </div>
      </div>

      {/* What happens next */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>What happens next?</strong> After submitting, our team will review your
          profile and documents within 1-2 business days. Once approved, you&apos;ll start
          appearing in search results and can receive quote requests.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!agreedToTerms || isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit for Approval
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
