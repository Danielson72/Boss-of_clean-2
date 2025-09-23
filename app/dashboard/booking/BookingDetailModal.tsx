'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Star,
  User,
  MessageCircle,
  RefreshCw,
  Camera,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Booking {
  id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  status: 'completed' | 'cancelled' | 'in_progress' | 'scheduled';
  total_amount: number;
  cleaner_name?: string;
  photos_before?: string[];
  photos_after?: string[];
  rating?: number;
  notes?: string;
}

interface BookingDetailModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  userTier: 'free' | 'growth' | 'pro' | 'enterprise';
}

const statusConfig = {
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
  scheduled: { color: 'bg-yellow-100 text-yellow-800', label: 'Scheduled' }
};

const tierCanRebook = {
  free: false,
  growth: true,
  pro: true,
  enterprise: true
};

export function BookingDetailModal({
  booking,
  isOpen,
  onClose,
  userTier
}: BookingDetailModalProps) {
  const [activePhotoSet, setActivePhotoSet] = useState<'before' | 'after'>('before');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const canRebook = tierCanRebook[userTier];
  const hasPhotos = (booking.photos_before?.length || 0) > 0 || (booking.photos_after?.length || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🐱</span>
              </div>
              Booking Details
            </DialogTitle>
            <Badge
              className={cn(
                statusConfig[booking.status].color,
                "text-xs font-medium px-2 py-1"
              )}
            >
              {statusConfig[booking.status].label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{booking.service_type}</h3>
                <p className="text-sm text-gray-600">Booking ID: {booking.id}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{formatDate(booking.scheduled_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{booking.scheduled_time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{booking.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{formatCurrency(booking.total_amount)}</span>
                </div>
                {booking.cleaner_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{booking.cleaner_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photos Section */}
          {hasPhotos && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Before & After Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Photo Set Tabs */}
                  <div className="flex gap-2">
                    {booking.photos_before && booking.photos_before.length > 0 && (
                      <Button
                        variant={activePhotoSet === 'before' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivePhotoSet('before')}
                      >
                        Before ({booking.photos_before.length})
                      </Button>
                    )}
                    {booking.photos_after && booking.photos_after.length > 0 && (
                      <Button
                        variant={activePhotoSet === 'after' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivePhotoSet('after')}
                      >
                        After ({booking.photos_after.length})
                      </Button>
                    )}
                  </div>

                  {/* Photo Carousel */}
                  <div className="relative">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {(activePhotoSet === 'before' ? booking.photos_before : booking.photos_after)?.map((photo, index) => (
                          <CarouselItem key={index}>
                            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                              <Image
                                src={photo}
                                alt={`${activePhotoSet} photo ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating & Notes */}
          {(booking.rating || booking.notes) && (
            <Card>
              <CardContent className="pt-6">
                {booking.rating && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Your Rating
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-lg",
                              i < booking.rating! ? "text-yellow-400" : "text-gray-300"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {booking.rating}/5 stars
                      </span>
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {booking.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {/* Handle contact */}}
            >
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </Button>

            {canRebook ? (
              <Button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {/* Handle rebook */}}
              >
                <RefreshCw className="w-4 h-4" />
                Book Again
              </Button>
            ) : (
              <div className="text-center">
                <Button disabled className="w-full mb-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Book Again
                </Button>
                <p className="text-xs text-gray-500">
                  Upgrade to Growth tier to rebook services
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}