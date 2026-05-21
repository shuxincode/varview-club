import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VARview.club — Predictive Football Analytics',
  description:
    'High-assurance predictive football analytics powered by Dixon-Coles models, Bayesian confidence sampling, and AI agent reasoning.',
  openGraph: {
    title: 'VARview.club',
    description: 'AI-Powered Football Match Analysis',
    siteName: 'VARview.club',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[oklch(0.94_0.012_75)] text-[oklch(0.22_0.025_260)]">
        {/* Animated background */}
        <div className="fixed inset-0 -z-10 overflow-hidden will-change-transform">
          <div
            className="absolute inset-0 animate-slow-zoom bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1920&q=80')",
            }}
          />
          {/* Multi-layer overlay — cream surrounds with subtle reveal in center */}
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.94_0.012_75/0.92)] via-[oklch(0.94_0.012_75/0.4)] to-[oklch(0.94_0.012_75/0.95)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.94_0.012_75/0.85)] via-transparent to-[oklch(0.94_0.012_75/0.85)]" />
        </div>
        <Navbar />
        <main className="flex-1 relative z-0">{children}</main>
      </body>
    </html>
  );
}
