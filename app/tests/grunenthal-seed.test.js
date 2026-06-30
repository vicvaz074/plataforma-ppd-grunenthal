const { before, beforeEach, describe, it } = require("node:test")
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

class LocalStorageMock {
  constructor() {
    this.store = new Map()
  }

  get length() {
    return this.store.size
  }

  key(index) {
    return Array.from(this.store.keys())[index] || null
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }

  removeItem(key) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

describe("personalización Grünenthal", () => {
  let assets
  let repository
  let seed
  let fileStorage
  let ratData
  let grtContracts

  before(async () => {
    assets = await importModule("lib/grunenthal-assets.ts")
    repository = await importModule("lib/grunenthal-repository.ts")
    seed = await importModule("lib/grunenthal-seed.ts")
    fileStorage = await importModule("lib/fileStorage.ts")
    ratData = await importModule("lib/grunenthal-rat-data.ts")
    grtContracts = await importModule("lib/grunenthal-contracts-grt.ts")
  })

  beforeEach(() => {
    const localStorage = new LocalStorageMock()
    global.localStorage = localStorage
    global.window = {
      localStorage,
      dispatchEvent() {},
    }
  })

  it("declara los assets públicos de Grünenthal y todos existen en public", () => {
    assert.equal(assets.GRUNENTHAL_DOCUMENT_MANIFEST.length, 63)
    assert.equal(assets.GRUNENTHAL_LOGO.path, "/client/grunenthal/brand/grunenthal-logo-green.png")
    assert.equal(assets.GRUNENTHAL_LOGO.whiteFilter, "brightness(0) invert(1)")
    assert.equal(assets.GRUNENTHAL_LOGO.blackFilter, "brightness(0)")

    const ids = new Set()
    for (const asset of assets.GRUNENTHAL_DOCUMENT_MANIFEST) {
      assert.ok(asset.id.startsWith("grunenthal-"), `id esperado para ${asset.name}`)
      assert.ok(asset.path.startsWith("/client/grunenthal/"), `ruta pública esperada para ${asset.name}`)
      assert.ok(!asset.path.includes(" "), `ruta normalizada esperada para ${asset.path}`)
      assert.ok(!ids.has(asset.id), `id duplicado: ${asset.id}`)
      ids.add(asset.id)

      const assetPath = path.join(publicDir, asset.path)
      assert.equal(fs.existsSync(assetPath), true, `falta asset público: ${asset.path}`)
    }
  })

  it("siembra RAT consolidado, archivos y usuario administrador sin duplicar", async () => {
    await seed.seedGrunenthalDemoData()
    await seed.seedGrunenthalDemoData()

    const inventories = JSON.parse(global.localStorage.getItem("inventories") || "[]")
    const storedFiles = JSON.parse(global.localStorage.getItem("storedFiles") || "[]")
    const users = JSON.parse(global.localStorage.getItem("platform_users") || "[]")
    const contracts = JSON.parse(global.localStorage.getItem("contractsHistory") || "[]")
    const seedState = JSON.parse(global.localStorage.getItem(seed.GRUNENTHAL_SEED_STATE_KEY) || "{}")
    const individualDocumentCount =
      repository.GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS.length +
      repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.length +
      repository.GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS.length +
      grtContracts.GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.length

    assert.equal(inventories.length, 16)
    assert.equal(seedState.version, "2026.2.4")
    assert.equal(
      inventories.reduce((total, inventory) => total + inventory.subInventories.length, 0),
      39,
    )
    assert.equal(storedFiles.length, assets.GRUNENTHAL_DOCUMENT_MANIFEST.length + individualDocumentCount)
    assert.equal(new Set(storedFiles.map((file) => file.id)).size, storedFiles.length)
    assert.equal(
      storedFiles
        .filter((file) => file.metadata?.individualRecordType !== "privacy-notice")
        .every((file) => file.metadata.createdBy === "Admin"),
      true,
      "los archivos precargados sin autor deben conservar Admin salvo avisos individuales",
    )

    const wordAssets = assets.GRUNENTHAL_DOCUMENT_MANIFEST.filter((asset) =>
      ["docx", "docm"].includes(asset.extension),
    )
    assert.equal(wordAssets.length, 22)

    for (const asset of wordAssets) {
      const storedFile = storedFiles.find((file) => file.id === `grunenthal-file-${asset.id}`)
      const expectedPreviewPath = asset.path.replace(/\.(docx|docm)$/i, "-preview.pdf")

      assert.ok(storedFile, `debe existir el archivo precargado ${asset.id}`)
      assert.equal(storedFile.metadata.previewPdfPath, expectedPreviewPath)
      assert.equal(storedFile.metadata.previewMimeType, "application/pdf")
      assert.equal(
        fs.existsSync(path.join(publicDir, expectedPreviewPath)),
        true,
        `debe existir el preview PDF de ${asset.name}`,
      )
    }

    const individualNotices = storedFiles.filter((file) => file.metadata?.individualRecordType === "privacy-notice")
    assert.equal(individualNotices.length, 12)
    assert.equal(individualNotices.every((file) => file.category === "privacy-notice"), true)
    assert.equal(
      individualNotices.every((file) => file.metadata?.createdBy === "Legal"),
      true,
      "los avisos individuales precargados deben mostrarse como creados por Legal",
    )
    for (const noticeName of [
      "Aviso de Privacidad Integral para Candidatos",
      "Aviso de Privacidad Integral para Empleados",
      "Aviso de Privacidad Integral para Empleados de Proveedores",
      "Aviso de Privacidad Integral para Proveedores Persona Física",
      "Aviso de Privacidad para Visitantes y CCTV",
      "E-1 Aviso de Privacidad Simplificado para Visitantes",
    ]) {
      assert.ok(
        individualNotices.some((file) => file.metadata?.noticeName === noticeName),
        `debe existir en Registros: ${noticeName}`,
      )
    }
    assert.equal(
      individualNotices.every((file) => file.metadata?.previewPdfPath && file.metadata?.sourceCompiledAssetId),
      true,
      "cada aviso individual debe descargar DOCX y previsualizar PDF",
    )

    const compiledPrivacyManual = storedFiles.find(
      (file) => file.metadata?.grunenthalAssetId === "grunenthal-privacy-notices-manualap-grunentha-davara-v5",
    )
    assert.equal(compiledPrivacyManual?.category, "privacy-policy")
    assert.equal(
      storedFiles.some((file) => file.metadata?.grunenthalAssetId === "grunenthal-privacy-notices-manualap-grunentha-davara-v3"),
      false,
    )

    const arcoTemplateAsset = assets.GRUNENTHAL_DOCUMENT_MANIFEST.find((asset) =>
      asset.id === "grunenthal-arco-rights-matriz-de-control-y-seguimiento-del-ejercicio-de-derechos-arco"
    )
    assert.ok(arcoTemplateAsset, "debe existir la plantilla Excel de control ARCO")

    const arcoTemplateFile = storedFiles.find((file) => file.id === `grunenthal-file-${arcoTemplateAsset.id}`)
    const expectedArcoTemplatePreviewPath = arcoTemplateAsset.path.replace(/\.xlsx$/i, "-preview.pdf")

    assert.ok(arcoTemplateFile, "debe precargarse la plantilla Excel ARCO en storedFiles")
    assert.equal(arcoTemplateFile.metadata.isTemplate, true)
    assert.equal(arcoTemplateFile.metadata.templateModule, "arco-rights")
    assert.equal(arcoTemplateFile.metadata.previewPdfPath, expectedArcoTemplatePreviewPath)
    assert.equal(arcoTemplateFile.metadata.previewMimeType, "application/pdf")
    assert.equal(
      fs.existsSync(path.join(publicDir, expectedArcoTemplatePreviewPath)),
      true,
      "debe existir el preview PDF de la plantilla Excel ARCO",
    )

    const ratPdfs = storedFiles.filter((file) => file.category === "rat-inventory")
    assert.equal(ratPdfs.length, 33)
    assert.equal(
      ratPdfs.every((file) => file.metadata?.client === "Grünenthal" && file.metadata?.module === "rat"),
      true,
    )

    const individualContractFiles = storedFiles.filter((file) => file.metadata?.individualRecordType === "third-party-contract")
    const individualContracts = contracts.filter((contract) =>
      String(contract.id).startsWith("contract-grunenthal-third-party-contract-"),
    )
    assert.equal(individualContractFiles.length, 32)
    assert.equal(individualContracts.length, 0)
    assert.equal(
      contracts.some((contract) => contract.id === "grunenthal-third-party-framework-2026"),
      false,
      "el expediente general del análisis no debe aparecer como contrato del historial",
    )

    const grtContractFiles = storedFiles.filter((file) => file.metadata?.individualRecordType === "third-party-grt-contract")
    const grtHistoryContracts = contracts.filter((contract) => contract.metadata?.sourceFolder === "Contratos GRt")
    assert.equal(grtContracts.GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.length, 41)
    assert.equal(grtContractFiles.length, 41)
    assert.equal(grtHistoryContracts.length, 41)
    assert.equal(contracts.length, 41)
    assert.equal(
      grtContractFiles.every((file) => {
        const publicPath = file.content.startsWith("/") ? file.content.slice(1) : file.content
        return fs.existsSync(path.join(publicDir, publicPath))
      }),
      true,
      "cada contrato de Contratos GRt debe tener original público",
    )
    assert.equal(
      grtContractFiles
        .filter((file) => file.type === "application/pdf")
        .every((file) => !file.metadata?.previewPdfPath && file.metadata?.documentViewMode === "original"),
      true,
      "los PDF de Contratos GRt deben abrir el documento original, no un preview duplicado",
    )
    assert.equal(
      grtContractFiles
        .filter((file) => file.type !== "application/pdf")
        .every((file) => file.metadata?.previewPdfPath && file.metadata?.documentViewMode === "pdf-preview"),
      true,
      "solo los DOCX deben conservar PDF generado para visualización",
    )
    assert.equal(
      grtHistoryContracts.every((contract) =>
        contract.attachments?.some((attachment) =>
          grtContractFiles.some((file) => file.id === attachment.storageId && file.metadata?.individualRecordId === contract.metadata?.individualRecordId),
        ),
      ),
      true,
      "cada contrato de Contratos GRt debe enlazar su archivo original",
    )
    assert.equal(
      grtHistoryContracts.filter((contract) => contract.metadata?.analysisRecordId).length,
      35,
      "los contratos físicos con contraparte en el análisis deben quedar enriquecidos con el registro fuente",
    )
    const haysContract = grtHistoryContracts.find((contract) => contract.providerIdentity?.includes("HAYS"))
    assert.ok(haysContract, "debe sembrarse HAYS como contrato físico")
    assert.equal(haysContract.metadata?.analysisSourceLineRange, "408-417")
    assert.equal(haysContract.metadata?.sourceCompiledAssetId, "grunenthal-third-party-contracts-analisisderelacionesgrunenthal")
    assert.ok(haysContract.metadata?.analysisMatrixRowId, "debe enlazar la fila de la matriz del análisis")
    assert.ok(
      haysContract.attachments?.some((attachment) => attachment.storageId === "grunenthal-file-grunenthal-third-party-contract-013"),
      "debe anexar el extracto individual del análisis junto al contrato físico",
    )
    const negociosContract = grtHistoryContracts.find(
      (contract) => contract.providerIdentity === "NEGOCIOS DE INNOVACIÓN FARMACÉUTICA, S.C.",
    )
    assert.ok(negociosContract, "debe sembrarse Negocios de Innovación con su contrato físico")
    assert.equal(negociosContract.metadata?.analysisSourceLineRange, "256-265")
    assert.ok(
      negociosContract.attachments?.some(
        (attachment) =>
          attachment.storageId ===
          "grunenthal-file-grunenthal-grt-contract-021-9-convenio-consultores-y-asesores-fpm-s-c-firmado",
      ),
      "debe anexar el PDF físico de Consultores y Asesores FPM",
    )
    assert.ok(
      negociosContract.attachments?.some(
        (attachment) => attachment.storageId === "grunenthal-file-grunenthal-third-party-contract-002",
      ),
      "debe anexar el extracto individual del análisis junto al contrato físico",
    )
    assert.equal(
      grtHistoryContracts.filter((contract) => contract.providerIdentity?.includes("BACHER ZOPPI")).length,
      1,
      "BACHER no debe quedar duplicado por copias exactas del PDF",
    )
    assert.ok(
      grtHistoryContracts.some((contract) =>
        contract.providerIdentity?.includes("BACHER ZOPPI") &&
        contract.clauseComplianceStatus === "no_cumple" &&
        contract.attachments?.length >= 2,
      ),
      "debe sembrarse BACHER ZOPPI con análisis de incumplimiento y contrato enlazado",
    )

    const seedSource = fs.readFileSync(path.join(appDir, "lib", "grunenthal-seed.ts"), "utf8")
    assert.equal(
      seedSource.includes("no cumple con la LFPDPPP o su Reglamento, conforme al documento fuente."),
      false,
      "el texto generado de incumplimiento no debe mencionar 'o su Reglamento'",
    )

    const laborPolicyFiles = storedFiles.filter((file) => file.metadata?.individualRecordType === "labor-policy-reference")
    assert.equal(laborPolicyFiles.length, 2)
    assert.equal(laborPolicyFiles.every((file) => file.category === "data-policy-evidence"), true)

    const sofia = users.find((user) => user.email === "sofia.jaimes@grunenthal.com")
    assert.ok(sofia, "debe existir el usuario demo de Sofia")
    assert.equal(sofia.name, "Sofia Jaimes")
    assert.equal(sofia.role, "admin")
    assert.equal(sofia.approved, true)
    assert.equal(Object.values(sofia.modulePermissions).every(Boolean), true)
  })

  it("mapea cada PDF RAT fuente a un subinventario verificado", async () => {
    await seed.seedGrunenthalDemoData()
    const inventories = JSON.parse(global.localStorage.getItem("inventories") || "[]")
    const subInventories = inventories.flatMap((inventory) => inventory.subInventories)
    const withSourcePdf = subInventories.filter((subInventory) => subInventory.grunenthalSourcePdfFileId)
    const withoutSourcePdf = subInventories.filter((subInventory) => subInventory.grunenthalSourcePdfStatus === "sin-pdf")
    const validationReport = ratData.GRUNENTHAL_RAT_VALIDATION_REPORT

    assert.equal(withSourcePdf.length, 37)
    assert.equal(withoutSourcePdf.length, 2)
    assert.equal(validationReport.canonicalInventoryCount, 16)
    assert.equal(validationReport.canonicalSubInventoryCount, 39)
    assert.equal(validationReport.missingPdfCount, 2)
    assert.equal(validationReport.unmatchedPdfCount, 0)
    assert.equal(validationReport.fieldMismatchCount, 0)
    assert.equal(
      subInventories.filter((subInventory) => subInventory.grunenthalValidationStatus === "verificado").length,
      37,
    )
    assert.equal(
      subInventories.some((subInventory) => subInventory.databaseName === "Ranking de efectividad"),
      true,
    )
    const openDataVeeva = subInventories.find((subInventory) =>
      subInventory.databaseName.includes("Open Data") &&
      subInventory.databaseName.includes("Veeva"),
    )
    assert.ok(openDataVeeva, "debe cargarse Open Data Veeva dentro de COMEX")
    assert.equal(openDataVeeva.responsibleArea, "COMEX")
    assert.equal(openDataVeeva.processingSystemName, "OPEN DATA (Veeva)")
    assert.equal(openDataVeeva.personalData.length, 11)
    assert.equal(openDataVeeva.grunenthalSourcePdfStatus, "vinculado")
    assert.equal(openDataVeeva.grunenthalValidationStatus, "verificado")
    assert.match(
      openDataVeeva.grunenthalSourcePdfPath,
      /\/client\/grunenthal\/rat\/comex\/inventario-comex-open-data-veeva-registro-de-medicos\.pdf$/,
    )

    const xeomeenReport = subInventories.find((subInventory) =>
      subInventory.databaseName === "Reporte de Distribuidores Xeomeen"
    )
    assert.ok(xeomeenReport, "debe cargarse Reporte de Distribuidores Xeomeen dentro de Ventas Internas")
    assert.equal(xeomeenReport.responsibleArea, "Ventas Internas")
    assert.equal(xeomeenReport.personalData.length, 13)
    assert.equal(xeomeenReport.grunenthalSourcePdfStatus, "vinculado")
    assert.equal(xeomeenReport.grunenthalValidationStatus, "verificado")
    assert.match(
      xeomeenReport.grunenthalSourcePdfPath,
      /\/client\/grunenthal\/rat\/ventas-internas\/inventario-ventas-internas-reporte-de-distribuidores-xeomeen\.pdf$/,
    )

    const hr = inventories.find((inventory) => inventory.databaseName === "HR")
    assert.ok(hr, "debe cargarse el área HR")
    assert.equal(hr.subInventories.length, 6)

    const gptw = hr.subInventories.find(
      (subInventory) => subInventory.databaseName === "Encuestas a Empleados (GreatPlaceToWork)",
    )
    assert.ok(gptw, "debe cargarse Encuestas a Empleados (GreatPlaceToWork) dentro de HR")
    assert.equal(gptw.responsibleArea, "Recursos Humanos")
    assert.equal(gptw.processingSystemName, "Sistema GPTW")
    assert.equal(gptw.personalData.length, 9)
    assert.equal(gptw.grunenthalSourcePdfStatus, "sin-pdf")
    assert.equal(gptw.grunenthalValidationStatus, "pendiente-revision")

    const employeeRecognitions = hr.subInventories.find(
      (subInventory) => subInventory.databaseName === "Plataforma de reconocimientos empleados",
    )
    assert.ok(employeeRecognitions, "debe cargarse Plataforma de reconocimientos empleados dentro de HR")
    assert.equal(employeeRecognitions.responsibleArea, "Recursos Humanos")
    assert.equal(employeeRecognitions.processingSystemName, "YOU")
    assert.equal(employeeRecognitions.personalData.length, 6)
    assert.equal(employeeRecognitions.grunenthalSourcePdfStatus, "sin-pdf")
    assert.equal(employeeRecognitions.grunenthalValidationStatus, "pendiente-revision")

    const plataformas = inventories.find((inventory) => inventory.databaseName === "Plataformas Grünenthal")
    assert.ok(plataformas, "debe cargarse el área Plataformas Grünenthal")
    assert.equal(plataformas.subInventories.length, 2)

    const beyondConnect = plataformas.subInventories.find((subInventory) => subInventory.databaseName === "Beyond / Connect")
    assert.ok(beyondConnect, "debe cargarse Beyond / Connect dentro de Plataformas Grünenthal")
    assert.equal(beyondConnect.responsibleArea, "Plataformas Grünenthal")
    assert.equal(beyondConnect.personalData.length, 10)
    assert.equal(beyondConnect.grunenthalSourcePdfStatus, "vinculado")
    assert.equal(beyondConnect.grunenthalValidationStatus, "verificado")
    assert.match(
      beyondConnect.grunenthalSourcePdfPath,
      /\/client\/grunenthal\/rat\/plataformas-grunenthal\/inventario-plataformas-grunenthal-beyond-connect\.pdf$/,
    )

    const contactoGrt = plataformas.subInventories.find(
      (subInventory) => subInventory.databaseName === "Formulario de Contacto Página GRT",
    )
    assert.ok(contactoGrt, "debe cargarse Formulario de Contacto Página GRT dentro de Plataformas Grünenthal")
    assert.equal(contactoGrt.responsibleArea, "Plataformas Grünenthal")
    assert.equal(contactoGrt.personalData.length, 9)
    assert.equal(contactoGrt.grunenthalSourcePdfStatus, "vinculado")
    assert.equal(contactoGrt.grunenthalValidationStatus, "verificado")
    assert.match(
      contactoGrt.grunenthalSourcePdfPath,
      /\/client\/grunenthal\/rat\/plataformas-grunenthal\/inventario-plataformas-grunenthal-formulario-de-contacto-pagina-grt\.pdf$/,
    )

    assert.equal(
      plataformas.subInventories.every((subInventory) =>
        subInventory.personalData.every((field) =>
          field.purposesPrimary.every((purpose) => !purpose.trim().startsWith("•")),
        ),
      ),
      true,
      "las finalidades de Plataformas Grünenthal deben guardarse sin viñetas crudas para el PDF",
    )
  })

  it("reemplaza inventarios locales viejos y limpia progreso RAT al migrar la versión", async () => {
    global.localStorage.setItem(
      "inventories",
      JSON.stringify([
        {
          id: "inventario-viejo",
          databaseName: "Inventario anterior",
          subInventories: [{ id: "sub-viejo", databaseName: "Mezcla previa" }],
        },
      ]),
    )
    global.localStorage.setItem(
      "inventories_progress",
      JSON.stringify({ id: "progreso-viejo", databaseName: "Borrador anterior" }),
    )

    await seed.seedGrunenthalDemoData()

    const inventories = JSON.parse(global.localStorage.getItem("inventories") || "[]")
    const subInventories = inventories.flatMap((inventory) => inventory.subInventories)

    assert.equal(inventories.length, 16)
    assert.equal(subInventories.length, 39)
    assert.equal(inventories.some((inventory) => inventory.id === "inventario-viejo"), false)
    assert.equal(global.localStorage.getItem("inventories_progress"), null)
    assert.equal(
      subInventories.filter((subInventory) => subInventory.grunenthalSourcePdfStatus === "vinculado").length === 37 &&
        subInventories.filter((subInventory) => subInventory.grunenthalSourcePdfStatus === "sin-pdf").length === 2,
      true,
    )
  })

  it("crea URLs solo para contenidos seguros y rutas públicas permitidas", () => {
    assert.equal(fileStorage.createFileURL("data:application/pdf;base64,AAAA"), "data:application/pdf;base64,AAAA")
    assert.equal(fileStorage.createFileURL("blob:https://example.test/abc"), "blob:https://example.test/abc")
    assert.equal(
      fileStorage.createFileURL("/client/grunenthal/rat/comex/comex-ranking-de-efectividad.pdf"),
      "/client/grunenthal/rat/comex/comex-ranking-de-efectividad.pdf",
    )

    assert.throws(() => fileStorage.createFileURL("https://example.com/file.pdf"), /URL de archivo no permitida/)
    assert.throws(() => fileStorage.createFileURL("javascript:alert(1)"), /URL de archivo no permitida/)
    assert.throws(() => fileStorage.createFileURL("/api/admin/export"), /URL de archivo no permitida/)
    assert.throws(() => fileStorage.createFileURL("../secret.pdf"), /URL de archivo no permitida/)
  })
})
