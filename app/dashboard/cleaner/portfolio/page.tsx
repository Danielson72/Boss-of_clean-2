'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Image as ImageIcon, Info, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { PhotoUploader } from '@/components/portfolio/PhotoUploader';
import { GalleryGrid, PortfolioPhoto } from '@/components/portfolio/GalleryGrid';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/portfolio/page.tsx' });

const MAX_PHOTOS = 20;

export default function CleanerPortfolioPage() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  const loadPortfolio = useCallback(async () => {
    if (!user) return;

    try {
      // Get cleaner ID
      const { data: cleaner, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cleanerError || !cleaner) {
        logger.error('Error loading cleaner profile', { function: 'loadPortfolio' }, cleanerError);
        setMessage({ type: 'error', text: 'Could not load cleaner profile' });
        setLoading(false);
        return;
      }

      setCleanerId(cleaner.id);

      // Get portfolio photos
      const { data: portfolioPhotos, error: photosError } = await supabase
        .from('portfolio_photos')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('display_order', { ascending: true });

      if (photosError) {
        logger.error('Error loading portfolio photos', { function: 'loadPortfolio' }, photosError);
        setMessage({ type: 'error', text: 'Could not load portfolio photos' });
      } else {
        setPhotos(portfolioPhotos || []);
      }
    } catch (error) {
      logger.error('Error in loadPortfolio', { function: 'loadPortfolio' }, error);
      setMessage({ type: 'error', text: 'An error occurred loading your portfolio' });
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleUpload = async (files: File[]) => {
    if (!cleanerId) return;

    // Create form data for upload
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Upload files to storage
    const uploadResponse = await fetch('/api/cleaner/portfolio/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const uploadResult = await uploadResponse.json();
    const { urls } = uploadResult as { urls: string[] };

    if (!urls || urls.length === 0) {
      throw new Error('No files were uploaded');
    }

    // Save photo records to database
    const saveResponse = await fetch('/api/cleaner/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photos: urls.map((url) => ({ image_url: url })),
      }),
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json();
      throw new Error(errorData.error || 'Failed to save photos');
    }

    setMessage({ type: 'success', text: `${urls.length} photo(s) uploaded successfully!` });
    setTimeout(() => setMessage(null), 3000);

    // Reload portfolio
    await loadPortfolio();
  };

  const handleReorder = async (reorderedPhotos: PortfolioPhoto[]) => {
    // Optimistically update UI
    setPhotos(reorderedPhotos);

    // Save to server
    const response = await fetch('/api/cleaner/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        photos: reorderedPhotos.map((p) => ({ id: p.id, display_order: p.display_order })),
      }),
    });

    if (!response.ok) {
      // Revert on error
      await loadPortfolio();
      setMessage({ type: 'error', text: 'Failed to reorder photos' });
    }
  };

  const handleDelete = async (photoId: string) => {
    const response = await fetch(`/api/cleaner/portfolio?id=${photoId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete photo');
    }

    setMessage({ type: 'success', text: 'Photo deleted successfully' });
    setTimeout(() => setMessage(null), 3000);

    // Update local state
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleUpdateCaption = async (photoId: string, caption: string) => {
    const response = await fetch('/api/cleaner/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'caption',
        photoId,
        caption,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update caption');
    }

    // Update local state
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
    );

    setMessage({ type: 'success', text: 'Caption updated' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleCreatePair = async (beforeId: string, afterId: string) => {
    const response = await fetch('/api/cleaner/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pair',
        beforeId,
        afterId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create pair');
    }

    const result = await response.json();
    const { pairId } = result as { pairId: string };

    // Update local state
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === beforeId) {
          return { ...p, pair_id: pairId, photo_type: 'before' as const };
        }
        if (p.id === afterId) {
          return { ...p, pair_id: pairId, photo_type: 'after' as const };
        }
        return p;
      })
    );

    setMessage({ type: 'success', text: 'Before/After pair created!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUnpair = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo?.pair_id) return;

    const response = await fetch('/api/cleaner/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unpair',
        photoId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to unpair photos');
    }

    // Update local state - unpair both photos with the same pair_id
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.pair_id === photo.pair_id) {
          return { ...p, pair_id: undefined, photo_type: 'single' as const };
        }
        return p;
      })
    );

    setMessage({ type: 'success', text: 'Photos unpaired' });
    setTimeout(() => setMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/cleaner"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Portfolio Gallery
                  </h1>
                  <p className="text-sm text-gray-600">
                    Showcase your work with before/after photos
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{photos.length}</span> / {MAX_PHOTOS} photos
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-md flex items-center gap-2 ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {message.type === 'error' ? (
                <X className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Portfolio Tips</h3>
                <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>Upload high-quality photos that showcase your best cleaning work</li>
                  <li>Create before/after pairs to demonstrate transformations</li>
                  <li>Add captions to describe the type of cleaning or location</li>
                  <li>Drag photos to reorder them - first photos appear first on your profile</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Upload Photos
            </h2>
            <PhotoUploader
              onUpload={handleUpload}
              disabled={photos.length >= MAX_PHOTOS}
              maxPhotos={MAX_PHOTOS}
              currentPhotoCount={photos.length}
            />
          </div>

          {/* Gallery Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Portfolio ({photos.length} photos)
            </h2>
            <GalleryGrid
              photos={photos}
              editable
              onReorder={handleReorder}
              onDelete={handleDelete}
              onUpdateCaption={handleUpdateCaption}
              onCreatePair={handleCreatePair}
              onUnpair={handleUnpair}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
