"use client"

import { useEffect, useState, useMemo } from "react"
import { useLanguage } from "@/lib/LanguageContext"
import { translations } from "@/lib/translations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { UserProgressDashboard } from "@/components/user-progress-dashboard"
import {
  Users,
  FileText,
  ClipboardCheck,
  Shield,
  Lock,
  Unlock,
  UserPlus,
  Search,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  ChevronRight,
  X,
  Check,
  KeyRound,
  LayoutDashboard,
  Database,
  FileSignature,
  UserCog,
  Newspaper,
  ClipboardList,
  FileCheck,
  GraduationCap,
  Scale,
  AlertTriangle,
  Bell,
  ListCheck,
  FileText as FileTextIcon,
} from "lucide-react"
import { loadItems } from "@/lib/module-statistics"
import { getPrimaryPolicy } from "@/lib/policy-governance"
import { getPolicyDashboardSnapshot, getTrainingDashboardSnapshot } from "@/lib/dashboard-progress"
import {
  getUsers,
  saveUsers,
  addUser,
  updateUser,
  deleteUser,
  approveUser,
  rejectUser,
  setUserRole,
  updateUserPermissions,
  getModulePasswords,
  setModulePassword,
  removeModulePassword,
  toggleModulePassword,
  ALL_MODULES,
  ROLE_PRESETS,
  ROLE_LABELS,
  initializeDefaultUsers,
  ensureDemoUser,
  type PlatformUser,
  type UserRole,
  type ModulePassword,
} from "@/lib/user-permissions"
import { hashPassword } from "@/lib/auth"

// ─── Icon map for modules ────────────────────────────────────────────────────

const MODULE_ICON_MAP: Record<string, any> = {
  "/rat": Database,
  "/privacy-notices": FileTextIcon,
  "/third-party-contracts": FileSignature,
  "/dpo": UserCog,
  "/arco-rights": Users,
  "/security-system": Shield,
  "/awareness": Newspaper,
  "/eipd": ClipboardList,
  "/data-policies": FileCheck,
  "/davara-training": GraduationCap,
  "/litigation-management": Scale,
  "/audit": ListCheck,
  "/incidents-breaches": AlertTriangle,
  "/audit-alarms": Bell,
}

// ─── Module Reports (same data, enhanced) ────────────────────────────────────

