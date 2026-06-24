const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const sourcePath = path.join(__dirname, "..", "app", "rat", "components", "inventory-list.tsx")

describe("UI inventarios RAT - filtro por titulares", () => {
  it("permite filtrar al dar clic en chips de titulares", () => {
    const source = fs.readFileSync(sourcePath, "utf8")

    assert.match(source, /holderFilter/)
    assert.match(source, /setHolderFilter/)
    assert.match(source, /aria-pressed=\{isSelectedHolder\}/)
    assert.match(source, /Filtrar por titular/)
    assert.match(source, /Limpiar titular/)
  })

  it("mantiene búsqueda y titular como filtros independientes", () => {
    const source = fs.readFileSync(sourcePath, "utf8")

    assert.match(source, /matchesSearch/)
    assert.match(source, /matchesHolder/)
    assert.match(source, /return matchesSearch && matchesHolder/)
  })
})
