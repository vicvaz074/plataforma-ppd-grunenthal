const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")
const mammoth = require("mammoth")

const importTsModule = async (relativePath) => {
  const modulePath = path.join(__dirname, "..", relativePath)
  const imported = await import(pathToFileURL(modulePath).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("cláusulas modelo de relaciones con terceros Grünenthal", () => {
  it("expone solo las cláusulas validadas del Apéndice 1 del manual", async () => {
    const {
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES,
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE,
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
    } = await importTsModule("lib/grunenthal-third-party-model-clauses.ts")

    assert.equal(GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES.length, 4)
    assert.match(GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE, /Manual de Relaciones con Terceros/)
    assert.deepEqual(
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES.map((clause) => clause.id),
      [
        "grunenthal-clause-c1-encargados",
        "grunenthal-clause-c2-transferencias",
        "grunenthal-clause-c3-no-aplicacion",
        "grunenthal-clause-c4-laboral",
      ],
    )

    const packageText = GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE
    assert.match(packageText, /plazo máximo de 24 horas/)
    assert.match(packageText, /Base de Datos Transferida/)
    assert.match(packageText, /NO TRATAMIENTO DE DATOS PERSONALES/)
    assert.match(packageText, /Carta de Protección de Datos Personales/)
    assert.doesNotMatch(packageText, /C\\.5/)
    assert.doesNotMatch(packageText, /Representantes legales/)
  })

  it("expone los contratos modelo CM-1 y CM-2 del Apéndice 2 con documentos fieles", async () => {
    const {
      GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS,
      GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_PACKAGE,
      GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE,
    } = await importTsModule("lib/grunenthal-third-party-model-clauses.ts")

    assert.equal(GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS.length, 2)
    assert.match(GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE, /Apéndice 2/)
    assert.deepEqual(
      GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS.map((contract) => contract.id),
      ["grunenthal-model-contract-cm1-remision", "grunenthal-model-contract-cm2-transferencia"],
    )

    const [cm1, cm2] = GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS
    assert.match(cm1.title, /CM-1/)
    assert.match(cm1.text, /Contrato Modelo de Remisión de Datos Personales/)
    assert.match(cm1.text, /Responsable.+Encargado/)
    assert.match(cm1.docxPath, /cm-1-contrato-modelo-remision-datos-personales\.docx$/)
    assert.match(cm1.previewPdfPath, /cm-1-contrato-modelo-remision-datos-personales-preview\.pdf$/)

    assert.match(cm2.title, /CM-2/)
    assert.match(cm2.text, /Contrato Modelo de Transferencia de Datos Personales/)
    assert.match(cm2.text, /Responsable.+Responsable/)
    assert.match(cm2.docxPath, /cm-2-contrato-modelo-transferencia-datos-personales\.docx$/)
    assert.match(cm2.previewPdfPath, /cm-2-contrato-modelo-transferencia-datos-personales-preview\.pdf$/)

    assert.doesNotMatch(cm2.text, /APÉNDICE 3/)
    assert.doesNotMatch(GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_PACKAGE, /Carta Modelo de Remisión/)

    for (const contract of GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS) {
      const docxPath = path.join(__dirname, "..", "public", contract.docxPath)
      const previewPath = path.join(__dirname, "..", "public", contract.previewPdfPath)
      assert.ok(require("node:fs").existsSync(docxPath), `falta DOCX: ${contract.docxPath}`)
      assert.ok(require("node:fs").existsSync(previewPath), `falta preview PDF: ${contract.previewPdfPath}`)
      assert.equal(require("node:fs").readFileSync(previewPath).subarray(0, 5).toString("ascii"), "%PDF-")
    }

    const cm1DocxPath = path.join(__dirname, "..", "public", cm1.docxPath)
    const cm2DocxPath = path.join(__dirname, "..", "public", cm2.docxPath)
    const [cm1Docx, cm2Docx] = await Promise.all([
      mammoth.extractRawText({ path: cm1DocxPath }),
      mammoth.extractRawText({ path: cm2DocxPath }),
    ])
    assert.match(cm1Docx.value, /CM-1\. Contrato Modelo de Remisión de Datos Personales/)
    assert.match(cm2Docx.value, /CM-2\. Contrato Modelo de Transferencia de Datos Personales/)
    assert.ok(cm1Docx.value.split(/\s+/).length > 3000, "CM-1 debe conservar el contrato completo")
    assert.ok(cm2Docx.value.split(/\s+/).length > 1600, "CM-2 debe conservar el contrato completo")
    assert.doesNotMatch(cm2Docx.value, /APÉNDICE 3/)
  })
})
