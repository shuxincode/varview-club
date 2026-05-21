'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/search"
              className="flex items-center gap-1.5 text-sm text-[oklch(0.55_0.018_70)] hover:text-[oklch(0.22_0.025_260)] transition-colors"
            >
              <Search className="h-4 w-4" />
              Search
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 rounded-xl bg-[oklch(0.92_0.01_75)] px-3 py-2 text-sm text-[oklch(0.42_0.02_70)] hover:text-[oklch(0.22_0.025_260)] border border-[oklch(0.85_0.012_75)] transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-20 w-56 rounded-2xl border border-[oklch(0.85_0.012_75)] bg-[oklch(0.97_0.006_75)] shadow-lg py-2">
                      <div className="px-4 py-2.5 border-b border-[oklch(0.85_0.012_75/0.5)]">
                        <p className="text-xs text-[oklch(0.55_0.018_70)]">Signed in as</p>
                        <p className="text-sm font-medium text-[oklch(0.22_0.025_260)] truncate">{user.email}</p>
                      </div>
                      {profile?.is_admin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-[oklch(0.55_0.018_70)] hover:text-[oklch(0.22_0.025_260)] hover:bg-[oklch(0.92_0.01_75)]"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Shield className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[oklch(0.55_0.018_70)] hover:text-[oklch(0.22_0.025_260)] hover:bg-[oklch(0.92_0.01_75)]"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[oklch(0.5_0.18_30)] hover:bg-[oklch(0.92_0.01_75)]"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : loading ? (
              <div className="h-10 w-24 rounded-xl bg-[oklch(0.92_0.01_75)] animate-pulse" />
            ) : (
              <Link href="/auth/signin">
                <Button size="sm">
                  <Zap className="h-4 w-4 mr-1" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[oklch(0.55_0.018_70)] hover:text-[oklch(0.22_0.025_260)]"
          >
            <BarChart3 className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[oklch(0.85_0.012_75/0.5)] py-4 space-y-2">
            <Link
              href="/search"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[oklch(0.55_0.018_70)] hover:text-[oklch(0.22_0.025_260)] rounded-xl hover:bg-[oklch(0.92_0.01_75)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search className="h-4 w-4" />
              Search Fixtures
            </Link>
            {user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[oklch(0.5_0.18_30)] rounded-xl hover:bg-[oklch(0.92_0.01_75)]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
