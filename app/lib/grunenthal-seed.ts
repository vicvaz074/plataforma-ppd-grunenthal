import {
  GRUNENTHAL_CLIENT_NAME,
  GRUNENTHAL_DOCUMENT_MANIFEST,
  GRUNENTHAL_LOGO,
  type GrunenthalAsset,
} from "@/lib/grunenthal-assets"
import {
  GRUNENTHAL_LOGO_DATA_URL,
  GRUNENTHAL_RAT_INVENTORIES,
  GRUNENTHAL_RAT_PDF_LINKS,
  GRUNENTHAL_RAT_SOURCE_EXPORTED_AT,
  GRUNENTHAL_RAT_VALIDATION_REPORT,
} from "@/lib/grunenthal-rat-data"
import {
  GRUNENTHAL_ADMIN_EMAIL,
  GRUNENTHAL_ADMIN_NAME,
  ensureGrunenthalAdminUser,
} from "@/lib/user-permissions"
import type { StoredFile } from "@/lib/fileStorage"
import type { Inventory } from "@/app/rat/types"

export const GRUNENTHAL_SEED_VERSION = "2026.1.0"
export const GRUNENTHAL_SEED_STATE_KEY = "grunenthal_seed_state_v1"

const STORED_FILES_KEY = "storedFiles"
const INVENTORIES_KEY = "inventories"
const TRAINING_STORE_KEY = "davara-training-store-v1"
const TRAINING_RESOURCES_KEY = "davara-training-recursos-v1"
const POLICY_STORAGE_KEY = "security_policies"
const CONTRACTS_STORAGE_KEY = "contractsHistory"
const ARCO_PROCEDURE_POLICY_KEY = "arcoProcedurePolicyLinkV1"
const DPO_ACCREDITATION_HISTORY_KEY = "dpo-accreditation-history"
const RAT_VALIDATION_STORAGE_KEY = "grunenthal_rat_validation_report_v1"

const SEEDED_AT = "2026-01-01T00:00:00.000Z"
const TRAINING_PROGRAM_ID = "grunenthal-training-privacy-2026"

type JsonRecord = Record<string, unknown>
type RatPdfLink = (typeof GRUNENTHAL_RAT_PDF_LINKS)[number]
type SeededSubInventory = Inventory["subInventories"][number] & {
  grunenthalSourcePdfFileId?: string
  grunenthalSourcePdfPath?: string
  grunenthalSourcePdfStatus?: string
  grunenthalValidationStatus?: string
  grunenthalValidationFields?: readonly string[]
  grunenthalValidationMismatches?: readonly string[]
}
type SeededInventory = Inventory & {
  subInventories: SeededSubInventory[]
}

function hasStorage() {
  return typeof localStorage !== "undefined"
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasStorage()) return
  localStorage.setItem(key, JSON.stringify(value))
}

function notifyStorageChange() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("storage"))
  }
}

function seededFileId(assetId: string) {
  return `grunenthal-file-${assetId}`
}

function buildStoredFile(asset: GrunenthalAsset): StoredFile {
  return {
    id: seededFileId(asset.id),
    name: asset.name,
    type: asset.type,
    size: asset.size,
    content: asset.path,
    uploadDate: SEEDED_AT,
    category: asset.category,
    metadata: {
      client: GRUNENTHAL_CLIENT_NAME,
      clientSeed: "grunenthal-2026",
      grunenthalAssetId: asset.id,
      grunenthalSeedVersion: GRUNENTHAL_SEED_VERSION,
      module: asset.module,
      publicPath: asset.path,
      sourceRelativePath: asset.sourceRelativePath,
      folder: asset.folder,
      extension: asset.extension,
      title: asset.displayName,
      ...(asset.ratAreaFolder ? { ratAreaFolder: asset.ratAreaFolder } : {}),
      ...(asset.ratPdfTitle ? { ratPdfTitle: asset.ratPdfTitle } : {}),
    },
  }
}

