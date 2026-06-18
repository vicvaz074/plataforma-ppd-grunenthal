"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
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
import { ClipboardCheck, FileCheck2, FilePlus2, FolderKanban, ShieldCheck } from "lucide-react"

import {
  ArcoModuleShell,
  MODULE_COLOR_PALETTES,
  ModuleEmptyState,
  ModuleMetricCard,
  ModuleSectionCard,
} from "@/components/arco-module-shell"
import { DPO_META, DPO_NAV } from "@/components/arco-module-config"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { buildAdvancedMetrics } from "@/lib/module-statistics"
import { getFilesByCategory, type StoredFile } from "@/lib/fileStorage"
import { loadDpoSnapshot, type DpoComplianceSnapshot } from "./opd-compliance-model"

type DpoReportRecord = {
  id: string
  title?: string
  type?: string
  date?: string
  createdAt?: string
}

type DpoActaRecord = {
  id: string
  title?: string
  fecha?: string
  updatedAt?: string
}

const COLORS = MODULE_COLOR_PALETTES.dpo

function formatDate(value?: string) {
  if (!value) return "Sin fecha"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function DPOPage() {
  const [compliance, setCompliance] = useState<DpoComplianceSnapshot | null>(null)
  const [reports, setReports] = useState<DpoReportRecord[]>([])
  const [actas, setActas] = useState<DpoActaRecord[]>([])
  const [evidenceFiles, setEvidenceFiles] = useState<StoredFile[]>([])

  useEffect(() => {
    const refresh = () => {
      setCompliance(loadDpoSnapshot())

      try {
        setReports(JSON.parse(localStorage.getItem("dpo-reports") || "[]"))
      } catch {
        setReports([])
      }

      try {
        setActas(JSON.parse(localStorage.getItem("dpo-actas") || "[]"))
      } catch {
        setActas([])
      }

      setEvidenceFiles(getFilesByCategory("dpo-compliance"))
    }

    refresh()
    window.addEventListener("storage", refresh)
    return () => window.removeEventListener("storage", refresh)
  }, [])

  const reportItems = useMemo(() => [...reports, ...actas], [actas, reports])
  const metrics = useMemo(() => buildAdvancedMetrics("dpo", reportItems), [reportItems])

  const overview = useMemo(() => {
    const documentMix = [
      { name: "Informes", value: reports.length },
      { name: "Actas", value: actas.length },
      { name: "Proyectos", value: compliance?.projectStats?.total || 0 },
      { name: "Evidencias", value: evidenceFiles.length },
    ]

    const operationMix = [
      { name: "Acreditación", value: compliance?.latestAccreditation ? 1 : 0 },
      { name: "Funcional", value: compliance?.latestFunctional ? 1 : 0 },
      { name: "Pendientes", value: compliance?.projectStats?.pendingDictamen || 0 },
      { name: "EIPD obligatoria", value: compliance?.projectStats?.eipdRequired || 0 },
    ]

    const recent = [
      ...reports.map((item) => ({
        id: item.id,
        title: item.title || "Informe sin título",
        type: item.type || "Informe",
        date: item.date || item.createdAt || "",
      })),
      ...actas.map((item) => ({
        id: item.id,
        title: item.title || "Acta sin título",
        type: "Acta",
        date: item.updatedAt || item.fecha || "",
      })),
    ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())

    return {
      hasDesignatedOfficer: compliance?.hasDPO === "si",
      officerName: compliance?.dpoName || "Pendiente",
      nextReview: compliance?.plannedNextReview || "",
      documentMix,
      operationMix,
      accreditation: compliance?.latestAccreditation || null,
      functional: compliance?.latestFunctional || null,
      projectStats: compliance?.projectStats || {
        total: 0,
        pendingDictamen: 0,
        eipdRequired: 0,
        eipdRecommended: 0,
      },
      evidenceCount: compliance?.evidenceCount || evidenceFiles.length,
      recent: recent.slice(0, 5),
    }
  }, [actas, compliance, evidenceFiles.length, reports])

  const navItems = useMemo(
    () =>
      DPO_NAV.map((item) => {
        if (item.href === "/dpo/compliance") return { ...item, badge: evidenceFiles.length }
        if (item.href === "/dpo/reports") return { ...item, badge: reports.length + actas.length }
        return item
      }),
    [actas.length, evidenceFiles.length, reports.length],
  )

  return (
    <ArcoModuleShell
      moduleLabel={DPO_META.moduleLabel}
      moduleTitle={DPO_META.moduleTitle}
      moduleDescription={DPO_META.moduleDescription}
      pageLabel="Overview"
      pageTitle="Estado operativo del Departamento de Datos Personales"
      pageDescription="Resumen de designación, evaluación funcional y proyectos del Departamento de Datos Personales."
      navItems={navItems}
      headerBadges={[
        {
          label: overview.accreditation
            ? `Acreditación ${overview.accreditation.score}%`
            : "Acreditación pendiente",
          tone: overview.accreditation
            ? overview.accreditation.criticalInvalidation
              ? "critical"
              : "positive"
            : "warning",
        },
        {
          label: overview.functional
            ? `Evaluación funcional ${overview.functional.score}%`
            : "Evaluación funcional pendiente",
          tone: overview.functional ? "primary" : "warning",
        },
        {
          label: `${overview.projectStats.total} proyectos del departamento`,
          tone: overview.projectStats.pendingDictamen > 0 ? "warning" : "neutral",
        },
        { label: `${reports.length + actas.length} piezas documentales`, tone: "neutral" },
      ]}
      actions={
        <Button asChild>
          <Link href="/dpo/compliance">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Cumplimiento
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleMetricCard
            label="Acreditación"
            value={overview.accreditation ? `${overview.accreditation.score}%` : "Pendiente"}
            helper={
              overview.accreditation
                ? `${overview.accreditation.level}${overview.accreditation.criticalInvalidation ? " · Bloqueo crítico" : ""}`
                : `Responsable actual: ${overview.officerName}.`
            }
            icon={ClipboardCheck}
            tone={
              overview.accreditation
                ? overview.accreditation.criticalInvalidation
                  ? "critical"
                  : "positive"
                : "warning"
            }
          />
          <ModuleMetricCard
            label="Evaluación funcional"
            value={overview.functional ? `${overview.functional.score}%` : "Pendiente"}
            helper={
              overview.functional
                ? `${overview.functional.level} · Próxima revisión ${formatDate(overview.nextReview)}`
                : "Completa la revisión F1-F5 para medir el ejercicio efectivo del Departamento de Datos Personales."
            }
            icon={ShieldCheck}
            tone={overview.functional ? "primary" : "warning"}
          />
          <ModuleMetricCard
            label="Proyectos del departamento"
            value={overview.projectStats.total}
            helper={`${overview.projectStats.pendingDictamen} pendientes · ${overview.projectStats.eipdRequired} con EIPD obligatoria`}
            icon={FolderKanban}
            tone={overview.projectStats.pendingDictamen > 0 ? "warning" : "primary"}
          />
          <ModuleMetricCard
            label="Evidencias"
            value={overview.evidenceCount}
            helper={`${reports.length} informes · ${actas.length} actas · Próxima revisión ${formatDate(overview.nextReview)}`}
            icon={FileCheck2}
            tone={overview.evidenceCount > 0 ? "neutral" : "warning"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <ModuleSectionCard
            title="Producción documental y carga operativa"
            description="Distribución entre informes, actas, proyectos y evidencias dentro del programa."
          >
            {metrics.buckets.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.buckets} margin={{ top: 8, right: 8, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {metrics.buckets.map((entry, index) => (
                        <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ModuleEmptyState
                title="Sin informes todavía"
                description="Cuando se generen informes o actas, el overview mostrará aquí su distribución."
              />
            )}
          </ModuleSectionCard>

          <ModuleSectionCard
            title="Estado actual del Departamento de Datos Personales"
            description="Presencia de acreditación, evaluación funcional, pendientes de dictamen y proyectos con EIPD obligatoria."
          >
            {overview.operationMix.some((item) => item.value > 0) ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overview.operationMix} dataKey="value" nameKey="name" innerRadius={62} outerRadius={108}>
                      {overview.operationMix.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ModuleEmptyState
                title="Sin evaluación operativa todavía"
                description="Guarda la designación, la evaluación funcional o el primer proyecto del departamento para poblar este tablero."
              />
            )}
          </ModuleSectionCard>
        </div>

        <ModuleSectionCard
          title="Actividad reciente"
          description="Últimos informes y actas guardados en el módulo."
          action={
            <Button asChild variant="outline">
              <Link href="/dpo/reports">Gestionar documentos</Link>
            </Button>
          }
        >
          {overview.recent.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-950">{item.title}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{formatDate(item.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <ModuleEmptyState
              title="Sin actividad reciente"
              description="Los informes y actas guardados aparecerán aquí automáticamente."
            />
          )}
        </ModuleSectionCard>
      </div>
    </ArcoModuleShell>
  )
}
