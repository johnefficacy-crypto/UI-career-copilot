import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import RootLayout from "@/app/layout"

describe("root layout accessibility smoke", () => {
  it("includes keyboard skip link, primary nav label, and main landmark id", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>Test content</div>
      </RootLayout>
    )

    expect(html).toContain('href="#main-content"')
    expect(html).toContain('aria-label="Primary"')
    expect(html).toContain('<main id="main-content"')
  })
})