const fallbackReports = [
  { module: "Inventarios", scoreLabel: "Completitud", score: 0, summary: "Cargando métricas de registros y riesgo...", indicators: [{ label: "Registros", value: "-" }, { label: "Riesgo alto", value: "-" }, { label: "Terminados", value: "-" }] },
  { module: "Avisos de Privacidad", scoreLabel: "Cobertura", score: 0, summary: "Cargando clasificación de avisos...", indicators: [{ label: "Avisos activos", value: "-" }, { label: "Prueba documental", value: "-" }, { label: "Brechas", value: "-" }] },
  { module: "Relaciones con terceros", scoreLabel: "Contratos al día", score: 0, summary: "Cargando transferencias y remisiones...", indicators: [{ label: "Vigentes", value: "-" }, { label: "Transfer. internac.", value: "-" }, { label: "Vencen pronto", value: "-" }] },
  { module: "OPD / DPO", scoreLabel: "Avance anual", score: 0, summary: "Cargando informes, sesiones y avance...", indicators: [{ label: "Informes", value: "-" }, { label: "Sesiones", value: "-" }, { label: "Temas", value: "-" }] },
  { module: "Sistema de Gestión de Seguridad", scoreLabel: "Cumplimiento", score: 0, summary: "Cargando medidas preventivas...", indicators: [{ label: "Fases", value: "-" }, { label: "Brecha", value: "-" }, { label: "Riesgo medio/alto", value: "-" }] },
  { module: "Derechos ARCO", scoreLabel: "SLA", score: 0, summary: "Cargando derechos ejercidos y SLA...", indicators: [{ label: "Solicitudes", value: "-" }, { label: "Por vencer", value: "-" }, { label: "Resueltas", value: "-" }] },
  { module: "EIPD", scoreLabel: "EIPD concluidas", score: 0, summary: "Cargando riesgo residual de tratamientos...", indicators: [{ label: "Realizadas", value: "-" }, { label: "Riesgo alto", value: "-" }, { label: "Planes", value: "-" }] },
  { module: "Incidentes de Seguridad", scoreLabel: "Contención", score: 0, summary: "Cargando seguimiento de casos...", indicators: [{ label: "Incidentes mes", value: "-" }, { label: "Notificables", value: "-" }, { label: "Críticos", value: "-" }] },
  { module: "Procedimientos", scoreLabel: "Ejecución", score: 0, summary: "Cargando procedimientos LFPDPPP...", indicators: [{ label: "Total", value: "-" }, { label: "En ejecución", value: "-" }, { label: "Con evidencia", value: "-" }] },
  { module: "Capacitación", scoreLabel: "Aprobación", score: 0, summary: "Cargando monitoreo de avance...", indicators: [{ label: "Evaluados", value: "-" }, { label: "Aprobación", value: "-" }, { label: "Áreas críticas", value: "-" }] },
  { module: "Políticas", scoreLabel: "Implementación", score: 0, summary: "Cargando políticas implementadas...", indicators: [{ label: "Políticas", value: "-" }, { label: "Implementadas", value: "-" }, { label: "Pendientes", value: "-" }] },
  { module: "Responsabilidad demostrada", scoreLabel: "Cobertura SGDP", score: 0, summary: "Cargando gobierno, KRIs y evidencias del módulo de accountability...", indicators: [{ label: "Submódulos activos", value: "-" }, { label: "KRIs críticos", value: "-" }, { label: "Vencimientos 90d", value: "-" }] },
]

function readDashboardLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function getDaysUntil(date?: string) {
  if (!date) return null

  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsed.setHours(0, 0, 0, 0)
  return Math.round((parsed.getTime() - today.getTime()) / 86400000)
}

function getAccountabilityReport() {
  const sm01 = readDashboardLocalStorage<Record<string, any> | null>("accountability_v2_sm01", null)
  const sm02 = readDashboardLocalStorage<any[]>("accountability_v2_sm02", [])
  const sm04 = readDashboardLocalStorage<any[]>("accountability_v2_sm04", [])
  const sm05 = readDashboardLocalStorage<any[]>("accountability_v2_sm05", [])
  const sm06 = readDashboardLocalStorage<any[]>("accountability_v2_sm06", [])
  const sm07 = readDashboardLocalStorage<any[]>("accountability_v2_sm07", [])
  const sm08 = readDashboardLocalStorage<any[]>("accountability_v2_sm08", [])
  const sm09 = readDashboardLocalStorage<any[]>("accountability_v2_sm09", [])
  const sm10 = readDashboardLocalStorage<any[]>("accountability_v2_sm10", [])
  const sm13 = readDashboardLocalStorage<any[]>("accountability_v2_sm13", [])

  const coverageChecks = [
    Boolean(sm01?.programName && sm01?.scope && sm01?.objectives),
    sm02.length > 0,
    sm04.length > 0,
    sm05.length > 0,
    sm06.length > 0,
    sm07.length > 0,
    sm08.length > 0,
    sm09.length > 0 || sm10.length > 0,
    sm13.length > 0,
  ]

  const score = Math.round((coverageChecks.filter(Boolean).length / coverageChecks.length) * 100)

  const criticalKris =
    sm09.filter((item) => {
      const severity = String(item?.severity || "").toLowerCase()
      const status = String(item?.status || "").toLowerCase()
      return (severity === "alta" || severity === "critica" || severity === "crítica") && status !== "cerrada"
    }).length +
    sm04.filter((item) => {
      const score = Number(item?.score || 0)
      const status = String(item?.status || "").toLowerCase()
      return score >= 20 && status !== "implementada" && status !== "aceptada"
    }).length +
    sm06.filter((item) => {
      const status = String(item?.status || "").toLowerCase()
      const dueDays = getDaysUntil(item?.dueDate || item?.contractExpiry)
      return status === "activo" && dueDays !== null && dueDays < 0
    }).length

  const dueSoon = [...sm02, ...sm04, ...sm05, ...sm06, ...sm07, ...sm08, ...sm09, ...sm10, ...sm13].filter((item) => {
    const dueDate = item?.expirationDate || item?.dueDate || item?.responseDueDate || item?.plannedDate || item?.reviewDate || item?.renewalDate
    const days = getDaysUntil(dueDate)
    return days !== null && days <= 90
  }).length

  const activeSubmodules = coverageChecks.filter(Boolean).length

  return {
    module: "Responsabilidad demostrada",
    scoreLabel: "Cobertura SGDP",
    score,
    summary: "Estado del tablero ejecutivo, evidencias y seguimiento del programa de accountability.",
    indicators: [
      { label: "Submódulos activos", value: String(activeSubmodules) },
      { label: "KRIs críticos", value: String(criticalKris) },
      { label: "Vencimientos 90d", value: String(dueSoon) },
    ],
  }
}

