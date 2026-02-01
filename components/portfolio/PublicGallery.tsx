'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

export interface PortfolioPhoto {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  pair_id?: string;
  photo_type: 'single' | 'before' | 'after';
  display_order: number;
}

interface PublicGalleryProps {
  photos: PortfolioPhoto[];
  businessName?: string;
}

export function PublicGallery({ photos, businessName }: PublicGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
  }

  // Group photos into singles and pairs
  const groupedPhotos = () => {
    const pairs: Map<string, PortfolioPhoto[]> = new Map();
    const singles: PortfolioPhoto[] = [];

    photos.forEach((photo) => {
      if (photo.pair_id) {
        const existing = pairs.get(photo.pair_id) || [];
        pairs.set(photo.pair_id, [...existing, photo]);
      } else if (photo.photo_type === 'single') {
        singles.push(photo);
      }
    });

    return { pairs, singles };
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;

    const newIndex = direction === 'prev'
      ? (lightboxIndex - 1 + photos.length) % photos.length
      : (lightboxIndex + 1) % photos.length;

    setLightboxIndex(newIndex);
  };

  const { pairs, singles } = groupedPhotos();

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Camera className="h-5 w-5 text-gray-600" />
        Portfolio Gallery
      </h2>

      <div className="space-y-6">
        {/* Before/After Pairs */}
        {pairs.size > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wider">
              Before & After
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {Array.from(pairs.entries()).map(([pairId, pairPhotos]) => {
                const beforePhoto = pairPhotos.find((p) => p.photo_type === 'before');
                const afterPhoto = pairPhotos.find((p) => p.photo_type === 'after');

                if (!beforePhoto || !afterPhoto) return null;

                return (
                  <div
                    key={pairId}
                    className="rounded-lg overflow-hidden border bg-gray-50"
                  >
                    <div className="grid grid-cols-2">
                      <div className="relative">
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
                          Before
                        </div>
                        <Image
                          src={beforePhoto.thumbnail_url || beforePhoto.image_url}
                          alt={`Before - ${beforePhoto.caption || 'Cleaning work'}`}
                          width={400}
                          height={300}
                          className="w-full h-48 sm:h-56 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => openLightbox(photos.findIndex((p) => p.id === beforePhoto.id))}
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded z-10">
                          After
                        </div>
                        <Image
                          src={afterPhoto.thumbnail_url || afterPhoto.image_url}
                          alt={`After - ${afterPhoto.caption || 'Cleaning work'}`}
                          width={400}
                          height={300}
                          className="w-full h-48 sm:h-56 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => openLightbox(photos.findIndex((p) => p.id === afterPhoto.id))}
                        />
                      </div>
                    </div>
                    {(beforePhoto.caption || afterPhoto.caption) && (
                      <div className="p-3 border-t">
                        <p className="text-sm text-gray-600">
                          {beforePhoto.caption || afterPhoto.caption}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Single Photos Grid */}
        {singles.length > 0 && (
          <div className="space-y-4">
            {pairs.size > 0 && (
              <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wider">
                More Photos
              </h3>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {singles.slice(0, 9).map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => openLightbox(photos.indexOf(photo))}
                >
                  <Image
                    src={photo.thumbnail_url || photo.image_url}
                    alt={photo.caption || 'Portfolio photo'}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
              {singles.length > 9 && (
                <div
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center"
                  onClick={() => openLightbox(photos.indexOf(singles[9]))}
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">+{singles.length - 9}</p>
                    <p className="text-sm text-gray-500">more photos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{businessName || 'Portfolio'} Photo</DialogTitle>
            <DialogDescription>View portfolio photo in full size</DialogDescription>
          </DialogHeader>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div className="relative">
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
              >
                <X className="h-6 w-6" />
              </button>

              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => navigateLightbox('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => navigateLightbox('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <div className="relative aspect-video max-h-[80vh]">
                <Image
                  src={photos[lightboxIndex].image_url}
                  alt={photos[lightboxIndex].caption || 'Portfolio photo'}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>

              {photos[lightboxIndex].caption && (
                <div className="p-4 text-center">
                  <p className="text-white">{photos[lightboxIndex].caption}</p>
                </div>
              )}

              <div className="p-2 text-center text-gray-400 text-sm">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
