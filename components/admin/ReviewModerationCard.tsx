'use client';

import { useState } from 'react';
import { Star, Flag, Check, X, Edit2, AlertTriangle, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ReviewForModeration {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  service_date: string | null;
  is_published: boolean;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  customer: {
    full_name: string | null;
    email: string;
  };
  cleaner: {
    business_name: string;
  };
}

interface ReviewModerationCardProps {
  review: ReviewForModeration;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onFlag: (id: string, reason: string) => Promise<void>;
  onEdit: (id: string, comment: string) => Promise<void>;
}

export function ReviewModerationCard({
  review,
  onApprove,
  onReject,
  onFlag,
  onEdit,
}: ReviewModerationCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [editedComment, setEditedComment] = useState(review.comment);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(review.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onReject(review.id, reason);
      setShowRejectDialog(false);
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onFlag(review.id, reason);
      setShowFlagDialog(false);
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editedComment.trim()) return;
    setLoading(true);
    try {
      await onEdit(review.id, editedComment);
      setShowEditDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className={`border rounded-lg p-6 ${review.flagged ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                {review.title || 'Untitled Review'}
              </h3>
              {review.flagged && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Flagged
                </Badge>
              )}
              {review.is_published && (
                <Badge variant="default" className="bg-green-600">Published</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              For: <span className="font-medium">{review.cleaner.business_name}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= review.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
        </div>

        {review.flag_reason && (
          <div className="mb-4 p-3 bg-red-100 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Flag reason:</strong> {review.flag_reason}
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {review.customer.full_name || review.customer.email}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(review.created_at)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {!review.is_published && (
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          {!review.flagged && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFlagDialog(true)}
              disabled={loading}
            >
              <Flag className="h-4 w-4 mr-1" />
              Flag
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEditDialog(true)}
            disabled={loading}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this review.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full p-3 border rounded-md min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading || !reason.trim()}>
              {loading ? 'Rejecting...' : 'Reject Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>
              Flag this review for inappropriate content.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this review is being flagged..."
            className="w-full p-3 border rounded-md min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFlag} disabled={loading || !reason.trim()}>
              {loading ? 'Flagging...' : 'Flag Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review Content</DialogTitle>
            <DialogDescription>
              Edit the review content. Use this to remove inappropriate language.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editedComment}
            onChange={(e) => setEditedComment(e.target.value)}
            className="w-full p-3 border rounded-md min-h-[150px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading || !editedComment.trim()}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