function getRealModuleReports() {
  if (typeof window === "undefined") return fallbackReports

  const inventories = loadItems("inventories") as any[]
  const notices = loadItems("privacy-notices") as any[]
  const contracts = loadItems("contracts") as any[]
  const dpo = loadItems("dpo") as any[]
  const eipd = loadItems("eipd") as any[]
  const policies = loadItems("policies") as any[]
  const policySnapshot = getPolicyDashboardSnapshot(policies)
  const primaryPolicy = getPrimaryPolicy(policies)
  const trainingSnapshot = getTrainingDashboardSnapshot()
  const incidents = loadItems("incidents") as any[]
  const procedures = loadItems("procedures") as any[]
  const arco = loadItems("arco") as any[]
  const accountability = getAccountabilityReport()

  // Calculate generic realistic data based on lengths to prevent purely empty screens
  return [
    { 
      module: "Inventarios", 
      scoreLabel: "Registros", 
      score: inventories.length > 0 ? 100 : 0, 
      summary: "Completitud general del inventario y nivel de riesgo por registros.", 
      indicators: [
        { label: "Registros", value: inventories.length.toString() }, 
        { label: "Riesgo alto", value: `${Math.round((inventories.filter(i => i.riskLevel === "Alto" || i.riskLevel === "Muy alto").length / Math.max(inventories.length, 1)) * 100)}%` }, 
        { label: "Completos", value: `${Math.round((inventories.filter(i => i.status === "completado").length / Math.max(inventories.length, 1)) * 100)}%` }
      ] 
    },
    { 
      module: "Avisos de Privacidad", 
      scoreLabel: "Registrados", 
      score: notices.length > 0 ? 100 : 0, 
      summary: "Clasificación de avisos y evidencia de puesta a disposición.", 
      indicators: [
        { label: "Avisos activos", value: notices.length.toString() }, 
        { label: "Con evidencias", value: notices.filter(n => n.evidence).length.toString() }, 
        { label: "Nuevos", value: notices.filter(n => new Date(n.uploadDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length.toString() }
      ] 
    },
    { 
      module: "Relaciones con terceros", 
      scoreLabel: "Contratos al día", 
      score: contracts.length > 0 ? 100 : 0, 
      summary: "Seguimiento de transferencias, remisiones y vencimientos contractuales.", 
      indicators: [
        { label: "Contratos", value: contracts.length.toString() }, 
        { label: "Transfer. internac.", value: contracts.filter(c => c.communicationType === "transfer").length.toString() }, 
        { label: "En riesgo", value: contracts.filter(c => c.status === "vencido" || c.status === "en-riesgo").length.toString() }
      ] 
    },
    { module: "OPD / DPO", scoreLabel: "Registros DPO", score: dpo.length > 0 ? 100 : 0, summary: "Actividad de informes, sesiones y avance de reporte anual.", indicators: [{ label: "Informes/Actas", value: dpo.length.toString() }, { label: "Informes", value: dpo.filter(d => d.type === "informe").length.toString() }, { label: "Recientes", value: dpo.filter(d => new Date(d.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length.toString() }] },
    { module: "Derechos ARCO", scoreLabel: "Solicitudes", score: arco.length > 0 ? 100 : 0, summary: "Seguimiento de derechos ejercidos, SLA y solicitudes.", indicators: [{ label: "Solicitudes", value: arco.length.toString() }, { label: "Por vencer", value: arco.filter(a => a.status === "En proceso").length.toString() }, { label: "Resueltas", value: arco.filter(a => a.status === "Finalizada").length.toString() }] },
    { module: "EIPD", scoreLabel: "EIPD registradas", score: eipd.length > 0 ? 100 : 0, summary: "Control de evaluaciones de impacto realizadas.", indicators: [{ label: "Realizadas", value: eipd.length.toString() }, { label: "Concluídas", value: eipd.filter(e => e.status === "Completado").length.toString() }, { label: "Pendientes", value: eipd.filter(e => e.status !== "Completado").length.toString() }] },
    { module: "Incidentes de Seguridad", scoreLabel: "Eventos", score: incidents.length > 0 ? 100 : 0, summary: "Clasificación y seguimiento de casos de incidentes.", indicators: [{ label: "Incidentes totales", value: incidents.length.toString() }, { label: "Críticos", value: incidents.filter(i => i.data?.evaluacionIncidente?.gravedad === "Alta").length.toString() }, { label: "Mitigados", value: incidents.filter(i => i.status === "cerrado").length.toString() }] },
    { module: "Procedimientos", scoreLabel: "Registrados", score: procedures.length > 0 ? 100 : 0, summary: "Estado de procedimientos LFPDPPP con evidencia.", indicators: [{ label: "Total", value: procedures.length.toString() }, { label: "En ejecución", value: procedures.filter(p => p.status === "en-curso").length.toString() }, { label: "Concluidos", value: procedures.filter(p => p.status === "resuelto").length.toString() }] },
    {
      module: "Capacitación",
      scoreLabel: "Avance documental",
      score: trainingSnapshot.score,
      summary: "Monitoreo de programas, recursos cargados y avance de sesiones o constancias.",
      indicators: [
        { label: "Programas", value: trainingSnapshot.programs.toString() },
        { label: "Recursos", value: trainingSnapshot.resources.toString() },
        { label: "Sesiones completas", value: trainingSnapshot.completedSessions.toString() },
      ],
    },
    {
      module: "Políticas",
      scoreLabel: "Avance documental",
      score: policySnapshot.score,
      summary: primaryPolicy
        ? `PGDP ${primaryPolicy.referenceCode} con workflow, evidencia mínima y cobertura reutilizable para ARCO.`
        : "Seguimiento del builder PGDP, expediente, workflow y consumo del documento desde ARCO.",
      indicators: [
        { label: "Registradas", value: policySnapshot.total.toString() },
        { label: "Documentos", value: policySnapshot.documentCount.toString() },
        { label: "Bloqueos workflow", value: policySnapshot.blockedWorkflow.toString() },
      ],
    },
    accountability,
  ]
}

// ─── Role color helpers ──────────────────────────────────────────────────────

function roleBadgeColor(role: UserRole) {
  switch (role) {
    case "admin": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    case "editor": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "viewer": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    case "custom": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    default: return "bg-gray-100 text-gray-600"
  }
}

// ─── Score color ─────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 90) return "bg-emerald-500"
  if (score >= 75) return "bg-blue-500"
  if (score >= 60) return "bg-amber-500"
  return "bg-red-500"
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const [userRole, setUserRoleState] = useState<string | null>(null)

  useEffect(() => {
    setUserRoleState(localStorage.getItem("userRole"))
    initializeDefaultUsers()
    ensureDemoUser() // async, fire-and-forget is fine here (idempotent)
  }, [])

  if (userRole === "admin") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-[1400px]">
        <AdminDashboard language={language} t={t} />
      </div>
    )
  }

  return <UserProgressDashboard />
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function AdminDashboard({ language, t }: { language: "es" | "en"; t: any }) {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [modulePasswords, setModulePasswordsState] = useState<ModulePassword[]>([])
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [moduleReports, setModuleReports] = useState(fallbackReports)
  const [selectedModule, setSelectedModule] = useState(fallbackReports[0].module)
  const [activeTab, setActiveTab] = useState("overview")

  const refreshData = () => {
    setUsers(getUsers())
    setModulePasswordsState(getModulePasswords())
    
    // Replace the fallback mock reports with actual real data from localStorage sources
    const realReports = getRealModuleReports()
    setModuleReports(realReports)
    
  }

  useEffect(() => {
    refreshData()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = filterRole === "all" || u.role === filterRole
      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, filterRole])

  const pendingUsers = users.filter((u) => !u.approved)
  const approvedUsers = users.filter((u) => u.approved)
  const modulesWithPassword = modulePasswords.filter((p) => p.enabled)

  const selectedModuleData = moduleReports.find((r) => r.module === selectedModule) || moduleReports[0]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-[#1b75bc]" />
            Panel de Administración
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona usuarios, permisos y seguridad de la plataforma
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-[#1b75bc] data-[state=active]:text-white">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-[#1b75bc] data-[state=active]:text-white">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-2 data-[state=active]:bg-[#1b75bc] data-[state=active]:text-white">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Contraseñas</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2 data-[state=active]:bg-[#1b75bc] data-[state=active]:text-white">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Aprobaciones</span>
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: Overview ═══ */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-[#1b75bc]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Activos</CardTitle>
                <Users className="h-5 w-5 text-[#1b75bc]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{approvedUsers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{pendingUsers.length} pendientes</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Módulos Activos</CardTitle>
                <Shield className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{ALL_MODULES.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{modulesWithPassword.length} con contraseña</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aprobaciones Pendientes</CardTitle>
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{pendingUsers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">solicitudes por revisar</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Módulos Protegidos</CardTitle>
                <Lock className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{modulesWithPassword.length}</div>
                <p className="text-xs text-muted-foreground mt-1">con contraseña especial</p>
              </CardContent>
            </Card>
          </div>

          {/* Module Reports Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reportes por Módulo</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona un módulo para ver su resumen de cumplimiento y métricas clave.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {moduleReports.map((report) => (
                  <button
                    key={report.module}
                    type="button"
                    onClick={() => setSelectedModule(report.module)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${selectedModule === report.module
                      ? "border-[#1b75bc] bg-[#1b75bc]/10 text-[#1b75bc] dark:border-[#1b75bc] dark:bg-[#1b75bc]/20 dark:text-blue-300 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{report.module}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${scoreColor(report.score)}`}>
                        {report.score}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.scoreLabel}</p>
                  </button>
                ))}
              </div>

              <Card className="bg-slate-50/50 dark:bg-slate-900/30">
                <CardHeader>
                  <CardTitle className="text-lg">{selectedModuleData.module}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedModuleData.summary}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{selectedModuleData.scoreLabel}</span>
                      <span className="font-semibold">{selectedModuleData.score}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <motion.div
                        className={`h-3 rounded-full ${scoreColor(selectedModuleData.score)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedModuleData.score}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {selectedModuleData.indicators.map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800/50">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Download */}
          <Button
            variant="outline"
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2))
              const a = document.createElement("a")
              a.href = dataStr
              a.download = "users_export.json"
              a.click()
            }}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Exportar Usuarios (JSON)
          </Button>
        </TabsContent>

        {/* ═══ TAB 2: User Management ═══ */}
        <TabsContent value="users" className="space-y-6 mt-6">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Visor</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddUser(true)} className="gap-2 bg-[#1b75bc] hover:bg-[#06002e]">
              <UserPlus className="h-4 w-4" />
              Agregar usuario
            </Button>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50/50 dark:bg-slate-900/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Módulos</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          No se encontraron usuarios
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const permCount = Object.values(user.modulePermissions || {}).filter(Boolean).length
                        return (
                          <motion.tr
                            key={user.email}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadgeColor(user.role)}`}>
                                {ROLE_LABELS[user.role]?.es || user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {user.approved ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium">{permCount}/{ALL_MODULES.length}</span>
                              <span className="text-xs text-muted-foreground ml-1">módulos</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedUser(user)}
                                  title="Editar permisos"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => {
                                    if (confirm(`¿Eliminar a ${user.name}?`)) {
                                      deleteUser(user.email)
                                      refreshData()
                                    }
                                  }}
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* User Edit Side Panel */}
          <AnimatePresence>
            {selectedUser && (
              <UserPermissionsPanel
                user={selectedUser}
                language={language}
                onClose={() => { setSelectedUser(null); refreshData() }}
              />
            )}
          </AnimatePresence>

          {/* Add User Dialog */}
          <AddUserDialog
            open={showAddUser}
            onClose={() => { setShowAddUser(false); refreshData() }}
          />
        </TabsContent>

        {/* ═══ TAB 3: Module Passwords ═══ */}
        <TabsContent value="passwords" className="space-y-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Contraseñas de Módulos Especiales</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Activa contraseñas adicionales para módulos sensibles. Los usuarios con acceso deberán ingresar la contraseña al entrar al módulo.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {ALL_MODULES.filter((m) => m.isSpecial).map((mod) => {
              const existing = modulePasswords.find((p) => p.moduleSlug === mod.slug)
              const IconComp = MODULE_ICON_MAP[mod.slug] || Shield
              return (
                <ModulePasswordCard
                  key={mod.slug}
                  module={mod}
                  IconComp={IconComp}
                  existing={existing}
                  language={language}
                  onUpdate={refreshData}
                />
              )
            })}
          </div>
        </TabsContent>

        {/* ═══ TAB 4: Approvals ═══ */}
        <TabsContent value="approvals" className="space-y-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Aprobaciones Pendientes</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Usuarios que se registraron y esperan aprobación para acceder a la plataforma.
            </p>
          </div>
          {pendingUsers.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <ClipboardCheck className="h-12 w-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">No hay solicitudes pendientes</p>
                <p className="text-sm text-muted-foreground mt-1">Todos los usuarios han sido revisados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <Card key={user.email}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Registrado: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          approveUser(user.email)
                          refreshData()
                        }}
                        variant="outline"
                        className="gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <Check className="h-4 w-4" />
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => {
                          rejectUser(user.email)
                          refreshData()
                        }}
                        variant="destructive"
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER PERMISSIONS PANEL (side drawer)
// ═══════════════════════════════════════════════════════════════════════════════

function UserPermissionsPanel({
  user,
  language,
  onClose,
}: {
  user: PlatformUser
  language: "es" | "en"
  onClose: () => void
}) {
  const [role, setRole] = useState<UserRole>(user.role)
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    user.modulePermissions || {}
  )
  const [saving, setSaving] = useState(false)

  const handleRoleChange = (newRole: string) => {
    const r = newRole as UserRole
    setRole(r)
    if (r !== "custom" && r in ROLE_PRESETS) {
      setPermissions({ ...ROLE_PRESETS[r as Exclude<UserRole, "custom">] })
    }
  }

  const handleToggleModule = (slug: string) => {
    setRole("custom")
    setPermissions((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  const handleSave = () => {
    setSaving(true)
    if (role === "custom") {
      updateUserPermissions(user.email, permissions)
    } else {
      setUserRole(user.email, role)
    }
    setTimeout(() => {
      setSaving(false)
      onClose()
    }, 300)
  }

  const enabledCount = Object.values(permissions).filter(Boolean).length

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl border-l z-[60] overflow-y-auto"
    >
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h3 className="font-bold text-lg">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Role Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Rol del usuario</Label>
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">🔴 Administrador — Acceso total</SelectItem>
              <SelectItem value="editor">🔵 Editor — Todos excepto auditoría</SelectItem>
              <SelectItem value="viewer">⚪ Visor — Solo lectura (4 módulos)</SelectItem>
              <SelectItem value="custom">🟡 Personalizado — Selección manual</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {enabledCount}/{ALL_MODULES.length} módulos habilitados
          </p>
        </div>

        {/* Module Toggles Grid */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Permisos por módulo</Label>
          <div className="space-y-1">
            {ALL_MODULES.map((mod) => {
              const IconComp = MODULE_ICON_MAP[mod.slug] || Shield
              const enabled = permissions[mod.slug] ?? false
              return (
                <div
                  key={mod.slug}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    enabled
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                      : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 opacity-60"
                  }`}
                  onClick={() => handleToggleModule(mod.slug)}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`h-4 w-4 ${enabled ? "text-[#1b75bc]" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">
                      {language === "es" ? mod.labelEs : mod.labelEn}
                    </span>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => handleToggleModule(mod.slug)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Save */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 pb-2 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 bg-[#1b75bc] hover:bg-[#06002e]"
          >
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD USER DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("editor")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name || !email || !password) {
      setError("Todos los campos son obligatorios")
      return
    }
    setSaving(true)
    setError("")
    const hashed = await hashPassword(password)
    const success = addUser({
      name,
      email,
      password: hashed,
      role,
      approved: true,
      modulePermissions: role === "custom" ? {} : ROLE_PRESETS[role as Exclude<UserRole, "custom">] || {},
    })
    if (!success) {
      setError("Ya existe un usuario con ese email")
      setSaving(false)
      return
    }
    setSaving(false)
    setName("")
    setEmail("")
    setPassword("")
    setRole("editor")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#1b75bc]" />
            Agregar Nuevo Usuario
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Nombre completo</Label>
            <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-email">Correo electrónico</Label>
            <Input id="add-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-password">Contraseña</Label>
            <div className="relative">
              <Input
                id="add-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Visor</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#1b75bc] hover:bg-[#06002e]">
            {saving ? "Guardando..." : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE PASSWORD CARD
// ═══════════════════════════════════════════════════════════════════════════════

function ModulePasswordCard({
  module: mod,
  IconComp,
  existing,
  language,
  onUpdate,
}: {
  module: typeof ALL_MODULES[0]
  IconComp: any
  existing?: ModulePassword
  language: "es" | "en"
  onUpdate: () => void
}) {
  const [passwordValue, setPasswordValue] = useState(existing?.password || "")
  const [enabled, setEnabled] = useState(existing?.enabled || false)
  const [showPass, setShowPass] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (enabled && passwordValue) {
      await setModulePassword(mod.slug, passwordValue)
    } else if (!enabled) {
      removeModulePassword(mod.slug)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdate()
  }

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    if (!checked) {
      removeModulePassword(mod.slug)
      onUpdate()
    }
  }

  return (
    <Card className={`transition-all ${enabled ? "border-amber-300 dark:border-amber-700 shadow-sm" : ""}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${enabled ? "bg-amber-100 dark:bg-amber-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
              <IconComp className={`h-5 w-5 ${enabled ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium text-sm">{language === "es" ? mod.labelEs : mod.labelEn}</p>
              <p className="text-xs text-muted-foreground">
                {enabled ? "Protegido con contraseña" : "Sin protección adicional"}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPass ? "text" : "password"}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Contraseña del módulo"
                  className="pl-10 pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={!passwordValue}
                size="sm"
                className="w-full gap-2 bg-[#1b75bc] hover:bg-[#06002e]"
              >
                {saved ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {saved ? "Guardado" : "Guardar contraseña"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
