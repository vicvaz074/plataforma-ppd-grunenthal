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

  before(async () => {
    assets = await importModule("lib/grunenthal-assets.ts")
    repository = await importModule("lib/grunenthal-repository.ts")
    seed = await importModule("lib/grunenthal-seed.ts")
    fileStorage = await importModule("lib/fileStorage.ts")
    ratData = await importModule("lib/grunenthal-rat-data.ts")
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
    const individualDocumentCount =
      repository.GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS.length +
      repository.GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.length +
      repository.GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS.length

    assert.equal(inventories.length, 15)
    assert.equal(
      inventories.reduce((total, inventory) => total + inventory.subInventories.length, 0),
      33,
    )
    assert.equal(storedFiles.length, assets.GRUNENTHAL_DOCUMENT_MANIFEST.length + individualDocumentCount)
    assert.equal(new Set(storedFiles.map((file) => file.id)).size, storedFiles.length)
    assert.equal(
      storedFiles.every((file) => file.metadata.createdBy === "Admin"),
      true,
      "los archivos precargados sin autor deben aparecer como creados por Admin",
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
    assert.equal(individualNotices.length, 11)
    assert.equal(individualNotices.every((file) => file.category === "privacy-notice"), true)
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
    const individualContracts = contracts.filter((contract) => contract.metadata?.sourceCompiledAssetId === "grunenthal-third-party-contracts-analisisderelacionesgrunenthal")
    assert.equal(individualContractFiles.length, 32)
    assert.equal(individualContracts.length, 32)
    assert.equal(
      individualContracts.every((contract) =>
        contract.attachments?.some((attachment) =>
          individualContractFiles.some((file) => file.id === attachment.storageId && file.metadata?.individualRecordId === contract.metadata?.individualRecordId),
        ),
      ),
      true,
      "cada contrato individual debe enlazar su DOCX original con preview PDF",
    )

    const coradContract = individualContracts.find((contract) =>
      contract.providerIdentity.includes("CORAD MEETING PLANNER"),
    )
    assert.ok(coradContract, "debe sembrarse el contrato individual de CORAD")
    assert.equal(coradContract.clauseComplianceStatus, "no_aplica")
    assert.equal(coradContract.clauseComplianceLabel, "N/A")
    assert.match(coradContract.clauseRegulation, /N\/A/)
    assert.equal(coradContract.metadata?.clauseComplianceStatus, "no-aplica")

    const upsContract = individualContracts.find((contract) =>
      contract.providerIdentity.includes("UPS SCS"),
    )
    assert.ok(upsContract, "debe sembrarse el contrato individual de UPS")
    assert.equal(upsContract.clauseComplianceStatus, "requiere_revision")
    assert.equal(upsContract.clauseComplianceLabel, "Sí cumple")
    assert.equal(upsContract.riskLevel, "medio")
    assert.match(upsContract.clauseComplianceNotes, /contradicción/i)

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

    assert.equal(withSourcePdf.length, 33)
    assert.equal(withoutSourcePdf.length, 0)
    assert.equal(validationReport.canonicalInventoryCount, 15)
    assert.equal(validationReport.canonicalSubInventoryCount, 33)
    assert.equal(validationReport.missingPdfCount, 0)
    assert.equal(validationReport.unmatchedPdfCount, 0)
    assert.equal(validationReport.fieldMismatchCount, 0)
    assert.equal(
      subInventories.every((subInventory) => subInventory.grunenthalValidationStatus === "verificado"),
      true,
    )
    assert.equal(
      subInventories.some((subInventory) => subInventory.databaseName === "Ranking de efectividad"),
      true,
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

    assert.equal(inventories.length, 15)
    assert.equal(subInventories.length, 33)
    assert.equal(inventories.some((inventory) => inventory.id === "inventario-viejo"), false)
    assert.equal(global.localStorage.getItem("inventories_progress"), null)
    assert.equal(
      subInventories.every((subInventory) => subInventory.grunenthalSourcePdfStatus === "vinculado"),
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
