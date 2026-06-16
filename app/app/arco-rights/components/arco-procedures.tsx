"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"

import { FilePreviewDialog } from "@/components/file-preview-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ensureBrowserStorageEvents } from "@/lib/browser-storage-events"
import { canOfferFilePreview } from "@/lib/file-preview"
import { createFileURL, deleteFile, getFileById, saveFile, type StoredFile } from "@/lib/fileStorage"
import { GRUNENTHAL_DOCUMENT_MANIFEST } from "@/lib/grunenthal-assets"
import {
  getPolicyStatusLabel,
  getPublishedPoliciesForModule,
  loadPolicyRecords,
  policyHasMinimumEvidence,
  type PolicyRecord,
} from "@/lib/policy-governance"
import {
  ARCO_SUPPLEMENTAL_EVIDENCE_CATEGORY,
  buildArcoSupplementalEvidence,
  loadArcoProcedurePolicyState,
  persistArcoProcedurePolicyState,
  type ArcoProcedurePolicyState,
} from "../utils/arco-procedure-policy"
import { ArcoTimelines } from "./arco-timelines"

const ARCO_TEMPLATE_ASSET_ID = "grunenthal-arco-rights-matriz-de-control-y-seguimiento-del-ejercicio-de-derechos-arco"
const ARCO_TEMPLATE_STORED_FILE_ID = `grunenthal-file-${ARCO_TEMPLATE_ASSET_ID}`
const ARCO_TEMPLATE_ASSET = GRUNENTHAL_DOCUMENT_MANIFEST.find((asset) => asset.id === ARCO_TEMPLATE_ASSET_ID)

function getActor() {
  if (typeof window === "undefined") return "Sistema"
  return window.localStorage.getItem("userName")?.trim() || "Sistema"
}

function buildArcoTemplateFallbackFile(): StoredFile | null {
  if (!ARCO_TEMPLATE_ASSET) return null

  return {
    id: ARCO_TEMPLATE_STORED_FILE_ID,
    name: ARCO_TEMPLATE_ASSET.name,
    type: ARCO_TEMPLATE_ASSET.type,
    size: ARCO_TEMPLATE_ASSET.size,
    content: ARCO_TEMPLATE_ASSET.path,
    uploadDate: "2026-01-01T00:00:00.000Z",
    category: ARCO_TEMPLATE_ASSET.category,
    metadata: {
      title: ARCO_TEMPLATE_ASSET.displayName,
      module: ARCO_TEMPLATE_ASSET.module,
      publicPath: ARCO_TEMPLATE_ASSET.path,
      sourceRelativePath: ARCO_TEMPLATE_ASSET.sourceRelativePath,
      previewPdfPath: ARCO_TEMPLATE_ASSET.path.replace(/\.xlsx$/i, "-preview.pdf"),
      previewMimeType: "application/pdf",
      isTemplate: true,
      templateModule: "arco-rights",
      templateLabel: "Plantilla operativa ARCO",
      createdBy: "Admin",
    },
  }
}

function resolveArcoTemplateFile() {
  if (typeof window !== "undefined") {
    const stored = getFileById(ARCO_TEMPLATE_STORED_FILE_ID)
    if (stored) return stored
  }

  return buildArcoTemplateFallbackFile()
}

