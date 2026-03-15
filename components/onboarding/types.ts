export enum OnboardingStep {
  BUSINESS_INFO = 1,
  SERVICES = 2,
  SERVICE_AREAS = 3,
  DOCUMENTS = 4,
  PHOTOS = 5,
  REVIEW = 6
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

  // Step 2: Services
  services: string[]
  hourly_rate: number
  minimum_hours: number

  // Step 3: Service Areas
  service_areas: string[]
  instant_booking: boolean
  business_hours: Record<string, { open: string; close: string; closed: boolean }>

  // Step 4: Documents
  documents: DocumentUpload[]

  // Step 5: Photos
  profile_image_url: string
  portfolio_images: string[]

  // Step 6: Review - no additional fields
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
  { value: 'office_cleaning', label: 'Office Cleaning' },
  { value: 'pool_cleaning', label: 'Pool Cleaning' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'mobile_car_detailing', label: 'Mobile Car Detailing' },
  { value: 'air_duct_cleaning', label: 'Air Duct Cleaning' },
  { value: 'str_turnover', label: 'STR Turnover Cleaning' },
]

export const DOCUMENT_TYPES = [
  { value: 'license', label: 'Business License', required: false },
  { value: 'insurance', label: 'Liability Insurance', required: true },
  { value: 'background_check', label: 'Background Check', required: false },
  { value: 'certification', label: 'Certification', required: false }
]

export const STEP_LABELS = [
  'Business Info',
  'Services',
  'Service Areas',
  'Documents',
  'Photos',
  'Review & Submit'
]
