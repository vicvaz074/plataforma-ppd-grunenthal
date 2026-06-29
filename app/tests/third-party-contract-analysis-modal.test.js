const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("modal de análisis de contratos con terceros", () => {
  it("muestra una sola vez la nota legal cuando el origen la repite en varios campos", async () => {
    const { buildContractAnalysisModalDetails } = await importModule(
      "app/third-party-contracts/documents/contract-analysis-modal.ts",
    )
    const repeatedNote =
      "La cláusula no cumple con los requisitos de la LFPDPPP. En su lugar, se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde el Responsable Receptor garantiza la legalidad de la transferencia de datos personales."

    const details = buildContractAnalysisModalDetails({
      clauseComplianceLabel: "No cumple",
      clauseRegulation: repeatedNote,
      clauseType: "(1) Vigésima Primera. Protección de Datos Personales",
      clauseComplianceNotes: repeatedNote,
      complianceNeeds: repeatedNote,
      riskNotes: repeatedNote,
    })

    assert.equal(details.result, "No cumple")
    assert.equal(details.clauseType, "(1) Vigésima Primera. Protección de Datos Personales")
    assert.equal(details.note, repeatedNote)
    assert.equal(details.criterion, undefined)
    assert.equal(details.recommendation, undefined)
    assert.equal(details.riskNote, undefined)
  })

  it("conserva recomendación y nota cuando son contenidos diferentes", async () => {
    const { buildContractAnalysisModalDetails } = await importModule(
      "app/third-party-contracts/documents/contract-analysis-modal.ts",
    )

    const details = buildContractAnalysisModalDetails({
      clauseComplianceLabel: "Agregar cláusula",
      clauseRegulation: "No se localizó cláusula relativa.",
      clauseType: "No se encontró cláusula relativa.",
      clauseComplianceNotes: "El documento fuente no localizó cláusula relativa.",
      complianceNeeds: "Se recomienda incorporar la cláusula C2.",
      riskNotes: "Se recomienda incorporar la cláusula C2.",
    })

    assert.equal(details.criterion, "No se localizó cláusula relativa.")
    assert.equal(details.recommendation, "Se recomienda incorporar la cláusula C2.")
    assert.equal(details.note, "El documento fuente no localizó cláusula relativa.")
    assert.equal(details.riskNote, undefined)
  })
})
