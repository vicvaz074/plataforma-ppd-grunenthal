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

  it("diferencia políticas México y políticas Globales en el repositorio", () => {
    const source = fs.readFileSync(sourcePath, "utf8")

    assert.match(source, /repositoryPolicyScopeFilter/)
    assert.match(source, /Políticas México/)
    assert.match(source, /Políticas Globales/)
    assert.match(source, /GRUNENTHAL_CURATED_POLICY_DOCUMENTS/)
  })

  it("usa navegación interna con estado visible y scroll al contenido activo", () => {
    const source = fs.readFileSync(sourcePath, "utf8")

    assert.match(source, /sectionContentRef/)
    assert.match(source, /handleSectionChange/)
    assert.match(source, /scrollIntoView/)
    assert.match(source, /role="tablist"/)
    assert.match(source, /aria-selected/)
    assert.match(source, /Vista activa/)
  })

  it("hace que los filtros de alcance ocupen el ancho disponible", () => {
    const source = fs.readFileSync(sourcePath, "utf8")

    assert.match(source, /Filtros del repositorio/)
    assert.match(source, /activeRepositoryFilterCount/)
    assert.match(source, /!max-w-none/)
    assert.match(source, /inline-flex min-h-11 w-full min-w-0/)
    assert.match(source, /sm:grid-cols-3/)
    assert.match(source, /xl:grid-cols-\[minmax\(260px,1\.35fr\)_minmax\(180px,0\.9fr\)_minmax\(180px,0\.9fr\)_minmax\(180px,0\.9fr\)\]/)
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
