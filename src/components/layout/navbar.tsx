'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[oklch(0.85_0.012_75/0.5)] bg-[oklch(0.94_0.012_75/0.8)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-[oklch(0.22_0.025_260)]">VAR</span>
              <span className="text-2xl font-bold text-[oklch(0.45_0.18_265)]">view</span>
              <span className="rounded-full bg-[oklch(0.45_0.18_265/0.12)] px-1.5 py-0.5 text-[8px] font-bold text-[oklch(0.45_0.18_265)] tracking-widest">
                .CLUB
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/shuxincode/varview-club"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[oklch(0.55_0.018_70)] hover:text-[oklch(0.22_0.025_260)] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
