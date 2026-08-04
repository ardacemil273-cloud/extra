'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

export default function GuestPage() {
  const router = useRouter();
  const { loginAsGuest } = useAuthStore();

  useEffect(() => {
    const go = async () => {
      try {
        await loginAsGuest();
        toast.success('Misafir olarak girildi! 👤');
        router.push('/dashboard');
      } catch {
        toast.error('Misafir girişi başarısız');
        router.push('/login');
      }
    };
    go();
  }, []);

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">👤</div>
        <p className="text-gray-400 text-lg">Misafir hesabı oluşturuluyor...</p>
        <div className="mt-6 flex justify-center">
          <svg className="w-8 h-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