function canPreviewStoredFile(file: StoredFile | null) {
  if (!file) return false
  try {
    return canOfferFilePreview(file)
  } catch {
    return false
  }
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

function getCurrentVersionId(record: PolicyRecord) {
  return record.versions.at(-1)?.id || null
}

function getCurrentVersionLabel(record: PolicyRecord) {
  return record.versions.at(-1)?.versionLabel || record.versionLabel
}

function badgeToneClasses(tone: "green" | "amber" | "red" | "slate") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "red") return "border-red-200 bg-red-50 text-red-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function getLinkHealth(state: ArcoProcedurePolicyState, policy: PolicyRecord | null) {
  if (!state.linkedPolicyId) {
    return {
      tone: "slate" as const,
      label: "Sin vínculo",
      description: "ARCO todavía no consume una PGDP publicada desde Políticas de Protección de Datos.",
    }
  }

  if (!policy) {
    return {
      tone: "red" as const,
      label: "Referencia inválida",
      description: "La política vinculada ya no existe en el módulo de Políticas o fue eliminada.",
    }
  }

  if (policy.status !== "PUBLISHED") {
    return {
      tone: "red" as const,
      label: "No vigente",
      description: `La política vinculada dejó de estar publicada. Estado actual: ${getPolicyStatusLabel(policy.status)}.`,
    }
  }

  const arcoCoverage = policy.linkedModules.some((linked) => linked.moduleId === "arco-rights" && linked.active)
  if (!arcoCoverage) {
    return {
      tone: "amber" as const,
      label: "Cobertura incompleta",
      description: "La PGDP vinculada ya no cubre ARCO con la suficiencia documental esperada.",
    }
  }

  const expiryDays = diffDays(policy.expiryDate)
  if (expiryDays !== null && expiryDays < 0) {
    return {
      tone: "red" as const,
      label: "Vencida",
      description: "La política vinculada rebasó su fecha de vigencia y requiere actualización inmediata.",
    }
  }

  if (expiryDays !== null && expiryDays <= 30) {
    return {
      tone: "amber" as const,
      label: "Por vencer",
      description: `La vigencia de la política vinculada vence en ${expiryDays} día(s).`,
    }
  }

  const currentVersionId = getCurrentVersionId(policy)
  if (state.linkedVersionId && currentVersionId && state.linkedVersionId !== currentVersionId) {
    return {
      tone: "amber" as const,
      label: "Versión rezagada",
      description: "Existe una versión publicada más reciente de la PGDP y conviene revalidar el vínculo de ARCO.",
    }
  }

  return {
    tone: "green" as const,
    label: "Vínculo vigente",
    description: "ARCO está referenciado a una PGDP publicada, vigente y con cobertura explícita para derechos ARCO.",
  }
}

