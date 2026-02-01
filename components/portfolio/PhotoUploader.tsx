'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'components/portfolio/PhotoUploader.tsx' });

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
  maxPhotos?: number;
  currentPhotoCount?: number;
}

export function PhotoUploader({
  onUpload,
  disabled = false,
  maxPhotos = 20,
  currentPhotoCount = 0,
}: PhotoUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxPhotos - currentPhotoCount;

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not compress image'));
              return;
            }

            // If still over 1MB, reduce quality further
            if (blob.size > MAX_FILE_SIZE) {
              canvas.toBlob(
                (smallerBlob) => {
                  if (!smallerBlob) {
                    reject(new Error('Could not compress image'));
                    return;
                  }
                  resolve(
                    new File([smallerBlob], file.name, {
                      type: 'image/jpeg',
                    })
                  );
                },
                'image/jpeg',
                0.7
              );
            } else {
              resolve(
                new File([blob], file.name, {
                  type: 'image/jpeg',
                })
              );
            }
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Accepted types: JPEG, PNG, WebP`;
    }
    return null;
  };

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    const validFiles: { file: File; preview: string }[] = [];

    const slotsToUse = Math.min(fileArray.length, remainingSlots - previewFiles.length);
    if (slotsToUse <= 0) {
      setError(`Maximum ${maxPhotos} photos allowed. You have ${currentPhotoCount} photos.`);
      return;
    }

    for (let i = 0; i < slotsToUse; i++) {
      const file = fileArray[i];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        continue;
      }

      try {
        // Compress image if needed
        let processedFile = file;
        if (file.size > MAX_FILE_SIZE) {
          processedFile = await compressImage(file);
        }

        const preview = URL.createObjectURL(processedFile);
        validFiles.push({ file: processedFile, preview });
      } catch (err) {
        logger.error('Error processing file', { function: 'processFiles' }, err);
        setError(`Error processing ${file.name}`);
      }
    }

    if (validFiles.length > 0) {
      setPreviewFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await processFiles(files);
      }
    },
    // processFiles is intentionally not included to avoid stale closure issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, remainingSlots, previewFiles.length]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePreview = (index: number) => {
    setPreviewFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (previewFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(previewFiles.map((p) => p.file));
      // Clean up previews
      previewFiles.forEach((p) => URL.revokeObjectURL(p.preview));
      setPreviewFiles([]);
    } catch (err) {
      logger.error('Error uploading files', { function: 'handleUpload' }, err);
      setError('Failed to upload photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearAll = () => {
    previewFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPreviewFiles([]);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drag & drop photos here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <p className="text-xs text-gray-400">
          JPEG, PNG, or WebP. Max 1MB per image (auto-compressed).
          <br />
          {remainingSlots > 0 ? (
            `You can add ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''}`
          ) : (
            'Maximum photos reached'
          )}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Preview Grid */}
      {previewFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Ready to upload ({previewFiles.length} photo{previewFiles.length !== 1 ? 's' : ''})
            </h4>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {previewFiles.map((item, index) => (
              <div key={index} className="relative group aspect-square">
                {/* Using img for blob URL previews as Next/Image doesn't support blob URLs */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removePreview(index)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={clearAll} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {previewFiles.length} Photo{previewFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
