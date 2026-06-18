const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const sourcePath = path.join(__dirname, "..", "app", "data-policies", "policies-manager-content.tsx")

describe("UI /data-policies repositorio", () => {
  it("expone el repositorio con visor, descarga, búsqueda y filtros", () => {
    const source = fs.readFileSync(sourcePath, "utf8")

    assert.match(source, /type PoliciesManagerSection = "registro" \| "consulta" \| "repositorio"/)
    assert.match(source, /buildGrunenthalRepositoryDocuments/)
    assert.match(source, /FilePreviewDialog/)
    assert.match(source, /canOfferFilePreview/)
    assert.match(source, /repositorySearch/)
    assert.match(source, /repositoryModuleFilter/)
    assert.match(source, /repositoryTypeFilter/)
    assert.match(source, /repositoryAreaFilter/)
    assert.match(source, /Repositorio documental/)
    assert.match(source, /Ver/)
    assert.match(source, /Descargar/)
  })

  it("usa contenedores responsivos para evitar que consulta se vea comprimida", () => {
    const source = fs.readFileSync(sourcePath, "utf8")
    const minWidthGuards = source.match(/min-w-0/g) || []

    assert.ok(minWidthGuards.length >= 12, "la vista necesita min-w-0 en cards, grids y columnas internas")
    assert.equal(
      source.includes("lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]"),
      false,
      "la grilla de tres columnas no debe activarse en lg",
    )
    assert.ok(
      source.includes("2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]"),
      "la grilla de tres columnas debe reservarse para pantallas muy amplias",
    )
    assert.ok(source.includes("overflow-x-auto"), "los controles densos deben poder respirar en pantallas chicas")
  })
})