export function ArcoProcedures() {
  const { toast } = useToast()

  const [policies, setPolicies] = useState<PolicyRecord[]>([])
  const [state, setState] = useState<ArcoProcedurePolicyState>(() => loadArcoProcedurePolicyState())
  const [selectedPolicyId, setSelectedPolicyId] = useState("")
  const [notes, setNotes] = useState("")
  const [evidenceTitle, setEvidenceTitle] = useState("")
  const [evidenceDescription, setEvidenceDescription] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [previewTemplateFile, setPreviewTemplateFile] = useState<StoredFile | null>(null)
  const [savingLink, setSavingLink] = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)

  useEffect(() => {
    ensureBrowserStorageEvents()

    const refresh = () => {
      const nextPolicies = loadPolicyRecords()
      const nextState = loadArcoProcedurePolicyState()
      setPolicies(nextPolicies)
      setState(nextState)
      setNotes(nextState.notes)
      setSelectedPolicyId((current) => current || nextState.linkedPolicyId || "")
    }

    refresh()
    window.addEventListener("storage", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [])

  const publishedArcoPolicies = useMemo(
    () => getPublishedPoliciesForModule(policies, "arco-rights"),
    [policies],
  )

  const linkedPolicy = useMemo(
    () => policies.find((policy) => policy.id === state.linkedPolicyId) || null,
    [policies, state.linkedPolicyId],
  )

  const candidatePolicy = useMemo(
    () => publishedArcoPolicies.find((policy) => policy.id === selectedPolicyId) || null,
    [publishedArcoPolicies, selectedPolicyId],
  )

  const linkHealth = useMemo(() => getLinkHealth(state, linkedPolicy), [linkedPolicy, state])
  const linkedPolicyHasEvidence = linkedPolicy ? policyHasMinimumEvidence(linkedPolicy) : false
  const arcoTemplateFile = resolveArcoTemplateFile()
  const canPreviewArcoTemplate = canPreviewStoredFile(arcoTemplateFile)

  useEffect(() => {
    if (publishedArcoPolicies.length === 0) {
      if (selectedPolicyId) setSelectedPolicyId("")
      return
    }

    const preferredId =
      publishedArcoPolicies.some((policy) => policy.id === state.linkedPolicyId)
        ? state.linkedPolicyId
        : publishedArcoPolicies[0]?.id

    if (!selectedPolicyId || !publishedArcoPolicies.some((policy) => policy.id === selectedPolicyId)) {
      setSelectedPolicyId(preferredId || "")
    }
  }, [publishedArcoPolicies, selectedPolicyId, state.linkedPolicyId])

  const handleLinkPolicy = () => {
    if (!candidatePolicy) {
      toast({
        title: "Seleccione una política",
        description: "ARCO solo puede vincularse con una PGDP publicada y con cobertura activa para este módulo.",
        variant: "destructive",
      })
      return
    }

    setSavingLink(true)
    try {
      const nextState: ArcoProcedurePolicyState = {
        ...state,
        linkedPolicyId: candidatePolicy.id,
        linkedVersionId: getCurrentVersionId(candidatePolicy),
        linkedReferenceCode: candidatePolicy.referenceCode,
        linkedTitle: candidatePolicy.title,
        linkedVersionLabel: getCurrentVersionLabel(candidatePolicy),
        linkedAt: new Date().toISOString(),
        linkedBy: getActor(),
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      }

      persistArcoProcedurePolicyState(nextState)
      setState(nextState)
      toast({
        title: "Política vinculada",
        description: `ARCO ahora reutiliza la política ${candidatePolicy.referenceCode} sin duplicar su archivo.`,
      })
    } finally {
      setSavingLink(false)
    }
  }

  const handleUnlinkPolicy = () => {
    const nextState: ArcoProcedurePolicyState = {
      ...state,
      linkedPolicyId: null,
      linkedVersionId: null,
      linkedReferenceCode: "",
      linkedTitle: "",
      linkedVersionLabel: "",
      linkedAt: undefined,
      linkedBy: undefined,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    }

    persistArcoProcedurePolicyState(nextState)
    setState(nextState)
    toast({
      title: "Vínculo retirado",
      description: "El procedimiento ARCO dejó de referenciar una PGDP concreta. La evidencia suplementaria se conserva.",
    })
  }

  const handleUploadEvidence = async () => {
    if (!state.linkedPolicyId) {
      toast({
        title: "Vincule primero una política",
        description: "La evidencia suplementaria debe quedar asociada a una PGDP vigente.",
        variant: "destructive",
      })
      return
    }

    if (!evidenceFile || !evidenceTitle.trim()) {
      toast({
        title: "Falta información",
        description: "Capture un título y seleccione un archivo para registrar la evidencia suplementaria.",
        variant: "destructive",
      })
      return
    }

    setUploadingEvidence(true)
    try {
      const stored = await saveFile(
        evidenceFile,
        {
          moduleId: "arco-rights",
          linkedPolicyId: state.linkedPolicyId,
          linkedVersionId: state.linkedVersionId,
          title: evidenceTitle.trim(),
          description: evidenceDescription.trim(),
        },
        ARCO_SUPPLEMENTAL_EVIDENCE_CATEGORY,
      )

      const evidence = buildArcoSupplementalEvidence({
        title: evidenceTitle.trim(),
        description: evidenceDescription.trim(),
        fileId: stored.id,
        fileName: stored.name,
        createdBy: getActor(),
      })

      const nextState: ArcoProcedurePolicyState = {
        ...state,
        notes: notes.trim(),
        supplementaryEvidence: [evidence, ...state.supplementaryEvidence],
        updatedAt: new Date().toISOString(),
      }

      persistArcoProcedurePolicyState(nextState)
      setState(nextState)
      setEvidenceTitle("")
      setEvidenceDescription("")
      setEvidenceFile(null)
      toast({
        title: "Evidencia registrada",
        description: "La evidencia suplementaria quedó guardada en el expediente operativo de ARCO.",
      })
    } catch (error) {
      console.error("Error al guardar evidencia ARCO:", error)
      toast({
        title: "No se pudo guardar la evidencia",
        description: "Revise el archivo e intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleDeleteEvidence = (evidenceId: string) => {
    const target = state.supplementaryEvidence.find((entry) => entry.id === evidenceId)
    if (!target) return

    deleteFile(target.fileId)

    const nextState: ArcoProcedurePolicyState = {
      ...state,
      supplementaryEvidence: state.supplementaryEvidence.filter((entry) => entry.id !== evidenceId),
      updatedAt: new Date().toISOString(),
    }

    persistArcoProcedurePolicyState(nextState)
    setState(nextState)
    toast({
      title: "Evidencia eliminada",
      description: "El expediente suplementario de ARCO se actualizó correctamente.",
    })
  }

  const openEvidence = (fileId: string) => {
    const file = getFileById(fileId)
    if (!file) {
      toast({
        title: "Archivo no encontrado",
        description: "La referencia del archivo ya no existe en almacenamiento local.",
        variant: "destructive",
      })
      return
    }

    window.open(createFileURL(file.content), "_blank", "noopener,noreferrer")
  }

  const downloadTemplate = () => {
    if (!arcoTemplateFile) {
      toast({
        title: "Plantilla no disponible",
        description: "No se encontró la matriz de control ARCO en la biblioteca del cliente.",
        variant: "destructive",
      })
      return
    }

    const link = document.createElement("a")
    link.href = createFileURL(arcoTemplateFile.content)
    link.download = arcoTemplateFile.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="rounded-[28px] border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Link2 className="h-5 w-5 text-primary" />
                  Política de referencia para ARCO
                </CardTitle>
                <CardDescription className="mt-1">
                  ARCO consume la PGDP publicada desde Políticas de Protección de Datos y evita volver a subir el mismo documento.
                </CardDescription>
              </div>
              <Badge variant="outline" className={badgeToneClasses(linkHealth.tone)}>
                {linkHealth.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={`rounded-3xl border px-4 py-4 ${badgeToneClasses(linkHealth.tone)}`}>
              <div className="flex items-start gap-3">
                {linkHealth.tone === "green" ? (
                  <ShieldCheck className="mt-0.5 h-5 w-5" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-5 w-5" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{linkHealth.label}</p>
                  <p className="text-sm leading-6">{linkHealth.description}</p>
                </div>
              </div>
            </div>

            {publishedArcoPolicies.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                <p className="font-medium text-slate-900">No hay una PGDP publicada con cobertura ARCO.</p>
                <p className="mt-2">
                  Complete y publique la sección ARCO dentro de <strong>Políticas de Protección de Datos</strong> para habilitar la referencia compartida.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/data-policies/registro">Ir al builder PGDP</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/data-policies/consulta">Revisar expediente</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-[1fr,auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="arco-policy-selector">Política publicada</Label>
                    <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                      <SelectTrigger id="arco-policy-selector" className="rounded-2xl">
                        <SelectValue placeholder="Seleccione una PGDP publicada" />
                      </SelectTrigger>
                      <SelectContent>
                        {publishedArcoPolicies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id}>
                            {policy.referenceCode} · {policy.title} · {getCurrentVersionLabel(policy)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleLinkPolicy}
                    disabled={!candidatePolicy || savingLink}
                    className="rounded-2xl"
                  >
                    {savingLink ? "Guardando..." : "Vincular política"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arco-policy-notes">Notas de procedimiento</Label>
                  <Textarea
                    id="arco-policy-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Explique cómo ARCO reutiliza la PGDP y qué controles operativos se mantienen aparte."
                    className="min-h-[112px] rounded-2xl"
                  />
                </div>
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Política vinculada</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {linkedPolicy?.referenceCode || state.linkedReferenceCode || "Sin selección"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {linkedPolicy?.title || state.linkedTitle || "Seleccione una política publicada desde el módulo de Políticas."}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Expediente suplementario</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{state.supplementaryEvidence.length}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Evidencias propias del procedimiento ARCO, sin replicar el archivo maestro de la política.
                </p>
              </div>
            </div>

            {(linkedPolicy || state.linkedPolicyId) && (
              <div className="rounded-3xl border border-slate-200 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                    {linkedPolicy ? getPolicyStatusLabel(linkedPolicy.status) : "Referencia histórica"}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                    Versión {linkedPolicy ? getCurrentVersionLabel(linkedPolicy) : state.linkedVersionLabel || "N/D"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={linkedPolicyHasEvidence ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}
                  >
                    {linkedPolicyHasEvidence ? "Expediente mínimo cubierto" : "Expediente mínimo pendiente"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Vigencia</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(linkedPolicy?.effectiveDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Vence</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(linkedPolicy?.expiryDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Vinculada por</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{state.linkedBy || "Pendiente"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Última actualización</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(state.updatedAt)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {linkedPolicy && (
                    <Button asChild variant="outline" className="rounded-2xl">
                      <Link href={`/data-policies/consulta?policy=${linkedPolicy.id}`}>
                        Abrir expediente PGDP
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" className="rounded-2xl" onClick={handleUnlinkPolicy}>
                    Retirar vínculo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[28px] border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <FileSpreadsheet className="h-5 w-5 text-[#0a4abf]" />
                Plantilla operativa ARCO
              </CardTitle>
              <CardDescription>
                Matriz de control y seguimiento para registrar solicitudes ARCO, listado de exclusión y quejas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-blue-100 bg-white/80 px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700" variant="outline">XLSX</Badge>
                  <Badge className="border-slate-200 bg-slate-50 text-slate-700" variant="outline">Editable</Badge>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">
                  Matriz de Control y seguimiento del Ejercicio de Derechos ARCO
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Úsala como template oficial para el seguimiento operativo. La previsualización es PDF para consulta; la descarga conserva el Excel original.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {arcoTemplateFile && canPreviewArcoTemplate ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl bg-white"
                    onClick={() => setPreviewTemplateFile(arcoTemplateFile)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Observar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="rounded-2xl"
                  disabled={!arcoTemplateFile}
                  onClick={downloadTemplate}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar plantilla
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-primary" />
                Evidencia suplementaria
              </CardTitle>
              <CardDescription>
                Solo registre soporte operativo específico de ARCO, por ejemplo constancias de difusión, guías internas o instructivos propios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="arco-evidence-title">Título</Label>
                <Input
                  id="arco-evidence-title"
                  value={evidenceTitle}
                  onChange={(event) => setEvidenceTitle(event.target.value)}
                  placeholder="Ej. Instructivo interno para atención de rectificación"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arco-evidence-description">Descripción</Label>
                <Textarea
                  id="arco-evidence-description"
                  value={evidenceDescription}
                  onChange={(event) => setEvidenceDescription(event.target.value)}
                  placeholder="Detalle qué cubre esta evidencia y cómo complementa la PGDP."
                  className="min-h-[96px] rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arco-evidence-file">Archivo</Label>
                <Input
                  id="arco-evidence-file"
                  type="file"
                  className="rounded-2xl"
                  onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
                />
              </div>

              <Button
                onClick={handleUploadEvidence}
                disabled={uploadingEvidence || !state.linkedPolicyId}
                className="w-full rounded-2xl"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingEvidence ? "Guardando..." : "Registrar evidencia suplementaria"}
              </Button>

              <div className="space-y-3">
                {state.supplementaryEvidence.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                    La evidencia suplementaria aparecerá aquí. No se replica la PGDP; solo se conserva soporte adicional del procedimiento ARCO.
                  </div>
                ) : (
                  state.supplementaryEvidence.map((evidence) => (
                    <div key={evidence.id} className="rounded-3xl border border-slate-200 px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{evidence.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{evidence.description || "Sin descripción adicional."}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {evidence.fileName} · {evidence.createdBy} · {formatDateLabel(evidence.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEvidence(evidence.fileId)}>
                            Abrir
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteEvidence(evidence.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[28px] border-slate-200">
        <CardHeader>
          <CardTitle>Procedimientos ARCO</CardTitle>
          <CardDescription>
            Consulta los hitos operativos y los plazos legales aplicables al ciclo de atención de derechos ARCO.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ArcoTimelines />
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-slate-200">
        <CardHeader>
          <CardTitle>Control de integración</CardTitle>
          <CardDescription>
            La política se centraliza en el módulo de Políticas y ARCO solo conserva vínculos y evidencias propias del procedimiento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold">Sin duplicidad documental</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              ARCO referencia la PGDP vigente y evita tener copias paralelas del mismo archivo.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Expediente operativo separado</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Las constancias propias del trámite ARCO se almacenan aparte y conservan trazabilidad local.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold">Revalidación obligatoria</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Si la PGDP deja de estar publicada o su cobertura ARCO se degrada, este panel lo marca de inmediato.
            </p>
          </div>
        </CardContent>
      </Card>
      <FilePreviewDialog
        file={previewTemplateFile}
        open={Boolean(previewTemplateFile)}
        onOpenChange={(open) => {
          if (!open) setPreviewTemplateFile(null)
        }}
      />
    </div>
  )
}
