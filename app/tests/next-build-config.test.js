const { describe, it } = require("node:test")
const assert = require("node:assert/strict")

const createNextConfig = require("../next.config.js")

describe("configuración de build Next", () => {
  it("usa un hash estable de Node para builds Webpack", () => {
    const nextConfig = createNextConfig("phase-production-build")

    assert.equal(typeof nextConfig.webpack, "function")

    const webpackConfig = nextConfig.webpack({ output: {} })

    assert.equal(webpackConfig.output.hashFunction, "sha256")
  })
})
