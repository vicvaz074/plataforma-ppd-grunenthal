const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const registrationSourcePath = path.join(__dirname, "..", "app", "third-party-contracts", "registration", "page.tsx")
const documentsSourcePath = path.join(__dirname, "..", "app", "third-party-contracts", "documents", "page.tsx")

describe("UI contratos con terceros - documentos asociados", () => {
  it("en registro separa vista previa modal y descarga de contratos asociados", () => {
    const source = fs.readFileSync(registrationSourcePath, "utf8")

    assert.match(source, /FilePreviewDialog/)
    assert.match(source, /canOfferFilePreview/)
    assert.match(source, /previewContractAttachment/)
    assert.match(source, /downloadContractAttachment/)
    assert.match(source, /clauseComplianceBadges/)
    assert.match(source, /Análisis de cláusula/)
    assert.match(source, /Descargar/)
    assert.match(source, /setPreviewAttachmentFile/)
  })

  it("en documentos ofrece ver y descargar para contratos y anexos", () => {
    const source = fs.readFileSync(documentsSourcePath, "utf8")

    assert.match(source, /FilePreviewDialog/)
    assert.match(source, /canOfferFilePreview/)
    assert.match(source, /previewStoredContract/)
    assert.match(source, /downloadStoredContract/)
    assert.match(source, /previewContractAttachment/)
    assert.match(source, /downloadContractAttachment/)
    assert.match(source, /clauseComplianceBadges/)
    assert.match(source, /Resultado de análisis/)
    assert.match(source, /Cláusula revisada/)
    assert.match(source, /Recomendación/)
    assert.match(source, /Descargar/)
  })
})
