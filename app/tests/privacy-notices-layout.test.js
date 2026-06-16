const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const appDir = path.join(__dirname, "..")

describe("layout de avisos de privacidad", () => {
  it("mantiene responsivo el filtro por titulares sin desbordar", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/privacy-notices/notices-content.tsx"),
      "utf8",
    )

    assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(220px,360px\)\]/)
    assert.match(source, /<select[\s\S]*className="[^"]*w-full[^"]*min-w-0[^"]*max-w-full/)
  })
})
