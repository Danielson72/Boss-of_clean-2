'use client'

import { useState, useRef } from 'react'
import { StepProps } from './types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowRight, ArrowLeft, Upload, Camera, Images,
  AlertCircle, Loader2, Trash2, User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function PhotoUploadForm({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload an image file (JPEG, PNG, or WebP)')
      return null
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return null
    }

    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file)

    if (uploadError) {
      // Fallback: use object URL for preview, store filename for later
      return URL.createObjectURL(file)
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  const handleProfileUpload = async (file: File) => {
    setUploadingProfile(true)
    setError(null)
    try {
      const url = await uploadFile(file, 'profile-images', 'onboarding')
      if (url) {
        onChange({ ...data, profile_image_url: url })
      }
    } catch {
      setError('Failed to upload profile photo')
    } finally {
      setUploadingProfile(false)
    }
  }

  const handlePortfolioUpload = async (files: FileList) => {
    setUploadingPortfolio(true)
    setError(null)
    try {
      const currentImages = data.portfolio_images || []
      if (currentImages.length + files.length > 10) {
        setError('Maximum 10 portfolio images allowed')
        setUploadingPortfolio(false)
        return
      }

      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, 'portfolio-photos', 'onboarding')
        if (url) newUrls.push(url)
      }

      onChange({ ...data, portfolio_images: [...currentImages, ...newUrls] })
    } catch {
      setError('Failed to upload portfolio images')
    } finally {
      setUploadingPortfolio(false)
    }
  }

  const removeProfileImage = () => {
    onChange({ ...data, profile_image_url: '' })
  }

  const removePortfolioImage = (index: number) => {
    const current = data.portfolio_images || []
    onChange({ ...data, portfolio_images: current.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Photos</h2>
        <p className="text-gray-600 mt-1">
          Add a profile photo and showcase your work
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Profile Photo */}
      <div className="space-y-3">
        <Label className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Photo
        </Label>
        <p className="text-sm text-gray-500">
          This photo will be shown on your public profile
        </p>

        {data.profile_image_url ? (
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
              <Image
                src={data.profile_image_url}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-green-600 font-medium">Photo uploaded</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeProfileImage}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            onClick={() => profileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={profileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleProfileUpload(file)
              }}
            />
            {uploadingProfile ? (
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            ) : (
              <>
                <User className="h-10 w-10 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-600">
                  <span className="text-blue-600 font-medium">Click to upload</span> your profile photo
                </p>
                <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or WebP (max 5MB)</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Portfolio Images */}
      <div className="space-y-3">
        <Label className="text-lg flex items-center gap-2">
          <Images className="h-5 w-5" />
          Portfolio Images
          <span className="text-sm font-normal text-gray-500">
            ({data.portfolio_images?.length || 0}/10)
          </span>
        </Label>
        <p className="text-sm text-gray-500">
          Show off your best work — before/after shots, completed projects, etc.
        </p>

        {/* Existing portfolio images */}
        {data.portfolio_images && data.portfolio_images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.portfolio_images.map((url, index) => (
              <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                <Image
                  src={url}
                  alt={`Portfolio ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePortfolioImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        {(data.portfolio_images?.length || 0) < 10 && (
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            onClick={() => portfolioInputRef.current?.click()}
          >
            <input
              type="file"
              ref={portfolioInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handlePortfolioUpload(e.target.files)
                }
              }}
            />
            {uploadingPortfolio ? (
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-600">
                  <span className="text-blue-600 font-medium">Click to upload</span> portfolio images
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Select multiple images at once (max 5MB each)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isSubmitting}>
          {data.profile_image_url || (data.portfolio_images?.length || 0) > 0
            ? 'Continue'
            : 'Skip for Now'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
