export enum OnboardingStep {
  BUSINESS_INFO = 1,
  LOCATION_SERVICES = 2,
  DOCUMENTS = 3,
  TRAINING = 4,
  REVIEW = 5
}

export interface OnboardingData {
  // Step 1: Business Info
  business_name: string
  business_description: string
  business_phone: string
  business_email: string
  website_url: string
  employees_count: number
  years_experience: number

  // Step 2: Location & Services
  services: string[]
  service_areas: string[]
  hourly_rate: number
  minimum_hours: number
  instant_booking: boolean
  business_hours: Record<string, { open: string; close: string; closed: boolean }>

  // Step 3: Documents
  documents: DocumentUpload[]

  // Step 4: Training
  training_completed: boolean
  training_videos_watched: string[]

  // Step 5: Review - no additional fields
}

export interface DocumentUpload {
  id?: string
  document_type: 'license' | 'insurance' | 'background_check' | 'certification' | 'other'
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  verification_status?: 'pending' | 'verified' | 'rejected'
}

export interface StepProps {
  data: Partial<OnboardingData>
  onChange: (data: Partial<OnboardingData>) => void
  onNext: () => void
  onBack?: () => void
  isSubmitting?: boolean
}

export const SERVICE_TYPES = [
  { value: 'residential', label: 'Residential Cleaning' },
  { value: 'commercial', label: 'Commercial Cleaning' },
  { value: 'deep_cleaning', label: 'Deep Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
  { value: 'move_in_out', label: 'Move-In/Out Cleaning' },
  { value: 'post_construction', label: 'Post-Construction Cleanup' },
  { value: 'maid_service', label: 'Maid Service' },
  { value: 'office_cleaning', label: 'Office Cleaning' }
]

export const DOCUMENT_TYPES = [
  { value: 'license', label: 'Business License', required: false },
  { value: 'insurance', label: 'Liability Insurance', required: true },
  { value: 'background_check', label: 'Background Check', required: false },
  { value: 'certification', label: 'Certification', required: false }
]

export const STEP_LABELS = [
  'Business Info',
  'Location & Services',
  'Documents',
  'Training',
  'Review & Submit'
]
