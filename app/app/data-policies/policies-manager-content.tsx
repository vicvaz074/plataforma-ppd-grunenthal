"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  BarChart,
  Bar,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Download,
  Eye,
  FileDown,
  FileText,
  FolderSearch,
  ListFilter,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx"
import { saveAs } from "file-saver"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ArcoModuleShell } from "@/components/arco-module-shell"
import { DATA_POLICIES_META, DATA_POLICIES_NAV } from "@/components/arco-module-config"
import { FilePreviewDialog } from "@/components/file-preview-dialog"
import { ensureBrowserStorageEvents } from "@/lib/browser-storage-events"
import { createFileURL, getAllFiles, getFileById, type StoredFile } from "@/lib/fileStorage"
import { canOfferFilePreview } from "@/lib/file-preview"
import {
  GRUNENTHAL_CURATED_POLICY_DOCUMENTS,
  buildGrunenthalCuratedPolicyDocuments,
  buildGrunenthalRepositoryDocuments,
  type GrunenthalPolicyScope,
  type GrunenthalRepositoryDocumentWithFile,
} from "@/lib/grunenthal-repository"
import { cn } from "@/lib/utils"
import {
  POLICY_TEMPLATE_SECTIONS,
  addPolicyEvidence,
  confirmPolicyReviewWithoutChanges,
  createEmptyPolicyRecord,
  getCurrentWorkflowStep,
  getPolicyDimensionDonut,
  getPolicyDimensionRows,
  getPolicyEvidenceFiles,
  getPolicyProgramSnapshot,
  getPolicyStatusLabel,
  getPolicyStatusTone,
  getPrimaryPolicy,
  isPolicyWorkflowBlocked,
  loadPolicyRecords,
  normalizePolicyRecord,
  persistPolicyRecords,
  policyHasMinimumEvidence,
  publishPolicy,
  resolveWorkflowStep,
  sendPolicyToReview,
  storePolicyEvidenceFile,
  upsertReadingAcknowledgement,
  type PolicyEvidenceType,
  type PolicyRecord,
  type PolicyWorkflowOutcome,
  type PolicyWorkflowStepId,
} from "@/lib/policy-governance"

const GREEN_HEX = "#16a34a"
const AMBER_HEX = "#d97706"
const RED_HEX = "#dc2626"

const WIZARD_STEPS = [
  { id: 1, title: "Contexto" },
  { id: 2, title: "Plantilla" },
  { id: 3, title: "Parametrización" },
  { id: 4, title: "Revisión" },
  { id: 5, title: "Envío" },
] as const

const EVIDENCE_TYPE_OPTIONS: Array<{ value: PolicyEvidenceType; label: string }> = [
  { value: "supporting-document", label: "Documento soporte" },
  { value: "training", label: "Capacitación" },
  { value: "audit", label: "Auditoría" },
  { value: "supplemental", label: "Evidencia complementaria" },
  { value: "linked-module", label: "Evidencia vinculada" },
]

const POLICY_DEFINITIONS = [
  ["Aviso de privacidad", "Documento puesto a disposición del titular para informar las características del tratamiento."],
  ["Datos personales", "Cualquier información concerniente a una persona física identificada o identificable."],
  ["Datos personales sensibles", "Datos cuya utilización indebida puede dar origen a discriminación o riesgo grave para el titular."],
  ["Derechos ARCO", "Derechos de Acceso, Rectificación, Cancelación y Oposición que puede ejercer el titular."],
  ["Encargado", "Persona física o jurídica que trata datos personales por cuenta del responsable."],
  ["Tratamiento", "Obtención, uso, divulgación o almacenamiento de datos personales por cualquier medio."],
] as const

type PoliciesManagerProps = {
  initialSection?: PoliciesManagerSection
}

type PoliciesManagerSection = "registro" | "consulta" | "repositorio"

function getSectionRoute(section: PoliciesManagerSection) {
  if (section === "registro") return "/data-policies?section=registro"
  if (section === "repositorio") return "/data-policies?section=repositorio"
  return "/data-policies?section=consulta"
}

