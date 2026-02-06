'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Eye,
  Loader2,
  User,
  Building,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  History,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { getCleanerDetails, verifyDocument, approveCleaner, rejectCleaner } from '../actions'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'app/dashboard/admin/components/cleaner-detail-modal.tsx' })

interface CleanerDetailModalProps {
  cleanerId: string | null
  isOpen: boolean
  onClose: () => void
}

interface Document {
  id: string
  document_type: string
  file_name: string
  file_url: string
  file_size?: number
  verification_status: string
  verification_notes?: string
  verified_at?: string
  created_at: string
}

interface Review {
  id: string
  decision: string
  notes?: string
  previous_status?: string
  new_status?: string
  created_at: string
  admin?: {
    email: string
    full_name?: string
  }
}

interface CleanerData {
  id: string
  business_name: string
  business_description?: string
  business_phone?: string
  business_email?: string
  website_url?: string
  services?: string[]
  service_areas?: string[]
  hourly_rate?: number
  minimum_hours?: number
  years_experience?: number
  employees_count?: number
  insurance_verified?: boolean
  license_verified?: boolean
  background_check?: boolean
  approval_status: string
  rejected_reason?: string
  created_at: string
  onboarding_completed_at?: string
  user?: {
    id: string
    email: string
    full_name?: string
    phone?: string
    city?: string
    state?: string
    zip_code?: string
    created_at: string
  }
}

export function CleanerDetailModal({ cleanerId, isOpen, onClose }: CleanerDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [cleaner, setCleaner] = useState<CleanerData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null)
  const [docNotes, setDocNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (cleanerId && isOpen) {
      loadDetails()
    }
  }, [cleanerId, isOpen])

  const loadDetails = async () => {
    if (!cleanerId) return
    setLoading(true)
    try {
      const result = await getCleanerDetails(cleanerId)
      if (result.success && result.data) {
        setCleaner(result.data.cleaner as CleanerData)
        setDocuments(result.data.documents as Document[])
        setReviews(result.data.reviews as Review[])
      } else {
        toast.error(result.error || 'Failed to load details')
      }
    } catch (error) {
      logger.error('Error loading details', { function: 'loadDetails', error })
      toast.error('Failed to load cleaner details')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDocument = async (docId: string, status: 'verified' | 'rejected') => {
    setVerifyingDoc(docId)
    try {
      const result = await verifyDocument(docId, status, docNotes[docId])
      if (result.success) {
        toast.success(`Document ${status}`)
        loadDetails() // Refresh data
      } else {
        toast.error(result.error || 'Failed to update document')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setVerifyingDoc(null)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      license: 'Business License',
      insurance: 'Insurance Certificate',
      background_check: 'Background Documentation',
      certification: 'Professional Certification',
      other: 'Other Document'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {cleaner?.business_name || 'Loading...'}
            {cleaner && (
              <Badge variant={cleaner.approval_status === 'approved' ? 'default' : 'secondary'}>
                {cleaner.approval_status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cleaner ? (
          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History ({reviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              {/* Business Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Business Name</Label>
                    <p className="font-medium">{cleaner.business_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Email</Label>
                    <p className="font-medium">{cleaner.business_email || cleaner.user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{cleaner.business_phone || cleaner.user?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    {cleaner.website_url ? (
                      <a href={cleaner.website_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 flex items-center gap-1">
                        {cleaner.website_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-medium text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="font-medium">{cleaner.business_description || 'No description provided'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location & Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">
                      {cleaner.user?.city}, {cleaner.user?.state} {cleaner.user?.zip_code}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Service Areas</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cleaner.service_areas?.map((area, i) => (
                        <Badge key={i} variant="outline">{area}</Badge>
                      )) || <span className="text-muted-foreground">Not specified</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Services Offered</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cleaner.services?.map((service, i) => (
                        <Badge key={i} variant="secondary">{service}</Badge>
                      )) || <span className="text-muted-foreground">Not specified</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Experience & Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Experience & Rates
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Years Experience</Label>
                    <p className="font-medium text-lg">{cleaner.years_experience || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Hourly Rate</Label>
                    <p className="font-medium text-lg">${cleaner.hourly_rate || 0}/hr</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Min Hours</Label>
                    <p className="font-medium text-lg">{cleaner.minimum_hours || 1} hrs</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Employees</Label>
                    <p className="font-medium text-lg">{cleaner.employees_count || 1}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Verification Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    {cleaner.insurance_verified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span>Insurance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cleaner.license_verified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span>License</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cleaner.background_check ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span>Background Documentation</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents uploaded</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <span className="font-medium">{getDocTypeLabel(doc.document_type)}</span>
                            {getStatusBadge(doc.verification_status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                          {doc.verification_notes && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <strong>Notes:</strong> {doc.verification_notes}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>

                          {doc.verification_status === 'pending' && (
                            <>
                              <div className="mt-2">
                                <Textarea
                                  placeholder="Verification notes..."
                                  className="text-xs h-16"
                                  value={docNotes[doc.id] || ''}
                                  onChange={(e) => setDocNotes({ ...docNotes, [doc.id]: e.target.value })}
                                />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={verifyingDoc === doc.id}
                                  onClick={() => handleVerifyDocument(doc.id, 'verified')}
                                >
                                  {verifyingDoc === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <><CheckCircle className="h-4 w-4 mr-1" />Verify</>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={verifyingDoc === doc.id}
                                  onClick={() => handleVerifyDocument(doc.id, 'rejected')}
                                >
                                  {verifyingDoc === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <><XCircle className="h-4 w-4 mr-1" />Reject</>
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No review history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-full ${
                            review.decision === 'approved' ? 'bg-green-100' :
                            review.decision === 'rejected' ? 'bg-red-100' :
                            'bg-yellow-100'
                          }`}>
                            {review.decision === 'approved' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : review.decision === 'rejected' ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{review.decision.replace('_', ' ')}</span>
                              <span className="text-sm text-muted-foreground">
                                by {review.admin?.full_name || review.admin?.email || 'Admin'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleString()}
                            </p>
                            {review.notes && (
                              <p className="mt-2 text-sm bg-muted p-2 rounded">
                                {review.notes}
                              </p>
                            )}
                            {review.previous_status && review.new_status && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Status changed: {review.previous_status} → {review.new_status}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Failed to load cleaner details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
