import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
  ensureProfileRowMock: vi.fn(),
  cookieDeleteMock: vi.fn(),
  signOutMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  selectSingleMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({ redirect: mocks.redirectMock }))
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ delete: mocks.cookieDeleteMock })) }))
vi.mock("@/lib/db/profiles", () => ({ ensureProfileRow: mocks.ensureProfileRowMock }))
vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: mocks.signOutMock,
      signInWithPassword: mocks.signInWithPasswordMock,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mocks.selectSingleMock })),
      })),
    })),
  })),
}))

import { signIn, signOut } from "@/actions/auth"

describe("auth actions integration invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOutMock.mockResolvedValue({})
    mocks.signInWithPasswordMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    mocks.selectSingleMock.mockResolvedValue({ data: { onboarding_completed: true } })
  })

  it("signOut clears onboarding cookie and redirects to login", async () => {
    await expect(signOut()).rejects.toThrow("REDIRECT:/auth/login")
    expect(mocks.signOutMock).toHaveBeenCalledTimes(1)
    expect(mocks.cookieDeleteMock).toHaveBeenCalledWith("onboarding_completed")
  })

  it("signIn sanitizes external redirect targets", async () => {
    const form = new FormData()
    form.set("email", "user@example.com")
    form.set("password", "password123")
    form.set("redirect", "https://evil.com")

    await expect(signIn(form)).rejects.toThrow("REDIRECT:/dashboard")
    expect(mocks.ensureProfileRowMock).toHaveBeenCalledWith("user-1")
  })
})