const REPOSITORY_MODULE_LABELS: Record<string, string> = {
  "arco-rights": "Derechos ARCO",
  "data-policies": "Políticas",
  dpo: "Departamento de Datos Personales",
  "privacy-notices": "Avisos",
  "security-system": "Seguridad",
  "third-party-contracts": "Contratos",
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function joinLines(values: string[]) {
  return values.join("\n")
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function repositoryDocumentSearchText(document: GrunenthalRepositoryDocumentWithFile) {
  return normalizeSearchValue(
    [
      document.title,
      document.area,
      document.type,
      document.category,
      document.sourceLabel,
      document.downloadName,
      document.storedFile.name,
      document.tags.join(" "),
      document.storedFile.metadata?.providerIdentity,
      document.storedFile.metadata?.noticeName,
      document.storedFile.metadata?.thirdPartyName,
    ]
      .filter(Boolean)
      .join(" "),
  )
}

function repositoryModuleLabel(module?: string) {
  return module ? REPOSITORY_MODULE_LABELS[module] || module : "Repositorio"
}

function addMonthsToDate(dateValue: string, months: number) {
  if (!dateValue) return ""
  const next = new Date(dateValue)
  if (Number.isNaN(next.getTime())) return ""
  next.setMonth(next.getMonth() + months)
  return next.toISOString().slice(0, 10)
}

function getActor() {
  if (typeof window === "undefined") return "Sistema"
  return localStorage.getItem("userName")?.trim() || "Sistema"
}

function formatDateLabel(value?: string) {
  if (!value) return "Pendiente"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function diffDays(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function buildReferenceCode(index: number) {
  return `DG-GDP-${String(index + 1).padStart(3, "0")}`
}

function getNearestScrollableParent(node: HTMLElement) {
  let parent = node.parentElement

  while (parent) {
    const style = window.getComputedStyle(parent)
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY)
    if (canScroll && parent.scrollHeight > parent.clientHeight) return parent
    parent = parent.parentElement
  }

  return null
}

function scrollSectionPanelIntoView(node: HTMLElement, behavior: ScrollBehavior = "smooth") {
  const scrollParent = getNearestScrollableParent(node)

  if (scrollParent) {
    let targetTop = 0
    let current: HTMLElement | null = node

    while (current && current !== scrollParent) {
      targetTop += current.offsetTop
      current = current.offsetParent as HTMLElement | null
    }

    if (!current) {
      targetTop = node.offsetTop
    }

    scrollParent.scrollTo({ top: Math.max(targetTop, 0), behavior })
  } else {
    node.scrollIntoView({ behavior, block: "start" })
  }

  node.focus({ preventScroll: true })
}

function statusClasses(status: PolicyRecord["status"]) {
  const tone = getPolicyStatusTone(status)
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "blue") return "border-sky-200 bg-sky-50 text-sky-700"
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function chartColor(value: number) {
  if (value >= 100) return GREEN_HEX
  if (value > 0) return AMBER_HEX
  return RED_HEX
}

function SectionPill({ active, done, index, title }: { active: boolean; done: boolean; index: number; title: string }) {
  return (
    <div
      className={cn(
        "flex min-w-[140px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-primary/20 bg-primary/5 text-primary"
          : done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-600",
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs">
        {done ? <CheckCircle2 className="h-4 w-4" /> : index}
      </span>
      <span className="text-sm">{title}</span>
    </div>
  )
}

export function PoliciesManager({ initialSection = "registro" }: PoliciesManagerProps) {
  const { toast } = useToast()
  const previewRef = useRef<HTMLDivElement>(null)
  const sectionContentRef = useRef<HTMLDivElement>(null)
  const pendingSectionScrollRef = useRef(false)
  const searchParams = useSearchParams()

  const [policies, setPolicies] = useState<PolicyRecord[]>([])
  const [repositoryFiles, setRepositoryFiles] = useState<StoredFile[]>([])
  const [activeSection, setActiveSection] = useState<PoliciesManagerSection>(initialSection)
  const [wizardStep, setWizardStep] = useState<number>(1)
  const [draft, setDraft] = useState<PolicyRecord>(() => createEmptyPolicyRecord())
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const [repositorySearch, setRepositorySearch] = useState("")
  const [repositoryPolicyScopeFilter, setRepositoryPolicyScopeFilter] = useState<"all" | GrunenthalPolicyScope>("all")
  const [repositoryModuleFilter, setRepositoryModuleFilter] = useState("all")
  const [repositoryTypeFilter, setRepositoryTypeFilter] = useState("all")
  const [repositoryAreaFilter, setRepositoryAreaFilter] = useState("all")
  const [repositoryAdvancedFiltersOpen, setRepositoryAdvancedFiltersOpen] = useState(false)
  const [repositoryPreviewFile, setRepositoryPreviewFile] = useState<StoredFile | null>(null)
  const [builderErrors, setBuilderErrors] = useState<string[]>([])
  const [submissionComment, setSubmissionComment] = useState("")
  const [publishComment, setPublishComment] = useState("")
  const [workflowComments, setWorkflowComments] = useState<Record<string, string>>({})
  const [readingPerson, setReadingPerson] = useState("")
  const [readingArea, setReadingArea] = useState("")
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [evidenceType, setEvidenceType] = useState<PolicyEvidenceType>("supporting-document")
  const [evidenceTitle, setEvidenceTitle] = useState("")
  const [evidenceDescription, setEvidenceDescription] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)

  useEffect(() => {
    ensureBrowserStorageEvents()
    const refresh = () => {
      const nextPolicies = loadPolicyRecords()
      setPolicies(nextPolicies)
      setRepositoryFiles(getAllFiles())
      if (!selectedPolicyId && nextPolicies.length > 0) {
        setSelectedPolicyId(nextPolicies[0].id)
      }
    }

    refresh()
    window.addEventListener("storage", refresh)
    return () => window.removeEventListener("storage", refresh)
  }, [selectedPolicyId])

  const sortedPolicies = useMemo(
    () =>
      [...policies].sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt).getTime()
        const rightTime = new Date(right.updatedAt || right.createdAt).getTime()
        return rightTime - leftTime
      }),
    [policies],
  )

  const selectedPolicy = useMemo(
    () => sortedPolicies.find((policy) => policy.id === selectedPolicyId) || sortedPolicies[0] || null,
    [selectedPolicyId, sortedPolicies],
  )

  const snapshot = useMemo(() => getPolicyProgramSnapshot(sortedPolicies), [sortedPolicies])
  const primaryPolicy = useMemo(() => getPrimaryPolicy(sortedPolicies), [sortedPolicies])
  const chartRows = useMemo(() => getPolicyDimensionRows(primaryPolicy), [primaryPolicy])
  const donutData = useMemo(() => getPolicyDimensionDonut(primaryPolicy), [primaryPolicy])
  const previewDraft = useMemo(() => normalizePolicyRecord(draft), [draft])
  const previewRows = useMemo(() => getPolicyDimensionRows(previewDraft), [previewDraft])
  const allRepositoryDocuments = useMemo(
    () => buildGrunenthalRepositoryDocuments(repositoryFiles),
    [repositoryFiles],
  )
  const repositoryDocuments = useMemo(
    () => buildGrunenthalCuratedPolicyDocuments(repositoryFiles),
    [repositoryFiles],
  )
  const repositoryModuleOptions = useMemo(
    () =>
      Array.from(
        new Set(repositoryDocuments.map((document) => document.originModule || document.module)),
      ).sort((left, right) =>
        repositoryModuleLabel(left).localeCompare(repositoryModuleLabel(right), "es"),
      ),
    [repositoryDocuments],
  )
  const repositoryTypes = useMemo(
    () => Array.from(new Set(repositoryDocuments.map((document) => document.type))).sort((left, right) => left.localeCompare(right, "es")),
    [repositoryDocuments],
  )
  const repositoryAreas = useMemo(
    () => Array.from(new Set(repositoryDocuments.map((document) => document.area))).sort((left, right) => left.localeCompare(right, "es")),
    [repositoryDocuments],
  )
  const filteredRepositoryDocuments = useMemo(() => {
    const query = normalizeSearchValue(repositorySearch)

    return repositoryDocuments.filter((document) => {
      const matchesSearch = !query || repositoryDocumentSearchText(document).includes(query)
      const originModule = document.originModule || document.module
      const matchesScope = repositoryPolicyScopeFilter === "all" || document.policyScope === repositoryPolicyScopeFilter
      const matchesModule = repositoryModuleFilter === "all" || originModule === repositoryModuleFilter
      const matchesType = repositoryTypeFilter === "all" || document.type === repositoryTypeFilter
      const matchesArea = repositoryAreaFilter === "all" || document.area === repositoryAreaFilter
      return matchesSearch && matchesScope && matchesModule && matchesType && matchesArea
    })
  }, [
    repositoryAreaFilter,
    repositoryDocuments,
    repositoryModuleFilter,
    repositoryPolicyScopeFilter,
    repositorySearch,
    repositoryTypeFilter,
  ])
  const policyScopeStats = useMemo(
    () =>
      repositoryDocuments.reduce(
        (acc, document) => {
          if (document.policyScope === "global") acc.global += 1
          if (document.policyScope === "mexico") acc.mexico += 1
          return acc
        },
        { mexico: 0, global: 0 },
      ),
    [repositoryDocuments],
  )
  const activeRepositoryFilterCount = useMemo(
    () =>
      [
        repositorySearch.trim() ? "search" : "",
        repositoryPolicyScopeFilter !== "all" ? "scope" : "",
        repositoryModuleFilter !== "all" ? "module" : "",
        repositoryTypeFilter !== "all" ? "type" : "",
        repositoryAreaFilter !== "all" ? "area" : "",
      ].filter(Boolean).length,
    [
      repositoryAreaFilter,
      repositoryModuleFilter,
      repositoryPolicyScopeFilter,
      repositorySearch,
      repositoryTypeFilter,
    ],
  )
  const repositoryScopeOptions = useMemo(
    () => [
      { value: "all" as const, label: "Todas", count: repositoryDocuments.length },
      { value: "mexico" as const, label: "MX", count: policyScopeStats.mexico },
      { value: "global" as const, label: "Global", count: policyScopeStats.global },
    ],
    [policyScopeStats.global, policyScopeStats.mexico, repositoryDocuments.length],
  )
  const showRepositoryAdvancedFilters =
    repositoryAdvancedFiltersOpen ||
    repositoryModuleFilter !== "all" ||
    repositoryTypeFilter !== "all" ||
    repositoryAreaFilter !== "all"
  const resetRepositoryFilters = useCallback(() => {
    setRepositorySearch("")
    setRepositoryPolicyScopeFilter("all")
    setRepositoryModuleFilter("all")
    setRepositoryTypeFilter("all")
    setRepositoryAreaFilter("all")
    setRepositoryAdvancedFiltersOpen(false)
  }, [])
  const sectionNavigation = useMemo(
    () => [
      {
        id: "registro" as const,
        label: "Registro guiado",
        description: "Builder, vigencia y aprobación",
        metric: `${snapshot.underReview} en revisión`,
        icon: PlusCircle,
      },
      {
        id: "consulta" as const,
        label: "Consulta y expediente",
        description: "Madurez, evidencia y workflow",
        metric: `${sortedPolicies.length} política(s)`,
        icon: ShieldCheck,
      },
      {
        id: "repositorio" as const,
        label: "Repositorio documental",
        description: "Políticas México y globales",
        metric: `${repositoryDocuments.length} documento(s)`,
        icon: FolderSearch,
      },
    ],
    [repositoryDocuments.length, snapshot.underReview, sortedPolicies.length],
  )
  const activeSectionNavigation = sectionNavigation.find((item) => item.id === activeSection) || sectionNavigation[1]
  const navItems = useMemo(
    () =>
      [
        ...DATA_POLICIES_NAV.map((item) => {
        if (item.href === "/data-policies/consulta") return { ...item, id: "consulta", badge: sortedPolicies.length }
        if (item.href === "/data-policies/registro") return { ...item, id: "registro", badge: snapshot.underReview }
        return { ...item, id: "panorama" }
        }),
        {
          id: "repositorio",
          href: "/data-policies?section=repositorio",
          label: "Repositorio",
          shortLabel: "Repositorio",
          mobileLabel: "Repositorio documental",
          icon: FolderSearch,
          badge: repositoryDocuments.length,
        },
      ],
    [repositoryDocuments.length, snapshot.underReview, sortedPolicies.length],
  )

  useEffect(() => {
    const requestedSection = searchParams.get("section")
    if (requestedSection === "registro" || requestedSection === "consulta" || requestedSection === "repositorio") {
      setActiveSection(requestedSection)
    }
  }, [searchParams])

  useEffect(() => {
    const requestedPolicyId = searchParams.get("policy")
    if (!requestedPolicyId) return
    if (sortedPolicies.some((policy) => policy.id === requestedPolicyId)) {
      setActiveSection("consulta")
      setSelectedPolicyId(requestedPolicyId)
    }
  }, [searchParams, sortedPolicies])

  const scheduleSectionPanelScroll = useCallback(() => {
    if (typeof window === "undefined") return

    const scrollToActivePanel = (behavior: ScrollBehavior = "smooth") => {
      if (sectionContentRef.current) {
        scrollSectionPanelIntoView(sectionContentRef.current, behavior)
      }
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToActivePanel())
    })
    window.setTimeout(scrollToActivePanel, 220)
    window.setTimeout(scrollToActivePanel, 520)
    window.setTimeout(() => scrollToActivePanel("auto"), 980)
  }, [])

  useEffect(() => {
    if (!pendingSectionScrollRef.current) return
    pendingSectionScrollRef.current = false
    scheduleSectionPanelScroll()
  }, [activeSection, scheduleSectionPanelScroll])

  const handleSectionChange = useCallback(
    (
      section: PoliciesManagerSection,
      options: { scroll?: boolean; updateUrl?: boolean } = {},
    ) => {
      const { scroll = true, updateUrl = true } = options
      if (scroll) {
        pendingSectionScrollRef.current = true
      }
      setActiveSection(section)

      if (updateUrl && typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", getSectionRoute(section))
      }

      if (scroll && section === activeSection) {
        pendingSectionScrollRef.current = false
        scheduleSectionPanelScroll()
      }
    },
    [activeSection, scheduleSectionPanelScroll],
  )

  const replacePolicy = (record: PolicyRecord) => {
    const exists = policies.some((item) => item.id === record.id)
    const next = exists ? policies.map((item) => (item.id === record.id ? record : item)) : [record, ...policies]
    persistPolicyRecords(next)
    const refreshed = loadPolicyRecords()
    setPolicies(refreshed)
    setSelectedPolicyId(record.id)
  }

  const startNewPolicy = () => {
    const next = createEmptyPolicyRecord()
    next.referenceCode = buildReferenceCode(policies.length)
    next.content.document.referenceCode = next.referenceCode
    setDraft(next)
    setWizardStep(1)
    setBuilderErrors([])
    setSubmissionComment("")
    handleSectionChange("registro")
  }

  const editPolicyInBuilder = (policy: PolicyRecord) => {
    setDraft(normalizePolicyRecord(policy))
    setWizardStep(1)
    setBuilderErrors([])
    setSubmissionComment("")
    handleSectionChange("registro")
  }

  const updateDraft = (updater: (current: PolicyRecord) => PolicyRecord) => {
    setDraft((current) => normalizePolicyRecord(updater(current)))
  }

  const updateDraftList = (
    section: "scope" | "principles" | "objectives" | "securityMeasures" | "confidentialityMeasures" | "documents",
    value: string,
  ) => {
    const nextValues = splitLines(value)
    updateDraft((current) => {
      if (section === "scope") {
        return {
          ...current,
          content: {
            ...current.content,
            scope: {
              ...current.content.scope,
              appliesTo: nextValues,
            },
          },
          assignedAreas: nextValues,
        }
      }
      if (section === "principles") {
        return {
          ...current,
          content: {
            ...current.content,
            principles: nextValues,
          },
          principles: nextValues,
        }
      }
      if (section === "objectives") {
        return {
          ...current,
          content: {
            ...current.content,
            objectives: nextValues,
          },
          generalObjective: nextValues[0] || "",
        }
      }
      if (section === "securityMeasures") {
        return {
          ...current,
          content: {
            ...current.content,
            duties: {
              ...current.content.duties,
              securityMeasures: nextValues,
            },
          },
        }
      }
      if (section === "confidentialityMeasures") {
        return {
          ...current,
          content: {
            ...current.content,
            duties: {
              ...current.content.duties,
              confidentialityMeasures: nextValues,
            },
          },
        }
      }
      return {
        ...current,
        content: {
          ...current.content,
          complementaryDocuments: nextValues,
        },
        relatedPolicies: nextValues,
      }
    })
  }

  const validateStep = (step: number) => {
    const errors: string[] = []

    if (step === 1) {
      if (!draft.orgName.trim()) errors.push("Captura el nombre de la organización.")
      if (!draft.orgSector.trim()) errors.push("Captura el sector de la organización.")
      if (!draft.ownerArea.trim()) errors.push("Captura el área propietaria.")
      if (!draft.ownerContact.trim()) errors.push("Captura el contacto responsable.")
      if (!draft.content.context.organizationDescription.trim()) errors.push("Describe el contexto de la organización.")
      if (!draft.content.context.mission.trim()) errors.push("Captura la misión organizacional.")
      if (!draft.content.opd.officerName.trim()) errors.push("Captura el nombre del Oficial de Protección de Datos.")
      if (!draft.content.opd.officerContact.trim()) errors.push("Captura el contacto del Oficial de Protección de Datos.")
    }

    if (step === 2) {
      if (!draft.referenceCode.trim()) errors.push("Define la clave de referencia del documento.")
      if (!draft.content.document.classification.trim()) errors.push("Selecciona la clasificación del documento.")
      if (!draft.content.document.authorName.trim()) errors.push("Captura el autor del documento.")
      if (![12, 24, 36].includes(draft.reviewCycleMonths)) errors.push("El ciclo de revisión debe ser de 12, 24 o 36 meses.")
    }

    if (step === 3) {
      if (draft.content.principles.length < 4) errors.push("Incluye al menos cuatro principios de protección de datos.")
      if (!draft.content.communications.legalInstrumentSummary.trim()) errors.push("Describe la regla de comunicaciones de datos.")
      if (!draft.content.arco.medium.trim()) errors.push("Completa el medio habilitado para ARCO.")
      if (!draft.content.arco.identityVerification.trim()) errors.push("Completa la verificación de identidad para ARCO.")
      if (!draft.content.arco.trackingProcedure.trim()) errors.push("Completa el procedimiento de seguimiento ARCO.")
      if (!draft.content.arco.revocationProcedure.trim()) errors.push("Completa la revocación de consentimiento.")
      if (!draft.content.arco.limitationProcedure.trim()) errors.push("Completa la limitación de uso/divulgación.")
      if (!draft.content.sgdp.monitoringSummary.trim()) errors.push("Describe el monitoreo del SGDP.")
      if (!draft.content.sgdp.auditsSummary.trim()) errors.push("Describe la supervisión/auditorías del SGDP.")
      if (!draft.content.sgdp.improvementSummary.trim()) errors.push("Describe la mejora continua del SGDP.")
      if (!draft.generalObjective.trim()) errors.push("Define el objetivo general de la PGDP.")
      if (!draft.generalGuidelines.trim()) errors.push("Describe los lineamientos generales de la PGDP.")
    }

    if (step === 4) {
      const mandatoryRows = previewRows.filter((row) => row.id !== "expediente")
      if (mandatoryRows.some((row) => row.value === 0)) {
        errors.push("Antes de continuar, todas las secciones obligatorias deben quedar al menos en estado parcial.")
      }
    }

    if (step === 5) {
      if (!draft.effectiveDate) errors.push("Define la fecha de entrada en vigor.")
      if (!draft.expiryDate) errors.push("Define la fecha de vencimiento.")
      if (!draft.reviewResponsibles.trim()) errors.push("Define responsables de revisión.")
      const expiryDays = diffDays(draft.expiryDate)
      if (expiryDays !== null && draft.effectiveDate && draft.expiryDate) {
        const effective = new Date(draft.effectiveDate)
        const expiry = new Date(draft.expiryDate)
        const months = (expiry.getFullYear() - effective.getFullYear()) * 12 + (expiry.getMonth() - effective.getMonth())
        if (months > 36 || months < 0) {
          errors.push("La vigencia configurada debe estar entre 0 y 36 meses.")
        }
      }
    }

    return errors
  }

  const handleNextStep = () => {
    const errors = validateStep(wizardStep)
    setBuilderErrors(errors)
    if (errors.length === 0) {
      setWizardStep((current) => Math.min(current + 1, 5))
    }
  }

  const handlePreviousStep = () => {
    setBuilderErrors([])
    setWizardStep((current) => Math.max(current - 1, 1))
  }

  const handleSaveDraft = () => {
    const normalized = normalizePolicyRecord({
      ...draft,
      referenceCode: draft.referenceCode || buildReferenceCode(policies.length),
      content: {
        ...draft.content,
        document: {
          ...draft.content.document,
          referenceCode: draft.referenceCode || buildReferenceCode(policies.length),
          ownerArea: draft.ownerArea,
        },
        context: {
          ...draft.content.context,
          sector: draft.orgSector,
        },
      },
      updatedAt: new Date().toISOString(),
      status: "DRAFT",
      responsibleArea: draft.ownerArea,
      responsibleContact: draft.ownerContact,
      reviewFrequency: `${draft.reviewCycleMonths} meses`,
      scope: draft.content.scope.appliesTo,
      principles: draft.content.principles,
      policyDocuments: draft.policyDocuments,
    })

    replacePolicy(normalized)
    setDraft(normalized)
    toast({
      title: "PGDP guardada",
      description: "El borrador se guardó con el nuevo modelo de gobernanza.",
    })
  }

  const handleSendToReview = () => {
    const errors = validateStep(5)
    setBuilderErrors(errors)
    if (errors.length > 0) return

    const baseRecord = normalizePolicyRecord({
      ...draft,
      referenceCode: draft.referenceCode || buildReferenceCode(policies.length),
      content: {
        ...draft.content,
        document: {
          ...draft.content.document,
          referenceCode: draft.referenceCode || buildReferenceCode(policies.length),
          ownerArea: draft.ownerArea,
        },
        context: {
          ...draft.content.context,
          sector: draft.orgSector,
        },
      },
      updatedAt: new Date().toISOString(),
    })
    const sent = sendPolicyToReview(baseRecord, getActor(), submissionComment)
    replacePolicy(sent)
    setDraft(sent)
    handleSectionChange("consulta")
    toast({
      title: "PGDP enviada a aprobación",
      description: "El workflow real de 3 niveles quedó activado y sincronizado.",
    })
  }

  const handleResolveWorkflow = (
    record: PolicyRecord,
    stepId: PolicyWorkflowStepId,
    outcome: Exclude<PolicyWorkflowOutcome, "pending">,
  ) => {
    const commentKey = `${record.id}:${stepId}`
    const next = resolveWorkflowStep(record, stepId, outcome, getActor(), workflowComments[commentKey] || "")
    replacePolicy(next)
    toast({
      title: outcome === "approved" ? "Paso aprobado" : outcome === "changes-requested" ? "Cambios solicitados" : "Paso rechazado",
      description: `Se actualizó el paso ${stepId} del workflow de ${record.referenceCode}.`,
    })
  }

  const handlePublish = (record: PolicyRecord) => {
    const published = publishPolicy(record, getActor(), publishComment)
    replacePolicy(published)
    setPublishComment("")
    toast({
      title: "PGDP publicada",
      description: "La política quedó vigente, versionada y sincronizada con recordatorios.",
    })
  }

  const handleConfirmReviewWithoutChanges = (record: PolicyRecord) => {
    const reviewed = confirmPolicyReviewWithoutChanges(record, getActor(), publishComment)
    replacePolicy(reviewed)
    setPublishComment("")
    toast({
      title: "Revisión registrada",
      description: "La política quedó vigente sin cambios y se actualizó la próxima revisión.",
    })
  }

  const handleRegisterReading = () => {
    if (!selectedPolicy || !readingPerson.trim() || !readingArea.trim()) {
      toast({
        title: "Faltan datos",
        description: "Captura nombre y área para registrar la confirmación de lectura.",
        variant: "destructive",
      })
      return
    }
    const next = upsertReadingAcknowledgement(selectedPolicy, readingPerson, readingArea)
    replacePolicy(next)
    setReadingPerson("")
    setReadingArea("")
    toast({
      title: "Lectura confirmada",
      description: "La confirmación se integró al expediente de cumplimiento.",
    })
  }

  const handleAddEvidence = async () => {
    if (!selectedPolicy || !evidenceTitle.trim()) {
      toast({
        title: "Falta información",
        description: "Define al menos el título de la evidencia.",
        variant: "destructive",
      })
      return
    }

    const fileIds: string[] = []
    if (evidenceFile) {
      const stored = await storePolicyEvidenceFile(evidenceFile, selectedPolicy.id, evidenceType, evidenceTitle)
      fileIds.push(stored.id)
    }

    const next = addPolicyEvidence(selectedPolicy, {
      type: evidenceType,
      title: evidenceTitle,
      description: evidenceDescription,
      createdBy: getActor(),
      fileIds,
      linkedModuleId: evidenceType === "linked-module" ? "arco-rights" : undefined,
    })
    replacePolicy(next)
    setEvidenceDialogOpen(false)
    setEvidenceType("supporting-document")
    setEvidenceTitle("")
    setEvidenceDescription("")
    setEvidenceFile(null)
    toast({
      title: "Evidencia agregada",
      description: "El expediente del módulo se actualizó con la nueva evidencia.",
    })
  }

  const openStoredFile = (fileId: string) => {
    const file = getFileById(fileId)
    if (!file) {
      toast({
        title: "Archivo no encontrado",
        description: "No fue posible localizar el archivo almacenado.",
        variant: "destructive",
      })
      return
    }
    window.open(createFileURL(file.content), "_blank", "noopener,noreferrer")
  }

  const openRepositoryDocument = (document: GrunenthalRepositoryDocumentWithFile) => {
    if (!canOfferFilePreview(document.storedFile)) {
      toast({
        title: "Vista previa no disponible",
        description: "Este recurso puede descargarse, pero no tiene una vista previa compatible.",
        variant: "destructive",
      })
      return
    }
    setRepositoryPreviewFile(document.storedFile)
  }

  const downloadRepositoryDocument = (document: GrunenthalRepositoryDocumentWithFile) => {
    const link = window.document.createElement("a")
    link.href = createFileURL(document.storedFile.content)
    link.download = document.downloadName || document.storedFile.name
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  const exportPolicyToWord = async (record: PolicyRecord) => {
    const narrative = [
      new Paragraph({
        text: record.title,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({ children: [new TextRun({ text: "Organización: ", bold: true }), new TextRun(record.orgName)] }),
      new Paragraph({ children: [new TextRun({ text: "Referencia: ", bold: true }), new TextRun(record.referenceCode)] }),
      new Paragraph({ children: [new TextRun({ text: "Versión: ", bold: true }), new TextRun(record.versionLabel)] }),
      new Paragraph({ children: [new TextRun({ text: "Fecha de vigencia: ", bold: true }), new TextRun(formatDateLabel(record.effectiveDate))] }),
      new Paragraph({ children: [new TextRun({ text: "Próxima revisión: ", bold: true }), new TextRun(formatDateLabel(record.nextReviewDate))] }),
      new Paragraph({ text: "" }),
      new Paragraph({ text: "Definiciones de utilidad", heading: HeadingLevel.HEADING_1 }),
      ...POLICY_DEFINITIONS.flatMap(([term, definition]) => [
        new Paragraph({ children: [new TextRun({ text: `${term}: `, bold: true }), new TextRun(definition)] }),
      ]),
      new Paragraph({ text: "Contexto de la organización", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: record.content.context.organizationDescription }),
      new Paragraph({ text: `Misión: ${record.content.context.mission}` }),
      new Paragraph({ text: `Sector: ${record.orgSector}` }),
      new Paragraph({ text: "Objetivos", heading: HeadingLevel.HEADING_1 }),
      ...record.content.objectives.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      new Paragraph({ text: "Principios y deberes", heading: HeadingLevel.HEADING_1 }),
      ...record.content.principles.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      ...record.content.duties.securityMeasures.map((item) => new Paragraph({ text: `Seguridad: ${item}`, bullet: { level: 0 } })),
      ...record.content.duties.confidentialityMeasures.map((item) =>
        new Paragraph({ text: `Confidencialidad: ${item}`, bullet: { level: 0 } }),
      ),
      new Paragraph({ text: "Atención a derechos ARCO y quejas", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Medio habilitado: ${record.content.arco.medium}` }),
      new Paragraph({ text: `Verificación de identidad: ${record.content.arco.identityVerification}` }),
      new Paragraph({ text: `Seguimiento: ${record.content.arco.trackingProcedure}` }),
      new Paragraph({ text: `Revocación: ${record.content.arco.revocationProcedure}` }),
      new Paragraph({ text: `Limitación de uso/divulgación: ${record.content.arco.limitationProcedure}` }),
      new Paragraph({ text: "OPD / DPO", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `${record.content.opd.departmentName} · ${record.content.opd.officerName}` }),
      new Paragraph({ text: record.content.opd.officerContact }),
      new Paragraph({ text: "SGDP", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: record.content.sgdp.monitoringSummary }),
      new Paragraph({ text: record.content.sgdp.auditsSummary }),
      new Paragraph({ text: record.content.sgdp.improvementSummary }),
      new Paragraph({ text: "Marco documental complementario", heading: HeadingLevel.HEADING_1 }),
      ...record.content.complementaryDocuments.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      new Paragraph({ text: "Firmas de autorización", heading: HeadingLevel.HEADING_1 }),
      ...record.content.signatures.map((signature) =>
        new Paragraph({
          text: `${signature.area} · ${signature.responsible}${signature.date ? ` · ${signature.date}` : ""}`,
        }),
      ),
    ]

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: narrative,
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${record.referenceCode || "PGDP"}_${record.versionLabel}.docx`)
  }

  const exportPolicyToPdf = async () => {
    if (!previewRef.current || !selectedPolicy) return

    const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const imgProps = pdf.getImageProperties(imgData)
    const imgWidth = pageWidth - 40
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width
    pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight)
    pdf.save(`${selectedPolicy.referenceCode || "PGDP"}_${selectedPolicy.versionLabel}.pdf`)
  }

  const selectedEvidenceFiles = useMemo(
    () => (selectedPolicy ? getPolicyEvidenceFiles(selectedPolicy) : []),
    [selectedPolicy],
  )

  const canSaveDraft = draft.status !== "PUBLISHED"
  const expiringDays = selectedPolicy ? diffDays(selectedPolicy.expiryDate || selectedPolicy.nextReviewDate) : null
  const pageCopy =
    activeSection === "registro"
      ? {
          label: "Registro",
          title: "Builder operativo PGDP",
          description: "Configura políticas, vigencia y workflow de aprobación.",
        }
      : activeSection === "repositorio"
        ? {
            label: "Repositorio",
            title: "Repositorio documental Grünenthal",
            description: "Consulta, filtra, previsualiza y descarga políticas locales de México y políticas globales.",
          }
        : {
            label: "Consulta",
            title: "Tablero y expediente PGDP",
            description: "Consulta madurez, evidencia y seguimiento documental.",
          }
  const ActiveSectionIcon = activeSectionNavigation.icon

  return (
    <ArcoModuleShell
      moduleLabel={DATA_POLICIES_META.moduleLabel}
      moduleTitle={DATA_POLICIES_META.moduleTitle}
      moduleDescription={DATA_POLICIES_META.moduleDescription}
      pageLabel={pageCopy.label}
      pageTitle={pageCopy.title}
      pageDescription={pageCopy.description}
      navItems={navItems}
      activeNavId={activeSection}
      headerBadges={[
        { label: `${snapshot.total} políticas`, tone: "neutral" },
        {
          label: `${snapshot.publishedWithEvidence} vigentes con evidencia`,
          tone: snapshot.publishedWithEvidence > 0 ? "positive" : "warning",
        },
      ]}
      actions={
        <Button onClick={startNewPolicy}>
          Nueva PGDP
          <PlusCircle className="ml-2 h-4 w-4" />
        </Button>
      }
    >
      <div className="mx-auto flex min-w-0 w-full max-w-[1600px] flex-col gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5 lg:p-6">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    Políticas de Protección de Datos · PGDP
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                    LFPDPPP · RLFPDPPP · PAPDP
                  </Badge>
                </div>
                <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Gobernanza de Políticas de Protección de Datos
                </h1>
                <p className="max-w-4xl text-sm leading-6 text-slate-500">
                  Builder, expediente y repositorio documental en una vista de trabajo compacta.
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2 xl:min-w-[460px]">
                {[
                  { label: "Madurez", value: `${snapshot.score}/100` },
                  { label: "Evidencia", value: snapshot.publishedWithEvidence },
                  { label: "Repositorio", value: repositoryDocuments.length },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
                    <p className="break-words text-[10px] uppercase leading-4 tracking-[0.12em] text-slate-500 sm:text-xs">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {primaryPolicy && primaryPolicy.status === "EXPIRED" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                La política principal del módulo se encuentra vencida. Debe revisarse o republicarse para sostener cobertura.
              </div>
            ) : null}

            <div
              role="tablist"
              aria-label="Secciones de Políticas de Protección de Datos"
              className="grid min-w-0 gap-1 rounded-[22px] border border-[#d6e1f6] bg-[#f8fbff] p-1 sm:grid-cols-3"
            >
              {sectionNavigation.map((item) => {
                const Icon = item.icon
                const selected = activeSection === item.id

                return (
                  <button
                    key={item.id}
                    id={`policies-section-tab-${item.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`policies-section-panel-${item.id}`}
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      "group flex min-h-[58px] min-w-0 items-center gap-3 rounded-[18px] px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4abf] focus-visible:ring-offset-2 sm:px-4",
                      selected
                        ? "bg-[#0a4abf] text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-950",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                        selected
                          ? "border-white/25 bg-white/15 text-white"
                          : "border-[#d6e1f6] bg-white text-[#0a4abf]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block min-w-0 break-words text-sm font-semibold leading-5">{item.label}</span>
                      <span className={cn("block min-w-0 break-words text-xs", selected ? "text-blue-50" : "text-slate-500")}>
                        {item.metric}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div
          ref={sectionContentRef}
          id={`policies-section-panel-${activeSection}`}
          role="tabpanel"
          tabIndex={-1}
          aria-labelledby={`policies-section-tab-${activeSection}`}
          className="scroll-mt-4 space-y-4 focus:outline-none"
        >
          <div className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-[#d6e1f6] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f8fbff] text-[#0a4abf]">
                <ActiveSectionIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f7698]">Vista activa</p>
                <h2 className="mt-1 break-words text-xl font-semibold text-slate-950 sm:text-2xl">{pageCopy.title}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{pageCopy.description}</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit border-[#b9cff0] bg-white text-[#0a4abf]">
              {activeSectionNavigation.metric}
            </Badge>
          </div>

      {activeSection === "registro" ? (
        <div className="space-y-6">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {WIZARD_STEPS.map((step) => (
              <SectionPill
                key={step.id}
                active={wizardStep === step.id}
                done={wizardStep > step.id}
                index={step.id}
                title={step.title}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl text-slate-950">Builder de la PGDP</CardTitle>
                <CardDescription>
                  {wizardStep === 1 && "Completa el contexto organizacional y la estructura responsable de la PGDP."}
                  {wizardStep === 2 && "Configura la plantilla base y los metadatos documentales."}
                  {wizardStep === 3 && "Parametriza principios, deberes, ARCO, SGDP y trazabilidad operativa."}
                  {wizardStep === 4 && "Revisa cobertura y vista previa antes de iniciar el workflow."}
                  {wizardStep === 5 && "Define vigencia y envía la política al workflow real de aprobación."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {builderErrors.length > 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-medium">Faltan elementos para continuar:</p>
                    <ul className="mt-2 list-disc pl-5">
                      {builderErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {wizardStep === 1 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Nombre de la organización</Label>
                      <Input
                        value={draft.orgName}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            orgName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Sector</Label>
                      <Input
                        value={draft.orgSector}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            orgSector: event.target.value,
                            content: {
                              ...current.content,
                              context: {
                                ...current.content.context,
                                sector: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Área propietaria</Label>
                      <Input
                        value={draft.ownerArea}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            ownerArea: event.target.value,
                            responsibleArea: event.target.value,
                            content: {
                              ...current.content,
                              document: {
                                ...current.content.document,
                                ownerArea: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Contacto responsable</Label>
                      <Input
                        value={draft.ownerContact}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            ownerContact: event.target.value,
                            responsibleContact: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Descripción de la organización</Label>
                      <Textarea
                        value={draft.content.context.organizationDescription}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            content: {
                              ...current.content,
                              context: {
                                ...current.content.context,
                                organizationDescription: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Misión</Label>
                      <Textarea
                        value={draft.content.context.mission}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            content: {
                              ...current.content,
                              context: {
                                ...current.content.context,
                                mission: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Oficial de Protección de Datos</Label>
                      <Input
                        value={draft.content.opd.officerName}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            content: {
                              ...current.content,
                              opd: {
                                ...current.content.opd,
                                officerName: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Contacto del OPD</Label>
                      <Input
                        value={draft.content.opd.officerContact}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            content: {
                              ...current.content,
                              opd: {
                                ...current.content.opd,
                                officerContact: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Ámbito de aplicación</Label>
                      <Textarea
                        value={joinLines(draft.content.scope.appliesTo)}
                        onChange={(event) => updateDraftList("scope", event.target.value)}
                        placeholder="Un elemento por línea"
                      />
                    </div>
                  </div>
                ) : null}

                {wizardStep === 2 ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Plantilla</Label>
                        <Input value="PGDP · Política General de Gestión de Datos Personales" readOnly />
                      </div>
                      <div>
                        <Label>Clasificación</Label>
                        <Select
                          value={draft.content.document.classification}
                          onValueChange={(value) =>
                            updateDraft((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                document: {
                                  ...current.content.document,
                                  classification: value,
                                },
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Interno">Interno</SelectItem>
                            <SelectItem value="Confidencial">Confidencial</SelectItem>
                            <SelectItem value="Público">Público</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Referencia / clave</Label>
                        <Input
                          value={draft.referenceCode}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              referenceCode: event.target.value,
                              content: {
                                ...current.content,
                                document: {
                                  ...current.content.document,
                                  referenceCode: event.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Autor del documento</Label>
                        <Input
                          value={draft.content.document.authorName}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                document: {
                                  ...current.content.document,
                                  authorName: event.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Ciclo de revisión</Label>
                        <Select
                          value={String(draft.reviewCycleMonths)}
                          onValueChange={(value) =>
                            updateDraft((current) => {
                              const reviewCycleMonths = Number(value)
                              const nextExpiry = current.effectiveDate
                                ? addMonthsToDate(current.effectiveDate, reviewCycleMonths)
                                : current.expiryDate
                              return {
                                ...current,
                                reviewCycleMonths,
                                reviewFrequency: `${reviewCycleMonths} meses`,
                                expiryDate: nextExpiry,
                                nextReviewDate: current.effectiveDate
                                  ? addMonthsToDate(current.effectiveDate, reviewCycleMonths)
                                  : current.nextReviewDate,
                              }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12">12 meses</SelectItem>
                            <SelectItem value="24">24 meses</SelectItem>
                            <SelectItem value="36">36 meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Versión</Label>
                        <Input
                          value={draft.versionLabel}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              versionLabel: event.target.value,
                              content: {
                                ...current.content,
                                document: {
                                  ...current.content.document,
                                  versionLabel: event.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Secciones controladas por la plantilla PGDP</p>
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {POLICY_TEMPLATE_SECTIONS.map((section) => (
                          <div key={section} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                            {section}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {wizardStep === 3 ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 xl:grid-cols-2">
                      <div>
                        <Label>Objetivos</Label>
                        <Textarea
                          value={joinLines(draft.content.objectives)}
                          onChange={(event) => updateDraftList("objectives", event.target.value)}
                          className="min-h-[160px]"
                        />
                      </div>
                      <div>
                        <Label>Principios</Label>
                        <Textarea
                          value={joinLines(draft.content.principles)}
                          onChange={(event) => updateDraftList("principles", event.target.value)}
                          className="min-h-[160px]"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                      <div>
                        <Label>Medidas de seguridad</Label>
                        <Textarea
                          value={joinLines(draft.content.duties.securityMeasures)}
                          onChange={(event) => updateDraftList("securityMeasures", event.target.value)}
                          className="min-h-[160px]"
                        />
                      </div>
                      <div>
                        <Label>Medidas de confidencialidad</Label>
                        <Textarea
                          value={joinLines(draft.content.duties.confidentialityMeasures)}
                          onChange={(event) => updateDraftList("confidentialityMeasures", event.target.value)}
                          className="min-h-[160px]"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Regla de comunicaciones de datos</Label>
                      <Textarea
                        value={draft.content.communications.legalInstrumentSummary}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            content: {
                              ...current.content,
                              communications: {
                                ...current.content.communications,
                                legalInstrumentSummary: event.target.value,
                              },
                            },
                            generalGuidelines: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Integración obligatoria con ARCO</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Medio habilitado</Label>
                          <Input
                            value={draft.content.arco.medium}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  arco: {
                                    ...current.content.arco,
                                    medium: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Verificación de identidad</Label>
                          <Input
                            value={draft.content.arco.identityVerification}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  arco: {
                                    ...current.content.arco,
                                    identityVerification: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Registro y seguimiento</Label>
                          <Textarea
                            value={draft.content.arco.trackingProcedure}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  arco: {
                                    ...current.content.arco,
                                    trackingProcedure: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Revocación del consentimiento</Label>
                          <Textarea
                            value={draft.content.arco.revocationProcedure}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  arco: {
                                    ...current.content.arco,
                                    revocationProcedure: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Limitación de uso o divulgación</Label>
                          <Textarea
                            value={draft.content.arco.limitationProcedure}
                            onChange={(event) =>
                              updateDraft((current) => ({
                                ...current,
                                content: {
                                  ...current.content,
                                  arco: {
                                    ...current.content.arco,
                                    limitationProcedure: event.target.value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                      <div>
                        <Label>Monitoreo del SGDP</Label>
                        <Textarea
                          value={draft.content.sgdp.monitoringSummary}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                sgdp: {
                                  ...current.content.sgdp,
                                  monitoringSummary: event.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Supervisión y auditorías</Label>
                        <Textarea
                          value={draft.content.sgdp.auditsSummary}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              content: {
                                ...current.content,
                                sgdp: {
                                  ...current.content.sgdp,
                                  auditsSummary: event.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Mejora continua</Label>
                      <Textarea
                        value={draft.content.sgdp.improvementSummary}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            content: {
                              ...current.content,
                              sgdp: {
                                ...current.content.sgdp,
                                improvementSummary: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                      <div>
                        <Label>Lineamientos generales</Label>
                        <Textarea
                          value={draft.generalGuidelines}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              generalGuidelines: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Marco documental complementario</Label>
                        <Textarea
                          value={joinLines(draft.content.complementaryDocuments)}
                          onChange={(event) => updateDraftList("documents", event.target.value)}
                          className="min-h-[180px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {wizardStep === 4 ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                        <div className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                            <PieChart>
                              <Pie data={getPolicyDimensionDonut(previewDraft)} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>
                                {getPolicyDimensionDonut(previewDraft).map((slice) => (
                                  <Cell key={slice.name} fill={slice.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                          {getPolicyDimensionDonut(previewDraft).map((slice) => (
                            <div key={slice.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                                {slice.name}
                              </div>
                              <span className="text-slate-950">{slice.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          {previewRows.map((row) => (
                            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">{row.label}</p>
                                <Badge variant="outline" className={cn("border-current/20", row.status === "Cumplido" ? "text-emerald-700" : row.status === "Parcial" ? "text-amber-700" : "text-red-700")}>
                                  {row.status}
                                </Badge>
                              </div>
                              <p className="mt-2 text-3xl text-slate-950">{row.value}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vista previa</p>
                      <div className="mt-4 space-y-5">
                        {POLICY_TEMPLATE_SECTIONS.map((section, index) => (
                          <div key={section} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm text-slate-500">Sección {index + 1}</p>
                                <p className="text-lg text-slate-950">{section}</p>
                              </div>
                              <Badge variant="outline" className={cn("border-current/20", index < 7 ? "text-emerald-700" : "text-amber-700")}>
                                {index < 7 ? "Completa" : "En revisión"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {wizardStep === 5 ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Fecha de entrada en vigor</Label>
                        <Input
                          type="date"
                          value={draft.effectiveDate || ""}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              effectiveDate: event.target.value,
                              enforcementDate: event.target.value,
                              expiryDate: event.target.value ? addMonthsToDate(event.target.value, current.reviewCycleMonths) : current.expiryDate,
                              nextReviewDate: event.target.value ? addMonthsToDate(event.target.value, current.reviewCycleMonths) : current.nextReviewDate,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha de vencimiento</Label>
                        <Input
                          type="date"
                          value={draft.expiryDate || ""}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              expiryDate: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Próxima revisión</Label>
                        <Input value={draft.nextReviewDate || ""} readOnly />
                      </div>
                      <div>
                        <Label>Responsables de revisión</Label>
                        <Input
                          value={draft.reviewResponsibles}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              reviewResponsibles: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Comentario de envío</Label>
                        <Textarea value={submissionComment} onChange={(event) => setSubmissionComment(event.target.value)} />
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workflow estándar</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {previewDraft.workflow.map((step) => (
                          <div key={step.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{step.id.toUpperCase()}</p>
                            <p className="mt-2 text-slate-950">{step.label}</p>
                            <p className="mt-1 text-sm text-slate-500">{step.ownerRole}</p>
                            <p className="mt-2 text-sm text-slate-600">Límite: {formatDateLabel(step.dueDate)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handlePreviousStep} disabled={wizardStep === 1}>
                      Anterior
                    </Button>
                    <Button type="button" variant="outline" onClick={handleNextStep} disabled={wizardStep === 5}>
                      Siguiente
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canSaveDraft ? (
                      <Button type="button" variant="outline" onClick={handleSaveDraft}>
                        Guardar borrador
                      </Button>
                    ) : null}
                    <Button type="button" onClick={handleSendToReview}>
                      Enviar a workflow
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl text-slate-950">Resumen del borrador</CardTitle>
                <CardDescription>Semáforo de cobertura y relación directa con ARCO, SGDP y expediente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estado del borrador</p>
                    <p className="mt-2 text-3xl text-slate-950">{getPolicyStatusLabel(previewDraft.status)}</p>
                    <p className="mt-1 text-sm text-slate-500">{previewDraft.referenceCode || "Sin referencia definida"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cobertura ARCO</p>
                    <p className="mt-2 text-3xl text-slate-950">{previewDraft.coverage.arco * 100}%</p>
                    <p className="mt-1 text-sm text-slate-500">La PGDP alimentará el módulo de ARCO por referencia.</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Dimensiones clave</p>
                  <div className="mt-4 space-y-3">
                    {previewRows.map((row) => (
                      <div key={row.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>{row.label}</span>
                          <span>{row.value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full" style={{ width: `${row.value}%`, backgroundColor: chartColor(row.value) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Consumidores del documento</p>
                  <div className="mt-4 space-y-3">
                    {previewDraft.linkedModules.map((module) => (
                      <div key={module.moduleId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-950">{module.moduleId}</p>
                          <Badge variant="outline" className={module.active ? "text-emerald-700" : "text-slate-500"}>
                            {module.active ? "Cubierto" : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{module.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeSection === "repositorio" ? (
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 border-slate-200 shadow-sm">
            <CardContent className="flex min-w-0 flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Repositorio curado</p>
                <p className="mt-1 break-words text-sm text-slate-600">
                  {repositoryDocuments.length} documentos visibles de {GRUNENTHAL_CURATED_POLICY_DOCUMENTS.length} definidos y {allRepositoryDocuments.length} recursos fuente.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-3 gap-2 lg:min-w-[460px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
                  <p className="break-words text-[10px] uppercase leading-4 tracking-[0.12em] text-slate-500 sm:text-xs">México</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">{policyScopeStats.mexico}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
                  <p className="break-words text-[10px] uppercase leading-4 tracking-[0.12em] text-slate-500 sm:text-xs">Globales</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">{policyScopeStats.global}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
                  <p className="break-words text-[10px] uppercase leading-4 tracking-[0.12em] text-slate-500 sm:text-xs">Filtrados</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">{filteredRepositoryDocuments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="min-w-0 border-b border-slate-100">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-2xl text-slate-950">Documentos disponibles</CardTitle>
                  <CardDescription>
                    {filteredRepositoryDocuments.length} de {repositoryDocuments.length} políticas curadas listas para consulta.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  {activeRepositoryFilterCount} filtro(s) activo(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4 p-4 sm:p-5">
              <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(300px,auto)_auto_auto] xl:items-end">
                <div className="min-w-0">
                  <Label>Búsqueda</Label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={repositorySearch}
                      onChange={(event) => setRepositorySearch(event.target.value)}
                      placeholder="Título, área, tercero, aviso o fuente"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <Label>Alcance</Label>
                  <div className="mt-1 grid min-w-0 grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    {repositoryScopeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-xl px-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4abf] focus-visible:ring-offset-2 sm:px-2 sm:text-sm",
                          repositoryPolicyScopeFilter === option.value
                            ? "bg-[#0a4abf] text-white shadow-sm"
                            : "text-slate-600 hover:bg-white hover:text-slate-950",
                        )}
                        onClick={() => setRepositoryPolicyScopeFilter(option.value)}
                      >
                        <span className="min-w-0 leading-4">{option.label}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[11px]",
                            repositoryPolicyScopeFilter === option.value
                              ? "bg-white/20 text-white"
                              : "bg-white text-slate-500",
                          )}
                        >
                          {option.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant={showRepositoryAdvancedFilters ? "default" : "outline"}
                  className="!mx-0 !max-w-none gap-2"
                  aria-expanded={showRepositoryAdvancedFilters}
                  aria-controls="repository-advanced-filters"
                  onClick={() => setRepositoryAdvancedFiltersOpen((current) => !current)}
                >
                  <ListFilter className="h-4 w-4" />
                  Filtros
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      showRepositoryAdvancedFilters ? "rotate-180" : "",
                    )}
                  />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={activeRepositoryFilterCount === 0}
                  className="!mx-0 !max-w-none"
                  onClick={resetRepositoryFilters}
                >
                  Limpiar
                </Button>
              </div>

              {showRepositoryAdvancedFilters ? (
                <div
                  id="repository-advanced-filters"
                  className="grid min-w-0 gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
                >
                  <div className="min-w-0">
                    <Label>Origen documental</Label>
                    <Select
                      value={repositoryModuleFilter}
                      onValueChange={setRepositoryModuleFilter}
                    >
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {repositoryModuleOptions.map((module) => (
                          <SelectItem key={module} value={module}>
                            {repositoryModuleLabel(module)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <Label>Tipo</Label>
                    <Select value={repositoryTypeFilter} onValueChange={setRepositoryTypeFilter}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {repositoryTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-0">
                    <Label>Área</Label>
                    <Select value={repositoryAreaFilter} onValueChange={setRepositoryAreaFilter}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {repositoryAreas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {activeRepositoryFilterCount > 0 ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Filtros activos:</span>
                  {repositorySearch.trim() ? (
                    <Badge variant="outline" className="max-w-full truncate border-slate-200 bg-white text-slate-600">
                      Búsqueda: {repositorySearch.trim()}
                    </Badge>
                  ) : null}
                  {repositoryPolicyScopeFilter !== "all" ? (
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {repositoryPolicyScopeFilter === "mexico" ? "Políticas México" : "Políticas Globales"}
                    </Badge>
                  ) : null}
                  {repositoryModuleFilter !== "all" ? (
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {repositoryModuleLabel(repositoryModuleFilter)}
                    </Badge>
                  ) : null}
                  {repositoryTypeFilter !== "all" ? (
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {repositoryTypeFilter}
                    </Badge>
                  ) : null}
                  {repositoryAreaFilter !== "all" ? (
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {repositoryAreaFilter}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              {filteredRepositoryDocuments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                    No hay documentos que coincidan con los filtros actuales.
                  </div>
                ) : (
                  <div className="min-w-0 space-y-3">
                    {filteredRepositoryDocuments.map((document) => {
                      const canPreview = canOfferFilePreview(document.storedFile)
                      return (
                        <div
                          key={document.id}
                          className="grid min-w-0 gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0 space-y-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-slate-200 text-slate-600">
                                {document.policyScopeLabel}
                              </Badge>
                              <Badge variant="outline" className="border-slate-200 text-slate-600">
                                {repositoryModuleLabel(document.originModule || document.module)}
                              </Badge>
                              <Badge variant="secondary">{document.type}</Badge>
                              <Badge variant="outline" className="border-slate-200 text-slate-600">
                                {document.area}
                              </Badge>
                            </div>
                            <div className="min-w-0">
                              <h3 className="break-words text-lg font-medium text-slate-950">{document.title}</h3>
                              <p className="mt-1 break-words text-sm text-slate-500">
                                {document.sourceLabel}
                                {document.sourceLineRange ? ` · líneas ${document.sourceLineRange}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:flex xl:items-center xl:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="!mx-0 !max-w-none gap-2"
                              onClick={() => openRepositoryDocument(document)}
                              disabled={!canPreview}
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="!mx-0 !max-w-none gap-2"
                              onClick={() => downloadRepositoryDocument(document)}
                            >
                              <Download className="h-4 w-4" />
                              Descargar
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl text-slate-950">Cobertura del programa</CardTitle>
                <CardDescription>Donut de cumplimiento y barras por dimensión, con lógica real de expediente.</CardDescription>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-6 p-6 2xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>
                          {donutData.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} dimensión(es)`, "Estado"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {donutData.map((slice) => (
                      <div key={slice.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                          {slice.name}
                        </div>
                        <span className="text-sm text-slate-950">{slice.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Programa principal</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl text-slate-950">{primaryPolicy ? primaryPolicy.referenceCode : "Sin PGDP"}</span>
                      {primaryPolicy ? (
                        <Badge variant="outline" className={cn("mb-1", statusClasses(primaryPolicy.status))}>
                          {getPolicyStatusLabel(primaryPolicy.status)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {primaryPolicy
                        ? `${primaryPolicy.versionLabel} · próxima revisión ${formatDateLabel(primaryPolicy.nextReviewDate)}`
                        : "Aún no hay una PGDP registrada en el módulo."}
                    </p>
                  </div>

                  <div className="h-[280px] rounded-[28px] border border-slate-200 bg-white p-4">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                      <BarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
                        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="label" width={108} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#475569" }} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                          {chartRows.map((row) => (
                            <Cell key={row.id} fill={chartColor(row.value)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-1">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vigentes</p>
                  <p className="mt-3 text-4xl text-slate-950">{snapshot.published}</p>
                  <p className="mt-2 text-sm text-slate-500">Políticas actualmente publicadas en la plataforma.</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Expediente mínimo</p>
                  <p className="mt-3 text-4xl text-slate-950">{snapshot.withEvidence}</p>
                  <p className="mt-2 text-sm text-slate-500">Políticas con publicación y evidencia operativa mínima.</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Bloqueos workflow</p>
                  <p className="mt-3 text-4xl text-slate-950">{snapshot.blockedWorkflow}</p>
                  <p className="mt-2 text-sm text-slate-500">Flujos vencidos que ya se reflejan en Recordatorios.</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vence pronto</p>
                  <p className="mt-3 text-4xl text-slate-950">{snapshot.expiringSoon}</p>
                  <p className="mt-2 text-sm text-slate-500">Políticas que requieren atención en los próximos 90 días.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl text-slate-950">Inventario de políticas</CardTitle>
                <CardDescription>Cards operativas con estado, siguiente acción y reutilización en ARCO.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {sortedPolicies.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                    Aún no hay políticas registradas. Inicia la PGDP desde el builder.
                  </div>
                ) : (
                  sortedPolicies.map((policy) => {
                    const currentStep = getCurrentWorkflowStep(policy)
                    return (
                      <button
                        key={policy.id}
                        type="button"
                        onClick={() => setSelectedPolicyId(policy.id)}
                        className={cn(
                          "w-full rounded-[24px] border p-5 text-left transition-colors",
                          selectedPolicy?.id === policy.id
                            ? "border-primary/30 bg-primary/5"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{policy.referenceCode}</p>
                            <h3 className="mt-1 text-xl text-slate-950">{policy.title}</h3>
                          </div>
                          <Badge variant="outline" className={statusClasses(policy.status)}>
                            {getPolicyStatusLabel(policy.status)}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className="font-medium text-slate-950">Versión:</span> {policy.versionLabel}
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className="font-medium text-slate-950">Propietario:</span> {policy.ownerArea}
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className="font-medium text-slate-950">Vigencia:</span> {formatDateLabel(policy.expiryDate)}
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span className="font-medium text-slate-950">Evidencia mínima:</span>{" "}
                            {policyHasMinimumEvidence(policy) ? "Completa" : "Pendiente"}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          {currentStep ? <span>Siguiente acción: {currentStep.label}</span> : <span>Workflow concluido</span>}
                          <span>·</span>
                          <span>ARCO: {policy.linkedModules.some((item) => item.moduleId === "arco-rights" && item.active) ? "vinculable" : "incompleto"}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {selectedPolicy ? (
              <div className="space-y-6">
                <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="text-xl text-slate-950">Metadatos y acciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Estado</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline" className={statusClasses(selectedPolicy.status)}>
                            {getPolicyStatusLabel(selectedPolicy.status)}
                          </Badge>
                          {isPolicyWorkflowBlocked(selectedPolicy) ? (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              Flujo bloqueado
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600">
                        <p><span className="font-medium text-slate-950">Versión:</span> {selectedPolicy.versionLabel}</p>
                        <p><span className="font-medium text-slate-950">Propietario:</span> {selectedPolicy.ownerArea}</p>
                        <p><span className="font-medium text-slate-950">Contacto:</span> {selectedPolicy.ownerContact}</p>
                        <p><span className="font-medium text-slate-950">Vigencia:</span> {formatDateLabel(selectedPolicy.effectiveDate)} a {formatDateLabel(selectedPolicy.expiryDate)}</p>
                        <p><span className="font-medium text-slate-950">Próxima revisión:</span> {formatDateLabel(selectedPolicy.nextReviewDate)}</p>
                        <p><span className="font-medium text-slate-950">Score de expediente:</span> {selectedPolicy.coverage.expediente * 100}%</p>
                      </div>

                      {expiringDays !== null ? (
                        <div className={cn("rounded-2xl border p-4 text-sm", expiringDays < 0 ? "border-red-200 bg-red-50 text-red-700" : expiringDays <= 30 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                          {expiringDays < 0
                            ? "La política ya superó su fecha de vencimiento."
                            : `La política vence en ${expiringDays} día(s).`}
                        </div>
                      ) : null}

                      <div className="grid gap-2">
                        <Button variant="outline" onClick={() => editPolicyInBuilder(selectedPolicy)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Editar en builder
                        </Button>
                        {selectedPolicy.status === "APPROVED" ? (
                          <Button onClick={() => handlePublish(selectedPolicy)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Publicar
                          </Button>
                        ) : null}
                        {(selectedPolicy.status === "PUBLISHED" || selectedPolicy.status === "UNDER_REVIEW") ? (
                          <Button variant="outline" onClick={() => handleConfirmReviewWithoutChanges(selectedPolicy)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirmar revisión sin cambios
                          </Button>
                        ) : null}
                        <Button variant="outline" onClick={() => exportPolicyToWord(selectedPolicy)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Exportar Word
                        </Button>
                        <Button variant="outline" onClick={exportPolicyToPdf}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Exportar PDF
                        </Button>
                      </div>

                      {selectedPolicy.status === "APPROVED" || selectedPolicy.status === "PUBLISHED" || selectedPolicy.status === "UNDER_REVIEW" ? (
                        <div>
                          <Label>Comentario de publicación / revisión</Label>
                          <Textarea value={publishComment} onChange={(event) => setPublishComment(event.target.value)} />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="text-xl text-slate-950">Contenido y versiones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <Tabs defaultValue="preview" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl bg-[#edf4ff] p-1 sm:grid-cols-2">
                          <TabsTrigger value="preview">Expediente</TabsTrigger>
                          <TabsTrigger value="versions">Versiones</TabsTrigger>
                        </TabsList>

                        <TabsContent value="preview">
                          <div ref={previewRef} className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5">
                            <div>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{selectedPolicy.referenceCode}</p>
                              <h2 className="mt-2 text-3xl text-slate-950">{selectedPolicy.title}</h2>
                              <p className="mt-2 text-sm text-slate-500">{selectedPolicy.orgName} · {selectedPolicy.orgSector}</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm text-slate-600">
                                {selectedPolicy.generalObjective}
                              </p>
                            </div>

                            <div className="space-y-4">
                              {normalizePolicyRecord(selectedPolicy).content.objectives.length > 0 ? (
                                <>
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Definiciones de utilidad</p>
                                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                                      {POLICY_DEFINITIONS.map(([term, definition]) => (
                                        <p key={term}><span className="text-slate-950">{term}:</span> {definition}</p>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ARCO reutilizable</p>
                                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                                      <p><span className="text-slate-950">Medio:</span> {selectedPolicy.content.arco.medium}</p>
                                      <p><span className="text-slate-950">Identidad:</span> {selectedPolicy.content.arco.identityVerification}</p>
                                      <p><span className="text-slate-950">Seguimiento:</span> {selectedPolicy.content.arco.trackingProcedure}</p>
                                      <p><span className="text-slate-950">Revocación:</span> {selectedPolicy.content.arco.revocationProcedure}</p>
                                      <p><span className="text-slate-950">Limitación:</span> {selectedPolicy.content.arco.limitationProcedure}</p>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">SGDP</p>
                                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                                      <p>{selectedPolicy.content.sgdp.monitoringSummary}</p>
                                      <p>{selectedPolicy.content.sgdp.auditsSummary}</p>
                                      <p>{selectedPolicy.content.sgdp.improvementSummary}</p>
                                    </div>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="versions">
                          <div className="space-y-3">
                            {selectedPolicy.versions.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                Aún no hay publicaciones versionadas registradas.
                              </div>
                            ) : (
                              selectedPolicy.versions
                                .slice()
                                .reverse()
                                .map((version) => (
                                  <div key={version.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm text-slate-500">{formatDateLabel(version.createdAt)}</p>
                                        <p className="text-lg text-slate-950">Versión {version.versionLabel}</p>
                                      </div>
                                      <Badge variant="outline" className="text-slate-600">
                                        {version.statusAtPublication}
                                      </Badge>
                                    </div>
                                    <p className="mt-3 text-sm text-slate-600">{version.changeLog}</p>
                                    <p className="mt-2 text-xs text-slate-500">Publicado por {version.createdBy}</p>
                                  </div>
                                ))
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="text-xl text-slate-950">Evidencias, ARCO y workflow</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 p-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-950">Expediente mínimo</p>
                          <Badge variant="outline" className={policyHasMinimumEvidence(selectedPolicy) ? "text-emerald-700" : "text-amber-700"}>
                            {policyHasMinimumEvidence(selectedPolicy) ? "Completo" : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          Publicación, confirmaciones internas y evidencias operativas se califican con lógica real.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-950">Evidencias</p>
                          <Button size="sm" variant="outline" onClick={() => setEvidenceDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Agregar
                          </Button>
                        </div>
                        {selectedEvidenceFiles.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            Todavía no hay archivos o evidencias suplementarias registradas.
                          </div>
                        ) : (
                          selectedEvidenceFiles.map(({ evidence, file }) => (
                            <button
                              key={`${evidence.id}:${file.id}`}
                              type="button"
                              onClick={() => openStoredFile(file.id)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-950">{evidence.title}</p>
                                  <p className="text-xs text-slate-500">{file.name} · {formatDateLabel(evidence.createdAt)}</p>
                                </div>
                                <Download className="h-4 w-4 text-slate-400" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-slate-950">Confirmaciones de lectura</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input value={readingPerson} onChange={(event) => setReadingPerson(event.target.value)} placeholder="Nombre de la persona" />
                          <Input value={readingArea} onChange={(event) => setReadingArea(event.target.value)} placeholder="Área" />
                        </div>
                        <Button size="sm" onClick={handleRegisterReading}>
                          Registrar lectura
                        </Button>
                        <div className="space-y-2">
                          {selectedPolicy.readingAcknowledgements.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                              Aún no hay confirmaciones internas de lectura.
                            </div>
                          ) : (
                            selectedPolicy.readingAcknowledgements.map((item) => (
                              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                <span className="text-slate-950">{item.person}</span> · {item.area} · {formatDateLabel(item.acknowledgedAt)}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-slate-950">Integración con ARCO</p>
                        {selectedPolicy.linkedModules
                          .filter((item) => item.moduleId === "arco-rights")
                          .map((item) => (
                            <div key={item.moduleId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-950">Consumo desde ARCO</p>
                                  <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                                </div>
                                <Badge variant="outline" className={item.active ? "text-emerald-700" : "text-amber-700"}>
                                  {item.active ? "Disponible" : "Pendiente"}
                                </Badge>
                              </div>
                              <Button asChild size="sm" variant="outline" className="mt-3">
                                <Link href="/arco-rights">Abrir módulo ARCO</Link>
                              </Button>
                            </div>
                          ))}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-slate-950">Workflow</p>
                        {selectedPolicy.workflow.map((step) => {
                          const commentKey = `${selectedPolicy.id}:${step.id}`
                          const isPending = step.outcome === "pending"
                          return (
                            <div key={step.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm text-slate-950">{step.label}</p>
                                  <p className="text-xs text-slate-500">{step.ownerRole} · límite {formatDateLabel(step.dueDate)}</p>
                                </div>
                                <Badge variant="outline" className={statusClasses(isPending ? selectedPolicy.status : step.outcome === "approved" ? "APPROVED" : "DRAFT")}>
                                  {isPending ? "Pendiente" : step.outcome === "approved" ? "Aprobado" : step.outcome === "changes-requested" ? "Cambios" : "Rechazado"}
                                </Badge>
                              </div>

                              {isPending ? (
                                <div className="mt-3 space-y-3">
                                  <Textarea
                                    value={workflowComments[commentKey] || ""}
                                    onChange={(event) =>
                                      setWorkflowComments((current) => ({
                                        ...current,
                                        [commentKey]: event.target.value,
                                      }))
                                    }
                                    placeholder="Comentario del paso"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => handleResolveWorkflow(selectedPolicy, step.id, "approved")}>
                                      Aprobar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleResolveWorkflow(selectedPolicy, step.id, "changes-requested")}>
                                      Solicitar cambios
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleResolveWorkflow(selectedPolicy, step.id, "rejected")}>
                                      Rechazar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-slate-600">
                                  {step.comment || "Sin comentario"} · {step.actor || step.ownerRole} · {formatDateLabel(step.completedAt)}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="py-16 text-center text-sm text-slate-500">
                  Selecciona una política del inventario para abrir su expediente.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
        </div>

      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar evidencia al expediente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={evidenceType} onValueChange={(value) => setEvidenceType(value as PolicyEvidenceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={evidenceDescription} onChange={(event) => setEvidenceDescription(event.target.value)} />
            </div>
            <div>
              <Label>Archivo</Label>
              <Input type="file" onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddEvidence}>
                Guardar evidencia
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FilePreviewDialog
        file={repositoryPreviewFile}
        open={Boolean(repositoryPreviewFile)}
        onOpenChange={(open) => {
          if (!open) setRepositoryPreviewFile(null)
        }}
      />
      </div>
    </ArcoModuleShell>
  )
}
