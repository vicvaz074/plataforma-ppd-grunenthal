"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Download,
  FilePlus2,
  FolderOpen,
  History,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Upload,
  type LucideIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ModuleWorkspaceShell } from "@/components/arco-module-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  ACTUATION_TYPE_OPTIONS,
  AREA_OPTIONS,
  AUTHORITY_OPTIONS,
  buildProcedureDashboardSnapshot,
  buildProcedureReportDataset,
  createProcedureWizardDraft,
  DATA_CATEGORY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  flattenProcedureAlerts,
  formatDateLabel,
  formatDateTimeLabel,
  GENERAL_STATUS_OPTIONS,
  getDefaultRoleForUser,
  getFirstActiveAlert,
  getProcedureAlertRowsByGroup,
  getProcedureAuthorityLabel,
  getProcedureStageOptions,
  ORIGIN_OPTIONS,
  OUTCOME_OPTIONS,
  PROCEDURE_TYPE_OPTIONS,
  RISK_LEVEL_OPTIONS,
  shouldExposeSensitiveFields,
  sortAuditEntries,
  sortProcedureDocuments,
  syncDraftStageWithType,
  validateProcedureWizardStep,
  type ProcedureDocumentType,
  type ProcedureGeneralStatus,
  type ProcedurePdpRecord,
  type ProcedureRiskLevel,
  type ProcedureWizardDraft,
  type ProceduresPdpRoot,
} from "./procedures-pdp-core"
import {
  addProcedureActuation,
  addProcedureComment,
  addProcedureDocument,
  addProcedureTask,
  collectGlobalAuditLog,
  getActiveProcedureCount,
  getCurrentProcedureUser,
  getKnownProcedureUsers,
  getProcedureDocumentFile,
  getProcedureHeaderNotificationSummary,
  getProcedureHighRiskCount,
  initializeProceduresRoot,
  loadProceduresRoot,
  registerProcedureAccess,
  saveProcedureDraft,
  updateProcedureTaskStatus,
} from "./procedures-pdp-store"
import { ProceduresPdpImportDialog } from "./procedures-pdp-import-dialog"
import { createFileURL } from "@/lib/fileStorage"

type ProceduresPdpWorkspaceProps = {
  initialSection: "dashboard" | "register"
}

type WorkspaceSection =
  | "dashboard"
  | "expedientes"
  | "register"
  | "alertas"
  | "reportes"
  | "bitacora"
  | "expediente"

type DetailTab =
  | "resumen"
  | "datos"
  | "cronologia"
  | "documentos"
  | "tareas"
  | "comentarios"
  | "alertas"
  | "historial"

type ProcedureFilters = {
  search: string
  type: "Todas" | (typeof PROCEDURE_TYPE_OPTIONS)[number]
  status: "Todos" | ProcedureGeneralStatus
  risk: "Todos" | ProcedureRiskLevel
  area: "Todas" | (typeof AREA_OPTIONS)[number]
}

type PendingDocument = {
  id: string
  title: string
  documentType: ProcedureDocumentType
  description: string
  file: File
}

type ActuationDraft = {
  type: (typeof ACTUATION_TYPE_OPTIONS)[number]
  date: string
  title: string
  description: string
  nextDueDate: string
  nextDueLabel: string
  suggestedStatus: "" | ProcedureGeneralStatus
}

type TaskDraft = {
  title: string
  description: string
  dueDate: string
  responsibleIds: string[]
}

type ReportFilters = {
  period: "ultimo_mes" | "ultimos_3_meses" | "anio_en_curso" | "historico"
  procedureTypes: (typeof PROCEDURE_TYPE_OPTIONS)[number][]
  riskLevels: ProcedureRiskLevel[]
  areaLead: "Todas" | (typeof AREA_OPTIONS)[number]
  responsibleEmail: string
}

const WORKSPACE_SECTIONS: Array<{
  id: WorkspaceSection
  label: string
  shortLabel?: string
  mobileLabel?: string
  icon: LucideIcon
}> = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Inicio", mobileLabel: "Dashboard del portafolio", icon: LayoutDashboard },
  { id: "expedientes", label: "Expedientes", shortLabel: "Expedientes", mobileLabel: "Consulta de expedientes", icon: FolderOpen },
  { id: "register", label: "Registrar nuevo", shortLabel: "Registrar", mobileLabel: "Registrar expediente", icon: PlusCircle },
  { id: "alertas", label: "Alertas", shortLabel: "Alertas", mobileLabel: "Alertas y vencimientos", icon: Bell },
  { id: "reportes", label: "Reportes", shortLabel: "Reportes", mobileLabel: "Reportes y exportables", icon: BarChart3 },
  { id: "bitacora", label: "Bitácora", shortLabel: "Bitácora", mobileLabel: "Bitácora de acciones", icon: History },
]

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "datos", label: "Datos" },
  { id: "cronologia", label: "Fechas" },
  { id: "documentos", label: "Docs" },
  { id: "tareas", label: "Tareas" },
  { id: "comentarios", label: "Notas" },
  { id: "alertas", label: "Alertas" },
  { id: "historial", label: "Hist." },
]

function secureId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : ""
}

function parseWorkspaceSection(value: string | null, fallback: WorkspaceSection): WorkspaceSection {
  if (
    value === "dashboard" ||
    value === "expedientes" ||
    value === "register" ||
    value === "alertas" ||
    value === "reportes" ||
    value === "bitacora" ||
    value === "expediente"
  ) {
    return value
  }
  return fallback
}

function parseDetailTab(value: string | null): DetailTab {
  if (
    value === "resumen" ||
    value === "datos" ||
    value === "cronologia" ||
    value === "documentos" ||
    value === "tareas" ||
    value === "comentarios" ||
    value === "alertas" ||
    value === "historial"
  ) {
    return value
  }
  return "resumen"
}

function statusBadgeClass(status: ProcedureGeneralStatus) {
  if (status === "Concluido") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "Pendiente de requerimiento") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "En trámite") return "border-blue-200 bg-blue-50 text-blue-700"
  if (status === "En contestación") return "border-blue-200 bg-blue-50 text-blue-700"
  if (status === "En resolución") return "border-slate-200 bg-slate-100 text-slate-700"
  if (status === "Suspendido") return "border-red-200 bg-red-50 text-red-700"
  if (status === "Archivado") return "border-slate-200 bg-slate-50 text-slate-500"
  return "border-blue-200 bg-blue-50 text-blue-700"
}

function riskBadgeClass(risk: ProcedureRiskLevel) {
  if (risk === "Alto") return "border-red-200 bg-red-50 text-red-700"
  if (risk === "Medio") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-emerald-200 bg-emerald-50 text-emerald-700"
}

function toneClasses(tone: "critical" | "warning" | "positive" | "neutral") {
  if (tone === "critical") return "text-red-700"
  if (tone === "warning") return "text-amber-700"
  if (tone === "positive") return "text-emerald-700"
  return "text-slate-700"
}

function buildDraftFromProcedure(procedure: ProcedurePdpRecord): ProcedureWizardDraft {
  return {
    id: procedure.id,
    internalId: procedure.internalId,
    expedienteNumber: procedure.expedienteNumber,
    procedureType: procedure.procedureType,
    authority: procedure.authority,
    customAuthority: procedure.customAuthority || "",
    origin: procedure.origin,
    generalStatus: procedure.generalStatus,
    proceduralStage: procedure.proceduralStage,
    riskLevel: procedure.riskLevel,
    areaLead: procedure.areaLead,
    relatedAreas: procedure.relatedAreas,
    summary: procedure.summary,
    dataCategories: procedure.dataCategories,
    holders: procedure.holders || "",
    promoter: procedure.promoter || "",
    involvedAreasNotes: procedure.involvedAreasNotes || "",
    strategyNotes: procedure.strategyNotes || "",
    externalFirm: procedure.externalFirm || "",
    externalContact: procedure.externalContact || "",
    tags: procedure.tags,
    startedAt: procedure.dates.startedAt.slice(0, 10),
    organizationNotifiedAt: procedure.dates.organizationNotifiedAt?.slice(0, 10) || "",
    nextDueDate: procedure.dates.nextDueDate?.slice(0, 10) || "",
    nextDueLabel: procedure.dates.nextDueLabel || "",
    estimatedResolutionAt: procedure.dates.estimatedResolutionAt?.slice(0, 10) || "",
    hearingDates: procedure.dates.hearings.map((entry) => ({
      id: entry.id,
      label: entry.label,
      date: entry.date.slice(0, 16),
    })),
    result: procedure.outcome.result,
    lessonsLearned: procedure.outcome.lessonsLearned || "",
    followUpActions: procedure.outcome.followUpActions || "",
    sanctionType: procedure.outcome.sanctionType || "",
    sanctionAmount: procedure.outcome.sanctionAmount || "",
    suspensionReason: procedure.outcome.suspensionReason || "",
    internalResponsibleEmails: procedure.responsibles
      .filter((responsible) => responsible.kind === "interno" && responsible.email)
      .map((responsible) => responsible.email as string),
    internalResponsibleNames: procedure.responsibles
      .filter((responsible) => responsible.kind === "interno" && !responsible.email)
      .map((responsible) => responsible.name),
    registerAsDraft: procedure.generalStatus === "Borrador",
    initialDocuments: [],
  }
}

function ProcedureMetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: number
  helper: string
  tone: "critical" | "warning" | "positive" | "neutral"
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn("mt-2 text-4xl font-semibold", toneClasses(tone))}>{value}</p>
      <p className="mt-1 text-sm text-slate-600">{helper}</p>
    </div>
  )
}

function ProcedureChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: { label?: string } }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{row.payload?.label}</p>
      <p className="text-slate-600">{row.value} registros</p>
    </div>
  )
}

export function ProceduresPdpWorkspace({ initialSection }: ProceduresPdpWorkspaceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [root, setRoot] = useState<ProceduresPdpRoot>(() => loadProceduresRoot())
  const [wizardDraft, setWizardDraft] = useState<ProcedureWizardDraft>(() => createProcedureWizardDraft())
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({})
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([])
  const [pendingDocumentTitle, setPendingDocumentTitle] = useState("")
  const [pendingDocumentType, setPendingDocumentType] = useState<ProcedureDocumentType>("Oficio de inicio")
  const [pendingDocumentDescription, setPendingDocumentDescription] = useState("")
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null)
  const [filters, setFilters] = useState<ProcedureFilters>({
    search: "",
    type: "Todas",
    status: "Todos",
    risk: "Todos",
    area: "Todas",
  })
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    period: "anio_en_curso",
    procedureTypes: [],
    riskLevels: [],
    areaLead: "Todas",
    responsibleEmail: "",
  })
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("resumen")
  const [actuationDraft, setActuationDraft] = useState<ActuationDraft>({
    type: "Notificación recibida",
    date: "",
    title: "",
    description: "",
    nextDueDate: "",
    nextDueLabel: "",
    suggestedStatus: "",
  })
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: "",
    description: "",
    dueDate: "",
    responsibleIds: [],
  })
  const [commentDraft, setCommentDraft] = useState("")
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [documentTargetGroupId, setDocumentTargetGroupId] = useState<string | undefined>(undefined)
  const accessLoggedRef = useRef<Set<string>>(new Set())

  const currentUser = useMemo(() => getCurrentProcedureUser(), [])
  const knownUsers = useMemo(() => getKnownProcedureUsers(), [root.generatedAt])
  const currentRole = useMemo(() => getDefaultRoleForUser(currentUser), [currentUser])
  const canViewSensitive = shouldExposeSensitiveFields(currentRole)

  const viewSection = parseWorkspaceSection(searchParams.get("section"), initialSection)
  const selectedProcedureId = searchParams.get("id")
  const selectedProcedure = useMemo(
    () => root.procedures.find((procedure) => procedure.id === selectedProcedureId) || null,
    [root.procedures, selectedProcedureId],
  )

  const detailTab = parseDetailTab(searchParams.get("tab"))
  const deferredSearch = useDeferredValue(filters.search)
  const dashboard = useMemo(() => buildProcedureDashboardSnapshot(root), [root])
  const riskChartData = useMemo<Array<Record<string, string | number>>>(
    () =>
      dashboard.byRisk.map((row) => ({
        label: row.label,
        value: row.value,
        color: row.color,
      })),
    [dashboard.byRisk],
  )
  const alertGroups = useMemo(() => getProcedureAlertRowsByGroup(root), [root])
  const globalAuditLog = useMemo(() => collectGlobalAuditLog(root), [root])
  const notificationSummary = useMemo(() => getProcedureHeaderNotificationSummary(root), [root])
  const pageMeta = useMemo(() => {
    if (viewSection === "dashboard") {
      return {
        label: "Dashboard",
        title: "Estado del portafolio",
        description: "Prioriza expedientes, riesgos, vencimientos y actividad reciente dentro del portafolio de procedimientos PDP.",
      }
    }
    if (viewSection === "expedientes") {
      return {
        label: "Expedientes",
        title: "Consulta y seguimiento",
        description: "Filtra el portafolio por tipo, riesgo, estatus y responsables con foco en operación diaria.",
      }
    }
    if (viewSection === "register") {
      return {
        label: wizardDraft.id ? "Editar expediente" : "Registrar nuevo",
        title: "Wizard del expediente",
        description: "Registra o ajusta un expediente con datos base, fechas críticas y soporte documental sin ensanchar el flujo.",
      }
    }
    if (viewSection === "alertas") {
      return {
        label: "Alertas",
        title: "Centro de alertas del módulo",
        description: "Concentra vencimientos, expedientes críticos y recordatorios accionables del portafolio.",
      }
    }
    if (viewSection === "reportes") {
      return {
        label: "Reportes",
        title: "Exportables y análisis",
        description: "Genera vistas de gestión, exportables y cortes analíticos sin salir del módulo.",
      }
    }
    if (viewSection === "bitacora") {
      return {
        label: "Bitácora",
        title: "Registro inmutable del portafolio",
        description: "Consulta accesos, actuaciones y cambios relevantes con trazabilidad operativa consolidada.",
      }
    }
    return {
      label: "Expediente",
      title: selectedProcedure?.expedienteNumber || "Expediente",
      description: "Ficha operativa del expediente con resumen, datos, alertas, documentos y bitácora procesal.",
    }
  }, [selectedProcedure?.expedienteNumber, viewSection, wizardDraft.id])

  const workspaceNavItems = useMemo(
    () =>
      WORKSPACE_SECTIONS.map((item) => ({
        id: item.id,
        label: item.label,
        shortLabel: item.shortLabel || item.label,
        mobileLabel: item.mobileLabel || item.label,
        icon: item.icon,
        badge:
          item.id === "alertas"
            ? notificationSummary.critical + notificationSummary.medium || undefined
            : item.id === "expedientes"
              ? root.procedures.length || undefined
              : undefined,
      })),
    [notificationSummary.critical, notificationSummary.medium, root.procedures.length],
  )

  const filteredProcedures = useMemo(() => {
    const search = deferredSearch.trim().toLowerCase()
    return root.procedures.filter((procedure) => {
      if (search) {
        const haystack = [
          procedure.expedienteNumber,
          procedure.summary,
          procedure.procedureType,
          procedure.generalStatus,
          procedure.areaLead,
          ...procedure.responsibles.map((responsible) => responsible.name),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(search)) return false
      }
      if (filters.type !== "Todas" && procedure.procedureType !== filters.type) return false
      if (filters.status !== "Todos" && procedure.generalStatus !== filters.status) return false
      if (filters.risk !== "Todos" && procedure.riskLevel !== filters.risk) return false
      if (filters.area !== "Todas" && procedure.areaLead !== filters.area) return false
      return true
    })
  }, [deferredSearch, filters.area, filters.risk, filters.status, filters.type, root.procedures])

  const reportRows = useMemo(
    () =>
      buildProcedureReportDataset(root, {
        period: reportFilters.period,
        procedureTypes: reportFilters.procedureTypes,
        riskLevels: reportFilters.riskLevels,
        areaLead: reportFilters.areaLead,
        responsibleEmail: reportFilters.responsibleEmail || undefined,
      }),
    [reportFilters, root],
  )

  useEffect(() => {
    setRoot(initializeProceduresRoot())
  }, [])

  useEffect(() => {
    const refresh = () => setRoot(loadProceduresRoot())
    window.addEventListener("storage", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  useEffect(() => {
    if (viewSection === "expediente" && selectedProcedure && !accessLoggedRef.current.has(selectedProcedure.id)) {
      accessLoggedRef.current.add(selectedProcedure.id)
      const next = registerProcedureAccess(root, selectedProcedure.id, "ficha del expediente")
      setRoot(next)
    }
  }, [root, selectedProcedure, viewSection])

  useEffect(() => {
    setActiveDetailTab(detailTab)
  }, [detailTab])

  useEffect(() => {
    if (viewSection === "register") {
      if (selectedProcedure) {
        setWizardDraft(buildDraftFromProcedure(selectedProcedure))
      } else {
        setWizardDraft(createProcedureWizardDraft())
      }
      setWizardStep(1)
      setWizardErrors({})
      setPendingDocuments([])
      setPendingDocumentTitle("")
      setPendingDocumentDescription("")
      setPendingDocumentType("Oficio de inicio")
      setPendingDocumentFile(null)
    }
  }, [selectedProcedure, viewSection])

  const navigate = (section: WorkspaceSection, options?: { id?: string; tab?: DetailTab }) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("section", section)
    if (options?.id) params.set("id", options.id)
    else params.delete("id")
    if (options?.tab) params.set("tab", options.tab)
    else params.delete("tab")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const refreshRoot = (nextRoot: ProceduresPdpRoot) => {
    setRoot(nextRoot)
  }

  const handleQueueDocument = () => {
    if (!pendingDocumentFile) {
      setWizardErrors((prev) => ({ ...prev, pendingDocumentFile: "Selecciona un archivo." }))
      return
    }
    setPendingDocuments((prev) => [
      ...prev,
      {
        id: secureId("pending-document"),
        title: normalizeText(pendingDocumentTitle) || pendingDocumentFile.name,
        documentType: pendingDocumentType,
        description: normalizeText(pendingDocumentDescription),
        file: pendingDocumentFile,
      },
    ])
    setPendingDocumentTitle("")
    setPendingDocumentDescription("")
    setPendingDocumentType("Oficio de inicio")
    setPendingDocumentFile(null)
    setWizardErrors((prev) => {
      const next = { ...prev }
      delete next.pendingDocumentFile
      return next
    })
  }

  const handlePersistProcedure = async (saveAsDraft: boolean) => {
    const preparedDraft = syncDraftStageWithType({
      ...wizardDraft,
      registerAsDraft: saveAsDraft,
    })

    const validation = validateProcedureWizardStep(preparedDraft, saveAsDraft ? 1 : 3)
    if (!saveAsDraft && !validation.isValid) {
      setWizardErrors(validation.errors)
      const orderedSteps: Array<1 | 2 | 3> = [1, 2, 3]
      const stepWithError =
        orderedSteps.find((step) => Object.keys(validateProcedureWizardStep(preparedDraft, step).errors).length > 0) || 1
      setWizardStep(stepWithError)
      return
    }

    let nextRoot = saveProcedureDraft(root, preparedDraft)
    let savedProcedure =
      nextRoot.procedures.find((procedure) => procedure.id === preparedDraft.id) ||
      nextRoot.procedures.find((procedure) => procedure.expedienteNumber === preparedDraft.expedienteNumber)

    if (savedProcedure && pendingDocuments.length > 0) {
      for (const document of pendingDocuments) {
        nextRoot = await addProcedureDocument(nextRoot, savedProcedure.id, {
          title: document.title,
          documentType: document.documentType,
          description: document.description,
          file: document.file,
        })
      }
      savedProcedure = nextRoot.procedures.find((procedure) => procedure.id === savedProcedure?.id) || savedProcedure
    }

    refreshRoot(nextRoot)
    setPendingDocuments([])
    setWizardErrors({})
    toast({
      title: saveAsDraft ? "Borrador guardado" : preparedDraft.id ? "Expediente actualizado" : "Expediente registrado",
      description: saveAsDraft
        ? "El expediente quedó disponible para continuar más tarde."
        : "La información del procedimiento se guardó correctamente.",
    })

    if (savedProcedure) {
      navigate("expediente", { id: savedProcedure.id, tab: "resumen" })
    } else {
      navigate("expedientes")
    }
  }

  const handleNextStep = () => {
    const validation = validateProcedureWizardStep(wizardDraft, wizardStep)
    if (!validation.isValid) {
      setWizardErrors(validation.errors)
      return
    }
    setWizardErrors({})
    setWizardStep((prev) => (prev === 3 ? prev : ((prev + 1) as 1 | 2 | 3)))
  }

  const handlePrevStep = () => setWizardStep((prev) => (prev === 1 ? prev : ((prev - 1) as 1 | 2 | 3)))

  const handleAddActuation = async () => {
    if (!selectedProcedure) return
    if (!normalizeText(actuationDraft.description) || !normalizeText(actuationDraft.date)) {
      toast({
        title: "Faltan datos de la actuación",
        description: "Captura la fecha y descripción de la actuación.",
        variant: "destructive",
      })
      return
    }

    const nextRoot = addProcedureActuation(root, selectedProcedure.id, {
      type: actuationDraft.type,
      date: actuationDraft.date,
      title: normalizeText(actuationDraft.title) || actuationDraft.type,
      description: actuationDraft.description,
      nextDueDate: actuationDraft.nextDueDate,
      nextDueLabel: actuationDraft.nextDueLabel,
      suggestedStatus: actuationDraft.suggestedStatus || undefined,
      documentGroupIds: [],
    })
    refreshRoot(nextRoot)
    setActuationDraft({
      type: "Notificación recibida",
      date: "",
      title: "",
      description: "",
      nextDueDate: "",
      nextDueLabel: "",
      suggestedStatus: "",
    })
    toast({
      title: "Actuación registrada",
      description: "La cronología y alertas del expediente se actualizaron.",
    })
  }

  const handleAddTask = () => {
    if (!selectedProcedure) return
    if (!normalizeText(taskDraft.title)) {
      toast({
        title: "Falta el título de la tarea",
        description: "Indica la actividad pendiente.",
        variant: "destructive",
      })
      return
    }
    const nextRoot = addProcedureTask(root, selectedProcedure.id, {
      title: taskDraft.title,
      description: taskDraft.description,
      dueDate: taskDraft.dueDate,
      responsibleIds: taskDraft.responsibleIds,
    })
    refreshRoot(nextRoot)
    setTaskDraft({ title: "", description: "", dueDate: "", responsibleIds: [] })
  }

  const handleAddComment = () => {
    if (!selectedProcedure) return
    const nextRoot = addProcedureComment(root, selectedProcedure.id, commentDraft)
    refreshRoot(nextRoot)
    setCommentDraft("")
  }

  const handleUploadDocument = async () => {
    if (!selectedProcedure || !pendingDocumentFile) return
    const nextRoot = await addProcedureDocument(root, selectedProcedure.id, {
      title: normalizeText(pendingDocumentTitle) || pendingDocumentFile.name,
      documentType: pendingDocumentType,
      description: pendingDocumentDescription,
      file: pendingDocumentFile,
    }, documentTargetGroupId)
    refreshRoot(nextRoot)
    setPendingDocumentTitle("")
    setPendingDocumentDescription("")
    setPendingDocumentType("Oficio de inicio")
    setPendingDocumentFile(null)
    setDocumentTargetGroupId(undefined)
    setDocumentDialogOpen(false)
  }

  const exportPortfolioPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(16)
    doc.text("Portafolio de expedientes PDP", 14, 16)
    autoTable(doc, {
      head: [["Expediente", "Tipo", "Estatus", "Riesgo", "Área", "Próximo vencimiento", "Responsable"]],
      body: reportRows.map((procedure) => [
        procedure.expedienteNumber,
        procedure.procedureType,
        procedure.generalStatus,
        procedure.riskLevel,
        procedure.areaLead,
        procedure.dates.nextDueDate ? formatDateLabel(procedure.dates.nextDueDate) : "Sin plazo",
        procedure.responsibles[0]?.name || "Sin asignar",
      ]),
      startY: 24,
      styles: { fontSize: 8 },
    })
    doc.save("portafolio_procedimientos_pdp.pdf")
  }

  const exportUpcomingXlsx = async () => {
    const rows = flattenProcedureAlerts(reportRows).map((row) => ({
      expediente: row.expedienteNumber,
      alerta: row.title,
      prioridad: row.priority,
      riesgo: row.riskLevel,
      fecha: row.referenceDate ? formatDateLabel(row.referenceDate) : "Sin fecha",
    }))
    const XLSX = await import("xlsx-js-style")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Vencimientos")
    XLSX.writeFile(wb, "vencimientos_procedimientos_pdp.xlsx")
  }

  const exportByResponsibleXlsx = async () => {
    const rows = reportRows.flatMap((procedure) =>
      procedure.responsibles
        .filter((responsible) => responsible.kind === "interno")
        .map((responsible) => ({
          expediente: procedure.expedienteNumber,
          responsable: responsible.name,
          tipo: procedure.procedureType,
          estatus: procedure.generalStatus,
          riesgo: procedure.riskLevel,
        })),
    )
    const XLSX = await import("xlsx-js-style")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Responsables")
    XLSX.writeFile(wb, "procedimientos_por_responsable.xlsx")
  }

  const exportEvidencePdf = (procedure: ProcedurePdpRecord) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Expediente ${procedure.expedienteNumber}`, 14, 18)
    doc.setFontSize(10)
    doc.text(`Tipo: ${procedure.procedureType}`, 14, 28)
    doc.text(`Estatus: ${procedure.generalStatus}`, 14, 34)
    doc.text(`Riesgo: ${procedure.riskLevel}`, 14, 40)
    doc.text(`Resumen: ${procedure.summary.slice(0, 160)}`, 14, 48, { maxWidth: 180 })

    autoTable(doc, {
      head: [["Fecha", "Actuación", "Descripción", "Usuario"]],
      body: [...procedure.actuations]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .map((actuation) => [
          formatDateLabel(actuation.date),
          actuation.type,
          actuation.description,
          actuation.createdBy,
        ]),
      startY: 62,
      styles: { fontSize: 8 },
    })

    autoTable(doc, {
      head: [["Documento", "Tipo", "Versión actual", "Última carga"]],
      body: procedure.documents.map((group) => {
        const currentVersion = group.versions.find((version) => version.isCurrent) || group.versions[group.versions.length - 1]
        return [
          group.title,
          group.documentType,
          currentVersion?.versionNumber || 1,
          currentVersion?.uploadedAt ? formatDateLabel(currentVersion.uploadedAt) : "Sin fecha",
        ]
      }),
      startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8
        : 120,
      styles: { fontSize: 8 },
    })

    autoTable(doc, {
      head: [["Fecha", "Acción", "Detalle", "Usuario"]],
      body: sortAuditEntries(procedure.auditLog).map((entry) => [
        formatDateTimeLabel(entry.createdAt),
        entry.action,
        entry.description,
        entry.actorName,
      ]),
      startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8
        : 180,
      styles: { fontSize: 8 },
    })

    doc.save(`${procedure.expedienteNumber.replaceAll("/", "-")}-evidencia.pdf`)
  }

  return (
    <>
      <ModuleWorkspaceShell
        moduleLabel="Davara Governance"
        moduleTitle="Procedimientos PDP"
        moduleDescription="Control integral de expedientes, actuaciones, vencimientos, evidencias y trazabilidad con navegación compacta y persistente."
        pageLabel={pageMeta.label}
        pageTitle={pageMeta.title}
        pageDescription={pageMeta.description}
        navItems={workspaceNavItems}
        activeNavId={viewSection === "expediente" ? "expedientes" : viewSection}
        onNavSelect={(itemId) => navigate(itemId as WorkspaceSection)}
        backHref="/litigation-management"
        backLabel="Volver al módulo"
        contentClassName="space-y-6"
        headerBadges={[
          { label: `${getActiveProcedureCount(root)} activos`, tone: "neutral" },
          { label: `${getProcedureHighRiskCount(root)} alto riesgo`, tone: getProcedureHighRiskCount(root) > 0 ? "warning" : "neutral" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <ProceduresPdpImportDialog root={root} onImported={(nextRoot) => refreshRoot(nextRoot)} />
            <Button variant="outline" onClick={exportPortfolioPdf}>
              <Download className="mr-2 h-4 w-4" />
              Exportar portafolio
            </Button>
          </div>
        }
      >
              {viewSection === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
                    {dashboard.metrics.map((metric) => (
                      <ProcedureMetricCard
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                        helper={metric.helper}
                        tone={metric.tone}
                      />
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <CardTitle className="text-xl">Expedientes prioritarios</CardTitle>
                            <CardDescription>Ordenados por vencimiento, riesgo e inactividad.</CardDescription>
                          </div>
                          <Button variant="ghost" onClick={() => navigate("expedientes")}>
                            ver todos
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 p-6">
                        {dashboard.prioritized.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            No hay expedientes registrados todavía. Registra el primero para activar el tablero.
                          </div>
                        ) : (
                          dashboard.prioritized.map((row) => (
                            <button
                              key={row.procedureId}
                              type="button"
                              onClick={() => navigate("expediente", { id: row.procedureId, tab: "resumen" })}
                              className="flex w-full items-start justify-between rounded-2xl border border-stone-200 p-4 text-left transition-colors hover:border-[#0a4abf]/30 hover:bg-stone-50"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex h-2.5 w-2.5 rounded-full",
                                      row.riskLevel === "Alto" ? "bg-red-500" : row.riskLevel === "Medio" ? "bg-amber-500" : "bg-emerald-500",
                                    )}
                                  />
                                  <p className="font-semibold text-slate-900">{row.expedienteNumber}</p>
                                </div>
                                <p className="text-sm text-slate-600">{row.procedureType}</p>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className={cn("rounded-full border px-2 py-1", statusBadgeClass(row.generalStatus))}>
                                    {row.generalStatus}
                                  </span>
                                  <span className={cn("rounded-full border px-2 py-1", riskBadgeClass(row.riskLevel))}>
                                    {row.riskLevel}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1 text-right text-sm text-slate-600">
                                <p>{row.nextDueLabel || "Sin vencimiento"}</p>
                                <p className="font-medium text-slate-900">
                                  {row.nextDueDate ? formatDateLabel(row.nextDueDate) : "Sin fecha"}
                                </p>
                                <p>{row.responsibleLabel}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <div className="grid gap-6">
                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle className="text-xl">Por tipo</CardTitle>
                          <CardDescription>Distribución real del portafolio por naturaleza del procedimiento.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px] p-4">
                          {dashboard.byType.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-slate-500">
                              Sin datos disponibles.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dashboard.byType} layout="vertical" margin={{ top: 4, left: 8, right: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="label" width={110} tickLine={false} axisLine={false} />
                                <Tooltip content={<ProcedureChartTooltip />} />
                                <Bar dataKey="value" radius={[999, 999, 999, 999]}>
                                  {dashboard.byType.map((row) => (
                                    <Cell key={row.label} fill={row.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle className="text-xl">Alertas activas</CardTitle>
                          <CardDescription>Conectadas con Recordatorios y la campana del header.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 p-6">
                          {alertGroups.critical.length === 0 && alertGroups.medium.length === 0 && alertGroups.low.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                              Sin alertas activas.
                            </div>
                          ) : (
                            [...alertGroups.critical.slice(0, 2), ...alertGroups.medium.slice(0, 2), ...alertGroups.low.slice(0, 1)].map((row) => (
                              <button
                                key={row.alertId}
                                type="button"
                                onClick={() => navigate("expediente", { id: row.procedureId, tab: "alertas" })}
                                className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
                              >
                                <span
                                  className={cn(
                                    "mt-2 h-2.5 w-2.5 rounded-full",
                                    row.priority === "alta" ? "bg-red-500" : row.priority === "media" ? "bg-amber-500" : "bg-blue-400",
                                  )}
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900">{row.title}</p>
                                  <p className="text-sm text-slate-600">{row.description}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-xl">Distribución por riesgo</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
                        <div className="h-[220px]">
                          {dashboard.byRisk.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-slate-500">
                              Sin datos disponibles.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={riskChartData}
                                  dataKey="value"
                                  nameKey="label"
                                  innerRadius={55}
                                  outerRadius={82}
                                >
                                  {dashboard.byRisk.map((row) => (
                                    <Cell key={row.label} fill={row.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<ProcedureChartTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                        <div className="space-y-3 p-3">
                          {dashboard.byRisk.map((row) => (
                            <div key={row.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                <span className="text-sm text-slate-700">{row.label}</span>
                              </div>
                              <span className="font-semibold text-slate-900">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-xl">Por estatus</CardTitle>
                            <CardDescription>Vista ejecutiva del avance procesal.</CardDescription>
                          </div>
                          <Button variant="outline" onClick={() => navigate("register")}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar nuevo
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="h-[260px] p-4">
                        {dashboard.byStatus.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            Sin datos disponibles.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboard.byStatus} layout="vertical" margin={{ top: 8, right: 10, bottom: 8, left: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="label" width={140} tickLine={false} axisLine={false} />
                              <Tooltip content={<ProcedureChartTooltip />} />
                              <Bar dataKey="value" radius={[999, 999, 999, 999]}>
                                {dashboard.byStatus.map((row) => (
                                  <Cell key={row.label} fill={row.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {viewSection === "expedientes" && (
                <div className="space-y-5">
                  <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(4,0.7fr)] md:grid-cols-2">
                    <Input
                      value={filters.search}
                      onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                      placeholder="Buscar expediente, responsable o palabras clave"
                    />
                    <Select
                      value={filters.type}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, type: value as ProcedureFilters["type"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todas">Todos los tipos</SelectItem>
                        {PROCEDURE_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.status}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, status: value as ProcedureFilters["status"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Estatus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos">Todos los estatus</SelectItem>
                        {GENERAL_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.risk}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, risk: value as ProcedureFilters["risk"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Riesgo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos">Todos los riesgos</SelectItem>
                        {RISK_LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.area}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, area: value as ProcedureFilters["area"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todas">Todas las áreas</SelectItem>
                        {AREA_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="overflow-hidden rounded-[28px] border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f8fbff]">
                          <TableHead>Expediente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estatus</TableHead>
                          <TableHead>Riesgo</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Responsable</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProcedures.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                              No se encontraron expedientes con los filtros seleccionados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProcedures.map((procedure) => {
                            const topAlert = getFirstActiveAlert(procedure)
                            return (
                              <TableRow
                                key={procedure.id}
                                className="cursor-pointer hover:bg-slate-50"
                                onClick={() => navigate("expediente", { id: procedure.id, tab: "resumen" })}
                              >
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-slate-900">{procedure.expedienteNumber}</p>
                                    <p className="text-sm text-slate-500">{procedure.summary.slice(0, 72)}...</p>
                                  </div>
                                </TableCell>
                                <TableCell>{procedure.procedureType}</TableCell>
                                <TableCell>
                                  <span className={cn("rounded-full border px-2 py-1 text-xs", statusBadgeClass(procedure.generalStatus))}>
                                    {procedure.generalStatus}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={cn("rounded-full border px-2 py-1 text-xs", riskBadgeClass(procedure.riskLevel))}>
                                    {procedure.riskLevel}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {topAlert?.referenceDate ? (
                                    <div>
                                      <p className="font-medium text-slate-900">{formatDateLabel(topAlert.referenceDate)}</p>
                                      <p className="text-xs text-slate-500">{topAlert.title}</p>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-slate-500">Sin plazo</span>
                                  )}
                                </TableCell>
                                <TableCell>{procedure.responsibles[0]?.name || "Sin asignar"}</TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {viewSection === "register" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-4">
                      {[1, 2, 3].map((step) => (
                        <div key={step} className="flex flex-1 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                              wizardStep >= step
                                ? "border-[#0a4abf] bg-[#0a4abf] text-white"
                                : "border-stone-300 bg-white text-stone-500",
                            )}
                          >
                            {step}
                          </div>
                          <div className="hidden flex-1 sm:block">
                            <p className={cn("text-sm font-medium", wizardStep === step ? "text-slate-900" : "text-slate-500")}>
                              {step === 1 && "Datos generales"}
                              {step === 2 && "Descripción y riesgo"}
                              {step === 3 && "Documentos y responsables"}
                            </p>
                            {step < 3 ? <div className="mt-2 h-px bg-slate-200" /> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {wizardDraft.id ? (
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        Editando expediente
                      </Badge>
                    ) : null}
                  </div>

                  <Card className="rounded-[28px] border-slate-200 shadow-sm">
                    <CardContent className="space-y-8 p-6">
                      {wizardStep === 1 && (
                        <div className="space-y-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Número de expediente</Label>
                              <Input
                                value={wizardDraft.expedienteNumber}
                                onChange={(event) =>
                                  setWizardDraft((prev) => ({ ...prev, expedienteNumber: event.target.value }))
                                }
                                placeholder="Ej. UPDP-SABG-PPD-003/2025"
                              />
                              {wizardErrors.expedienteNumber ? <p className="text-xs text-red-600">{wizardErrors.expedienteNumber}</p> : null}
                            </div>
                            <div className="space-y-2">
                              <Label>Fecha de inicio</Label>
                              <Input
                                type="date"
                                value={wizardDraft.startedAt}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, startedAt: event.target.value }))}
                              />
                              {wizardErrors.startedAt ? <p className="text-xs text-red-600">{wizardErrors.startedAt}</p> : null}
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de procedimiento</Label>
                              <Select
                                value={wizardDraft.procedureType}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) =>
                                    syncDraftStageWithType({
                                      ...prev,
                                      procedureType: value as ProcedureWizardDraft["procedureType"],
                                    }),
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROCEDURE_TYPE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Autoridad competente</Label>
                              <Select
                                value={wizardDraft.authority}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) => ({
                                    ...prev,
                                    authority: value as ProcedureWizardDraft["authority"],
                                    customAuthority: value === "Otra autoridad" ? prev.customAuthority : "",
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AUTHORITY_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {wizardDraft.authority === "Otra autoridad" ? (
                              <div className="space-y-2">
                                <Label>Nombre de la autoridad</Label>
                                <Input
                                  value={wizardDraft.customAuthority}
                                  onChange={(event) =>
                                    setWizardDraft((prev) => ({ ...prev, customAuthority: event.target.value }))
                                  }
                                  placeholder="Ej. DGIV/INAI"
                                />
                                {wizardErrors.customAuthority ? <p className="text-xs text-red-600">{wizardErrors.customAuthority}</p> : null}
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <Label>Origen</Label>
                              <Select
                                value={wizardDraft.origin}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) => ({ ...prev, origin: value as ProcedureWizardDraft["origin"] }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ORIGIN_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Estatus actual</Label>
                              <Select
                                value={wizardDraft.generalStatus}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) => ({ ...prev, generalStatus: value as ProcedureGeneralStatus }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GENERAL_STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Etapa procesal actual</Label>
                              <Select
                                value={wizardDraft.proceduralStage}
                                onValueChange={(value) => setWizardDraft((prev) => ({ ...prev, proceduralStage: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getProcedureStageOptions(wizardDraft.procedureType).map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {wizardErrors.proceduralStage ? <p className="text-xs text-red-600">{wizardErrors.proceduralStage}</p> : null}
                            </div>
                            <div className="space-y-2">
                              <Label>Área responsable</Label>
                              <Select
                                value={wizardDraft.areaLead}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) => ({ ...prev, areaLead: value as ProcedureWizardDraft["areaLead"] }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AREA_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {wizardStep === 2 && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label>Descripción general del asunto</Label>
                            <Textarea
                              value={wizardDraft.summary}
                              onChange={(event) => setWizardDraft((prev) => ({ ...prev, summary: event.target.value }))}
                              placeholder="Resume el contexto, origen y situación actual del procedimiento."
                              className="min-h-[140px]"
                            />
                            <p className="text-xs text-slate-500">Mínimo 100 caracteres.</p>
                            {wizardErrors.summary ? <p className="text-xs text-red-600">{wizardErrors.summary}</p> : null}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Nivel de riesgo</Label>
                              <Select
                                value={wizardDraft.riskLevel}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) => ({ ...prev, riskLevel: value as ProcedureRiskLevel }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {RISK_LEVEL_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Fecha de notificación a la organización</Label>
                              <Input
                                type="date"
                                value={wizardDraft.organizationNotifiedAt}
                                onChange={(event) =>
                                  setWizardDraft((prev) => ({ ...prev, organizationNotifiedAt: event.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Próximo vencimiento</Label>
                              <Input
                                type="date"
                                value={wizardDraft.nextDueDate}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, nextDueDate: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Descripción del plazo</Label>
                              <Input
                                value={wizardDraft.nextDueLabel}
                                onChange={(event) =>
                                  setWizardDraft((prev) => ({ ...prev, nextDueLabel: event.target.value }))
                                }
                                placeholder="Ej. Contestación al requerimiento"
                              />
                            </div>
                          </div>

                          <div className="grid gap-6 lg:grid-cols-2">
                            <div className="space-y-3">
                              <Label>Áreas relacionadas</Label>
                              <div className="grid gap-2 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                                {AREA_OPTIONS.map((option) => (
                                  <label key={option} className="flex items-center gap-3 text-sm text-slate-700">
                                    <Checkbox
                                      checked={wizardDraft.relatedAreas.includes(option)}
                                      onCheckedChange={(checked) =>
                                        setWizardDraft((prev) => ({
                                          ...prev,
                                          relatedAreas: checked
                                            ? Array.from(new Set([...prev.relatedAreas, option]))
                                            : prev.relatedAreas.filter((item) => item !== option),
                                        }))
                                      }
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                              </div>
                              {wizardErrors.relatedAreas ? <p className="text-xs text-red-600">{wizardErrors.relatedAreas}</p> : null}
                            </div>

                            <div className="space-y-3">
                              <Label>Datos personales involucrados</Label>
                              <div className="grid gap-2 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                                {DATA_CATEGORY_OPTIONS.map((option) => (
                                  <label key={option} className="flex items-center gap-3 text-sm text-slate-700">
                                    <Checkbox
                                      checked={wizardDraft.dataCategories.includes(option)}
                                      onCheckedChange={(checked) =>
                                        setWizardDraft((prev) => ({
                                          ...prev,
                                          dataCategories: checked
                                            ? Array.from(new Set([...prev.dataCategories, option]))
                                            : prev.dataCategories.filter((item) => item !== option),
                                        }))
                                      }
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                              </div>
                              {wizardErrors.dataCategories ? <p className="text-xs text-red-600">{wizardErrors.dataCategories}</p> : null}
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Titular(es) involucrado(s)</Label>
                              <Input
                                value={wizardDraft.holders}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, holders: event.target.value }))}
                                placeholder="Campo sensible"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Promovente / denunciante</Label>
                              <Input
                                value={wizardDraft.promoter}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, promoter: event.target.value }))}
                                placeholder="Titular, autoridad, despacho, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Áreas internas involucradas</Label>
                              <Textarea
                                value={wizardDraft.involvedAreasNotes}
                                onChange={(event) =>
                                  setWizardDraft((prev) => ({ ...prev, involvedAreasNotes: event.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Estrategia / comentarios internos</Label>
                              <Textarea
                                value={wizardDraft.strategyNotes}
                                onChange={(event) =>
                                  setWizardDraft((prev) => ({ ...prev, strategyNotes: event.target.value }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {wizardStep === 3 && (
                        <div className="space-y-8">
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Responsables internos</Label>
                                <div className="rounded-2xl border border-slate-200 p-4">
                                  {knownUsers.length === 0 ? (
                                    <p className="text-sm text-slate-500">No hay usuarios detectados en la plataforma.</p>
                                  ) : (
                                    <div className="grid gap-2">
                                      {knownUsers.map((user) => (
                                        <label key={user.email} className="flex items-center gap-3 text-sm text-slate-700">
                                          <Checkbox
                                            checked={wizardDraft.internalResponsibleEmails.includes(user.email)}
                                            onCheckedChange={(checked) =>
                                              setWizardDraft((prev) => ({
                                                ...prev,
                                                internalResponsibleEmails: checked
                                                  ? Array.from(new Set([...prev.internalResponsibleEmails, user.email]))
                                                  : prev.internalResponsibleEmails.filter((email) => email !== user.email),
                                              }))
                                            }
                                          />
                                          <span>{user.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {wizardErrors.internalResponsibleEmails ? (
                                  <p className="text-xs text-red-600">{wizardErrors.internalResponsibleEmails}</p>
                                ) : null}
                              </div>

                              <div className="space-y-2">
                                <Label>Despacho externo</Label>
                                <Input
                                  value={wizardDraft.externalFirm}
                                  onChange={(event) => setWizardDraft((prev) => ({ ...prev, externalFirm: event.target.value }))}
                                  placeholder="Nombre del despacho"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Contacto del despacho</Label>
                                <Input
                                  value={wizardDraft.externalContact}
                                  onChange={(event) =>
                                    setWizardDraft((prev) => ({ ...prev, externalContact: event.target.value }))
                                  }
                                  placeholder="Correo o nombre del contacto"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="grid gap-3">
                                  <div className="space-y-2">
                                    <Label>Título del documento</Label>
                                    <Input value={pendingDocumentTitle} onChange={(event) => setPendingDocumentTitle(event.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tipo documental</Label>
                                    <Select value={pendingDocumentType} onValueChange={(value) => setPendingDocumentType(value as ProcedureDocumentType)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DOCUMENT_TYPE_OPTIONS.map((option) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Input value={pendingDocumentDescription} onChange={(event) => setPendingDocumentDescription(event.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Archivo</Label>
                                    <Input type="file" onChange={(event) => setPendingDocumentFile(event.target.files?.[0] || null)} />
                                    {wizardErrors.pendingDocumentFile ? <p className="text-xs text-red-600">{wizardErrors.pendingDocumentFile}</p> : null}
                                  </div>
                                  <Button type="button" variant="outline" onClick={handleQueueDocument}>
                                    <FilePlus2 className="mr-2 h-4 w-4" />
                                    Agregar a la cola
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium text-slate-900">Documentos por cargar</p>
                                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                                    {pendingDocuments.length}
                                  </Badge>
                                </div>
                                {pendingDocuments.length === 0 ? (
                                  <p className="text-sm text-slate-500">Sin documentos pendientes.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {pendingDocuments.map((document) => (
                                      <div key={document.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                                        <div>
                                          <p className="font-medium text-slate-900">{document.title}</p>
                                          <p className="text-xs text-slate-500">
                                            {document.documentType} · {document.file.name}
                                          </p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setPendingDocuments((prev) => prev.filter((row) => row.id !== document.id))}
                                        >
                                          Quitar
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Resultado / sentido</Label>
                              <Select
                                value={wizardDraft.result || ""}
                                onValueChange={(value) =>
                                  setWizardDraft((prev) => ({ ...prev, result: value as ProcedureWizardDraft["result"] }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona resultado" />
                                </SelectTrigger>
                                <SelectContent>
                                  {OUTCOME_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {wizardErrors.result ? <p className="text-xs text-red-600">{wizardErrors.result}</p> : null}
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de sanción</Label>
                              <Input
                                value={wizardDraft.sanctionType}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, sanctionType: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Monto de sanción</Label>
                              <Input
                                value={wizardDraft.sanctionAmount}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, sanctionAmount: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2 lg:col-span-3">
                              <Label>Lección aprendida</Label>
                              <Textarea
                                value={wizardDraft.lessonsLearned}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, lessonsLearned: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2 lg:col-span-3">
                              <Label>Acciones post-resolución</Label>
                              <Textarea
                                value={wizardDraft.followUpActions}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, followUpActions: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2 lg:col-span-3">
                              <Label>Motivo de suspensión</Label>
                              <Textarea
                                value={wizardDraft.suspensionReason}
                                onChange={(event) => setWizardDraft((prev) => ({ ...prev, suspensionReason: event.target.value }))}
                              />
                              {wizardErrors.suspensionReason ? <p className="text-xs text-red-600">{wizardErrors.suspensionReason}</p> : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handlePrevStep} disabled={wizardStep === 1}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Anterior
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handlePersistProcedure(true)}>
                        Guardar borrador
                      </Button>
                      {wizardStep < 3 ? (
                        <Button onClick={handleNextStep}>
                          Siguiente
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button onClick={() => handlePersistProcedure(false)}>
                          {wizardDraft.id ? "Actualizar expediente" : "Registrar expediente"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {viewSection === "alertas" && (
                <div className="space-y-6">
                  {[
                    { title: "Críticas", rows: alertGroups.critical, color: "bg-red-500" },
                    { title: "Próximas", rows: alertGroups.medium, color: "bg-amber-500" },
                    { title: "Seguimiento", rows: alertGroups.low, color: "bg-blue-400" },
                  ].map((group) => (
                    <div key={group.title} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", group.color)} />
                        <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                      </div>
                      {group.rows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                          Sin alertas en esta categoría.
                        </div>
                      ) : (
                        group.rows.map((row) => (
                          <div key={row.alertId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{row.title}</p>
                              <p className="text-sm text-slate-600">{row.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => navigate("expediente", { id: row.procedureId, tab: "resumen" })}>
                                Ver exp.
                              </Button>
                              <Button size="sm" onClick={() => navigate("expediente", { id: row.procedureId, tab: "cronologia" })}>
                                Atender
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              )}

              {viewSection === "reportes" && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                    <Select
                      value={reportFilters.period}
                      onValueChange={(value) =>
                        setReportFilters((prev) => ({ ...prev, period: value as ReportFilters["period"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultimo_mes">Último mes</SelectItem>
                        <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
                        <SelectItem value="anio_en_curso">Año en curso</SelectItem>
                        <SelectItem value="historico">Histórico</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={reportFilters.areaLead}
                      onValueChange={(value) =>
                        setReportFilters((prev) => ({ ...prev, areaLead: value as ReportFilters["areaLead"] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todas">Todas las áreas</SelectItem>
                        {AREA_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={reportFilters.responsibleEmail || "todos"}
                      onValueChange={(value) =>
                        setReportFilters((prev) => ({ ...prev, responsibleEmail: value === "todos" ? "" : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los responsables</SelectItem>
                        {knownUsers.map((user) => (
                          <SelectItem key={user.email} value={user.email}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {reportRows.length} expediente(s) incluidos
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle>Portafolio completo de expedientes</CardTitle>
                        <CardDescription>Listado con datos principales y semáforos del portafolio.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-4 p-6">
                        <div className="text-sm text-slate-600">Exporta el universo filtrado en PDF.</div>
                        <Button onClick={exportPortfolioPdf}>PDF</Button>
                      </CardContent>
                    </Card>
                    <Card className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle>Vencimientos próximos</CardTitle>
                        <CardDescription>Consolidado de alertas y plazos activos en XLSX.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-4 p-6">
                        <div className="text-sm text-slate-600">Toma como base alertas activas del módulo.</div>
                        <Button variant="outline" onClick={exportUpcomingXlsx}>XLSX</Button>
                      </CardContent>
                    </Card>
                    <Card className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle>Asuntos por responsable</CardTitle>
                        <CardDescription>Distribución por responsable interno en XLSX.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-4 p-6">
                        <div className="text-sm text-slate-600">Cruce operativo entre expedientes y responsables.</div>
                        <Button variant="outline" onClick={exportByResponsibleXlsx}>XLSX</Button>
                      </CardContent>
                    </Card>
                    <Card className="rounded-[28px] border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle>Expediente completo (evidencia)</CardTitle>
                        <CardDescription>Genera el expediente integral con actuaciones, documentos y bitácora.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <Select
                          value={selectedProcedure?.id || "sin-seleccion"}
                          onValueChange={(value) =>
                            value !== "sin-seleccion"
                              ? navigate("expediente", { id: value, tab: "resumen" })
                              : undefined
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona expediente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin-seleccion">Selecciona expediente</SelectItem>
                            {root.procedures.map((procedure) => (
                              <SelectItem key={procedure.id} value={procedure.id}>
                                {procedure.expedienteNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          disabled={!selectedProcedure}
                          onClick={() => selectedProcedure && exportEvidencePdf(selectedProcedure)}
                        >
                          PDF evidencia
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {viewSection === "bitacora" && (
                <div className="space-y-4">
                  {globalAuditLog.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      La bitácora aparecerá conforme se registren expedientes y acciones.
                    </div>
                  ) : (
                    globalAuditLog.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#0a4abf]" />
                            <p className="font-semibold text-slate-900">{entry.action}</p>
                          </div>
                          <p className="text-sm text-slate-500">{formatDateTimeLabel(entry.createdAt)}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{entry.description}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.actorName}
                          {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {viewSection === "expediente" && selectedProcedure && (
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-2xl font-semibold text-slate-950">{selectedProcedure.expedienteNumber}</h3>
                          <Badge variant="outline" className={statusBadgeClass(selectedProcedure.generalStatus)}>
                            {selectedProcedure.generalStatus}
                          </Badge>
                          <Badge variant="outline" className={riskBadgeClass(selectedProcedure.riskLevel)}>
                            {selectedProcedure.riskLevel}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                          <span>{selectedProcedure.procedureType}</span>
                          <span>{getProcedureAuthorityLabel(selectedProcedure)}</span>
                          <span>{selectedProcedure.responsibles[0]?.name || "Sin responsable"}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate("register", { id: selectedProcedure.id })}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Editar datos
                        </Button>
                        <Button variant="outline" onClick={() => setDocumentDialogOpen(true)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Cargar documento
                        </Button>
                        <Button onClick={() => setActiveDetailTab("cronologia")}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Agregar actuación
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Tabs
                    value={activeDetailTab}
                    onValueChange={(value) => {
                      const nextTab = value as DetailTab
                      setActiveDetailTab(nextTab)
                      navigate("expediente", { id: selectedProcedure.id, tab: nextTab })
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1 md:grid-cols-4 xl:grid-cols-8">
                      {DETAIL_TABS.map((tab) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="rounded-xl px-2 text-xs data-[state=active]:bg-white sm:text-sm"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="resumen" className="mt-6 space-y-6">
                      <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                        <ProcedureMetricCard label="Actuaciones" value={selectedProcedure.actuations.length} helper="Bitácora procesal" tone="neutral" />
                        <ProcedureMetricCard label="Documentos" value={selectedProcedure.documents.length} helper="Grupos documentales" tone="neutral" />
                        <ProcedureMetricCard label="Alertas activas" value={selectedProcedure.alerts.length} helper="Vencimientos y seguimiento" tone={selectedProcedure.alerts.length ? "critical" : "positive"} />
                        <ProcedureMetricCard label="Tareas" value={selectedProcedure.tasks.filter((task) => task.status !== "Completada").length} helper="Pendientes" tone="warning" />
                      </div>

                      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <Card className="rounded-[28px] border-slate-200 shadow-sm">
                          <CardHeader className="border-b border-slate-100">
                            <CardTitle>Resumen ejecutivo</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 p-6">
                            <p className="text-sm leading-7 text-slate-700">{selectedProcedure.summary}</p>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-sm font-medium text-slate-500">Etapa procesal</p>
                                <p className="mt-1 text-slate-900">{selectedProcedure.proceduralStage}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-500">Próximo vencimiento</p>
                                <p className="mt-1 text-slate-900">
                                  {selectedProcedure.dates.nextDueDate
                                    ? `${formatDateLabel(selectedProcedure.dates.nextDueDate)} · ${selectedProcedure.dates.nextDueLabel || "Plazo activo"}`
                                    : "Sin plazo activo"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-500">Responsables</p>
                                <p className="mt-1 text-slate-900">
                                  {selectedProcedure.responsibles.map((responsible) => responsible.name).join(", ") || "Sin asignar"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-500">Última actualización</p>
                                <p className="mt-1 text-slate-900">{formatDateTimeLabel(selectedProcedure.updatedAt)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="rounded-[28px] border-slate-200 shadow-sm">
                          <CardHeader className="border-b border-slate-100">
                            <CardTitle>Últimas actuaciones</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 p-6">
                            {[...selectedProcedure.actuations]
                              .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
                              .slice(0, 3)
                              .map((actuation) => (
                                <div key={actuation.id} className="rounded-2xl border border-slate-200 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-slate-900">{actuation.title}</p>
                                    <span className="text-xs text-slate-500">{formatDateLabel(actuation.date)}</span>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-600">{actuation.description}</p>
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="datos" className="mt-6">
                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-medium text-slate-500">Tipo</p>
                            <p className="mt-1 text-slate-900">{selectedProcedure.procedureType}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Familia</p>
                            <p className="mt-1 text-slate-900">{selectedProcedure.procedureFamily}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Autoridad</p>
                            <p className="mt-1 text-slate-900">{getProcedureAuthorityLabel(selectedProcedure)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Origen</p>
                            <p className="mt-1 text-slate-900">{selectedProcedure.origin}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Fecha de inicio</p>
                            <p className="mt-1 text-slate-900">{formatDateLabel(selectedProcedure.dates.startedAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Área líder</p>
                            <p className="mt-1 text-slate-900">{selectedProcedure.areaLead}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-slate-500">Áreas relacionadas</p>
                            <p className="mt-1 text-slate-900">{selectedProcedure.relatedAreas.join(", ") || "Sin dato"}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-slate-500">Datos involucrados</p>
                            <p className="mt-1 text-slate-900">{selectedProcedure.dataCategories.join(", ") || "Sin clasificar"}</p>
                          </div>
                          {canViewSensitive ? (
                            <>
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-slate-500">Titular(es) involucrado(s)</p>
                                <p className="mt-1 text-slate-900">{selectedProcedure.holders || "Sin registro"}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-slate-500">Estrategia / comentarios internos</p>
                                <p className="mt-1 whitespace-pre-wrap text-slate-900">{selectedProcedure.strategyNotes || "Sin registro"}</p>
                              </div>
                            </>
                          ) : null}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="cronologia" className="mt-6 space-y-6">
                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle>Registrar actuación</CardTitle>
                          <CardDescription>Actualiza la línea de tiempo y genera alertas si existe nuevo plazo.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={actuationDraft.type}
                              onValueChange={(value) =>
                                setActuationDraft((prev) => ({ ...prev, type: value as ActuationDraft["type"] }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTUATION_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                              type="date"
                              value={actuationDraft.date}
                              onChange={(event) => setActuationDraft((prev) => ({ ...prev, date: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Título</Label>
                            <Input
                              value={actuationDraft.title}
                              onChange={(event) => setActuationDraft((prev) => ({ ...prev, title: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Descripción</Label>
                            <Textarea
                              value={actuationDraft.description}
                              onChange={(event) =>
                                setActuationDraft((prev) => ({ ...prev, description: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nuevo plazo</Label>
                            <Input
                              type="date"
                              value={actuationDraft.nextDueDate}
                              onChange={(event) =>
                                setActuationDraft((prev) => ({ ...prev, nextDueDate: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Descripción del plazo</Label>
                            <Input
                              value={actuationDraft.nextDueLabel}
                              onChange={(event) =>
                                setActuationDraft((prev) => ({ ...prev, nextDueLabel: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Cambiar estatus después de la actuación</Label>
                            <Select
                              value={actuationDraft.suggestedStatus || "sin-cambio"}
                              onValueChange={(value) =>
                                setActuationDraft((prev) => ({
                                  ...prev,
                                  suggestedStatus: value === "sin-cambio" ? "" : (value as ProcedureGeneralStatus),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sin cambio" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sin-cambio">Sin cambio</SelectItem>
                                {GENERAL_STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2">
                            <Button onClick={handleAddActuation}>Guardar actuación</Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-3">
                        {[...selectedProcedure.actuations]
                          .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
                          .map((actuation) => (
                            <div key={actuation.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{actuation.title}</p>
                                  <p className="text-sm text-slate-500">{actuation.type}</p>
                                </div>
                                <div className="text-right text-sm text-slate-500">
                                  <p>{formatDateLabel(actuation.date)}</p>
                                  <p>{actuation.createdBy}</p>
                                </div>
                              </div>
                              <p className="mt-3 text-sm leading-7 text-slate-700">{actuation.description}</p>
                              {actuation.nextDueDate ? (
                                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                  Próximo plazo: {formatDateLabel(actuation.nextDueDate)} · {actuation.nextDueLabel || "Seguimiento"}
                                </div>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="documentos" className="mt-6 space-y-6">
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setDocumentDialogOpen(true)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Cargar documento
                        </Button>
                      </div>
                      {selectedProcedure.documents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                          No hay documentos cargados para este expediente.
                        </div>
                      ) : (
                        sortProcedureDocuments(selectedProcedure.documents).map((group) => {
                          const currentVersion = group.versions.find((version) => version.isCurrent) || group.versions[group.versions.length - 1]
                          return (
                            <Card key={group.id} className="rounded-[28px] border-slate-200 shadow-sm">
                              <CardHeader className="border-b border-slate-100">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <CardTitle>{group.title}</CardTitle>
                                    <CardDescription>{group.documentType}</CardDescription>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const file = getProcedureDocumentFile(currentVersion?.fileId)
                                        if (file) window.open(createFileURL(file.content), "_blank", "noopener,noreferrer")
                                      }}
                                    >
                                      Ver
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setDocumentTargetGroupId(group.id)
                                        setPendingDocumentTitle(group.title)
                                        setPendingDocumentType(group.documentType)
                                        setPendingDocumentDescription(group.description || "")
                                        setDocumentDialogOpen(true)
                                      }}
                                    >
                                      Nueva versión
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 p-6">
                                {group.versions
                                  .sort((left, right) => right.versionNumber - left.versionNumber)
                                  .map((version) => (
                                    <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          V{version.versionNumber} · {version.fileName}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                          {version.uploadedBy} · {formatDateTimeLabel(version.uploadedAt)}
                                        </p>
                                      </div>
                                      {version.isCurrent ? (
                                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                          Actual
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                                          Histórica
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                              </CardContent>
                            </Card>
                          )
                        })
                      )}
                    </TabsContent>

                    <TabsContent value="tareas" className="mt-6 space-y-6">
                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle>Nueva tarea</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>Título</Label>
                            <Input
                              value={taskDraft.title}
                              onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Descripción</Label>
                            <Textarea
                              value={taskDraft.description}
                              onChange={(event) =>
                                setTaskDraft((prev) => ({ ...prev, description: event.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha límite</Label>
                            <Input
                              type="date"
                              value={taskDraft.dueDate}
                              onChange={(event) => setTaskDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Responsables</Label>
                            <div className="rounded-2xl border border-slate-200 p-3">
                              {selectedProcedure.responsibles.filter((responsible) => responsible.kind === "interno").map((responsible) => (
                                <label key={responsible.id} className="flex items-center gap-3 py-1 text-sm text-slate-700">
                                  <Checkbox
                                    checked={taskDraft.responsibleIds.includes(responsible.id)}
                                    onCheckedChange={(checked) =>
                                      setTaskDraft((prev) => ({
                                        ...prev,
                                        responsibleIds: checked
                                          ? Array.from(new Set([...prev.responsibleIds, responsible.id]))
                                          : prev.responsibleIds.filter((id) => id !== responsible.id),
                                      }))
                                    }
                                  />
                                  <span>{responsible.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <Button onClick={handleAddTask}>Agregar tarea</Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle>Responsables y tareas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <p className="font-medium text-slate-900">Responsables asignados</p>
                            <p className="mt-2 text-sm text-slate-600">
                              {selectedProcedure.responsibles.map((responsible) => responsible.name).join(", ") || "Sin asignar"}
                            </p>
                          </div>
                          {selectedProcedure.tasks.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                              No hay tareas pendientes para este expediente.
                            </div>
                          ) : (
                            selectedProcedure.tasks.map((task) => (
                              <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                                <div>
                                  <p className="font-medium text-slate-900">{task.title}</p>
                                  <p className="text-sm text-slate-500">
                                    {task.dueDate ? formatDateLabel(task.dueDate) : "Sin fecha"} ·{" "}
                                    {task.responsibleIds
                                      .map((id) => selectedProcedure.responsibles.find((responsible) => responsible.id === id)?.name)
                                      .filter(Boolean)
                                      .join(", ") || "Sin responsable"}
                                  </p>
                                </div>
                                <Select
                                  value={task.status}
                                  onValueChange={(value) => {
                                    const nextRoot = updateProcedureTaskStatus(root, selectedProcedure.id, task.id, value as typeof task.status)
                                    refreshRoot(nextRoot)
                                  }}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="En progreso">En progreso</SelectItem>
                                    <SelectItem value="Completada">Completada</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="comentarios" className="mt-6 space-y-6">
                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle>Comentarios internos</CardTitle>
                          <CardDescription>Usa @usuario para menciones simples dentro del equipo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                          <Textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="min-h-[120px]" />
                          <Button onClick={handleAddComment}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Agregar comentario
                          </Button>
                        </CardContent>
                      </Card>
                      {selectedProcedure.comments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                          Sin comentarios registrados.
                        </div>
                      ) : (
                        selectedProcedure.comments
                          .slice()
                          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                          .map((comment) => (
                            <div key={comment.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-slate-900">{comment.createdBy}</p>
                                <p className="text-sm text-slate-500">{formatDateTimeLabel(comment.createdAt)}</p>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.body}</p>
                            </div>
                          ))
                      )}
                    </TabsContent>

                    <TabsContent value="alertas" className="mt-6 space-y-4">
                      {selectedProcedure.alerts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                          El expediente no tiene alertas activas.
                        </div>
                      ) : (
                        selectedProcedure.alerts.map((alert) => (
                          <div key={alert.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <AlertCircle
                                  className={cn(
                                    "h-4 w-4",
                                    alert.priority === "alta" ? "text-red-500" : alert.priority === "media" ? "text-amber-500" : "text-slate-400",
                                  )}
                                />
                                <p className="font-semibold text-slate-900">{alert.title}</p>
                              </div>
                              <Badge variant="outline" className={cn("border", alert.priority === "alta" ? "border-red-200 bg-red-50 text-red-700" : alert.priority === "media" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                                {alert.priority}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{alert.description}</p>
                            {alert.referenceDate ? (
                              <p className="mt-1 text-xs text-slate-500">Referencia: {formatDateLabel(alert.referenceDate)}</p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="historial" className="mt-6 space-y-6">
                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle>Bitácora del expediente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-6">
                          {sortAuditEntries(selectedProcedure.auditLog).map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-slate-900">{entry.action}</p>
                                <p className="text-sm text-slate-500">{formatDateTimeLabel(entry.createdAt)}</p>
                              </div>
                              <p className="mt-2 text-sm text-slate-700">{entry.description}</p>
                              <p className="mt-1 text-xs text-slate-500">{entry.actorName}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card className="rounded-[28px] border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                          <CardTitle>Registro de acceso</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-6">
                          {selectedProcedure.accessLog.length === 0 ? (
                            <p className="text-sm text-slate-500">Aún no hay accesos registrados.</p>
                          ) : (
                            selectedProcedure.accessLog
                              .slice()
                              .sort((left, right) => new Date(right.accessedAt).getTime() - new Date(left.accessedAt).getTime())
                              .map((entry) => (
                                <div key={entry.id} className="rounded-2xl border border-slate-200 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-slate-900">{entry.actorName}</p>
                                    <p className="text-sm text-slate-500">{formatDateTimeLabel(entry.accessedAt)}</p>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-700">{entry.context}</p>
                                </div>
                              ))
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {viewSection === "expediente" && !selectedProcedure ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  El expediente seleccionado ya no está disponible.
                </div>
              ) : null}
      </ModuleWorkspaceShell>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{documentTargetGroupId ? "Agregar nueva versión" : "Cargar documento"}</DialogTitle>
            <DialogDescription>
              Los documentos del expediente se guardan en `storedFiles` y se versionan dentro del módulo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {!documentTargetGroupId ? (
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={pendingDocumentTitle} onChange={(event) => setPendingDocumentTitle(event.target.value)} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={pendingDocumentType} onValueChange={(value) => setPendingDocumentType(value as ProcedureDocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={pendingDocumentDescription} onChange={(event) => setPendingDocumentDescription(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input type="file" onChange={(event) => setPendingDocumentFile(event.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDocumentDialogOpen(false)
                  setDocumentTargetGroupId(undefined)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUploadDocument}>Guardar documento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
