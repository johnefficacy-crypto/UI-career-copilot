import { NextRequest, NextResponse } from "next/server"

/**
 * Backward-compatibility shim.
 * Canonical OAuth entrypoint is /api/auth/google.
 */
export async function GET(request: NextRequest) {
  const { search } = new URL(request.url)
  return NextResponse.redirect(new URL(`/api/auth/google${search}`, request.url))
}
