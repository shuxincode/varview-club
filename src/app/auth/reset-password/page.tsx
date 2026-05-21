'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword } = useAuth();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(!!user);
    });
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => router.push('/auth/signin?reset=success'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === false) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto" />
            <h2 className="text-lg font-semibold text-white">Invalid or expired link</h2>
            <p className="text-sm text-gray-400">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link href="/auth/forgot-password">
              <Button>Request New Link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasSession === null) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <Card>
          <CardContent className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-1">
          <span className="text-2xl font-bold text-gray-900">VAR</span>
          <span className="text-2xl font-bold text-[#0052FF]">view</span>
          <Badge variant="default" className="text-[8px]">.CLUB</Badge>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">Set New Password</h1>
            <Badge variant="premium">SECURE</Badge>
          </div>
          <p className="text-sm text-gray-500">Choose a new password for your account.</p>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 rounded-lg border border-green-800 bg-green-900/20 p-3 text-sm text-green-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Password reset successfully. Redirecting to sign in...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm text-gray-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:border-[#0052FF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm text-gray-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#0052FF] focus:outline-none"
              />
            </div>

            <Button type="submit" disabled={loading || success} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Reset Password
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3 mx-auto" />
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
