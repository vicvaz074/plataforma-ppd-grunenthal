"use client"
import { useState, useEffect, useMemo, FormEvent } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Copy,
  Download,
  Eye,
  FileText,
  Shield,
  Search,
  Upload,
  Edit,
  Trash2,
  FilePlus,
  Layers,
  ListChecks,
  Info,
  Bell,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FilePreviewDialog } from "@/components/file-preview-dialog"
import {
  deleteFile,
  getFilesByCategory,
  saveFile,
  getFileById,
  createFileURL,
  type StoredFile,
} from "@/lib/fileStorage"
import { canOfferFilePreview } from "@/lib/file-preview"
import { ArcoModuleShell } from "@/components/arco-module-shell"
import {
  THIRD_PARTY_CONTRACTS_META,
  THIRD_PARTY_CONTRACTS_NAV,
} from "@/components/arco-module-config"
import {
  GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX,
  GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE,
  type GrunenthalThirdPartyAnalysisMatrixRow,
} from "@/lib/grunenthal-third-party-analysis-matrix"
import {
  GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES,
  GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE,
  GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
  GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS,
  GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE,
} from "@/lib/grunenthal-third-party-model-clauses"
import {
  GRUNENTHAL_GRT_CONTRACT_DOCUMENTS,
  type GrunenthalGrtContractDocument,
} from "@/lib/grunenthal-contracts-grt"
import {
  GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS,
  type GrunenthalThirdPartyContractSeed,
} from "@/lib/grunenthal-repository"
import { normalizeGrunenthalContractParty } from "@/lib/grunenthal-contract-analysis-linking"
import {
  getAuditReminderByReferenceKey,
  upsertAuditReminderByReferenceKey,
  type AuditReminderRecurrenceInterval,
} from "@/lib/audit-alarms"
import { generateAllNotifications } from "@/lib/notification-engine"
import { SafeLink } from "@/components/SafeLink"
import type { ContractMeta } from "../types"

type ContractAttachment = ContractMeta["attachments"][number] & {
  mimeType?: string
  publicPath?: string
  previewPdfPath?: string
  size?: number
}

type LibraryDocument = {
  id: string
  title: string
  description: string
  type: string
  tags: string[]
  category: string
  content?: string
  downloadUrl?: string
}

type DocumentResource = LibraryDocument & {
  source: "library" | "custom"
  uploadedAt?: string
  metadata?: Record<string, unknown>
  storageId?: string
}

type ModelClause = {
  id: string
  title: string
  category: string
  text: string
  sourceLabel?: string
  isCustom?: boolean
}

type TemplateRepositoryItem = {
  id: string
  title: string
  description: string
  usage: string
  placeholders: string[]
  sourceDocument?: {
    fileName: string
    publicPath: string
    previewPdfPath: string
    mimeType: string
    size?: number
  }
  assetId?: string
  baseTemplate?: string
  baseDownloadName?: string
  metadata: {
    tipo: string
    ambito: string
    riesgo: string
    categorias: string[]
    titulares: string[]
    baseJuridica: string[]
    garantias?: string[]
    owner: string
    aprobadores: string[]
    ultimaRevision: string
    proximaRevision: string
  }
  notes?: string[]
}

