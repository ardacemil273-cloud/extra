import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'PartyVerse - Sosyal Parti Oyun Platformu', template: '%s | PartyVerse' },
  description: 'Arkadaşlarınla gerçek zamanlı sosyal parti oyunları oyna. Vampir Köylü ve daha fazlası!',
  keywords: ['parti oyunu', 'vampir köylü', 'online oyun', 'sosyal oyun', 'mafia'],
  authors: [{ name: 'PartyVerse Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://partyverse.vercel.app'),
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    title: 'PartyVerse - Sosyal Parti Oyun Platformu',
    description: 'Arkadaşlarınla gerçek zamanlı sosyal parti oyunları oyna!',
    siteName: 'PartyVerse',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen" style={{ backgroundColor: '#080b14', color: 'white' }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#161b22',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: '12px',
              fontSize: '14px',
              backdropFilter: 'blur(20px)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#161b22' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#161b22' },
            },
          }}
        />
      </body>
    </html>
  );
}