function upsertSeededFiles() {
  const seededFiles = GRUNENTHAL_DOCUMENT_MANIFEST.map(buildStoredFile)
  const seededIds = new Set(seededFiles.map((file) => file.id))
  const existing = readJson<StoredFile[]>(STORED_FILES_KEY, [])
  const userFiles = existing.filter((file) => !seededIds.has(file.id))
  writeJson(STORED_FILES_KEY, [...userFiles, ...seededFiles])
}

function pdfLinkBySubInventoryId(): Map<string, RatPdfLink> {
  return new Map<string, RatPdfLink>(GRUNENTHAL_RAT_PDF_LINKS.map((link) => [link.subInventoryId, link]))
}

function buildSeededInventories(): SeededInventory[] {
  const links = pdfLinkBySubInventoryId()

  return GRUNENTHAL_RAT_INVENTORIES.map((inventory) => ({
    ...inventory,
    responsible: inventory.responsible || GRUNENTHAL_CLIENT_NAME,
    companyLogoDataUrl: GRUNENTHAL_LOGO_DATA_URL,
    companyLogoFileName: "grunenthal-logo-green.png",
    companyLogoPublicPath: GRUNENTHAL_LOGO.path,
    reportAccentColor: inventory.reportAccentColor || "#40BB6A",
    grunenthalSeedVersion: GRUNENTHAL_SEED_VERSION,
    grunenthalSourceExportedAt: GRUNENTHAL_RAT_SOURCE_EXPORTED_AT,
    subInventories: inventory.subInventories.map((subInventory) => {
      const link = links.get(String(subInventory.id))
      const sourceFields = link
        ? {
            grunenthalSourcePdfFileId: seededFileId(link.assetId),
            grunenthalSourcePdfPath: link.publicPath,
            grunenthalSourcePdfStatus: "vinculado",
            grunenthalValidationStatus: link.mismatchedFields.length > 0 ? "requiere-revision" : "verificado",
            grunenthalValidationFields: [...link.validatedFields],
            grunenthalValidationMismatches: [...link.mismatchedFields],
          }
        : {
            grunenthalSourcePdfStatus: "sin-pdf",
            grunenthalValidationStatus: "pendiente-revision",
          }

      return {
        ...subInventory,
        ...sourceFields,
      }
    }),
  }))
}

function mergeSubInventories(seed: SeededSubInventory[], current: Inventory["subInventories"]) {
  const currentById = new Map(current.map((subInventory) => [subInventory.id, subInventory]))
  return seed.map((seedSubInventory) => ({
    ...seedSubInventory,
    ...(currentById.get(seedSubInventory.id) || {}),
    grunenthalSourcePdfFileId: seedSubInventory.grunenthalSourcePdfFileId,
    grunenthalSourcePdfPath: seedSubInventory.grunenthalSourcePdfPath,
    grunenthalSourcePdfStatus: seedSubInventory.grunenthalSourcePdfStatus,
    grunenthalValidationStatus: seedSubInventory.grunenthalValidationStatus,
    grunenthalValidationFields: seedSubInventory.grunenthalValidationFields,
    grunenthalValidationMismatches: seedSubInventory.grunenthalValidationMismatches,
  }))
}

function upsertInventories() {
  const seededInventories = buildSeededInventories()
  const existing = readJson<Inventory[]>(INVENTORIES_KEY, [])
  const existingById = new Map(existing.map((inventory) => [inventory.id, inventory]))
  const seededIds = new Set(seededInventories.map((inventory) => inventory.id))
  const preserved = existing.filter((inventory) => !seededIds.has(inventory.id))
  const merged = seededInventories.map((seedInventory) => {
    const current = existingById.get(seedInventory.id)
    if (!current) return seedInventory

    return {
      ...seedInventory,
      ...current,
      companyLogoDataUrl: seedInventory.companyLogoDataUrl,
      companyLogoFileName: seedInventory.companyLogoFileName,
      companyLogoPublicPath: seedInventory.companyLogoPublicPath,
      reportAccentColor: seedInventory.reportAccentColor,
      grunenthalSeedVersion: GRUNENTHAL_SEED_VERSION,
      grunenthalSourceExportedAt: GRUNENTHAL_RAT_SOURCE_EXPORTED_AT,
      subInventories: mergeSubInventories(seedInventory.subInventories, current.subInventories || []),
    }
  })

  writeJson(INVENTORIES_KEY, [...preserved, ...merged])
  writeJson(RAT_VALIDATION_STORAGE_KEY, GRUNENTHAL_RAT_VALIDATION_REPORT)
}

