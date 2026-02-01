'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ReviewModerationCard, ReviewForModeration } from '@/components/admin/ReviewModerationCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/admin/reviews/page.tsx' });

type FilterType = 'all' | 'pending' | 'flagged' | 'published';

interface ReviewStats {
  total: number;
  pending: number;
  flagged: number;
  published: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [reviews, setReviews] = useState<ReviewForModeration[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, pending: 0, flagged: 0, published: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filter, setFilter] = useState<FilterType>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadReviews();
    }
  }, [user, filter, pagination.page]);

  const checkAdminAccess = async () => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (data?.role !== 'admin') {
      router.push('/dashboard/customer');
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reviews?filter=${filter}&page=${pagination.page}&limit=${pagination.limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.reviews);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      logger.error('Error loading reviews', { function: 'loadReviews', error });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) throw new Error('Failed to approve review');

      // Refresh the list
      await loadReviews();
    } catch (error) {
      logger.error('Error approving review', { function: 'handleApprove', error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (!response.ok) throw new Error('Failed to reject review');

      await loadReviews();
    } catch (error) {
      logger.error('Error rejecting review', { function: 'handleReject', error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async (id: string, reason: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flag', reason }),
      });

      if (!response.ok) throw new Error('Failed to flag review');

      await loadReviews();
    } catch (error) {
      logger.error('Error flagging review', { function: 'handleFlag', error });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async (id: string, comment: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', comment }),
      });

      if (!response.ok) throw new Error('Failed to edit review');

      await loadReviews();
    } catch (error) {
      logger.error('Error editing review', { function: 'handleEdit', error });
    } finally {
      setActionLoading(null);
    }
  };

  const filterTabs: { key: FilterType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'pending', label: 'Pending', count: stats.pending, icon: <Clock className="h-4 w-4" /> },
    { key: 'flagged', label: 'Flagged', count: stats.flagged, icon: <AlertTriangle className="h-4 w-4" /> },
    { key: 'published', label: 'Published', count: stats.published, icon: <CheckCircle className="h-4 w-4" /> },
    { key: 'all', label: 'All', count: stats.total, icon: <MessageSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard/admin" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Review Moderation</h1>
        </div>
        <p className="text-muted-foreground">
          Review and moderate customer reviews. Approve, reject, or flag reviews for your platform.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flagged}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            <Badge variant={filter === tab.key ? 'secondary' : 'outline'} className="ml-1">
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' ? 'All Reviews' :
             filter === 'pending' ? 'Pending Reviews' :
             filter === 'flagged' ? 'Flagged Reviews' : 'Published Reviews'}
          </CardTitle>
          <CardDescription>
            {filter === 'pending' && 'Reviews awaiting moderation approval.'}
            {filter === 'flagged' && 'Reviews flagged for inappropriate content.'}
            {filter === 'published' && 'Approved and publicly visible reviews.'}
            {filter === 'all' && 'All reviews across all statuses.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">
                {filter === 'pending' && 'No pending reviews to moderate.'}
                {filter === 'flagged' && 'No flagged reviews.'}
                {filter === 'published' && 'No published reviews yet.'}
                {filter === 'all' && 'No reviews found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewModerationCard
                  key={review.id}
                  review={review}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onFlag={handleFlag}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reviews
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
