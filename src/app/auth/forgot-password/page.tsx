'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

function ForgotPasswordForm() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
            <h2 className="text-lg font-semibold text-white">Check your email</h2>
            <p className="text-sm text-gray-400">
              If an account exists for <strong className="text-gray-300">{email}</strong>, we&apos;ve sent a password reset link.
            </p>
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-400 transition-colors pt-4"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
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
            <h1 className="text-lg font-semibold text-white">Reset Password</h1>
            <Badge variant="premium">SECURE</Badge>
          </div>
          <p className="text-sm text-gray-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </CardHeader>
        <CardContent>
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
              <label htmlFor="email" className="block text-sm text-gray-400 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#0052FF] focus:outline-none"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Reset Link
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3 mx-auto" />
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
