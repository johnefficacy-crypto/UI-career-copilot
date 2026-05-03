import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "@/lib/auth/safe-redirect"

describe("safeRedirectPath", () => {
  it("allows safe internal paths", () => {
    expect(safeRedirectPath("/dashboard/notifications")).toBe("/dashboard/notifications")
  })
  it("rejects external and protocol-relative redirects", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard")
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard")
  })
})