function upsertById<T extends { id: string }>(current: T[], records: T[]) {
  const recordIds = new Set(records.map((record) => record.id))
  return [...current.filter((record) => !recordIds.has(record.id)), ...records]
}

function assetsForModule(module: string) {
  return GRUNENTHAL_DOCUMENT_MANIFEST.filter((asset) => asset.module === module)
}

function seedTraining() {
  const resources = assetsForModule("davara-training")
  const storedResources = readJson<Array<JsonRecord & { id: string }>>(TRAINING_RESOURCES_KEY, [])
  const seededResources = resources.map((asset) => ({
    id: `grunenthal-training-resource-${asset.id}`,
    programaId: TRAINING_PROGRAM_ID,
    nombre: asset.displayName,
    tipo: "documento",
    descripcion: "Material de capacitación Grünenthal 2026 cargado como recurso del programa de privacidad.",
    url: asset.path,
    archivo: asset.name,
    tamano: `${Math.max(1, Math.round(asset.size / 1024))} KB`,
    fechaSubida: SEEDED_AT.slice(0, 10),
    subidoPor: "Sistema",
    storageFileId: seededFileId(asset.id),
  }))

  writeJson(TRAINING_RESOURCES_KEY, upsertById(storedResources, seededResources))

  const persisted = readJson<{ state?: JsonRecord; version?: number }>(TRAINING_STORE_KEY, { state: {}, version: 0 })
  const state = persisted.state || {}
  const currentPrograms = Array.isArray(state.programas) ? (state.programas as Array<JsonRecord & { id: string }>) : []
  const seededProgram = {
    id: TRAINING_PROGRAM_ID,
    nombre: "Capacitación Grünenthal - Protección de datos 2026",
    clave: "CAP-2026-GRT",
    tipo: "concienciacion",
    objetivo: "Sensibilizar al personal sobre principios LFPDPPP, derechos ARCO, phishing y buenas prácticas de protección de datos.",
    temasCubiertosIds: [],
    audiencia: "todos",
    modalidad: "elearning",
    duracionHoras: 1,
    periodicidad: "anual",
    aplicaANuevoIngreso: true,
    requiereEvaluacion: false,
    calificacionMinima: 80,
    instructor: "Davara / Grünenthal",
    instructorTipo: "externo",
    instructorOrg: "Davara",
    materialesUrls: resources.map((asset) => asset.path),
    referenciaNormativa: ["LFPDPPP", "Reglamento de la LFPDPPP"],
    estado: "activo",
    fechaCreacion: SEEDED_AT.slice(0, 10),
    fechaUltimaRevision: SEEDED_AT.slice(0, 10),
  }

  writeJson(TRAINING_STORE_KEY, {
    ...persisted,
    version: persisted.version ?? 0,
    state: {
      ...state,
      programas: upsertById(currentPrograms, [seededProgram]),
      _contadorPrograma: Math.max(Number(state._contadorPrograma || 0), 1),
    },
  })
}

