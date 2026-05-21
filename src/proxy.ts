import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://varview.club'];

function addCorsHeaders(response: NextResponse, origin: string) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'null';
  response.headers.set('Access-Control-Allow-Origin', allowed);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Handle CORS preflight for API routes
  if (isApiRoute && request.method === 'OPTIONS') {
    return addCorsHeaders(
      new NextResponse(null, { status: 204 }),
      origin
    );
  }

  // Add CORS headers to API responses
  if (isApiRoute) {
    const response = NextResponse.next({ request });
    return addCorsHeaders(response, origin);
  }

  // Skip auth checks when env vars not set (e.g., during static build)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  const { createServerClient } = await import('@supabase/ssr');

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin-only routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Authenticated-only routes
  if (request.nextUrl.pathname.startsWith('/settings')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/:path*', '/settings'],
};
