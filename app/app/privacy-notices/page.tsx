"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, FileCheck2, FilePlus2, Files, ShieldCheck } from "lucide-react"

import {
  ArcoModuleShell,
  MODULE_COLOR_PALETTES,
  ModuleEmptyState,
  ModuleMetricCard,
  ModuleSectionCard,
} from "@/components/arco-module-shell"
import {
  PRIVACY_NOTICES_META,
  PRIVACY_NOTICES_NAV,
} from "@/components/arco-module-config"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { buildAdvancedMetrics } from "@/lib/module-statistics"
import { getFilesByCategory, type StoredFile } from "@/lib/fileStorage"

const COLORS = MODULE_COLOR_PALETTES.privacy

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

function getNoticeName(notice: StoredFile) {
  return notice.metadata.noticeName || notice.metadata.title || notice.name
}

export default function PrivacyNoticesLandingPage() {
  const [notices, setNotices] = useState<StoredFile[]>([])

  useEffect(() => {
    const refresh = () => setNotices(getFilesByCategory("privacy-notice"))
    refresh()
    window.addEventListener("storage", refresh)
    return () => window.removeEventListener("storage", refresh)
  }, [])

  const metrics = useMemo(() => buildAdvancedMetrics("privacy-notices", notices), [notices])

  const overview = useMemo(() => {
    let withEvidence = 0
    let withVersion = 0

    notices.forEach((notice) => {
      const evidence = notice.metadata.evidenceFiles
      if ((Array.isArray(evidence) && evidence.length > 0) || notice.metadata.evidenceNotes) {
        withEvidence += 1
      }
      if (notice.metadata.versionCode) {
        withVersion += 1
      }
    })

    const sorted = [...notices].sort((left, right) => {
      const leftTime = new Date(String(left.metadata.updatedAt || left.metadata.createdAt || left.uploadDate)).getTime()
      const rightTime = new Date(String(right.metadata.updatedAt || right.metadata.createdAt || right.uploadDate)).getTime()
      return rightTime - leftTime
    })

    return {
      withEvidence,
      withVersion,
      coverage: notices.length > 0 ? Math.round((withEvidence / notices.length) * 100) : 0,
      topType: metrics.buckets[0]?.label || "Sin tipología dominante",
      recent: sorted.slice(0, 5),
      evidenceBreakdown: [
        { name: "Con evidencia", value: withEvidence },
        { name: "Sin evidencia", value: Math.max(notices.length - withEvidence, 0) },
      ],
    }
  }, [metrics.buckets, notices])

  const navItems = useMemo(
    () =>
      PRIVACY_NOTICES_NAV.map((item) => {
        if (item.href === "/privacy-notices/registrados") return { ...item, badge: notices.length }
        if (item.href === "/privacy-notices/reportes") return { ...item, badge: metrics.buckets.length }
        return item
      }),
    [metrics.buckets.length, notices.length],
  )

  return (
    <ArcoModuleShell
      moduleLabel={PRIVACY_NOTICES_META.moduleLabel}
      moduleTitle={PRIVACY_NOTICES_META.moduleTitle}
      moduleDescription={PRIVACY_NOTICES_META.moduleDescription}
      pageLabel="Overview"
      pageTitle="Panorama operativo de avisos"
      pageDescription="Consulta cobertura, evidencia y estado general del módulo."
      navItems={navItems}
      headerBadges={[
        { label: `${notices.length} registros`, tone: "neutral" },
        { label: `${overview.coverage}% con evidencia`, tone: overview.coverage >= 70 ? "positive" : "warning" },
      ]}
      actions={
        <Button asChild>
          <Link href="/privacy-notices/registro">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Registrar aviso
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleMetricCard
            label="Avisos registrados"
            value={notices.length}
            helper="Inventario total de avisos cargados y disponibles para consulta."
            icon={Files}
            tone="primary"
          />
          <ModuleMetricCard
            label="Con evidencia"
            value={overview.withEvidence}
            helper="Avisos con respaldo documental o nota de puesta a disposición."
            icon={ShieldCheck}
            tone="positive"
          />
          <ModuleMetricCard
            label="Con versión"
            value={overview.withVersion}
            helper="Registros con código o versión identificable para trazabilidad."
            icon={FileCheck2}
            tone="primary"
          />
          <ModuleMetricCard
            label="Tipología dominante"
            value={overview.topType}
            helper="Clasificación más frecuente entre los avisos actualmente registrados."
            icon={BarChart3}
            tone="warning"
          />
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ModuleSectionCard
            title="Tipologías con mayor presencia"
            description="Distribución real a partir de los tipos de aviso capturados en la plataforma."
            className="min-w-0 overflow-hidden"
          >
            {metrics.buckets.length > 0 ? (
              <div className="h-[320px] min-w-0 overflow-hidden">
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
                title="Sin avisos todavía"
                description="Registra el primer aviso para activar el tablero del módulo."
                action={
                  <Button asChild>
                    <Link href="/privacy-notices/registro">Crear aviso</Link>
                  </Button>
                }
              />
            )}
          </ModuleSectionCard>

          <ModuleSectionCard
            title="Cobertura documental"
            description="Relación entre registros con evidencia asociada y expedientes pendientes de robustecer."
            className="min-w-0 overflow-hidden"
          >
            {notices.length > 0 ? (
              <div className="h-[320px] min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overview.evidenceBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={108}>
                      {overview.evidenceBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ModuleEmptyState
                title="Sin datos de cobertura"
                description="La cobertura documental aparecerá cuando existan avisos guardados."
              />
            )}
          </ModuleSectionCard>
        </div>

        <ModuleSectionCard
          title="Avisos recientes"
          description="Últimos registros o actualizaciones dentro del módulo."
          action={
            <Button asChild variant="outline">
              <Link href="/privacy-notices/reportes">Abrir reportes</Link>
            </Button>
          }
        >
          {overview.recent.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Aviso</TableHead>
                    <TableHead>Tipología</TableHead>
                    <TableHead>Versión</TableHead>
                    <TableHead>Actualización</TableHead>
                    <TableHead>Evidencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recent.map((notice) => {
                    const noticeTypes = Array.isArray(notice.metadata.noticeTypes) ? notice.metadata.noticeTypes : []
                    const evidence = notice.metadata.evidenceFiles
                    const hasEvidence =
                      (Array.isArray(evidence) && evidence.length > 0) || Boolean(notice.metadata.evidenceNotes)

                    return (
                      <TableRow key={notice.id}>
                        <TableCell className="font-medium text-slate-950">{getNoticeName(notice)}</TableCell>
                        <TableCell>{noticeTypes[0] || notice.metadata.noticeTypeOther || "Sin tipología"}</TableCell>
                        <TableCell>{notice.metadata.versionCode || "Sin versión"}</TableCell>
                        <TableCell>{formatDate(notice.metadata.updatedAt || notice.metadata.createdAt || notice.uploadDate)}</TableCell>
                        <TableCell>{hasEvidence ? "Sí" : "Pendiente"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <ModuleEmptyState
              title="Aún no hay avisos"
              description="Empieza registrando el primer aviso y el overview mostrará aquí las actualizaciones más recientes."
            />
          )}
        </ModuleSectionCard>
      </div>
    </ArcoModuleShell>
  )
}
