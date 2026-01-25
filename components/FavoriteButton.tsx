'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface FavoriteButtonProps {
  cleanerId: string;
  initialFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  className?: string;
}

export function FavoriteButton({
  cleanerId,
  initialFavorited = false,
  size = 'md',
  showCount = false,
  count = 0,
  className = '',
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(count);
  const supabase = createClient();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const buttonSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  useEffect(() => {
    if (user) {
      checkFavoriteStatus();
    }
  }, [user, cleanerId]);

  const checkFavoriteStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('customer_favorites')
      .select('id')
      .eq('customer_id', user.id)
      .eq('cleaner_id', cleanerId)
      .single();

    setIsFavorited(!!data);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    setLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('customer_favorites')
          .delete()
          .eq('customer_id', user.id)
          .eq('cleaner_id', cleanerId);

        if (!error) {
          setIsFavorited(false);
          setFavoriteCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Add to favorites
        const { error } = await supabase.from('customer_favorites').insert({
          customer_id: user.id,
          cleaner_id: cleanerId,
        });

        if (!error) {
          setIsFavorited(true);
          setFavoriteCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`
        ${buttonSizes[size]}
        rounded-full
        transition-all
        duration-200
        ${isFavorited
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
        }
        disabled:opacity-50
        disabled:cursor-not-allowed
        flex items-center gap-1
        ${className}
      `}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`
          ${sizeClasses[size]}
          ${isFavorited ? 'fill-current' : ''}
          ${loading ? 'animate-pulse' : ''}
        `}
      />
      {showCount && favoriteCount > 0 && (
        <span className="text-xs font-medium">{favoriteCount}</span>
      )}
    </button>
  );
}