const defaultUtilityDocuments: LibraryDocument[] = [
  {
    id: "doc1",
    title: "Guía práctica para contratos con encargados",
    description:
      "Resumen accionable de las obligaciones clave que debe incluir un contrato con encargados y subencargados del tratamiento.",
    type: "pdf",
    category: "Guías operativas",
    tags: ["Encargados", "Requisitos mínimos", "Supervisión"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc2",
    title: "Checklist de verificación de contratos",
    description:
      "Lista de verificación para revisar cláusulas críticas antes de aprobar o renovar un contrato con terceros.",
    type: "xlsx",
    category: "Herramientas de control",
    tags: ["Checklist", "Auditoría", "Seguimiento"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc3",
    title: "Modelo de acuerdo de tratamiento de datos (DPA)",
    description:
      "Plantilla base alineada con el RGPD para formalizar las obligaciones del encargado y del responsable del tratamiento.",
    type: "docx",
    category: "Modelos oficiales",
    tags: ["DPA", "RGPD", "Obligaciones"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc4",
    title: "Plantilla de evaluación de riesgo de terceros",
    description:
      "Formato para documentar el análisis de riesgos y las medidas compensatorias acordadas con el proveedor.",
    type: "xlsx",
    category: "Gestión de riesgos",
    tags: ["Evaluación", "Clasificación", "Mitigación"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc5",
    title: "Cláusulas contractuales tipo (SCC) 2021",
    description:
      "Extracto comentado de las SCC publicadas por la Comisión Europea para transferencias internacionales.",
    type: "pdf",
    category: "Transferencias internacionales",
    tags: ["SCC", "EEA", "Transferencias"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc6",
    title: "Guía rápida para homologar proveedores",
    description:
      "Pasos sugeridos y criterios mínimos para homologar a un nuevo proveedor antes de firmar un contrato.",
    type: "pdf",
    category: "Onboarding de proveedores",
    tags: ["Homologación", "Due diligence", "Evaluación inicial"],
    content: "/placeholder.svg?height=400&width=300",
  },
]

const modelContractRepositoryItems: TemplateRepositoryItem[] = GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS.map(
  (contract) => ({
    id: contract.id,
    title: contract.title,
    description: `${contract.type} oficial del Apéndice 2 del Manual de Relaciones con Terceros.`,
    usage: contract.usage,
    placeholders: [],
    sourceDocument: {
      fileName: contract.docxDownloadName,
      publicPath: `/${contract.docxPath}`,
      previewPdfPath: `/${contract.previewPdfPath}`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    baseDownloadName: contract.textDownloadName,
    baseTemplate: contract.text,
    metadata: {
      tipo: contract.communicationType,
      ambito: "Nacional",
      riesgo: contract.communicationType === "Transferencia" ? "alto" : "medio",
      categorias: ["Identificativos", "Contacto", "Laborales"],
      titulares: ["Empleados", "Proveedores", "Terceros"],
      baseJuridica: ["Relación contractual", "Obligación legal"],
      garantias: ["Contrato modelo", "Cláusulas de protección de datos"],
      owner: "Legal",
      aprobadores: ["Legal", "Datos Personales"],
      ultimaRevision: "2025-10-21",
      proximaRevision: "2026-04-21",
    },
    notes: [
      contract.sourceLabel,
      "Documento individual derivado del manual fuente; el DOCX y su preview PDF conservan el formato del archivo original.",
    ],
  }),
)

const templateRepository: TemplateRepositoryItem[] = [
  ...modelContractRepositoryItems,
  {
    id: "template-apendices",
    title: "Apéndices y cláusulas modelo insertables",
    description: "Cláusulas del Apéndice 1 del Manual de Relaciones con Terceros de Grünenthal.",
    usage: "Ideal para actualizar contratos vigentes con las cláusulas validadas del manual fuente.",
    placeholders: [],
    assetId: "78a417dd-e10e-4564-a6fc-fc41963",
    baseDownloadName: "Clausulas_Modelo_Manual_Relaciones_Terceros.txt",
    baseTemplate: GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE,
    metadata: {
      tipo: "Cláusula",
      ambito: "Mixto",
      riesgo: "medio",
      categorias: ["Identificativos", "Laborales", "Terceros"],
      titulares: ["Empleados", "Proveedores", "Terceros"],
      baseJuridica: ["Relación contractual", "Interés legítimo"],
      garantias: ["Manual de Relaciones con Terceros", "Cláusulas contractuales modelo"],
      owner: "Cumplimiento",
      aprobadores: ["Legal", "DPO"],
      ultimaRevision: "2025-10-21",
      proximaRevision: "2026-04-21",
    },
    notes: [
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
      "Incluye C.1 comunicación a encargados, C.2 transferencias, C.3 no aplicación de normatividad y C.4 contrato laboral.",
    ],
  },
]

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const applyTemplateValues = (template: string, values: Record<string, string>) => {
  let result = template
  Object.entries(values).forEach(([placeholder, replacement]) => {
    if (!placeholder) return
    const safePlaceholder = escapeRegExp(placeholder)
    const regex = new RegExp(safePlaceholder, "g")
    result = result.replace(regex, replacement || placeholder)
  })
  return result
}

const triggerTextDownload = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const GRT_CONTRACT_SOURCE_FOLDER = "Contratos GRt"
const COMPILED_THIRD_PARTY_SOURCE_ID = "grunenthal-third-party-contracts-analisisderelacionesgrunenthal"

const normalizeContractText = normalizeGrunenthalContractParty

const contractPartyKey = (contract: Pick<ContractMeta, "providerIdentity" | "thirdPartyName" | "contractorType">) =>
  normalizeContractText(contract.providerIdentity || contract.thirdPartyName || contract.contractorType || "")

const seededFileId = (assetId: string) => `grunenthal-file-${assetId}`

const getPrimaryContractAttachment = (contract: ContractMeta | null | undefined): ContractAttachment | null => {
  if (!contract?.attachments.length) return null
  const primaryAttachment = contract.attachments.find(
    (attachment) => String(attachment.definition).toLowerCase() === "principal",
  ) as ContractAttachment | undefined
  if (primaryAttachment) return primaryAttachment

  return (
    contract.attachments.find((attachment) => {
      const descriptor = `${attachment.definition} ${attachment.fileName}`.toLowerCase()
      return !descriptor.includes("analisis") && !descriptor.includes("análisis") && !descriptor.includes("extracto")
    }) ?? contract.attachments[0]
  )
}

const supportingDocumentPattern = /\b(nda|confidencialidad|orden de compra|purchase order|oc)\b/i

const isSupportingGrtDocument = (record: GrunenthalGrtContractDocument) =>
  supportingDocumentPattern.test(`${record.sourceName} ${record.documentKind}`)

const isSupportingContract = (contract: ContractMeta) =>
  supportingDocumentPattern.test(
    [
      contract.contractTitle,
      contract.contractType,
      ...contract.attachments.map((attachment) => `${attachment.definition} ${attachment.fileName}`),
    ]
      .filter(Boolean)
      .join(" "),
  )

const shouldReplaceLinkedContract = (
  currentContract: ContractMeta | undefined,
  nextContractIsSupportingDocument: boolean,
) => {
  if (!currentContract) return true
  if (currentContract.metadata?.fallbackFromAnalysis) return true
  if (isSupportingContract(currentContract) && !nextContractIsSupportingDocument) return true
  if (!isSupportingContract(currentContract) && nextContractIsSupportingDocument) return false
  return true
}

const buildPublicContractAttachment = (record: GrunenthalGrtContractDocument): ContractAttachment => ({
  fileName: record.sourceName,
  definition: "principal",
  storageId: seededFileId(record.id),
  category: "third-party-contract",
  mimeType: record.mimeType,
  publicPath: record.path,
  previewPdfPath: record.extension !== "pdf" ? record.previewPdfPath : undefined,
  size: record.size,
})

const clauseComplianceStatusFromIndividual = (record: GrunenthalThirdPartyContractSeed) => {
  if (record.complianceStatus === "no-cumple") return "no_cumple"
  if (record.complianceStatus === "no-aplica") return "no_aplica"
  if (record.complianceStatus === "requiere-revision") return "requiere_revision"
  return "cumple"
}

const clauseRegulationFromIndividual = (record: GrunenthalThirdPartyContractSeed) => {
  if (record.complianceStatus === "cumple") {
    return "Resultado del análisis de cláusulas: cumple con la LFPDPPP y su Reglamento."
  }
  if (record.complianceStatus === "no-aplica") {
    return "Resultado del análisis de cláusulas: no se localizó cláusula relativa; se recomienda incorporar la cláusula aplicable."
  }
  if (record.complianceStatus === "requiere-revision") {
    return "Resultado del análisis de cláusulas: requiere revisión conforme al documento fuente."
  }
  return "Resultado del análisis de cláusulas: no cumple con la LFPDPPP, conforme al documento fuente."
}

const findIndividualAnalysisForProvider = (providerIdentity: string) => {
  const partyKey = normalizeContractText(providerIdentity)
  return GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.find(
    (record) => normalizeContractText(record.providerIdentity) === partyKey,
  )
}

const buildIndividualAnalysisAttachment = (record: GrunenthalThirdPartyContractSeed): ContractAttachment => ({
  fileName: record.downloadName,
  definition: "evidencia",
  storageId: seededFileId(record.id),
  category: record.category,
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  publicPath: record.originalPath,
  previewPdfPath: record.previewPdfPath,
  size: 0,
})

const buildFallbackContractFromIndividualAnalysis = (record: GrunenthalThirdPartyContractSeed): ContractMeta => ({
  id: `fallback-contract-${record.id}`,
  created: "2026-01-01T00:00:00.000Z",
  contractMode: "especifico",
  contractTitle: record.contractTitle,
  internalCode: record.internalCode,
  contractType: "Análisis de relación con tercero",
  contractStatus: "vigente",
  contractorType: record.contractorType,
  providerIdentity: record.providerIdentity,
  thirdPartyTypes: [record.relationType],
  thirdPartyName: record.thirdPartyName,
  areas: [record.area],
  serviceTypes: ["servicios_profesionales"],
  treatmentPurpose: record.contractObject,
  dataCategories: ["identificacion", "contacto", "laboral"],
  dataVolume: "Variable",
  relationType: record.relationType,
  instrumentTypes: [record.recommendedInstrument],
  formalized: "si",
  baseLegal: ["relacion_juridica"],
  guarantees: [record.recommendedInstrument],
  contractValidity: "indefinida",
  startDate: "2026-01-01",
  expirationDate: "2026-12-31",
  durationType: "anual",
  reviewFrequency: "anual",
  terminationClause: true,
  communicationType: record.communicationType,
  communicationDetails: record.contractObject,
  clauseRegulation: clauseRegulationFromIndividual(record),
  clauseType: record.sourceClauseType,
  clauseComplianceStatus: clauseComplianceStatusFromIndividual(record),
  clauseComplianceLabel: record.sourceComplianceLabel,
  clauseComplianceNotes: record.sourceComplianceNotes,
  complianceNeeds: record.sourceRecommendation,
  evidenceAvailable: ["analisis", "extracto_individual"],
  evidenceNotes: `Registro individual extraído del análisis de relaciones con terceros, líneas ${record.sourceLineRange}.`,
  responsibleName: "Sofia Jaimes",
  responsibleRole: "Administrador demo",
  lastReview: "2026-01-01",
  nextReview: "2026-12-31",
  reminders: [],
  linkedInventories: "RAT Grünenthal 2026",
  riskLevel: record.riskLevel,
  riskNotes: record.sourceRecommendation || record.recommendedInstrument,
  versioningNotes: "Fallback de análisis generado desde el extracto individual del documento fuente.",
  reviewLog: "Cargado desde Análisis de Relaciones Grünenthal.",
  attachments: [buildIndividualAnalysisAttachment(record)],
  metadata: {
    sourceCompiledAssetId: record.sourceCompiledAssetId,
    sourceLineRange: record.sourceLineRange,
    sourceRelativePath: record.sourceRelativePath,
    individualRecordId: record.id,
    fallbackFromAnalysis: true,
  },
})

const buildFallbackContractFromGrtDocument = (record: GrunenthalGrtContractDocument): ContractMeta => {
  const analysisRecord = findIndividualAnalysisForProvider(record.providerIdentity)
  const clauseComplianceStatus = analysisRecord
    ? clauseComplianceStatusFromIndividual(analysisRecord)
    : record.clauseComplianceStatus
  const clauseComplianceLabel = analysisRecord?.sourceComplianceLabel ?? record.clauseComplianceLabel
  const clauseType = analysisRecord?.sourceClauseType ?? record.clauseType
  const sourceRecommendation = analysisRecord?.sourceRecommendation ?? record.recommendation
  const sourceCriterion = analysisRecord?.sourceRecommendation ?? record.analysisSummary

  return {
    id: `fallback-contract-${record.id}`,
    created: "2026-01-01T00:00:00.000Z",
    contractMode: "especifico",
    contractTitle: `${record.documentKind} · ${record.providerIdentity}`,
    internalCode: `GRT-${record.id}`,
    contractType: record.documentKind,
    contractStatus: "vigente",
    contractorType: record.relationType === "tercero" ? "tercero" : "proveedor",
    providerIdentity: record.providerIdentity,
    thirdPartyTypes: [record.relationType],
    thirdPartyName: record.providerIdentity,
    areas: [record.area],
    serviceTypes: ["servicios_profesionales"],
    treatmentPurpose: record.contractObject,
    dataCategories: ["identificacion", "contacto", "laboral"],
    dataVolume: "Variable",
    relationType: record.relationType,
    instrumentTypes: ["contrato"],
    formalized: "si",
    baseLegal: ["relacion_juridica"],
    guarantees: ["contrato"],
    contractValidity: "indefinida",
    startDate: "2026-01-01",
    expirationDate: "2026-12-31",
    durationType: "anual",
    reviewFrequency: "anual",
    terminationClause: true,
    communicationType: record.communicationType,
    communicationDetails: record.contractObject,
    clauseRegulation: sourceCriterion,
    clauseType,
    clauseComplianceStatus,
    clauseComplianceLabel,
    clauseComplianceNotes: analysisRecord?.sourceComplianceNotes ?? sourceCriterion,
    complianceNeeds: sourceRecommendation,
    evidenceAvailable: analysisRecord ? ["contrato", "analisis", "extracto_individual"] : ["contrato", "analisis"],
    evidenceNotes: analysisRecord
      ? `Contrato cargado desde Contratos GRt y vinculado al análisis de relaciones, líneas ${analysisRecord.sourceLineRange}.`
      : `Contrato cargado desde la carpeta Contratos GRt: ${record.sourceName}.`,
    responsibleName: "Sofia Jaimes",
    responsibleRole: "Administrador demo",
    lastReview: "2026-01-01",
    nextReview: "2026-12-31",
    reminders: [],
    linkedInventories: "No vinculado en esta carga",
    riskLevel: analysisRecord?.riskLevel ?? record.riskLevel,
    riskNotes: sourceRecommendation || sourceCriterion,
    versioningNotes: "Fallback de consulta generado desde Contratos GRt cuando el historial local no está disponible.",
    reviewLog: "Cargado desde assets oficiales Grünenthal.",
    attachments: [buildPublicContractAttachment(record)],
    metadata: {
      sourceFolder: GRT_CONTRACT_SOURCE_FOLDER,
      sourceRelativePath: `Contratos GRt/${record.sourceName}`,
      individualRecordId: analysisRecord?.id ?? record.id,
      grtContractId: record.id,
      originalPublicPath: record.path,
      ...(analysisRecord
        ? {
            analysisRecordId: analysisRecord.id,
            analysisSourceLineRange: analysisRecord.sourceLineRange,
            sourceCompiledAssetId: analysisRecord.sourceCompiledAssetId,
          }
        : {}),
      documentViewMode: record.extension !== "pdf" ? "pdf-preview" : "original",
      ...(record.extension !== "pdf" ? { previewPdfPath: record.previewPdfPath } : {}),
      analysisInModal: true,
      fallbackFromAsset: true,
    },
  }
}

const isGrtHistoryContract = (contract: ContractMeta) => contract.metadata?.sourceFolder === GRT_CONTRACT_SOURCE_FOLDER

const isCompiledAnalysisContract = (contract: ContractMeta) =>
  contract.metadata?.sourceCompiledAssetId === COMPILED_THIRD_PARTY_SOURCE_ID

const communicationTypeLabels: Record<GrunenthalThirdPartyAnalysisMatrixRow["communicationType"], string> = {
  remision: "Remisión",
  transferencia: "Transferencia",
  mixta: "Mixta",
  "sin-comunicacion": "Sin comunicación",
  "no-aplica": "N/A",
  otro: "Otro",
}

const updateReminderOptions: Array<{ value: AuditReminderRecurrenceInterval; label: string; months: number }> = [
  { value: "monthly", label: "Mensual", months: 1 },
  { value: "quarterly", label: "Trimestral", months: 3 },
  { value: "semiannual", label: "Semestral", months: 6 },
  { value: "annual", label: "Anual", months: 12 },
]

const contractUpdateReminderReferenceKey = (contractId: string) => `third-party-contract:update:${contractId}`

const getNextContractUpdateDate = (interval: AuditReminderRecurrenceInterval) => {
  const months = updateReminderOptions.find((option) => option.value === interval)?.months ?? 12
  const dueDate = new Date()
  dueDate.setHours(9, 0, 0, 0)
  dueDate.setMonth(dueDate.getMonth() + months)
  return dueDate
}

export default function DocumentsAndClausesPage() {
  const { toast } = useToast()
  const [templateFiles, setTemplateFiles] = useState<StoredFile[]>([])
  const [contractHistory, setContractHistory] = useState<ContractMeta[]>([])
  const [userClauses, setUserClauses] = useState<ModelClause[]>([])
  const [customClausesLoaded, setCustomClausesLoaded] = useState(false)
  const [documentSearchTerm, setDocumentSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [templateTitle, setTemplateTitle] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateTags, setTemplateTags] = useState("")
  const [templateCategory, setTemplateCategory] = useState("Plantillas personalizadas")
  const [isClauseDialogOpen, setIsClauseDialogOpen] = useState(false)
  const [clauseFormState, setClauseFormState] = useState({ title: "", category: "", text: "" })
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null)
  const [matrixSearchTerm, setMatrixSearchTerm] = useState("")
  const [matrixAreaFilter, setMatrixAreaFilter] = useState("all")
  const [matrixCommunicationFilter, setMatrixCommunicationFilter] = useState("all")
  const [isTemplateFillDialogOpen, setIsTemplateFillDialogOpen] = useState(false)
  const [templateDialogMode, setTemplateDialogMode] = useState<"fill" | "text">("fill")
  const [activeTemplate, setActiveTemplate] = useState<TemplateRepositoryItem | null>(null)
  const [templatePlaceholderValues, setTemplatePlaceholderValues] = useState<Record<string, string>>({})
  const [previewContractFile, setPreviewContractFile] = useState<StoredFile | null>(null)
  const [analysisContract, setAnalysisContract] = useState<ContractMeta | null>(null)
  const [scheduleUpdateReminder, setScheduleUpdateReminder] = useState(false)
  const [updateReminderInterval, setUpdateReminderInterval] =
    useState<AuditReminderRecurrenceInterval>("annual")

  const filledTemplateText = useMemo(() => {
    if (!activeTemplate?.baseTemplate) return ""
    return applyTemplateValues(activeTemplate.baseTemplate, templatePlaceholderValues)
  }, [activeTemplate, templatePlaceholderValues])

  const activeTemplatePlaceholders = activeTemplate?.placeholders ?? []

  const normalizeType = (value: string) => {
    if (!value) return "OTRO"
    let normalized = value
    if (value.includes("/")) {
      normalized = value.split("/").pop() ?? value
    } else if (value.includes(".")) {
      normalized = value.split(".").pop() ?? value
    }
    return normalized.replace(/\./g, "").toUpperCase()
  }

  const parseStoredTags = (tags: unknown): string[] => {
    if (!tags) return []
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag)).filter(Boolean)
    }
    if (typeof tags === "string") {
      return tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
    return []
  }

  const resetTemplateFill = () => {
    setTemplatePlaceholderValues({})
    setActiveTemplate(null)
    setTemplateDialogMode("fill")
  }

  const openTemplateFillDialog = (template: TemplateRepositoryItem) => {
    const initialValues: Record<string, string> = {}
    template.placeholders.forEach((placeholder) => {
      initialValues[placeholder] = ""
    })
    setTemplatePlaceholderValues(initialValues)
    setTemplateDialogMode("fill")
    setActiveTemplate(template)
    setIsTemplateFillDialogOpen(true)
  }

  const openTemplateTextDialog = (template: TemplateRepositoryItem) => {
    setTemplatePlaceholderValues({})
    setTemplateDialogMode("text")
    setActiveTemplate(template)
    setIsTemplateFillDialogOpen(true)
  }

  const handlePlaceholderInput = (placeholder: string, value: string) => {
    setTemplatePlaceholderValues((prev) => ({
      ...prev,
      [placeholder]: value,
    }))
  }

  const loadTemplateFiles = () => {
    setTemplateFiles(getFilesByCategory("third-party-template"))
  }

  const loadContractHistory = () => {
    try {
      const raw = localStorage.getItem("contractsHistory")
      if (raw) {
        const parsed = JSON.parse(raw) as ContractMeta[]
        setContractHistory(parsed)
      } else {
        setContractHistory([])
      }
    } catch {
      setContractHistory([])
    }
  }

  const loadCustomClauses = () => {
    try {
      const stored = localStorage.getItem("thirdPartyCustomClauses")
      if (stored) {
        const parsed = JSON.parse(stored) as ModelClause[]
        setUserClauses(parsed.map((clause) => ({ ...clause, isCustom: true })))
      } else {
        setUserClauses([])
      }
    } catch {
      setUserClauses([])
    } finally {
      setCustomClausesLoaded(true)
    }
  }

  useEffect(() => {
    loadTemplateFiles()
    loadContractHistory()
    loadCustomClauses()

    const handleStorageChange = () => {
      loadTemplateFiles()
      loadContractHistory()
      loadCustomClauses()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("contractsHistoryUpdated", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("contractsHistoryUpdated", handleStorageChange)
    }
  }, [])

  useEffect(() => {
    if (!analysisContract) {
      setScheduleUpdateReminder(false)
      setUpdateReminderInterval("annual")
      return
    }

    const existingReminder = getAuditReminderByReferenceKey(contractUpdateReminderReferenceKey(analysisContract.id))
    if (existingReminder?.recurrence?.sourceModule === "third-party-contracts") {
      setScheduleUpdateReminder(true)
      setUpdateReminderInterval(existingReminder.recurrence.interval)
      return
    }

    setScheduleUpdateReminder(false)
    setUpdateReminderInterval("annual")
  }, [analysisContract])

  useEffect(() => {
    if (!customClausesLoaded) return

    try {
      const payload = userClauses.map(({ isCustom, ...rest }) => rest)
      localStorage.setItem("thirdPartyCustomClauses", JSON.stringify(payload))
    } catch (error) {
      console.error("No fue posible guardar las cláusulas personalizadas", error)
    }
  }, [userClauses, customClausesLoaded])

  const resetTemplateForm = () => {
    setTemplateFile(null)
    setTemplateTitle("")
    setTemplateDescription("")
    setTemplateTags("")
    setTemplateCategory("Plantillas personalizadas")
    setIsSavingTemplate(false)
  }

  const handleTemplateUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!templateFile) {
      toast({
        title: "Seleccione un archivo",
        description: "Necesita elegir un documento para crear la plantilla.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSavingTemplate(true)
      const tags = templateTags
        ? templateTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : []

      await saveFile(
        templateFile,
        {
          title: templateTitle || templateFile.name,
          description: templateDescription,
          tags,
          category: templateCategory,
        },
        "third-party-template",
      )

      toast({
        title: "Plantilla guardada",
        description: "La plantilla ahora está disponible para tu equipo.",
      })

      resetTemplateForm()
      setIsUploadDialogOpen(false)
      loadTemplateFiles()
    } catch {
      toast({
        title: "Error al guardar",
        description: "Ocurrió un problema al almacenar la plantilla. Inténtalo nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = (id: string) => {
    const success = deleteFile(id)
    if (success) {
      setTemplateFiles((prev) => prev.filter((file) => file.id !== id))
      toast({
        title: "Plantilla eliminada",
        description: "El documento ya no está disponible en la biblioteca.",
      })
    } else {
      toast({
        title: "No se pudo eliminar",
        description: "Intente nuevamente o recargue la página para actualizar la lista.",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado al portapapeles",
      description: "El texto ha sido copiado para que puedas reutilizarlo.",
    })
  }

  const downloadTemplateBase = (template: TemplateRepositoryItem) => {
    if (!template.baseTemplate) {
      toast({
        title: "Plantilla sin documento base",
        description: "Agrega tu propia plantilla oficial para poder descargarla.",
      })
      return
    }

    const fileName = template.baseDownloadName || `${template.title.replace(/\s+/g, "_")}.txt`
    triggerTextDownload(template.baseTemplate, fileName)
    toast({
      title: "Documento generado",
      description: `Descargando ${fileName}`,
    })
  }

  const modelContractStoredFile = (template: TemplateRepositoryItem): StoredFile | null => {
    if (!template.sourceDocument) return null

    return {
      id: `public-${template.id}`,
      name: template.sourceDocument.fileName,
      type: template.sourceDocument.mimeType,
      size: template.sourceDocument.size ?? 0,
      content: template.sourceDocument.publicPath,
      uploadDate: new Date().toISOString(),
      category: "third-party-template",
      metadata: {
        title: template.title,
        publicPath: template.sourceDocument.publicPath,
        sourceRelativePath: template.sourceDocument.publicPath,
        previewPdfPath: template.sourceDocument.previewPdfPath,
        previewMimeType: "application/pdf",
      },
    }
  }

  const previewModelContractDocument = (template: TemplateRepositoryItem) => {
    const stored = modelContractStoredFile(template)
    if (!stored) {
      toast({
        title: "Documento no disponible",
        description: "Este contrato modelo no tiene un archivo fuente asociado.",
        variant: "destructive",
      })
      return
    }

    if (!canOfferFilePreview(stored)) {
      toast({
        title: "Vista previa no disponible",
        description: "Puedes descargar el documento original desde esta misma ficha.",
        variant: "destructive",
      })
      return
    }

    setAnalysisContract(null)
    setPreviewContractFile(stored)
  }

  const downloadModelContractDocx = (template: TemplateRepositoryItem) => {
    if (!template.sourceDocument) {
      toast({
        title: "Documento no disponible",
        description: "Este contrato modelo no tiene un archivo DOCX asociado.",
        variant: "destructive",
      })
      return
    }

    const link = document.createElement("a")
    link.href = createFileURL(template.sourceDocument.publicPath)
    link.download = template.sourceDocument.fileName
    link.target = "_blank"
    link.rel = "noopener"
    link.click()
  }

  const downloadModelContractText = (template: TemplateRepositoryItem) => {
    if (!template.baseTemplate) {
      toast({
        title: "Texto no disponible",
        description: "Este contrato modelo no tiene una versión de texto asociada.",
        variant: "destructive",
      })
      return
    }

    const fileName = template.baseDownloadName || `${template.title.replace(/\s+/g, "_")}.txt`
    triggerTextDownload(template.baseTemplate, fileName)
    toast({
      title: "Texto descargado",
      description: `Descargando ${fileName}`,
    })
  }

  const downloadDocument = (resource: DocumentResource) => {
    if (resource.source === "custom" && resource.downloadUrl) {
      const link = document.createElement("a")
      link.href = resource.downloadUrl
      link.download = resource.title
      link.target = "_blank"
      link.rel = "noopener"
      link.click()
      toast({
        title: "Descarga iniciada",
        description: `Abriendo ${resource.title}`,
      })
      return
    }

    if (resource.downloadUrl) {
      window.open(resource.downloadUrl, "_blank", "noopener")
      toast({
        title: "Descarga iniciada",
        description: `Abriendo ${resource.title}`,
      })
      return
    }

    toast({
      title: "Recurso de referencia",
      description: "Esta ficha es orientativa. Añade tu plantilla para descargarla.",
    })
  }

  const downloadFilledTemplate = () => {
    if (!activeTemplate) {
      toast({
        title: "Sin plantilla seleccionada",
        description: "Elige una plantilla del repositorio para personalizarla.",
        variant: "destructive",
      })
      return
    }

    const content = filledTemplateText || activeTemplate.baseTemplate || ""

    if (!content) {
      toast({
        title: "Sin contenido para descargar",
        description: "Completa los campos o adjunta un formato base para generar el documento.",
        variant: "destructive",
      })
      return
    }

    if (templateDialogMode === "text") {
      downloadModelContractText(activeTemplate)
      return
    }

    const suggestedName = activeTemplate.baseDownloadName || `${activeTemplate.title.replace(/\s+/g, "_")}.txt`
    const fileName = suggestedName.endsWith(".txt")
      ? suggestedName.replace(/\.txt$/i, "_personalizado.txt")
      : `${suggestedName}_personalizado.txt`

    triggerTextDownload(content, fileName)
    toast({
      title: "Plantilla personalizada lista",
      description: `Descargando ${fileName}`,
    })
  }

  const openClauseDialog = (clause?: ModelClause, mode: "create" | "edit" | "duplicate" = "create") => {
    if (clause) {
      setClauseFormState({ title: clause.title, category: clause.category, text: clause.text })
      setEditingClauseId(mode === "edit" ? clause.id : null)
    } else {
      setClauseFormState({ title: "", category: "", text: "" })
      setEditingClauseId(null)
    }
    setIsClauseDialogOpen(true)
  }

  const resetClauseForm = () => {
    setClauseFormState({ title: "", category: "", text: "" })
    setEditingClauseId(null)
  }

  const handleClauseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = clauseFormState.title.trim()
    const category = clauseFormState.category.trim()
    const text = clauseFormState.text.trim()

    if (!title || !category || !text) {
      toast({
        title: "Completa la información",
        description: "Indica un título, categoría y contenido para la cláusula.",
        variant: "destructive",
      })
      return
    }

    if (editingClauseId) {
      setUserClauses((prev) =>
        prev.map((clause) =>
          clause.id === editingClauseId
            ? {
                ...clause,
                title,
                category,
                text,
              }
            : clause,
        ),
      )
      toast({
        title: "Cláusula actualizada",
        description: "Los cambios fueron guardados correctamente.",
      })
    } else {
      setUserClauses((prev) => [
        {
          id: `custom-${Date.now()}`,
          title,
          category,
          text,
          isCustom: true,
        },
        ...prev,
      ])
      toast({
        title: "Cláusula guardada",
        description: "Tu cláusula personalizada ya está disponible en el catálogo.",
      })
    }

    setIsClauseDialogOpen(false)
    resetClauseForm()
  }

  const handleDeleteClause = (id: string) => {
    setUserClauses((prev) => prev.filter((clause) => clause.id !== id))
    toast({
      title: "Cláusula eliminada",
      description: "La cláusula personalizada fue eliminada del catálogo.",
    })
  }

  const formatDate = (value: string) => {
    if (!value) return "No definido"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleDateString()
  }

  const resolveContractAttachment = (attachment: ContractAttachment) => {
    if (attachment.storageId) {
      const stored = getFileById(attachment.storageId)
      if (stored) return stored
    }

    if (attachment.publicPath) {
      return {
        id: attachment.storageId || `public-${attachment.publicPath}`,
        name: attachment.fileName,
        type: attachment.mimeType || "application/pdf",
        size: attachment.size || 0,
        content: attachment.publicPath,
        uploadDate: new Date().toISOString(),
        category: attachment.category || "third-party-contract",
        metadata: {
          publicPath: attachment.publicPath,
          sourceRelativePath: attachment.publicPath,
          ...(attachment.previewPdfPath
            ? { previewPdfPath: attachment.previewPdfPath, previewMimeType: "application/pdf" }
            : {}),
        },
      }
    }

    {
      toast({
        title: "Documento no disponible",
        description: "El archivo no se encontró en el almacenamiento local.",
        variant: "destructive",
      })
      return null
    }
  }

  const previewContractAttachment = (attachment: ContractAttachment) => {
    const stored = resolveContractAttachment(attachment)
    if (!stored) return

    if (!canOfferFilePreview(stored)) {
      toast({
        title: "Vista previa no disponible",
        description: "Puedes descargar el documento original desde este mismo registro.",
        variant: "destructive",
      })
      return
    }

    setAnalysisContract(null)
    setPreviewContractFile(stored)
  }

  const downloadContractAttachment = (attachment: ContractAttachment) => {
    const stored = resolveContractAttachment(attachment)
    if (!stored) return

    const link = document.createElement("a")
    link.href = createFileURL(stored.content)
    link.download = stored.name
    link.target = "_blank"
    link.rel = "noopener"
    link.click()
  }

  const scheduleContractUpdateReminder = () => {
    if (!analysisContract) return

    const referenceKey = contractUpdateReminderReferenceKey(analysisContract.id)
    const existingReminder = getAuditReminderByReferenceKey(referenceKey)
    const responsible = analysisContract.responsibleName || "Admin"
    const title =
      analysisContract.contractTitle || analysisContract.providerIdentity || analysisContract.thirdPartyName || "Contrato"
    const priority = analysisContract.riskLevel === "alto" ? "alta" : analysisContract.riskLevel === "medio" ? "media" : "baja"

    upsertAuditReminderByReferenceKey(referenceKey, {
      title: `Actualizar contrato: ${title}`,
      description:
        "Revisar vigencia, cláusulas, anexos y evidencia del contrato con tercero conforme al periodo seleccionado.",
      dueDate: getNextContractUpdateDate(updateReminderInterval),
      priority,
      status: existingReminder?.status === "en-progreso" ? "en-progreso" : "pendiente",
      assignedTo: [responsible],
      category: "Contratos con terceros",
      moduleId: "contratos-terceros",
      documents: analysisContract.attachments.map((attachment) => attachment.fileName),
      notes: `Contrato ${analysisContract.internalCode || analysisContract.id}`,
      referenceKey,
      recurrence: {
        interval: updateReminderInterval,
        sourceModule: "third-party-contracts",
        sourceRecordId: analysisContract.id,
      },
    })
    generateAllNotifications()

    toast({
      title: "Recordatorio programado",
      description: "La revisión recurrente del contrato ya está conectada a notificaciones.",
    })
  }

  const riskVariants: Record<ContractMeta["riskLevel"], "default" | "secondary" | "outline" | "destructive"> = {
    bajo: "secondary",
    medio: "default",
    alto: "destructive",
  }

  const clauseComplianceBadges: Record<
    NonNullable<ContractMeta["clauseComplianceStatus"]>,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
  > = {
    cumple: { label: "Cláusula cumple", variant: "secondary" },
    no_cumple: { label: "Cláusula no cumple", variant: "destructive" },
    no_aplica: { label: "Agregar cláusula", variant: "outline" },
    requiere_revision: { label: "Cláusula en revisión", variant: "outline" },
  }

  const getClauseComplianceBadge = (contract: ContractMeta) => {
    const status = contract.clauseComplianceStatus
    if (status && clauseComplianceBadges[status]) return clauseComplianceBadges[status]
    return null
  }

  const allDocumentResources = useMemo<DocumentResource[]>(() => {
    const libraryResources: DocumentResource[] = defaultUtilityDocuments.map((doc) => ({
      ...doc,
      type: normalizeType(doc.type),
      source: "library" as const,
    }))

    const templateResources: DocumentResource[] = templateFiles.map((file) => {
      const metadata = file.metadata ?? {}
      const tags = parseStoredTags(metadata.tags)
      const category = (metadata.category as string) || "Plantillas personalizadas"
      const description =
        (metadata.description as string) ||
        "Plantilla cargada por tu organización para reutilizarla en futuros contratos."
      const title = (metadata.title as string) || file.name
      const typeLabel = normalizeType(file.type || file.name)

      const fileUrl = createFileURL(file.content)

      return {
        id: file.id,
        title,
        description,
        type: typeLabel,
        category,
        tags,
        content: fileUrl,
        downloadUrl: fileUrl,
        source: "custom" as const,
        uploadedAt: file.uploadDate,
        metadata,
        storageId: file.id,
      }
    })

    return [...templateResources, ...libraryResources]
  }, [templateFiles])

  const documentCategories = useMemo(() => {
    const categories = new Set(allDocumentResources.map((doc) => doc.category))
    return Array.from(categories).sort()
  }, [allDocumentResources])

  const documentTypes = useMemo(() => {
    const types = new Set(allDocumentResources.map((doc) => doc.type))
    return Array.from(types).sort()
  }, [allDocumentResources])

  const filteredDocuments = useMemo(() => {
    const searchValue = documentSearchTerm.trim().toLowerCase()
    return allDocumentResources.filter((doc) => {
      const matchesSearch =
        !searchValue ||
        doc.title.toLowerCase().includes(searchValue) ||
        doc.description.toLowerCase().includes(searchValue) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchValue))
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter
      const matchesType = typeFilter === "all" || doc.type === typeFilter
      return matchesSearch && matchesCategory && matchesType
    })
  }, [allDocumentResources, documentSearchTerm, categoryFilter, typeFilter])

  const combinedClauses = useMemo(() => [...GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES, ...userClauses], [userClauses])

  const visibleContractHistory = useMemo(() => {
    const grtContractParties = new Set(
      contractHistory
        .filter(isGrtHistoryContract)
        .map(contractPartyKey)
        .filter(Boolean),
    )

    return contractHistory.filter((contract) => {
      const partyKey = contractPartyKey(contract)
      if (isCompiledAnalysisContract(contract) && partyKey && grtContractParties.has(partyKey)) {
        return false
      }
      return true
    })
  }, [contractHistory])

  const contractByPartyKey = useMemo(() => {
    const contracts = new Map<string, ContractMeta>()
    GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.forEach((record) => {
      const partyKey = normalizeContractText(record.providerIdentity)
      if (partyKey && !contracts.has(partyKey)) {
        contracts.set(partyKey, buildFallbackContractFromIndividualAnalysis(record))
      }
    })
    GRUNENTHAL_GRT_CONTRACT_DOCUMENTS.forEach((record) => {
      const partyKey = normalizeContractText(record.providerIdentity)
      if (partyKey && shouldReplaceLinkedContract(contracts.get(partyKey), isSupportingGrtDocument(record))) {
        contracts.set(partyKey, buildFallbackContractFromGrtDocument(record))
      }
    })
    visibleContractHistory.forEach((contract) => {
      const partyKey = contractPartyKey(contract)
      if (
        partyKey &&
        contract.metadata?.sourceFolder === GRT_CONTRACT_SOURCE_FOLDER &&
        shouldReplaceLinkedContract(contracts.get(partyKey), isSupportingContract(contract))
      ) {
        contracts.set(partyKey, contract)
      } else if (partyKey && !contracts.has(partyKey)) {
        contracts.set(partyKey, contract)
      }
    })
    return contracts
  }, [visibleContractHistory])

  const matrixAreas = useMemo(() => {
    return Array.from(new Set(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.map((row) => row.area))).sort()
  }, [])

  const matrixCommunicationTypes = useMemo(() => {
    return Array.from(new Set(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.map((row) => row.communicationType))).sort()
  }, [])

  const filteredMatrixRows = useMemo(() => {
    const searchValue = normalizeContractText(matrixSearchTerm)

    return GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.filter((row) => {
      const searchableFields = normalizeContractText(
        [row.area, row.thirdParty, row.contract, row.communication].join(" "),
      )
      const matchesSearch = !searchValue || searchableFields.includes(searchValue)
      const matchesArea = matrixAreaFilter === "all" || row.area === matrixAreaFilter
      const matchesCommunication =
        matrixCommunicationFilter === "all" || row.communicationType === matrixCommunicationFilter

      return matchesSearch && matchesArea && matchesCommunication
    })
  }, [matrixAreaFilter, matrixCommunicationFilter, matrixSearchTerm])

  const navItems = THIRD_PARTY_CONTRACTS_NAV.map((item) => {
    if (item.href === "/third-party-contracts/registration") {
      return { ...item, badge: visibleContractHistory.length }
    }
    if (item.href === "/third-party-contracts/documents") {
      return { ...item, badge: templateFiles.length + visibleContractHistory.length }
    }
    return item
  })
  const isTemplateTextDialog = templateDialogMode === "text"

  return (
    <ArcoModuleShell
      moduleLabel={THIRD_PARTY_CONTRACTS_META.moduleLabel}
      moduleTitle={THIRD_PARTY_CONTRACTS_META.moduleTitle}
      moduleDescription={THIRD_PARTY_CONTRACTS_META.moduleDescription}
      pageLabel="Documentos"
      pageTitle="Biblioteca documental y cláusulas"
      pageDescription="Plantillas, cláusulas y contratos relacionados en una sola biblioteca."
      navItems={navItems}
      headerBadges={[
        { label: `${templateFiles.length + visibleContractHistory.length} recursos`, tone: "neutral" },
        { label: `${combinedClauses.length} cláusulas`, tone: "primary" },
      ]}
      actions={
        <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Subir plantilla
        </Button>
      }
    >
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-8 grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-[#edf4ff] p-1 sm:grid-cols-3">
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Plantillas</TabsTrigger>
          <TabsTrigger value="clauses" className="text-xs sm:text-sm">Cláusulas</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs sm:text-sm">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biblioteca de referencia y plantillas internas</CardTitle>
              <CardDescription>
                Consulta ejemplos listos para adaptar y sube los formatos oficiales de tu organización para tenerlos siempre a mano.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Estas referencias te ayudarán a estandarizar la elaboración de contratos con terceros. Cada plantilla personalizada que subas quedará disponible para todo tu equipo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repositorio guiado de plantillas oficiales</CardTitle>
              <CardDescription>
                Contratos modelo del Apéndice 2, cláusulas validadas y fichas listas con metadatos auditables.
                Fuente: {GRUNENTHAL_THIRD_PARTY_MODEL_CONTRACTS_SOURCE}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {templateRepository.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>
                      <div className="flex flex-col gap-1 text-left">
                        <span className="flex items-center gap-2 font-medium">
                          <Layers className="h-4 w-4" />
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-md border border-dashed border-muted-foreground/40 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary">{item.metadata.tipo}</Badge>
                          <Badge variant="outline">Ámbito: {item.metadata.ambito}</Badge>
                          <Badge variant="outline" className="capitalize">
                            Riesgo: {item.metadata.riesgo}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Uso recomendado</p>
                          <p>{item.usage}</p>
                        </div>
                        {item.placeholders.length > 0 && (
                          <div className="space-y-2 text-sm">
                            <p className="font-medium">Variables disponibles</p>
                            <div className="flex flex-wrap gap-2">
                              {item.placeholders.map((placeholder) => (
                                <code key={placeholder} className="rounded bg-muted px-2 py-1 text-xs">
                                  {placeholder}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <div>
                            <p className="font-medium">Categorías de datos</p>
                            <p>{item.metadata.categorias.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Titulares aplicables</p>
                            <p>{item.metadata.titulares.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Base jurídica</p>
                            <p>{item.metadata.baseJuridica.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Garantías</p>
                            <p>{(item.metadata.garantias ?? ["No especificado"]).join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Owner</p>
                            <p>{item.metadata.owner}</p>
                          </div>
                          <div>
                            <p className="font-medium">Aprobadores</p>
                            <p>{item.metadata.aprobadores.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Última revisión</p>
                            <p>{item.metadata.ultimaRevision}</p>
                          </div>
                          <div>
                            <p className="font-medium">Próxima revisión</p>
                            <p>{item.metadata.proximaRevision}</p>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">Notas clave</p>
                            <ul className="space-y-1">
                              {item.notes.map((note) => (
                                <li key={note} className="flex items-start gap-2">
                                  <ListChecks className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 border-t border-dashed border-muted-foreground/30 pt-4 text-xs md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.sourceDocument ? (
                              <Badge variant="secondary">Contrato modelo</Badge>
                            ) : item.assetId ? (
                              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                Ficha {item.assetId}
                              </Badge>
                            ) : null}
                            {item.placeholders.length > 0 ? (
                              <Badge variant="outline" className="capitalize">
                                Variables: {item.placeholders.length}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Texto oficial</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.sourceDocument ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => previewModelContractDocument(item)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver documento
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openTemplateTextDialog(item)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Ver texto
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => downloadModelContractDocx(item)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Descargar DOCX
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => downloadModelContractText(item)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Descargar TXT
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" onClick={() => openTemplateFillDialog(item)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Llenar plantilla
                                </Button>
                                {item.baseTemplate && (
                                  <Button size="sm" variant="outline" onClick={() => downloadTemplateBase(item)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar base
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 md:flex-row md:flex-1 md:items-center">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={documentSearchTerm}
                    onChange={(event) => setDocumentSearchTerm(event.target.value)}
                    placeholder="Buscar por título, descripción o etiqueta"
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {documentCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar por formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los formatos</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir plantilla interna
                </Button>
                <SafeLink href="/third-party-contracts/registration">
                  <Button variant="outline">Ir a Registro de Contratos</Button>
                </SafeLink>
              </div>
            </div>
          </div>

          {filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((resource) => {
                const isCustom = resource.source === "custom"
                return (
                  <Card key={resource.id} className="flex h-full flex-col">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5" />
                            {resource.title}
                          </CardTitle>
                          <CardDescription>{resource.description}</CardDescription>
                        </div>
                        <Badge variant="secondary">{resource.type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{resource.category}</Badge>
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {isCustom && <Badge variant="secondary">Tu plantilla</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {isCustom ? (
                        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm">
                          <p className="font-medium">Archivo disponible para tu organización.</p>
                          <p className="text-xs text-muted-foreground">
                            Subido el {formatDate(resource.uploadedAt ?? "")}
                          </p>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
                          <img
                            src={resource.content || "/placeholder.svg"}
                            alt={resource.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadDocument(resource)}>
                        <Download className="mr-2 h-4 w-4" />
                        {isCustom ? "Ver o descargar" : "Consultar"}
                      </Button>
                      {isCustom && resource.storageId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(resource.storageId!)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
              No encontramos documentos con esos filtros. Ajusta la búsqueda o sube una nueva plantilla.
            </div>
          )}

          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={(open) => {
              setIsUploadDialogOpen(open)
              if (!open) {
                resetTemplateForm()
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Subir plantilla interna</DialogTitle>
                <DialogDescription>
                  Comparte formatos oficiales de tu organización para reutilizarlos en futuros contratos con terceros.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTemplateUpload} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="template-file">Archivo</Label>
                  <Input
                    id="template-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx"
                    required
                    onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-title">Nombre visible</Label>
                  <Input
                    id="template-title"
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.target.value)}
                    placeholder="Ej. Acuerdo de confidencialidad para proveedores"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-description">Descripción</Label>
                  <Textarea
                    id="template-description"
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.target.value)}
                    placeholder="Describe cuándo se debe usar esta plantilla y los puntos clave a revisar."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-category">Categoría</Label>
                  <Input
                    id="template-category"
                    value={templateCategory}
                    onChange={(event) => setTemplateCategory(event.target.value)}
                    placeholder="Ej. Contratos marco, Transferencias internacionales"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-tags">Etiquetas (separadas por coma)</Label>
                  <Input
                    id="template-tags"
                    value={templateTags}
                    onChange={(event) => setTemplateTags(event.target.value)}
                    placeholder="seguridad, confidencialidad, DPA"
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetTemplateForm()
                      setIsUploadDialogOpen(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSavingTemplate}>
                    {isSavingTemplate ? "Guardando..." : "Guardar plantilla"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isTemplateFillDialogOpen}
            onOpenChange={(open) => {
              setIsTemplateFillDialogOpen(open)
              if (!open) {
                resetTemplateFill()
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {isTemplateTextDialog
                    ? "Texto del contrato modelo"
                    : activeTemplate
                      ? `Personalizar ${activeTemplate.title}`
                      : "Personalizar plantilla"}
                </DialogTitle>
                <DialogDescription>
                  {isTemplateTextDialog
                    ? "Consulta, copia o descarga el texto base del manual fuente."
                    : "Completa los campos clave para generar un documento listo para compartir con el tercero."}
                </DialogDescription>
              </DialogHeader>

              {activeTemplate ? (
                <div className="space-y-6 text-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="font-medium">Uso recomendado</p>
                      <p className="text-muted-foreground">{activeTemplate.usage}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {activeTemplate.assetId && <p>Ficha: {activeTemplate.assetId}</p>}
                      <p>
                        {isTemplateTextDialog
                          ? "Texto oficial derivado del Apéndice 2"
                          : `Variables disponibles: ${activeTemplatePlaceholders.length}`}
                      </p>
                    </div>
                  </div>

                  {!isTemplateTextDialog && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {activeTemplatePlaceholders.length > 0 ? (
                        activeTemplatePlaceholders.map((placeholder) => {
                          const cleanLabel = placeholder.replace(/[{}]/g, "").replace(/_/g, " ")
                          const inputId = `placeholder-${placeholder.replace(/[{}]/g, "").toLowerCase()}`
                          return (
                            <div key={placeholder} className="space-y-1">
                              <Label htmlFor={inputId}>{cleanLabel}</Label>
                              <Input
                                id={inputId}
                                value={templatePlaceholderValues[placeholder] ?? ""}
                                onChange={(event) => handlePlaceholderInput(placeholder, event.target.value)}
                                placeholder={`Ingresa el valor para ${cleanLabel.toLowerCase()}`}
                              />
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-muted-foreground">
                          Esta plantilla no cuenta con variables. Puedes descargarla directamente desde el repositorio.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{isTemplateTextDialog ? "Texto del contrato modelo" : "Vista previa generada"}</Label>
                    <Textarea
                      value={filledTemplateText || activeTemplate.baseTemplate || "Completa los campos para ver el resultado."}
                      readOnly
                      rows={12}
                      className="font-mono text-xs"
                    />
                  </div>

                  <DialogFooter className="flex flex-wrap justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetTemplateFill()
                        setIsTemplateFillDialogOpen(false)
                      }}
                    >
                      {isTemplateTextDialog ? "Cerrar" : "Cancelar"}
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => copyToClipboard(filledTemplateText || activeTemplate.baseTemplate || "")}
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copiar texto
                      </Button>
                      <Button type="button" onClick={downloadFilledTemplate}>
                        <Download className="mr-2 h-4 w-4" />
                        {isTemplateTextDialog ? "Descargar TXT" : "Descargar documento"}
                      </Button>
                    </div>
                  </DialogFooter>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona una plantilla desde el repositorio para comenzar a personalizarla.
                </p>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="clauses" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <CardTitle>Cláusulas modelo para contratos con terceros</CardTitle>
                <CardDescription>
                  Modelos validados del Apéndice 1 del Manual de Relaciones con Terceros de Grünenthal; puedes guardar versiones personalizadas para reutilizarlas.
                </CardDescription>
              </div>
              <Button className="w-full whitespace-nowrap md:w-auto md:shrink-0" onClick={() => openClauseDialog()}>
                <FilePlus className="mr-2 h-4 w-4" />
                Agregar cláusula personalizada
              </Button>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {combinedClauses.map((clause) => (
                  <AccordionItem key={clause.id} value={clause.id}>
                    <AccordionTrigger>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 pr-3 text-left">
                        <Shield className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">{clause.title}</span>
                        <Badge variant="outline" className="ml-2">
                          {clause.category}
                        </Badge>
                        {!clause.isCustom && <Badge variant="secondary">Validada</Badge>}
                        {clause.isCustom && <Badge variant="secondary">Personalizada</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-md bg-muted p-4">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0"
                            onClick={() => copyToClipboard(clause.text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <pre className="whitespace-pre-wrap break-words pr-10 text-sm leading-6">{clause.text}</pre>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-dashed border-muted-foreground/30 pt-3 text-sm md:flex-row md:items-center md:justify-between">
                          <p className="text-xs text-muted-foreground">
                            {clause.isCustom
                              ? "Cláusula creada por tu organización. Puedes editarla o eliminarla en cualquier momento."
                              : `Fuente: ${clause.sourceLabel || GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE}.`}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {clause.isCustom ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openClauseDialog(clause, "edit")}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClause(clause.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openClauseDialog(clause, "duplicate")}
                              >
                                <FilePlus className="mr-2 h-4 w-4" />
                                Personalizar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Dialog
            open={isClauseDialogOpen}
            onOpenChange={(open) => {
              setIsClauseDialogOpen(open)
              if (!open) {
                resetClauseForm()
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingClauseId ? "Editar cláusula personalizada" : "Nueva cláusula personalizada"}
                </DialogTitle>
                <DialogDescription>
                  Define el texto exacto que deseas reutilizar en tus contratos con terceros.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleClauseSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="clause-title">Título</Label>
                  <Input
                    id="clause-title"
                    value={clauseFormState.title}
                    onChange={(event) => setClauseFormState((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Ej. Cláusula de confidencialidad reforzada"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clause-category">Categoría</Label>
                  <Input
                    id="clause-category"
                    value={clauseFormState.category}
                    onChange={(event) => setClauseFormState((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Confidencialidad, Seguridad, Auditoría..."
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clause-text">Texto de la cláusula</Label>
                  <Textarea
                    id="clause-text"
                    value={clauseFormState.text}
                    onChange={(event) => setClauseFormState((prev) => ({ ...prev, text: event.target.value }))}
                    placeholder="Escribe o pega aquí la redacción completa de la cláusula."
                    rows={8}
                    required
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetClauseForm()
                      setIsClauseDialogOpen(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingClauseId ? "Guardar cambios" : "Guardar cláusula"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <CardTitle>Contratos analizados</CardTitle>
                <CardDescription>
                  Vista interactiva de {GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.sourceTable.toLowerCase()} del documento "{GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.sourceDocument}".
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.length} registros
                </Badge>
                <Badge variant="outline">
                  Actualizado: {GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.lastUpdated}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_240px]">
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={matrixSearchTerm}
                    onChange={(event) => setMatrixSearchTerm(event.target.value)}
                    placeholder="Buscar por área, tercero, contrato o tipo de comunicación"
                    className="pl-9"
                  />
                </div>
                <Select value={matrixAreaFilter} onValueChange={setMatrixAreaFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {matrixAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={matrixCommunicationFilter} onValueChange={setMatrixCommunicationFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Comunicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las comunicaciones</SelectItem>
                    {matrixCommunicationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {communicationTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredMatrixRows.length} resultados visibles</span>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-collapse text-sm">
                    <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="w-[140px] px-4 py-3 font-medium">Área</th>
                        <th className="w-[260px] px-4 py-3 font-medium">Tercero</th>
                        <th className="px-4 py-3 font-medium">Objeto contractual</th>
                        <th className="w-[210px] px-4 py-3 font-medium">Comunicación</th>
                        <th className="w-[230px] px-4 py-3 font-medium">Análisis de cláusula</th>
                        <th className="w-[190px] px-4 py-3 text-right font-medium">Contrato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMatrixRows.map((row) => {
                        const linkedContract = contractByPartyKey.get(normalizeContractText(row.thirdParty))
                        const clauseBadge = linkedContract ? getClauseComplianceBadge(linkedContract) : null
                        const contractAttachment = getPrimaryContractAttachment(linkedContract)

                        return (
                          <tr key={row.id} className="border-t align-top">
                            <td className="px-4 py-3 font-medium">{row.area}</td>
                            <td className="px-4 py-3">
                              <p className="break-words font-medium text-foreground">{row.thirdParty}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Fila fuente {row.sourceRow}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="break-words leading-6">{row.contract}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <Badge variant="outline">{communicationTypeLabels[row.communicationType]}</Badge>
                                <p className="break-words text-xs leading-5 text-muted-foreground">
                                  {row.communication}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {linkedContract ? (
                                <div className="space-y-2">
                                  <Badge variant={clauseBadge?.variant ?? "outline"}>
                                    {linkedContract.clauseComplianceLabel || clauseBadge?.label || "En análisis"}
                                  </Badge>
                                  {linkedContract.clauseType && (
                                    <p className="break-words text-xs leading-5 text-muted-foreground">
                                      {linkedContract.clauseType}
                                    </p>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => setAnalysisContract(linkedContract)}
                                  >
                                    <ListChecks className="mr-2 h-3.5 w-3.5" />
                                    Ver análisis
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="outline">Sin análisis</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {contractAttachment ? (
                                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="justify-center"
                                    onClick={() => previewContractAttachment(contractAttachment)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="justify-center"
                                    onClick={() => downloadContractAttachment(contractAttachment)}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="outline">Sin archivo</Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredMatrixRows.length === 0 && (
                  <div className="border-t p-8 text-center text-sm text-muted-foreground">
                    No hay registros que coincidan con los filtros seleccionados.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <FilePreviewDialog
        file={previewContractFile}
        open={Boolean(previewContractFile)}
        onOpenChange={(open) => {
          if (!open) setPreviewContractFile(null)
        }}
      />
      <Dialog
        open={Boolean(analysisContract)}
        onOpenChange={(open) => {
          if (!open) setAnalysisContract(null)
        }}
      >
        <DialogContent className="!flex max-h-[86vh] !w-[min(1040px,calc(100vw_-_2rem))] !max-w-[1040px] flex-col gap-0 overflow-hidden rounded-[24px] border-slate-200 p-0 shadow-2xl">
          {analysisContract && (
            <>
              <DialogHeader className="shrink-0 border-b bg-background py-4 pl-5 pr-16 text-left sm:pl-6">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <DialogTitle className="break-words text-lg sm:text-xl">
                      Análisis del contrato
                    </DialogTitle>
                    <DialogDescription className="mt-1 break-words text-sm">
                      {analysisContract.contractTitle || analysisContract.providerIdentity || "Contrato registrado"}
                    </DialogDescription>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end sm:pr-1">
                    <Badge variant={riskVariants[analysisContract.riskLevel]} className="capitalize">
                      Riesgo {analysisContract.riskLevel}
                    </Badge>
                    {getClauseComplianceBadge(analysisContract) && (
                      <Badge variant={getClauseComplianceBadge(analysisContract)!.variant}>
                        {getClauseComplianceBadge(analysisContract)!.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 max-h-[min(62vh,640px)] overflow-y-auto bg-muted/20 px-4 py-4 sm:px-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <section className="flex min-w-0 flex-col gap-4">
                    <div className="rounded-xl border bg-background p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2 font-medium">
                        <Shield className="h-4 w-4 text-primary" />
                        Resultado regulatorio
                      </div>
                      <div className="flex flex-col gap-3 text-sm leading-relaxed">
                        <p>
                          <strong>Resultado:</strong>{" "}
                          {analysisContract.clauseComplianceLabel || analysisContract.clauseRegulation}
                        </p>
                        {analysisContract.clauseType && (
                          <p>
                            <strong>Cláusula revisada:</strong> {analysisContract.clauseType}
                          </p>
                        )}
                        <p>
                          <strong>Criterio:</strong> {analysisContract.clauseRegulation}
                        </p>
                        {analysisContract.complianceNeeds && (
                          <p>
                            <strong>Recomendación:</strong> {analysisContract.complianceNeeds}
                          </p>
                        )}
                        {analysisContract.clauseComplianceNotes && (
                          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                            <strong>Nota:</strong> {analysisContract.clauseComplianceNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background p-4 shadow-sm">
                      <p className="mb-3 font-medium">Documentos asociados</p>
                      {analysisContract.attachments.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {analysisContract.attachments.map((attachment) => (
                            <div
                              key={`${analysisContract.id}-modal-${attachment.storageId ?? attachment.fileName}`}
                              className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="break-words text-sm font-medium">{attachment.fileName}</p>
                                <p className="text-xs text-muted-foreground">{attachment.definition}</p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => previewContractAttachment(attachment)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => downloadContractAttachment(attachment)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Descargar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin archivos adjuntos.</p>
                      )}
                    </div>
                  </section>

                  <aside className="sticky top-0 flex min-w-0 flex-col gap-3 self-start rounded-xl border bg-background p-4 text-sm leading-relaxed shadow-sm">
                    <p className="text-base font-medium">Datos del contrato</p>
                    <p>
                      <strong>Tercero:</strong>{" "}
                      {analysisContract.providerIdentity || analysisContract.thirdPartyName || "No definido"}
                    </p>
                    <p>
                      <strong>Área:</strong> {analysisContract.areas.join(", ")}
                    </p>
                    <p>
                      <strong>Objeto:</strong> {analysisContract.treatmentPurpose}
                    </p>
                    <p>
                      <strong>Comunicación:</strong> {analysisContract.communicationType}
                    </p>
                    <p>
                      <strong>Relación:</strong> {analysisContract.relationType}
                    </p>
                    <p>
                      <strong>Vigencia:</strong> {formatDate(analysisContract.startDate)} a{" "}
                      {formatDate(analysisContract.expirationDate)}
                    </p>
                    <p>
                      <strong>Fuente:</strong>{" "}
                      {(analysisContract.metadata?.sourceFolder as string) || "Historial de contratos"}
                    </p>
                    {analysisContract.riskNotes && (
                      <p className="rounded-md bg-muted px-3 py-2">
                        <strong>Riesgo:</strong> {analysisContract.riskNotes}
                      </p>
                    )}
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="contract-update-reminder"
                            checked={scheduleUpdateReminder}
                            onCheckedChange={setScheduleUpdateReminder}
                          />
                          <Label htmlFor="contract-update-reminder" className="text-sm font-medium">
                            Actualizar
                          </Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                aria-label="Información de actualización"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Programa revisiones recurrentes del contrato y sincroniza el aviso con Recordatorios.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={updateReminderInterval}
                        onValueChange={(value) =>
                          setUpdateReminderInterval(value as AuditReminderRecurrenceInterval)
                        }
                        disabled={!scheduleUpdateReminder}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Periodo de actualización" />
                        </SelectTrigger>
                        <SelectContent>
                          {updateReminderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={!scheduleUpdateReminder}
                        onClick={scheduleContractUpdateReminder}
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        Programar recordatorio
                      </Button>
                    </div>
                  </aside>
                </div>
              </div>

              <DialogFooter className="shrink-0 items-center justify-between border-t bg-background px-5 py-4 sm:justify-between sm:px-6">
                <span className="hidden text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline">
                  Análisis contractual
                </span>
                <Button type="button" variant="outline" onClick={() => setAnalysisContract(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ArcoModuleShell>
  )
}
