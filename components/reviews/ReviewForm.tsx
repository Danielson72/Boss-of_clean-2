'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  bookingId: string;
  cleanerName: string;
  onSuccess: () => void;
}

export function ReviewForm({ bookingId, cleanerName, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const commentLength = comment.trim().length;
  const isCommentValid = commentLength >= 50 && commentLength <= 500;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 3 - photos.length);
    const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));

    setPhotos((prev) => [...prev, ...newPhotos]);
    setPhotoPreviewUrls((prev) => [...prev, ...newPreviews]);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    if (!isCommentValid) {
      setError('Feedback must be between 50 and 500 characters.');
      return;
    }

    setSubmitting(true);

    try {
      // Upload photos first if any
      const uploadedPhotoUrls: string[] = [];
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('bookingId', bookingId);

        const uploadRes = await fetch('/api/reviews/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          uploadedPhotoUrls.push(url);
        }
      }

      const res = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          rating,
          comment: comment.trim(),
          photos: uploadedPhotoUrls,
          ...(qualityRating > 0 && { quality_rating: qualityRating }),
          ...(communicationRating > 0 && { communication_rating: communicationRating }),
          ...(timelinessRating > 0 && { timeliness_rating: timelinessRating }),
          ...(valueRating > 0 && { value_rating: valueRating }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit review.');
        return;
      }

      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How was your experience with {cleanerName}?
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  (hoveredRating || rating) >= star
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-600">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </span>
          )}
        </div>
      </div>

      {/* Sub-Ratings (optional) */}
      {rating > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Rate specific areas (optional)
          </label>
          {[
            { label: 'Quality', value: qualityRating, setter: setQualityRating },
            { label: 'Communication', value: communicationRating, setter: setCommunicationRating },
            { label: 'Timeliness', value: timelinessRating, setter: setTimelinessRating },
            { label: 'Value', value: valueRating, setter: setValueRating },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-28">{label}</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setter(star === value ? 0 : star)}
                    className="p-0.5 transition-transform hover:scale-110"
                    aria-label={`Rate ${label} ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        'h-5 w-5 transition-colors',
                        value >= star
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Written Feedback */}
      <div>
        <label
          htmlFor="review-comment"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Written Feedback
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell others about your experience. What went well? What could be improved?"
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          maxLength={500}
        />
        <div className="flex justify-between mt-1">
          <p
            className={cn(
              'text-xs',
              commentLength < 50 ? 'text-gray-500' : 'text-green-600'
            )}
          >
            {commentLength < 50
              ? `${50 - commentLength} more characters needed`
              : 'Minimum met'}
          </p>
          <p
            className={cn(
              'text-xs',
              commentLength > 500 ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {commentLength}/500
          </p>
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos (optional, up to 3)
        </label>
        <div className="flex flex-wrap gap-3">
          {photoPreviewUrls.map((url, index) => (
            <div key={index} className="relative w-24 h-24">
              <Image
                src={url}
                alt={`Review photo ${index + 1}`}
                fill
                sizes="96px"
                className="object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {photos.length < 3 && (
            <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500 mt-1">Add</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || rating === 0 || !isCommentValid}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium text-white transition',
          submitting || rating === 0 || !isCommentValid
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        )}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </span>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  );
}
