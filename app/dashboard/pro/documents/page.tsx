import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, UploadCloud } from 'lucide-react'

export const metadata = { title: 'My Documents | Boss of Clean' }

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance: 'Liability Insurance Certificate',
  id_photo: 'Government-Issued ID',
  license: 'Business License',
  background_check: 'Background Check',
  certification: 'Professional Certification',
  other: 'Other Document',
}

export default async function ProDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('id, trust_score, verification_level, insurance_verified, photo_verified, background_check_verified, license_verified')
    .eq('user_id', user.id)
    .single()

  if (!cleaner) redirect('/dashboard/pro/onboarding')

  const { data: docs } = await supabase
    .from('cleaner_documents')
    .select('id, document_type, file_name, file_size, verification_status, verification_notes, rejection_reason, created_at, verified_at')
    .eq('cleaner_id', cleaner.id)
    .order('created_at', { ascending: false })

  const hasRejected = docs?.some((d) => d.verification_status === 'rejected')
  const hasPending = docs?.some((d) => d.verification_status === 'pending')

  const levelLabel: Record<string, string> = {
    fully_verified: 'Fully Verified',
    partially_verified: 'Partially Verified',
    basic_verified: 'Basic Verified',
    unverified: 'Unverified',
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload and track verification status of your business documents
        </p>
      </div>

      {/* Trust score card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{cleaner.trust_score}</div>
            <div>
              <p className="font-medium">{levelLabel[cleaner.verification_level] ?? cleaner.verification_level}</p>
              <p className="text-xs text-muted-foreground">Trust Score / 80 points max</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <VerifyItem label="Insurance" verified={cleaner.insurance_verified} points={30} />
            <VerifyItem label="Government ID" verified={cleaner.photo_verified} points={20} />
            <VerifyItem label="Background Check" verified={cleaner.background_check_verified} points={20} />
            <VerifyItem label="Business License" verified={cleaner.license_verified} points={10} />
          </div>
        </CardContent>
      </Card>

      {hasRejected && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            One or more documents were rejected. Please review the notes below and re-upload via your{' '}
            <Link href="/dashboard/pro/onboarding" className="underline font-medium">onboarding wizard</Link>.
          </AlertDescription>
        </Alert>
      )}

      {hasPending && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Some documents are pending review. Our team typically reviews within 1–2 business days.
          </AlertDescription>
        </Alert>
      )}

      {!docs?.length ? (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
          <Button asChild>
            <Link href="/dashboard/pro/onboarding">
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload Documents
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </span>
                      <DocStatusBadge status={doc.verification_status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(doc.created_at).toLocaleDateString()}
                      {doc.verified_at ? ` · Reviewed ${new Date(doc.verified_at).toLocaleDateString()}` : ''}
                    </p>
                    {(doc.rejection_reason || doc.verification_notes) && (
                      <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                        <strong>Admin notes:</strong> {doc.rejection_reason || doc.verification_notes}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard/pro/onboarding">
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload / Replace Documents
          </Link>
        </Button>
      </div>
    </div>
  )
}

function VerifyItem({ label, verified, points }: { label: string; verified: boolean; points: number }) {
  return (
    <div className="flex items-center gap-2">
      {verified
        ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
        : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
      <span className={verified ? 'text-green-700' : 'text-muted-foreground'}>
        {label} {verified ? `(+${points})` : `(0/${points})`}
      </span>
    </div>
  )
}

function DocStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-600 text-white text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
    case 'rejected':
      return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    case 'expired':
      return <Badge className="bg-orange-500 text-white text-xs"><Clock className="h-3 w-3 mr-1" />Expired</Badge>
    default:
      return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>
  }
}
