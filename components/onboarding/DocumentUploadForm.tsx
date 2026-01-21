'use client'

import { useState, useRef, useCallback } from 'react'
import { StepProps, DOCUMENT_TYPES, DocumentUpload } from './types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowRight, ArrowLeft, Upload, FileText, Check, X,
  AlertCircle, Loader2, Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DocumentUploadForm({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const supabase = createClient()

  const documents = data.documents || []

  const getDocumentByType = (type: string): DocumentUpload | undefined => {
    return documents.find((doc) => doc.document_type === type)
  }

  const handleFileSelect = async (type: string, file: File) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (JPEG, PNG, WebP)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setUploading(type)
    setError(null)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${type}_${Date.now()}.${fileExt}`
      const filePath = `documents/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('cleaner-documents')
        .upload(filePath, file)

      if (uploadError) {
        // If bucket doesn't exist, store as base64 temporarily
        console.error('Storage upload error:', uploadError)
        // For now, just save the file info locally
        const newDoc: DocumentUpload = {
          document_type: type as DocumentUpload['document_type'],
          file_name: file.name,
          file_url: URL.createObjectURL(file),
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'pending'
        }

        const existingDocs = documents.filter((d) => d.document_type !== type)
        onChange({ ...data, documents: [...existingDocs, newDoc] })
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cleaner-documents')
        .getPublicUrl(filePath)

      const newDoc: DocumentUpload = {
        document_type: type as DocumentUpload['document_type'],
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        verification_status: 'pending'
      }

      const existingDocs = documents.filter((d) => d.document_type !== type)
      onChange({ ...data, documents: [...existingDocs, newDoc] })
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload document. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  const handleRemoveDocument = (type: string) => {
    const updatedDocs = documents.filter((d) => d.document_type !== type)
    onChange({ ...data, documents: updatedDocs })
  }

  const handleDrop = useCallback((type: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(type, file)
    }
  }, [documents, data, onChange])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const hasRequiredDocuments = () => {
    // Insurance is the only required document
    return documents.some((d) => d.document_type === 'insurance')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
        <p className="text-gray-600 mt-1">
          Upload verification documents to build trust with customers
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {DOCUMENT_TYPES.map((docType) => {
          const existingDoc = getDocumentByType(docType.value)
          const isUploading = uploading === docType.value

          return (
            <div
              key={docType.value}
              className="border rounded-lg p-4 transition-colors hover:border-gray-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Label className="font-medium">
                    {docType.label}
                    {docType.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    {docType.value === 'insurance' && 'Proof of liability insurance coverage'}
                    {docType.value === 'license' && 'Business license or registration'}
                    {docType.value === 'background_check' && 'Background check certificate'}
                    {docType.value === 'certification' && 'Professional certifications'}
                  </p>
                </div>
                {existingDoc && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Review
                  </span>
                )}
              </div>

              {existingDoc ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{existingDoc.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {existingDoc.file_size
                          ? `${(existingDoc.file_size / 1024).toFixed(1)} KB`
                          : 'Uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocument(docType.value)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                  onDrop={handleDrop(docType.value)}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRefs.current[docType.value]?.click()}
                >
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[docType.value] = el)}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(docType.value, file)
                    }}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                      <p className="mt-2 text-sm text-gray-600">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="text-blue-600 font-medium">Click to upload</span> or
                        drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, JPEG, PNG or WebP (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Documents will be reviewed by our team within 1-2 business days. You can continue
          with the onboarding process while documents are being verified.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isSubmitting}>
          {hasRequiredDocuments() ? 'Continue' : 'Skip for Now'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
