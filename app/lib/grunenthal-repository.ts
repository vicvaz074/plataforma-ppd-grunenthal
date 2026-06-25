import { GRUNENTHAL_DOCUMENT_MANIFEST, type GrunenthalAsset } from "@/lib/grunenthal-assets"
import type { StoredFile } from "@/lib/fileStorage"

export type GrunenthalRepositoryModule = "data-policies" | "privacy-notices" | "third-party-contracts"

export type GrunenthalRepositoryDocument = {
  id: string
  title: string
  module: GrunenthalRepositoryModule
  category: string
  type: string
  area: string
  fileId: string
  originalPath: string
  previewPdfPath?: string
  previewable: boolean
  downloadName: string
  sourceLabel: string
  sourceCompiledAssetId?: string
  sourceLineRange?: string
  sourceRelativePath?: string
  originModule?: GrunenthalAsset["module"]
  policyScope?: GrunenthalPolicyScope
  policyScopeLabel?: string
  tags: string[]
}

export type GrunenthalRepositoryDocumentWithFile = GrunenthalRepositoryDocument & {
  storedFile: StoredFile
}

type IndividualDocumentBase = {
  id: string
  title: string
  slug: string
  module: GrunenthalRepositoryModule
  category: string
  type: string
  area: string
  sourceCompiledAssetId: string
  sourceLabel: string
  sourceRelativePath: string
  lineStart: number
  lineEnd: number
  sourceLineRange: string
  originalPath: string
  previewPdfPath: string
  downloadName: string
  tags: string[]
}

export type GrunenthalPrivacyNoticeSeed = IndividualDocumentBase & {
  holderCategories: string[]
  noticeTypes: string[]
  responsibleAreas: string[]
  applicableNotices: string[]
  dispositionMethods: string[]
  evidenceNotes: string
}

export type GrunenthalThirdPartyContractSeed = IndividualDocumentBase & {
  internalCode: string
  providerIdentity: string
  thirdPartyName: string
  contractTitle: string
  contractObject: string
  communicationType: "remision" | "transferencia" | "mixta" | "sin-comunicacion"
  relationType: "encargado" | "tercero" | "mixta" | "sin-comunicacion"
  contractorType: string
  complianceStatus: "cumple" | "no-cumple" | "no-aplica" | "requiere-revision"
  sourceClauseType: string
  sourceComplianceLabel: string
  sourceRecommendation: string
  sourceComplianceNotes?: string
  recommendedInstrument: string
  riskLevel: "bajo" | "medio" | "alto"
}

export type GrunenthalLaborPolicySeed = IndividualDocumentBase & {
  employmentMode: "tiempo-determinado" | "tiempo-indeterminado"
  recommendedClause: string
}

export type GrunenthalPolicyScope = "mexico" | "global"

export const PRIVACY_NOTICE_SOURCE_ASSET_ID = "grunenthal-privacy-notices-manualap-grunentha-davara-v5"
const THIRD_PARTY_ANALYSIS_SOURCE_ASSET_ID = "grunenthal-third-party-contracts-analisisderelacionesgrunenthal"
const PRIVACY_SOURCE_RELATIVE_PATH = "ManualAP_Grünentha Davara v5.docx"
const THIRD_PARTY_SOURCE_RELATIVE_PATH =
  "PolíticasGRT_Davara/Relaciones con Terceros/AnálisisDeRelacionesGrünenthal .docx"
const ALLOWED_REPOSITORY_MODULES = new Set<GrunenthalRepositoryModule>([
  "data-policies",
  "privacy-notices",
  "third-party-contracts",
])
const STATIC_PREVIEW_EXTENSIONS = new Set(["docx", "docm", "xlsx"])

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

export function getGrunenthalRepositoryFileId(documentId: string) {
  return `grunenthal-file-${documentId}`
}

function previewPathForAsset(asset: GrunenthalAsset) {
  if (!STATIC_PREVIEW_EXTENSIONS.has(asset.extension)) return asset.extension === "pdf" ? asset.path : undefined
  return asset.path.replace(/\.(docx|docm|xlsx)$/i, "-preview.pdf")
}

function repositoryCategoryForAsset(asset: GrunenthalAsset) {
  if (asset.id === PRIVACY_NOTICE_SOURCE_ASSET_ID) return "privacy-policy"
  if (asset.id === "grunenthal-third-party-contracts-1-cuestionario-de-proveedores") return "third-party-template"
  return asset.category
}

function repositoryTypeForCategory(category: string) {
  if (category === "privacy-notice") return "Aviso de privacidad"
  if (category === "privacy-policy") return "Compilado de avisos"
  if (category === "third-party-template") return "Plantilla de terceros"
  if (category === "third-party-contract") return "Contrato / análisis de terceros"
  return "Política y evidencia"
}

function moduleArea(module: GrunenthalRepositoryModule) {
  if (module === "privacy-notices") return "Privacidad"
  if (module === "third-party-contracts") return "Terceros"
  return "Gobernanza de datos"
}

function policyScopeLabel(scope: GrunenthalPolicyScope) {
  return scope === "global" ? "Políticas Globales" : "Políticas México"
}

function individualPath(folder: string, slug: string, extension: "docx" | "pdf") {
  const suffix = extension === "pdf" ? "-preview.pdf" : ".docx"
  return `/client/grunenthal/${folder}/individual/${slug}${suffix}`
}

type ThirdPartyClauseAnalysis = {
  clauseType: string
  complianceLabel: string
  recommendation: string
  notes?: string
}

