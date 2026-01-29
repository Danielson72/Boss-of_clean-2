'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/context/AuthContext'
import { ProtectedRoute } from '@/lib/auth/protected-route'
import {
  ProgressIndicator,
  BusinessInfoForm,
  LocationServicesForm,
  DocumentUploadForm,
  TrainingModule,
  ReviewSubmitForm,
  OnboardingStep,
  OnboardingData
} from '@/components/onboarding'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const AUTO_SAVE_DELAY = 30000 // 30 seconds

export default function CleanerOnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.BUSINESS_INFO)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [data, setData] = useState<Partial<OnboardingData>>({})
  const [cleanerId, setCleanerId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submitted, setSubmitted] = useState(false)

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dataRef = useRef(data)
  const currentStepRef = useRef(currentStep)

  // Keep refs updated
  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

  // Load existing draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await fetch('/api/cleaners/onboarding')
        if (!response.ok) throw new Error('Failed to load onboarding data')

        const result = await response.json()

        if (result.cleaner_id) {
          setCleanerId(result.cleaner_id)
        }

        if (result.onboarding_completed_at) {
          // Already completed, redirect to dashboard
          router.push('/dashboard/cleaner')
          return
        }

        // Merge existing profile data with onboarding data
        const mergedData: Partial<OnboardingData> = {
          ...result.onboarding_data,
          ...result.profile
        }

        setData(mergedData)
        setCurrentStep(result.onboarding_step || OnboardingStep.BUSINESS_INFO)

        // Mark previous steps as completed
        const completed: number[] = []
        for (let i = 1; i < (result.onboarding_step || 1); i++) {
          completed.push(i)
        }
        setCompletedSteps(completed)
      } catch (err) {
        // console.error('Error loading draft:', err)
        setError('Failed to load your progress. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadDraft()
  }, [router])

  // Auto-save functionality
  const saveDraft = useCallback(async (stepData?: Partial<OnboardingData>, step?: number) => {
    const dataToSave = stepData || dataRef.current
    const stepToSave = step || currentStepRef.current

    setSaving(true)
    setSaveStatus('saving')

    try {
      const response = await fetch('/api/cleaners/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepToSave,
          data: dataToSave
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      const result = await response.json()
      if (result.cleaner_id) {
        setCleanerId(result.cleaner_id)
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      // console.error('Error saving draft:', err)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [])

  // Set up auto-save timer
  useEffect(() => {
    if (loading || submitted) return

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft()
    }, AUTO_SAVE_DELAY)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [data, loading, submitted, saveDraft])

  const handleDataChange = (newData: Partial<OnboardingData>) => {
    setData(newData)
  }

  const handleNext = async () => {
    // Save current step data
    await saveDraft(data, currentStep + 1)

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }

    // Move to next step
    if (currentStep < OnboardingStep.REVIEW) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > OnboardingStep.BUSINESS_INFO) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      // Save final data first
      await saveDraft(data, OnboardingStep.REVIEW)

      // Submit for approval
      const response = await fetch('/api/cleaners/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to submit')
      }

      setSubmitted(true)

      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard/cleaner')
      }, 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Loading your progress...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (submitted) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Application Submitted!
            </h2>
            <p className="mt-2 text-gray-600">
              Thank you for completing your profile. Our team will review your
              application within 1-2 business days.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Complete Your Profile
            </h1>
            <p className="mt-2 text-gray-600">
              Set up your business profile to start receiving customer leads
            </p>
          </div>

          {/* Save status indicator */}
          <div className="flex justify-end mb-4">
            {saveStatus === 'saving' && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Save failed
              </span>
            )}
          </div>

          {/* Progress indicator */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <ProgressIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
            />
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step content */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            {currentStep === OnboardingStep.BUSINESS_INFO && (
              <BusinessInfoForm
                data={data}
                onChange={handleDataChange}
                onNext={handleNext}
                isSubmitting={saving}
              />
            )}
            {currentStep === OnboardingStep.LOCATION_SERVICES && (
              <LocationServicesForm
                data={data}
                onChange={handleDataChange}
                onNext={handleNext}
                onBack={handleBack}
                isSubmitting={saving}
              />
            )}
            {currentStep === OnboardingStep.DOCUMENTS && (
              <DocumentUploadForm
                data={data}
                onChange={handleDataChange}
                onNext={handleNext}
                onBack={handleBack}
                isSubmitting={saving}
              />
            )}
            {currentStep === OnboardingStep.TRAINING && (
              <TrainingModule
                data={data}
                onChange={handleDataChange}
                onNext={handleNext}
                onBack={handleBack}
                isSubmitting={saving}
              />
            )}
            {currentStep === OnboardingStep.REVIEW && (
              <ReviewSubmitForm
                data={data}
                onChange={handleDataChange}
                onBack={handleBack}
                onNext={() => {}}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
