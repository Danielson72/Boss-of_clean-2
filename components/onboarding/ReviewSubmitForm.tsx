'use client'

import { useState } from 'react'
import { StepProps, SERVICE_TYPES, DOCUMENT_TYPES } from './types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft, Send, Building2, MapPin, FileText,
  GraduationCap, Check, AlertCircle, Loader2,
  DollarSign, Clock, Users, Calendar
} from 'lucide-react'

interface ReviewSubmitFormProps extends StepProps {
  onSubmit: () => Promise<void>
}

export default function ReviewSubmitForm({
  data,
  onChange,
  onBack,
  onSubmit,
  isSubmitting
}: ReviewSubmitFormProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const documents = data.documents || []
  const services = data.services || []
  const serviceAreas = data.service_areas || []

  const getServiceLabel = (value: string) => {
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

  const completionStatus = {
    business: !!(data.business_name && data.business_phone && data.business_email),
    services: services.length > 0 && serviceAreas.length > 0,
    documents: documents.length > 0,
    training: (data.training_videos_watched?.length || 0) >= 2
  }

  const isComplete = Object.values(completionStatus).every(Boolean)

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

      {/* Completion checklist */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'business', label: 'Business Info', icon: Building2 },
          { key: 'services', label: 'Services', icon: MapPin },
          { key: 'documents', label: 'Documents', icon: FileText },
          { key: 'training', label: 'Training', icon: GraduationCap }
        ].map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className={`p-3 rounded-lg border ${
              completionStatus[key as keyof typeof completionStatus]
                ? 'border-green-200 bg-green-50'
                : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {completionStatus[key as keyof typeof completionStatus] ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <Icon className="h-4 w-4 text-gray-500" />
            </div>
            <p className="text-sm font-medium mt-1">{label}</p>
          </div>
        ))}
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
          <MapPin className="h-5 w-5 text-blue-600" />
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

        <div className="pt-2 border-t">
          <span className="text-gray-500 text-sm">Service Areas:</span>
          <div className="flex flex-wrap gap-2 mt-2">
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
            offer cleaning services in my listed service areas.
          </Label>
        </div>
      </div>

      {/* What happens next */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>What happens next?</strong> After submitting, our team will review your
          profile and documents within 1-2 business days. Once approved, you'll start
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
