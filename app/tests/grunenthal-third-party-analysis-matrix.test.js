const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
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
    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.lastUpdated, "29 de junio de 2026")
    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.length, 37)

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

  it("incluye Vimeo, GPTW y Master Control del análisis actualizado del 29-06-26", async () => {
    const { GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX } = await importTsModule(
      "lib/grunenthal-third-party-analysis-matrix.ts",
    )
    const { GRUNENTHAL_GRT_CONTRACT_DOCUMENTS } = await importTsModule("lib/grunenthal-contracts-grt.ts")
    const publicDir = path.join(__dirname, "..", "public")

    const vimeo = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find((row) => row.thirdParty === "VIMEO")
    assert.ok(vimeo)
    assert.equal(vimeo.sourceRow, 46)
    assert.equal(vimeo.area, "GLOBALES")
    assert.equal(vimeo.contract, "Términos de Uso de plataforma para la creación y divulgación de videos")
    assert.equal(vimeo.communicationType, "transferencia")

    const gptw = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find(
      (row) => row.thirdParty === "GPTW Deutschland GmbH",
    )
    assert.ok(gptw)
    assert.equal(gptw.sourceRow, 47)
    assert.equal(gptw.communicationType, "transferencia")

    const masterControl = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find(
      (row) => row.thirdParty === "MASTER CONTROL INC.",
    )
    assert.ok(masterControl)
    assert.equal(masterControl.sourceRow, 48)
    assert.equal(masterControl.communicationType, "remision")

    const expectedContracts = [
      {
        providerIdentity: "VIMEO",
        path: "/client/grunenthal/third-party-contracts/contratos-grt/terminos-de-servicio-de-vimeo.pdf",
        clauseComplianceLabel: "Sí cumple",
        clauseType: "(1) Privacy policy",
      },
      {
        providerIdentity: "GPTW Deutschland GmbH",
        path: "/client/grunenthal/third-party-contracts/contratos-grt/gptw-grunenthal-av-vertrag.pdf",
        clauseComplianceLabel: "No cumple",
        clauseType: "(1) Auftragsverarbeitungsvertrag",
      },
      {
        providerIdentity: "MASTER CONTROL INC.",
        path: "/client/grunenthal/third-party-contracts/contratos-grt/contract-mastercontrol.pdf",
        clauseComplianceLabel: "Sí cumple",
        clauseType: "(1) Data Processing Addendum",
        previewPageCount: 50,
      },
    ]

    for (const expected of expectedContracts) {
      const contract = GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.find(
        (item) => item.providerIdentity === expected.providerIdentity,
      )
      assert.ok(contract, `debe existir contrato GRT para ${expected.providerIdentity}`)
      assert.equal(contract.path, expected.path)
      assert.equal(contract.previewPdfPath, expected.path)
      assert.equal(contract.clauseComplianceLabel, expected.clauseComplianceLabel)
      assert.equal(contract.clauseType, expected.clauseType)
      assert.equal(fs.existsSync(path.join(publicDir, expected.path)), true, `falta PDF ${expected.path}`)
      if (expected.previewPageCount) {
        assert.equal(contract.previewPageImagePaths?.length, expected.previewPageCount)
        for (const previewPagePath of contract.previewPageImagePaths) {
          assert.equal(
            fs.existsSync(path.join(publicDir, previewPagePath)),
            true,
            `falta página de preview ${previewPagePath}`,
          )
        }
      }
    }
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

  it("vincula Negocios de Innovación Farmacéutica con su contrato físico de Consultores y Asesores FPM", async () => {
    const { GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS } = await importTsModule("lib/grunenthal-repository.ts")
    const { GRUNENTHAL_GRT_CONTRACT_DOCUMENTS } = await importTsModule("lib/grunenthal-contracts-grt.ts")
    const { findGrunenthalContractAnalysisLink } = await importTsModule(
      "lib/grunenthal-contract-analysis-linking.ts",
    )

    const record = GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find(
      (item) => item.providerIdentity === "NEGOCIOS DE INNOVACIÓN FARMACÉUTICA, S.C.",
    )
    assert.ok(record)
    assert.equal(record.communicationType, "remision")
    assert.equal(record.sourceComplianceLabel, "No cumple")
    assert.ok(record.sourceClauseType)
    assert.match(record.previewPdfPath, /grt-ter-2026-002-negocios-de-innovacion-farmaceutica-s-c-preview\.pdf$/)

    const physicalContract = GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.find((contract) =>
      contract.sourceName.includes("CONSULTORES Y ASESORES FPM"),
    )
    assert.ok(physicalContract)
    assert.equal(physicalContract.providerIdentity, record.providerIdentity)
    assert.equal(physicalContract.path, "/client/grunenthal/third-party-contracts/contratos-grt/9-convenio-consultores-y-asesores-fpm-s-c-firmado.pdf")
    assert.equal(physicalContract.clauseComplianceStatus, "no_cumple")
    assert.equal(physicalContract.clauseComplianceLabel, "No cumple")
    assert.equal(physicalContract.clauseType, "(1) Vigésima. Protección de Datos Personales")

    const link = findGrunenthalContractAnalysisLink(physicalContract)
    assert.equal(link.analysisRecord?.providerIdentity, record.providerIdentity)
    assert.equal(link.matrixRow?.thirdParty, record.providerIdentity)
  })
})