function buildPolicyRecord() {
  const policyAssets = GRUNENTHAL_DOCUMENT_MANIFEST.filter((asset) =>
    ["data-policies", "security-system", "privacy-notices"].includes(asset.module),
  )
  const fileIds = policyAssets.map((asset) => seededFileId(asset.id))

  return {
    schemaVersion: 2,
    id: "grunenthal-policy-program-2026",
    policyType: "PGDP",
    title: "Programa documental de protección de datos Grünenthal 2026",
    referenceCode: "GRT-PDP-2026",
    versionLabel: "1.0",
    status: "PUBLISHED",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    publishedAt: SEEDED_AT,
    approvalDate: SEEDED_AT.slice(0, 10),
    effectiveDate: SEEDED_AT.slice(0, 10),
    reviewCycleMonths: 12,
    orgName: GRUNENTHAL_CLIENT_NAME,
    orgSector: "Farmacéutico",
    ownerArea: "Departamento de Datos Personales",
    ownerContact: GRUNENTHAL_ADMIN_EMAIL,
    assignedAreas: ["COMEX", "Human Resources", "Medical", "Primary Care", "IT", "Dirección General"],
    approvedBy: ["Dirección General", "Departamento de Datos Personales"],
    workflow: [],
    evidence: [
      {
        id: "grunenthal-policy-evidence-documents-2026",
        type: "supporting-document",
        title: "Documentos oficiales Grünenthal 2026",
        description: "Políticas, lineamientos, seguridad, avisos de privacidad y documentos complementarios cargados para la demo.",
        createdAt: SEEDED_AT,
        createdBy: "Sistema",
        fileIds,
      },
    ],
    readingAcknowledgements: [],
    linkedModules: [
      { moduleId: "rat", active: true, note: "RAT consolidado por área cargado desde el JSON fuente." },
      { moduleId: "arco-rights", active: true, note: "Manual y matriz ARCO disponibles como evidencia." },
      { moduleId: "security-system", active: true, note: "Políticas SGSDP, EIPD y vulneraciones disponibles." },
    ],
    coverage: {
      document: 1,
      principles: 1,
      duties: 1,
      communications: 1,
      arco: 1,
      opd: 1,
      sgdp: 1,
      expediente: 1,
    },
    versions: [
      {
        id: "grunenthal-policy-version-2026",
        versionLabel: "1.0",
        createdAt: SEEDED_AT,
        createdBy: "Sistema",
        changeLog: "Carga inicial del expediente documental Grünenthal 2026.",
        statusAtPublication: "PUBLISHED",
      },
    ],
    content: {
      document: {
        classification: "Interno",
        referenceCode: "GRT-PDP-2026",
        authorName: "Departamento de Datos Personales",
        ownerArea: "Departamento de Datos Personales",
        versionLabel: "1.0",
      },
      context: {
        organizationDescription: "Grünenthal México, organización del sector farmacéutico.",
        mission: "Gestionar tratamientos de datos personales con cumplimiento, seguridad y trazabilidad.",
        sector: "Farmacéutico",
      },
      scope: {
        statement: "Aplica a los tratamientos de datos personales identificados en el RAT y a las áreas relevantes de Grünenthal.",
        appliesTo: ["Personal interno", "Terceros", "Profesionales de la salud", "Proveedores", "Candidatos"],
        dataCategories: ["Identificación", "Contacto", "Laboral", "Académicos", "Patrimoniales", "Salud cuando aplique"],
      },
      objectives: [
        "Conservar evidencia documental vigente para la operación de privacidad.",
        "Vincular políticas, RAT, ARCO, seguridad y terceros en una biblioteca accesible.",
      ],
      principles: ["Licitud", "Consentimiento", "Información", "Calidad", "Finalidad", "Lealtad", "Proporcionalidad", "Responsabilidad"],
      duties: {
        securityMeasures: ["Mantener RAT actualizado.", "Documentar accesos, conservación y comunicación de datos."],
        confidentialityMeasures: ["Gestionar compromisos de confidencialidad con personal y terceros."],
      },
      communications: {
        legalInstrumentSummary: "Las remisiones y transferencias se documentan con instrumentos jurídicos y análisis de terceros.",
        hasProcessors: true,
        hasInternationalTransfers: true,
      },
      arco: {
        medium: "Manual y matriz ARCO Grünenthal.",
        identityVerification: "Conforme al manual de derechos ARCO cargado.",
        trackingProcedure: "Matriz de control y seguimiento del ejercicio de derechos ARCO.",
        revocationProcedure: "Procedimiento documentado en manual ARCO.",
        limitationProcedure: "Procedimiento documentado en manual ARCO.",
      },
      opd: {
        departmentName: "Departamento de Datos Personales",
        officerName: GRUNENTHAL_ADMIN_NAME,
        officerContact: GRUNENTHAL_ADMIN_EMAIL,
      },
      sgdp: {
        monitoringSummary: "Política SGSDP, EIPD y vulneraciones cargadas como evidencia.",
        auditsSummary: "La validación del RAT queda documentada en el reporte de carga.",
        improvementSummary: "Los faltantes se registran como pendientes de revisión.",
      },
      sanctions: "Conforme a políticas internas y normativa aplicable.",
      complementaryDocuments: policyAssets.map((asset) => asset.name),
      signatures: [],
      notes: "Registro generado automáticamente desde la carpeta Políticas de Grünenthal (2026).",
    },
    generalObjective: "Mantener el programa documental de protección de datos personales de Grünenthal accesible en la plataforma.",
    generalGuidelines: "Todos los documentos fuente se conservan como archivos públicos versionados de la demo.",
    scope: ["Personal interno", "Terceros", "Profesionales de la salud", "Proveedores", "Candidatos"],
    principles: ["Licitud", "Consentimiento", "Información", "Calidad", "Finalidad", "Lealtad", "Proporcionalidad", "Responsabilidad"],
    notes: "Registro generado automáticamente desde la carpeta Políticas de Grünenthal (2026).",
    relatedPolicies: policyAssets.map((asset) => asset.name),
    reviewFrequency: "12 meses",
    reviewResponsibles: "Departamento de Datos Personales",
    responsibleArea: "Departamento de Datos Personales",
    responsibleContact: GRUNENTHAL_ADMIN_EMAIL,
    approvalResponsibles: "Dirección General",
    policyDocuments: fileIds.map((fileId, index) => ({
      fileId,
      name: policyAssets[index]?.name || "Documento Grünenthal",
    })),
  }
}

