const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const importTsModule = async (relativePath) => {
  const modulePath = path.join(__dirname, "..", relativePath)
  const imported = await import(pathToFileURL(modulePath).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("matriz de análisis de relaciones Grünenthal", () => {
  it("expone la tabla resumen con filas clave y metadatos de fuente", async () => {
    const {
      GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX,
      GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE,
    } = await importTsModule("lib/grunenthal-third-party-analysis-matrix.ts")

    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.sourceDocument, "Análisis de Relaciones Grünenthal")
    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.lastUpdated, "21 de octubre de 2025")
    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.length, 34)

    const ids = new Set(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.map((row) => row.id))
    assert.equal(ids.size, GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.length)

    const toka = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find((row) => row.thirdParty.includes("TOKA"))
    assert.ok(toka)
    assert.equal(toka.area, "HUMAN RESOURCES")
    assert.equal(toka.communicationType, "transferencia")

    const dhl = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find((row) => row.thirdParty.includes("DHL"))
    assert.ok(dhl)
    assert.equal(dhl.area, "HUMAN RESOURCES")
    assert.equal(dhl.communicationType, "transferencia")

    const laborRows = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.filter((row) => row.communicationType === "no-aplica")
    assert.equal(laborRows.length, 2)
  })

  it("enlaza una fila conocida con análisis de cláusula y contrato original", async () => {
    const { GRUNENTHAL_GRT_CONTRACT_DOCUMENTS } = await importTsModule("lib/grunenthal-contracts-grt.ts")
    const { findGrunenthalContractAnalysisLink } = await importTsModule(
      "lib/grunenthal-contract-analysis-linking.ts",
    )

    const haysContract = GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.find(
      (contract) => contract.providerIdentity === "HAYS - AG",
    )
    assert.ok(haysContract)
    assert.equal(haysContract.clauseComplianceLabel, "No cumple")
    assert.ok(haysContract.clauseType)
    assert.match(haysContract.path, /third-party-contracts\/contratos-grt\/.+\.pdf$/)

    const link = findGrunenthalContractAnalysisLink(haysContract)
    assert.ok(link.matrixRow)
    assert.ok(link.analysisRecord)
    assert.equal(link.matrixRow.thirdParty, "HAYS - AG")
    assert.equal(link.analysisRecord.providerIdentity, "HAYS - AG")
    assert.ok(link.analysisRecord.sourceComplianceLabel)
    assert.ok(link.analysisRecord.sourceClauseType)
  })

  it("muestra Agregar cláusula cuando no se encontró cláusula relativa", async () => {
    const { GRUNENTHAL_GRT_CONTRACT_DOCUMENTS } = await importTsModule("lib/grunenthal-contracts-grt.ts")
    const { GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS } = await importTsModule("lib/grunenthal-repository.ts")

    const coradContract = GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.find((contract) =>
      contract.providerIdentity.includes("CORAD MEETING PLANNER"),
    )
    assert.ok(coradContract)
    assert.equal(coradContract.clauseType, "No se encontró cláusula relativa.")
    assert.equal(coradContract.clauseComplianceStatus, "no_aplica")
    assert.equal(coradContract.clauseComplianceLabel, "Agregar cláusula")

    const coradAnalysis = GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find((record) =>
      record.providerIdentity.includes("CORAD MEETING PLANNER"),
    )
    assert.ok(coradAnalysis)
    assert.equal(coradAnalysis.sourceClauseType, "No se encontró cláusula relativa.")
    assert.equal(coradAnalysis.complianceStatus, "no-aplica")
    assert.equal(coradAnalysis.sourceComplianceLabel, "Agregar cláusula")
  })

  it("marca BETERFLY como no cumple por clasificar incorrectamente una transferencia como remisión", async () => {
    const { GRUNENTHAL_GRT_CONTRACT_DOCUMENTS } = await importTsModule("lib/grunenthal-contracts-grt.ts")
    const { GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS } = await importTsModule("lib/grunenthal-repository.ts")

    const expectedAnalysis =
      "La cláusula y anexo establecen que la comunicación de datos es una remisión, lo cual es incorrecto, ya que al ofrecer servicios Telemedicina y otros servicios independientes y ajenos a Grünenthal se debe de considerar como una transferencia de datos personales. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas."

    const beterflyContract = GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.find((contract) =>
      contract.sourceName.includes("Contrato Servicios Betterfly"),
    )
    assert.ok(beterflyContract)
    assert.equal(beterflyContract.providerIdentity, "BETERFLY MÉXICO, S.A. DE C.V.")
    assert.equal(beterflyContract.clauseComplianceStatus, "no_cumple")
    assert.equal(beterflyContract.clauseComplianceLabel, "No cumple")
    assert.equal(beterflyContract.analysisSummary, expectedAnalysis)
    assert.equal(beterflyContract.recommendation, expectedAnalysis)

    const beterflyAnalysis = GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find((record) =>
      record.providerIdentity.includes("BETERFLY MÉXICO"),
    )
    assert.ok(beterflyAnalysis)
    assert.equal(beterflyAnalysis.complianceStatus, "no-cumple")
    assert.equal(beterflyAnalysis.sourceComplianceLabel, "No cumple")
    assert.equal(beterflyAnalysis.sourceRecommendation, expectedAnalysis)
  })

  it("conserva análisis individual para Negocios de Innovación Farmacéutica aunque no exista contrato GRT físico", async () => {
    const { GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS } = await importTsModule("lib/grunenthal-repository.ts")
    const { GRUNENTHAL_GRT_CONTRACT_DOCUMENTS } = await importTsModule("lib/grunenthal-contracts-grt.ts")

    const record = GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find(
      (item) => item.providerIdentity === "NEGOCIOS DE INNOVACIÓN FARMACÉUTICA, S.C.",
    )
    assert.ok(record)
    assert.equal(record.communicationType, "remision")
    assert.equal(record.sourceComplianceLabel, "No cumple")
    assert.ok(record.sourceClauseType)
    assert.match(record.previewPdfPath, /grt-ter-2026-002-negocios-de-innovacion-farmaceutica-s-c-preview\.pdf$/)

    const physicalContract = GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.find(
      (contract) => contract.providerIdentity === record.providerIdentity,
    )
    assert.equal(physicalContract, undefined)
  })
})