const THIRD_PARTY_CLAUSE_ANALYSIS_BY_INDEX: Record<number, ThirdPartyClauseAnalysis> = {
  1: {
    clauseType: "(1) Vigésima Primera. Protección de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. En su lugar, se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde el Responsable Receptor garantiza la legalidad de la transferencia de datos personales.",
  },
  2: {
    clauseType: "(1) Vigésima. Protección de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP y su Reglamento. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado.",
  },
  3: {
    clauseType: "(1) Vigésima. Protección de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. En su lugar, se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde el Responsable Receptor garantiza la legalidad de la transferencia de datos personales.",
  },
  4: {
    clauseType: "(1) Vigésima. Protección de Datos Personales",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento.",
  },
  5: {
    clauseType: "(1) Addendum to MSA. (2) Addendum to MSA for MyVeeva for Doctors",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. En su lugar, se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde el Responsable Receptor garantiza la legalidad de la transferencia de datos personales.",
  },
  6: {
    clauseType: "No se encontró cláusula relativa.",
    complianceLabel: "Agregar cláusula",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
    notes: "El documento fuente no localizó cláusula relativa; se requiere agregar la cláusula aplicable.",
  },
  7: {
    clauseType: "Standard Contractual Clauses (Controller to Processor) Del Cloud Agreement",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento.",
  },
  8: {
    clauseType: "(1) Vigésimo. Protección de datos personales",
    complianceLabel: "No cumple",
    recommendation:
      "La falta de cláusula o instrumento jurídico puede implicar una violación al principio de responsabilidad establecido por la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado.",
  },
  9: {
    clauseType: "(1) Vigésima Segunda. Protección de Datos Personales.",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado.",
  },
  10: {
    clauseType: "(1) Vigésima Segunda. Protección de Datos Personales.",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado.",
  },
  11: {
    clauseType: "No se encontró cláusula relativa",
    complianceLabel: "No cumple",
    recommendation:
      "El contrato maestro que regula la gestión de flota no cumple con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado. Respecto al Anexo II del Derecho de Adquisión, no cumple con los requisitos de la LFPDPPP. Se sugiere emplear también la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se delimitan con amplio detalle las obligaciones del Tercero que recibirá datos personales con motivo de una Transferencia",
  },
  12: {
    clauseType: "Vigésima. Protección de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear las cláusulas C1 del Manual de Relaciones con Terceros y/o en su caso los apéndices 2 CM-1 o 3 C-1 para regular la remisión de datos personales. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso los apéndices 2 CM-2 o 3C-2 para regular la transferencia de datos personales de empleados del proveedor.",
  },
  13: {
    clauseType: "§ 2 Geheimhaltung / Datenschutz",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. En su lugar, se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde el Responsable Receptor garantiza la legalidad de la transferencia de datos personales.",
  },
  14: {
    clauseType: "(1) Vigésima Segunda. Protección de Datos Personales.",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado.",
  },
  15: {
    clauseType: "(1). Vigésima. Protección de Datos Personales.",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear las cláusulas C1 del Manual de Relaciones con Terceros y/o en su caso los apéndices 2 CM-1 o 3 C-1 para regular la remisión de datos personales. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso los apéndices 2 CM-2 o 3 C-2 para regular la transferencia de datos personales de empleados del proveedor.",
  },
  16: {
    clauseType: "(1). Vigésima Tercera. Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  17: {
    clauseType: "(1). Vigésima Primera. Protección de Datos Personales. (2). Anexo 3. Contrato de Procesamiento de Datos. (3) Convenio de Confidencialidad.",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula y anexo establecen que la comunicación de datos es una remisión, lo cual es incorrecto, ya que al ofrecer servicios Telemedicina y otros servicios independientes y ajenos a Grünenthal se debe de considerar como una transferencia de datos personales. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  18: {
    clauseType: "(1). Vigésima Protección de Datos Personales. (2). Anexo 3 Acuerdo Complementario de Protección de Datos",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento.",
  },
  19: {
    clauseType: "(1) Confidencialidad",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula y anexo establecen que la comunicación de datos es una remisión, lo cual es incorrecto, ya que al tener que cumplir obligaciones en materia de prevención de lavado de dinero de manera independiente a GRT se deberá de establecer como transferencia de datos personales. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  20: {
    clauseType: "(1) Artículo 6 Confidenciallidad",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  21: {
    clauseType: "TRIGÉSIMA TERCERA. CONFIDENCIALIDAD YPROTECCIÓN ED DATOS PERSONALES",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  22: {
    clauseType: "(1) ARTICULO 6 - CONFIDENCIALIDAD - PUBLICIDAD",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  23: {
    clauseType: "(1) ARTICULO 6 - CONFIDENCIALIDAD - PUBLICIDAD",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado.",
  },
  24: {
    clauseType: "(1) Décima octava. Privacidad de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado",
  },
  25: {
    clauseType: "(1) Décima primera (2) Décima tercera.",
    complianceLabel: "N/A",
    recommendation:
      "Se sugiere emplear la cláusula C4 del Manual de Relaciones con Terceros donde se delimitan con amplio detalle las obligaciones de los trabajadores en materia de datos personales.",
  },
  26: {
    clauseType: "(1) Décima primera (2) Décima tercera.",
    complianceLabel: "N/A",
    recommendation:
      "Se sugiere emplear la cláusula C4 del Manual de Relaciones con Terceros donde se delimitan con amplio detalle las obligaciones de los trabajadores en materia de datos personales.",
  },
  27: {
    clauseType: "(1) Vigésima Protección de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "Las cláusulas no cumplen con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C1 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-1 o 3 C-1 del mismo donde se delimitan con amplio detalle las obligaciones del Encargado",
  },
  28: {
    clauseType: "(1) Octava. Protección de Datos Personales",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas.",
  },
  29: {
    clauseType: "(1) VIGÉSIMA PRIMERA. MANEJO DE DATOS PERSONALES",
    complianceLabel: "No cumple",
    recommendation:
      "La cláusula no cumple con los requisitos de la LFPDPPP. Se sugiere emplear la cláusula C2 del Manual de Relaciones con Terceros y/o en su caso, los apéndices 2 CM-2 o 3 C-2 del mismo donde se establece la relación entre las partes y sus obligaciones respectivas",
    notes: "El documento fuente marca No cumple y exige cláusula C2.",
  },
  30: {
    clauseType: "(1) DATA PROCESSING AGREEMENT FOR CLOUD SERVICES",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento.",
  },
  31: {
    clauseType: "(1) Apéndice 3 – Cláusulas Contractuales Tipo (Encargados del Tratamiento)",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento",
  },
  32: {
    clauseType: "(1) Acuerdo de procesamiento de datos para servicios SAP CLOUD",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento",
  },
  33: {
    clauseType: "(1) DATA PROCESSING ADDENDUM",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento",
  },
  34: {
    clauseType: "(1) Agreement on Data Protection",
    complianceLabel: "Sí cumple",
    recommendation: "La cláusula si cumplen con los requisitos de la LFPDPPP y su Reglamento",
  },
}

function privacyNotice(seed: {
  slug: string
  title: string
  area: string
  lineStart: number
  lineEnd: number
  holderCategories: string[]
  noticeTypes: string[]
  responsibleAreas: string[]
  applicableNotices: string[]
  dispositionMethods: string[]
  evidenceNotes: string
}): GrunenthalPrivacyNoticeSeed {
  const id = `grunenthal-privacy-notice-${seed.slug}`
  return {
    id,
    title: seed.title,
    slug: seed.slug,
    module: "privacy-notices",
    category: "privacy-notice",
    type: "Aviso de privacidad",
    area: seed.area,
    sourceCompiledAssetId: PRIVACY_NOTICE_SOURCE_ASSET_ID,
    sourceLabel: "ManualAP Grünenthal Davara v5",
    sourceRelativePath: PRIVACY_SOURCE_RELATIVE_PATH,
    lineStart: seed.lineStart,
    lineEnd: seed.lineEnd,
    sourceLineRange: `${seed.lineStart}-${seed.lineEnd}`,
    originalPath: individualPath("privacy-notices", seed.slug, "docx"),
    previewPdfPath: individualPath("privacy-notices", seed.slug, "pdf"),
    downloadName: `${seed.title}.docx`,
    tags: ["aviso de privacidad", ...seed.noticeTypes, seed.area],
    holderCategories: seed.holderCategories,
    noticeTypes: seed.noticeTypes,
    responsibleAreas: seed.responsibleAreas,
    applicableNotices: seed.applicableNotices,
    dispositionMethods: seed.dispositionMethods,
    evidenceNotes: seed.evidenceNotes,
  }
}

export const GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS: GrunenthalPrivacyNoticeSeed[] = [
  privacyNotice({
    slug: "aviso-candidatos",
    title: "Aviso de Privacidad Integral para Candidatos",
    area: "Human Resources",
    lineStart: 65,
    lineEnd: 140,
    holderCategories: ["candidatos"],
    noticeTypes: ["integral"],
    responsibleAreas: ["recursos_humanos"],
    applicableNotices: ["reclutamiento_empleo"],
    dispositionMethods: ["formato_fisico", "antes_obtencion"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para candidatos.",
  }),
  privacyNotice({
    slug: "aviso-empleados",
    title: "Aviso de Privacidad Integral para Empleados",
    area: "Human Resources",
    lineStart: 141,
    lineEnd: 239,
    holderCategories: ["empleados"],
    noticeTypes: ["integral"],
    responsibleAreas: ["recursos_humanos"],
    applicableNotices: ["reclutamiento_empleo"],
    dispositionMethods: ["contrato_formulario"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para empleados.",
  }),
  privacyNotice({
    slug: "aviso-empleados-proveedores",
    title: "Aviso de Privacidad Integral para Empleados de Proveedores",
    area: "Compras / Terceros",
    lineStart: 240,
    lineEnd: 308,
    holderCategories: ["proveedores"],
    noticeTypes: ["integral"],
    responsibleAreas: ["compras", "juridico"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["contrato_formulario"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para personal de proveedores.",
  }),
  privacyNotice({
    slug: "aviso-proveedores-persona-fisica",
    title: "Aviso de Privacidad Integral para Proveedores Persona Física",
    area: "Compras / Terceros",
    lineStart: 309,
    lineEnd: 371,
    holderCategories: ["proveedores"],
    noticeTypes: ["integral"],
    responsibleAreas: ["compras", "juridico"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["contrato_formulario"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para proveedores persona física.",
  }),
  privacyNotice({
    slug: "aviso-visitantes-cctv",
    title: "Aviso de Privacidad para Visitantes y CCTV",
    area: "Seguridad / Recepción",
    lineStart: 372,
    lineEnd: 435,
    holderCategories: ["visitantes"],
    noticeTypes: ["integral", "simplificado"],
    responsibleAreas: ["seguridad", "tecnologia"],
    applicableNotices: ["videovigilancia"],
    dispositionMethods: ["formato_fisico", "antes_obtencion"],
    evidenceNotes: "Integra el aviso integral de Visitantes y CCTV y el aviso simplificado E-1 del mismo compilado.",
  }),
  privacyNotice({
    slug: "aviso-healthcare-professional",
    title: "Aviso de Privacidad Integral para Healthcare Professional",
    area: "Medical / COMEX",
    lineStart: 436,
    lineEnd: 521,
    holderCategories: ["consultores"],
    noticeTypes: ["integral"],
    responsibleAreas: ["medical", "comunicacion"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["formato_fisico", "consentimiento_expreso"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para profesionales de la salud.",
  }),
  privacyNotice({
    slug: "aviso-healthcare-professional-educacion-medica",
    title: "Aviso de Privacidad Integral para Healthcare Professional Educación Médica Continua",
    area: "Medical / Educación Médica",
    lineStart: 522,
    lineEnd: 598,
    holderCategories: ["consultores"],
    noticeTypes: ["integral"],
    responsibleAreas: ["medical"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["formato_fisico", "consentimiento_expreso"],
    evidenceNotes: "Extraído del compilado ManualAP para prestadores de servicio de educación médica continua.",
  }),
  privacyNotice({
    slug: "aviso-farmacovigilancia",
    title: "Aviso de Privacidad Integral para Farmacovigilancia",
    area: "Farmacovigilancia",
    lineStart: 599,
    lineEnd: 663,
    holderCategories: ["pacientes", "autoridades"],
    noticeTypes: ["integral"],
    responsibleAreas: ["medical", "farmacovigilancia"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["antes_obtencion", "consentimiento_expreso"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual de farmacovigilancia.",
  }),
  privacyNotice({
    slug: "aviso-donaciones",
    title: "Aviso de Privacidad Integral para Donaciones",
    area: "Donaciones / Jurídico",
    lineStart: 664,
    lineEnd: 728,
    holderCategories: ["socios_comerciales"],
    noticeTypes: ["integral"],
    responsibleAreas: ["juridico", "compliance"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["contrato_formulario"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para donaciones.",
  }),
  privacyNotice({
    slug: "aviso-informacion-medica-quejas",
    title: "Aviso de Privacidad Integral para Información Médica y Quejas",
    area: "Medical / Atención a quejas",
    lineStart: 729,
    lineEnd: 802,
    holderCategories: ["pacientes", "clientes_usuarios_finales"],
    noticeTypes: ["integral"],
    responsibleAreas: ["medical", "farmacovigilancia"],
    applicableNotices: ["especifico_proceso"],
    dispositionMethods: ["antes_obtencion", "consentimiento_expreso"],
    evidenceNotes: "Extraído del compilado ManualAP como aviso individual para información médica y quejas.",
  }),
  privacyNotice({
    slug: "aviso-plataformas",
    title: "Aviso de Privacidad Integral General para Plataformas",
    area: "Plataformas digitales",
    lineStart: 803,
    lineEnd: 898,
    holderCategories: ["usuarios_plataformas", "consultores", "clientes_usuarios_finales"],
    noticeTypes: ["integral"],
    responsibleAreas: ["tecnologia", "comunicacion", "juridico"],
    applicableNotices: ["integral_general", "campanas_formularios"],
    dispositionMethods: ["sitio_web", "antes_obtencion"],
    evidenceNotes: "Extraído del compilado ManualAP v5 como aviso individual general para plataformas digitales.",
  }),
]

function contract(seed: {
  index: number
  analysisIndex?: number
  providerIdentity: string
  area: string
  contractObject: string
  communicationType: GrunenthalThirdPartyContractSeed["communicationType"]
  complianceStatus: GrunenthalThirdPartyContractSeed["complianceStatus"]
  lineStart: number
  lineEnd: number
  recommendedInstrument?: string
  riskLevel?: GrunenthalThirdPartyContractSeed["riskLevel"]
}): GrunenthalThirdPartyContractSeed {
  const internalCode = `GRT-TER-2026-${String(seed.index).padStart(3, "0")}`
  const slug = `${internalCode.toLowerCase()}-${slugify(seed.providerIdentity).slice(0, 70)}`
  const clauseAnalysis = THIRD_PARTY_CLAUSE_ANALYSIS_BY_INDEX[seed.analysisIndex ?? seed.index]
  const relationType =
    seed.communicationType === "remision"
      ? "encargado"
      : seed.communicationType === "transferencia"
        ? "tercero"
        : seed.communicationType === "mixta"
          ? "mixta"
          : "sin-comunicacion"
  const recommendedInstrument =
    seed.recommendedInstrument ||
    (seed.communicationType === "remision"
      ? "Cláusula C1 / apéndice CM-1"
      : seed.communicationType === "transferencia"
        ? "Cláusula C2 / apéndice CM-2"
        : seed.communicationType === "mixta"
          ? "Cláusulas C1 y C2 / apéndices CM-1 y CM-2"
          : "Sin instrumento adicional identificado")
  const riskLevel = seed.riskLevel
    ? seed.riskLevel
    : seed.complianceStatus === "no-aplica"
      ? "medio"
      : seed.communicationType === "sin-comunicacion" || seed.complianceStatus === "cumple"
        ? "bajo"
        : seed.communicationType === "mixta"
          ? "alto"
          : "medio"

  return {
    id: `grunenthal-third-party-contract-${String(seed.index).padStart(3, "0")}`,
    title: `${internalCode} · ${seed.providerIdentity}`,
    slug,
    module: "third-party-contracts",
    category: "third-party-contract",
    type: "Contrato / análisis de terceros",
    area: seed.area,
    sourceCompiledAssetId: THIRD_PARTY_ANALYSIS_SOURCE_ASSET_ID,
    sourceLabel: "Análisis de Relaciones Grünenthal",
    sourceRelativePath: THIRD_PARTY_SOURCE_RELATIVE_PATH,
    lineStart: seed.lineStart,
    lineEnd: seed.lineEnd,
    sourceLineRange: `${seed.lineStart}-${seed.lineEnd}`,
    originalPath: individualPath("third-party-contracts", slug, "docx"),
    previewPdfPath: individualPath("third-party-contracts", slug, "pdf"),
    downloadName: `${internalCode} - ${seed.providerIdentity}.docx`,
    tags: ["terceros", seed.area, seed.communicationType, seed.providerIdentity],
    internalCode,
    providerIdentity: seed.providerIdentity,
    thirdPartyName: seed.providerIdentity,
    contractTitle: `Análisis contractual de ${seed.providerIdentity}`,
    contractObject: seed.contractObject,
    communicationType: seed.communicationType,
    relationType,
    contractorType: seed.communicationType === "transferencia" ? "tercero" : "proveedor",
    complianceStatus: seed.complianceStatus,
    sourceClauseType: clauseAnalysis?.clauseType || "Cláusula no detallada en el extracto fuente.",
    sourceComplianceLabel: clauseAnalysis?.complianceLabel || seed.complianceStatus,
    sourceRecommendation: clauseAnalysis?.recommendation || recommendedInstrument,
    sourceComplianceNotes: clauseAnalysis?.notes,
    recommendedInstrument,
    riskLevel,
  }
}

export const GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS: GrunenthalThirdPartyContractSeed[] = [
  contract({ index: 1, providerIdentity: "CID CENTRO INTEGRADOR DE DATOS, S.A. DE C.V. (Knobloch)", area: "COMEX", contractObject: "Entrega de base de datos electrónica.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 246, lineEnd: 255 }),
  contract({ index: 2, providerIdentity: "NEGOCIOS DE INNOVACIÓN FARMACÉUTICA, S.C.", area: "COMEX", contractObject: "Servicios legales, consultoría, mercadotecnia, asesoría, marcas, inteligencia competitiva y capacitación.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 256, lineEnd: 265 }),
  contract({ index: 3, providerIdentity: "INSTITUTO DE INVESTIGACIÓN E INNOVACIÓN FARMACÉUTICA, A.C. (INEFAM)", area: "COMEX", contractObject: "Suscripción y entrega de reportes por parte de INEFAM.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 266, lineEnd: 278 }),
  contract({ index: 4, providerIdentity: "D&MS DRUGS AND MARKETSHARE, S.C.", area: "COMEX", contractObject: "Generación de sistema de incentivos.", communicationType: "sin-comunicacion", complianceStatus: "cumple", lineStart: 279, lineEnd: 284 }),
  contract({ index: 5, providerIdentity: "VEEVA SYSTEMS INC.", area: "COMEX", contractObject: "Formato de orden de servicios.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 285, lineEnd: 297 }),
  contract({ index: 6, providerIdentity: "CORAD MEETING PLANNER, S.A. DE C.V.", area: "COMPRAS", contractObject: "Operación de grupos, congresos, convenciones, transportación, producción y viajes.", communicationType: "transferencia", complianceStatus: "no-aplica", lineStart: 308, lineEnd: 315 }),
  contract({ index: 7, providerIdentity: "ORO LABS, INC.", area: "COMPRAS", contractObject: "Convenio de nube.", communicationType: "remision", complianceStatus: "cumple", lineStart: 316, lineEnd: 323 }),
  contract({ index: 8, providerIdentity: "CENTRAL MEDIA, S.C.", area: "DIGITAL", contractObject: "Servicios de creación de contenido para Grünenthal.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 334, lineEnd: 341 }),
  contract({ index: 9, providerIdentity: "BESPOKE ADVERTISING, S.A. DE C.V.", area: "DIGITAL", contractObject: "Servicios de marketing y publicidad.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 342, lineEnd: 349 }),
  contract({ index: 10, providerIdentity: "SINERGIS, S.A. DE C.V.", area: "DIGITAL", contractObject: "Marketing, publicidad y administración de la plataforma Beyond.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 350, lineEnd: 357 }),
  contract({ index: 11, providerIdentity: "LEASEPLAN DE MÉXICO, S.A. DE C.V.", area: "FLOTILLA", contractObject: "Arrendamiento puro y servicios de gestión de flota.", communicationType: "mixta", complianceStatus: "no-cumple", lineStart: 369, lineEnd: 382 }),
  contract({ index: 12, providerIdentity: "BACHER ZOPPI, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Servicios especializados relacionados a recursos humanos.", communicationType: "mixta", complianceStatus: "no-cumple", lineStart: 394, lineEnd: 407 }),
  contract({ index: 13, providerIdentity: "HAYS - AG", area: "HUMAN RESOURCES", contractObject: "Servicios de reclutamiento de personal.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 408, lineEnd: 417 }),
  contract({ index: 14, providerIdentity: "GOINTEGRO MÉXICO, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Suscripción de plataforma Grunetemex.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 418, lineEnd: 425 }),
  contract({ index: 15, providerIdentity: "FUO SERVICIOS, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Servicios especializados de seguridad, resguardo y vigilancia.", communicationType: "mixta", complianceStatus: "no-cumple", lineStart: 426, lineEnd: 439 }),
  contract({ index: 16, providerIdentity: "SÍ VALE MÉXICO, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Emisión y gestión de monederos para trabajadores.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 440, lineEnd: 447 }),
  contract({ index: 17, providerIdentity: "BETERFLY MÉXICO, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Plataforma de beneficios de bienestar para trabajadores.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 448, lineEnd: 459 }),
  contract({ index: 18, providerIdentity: "ALPHAPLUS, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Servicios de nómina y recursos humanos.", communicationType: "remision", complianceStatus: "cumple", lineStart: 460, lineEnd: 467 }),
  contract({ index: 19, providerIdentity: "TOKA INTERNACIONAL, S.A.P.I. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Dispersión, carga y recarga de recursos económicos.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 468, lineEnd: 476 }),
  contract({ index: 20, providerIdentity: "MP EXECUTIVE HUNT SA DE CV", area: "HUMAN RESOURCES", contractObject: "Búsqueda de representante CDMX/EM.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 477, lineEnd: 484 }),
  contract({ index: 21, providerIdentity: "SURA INVESTMENT MANAGEMENT MEXICO, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Comisión mercantil y prestación de servicios.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 485, lineEnd: 493 }),
  contract({ index: 22, providerIdentity: "DHL EXPRESS MEXICO SA DE CV", area: "HUMAN RESOURCES", contractObject: "Compra general de productos y mensajería nacional.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 494, lineEnd: 503 }),
  contract({ index: 23, providerIdentity: "CUESTA Y LLACA SC", area: "HUMAN RESOURCES", contractObject: "Trámite migratorio.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 504, lineEnd: 512 }),
  contract({ index: 24, providerIdentity: "SAFE DATA RESOURCES, S.A. DE C.V.", area: "HUMAN RESOURCES", contractObject: "Contrato de depósito.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 513, lineEnd: 520 }),
  contract({ index: 25, analysisIndex: 27, providerIdentity: "SINEFARMA, S.A. DE C.V.", area: "INVESTIGACIÓN DE MERCADOS", contractObject: "Servicios de marketing.", communicationType: "remision", complianceStatus: "no-cumple", lineStart: 546, lineEnd: 554 }),
  contract({ index: 26, analysisIndex: 28, providerIdentity: "Agencias, Asociaciones e Instituciones de Salud", area: "PRIMARY CARE", contractObject: "Contrato de patrocinio.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 565, lineEnd: 572 }),
  contract({ index: 27, analysisIndex: 29, providerIdentity: "UPS SCS (MÉXICO), S.A. DE C.V.", area: "SUPPLY", contractObject: "Almacenamiento, embalaje, surtido, empaque, preparación de pedidos y órdenes de entrega.", communicationType: "transferencia", complianceStatus: "no-cumple", lineStart: 584, lineEnd: 591, riskLevel: "medio" }),
  contract({ index: 28, analysisIndex: 30, providerIdentity: "CONCUR TECHNOLOGIES, INC.", area: "GLOBALES", contractObject: "Servicios de nube.", communicationType: "remision", complianceStatus: "cumple", lineStart: 603, lineEnd: 608 }),
  contract({ index: 29, analysisIndex: 31, providerIdentity: "MICROSOFT CORPORATION", area: "GLOBALES", contractObject: "Licencia para uso de software y servicios en línea.", communicationType: "remision", complianceStatus: "cumple", lineStart: 609, lineEnd: 614 }),
  contract({ index: 30, analysisIndex: 32, providerIdentity: "SAP SE", area: "GLOBALES", contractObject: "Servicios de nube.", communicationType: "remision", complianceStatus: "cumple", lineStart: 615, lineEnd: 620 }),
  contract({ index: 31, analysisIndex: 33, providerIdentity: "SALESFORCE, INC.", area: "GLOBALES", contractObject: "Servicios de software.", communicationType: "remision", complianceStatus: "cumple", lineStart: 621, lineEnd: 626 }),
  contract({ index: 32, analysisIndex: 34, providerIdentity: "EVERSANA, IRELAND, LIMITED", area: "GLOBALES", contractObject: "Servicios vinculados al acuerdo de protección de datos.", communicationType: "remision", complianceStatus: "cumple", lineStart: 627, lineEnd: 632 }),
]

function laborPolicy(seed: {
  slug: string
  title: string
  lineStart: number
  lineEnd: number
  employmentMode: GrunenthalLaborPolicySeed["employmentMode"]
}): GrunenthalLaborPolicySeed {
  const id = `grunenthal-labor-policy-${seed.slug}`
  return {
    id,
    title: seed.title,
    slug: seed.slug,
    module: "data-policies",
    category: "data-policy-evidence",
    type: "Recurso documental laboral",
    area: "Human Resources",
    sourceCompiledAssetId: THIRD_PARTY_ANALYSIS_SOURCE_ASSET_ID,
    sourceLabel: "Análisis de Relaciones Grünenthal",
    sourceRelativePath: THIRD_PARTY_SOURCE_RELATIVE_PATH,
    lineStart: seed.lineStart,
    lineEnd: seed.lineEnd,
    sourceLineRange: `${seed.lineStart}-${seed.lineEnd}`,
    originalPath: individualPath("data-policies", seed.slug, "docx"),
    previewPdfPath: individualPath("data-policies", seed.slug, "pdf"),
    downloadName: `${seed.title}.docx`,
    tags: ["politicas", "laboral", "human resources"],
    employmentMode: seed.employmentMode,
    recommendedClause: "Cláusula C4 del Manual de Relaciones con Terceros.",
  }
}

export const GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS: GrunenthalLaborPolicySeed[] = [
  laborPolicy({
    slug: "contrato-individual-tiempo-determinado",
    title: "Contrato individual por tiempo determinado - referencia C4",
    lineStart: 521,
    lineEnd: 527,
    employmentMode: "tiempo-determinado",
  }),
  laborPolicy({
    slug: "contrato-individual-tiempo-indeterminado",
    title: "Contrato individual por tiempo indeterminado - referencia C4",
    lineStart: 528,
    lineEnd: 534,
    employmentMode: "tiempo-indeterminado",
  }),
]

function repositoryDocumentFromAsset(asset: GrunenthalAsset): GrunenthalRepositoryDocument {
  const category = repositoryCategoryForAsset(asset)
  const previewPdfPath = previewPathForAsset(asset)

  return {
    id: `repository-${asset.id}`,
    title: asset.displayName,
    module: asset.module as GrunenthalRepositoryModule,
    category,
    type: repositoryTypeForCategory(category),
    area: moduleArea(asset.module as GrunenthalRepositoryModule),
    fileId: getGrunenthalRepositoryFileId(asset.id),
    originalPath: asset.path,
    previewPdfPath,
    previewable: Boolean(previewPdfPath) && asset.extension !== "json",
    downloadName: asset.name,
    sourceLabel: asset.sourceRelativePath,
    sourceCompiledAssetId: asset.id,
    sourceRelativePath: asset.sourceRelativePath,
    tags: [asset.module, category, asset.displayName, asset.sourceRelativePath],
  }
}

function repositoryDocumentFromIndividual(seed: IndividualDocumentBase): GrunenthalRepositoryDocument {
  return {
    id: `repository-${seed.id}`,
    title: seed.title,
    module: seed.module,
    category: seed.category,
    type: seed.type,
    area: seed.area,
    fileId: getGrunenthalRepositoryFileId(seed.id),
    originalPath: seed.originalPath,
    previewPdfPath: seed.previewPdfPath,
    previewable: true,
    downloadName: seed.downloadName,
    sourceLabel: seed.sourceLabel,
    sourceCompiledAssetId: seed.sourceCompiledAssetId,
    sourceLineRange: seed.sourceLineRange,
    sourceRelativePath: seed.sourceRelativePath,
    tags: seed.tags,
  }
}

type CuratedPolicyOverride = {
  assetId: string
  policyScope: GrunenthalPolicyScope
  title: string
  type?: string
  area?: string
}

const CURATED_POLICY_OVERRIDES: CuratedPolicyOverride[] = [
  {
    assetId: "grunenthal-data-policies-analisisbaseslegalesgrunenthal",
    policyScope: "mexico",
    title: "Análisis de fundamento legal de los tratamientos de datos personales de Grünenthal.",
  },
  {
    assetId: "grunenthal-data-policies-politica-general-pdp-grt",
    policyScope: "mexico",
    title: "Política General de Protección de Datos Personales de Grünenthal.",
  },
  {
    assetId: "grunenthal-data-policies-politicadeconservaciongrt",
    policyScope: "mexico",
    title: "Política de Conservación, Bloqueo y Cancelación de Datos Personales.",
  },
  {
    assetId: "grunenthal-security-system-carta-empleados-pdp-grt",
    policyScope: "mexico",
    title: "Carta de Protección de Datos Personales para Empleados",
    area: "Seguridad y empleados",
  },
  {
    assetId: "grunenthal-security-system-politica-de-vulneraciones-de-seguridad-de-grt",
    policyScope: "mexico",
    title: "Política de Vulneraciones de Seguridad de Grünenthal",
    area: "Seguridad",
  },
  {
    assetId: "grunenthal-security-system-politica-eipd-grt",
    policyScope: "mexico",
    title: "Política para la Elaboración de Evaluaciones de Impacto en la Protección de Datos de Grünenthal",
    area: "Seguridad",
  },
  {
    assetId: "grunenthal-security-system-politica-sgsdp-grt",
    policyScope: "mexico",
    title: "Política del Sistema de Gestión de Seguridad de Datos Personales",
    area: "Seguridad",
  },
  {
    assetId: "grunenthal-third-party-contracts-1-cuestionario-de-proveedores",
    policyScope: "mexico",
    title:
      "Cuestionario de Evaluación de Cumplimiento en Materia de Protección de Datos Personales para Proveedores de Servicios de Grünenthal",
    area: "Terceros",
  },
  {
    assetId: "grunenthal-third-party-contracts-analisisderelacionesgrunenthal",
    policyScope: "mexico",
    title: "Análisis de Relaciones con Terceros de Grünenthal",
    area: "Terceros",
  },
  {
    assetId: "grunenthal-third-party-contracts-manualderelaciones-grunenthal-davara-v2",
    policyScope: "mexico",
    title: "Manual de Relaciones con Terceros de Grünenthal.",
    area: "Terceros",
  },
  {
    assetId: "grunenthal-arco-rights-manualderechosarco-grunenthal-davara-v2",
    policyScope: "mexico",
    title: "Manual de Atención de Derechos ARCO de Grünenthal",
    area: "Derechos ARCO",
  },
  {
    assetId: "grunenthal-dpo-acta-designacion-de-miembros-del-departamento-de-datos-personales-de-grunenthal",
    policyScope: "mexico",
    title: "Acta designación de miembros del Departamento de Datos Personales de Grünenthal",
    area: "Departamento de Datos Personales",
  },
  {
    assetId: "grunenthal-dpo-manualdeldepartamento-grunenthal-davara-v2",
    policyScope: "mexico",
    title: "Manual para el Departamento de Datos Personales de Grünenthal",
    area: "Departamento de Datos Personales",
  },
  {
    assetId: PRIVACY_NOTICE_SOURCE_ASSET_ID,
    policyScope: "mexico",
    title: "Manual de Avisos de Privacidad Grünenthal",
    area: "Avisos de privacidad",
  },
  {
    assetId: "grunenthal-data-policies-copia-de-grt-hq-sop-proc-006916-mexico-davara-v1-1",
    policyScope: "global",
    title: "Política de Tratamiento de Datos Personales.",
  },
  {
    assetId: "grunenthal-data-policies-grt-proc-003162-davara-v1",
    policyScope: "global",
    title: "Política Global de Violaciones",
  },
  {
    assetId: "grunenthal-data-policies-grt-proc-003298-data-subject-requests-davarav1",
    policyScope: "global",
    title: "Global SOP_Data Subject Request",
  },
  {
    assetId: "grunenthal-data-policies-grt-proc-7000-retention-of-personal-data-en-released-in-mcl-es-419-davara-v1",
    policyScope: "global",
    title: "Procedimiento operativo estándar sobre la retención de datos personales",
  },
]

function policyDownloadName(title: string, extension: string) {
  const safeTitle = title.replace(/\.+$/g, "").trim()
  return `${safeTitle || "politica-grunenthal"}.${extension}`
}

function curatedPolicyDocumentFromAsset(override: CuratedPolicyOverride): GrunenthalRepositoryDocument | null {
  const asset = GRUNENTHAL_DOCUMENT_MANIFEST.find((item) => item.id === override.assetId)
  if (!asset || asset.extension === "json") return null

  const category = repositoryCategoryForAsset(asset)
  const previewPdfPath = previewPathForAsset(asset)

  return {
    id: `policy-${asset.id}`,
    title: override.title,
    module: "data-policies",
    category,
    type: override.type || "Política y evidencia",
    area: override.area || policyScopeLabel(override.policyScope),
    fileId: getGrunenthalRepositoryFileId(asset.id),
    originalPath: asset.path,
    previewPdfPath,
    previewable: Boolean(previewPdfPath) && asset.extension !== "json",
    downloadName: policyDownloadName(override.title, asset.extension),
    sourceLabel: asset.sourceRelativePath,
    sourceCompiledAssetId: asset.id,
    sourceRelativePath: asset.sourceRelativePath,
    originModule: asset.module,
    policyScope: override.policyScope,
    policyScopeLabel: policyScopeLabel(override.policyScope),
    tags: [
      "politicas",
      override.policyScope,
      asset.module,
      category,
      override.title,
      asset.displayName,
      asset.sourceRelativePath,
    ],
  }
}

export const GRUNENTHAL_CURATED_POLICY_DOCUMENTS: GrunenthalRepositoryDocument[] =
  CURATED_POLICY_OVERRIDES.flatMap((override) => {
    const document = curatedPolicyDocumentFromAsset(override)
    return document ? [document] : []
  })

const baseRepositoryDocuments = GRUNENTHAL_DOCUMENT_MANIFEST.filter(
  (asset) =>
    ALLOWED_REPOSITORY_MODULES.has(asset.module as GrunenthalRepositoryModule) &&
    asset.extension !== "json",
).map(repositoryDocumentFromAsset)

export const GRUNENTHAL_REPOSITORY_DOCUMENTS: GrunenthalRepositoryDocument[] = [
  ...baseRepositoryDocuments,
  ...GRUNENTHAL_INDIVIDUAL_PRIVACY_NOTICE_RECORDS.map(repositoryDocumentFromIndividual),
  ...GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.map(repositoryDocumentFromIndividual),
  ...GRUNENTHAL_LABOR_POLICY_REPOSITORY_DOCUMENTS.map(repositoryDocumentFromIndividual),
]

function repositoryStoredFileFor(
  document: GrunenthalRepositoryDocument,
  storedFile: StoredFile,
): StoredFile {
  return {
    ...storedFile,
    name: document.downloadName || storedFile.name,
    content: document.originalPath || storedFile.content,
    category: document.category || storedFile.category,
    metadata: {
      ...storedFile.metadata,
      title: document.title,
      displayName: document.title,
      publicPath: document.originalPath,
      originalPath: document.originalPath,
      sourceRelativePath: document.sourceRelativePath || document.sourceLabel,
      ...(document.previewPdfPath
        ? { previewPdfPath: document.previewPdfPath, previewMimeType: "application/pdf" }
        : {}),
    },
  }
}

export function buildGrunenthalRepositoryDocuments(storedFiles: StoredFile[]): GrunenthalRepositoryDocumentWithFile[] {
  const filesById = new Map(storedFiles.map((file) => [file.id, file]))

  return GRUNENTHAL_REPOSITORY_DOCUMENTS.flatMap((document) => {
    const storedFile = filesById.get(document.fileId)
    return storedFile ? [{ ...document, storedFile: repositoryStoredFileFor(document, storedFile) }] : []
  })
}

export function buildGrunenthalCuratedPolicyDocuments(
  storedFiles: StoredFile[],
): GrunenthalRepositoryDocumentWithFile[] {
  const filesById = new Map(storedFiles.map((file) => [file.id, file]))

  return GRUNENTHAL_CURATED_POLICY_DOCUMENTS.flatMap((document) => {
    const storedFile = filesById.get(document.fileId)
    return storedFile ? [{ ...document, storedFile: repositoryStoredFileFor(document, storedFile) }] : []
  })
}