function seedPolicyProgram() {
  const current = readJson<Array<JsonRecord & { id: string }>>(POLICY_STORAGE_KEY, [])
  writeJson(POLICY_STORAGE_KEY, upsertById(current, [buildPolicyRecord()]))
}

function seedArcoProcedure() {
  const arcoAssets = assetsForModule("arco-rights")
  const current = readJson<JsonRecord>(ARCO_PROCEDURE_POLICY_KEY, {})
  const supplementaryEvidence = arcoAssets.map((asset) => ({
    id: `grunenthal-arco-evidence-${asset.id}`,
    title: asset.displayName,
    description: "Documento ARCO Grünenthal 2026 cargado desde el expediente del cliente.",
    fileId: seededFileId(asset.id),
    fileName: asset.name,
    createdAt: SEEDED_AT,
    createdBy: "Sistema",
  }))

  writeJson(ARCO_PROCEDURE_POLICY_KEY, {
    linkedPolicyId: "grunenthal-policy-program-2026",
    linkedVersionId: "grunenthal-policy-version-2026",
    linkedReferenceCode: "GRT-PDP-2026",
    linkedTitle: "Programa documental de protección de datos Grünenthal 2026",
    linkedVersionLabel: "1.0",
    linkedAt: SEEDED_AT,
    linkedBy: "Sistema",
    notes: "Manual y matriz ARCO cargados como evidencia del procedimiento.",
    ...current,
    supplementaryEvidence: upsertById(
      Array.isArray(current.supplementaryEvidence) ? (current.supplementaryEvidence as Array<JsonRecord & { id: string }>) : [],
      supplementaryEvidence,
    ),
    updatedAt: SEEDED_AT,
  })
}

