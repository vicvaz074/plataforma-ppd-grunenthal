const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")

const appDir = path.join(__dirname, "..", "..")
const {
  getSecurityHeaders,
  securityHeaders,
} = require(path.join(appDir, "security-headers.cjs"))

const headersByKey = Object.fromEntries(
  securityHeaders.map(({ key, value }) => [key.toLowerCase(), value])
)

describe("production security headers", () => {
  it("defines hardened headers for HTML responses", () => {
    assert.ok(securityHeaders.length > 0, "securityHeaders should not be empty")

    const expectedHeaders = {
      "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "x-permitted-cross-domain-policies": "none",
      "referrer-policy": "strict-origin-when-cross-origin",
    }

    for (const [key, value] of Object.entries(expectedHeaders)) {
      assert.equal(
        headersByKey[key],
        value,
        `Expected header ${key} to equal ${value}`
      )
    }
  })

  it("locks down CSP directives for embedded and active content", () => {
    const csp =
      Object.fromEntries(
        getSecurityHeaders({ isDev: false }).map(({ key, value }) => [
          key.toLowerCase(),
          value,
        ])
      )["content-security-policy"] || ""

    assert.ok(csp.includes("frame-ancestors 'none'"))
    assert.ok(csp.includes("object-src 'none'"))
    assert.ok(csp.includes("default-src 'self'"))
    assert.ok(csp.includes("frame-src 'none'"), "CSP should keep frame embedding disabled")
    assert.ok(csp.includes("worker-src 'self' blob:"), "CSP should allow the constrained PDF.js worker")

    assert.ok(csp.includes("script-src 'self' 'unsafe-inline'"), "CSP should explicitly allow inline scripts required by Next.js runtime")
    assert.ok(!csp.includes("'unsafe-eval'"), "Production CSP should not allow unsafe-eval")
    assert.ok(
      csp.includes(
        "style-src 'self' 'sha256-skqujXORqzxt1aE0NNXxujEanPTX6raoqSscTV/Ww/Y=' 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo=' 'sha256-vGQdhYJbTuF+M8iCn1IZCHpdkiICocWHDq4qnQF4Rjw=' 'sha256-441zG27rExd4/il+NvIqyL8zFx5XmyNQtE381kSkUJk=' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' https://cdn.jsdelivr.net https://fonts.cdnfonts.com",
      ),
      "CSP should include the required inline style hashes instead of unsafe-inline",
    )
    assert.ok(!csp.includes("style-src 'self' 'unsafe-inline'"), "CSP should not allow unsafe-inline styles")
    assert.ok(!/(^|[ ;])https:(?=$|[ ;])/.test(csp), "CSP should avoid broad wildcard-like https: sources")
    assert.ok(!/(^|[ ;])wss:(?=$|[ ;])/.test(csp), "CSP should avoid broad wildcard-like wss: sources")
  })

  it("relaxes CSP in development only for Next.js HMR runtime", () => {
    const devCsp = Object.fromEntries(
      getSecurityHeaders({ isDev: true }).map(({ key, value }) => [
        key.toLowerCase(),
        value,
      ])
    )["content-security-policy"]

    assert.ok(devCsp.includes("script-src 'self' 'unsafe-inline' 'unsafe-eval'"))
    assert.ok(devCsp.includes("style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.cdnfonts.com"))
    assert.ok(!devCsp.includes("style-src 'self' 'unsafe-inline' 'sha256-"), "Development CSP should not mix unsafe-inline styles with hashes")
    assert.ok(devCsp.includes("connect-src 'self' ws: wss:"))
  })
})
