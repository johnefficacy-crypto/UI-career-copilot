import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const exchangeMock = vi.fn()
const getUserMock = vi.fn()
const maybeSingleMock = vi.fn()
const insertMock = vi.fn()
const cookieSetMock = vi.fn()

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ set: cookieSetMock })) }))
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchangeMock, getUser: getUserMock },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })) })),
      insert: insertMock,
    })),
  })),
}))

import { GET } from "./route"

describe("auth callback integration invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exchangeMock.mockResolvedValue({ error: null })
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1", user_metadata: { full_name: "Test User" } } } })
    maybeSingleMock.mockResolvedValue({ data: { onboarding_completed: true, full_name: "Test User" } })
    insertMock.mockResolvedValue({})
  })

  it("sanitizes external next redirect targets", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?code=abc&next=https://evil.com")
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard")
  })

  it("creates profile row for first oauth login", async () => {
    maybeSingleMock.mockResolvedValue({ data: null })
    const req = new NextRequest("http://localhost:3000/auth/callback?code=abc")
    const res = await GET(req)
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(res.headers.get("location")).toBe("http://localhost:3000/onboarding")
  })
})