function seedThirdPartyContracts() {
  const thirdPartyAssets = assetsForModule("third-party-contracts")
  const current = readJson<Array<JsonRecord & { id: string }>>(CONTRACTS_STORAGE_KEY, [])
  const record = {
    id: "grunenthal-third-party-framework-2026",
    created: SEEDED_AT,
    contractMode: "marco",
    contractTitle: "Expediente de relaciones con terceros Grünenthal 2026",
    internalCode: "GRT-TER-2026",
    contractType: "Manual / análisis / cuestionario",
    contractStatus: "vigente",
    contractorType: "proveedor",
    providerIdentity: "Terceros y proveedores Grünenthal",
    thirdPartyTypes: ["encargado", "proveedor"],
    thirdPartyName: "Expediente general de terceros",
    areas: ["Compras", "Departamento de Datos Personales"],
    serviceTypes: ["servicios_profesionales"],
    treatmentPurpose: "Evaluar y documentar relaciones con terceros que tratan o acceden a datos personales.",
    dataCategories: ["identificacion", "contacto", "laboral"],
    dataVolume: "Variable",
    relationType: "encargado",
    instrumentTypes: ["contrato", "dpa", "cuestionario"],
    formalized: "si",
    baseLegal: ["relacion_juridica"],
    guarantees: ["clausulas_contractuales", "cuestionario"],
    contractValidity: "indefinida",
    startDate: SEEDED_AT.slice(0, 10),
    expirationDate: "2026-12-31",
    durationType: "anual",
    reviewFrequency: "anual",
    terminationClause: true,
    communicationType: "remision",
    clauseRegulation: "Incluye obligaciones de confidencialidad, seguridad y tratamiento conforme a instrucciones.",
    evidenceAvailable: ["manual", "cuestionario", "analisis"],
    responsibleName: GRUNENTHAL_ADMIN_NAME,
    responsibleRole: "Administrador demo",
    lastReview: SEEDED_AT.slice(0, 10),
    nextReview: "2026-12-31",
    reminders: [],
    linkedInventories: "RAT Grünenthal 2026",
    riskLevel: "medio",
    riskNotes: "Registro semilla creado a partir del expediente documental de terceros.",
    versioningNotes: "Carga inicial demo 2026.",
    reviewLog: "Documentos cargados y disponibles como anexos.",
    attachments: thirdPartyAssets.map((asset) => ({
      fileName: asset.name,
      definition: "evidencia",
      storageId: seededFileId(asset.id),
      category: asset.category,
    })),
  }

  writeJson(CONTRACTS_STORAGE_KEY, upsertById(current, [record]))
}

function seedDpoAccreditation() {
  const current = readJson<Array<JsonRecord & { id: string }>>(DPO_ACCREDITATION_HISTORY_KEY, [])
  const dpoAssets = assetsForModule("dpo")
  const record = {
    id: "grunenthal-dpo-accreditation-2026",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    source: "migration",
    dpoName: "Departamento de Datos Personales Grünenthal",
    dpoRole: "oficial",
    dpoRoleOther: "",
    dpoArea: "juridico",
    dpoAreaOther: "",
    designationDate: SEEDED_AT.slice(0, 10),
    plannedNextReview: "2026-12-31",
    notes: "Acta de designación y manual del departamento cargados como evidencia documental.",
    responses: {},
    analysis: {
      score: 0,
      level: "Crítico — acción inmediata",
      qualifies: false,
      criticalInvalidation: false,
      blockScores: [],
      criticalFindings: [],
      observations: dpoAssets.map((asset) => `Evidencia cargada pendiente de calificación: ${asset.name}`),
      actions: ["Completar la evaluación de acreditación del Departamento de Datos Personales."],
    },
  }

  writeJson(DPO_ACCREDITATION_HISTORY_KEY, upsertById(current, [record]))
}

export async function seedGrunenthalDemoData() {
  if (!hasStorage()) return

  upsertSeededFiles()
  upsertInventories()
  seedTraining()
  seedPolicyProgram()
  seedArcoProcedure()
  seedThirdPartyContracts()
  seedDpoAccreditation()
  ensureGrunenthalAdminUser()

  writeJson(GRUNENTHAL_SEED_STATE_KEY, {
    version: GRUNENTHAL_SEED_VERSION,
    seededAt: new Date().toISOString(),
    assetCount: GRUNENTHAL_DOCUMENT_MANIFEST.length,
    inventoryCount: GRUNENTHAL_RAT_VALIDATION_REPORT.canonicalInventoryCount,
    subInventoryCount: GRUNENTHAL_RAT_VALIDATION_REPORT.canonicalSubInventoryCount,
    mappedPdfCount: GRUNENTHAL_RAT_VALIDATION_REPORT.mappedPdfCount,
    missingPdfCount: GRUNENTHAL_RAT_VALIDATION_REPORT.missingPdfCount,
    fieldMismatchCount: GRUNENTHAL_RAT_VALIDATION_REPORT.fieldMismatchCount,
  })

  notifyStorageChange()
}
