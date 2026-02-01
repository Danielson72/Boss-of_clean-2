'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  X, GripVertical, Trash2, Edit2, Save, ArrowLeftRight,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'components/portfolio/GalleryGrid.tsx' });

export interface PortfolioPhoto {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  pair_id?: string;
  photo_type: 'single' | 'before' | 'after';
  display_order: number;
}

interface GalleryGridProps {
  photos: PortfolioPhoto[];
  editable?: boolean;
  onReorder?: (photos: PortfolioPhoto[]) => void;
  onDelete?: (photoId: string) => Promise<void>;
  onUpdateCaption?: (photoId: string, caption: string) => Promise<void>;
  onCreatePair?: (beforeId: string, afterId: string) => Promise<void>;
  onUnpair?: (photoId: string) => Promise<void>;
}

export function GalleryGrid({
  photos,
  editable = false,
  onReorder,
  onDelete,
  onUpdateCaption,
  onCreatePair,
  onUnpair,
}: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioPhoto | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pairingMode, setPairingMode] = useState<'selecting-before' | 'selecting-after' | null>(null);
  const [selectedBeforeId, setSelectedBeforeId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex === dropIndex || !onReorder) return;

    const newPhotos = [...photos];
    const [removed] = newPhotos.splice(dragIndex, 1);
    newPhotos.splice(dropIndex, 0, removed);

    // Update display_order
    const reorderedPhotos = newPhotos.map((photo, idx) => ({
      ...photo,
      display_order: idx,
    }));

    onReorder(reorderedPhotos);
  };

  const handleDelete = async (photoId: string) => {
    if (!onDelete) return;

    setDeleting(photoId);
    try {
      await onDelete(photoId);
    } catch (err) {
      logger.error('Error deleting photo', { function: 'handleDelete' }, err);
    } finally {
      setDeleting(null);
      setSelectedPhoto(null);
    }
  };

  const handleSaveCaption = async (photoId: string) => {
    if (!onUpdateCaption) return;

    try {
      await onUpdateCaption(photoId, captionText);
      setEditingCaption(null);
    } catch (err) {
      logger.error('Error updating caption', { function: 'handleSaveCaption' }, err);
    }
  };

  const startPairing = () => {
    setPairingMode('selecting-before');
    setSelectedBeforeId(null);
  };

  const cancelPairing = () => {
    setPairingMode(null);
    setSelectedBeforeId(null);
  };

  const handlePhotoClickForPairing = async (photo: PortfolioPhoto) => {
    if (!pairingMode || photo.pair_id) return;

    if (pairingMode === 'selecting-before') {
      setSelectedBeforeId(photo.id);
      setPairingMode('selecting-after');
    } else if (pairingMode === 'selecting-after' && selectedBeforeId && onCreatePair) {
      try {
        await onCreatePair(selectedBeforeId, photo.id);
        cancelPairing();
      } catch (err) {
        logger.error('Error creating pair', { function: 'handlePhotoClickForPairing' }, err);
      }
    }
  };

  const handleUnpair = async (photo: PortfolioPhoto) => {
    if (!onUnpair || !photo.pair_id) return;

    try {
      await onUnpair(photo.id);
    } catch (err) {
      logger.error('Error unpairing photo', { function: 'handleUnpair' }, err);
    }
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

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-gray-400 mb-4">
          <Image
            src="/placeholder-gallery.svg"
            alt="No photos"
            width={64}
            height={64}
            className="mx-auto opacity-50"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">No portfolio photos yet</h3>
        <p className="text-sm text-gray-500">
          {editable
            ? 'Upload photos to showcase your cleaning work'
            : 'This cleaner has not added any portfolio photos yet'}
        </p>
      </div>
    );
  }

  const { pairs, singles } = groupedPhotos();

  return (
    <div className="space-y-6">
      {/* Pairing Mode Banner */}
      {pairingMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-blue-900">
              {pairingMode === 'selecting-before'
                ? 'Select a "Before" photo'
                : 'Now select the "After" photo'}
            </p>
            <p className="text-sm text-blue-700">
              Click on photos to create a before/after pair
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cancelPairing}>
            Cancel
          </Button>
        </div>
      )}

      {/* Editable Actions */}
      {editable && !pairingMode && onCreatePair && singles.length >= 2 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={startPairing}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Create Before/After Pair
          </Button>
        </div>
      )}

      {/* Before/After Pairs */}
      {pairs.size > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Before & After</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from(pairs.entries()).map(([pairId, pairPhotos]) => {
              const beforePhoto = pairPhotos.find((p) => p.photo_type === 'before');
              const afterPhoto = pairPhotos.find((p) => p.photo_type === 'after');

              if (!beforePhoto || !afterPhoto) return null;

              return (
                <div
                  key={pairId}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden"
                >
                  <div className="grid grid-cols-2">
                    <div className="relative">
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
                        Before
                      </div>
                      <Image
                        src={beforePhoto.thumbnail_url || beforePhoto.image_url}
                        alt="Before"
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => openLightbox(photos.findIndex((p) => p.id === beforePhoto.id))}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded z-10">
                        After
                      </div>
                      <Image
                        src={afterPhoto.thumbnail_url || afterPhoto.image_url}
                        alt="After"
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => openLightbox(photos.findIndex((p) => p.id === afterPhoto.id))}
                      />
                    </div>
                  </div>
                  {(beforePhoto.caption || afterPhoto.caption) && (
                    <div className="p-3 border-t bg-gray-50">
                      <p className="text-sm text-gray-600">
                        {beforePhoto.caption || afterPhoto.caption}
                      </p>
                    </div>
                  )}
                  {editable && onUnpair && (
                    <div className="p-2 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnpair(beforePhoto)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Unpair
                      </Button>
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
            <h3 className="font-semibold text-gray-900">Gallery</h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {singles.map((photo, index) => (
              <div
                key={photo.id}
                draggable={editable && !pairingMode}
                onDragStart={(e) => handleDragStart(e, photos.indexOf(photo))}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, photos.indexOf(photo))}
                onClick={() => pairingMode ? handlePhotoClickForPairing(photo) : null}
                className={`
                  relative group aspect-square rounded-lg overflow-hidden
                  ${editable && !pairingMode ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${pairingMode && !photo.pair_id ? 'cursor-pointer ring-2 ring-blue-400 ring-offset-2' : ''}
                  ${pairingMode && selectedBeforeId === photo.id ? 'ring-4 ring-green-500 ring-offset-2' : ''}
                `}
              >
                <Image
                  src={photo.thumbnail_url || photo.image_url}
                  alt={photo.caption || `Portfolio photo ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-cover"
                  onClick={() => !pairingMode && openLightbox(photos.indexOf(photo))}
                />

                {/* Drag Handle (Editable Mode) */}
                {editable && !pairingMode && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}

                {/* Action Buttons (Editable Mode) */}
                {editable && !pairingMode && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCaption(photo.id);
                        setCaptionText(photo.caption || '');
                      }}
                      className="bg-black/50 text-white rounded p-1 hover:bg-black/70"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(photo);
                      }}
                      className="bg-red-600/80 text-white rounded p-1 hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Caption Overlay */}
                {photo.caption && !pairingMode && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="mt-4">
              <Image
                src={selectedPhoto.thumbnail_url || selectedPhoto.image_url}
                alt="Photo to delete"
                width={200}
                height={150}
                className="rounded-lg mx-auto object-cover"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPhoto && handleDelete(selectedPhoto.id)}
              disabled={deleting === selectedPhoto?.id}
            >
              {deleting === selectedPhoto?.id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Caption Edit Dialog */}
      <Dialog open={!!editingCaption} onOpenChange={() => setEditingCaption(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
            <DialogDescription>
              Add a caption to describe this photo.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="e.g., Deep cleaning kitchen - marble countertops"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {captionText.length}/200 characters
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditingCaption(null)}>
              Cancel
            </Button>
            <Button onClick={() => editingCaption && handleSaveCaption(editingCaption)}>
              <Save className="h-4 w-4 mr-2" />
              Save Caption
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo Viewer</DialogTitle>
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
    </div>
  );
}
