'use client';

import { useState } from 'react';
import { Loader2, Send, X, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewResponseFormProps {
  reviewId: string;
  existingResponse?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const MAX_RESPONSE_LENGTH = 500;

export function ReviewResponseForm({
  reviewId,
  existingResponse,
  onSuccess,
  onCancel,
}: ReviewResponseFormProps) {
  const [response, setResponse] = useState(existingResponse || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!existingResponse;
  const responseLength = response.trim().length;
  const isValid = responseLength > 0 && responseLength <= MAX_RESPONSE_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please enter a response (max 500 characters).');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/cleaner/reviews/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          response: response.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit response.');
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor={`response-${reviewId}`}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {isEditing ? 'Edit your response' : 'Write your response'}
        </label>
        <textarea
          id={`response-${reviewId}`}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Thank the customer for their feedback or address any concerns..."
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
          maxLength={MAX_RESPONSE_LENGTH}
        />
        <div className="flex justify-end mt-1">
          <p
            className={cn(
              'text-xs',
              responseLength > MAX_RESPONSE_LENGTH ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {responseLength}/{MAX_RESPONSE_LENGTH}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !isValid}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white text-sm transition',
            submitting || !isValid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {isEditing ? <Edit2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {isEditing ? 'Update Response' : 'Submit Response'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
