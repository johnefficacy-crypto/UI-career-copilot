/**
 * proxy.ts — Next.js 16 edge proxy (previously middleware.ts)
 *
 * CRITICAL: The exported function MUST be named `proxy` (or default export).
 * Next.js 16 renamed both the file (middleware.ts → proxy.ts) AND the
 * required export name (middleware → proxy). Exporting `middleware` silently
 * fails with: "must export a function, either as a default or named 'proxy' export"
 *
 * ─── Three rules ──────────────────────────────────────────────────────────────
 * Rule 1: No valid session           → redirect /auth/login?redirect={pathname}
 * Rule 2: Session + onboarding=false → redirect /onboarding
 * Rule 3: Session + onboarding done  → allow through
 *
 * ─── Public routes (no auth check, no DB call) ────────────────────────────────
 *   /               Landing page
 *   /auth/*         Login, signup, callback, forgot-password
 *   /api/auth/*     Google OAuth initiation + callback
 *   /api/webhooks/* Razorpay webhook — must never be blocked
 *   /api/chat       Streaming chat — auth handled inside route handler
 *   /pricing        Public pricing page
 *   /marketplace/*  Public course catalogue (unauthenticated browse)
 *   /forum/*        Semi-public (reads open, writes guarded in actions)
 *
 * ─── Performance fix ──────────────────────────────────────────────────────────
 * Matcher excludes _next/static, _next/image, and static file extensions so
 * the proxy never runs on JS bundles, CSS, fonts, or images — eliminating the
 * ~4 s per-request overhead seen in the dev server logs.
 */

import { createServerClient } from "@supabase/ssr"
import { NextResponse }        from "next/server"
import type { NextRequest }    from "next/server"

// ─── Route classification ─────────────────────────────────────────────────────

const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/auth/",
  "/api/webhooks/",
  "/api/chat",
  "/pricing",
  "/marketplace",
  "/forum",
]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/")
}

// ─── Named proxy export — required by Next.js 16 ─────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Fast path — public routes skip all Supabase calls
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Build Supabase Edge-compatible client
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write to both request and response so refreshed JWTs propagate
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() also refreshes near-expiry JWT — must run before any redirect
  const { data: { user } } = await supabase.auth.getUser()

  // Rule 1: No session → redirect to login with return path
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Onboarding routes need login (Rule 1 catches that above) but must NOT
  // trigger Rule 2 — checking onboarding_completed on /onboarding itself
  // creates: /onboarding → incomplete → redirect /onboarding → loop.
  if (isOnboardingPath(pathname)) {
    return response
  }

  // Rule 2: Authenticated but onboarding not complete → /onboarding
  // Single indexed PK lookup on warm Supabase connection (~1–3 ms)
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    const url = request.nextUrl.clone()
    url.pathname = "/onboarding"
    url.searchParams.delete("redirect")
    return NextResponse.redirect(url)
  }

  // Rule 3: All checks passed → allow
  return response
}

// ─── Matcher — excludes static files for performance ─────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|woff|woff2|ttf|eot)$).*)",
  ],
}