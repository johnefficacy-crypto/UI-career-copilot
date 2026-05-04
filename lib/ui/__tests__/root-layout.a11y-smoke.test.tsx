import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import RootLayout from "@/app/layout"

describe("root layout accessibility smoke", () => {
  it("includes keyboard skip link and main landmark id", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>Test content</div>
      </RootLayout>
    )

    expect(html).toContain('href="#main-content"')
    expect(html).toContain('<main id="main-content"')
    expect(html).toContain('career-copilot-theme')
  })
})
