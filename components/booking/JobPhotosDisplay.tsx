'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface JobPhotosDisplayProps {
  bookingId: string;
}

export function JobPhotosDisplay({ bookingId }: JobPhotosDisplayProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/photos`);
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading photos...
      </div>
    );
  }

  if (photos.length === 0) return null;

  const beforePhotos = photos.filter((p) => p.photo_type === 'before');
  const afterPhotos = photos.filter((p) => p.photo_type === 'after');

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Camera className="h-4 w-4" />
        Job Photos
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before photos */}
        {beforePhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Before
            </p>
            <div className="grid grid-cols-3 gap-2">
              {beforePhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo.photo_url)}
                  className="aspect-square rounded-md overflow-hidden border border-gray-200 hover:border-blue-400 transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo_url}
                    alt="Before cleaning"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* After photos */}
        {afterPhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              After
            </p>
            <div className="grid grid-cols-3 gap-2">
              {afterPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo.photo_url)}
                  className="aspect-square rounded-md overflow-hidden border border-gray-200 hover:border-blue-400 transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photo_url}
                    alt="After cleaning"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPhoto}
            alt="Job photo"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
