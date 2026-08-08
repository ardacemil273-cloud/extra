'use client';
import React from 'react';
import Link from 'next/link';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, State> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-black mb-2">Bir şeyler ters gitti</h1>
            <p className="text-gray-400 text-sm mb-2 font-mono bg-white/5 rounded-xl p-3">
              {this.state.error?.message || 'Bilinmeyen hata'}
            </p>
            <p className="text-gray-500 text-sm mb-6">Sayfayı yenileyerek tekrar dene.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 text-sm">
                🔄 Yenile
              </button>
              <Link href="/dashboard" className="px-5 py-2.5 rounded-xl font-bold border border-white/10 bg-white/5 text-sm">
                🏠 Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-red-300 text-sm mb-4">{message || 'Bir hata oluştu'}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all">
          Tekrar Dene
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📭', title, desc, action }: {
  icon?: string; title: string; desc?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12 rounded-2xl border border-white/5 bg-white/2">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-300 mb-1">{title}</p>
      {desc && <p className="text-gray-600 text-sm mb-4">{desc}</p>}
      {action && (
        <button onClick={action.onClick} className="px-5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-600/30 transition-all">
          {action.label}
        </button>
      )}
    </div>
  );
}
