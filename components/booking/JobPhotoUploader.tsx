'use client';

import { useState, useRef } from 'react';
import { Upload, X, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface JobPhotoUploaderProps {
  bookingId: string;
  photoType: 'before' | 'after';
  onUploadComplete?: (urls: string[]) => void;
  disabled?: boolean;
}

export function JobPhotoUploader({
  bookingId,
  photoType,
  onUploadComplete,
  disabled = false,
}: JobPhotoUploaderProps) {
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);
    const validFiles: { file: File; preview: string }[] = [];

    for (const file of fileArray.slice(0, 10)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`${file.name}: Invalid type. Use JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: Too large. Max 2MB per image.`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      validFiles.push({ file, preview });
    }

    if (validFiles.length > 0) {
      setPreviewFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removePreview = (index: number) => {
    setPreviewFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleUpload = async () => {
    if (previewFiles.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('type', photoType);
      previewFiles.forEach((p) => formData.append('files', p.file));

      const res = await fetch(`/api/bookings/${bookingId}/photos`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccessCount(data.uploadedCount);
      previewFiles.forEach((p) => URL.revokeObjectURL(p.preview));
      setPreviewFiles([]);
      onUploadComplete?.(data.photos?.map((p: { url: string }) => p.url) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const label = photoType === 'before' ? 'Before' : 'After';

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Camera className="h-4 w-4" />
        {label} Photos
      </h4>

      {successCount > 0 && previewFiles.length === 0 && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
          {successCount} {label.toLowerCase()} photo{successCount !== 1 ? 's' : ''} uploaded successfully!
        </div>
      )}

      {/* Drop zone / file picker */}
      <div
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'}
          border-gray-300`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-600">
          Add {label.toLowerCase()} photos
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, WebP. Max 2MB per image. Up to 10 photos.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Preview grid */}
      {previewFiles.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previewFiles.map((item, index) => (
              <div key={index} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={`${label} preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreview(index);
                  }}
                  disabled={isUploading}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                previewFiles.forEach((p) => URL.revokeObjectURL(p.preview));
                setPreviewFiles([]);
              }}
              disabled={isUploading}
            >
              Clear
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload {previewFiles.length} {label} Photo{previewFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
