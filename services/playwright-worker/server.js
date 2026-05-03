import express from "express"
import { chromium } from "playwright"

const PORT = Number(process.env.PORT ?? 8080)
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? ""
const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES ?? 2_000_000)
const INFLIGHT_LIMIT = Number(process.env.INFLIGHT_LIMIT ?? 4)
const app = express()
app.use(express.json({ limit: "1mb" }))

let inflight = 0
let browser = null
async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] })
  }
  return browser
}

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase()
  if (["localhost", "0.0.0.0", "::1"].includes(h) || h.endsWith(".local") || !h.includes(".")) return true
  if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(h)) return true
  return false
}

function validateTargetUrl(input) {
  let parsed
  try { parsed = new URL(input) } catch { return { ok: false, reason: "invalid_url" } }
  if (!["http:", "https:"].includes(parsed.protocol)) return { ok: false, reason: "invalid_protocol" }
  if (isBlockedHost(parsed.hostname)) return { ok: false, reason: "blocked_host" }
  return { ok: true, url: parsed.toString() }
}

app.get("/health", (_req, res) => res.status(200).send("ok"))

app.post("/render", async (req, res) => {
  if (!AUTH_TOKEN || req.get("x-worker-token") !== AUTH_TOKEN) {
    return res.status(401).json({ error: "unauthorized" })
  }
  const { url, wait_for = "networkidle", timeout_ms = 25000 } = req.body ?? {}
  if (typeof url !== "string") return res.status(400).json({ error: "url must be provided" })
  const validated = validateTargetUrl(url)
  if (!validated.ok) return res.status(400).json({ error: "invalid_target_url", reason: validated.reason })
  if (inflight >= INFLIGHT_LIMIT) return res.status(429).json({ error: "too_many_requests" })

  const allowedWaits = new Set(["load", "domcontentloaded", "networkidle", "commit"])
  const waitUntil = allowedWaits.has(wait_for) ? wait_for : "networkidle"
  const timeout = Math.min(Number(timeout_ms) || 25000, 45000)

  let context, page
  try {
    inflight += 1
    const b = await getBrowser()
    context = await b.newContext({ userAgent: "Mozilla/5.0 (compatible; CareerCopilotBot/1.0)" })
    page = await context.newPage()
    const resp = await page.goto(validated.url, { waitUntil, timeout })
    const html = await page.content()
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return res.status(413).json({ error: "response_too_large" })
    }
    return res.json({ html, status: resp?.status() ?? 200, final_url: page.url() })
  } catch (err) {
    return res.status(502).json({ error: String(err?.message ?? err) })
  } finally {
    inflight = Math.max(0, inflight - 1)
    try { await page?.close() } catch {}
    try { await context?.close() } catch {}
  }
})

const server = app.listen(PORT, () => console.log(`playwright-worker on :${PORT}`))

async function shutdown(sig) {
  console.log(`${sig} received — shutting down`)
  server.close()
  try { await browser?.close() } catch {}
  process.exit(0)
}
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
