const { before, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")
const publicDir = path.join(appDir, "public")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("repositorio documental Grünenthal", () => {
  let assets
  let repository

  before(async () => {
    assets = await importModule("lib/grunenthal-assets.ts")
    repository = await importModule("lib/grunenthal-repository.ts")
  })

  it("declara avisos, contratos y recursos laborales individuales con trazabilidad", () => {
    assert.equal(repository.GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS.length, 10)
    assert.equal(repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.length, 32)
    assert.equal(repository.GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS.length, 2)

    const knownAssetIds = new Set(assets.GRUNENTHAL_DOCUMENT_MANIFEST.map((asset) => asset.id))
    const allIndividualDocuments = [
      ...repository.GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS,
      ...repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS,
      ...repository.GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS,
    ]
    const ids = new Set()

    for (const document of allIndividualDocuments) {
      assert.ok(document.id.startsWith("grunenthal-"), `id normalizado esperado: ${document.id}`)
      assert.ok(!ids.has(document.id), `id individual duplicado: ${document.id}`)
      ids.add(document.id)

      assert.ok(knownAssetIds.has(document.sourceCompiledAssetId), `fuente compilada desconocida para ${document.title}`)
      assert.ok(document.sourceLineRange, `rango fuente requerido para ${document.title}`)
      assert.ok(document.originalPath.startsWith("/client/grunenthal/"), `ruta pública requerida: ${document.originalPath}`)
      assert.ok(document.previewPdfPath.startsWith("/client/grunenthal/"), `preview público requerido: ${document.previewPdfPath}`)
      assert.ok(document.originalPath.endsWith(".docx"), `original DOCX requerido: ${document.originalPath}`)
      assert.ok(document.previewPdfPath.endsWith(".pdf"), `preview PDF requerido: ${document.previewPdfPath}`)
      assert.ok(
        fs.existsSync(path.join(publicDir, document.originalPath)),
        `falta DOCX individual: ${document.originalPath}`,
      )
      assert.ok(
        fs.existsSync(path.join(publicDir, document.previewPdfPath)),
        `falta PDF de preview individual: ${document.previewPdfPath}`,
      )
    }
  })

  it("unifica el repositorio sin incluir RAT ni JSON", () => {
    const documents = repository.GRUNENTHAL_REPOSITORY_DOCUMENTS
    assert.ok(documents.length >= 55, "debe incluir políticas, avisos, contratos y sus registros individuales")
    assert.ok(documents.some((document) => document.module === "data-policies"))
    assert.ok(documents.some((document) => document.module === "privacy-notices"))
    assert.ok(documents.some((document) => document.module === "third-party-contracts"))
    assert.equal(documents.some((document) => document.module === "rat"), false)
    assert.equal(documents.some((document) => document.category.includes("json")), false)
    assert.equal(documents.some((document) => document.originalPath.endsWith(".json")), false)

    for (const document of documents) {
      assert.ok(document.fileId.startsWith("grunenthal-file-"), `fileId semilla requerido: ${document.fileId}`)
      assert.ok(document.title.trim(), "cada documento debe tener título")
      assert.ok(document.sourceLabel.trim(), `fuente visible requerida para ${document.title}`)
      assert.ok(["data-policies", "privacy-notices", "third-party-contracts"].includes(document.module))
    }
  })
})
