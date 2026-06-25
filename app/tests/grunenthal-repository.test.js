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
    assert.equal(repository.GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS.length, 11)
    assert.equal(repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.length, 32)
    assert.equal(repository.GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS.length, 2)

    const corad = repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find((record) =>
      record.providerIdentity.includes("CORAD MEETING PLANNER"),
    )
    assert.ok(corad, "debe existir el análisis individual de CORAD")
    assert.equal(corad.complianceStatus, "no-aplica")
    assert.equal(corad.sourceComplianceLabel, "N/A")
    assert.match(corad.sourceClauseType, /No se encontró cláusula relativa/i)

    const ups = repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find((record) =>
      record.providerIdentity.includes("UPS SCS"),
    )
    assert.ok(ups, "debe existir el análisis individual de UPS")
    assert.equal(ups.complianceStatus, "requiere-revision")
    assert.equal(ups.sourceComplianceLabel, "Sí cumple")
    assert.match(ups.sourceComplianceNotes, /contradicción/i)

    const knownAssetIds = new Set(assets.GRUNENTHAL_DOCUMENT_MANIFEST.map((asset) => asset.id))
    assert.ok(
      knownAssetIds.has("grunenthal-privacy-notices-manualap-grunentha-davara-v5"),
      "debe existir el ManualAP v5 como fuente compilada",
    )
    assert.equal(
      knownAssetIds.has("grunenthal-privacy-notices-manualap-grunentha-davara-v3"),
      false,
      "el ManualAP v3 no debe quedar expuesto como fuente vigente",
    )
    assert.ok(
      repository.GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS.some((record) => record.slug === "aviso-plataformas"),
      "debe declararse el aviso individual general para plataformas",
    )
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

  it("declara políticas curadas por alcance México y Global con nombres públicos", () => {
    assert.equal(repository.GRUNENTHAL_CURATED_POLICY_DOCUMENTS.length, 18)

    const mexicoPolicies = repository.GRUNENTHAL_CURATED_POLICY_DOCUMENTS.filter(
      (document) => document.policyScope === "mexico",
    )
    const globalPolicies = repository.GRUNENTHAL_CURATED_POLICY_DOCUMENTS.filter(
      (document) => document.policyScope === "global",
    )

    assert.equal(mexicoPolicies.length, 14)
    assert.equal(globalPolicies.length, 4)
    assert.ok(
      mexicoPolicies.some(
        (document) =>
          document.title ===
          "Política General de Protección de Datos Personales de Grünenthal.",
      ),
    )
    assert.ok(
      mexicoPolicies.some(
        (document) =>
          document.title ===
          "Manual de Atención de Derechos ARCO de Grünenthal",
      ),
    )
    assert.ok(
      globalPolicies.some(
        (document) => document.title === "Política de Tratamiento de Datos Personales.",
      ),
    )
  })

  it("enriquece el archivo del repositorio con el PDF de preview oficial", () => {
    const staleStoredFiles = repository.GRUNENTHAL_CURATED_POLICY_DOCUMENTS.map((document) => ({
      id: document.fileId,
      name: "archivo-viejo.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 1,
      content: document.originalPath,
      uploadDate: "2026-01-01T00:00:00.000Z",
      category: document.category,
      metadata: {},
    }))

    const documents = repository.buildGrunenthalCuratedPolicyDocuments(staleStoredFiles)
    const previewable = documents.find((document) => document.previewPdfPath)

    assert.ok(previewable, "debe existir al menos una política curada con preview PDF")
    assert.equal(previewable.storedFile.metadata.previewPdfPath, previewable.previewPdfPath)
    assert.equal(previewable.storedFile.metadata.previewMimeType, "application/pdf")
    assert.equal(previewable.storedFile.content, previewable.originalPath)
    assert.equal(previewable.storedFile.metadata.title, previewable.title)
    assert.equal(previewable.storedFile.name, previewable.downloadName)
  })

  it("usa previews fieles renderizados desde los Office originales", () => {
    const previewablePolicies = repository.GRUNENTHAL_CURATED_POLICY_DOCUMENTS.filter(
      (document) => document.previewPdfPath,
    )

    assert.equal(previewablePolicies.length, 18)

    for (const document of previewablePolicies) {
      const originalPath = path.join(publicDir, document.originalPath)
      const previewPath = path.join(publicDir, document.previewPdfPath)
      const previewContent = fs.readFileSync(previewPath)
      const previewMetadata = previewContent.toString("latin1")

      assert.ok(fs.existsSync(originalPath), `falta documento original: ${document.originalPath}`)
      assert.equal(previewContent.subarray(0, 5).toString("ascii"), "%PDF-", `preview PDF invalido: ${document.previewPdfPath}`)
      assert.match(
        previewMetadata,
        /LibreOffice/i,
        `el preview debe venir del Office original: ${document.previewPdfPath}`,
      )
      assert.doesNotMatch(
        previewMetadata,
        /jsPDF/i,
        `el preview no debe ser una copia reconstruida por jsPDF: ${document.previewPdfPath}`,
      )
    }
  })
})
