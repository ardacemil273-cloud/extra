import { Suspense } from 'react';
import AuthCallbackInner from './AuthCallbackInner';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <p className="text-gray-400">Giriş tamamlanıyor...</p>
          <div className="mt-4 flex justify-center">
            <svg className="w-6 h-6 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
