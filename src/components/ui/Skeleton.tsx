'use client';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/2 p-4 text-center space-y-2">
      <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
      <Skeleton className="h-3 w-20 mx-auto" />
      <Skeleton className="h-2 w-12 mx-auto" />
    </div>
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/2">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-48" />
      </div>
      <Skeleton className="w-14 h-7 rounded-lg" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
      <div className="flex gap-5">
        <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <ProfileSkeleton />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="space-y-2">
        {[1,2,3].map(i => <RoomCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function FullPageLoader({ text = 'Yükleniyor...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-[#080b14] flex flex-col items-center justify-center z-50 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-fuchsia-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
      </div>
      <p className="text-gray-400 text-sm animate-pulse">{text}</p>
    </div>
  );
}

export function InlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <div className={`${s} rounded-full border-2 border-transparent border-t-purple-500 animate-spin`} />
  );
}
