"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const resetSuccess = searchParams.get("reset");
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-lg font-semibold text-white">Sign In</h1>
            <Badge variant="premium">ADMIN</Badge>
          </div>
          <p className="text-sm text-gray-500">
            Authorized access only. Sign in to continue.
          </p>
        </CardHeader>
        <CardContent>
          {resetSuccess === "success" && (
            <div className="mb-4 rounded-lg border border-green-800 bg-green-900/20 p-3 text-sm text-green-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Password updated successfully. Sign in with your new password.</span>
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

            <div>
              <label htmlFor="password" className="block text-sm text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
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

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>

            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <Link
              href="/"
              className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-sm px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3 mx-auto" />
          <div className="h-64 bg-gray-800 rounded-xl" />
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
