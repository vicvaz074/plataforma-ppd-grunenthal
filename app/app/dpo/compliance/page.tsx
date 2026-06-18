"use client"

import { useEffect, useMemo, useState } from "react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FolderKanban,
  ListChecks,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import {
  ArcoModuleShell,
  ModuleEmptyState,
  ModuleMetricCard,
  ModuleSectionCard,
} from "@/components/arco-module-shell"
import { DPO_META, DPO_NAV } from "@/components/arco-module-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { fileStorage, type StoredFile } from "@/lib/fileStorage"
import { cn } from "@/lib/utils"
import type {
  DpoAccreditationDraft,
  DpoAccreditationRecord,
  DpoEvidenceScope,
  DpoFunctionalDraft,
  DpoFunctionalRecord,
  DpoProjectAnalysis,
  DpoProjectReviewDraft,
  DpoProjectReviewRecord,
  DpoQuestionResponse,
  DpoSectionScore,
} from "../opd-compliance-model"
import {
  ACCREDITATION_SECTIONS,
  FUNCTIONAL_SECTIONS,
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_DICTAMEN_OPTIONS,
  PROJECT_PHASE_OPTIONS,
  PROJECT_REVIEW_QUESTIONS,
  DPO_AREA_OPTIONS,
  DPO_EVIDENCE_SCOPE_LABELS,
  DPO_EVIDENCE_TYPE_LABELS,
  DPO_ROLE_OPTIONS,
  analyzeProjectReview,
  buildDpoSnapshot,
  cloneAccreditationRecordToDraft,
  cloneFunctionalRecordToDraft,
  cloneProjectRecordToDraft,
  createAccreditationDraft,
  createAccreditationRecord,
  createFunctionalDraft,
  createFunctionalRecord,
  createProjectReviewDraft,
  createProjectReviewRecord,
  formatDateLabel,
  getEvidenceScope,
  getOptionLabel,
  loadAccreditationHistory,
  loadFunctionalHistory,
  loadProjectReviews,
  migrateLegacyDpoSnapshot,
  notifyDpoStorageChange,
  persistDpoSnapshot,
  saveAccreditationHistory,
  saveFunctionalHistory,
  saveProjectReviews,
  validateResponses,
  validateSectionCollection,
} from "../opd-compliance-model"

type EvidenceFilter = "all" | DpoEvidenceScope

const EMPTY_FILES: File[] = []
const DPO_ACCREDITATION_DRAFT_KEY = "dpo-accreditation-draft-v1"
type AutoTableDoc = jsPDF & {
  autoTable: (options: {
    startY: number
    head: string[][]
    body: Array<Array<string | number>>
    styles: { fontSize: number; cellPadding: number }
    headStyles: { fillColor: number[]; textColor: number }
  }) => void
  lastAutoTable?: { finalY: number }
}

function hasAccreditationDraftContent(draft: DpoAccreditationDraft) {
  return Boolean(
    draft.dpoName.trim() ||
      draft.dpoRole ||
      draft.dpoRoleOther.trim() ||
      draft.dpoArea ||
      draft.dpoAreaOther.trim() ||
      draft.designationDate ||
      draft.plannedNextReview ||
      draft.notes.trim() ||
      Object.values(draft.responses).some((response) => response.answer || response.notes.trim()),
  )
}

function readStoredAccreditationDraft() {
  if (typeof window === "undefined") return createAccreditationDraft()

  try {
    const rawDraft = window.localStorage.getItem(DPO_ACCREDITATION_DRAFT_KEY)
    return rawDraft ? createAccreditationDraft(JSON.parse(rawDraft)) : createAccreditationDraft()
  } catch {
    return createAccreditationDraft()
  }
}

function toneFromScore(score: number) {
  if (score >= 90) return "positive" as const
  if (score >= 70) return "primary" as const
  if (score >= 50) return "warning" as const
  return "critical" as const
}

function badgeClassFromTone(tone: ReturnType<typeof toneFromScore>) {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-blue-200 bg-blue-50 text-blue-700"
}

function answerLabel(answer: DpoQuestionResponse["answer"]) {
  if (answer === "si") return "Sí"
  if (answer === "no") return "No"
  if (answer === "na") return "N/A"
  return "Pendiente"
}

function answerBadgeClass(answer: DpoQuestionResponse["answer"]) {
  if (answer === "si") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (answer === "no") return "bg-rose-50 text-rose-700 border-rose-200"
  if (answer === "na") return "bg-slate-50 text-slate-600 border-slate-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

function eipdBadge(status: DpoProjectAnalysis["eipdStatus"]) {
  if (status === "obligatoria") return { label: "EIPD obligatoria", className: "bg-rose-50 text-rose-700 border-rose-200" }
  if (status === "recomendada") return { label: "EIPD recomendada", className: "bg-amber-50 text-amber-700 border-amber-200" }
  return { label: "EIPD no requerida", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
}

function dictamenLabel(value: string) {
  return getOptionLabel(PROJECT_DICTAMEN_OPTIONS, value) || "Pendiente de dictamen"
}

function evidenceFilterLabel(filter: EvidenceFilter) {
  if (filter === "all") return "Todos"
  if (filter === "accreditation") return DPO_EVIDENCE_SCOPE_LABELS.accreditation
  if (filter === "functional") return DPO_EVIDENCE_SCOPE_LABELS.functional
  if (filter === "project") return DPO_EVIDENCE_SCOPE_LABELS.project
  return DPO_EVIDENCE_SCOPE_LABELS.legacy
}

function statusChip(label: string, className: string) {
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

function QuestionCard({
  question,
  response,
  onChange,
}: {
  question: { id: string; prompt: string; helper?: string }
  response?: DpoQuestionResponse
  onChange: (next: DpoQuestionResponse) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
              {question.id}
            </Badge>
            <Badge variant="outline" className={cn("border", answerBadgeClass(response?.answer || ""))}>
              {answerLabel(response?.answer || "")}
            </Badge>
          </div>
          <p className="text-sm font-semibold leading-6 text-slate-950">{question.prompt}</p>
          {question.helper ? <p className="text-sm leading-6 text-slate-500">{question.helper}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <RadioGroup
          value={response?.answer || ""}
          onValueChange={(value) =>
            onChange({
              answer: value as DpoQuestionResponse["answer"],
              notes: response?.notes || "",
            })
          }
          className="grid gap-2"
        >
          {[
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
            { value: "na", label: "N/A" },
          ].map((option) => (
            <div key={option.value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
              <Label htmlFor={`${question.id}-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
        <div>
          <Label htmlFor={`${question.id}-notes`}>Observaciones</Label>
          <Textarea
            id={`${question.id}-notes`}
            className="mt-2 min-h-[92px]"
            placeholder="Documenta evidencia, justificación o notas relevantes."
            value={response?.notes || ""}
            onChange={(event) =>
              onChange({
                answer: response?.answer || "",
                notes: event.target.value,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

function ScoreBreakdown({
  sections,
  emptyTitle,
  emptyDescription,
}: {
  sections: DpoSectionScore[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (sections.length === 0) {
    return <ModuleEmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{section.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                Sí: {section.yes} · No: {section.no} · N/A: {section.na} · Peso: {section.weight}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-950">{Math.round(section.ratio * 100)}%</p>
              <p className="text-xs text-slate-500">{section.passes ? "Umbral alcanzado" : "Requiere acción"}</p>
            </div>
          </div>
          <Progress className="mt-3 h-2" value={Math.round(section.ratio * 100)} />
        </div>
      ))}
    </div>
  )
}

function HistoryTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Array<{ id: string; date: string; label: string; score: number; level: string; extra?: string }>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (rows.length === 0) {
    return (
      <ModuleEmptyState
        title="Sin historial todavía"
        description="El historial aparecerá aquí conforme se guarden evaluaciones o revisiones dentro del módulo."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Fecha</TableHead>
            <TableHead className="w-[45%]">Registro</TableHead>
            <TableHead className="w-[110px]">Puntuación</TableHead>
            <TableHead className="w-[170px]">Nivel</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={selectedId === row.id ? "bg-blue-50/50" : undefined}>
              <TableCell className="align-top whitespace-normal text-slate-700">{formatDateLabel(row.date)}</TableCell>
              <TableCell className="align-top whitespace-normal break-words">
                <div className="space-y-1">
                  <p className="font-medium leading-6 text-slate-950">{row.label}</p>
                  {row.extra ? <p className="text-xs leading-5 text-slate-500">{row.extra}</p> : null}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap font-medium text-slate-900">{row.score}%</TableCell>
              <TableCell className="align-top whitespace-normal break-words text-slate-700">{row.level}</TableCell>
              <TableCell className="text-right align-top">
                <Button variant="ghost" size="sm" onClick={() => onSelect(row.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function DPOCompliancePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("accreditation")
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>("all")
  const [evidenceFiles, setEvidenceFiles] = useState<StoredFile[]>([])
  const [accreditationHistory, setAccreditationHistory] = useState<DpoAccreditationRecord[]>([])
  const [functionalHistory, setFunctionalHistory] = useState<DpoFunctionalRecord[]>([])
  const [projectReviews, setProjectReviews] = useState<DpoProjectReviewRecord[]>([])
  const [accreditationDraft, setAccreditationDraft] = useState<DpoAccreditationDraft>(() => createAccreditationDraft())
  const [functionalDraft, setFunctionalDraft] = useState<DpoFunctionalDraft>(() => createFunctionalDraft())
  const [projectDraft, setProjectDraft] = useState<DpoProjectReviewDraft>(() => createProjectReviewDraft())
  const [selectedAccreditationId, setSelectedAccreditationId] = useState<string | null>(null)
  const [selectedFunctionalId, setSelectedFunctionalId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [storageReady, setStorageReady] = useState(false)
  const [draftsBootstrapped, setDraftsBootstrapped] = useState(false)
  const [accreditationFiles, setAccreditationFiles] = useState({
    designation: EMPTY_FILES,
    training: EMPTY_FILES,
    support: EMPTY_FILES,
  })
  const [functionalFiles, setFunctionalFiles] = useState({
    support: EMPTY_FILES,
    activityLog: EMPTY_FILES,
    managementAck: EMPTY_FILES,
  })
  const [projectFiles, setProjectFiles] = useState({
    brief: EMPTY_FILES,
    dictamen: EMPTY_FILES,
  })
  const [fileInputVersion, setFileInputVersion] = useState(0)

  const refreshAll = () => {
    const currentEvidence = fileStorage.getFilesByCategory("dpo-compliance")
    migrateLegacyDpoSnapshot(currentEvidence)
    const refreshedEvidence = fileStorage.getFilesByCategory("dpo-compliance")
    setEvidenceFiles(refreshedEvidence)
    setAccreditationHistory(loadAccreditationHistory())
    setFunctionalHistory(loadFunctionalHistory())
    setProjectReviews(loadProjectReviews())
    setStorageReady(true)
  }

  useEffect(() => {
    refreshAll()
    window.addEventListener("storage", refreshAll)
    return () => window.removeEventListener("storage", refreshAll)
  }, [])

  useEffect(() => {
    if (draftsBootstrapped || !storageReady) return

    const storedAccreditationDraft = readStoredAccreditationDraft()
    if (hasAccreditationDraftContent(storedAccreditationDraft)) {
      setAccreditationDraft(storedAccreditationDraft)
    } else if (accreditationHistory[0]) {
      setAccreditationDraft(cloneAccreditationRecordToDraft(accreditationHistory[0]))
      setSelectedAccreditationId(accreditationHistory[0].id)
    }
    if (functionalHistory[0]) {
      setFunctionalDraft(cloneFunctionalRecordToDraft(functionalHistory[0]))
      setSelectedFunctionalId(functionalHistory[0].id)
    }
    if (projectReviews[0]) {
      setSelectedProjectId(projectReviews[0].id)
    }
    setDraftsBootstrapped(true)
  }, [accreditationHistory, draftsBootstrapped, functionalHistory, projectReviews, storageReady])

  useEffect(() => {
    if (!draftsBootstrapped || typeof window === "undefined") return

    if (hasAccreditationDraftContent(accreditationDraft)) {
      window.localStorage.setItem(DPO_ACCREDITATION_DRAFT_KEY, JSON.stringify(accreditationDraft))
    } else {
      window.localStorage.removeItem(DPO_ACCREDITATION_DRAFT_KEY)
    }
  }, [accreditationDraft, draftsBootstrapped])

  const latestAccreditation = accreditationHistory[0] || null
  const latestFunctional = functionalHistory[0] || null
  const latestProject = projectReviews[0] || null

  const selectedAccreditation =
    accreditationHistory.find((record) => record.id === selectedAccreditationId) || latestAccreditation
  const selectedFunctional =
    functionalHistory.find((record) => record.id === selectedFunctionalId) || latestFunctional
  const selectedProject =
    projectReviews.find((record) => record.id === selectedProjectId) || latestProject

  const accreditationAnalysis = selectedAccreditation?.analysis || null
  const functionalAnalysis = selectedFunctional?.analysis || null
  const evidenceSummary = useMemo(() => {
    const byScope = {
      accreditation: 0,
      functional: 0,
      project: 0,
      legacy: 0,
    } as Record<DpoEvidenceScope, number>

    evidenceFiles.forEach((file) => {
      byScope[getEvidenceScope(file)] += 1
    })

    return {
      total: evidenceFiles.length,
      ...byScope,
    }
  }, [evidenceFiles])

  const filteredEvidence = useMemo(() => {
    if (evidenceFilter === "all") return evidenceFiles
    return evidenceFiles.filter((file) => getEvidenceScope(file) === evidenceFilter)
  }, [evidenceFiles, evidenceFilter])

  const projectPortfolio = useMemo(
    () => ({
      total: projectReviews.length,
      pendingDictamen: projectReviews.filter((review) => review.analysis.pendingDictamen).length,
      eipdRequired: projectReviews.filter((review) => review.analysis.eipdStatus === "obligatoria").length,
      eipdRecommended: projectReviews.filter((review) => review.analysis.eipdStatus === "recomendada").length,
    }),
    [projectReviews],
  )

  const navItems = useMemo(
    () =>
      DPO_NAV.map((item) => {
        if (item.href === "/dpo/compliance") {
          return { ...item, badge: accreditationHistory.length + functionalHistory.length + projectReviews.length }
        }
        return item
      }),
    [accreditationHistory.length, functionalHistory.length, projectReviews.length],
  )

  const headerBadges = [
    latestAccreditation
      ? {
          label: `Acreditación ${latestAccreditation.analysis.score}%`,
          tone: toneFromScore(latestAccreditation.analysis.score),
        }
      : { label: "Acreditación pendiente", tone: "warning" as const },
    latestFunctional
      ? {
          label: `Evaluación funcional ${latestFunctional.analysis.score}%`,
          tone: toneFromScore(latestFunctional.analysis.score),
        }
      : { label: "Evaluación funcional pendiente", tone: "warning" as const },
    {
      label: `${projectPortfolio.total} proyectos del departamento`,
      tone: projectPortfolio.pendingDictamen > 0 ? ("warning" as const) : ("neutral" as const),
    },
    {
      label: `${evidenceSummary.total} evidencias`,
      tone: "neutral" as const,
    },
  ]

  const latestSummaryActions = useMemo(() => {
    const actionList: string[] = []
    if (latestAccreditation?.analysis.criticalFindings.length) {
      actionList.push(...latestAccreditation.analysis.criticalFindings)
    }
    if (latestFunctional?.analysis.actions.length) {
      actionList.push(...latestFunctional.analysis.actions)
    }
    if (projectPortfolio.pendingDictamen > 0) {
      actionList.push(
        `${projectPortfolio.pendingDictamen} proyecto(s) permanecen pendientes de dictamen del Departamento de Datos Personales.`,
      )
    }
    if (projectPortfolio.eipdRequired > 0) {
      actionList.push(
        `${projectPortfolio.eipdRequired} proyecto(s) requieren EIPD completa conforme a los criterios del módulo.`,
      )
    }
    return actionList
  }, [latestAccreditation, latestFunctional, projectPortfolio])

  const updateAccreditationResponse = (questionId: string, next: DpoQuestionResponse) => {
    setAccreditationDraft((current) => ({
      ...current,
      responses: { ...current.responses, [questionId]: next },
    }))
  }

  const updateFunctionalResponse = (questionId: string, next: DpoQuestionResponse) => {
    setFunctionalDraft((current) => ({
      ...current,
      responses: { ...current.responses, [questionId]: next },
    }))
  }

  const updateProjectResponse = (questionId: string, next: DpoQuestionResponse) => {
    setProjectDraft((current) => ({
      ...current,
      responses: { ...current.responses, [questionId]: next },
    }))
  }

  const saveEvidenceBatch = async (
    files: File[],
    recordId: string,
    scope: DpoEvidenceScope,
    documentType: string,
    title: string,
  ) => {
    await Promise.all(
      files.map((file) =>
        fileStorage.saveFile(
          file,
          {
            scope,
            documentType,
            recordId,
            title,
            moduleId: "dpo",
          },
          "dpo-compliance",
        ),
      ),
    )
  }

  const persistAll = (
    nextAccreditationHistory: DpoAccreditationRecord[],
    nextFunctionalHistory: DpoFunctionalRecord[],
    nextProjectReviews: DpoProjectReviewRecord[],
  ) => {
    const refreshedEvidence = fileStorage.getFilesByCategory("dpo-compliance")
    const snapshot = buildDpoSnapshot(
      nextAccreditationHistory,
      nextFunctionalHistory,
      nextProjectReviews,
      refreshedEvidence,
    )
    saveAccreditationHistory(nextAccreditationHistory)
    saveFunctionalHistory(nextFunctionalHistory)
    saveProjectReviews(nextProjectReviews)
    persistDpoSnapshot(snapshot)
    notifyDpoStorageChange()
    refreshAll()
  }

  const resetFileInputs = () => {
    setAccreditationFiles({ designation: EMPTY_FILES, training: EMPTY_FILES, support: EMPTY_FILES })
    setFunctionalFiles({ support: EMPTY_FILES, activityLog: EMPTY_FILES, managementAck: EMPTY_FILES })
    setProjectFiles({ brief: EMPTY_FILES, dictamen: EMPTY_FILES })
    setFileInputVersion((current) => current + 1)
  }

  const handleSaveAccreditation = async () => {
    const missingQuestions = validateSectionCollection(ACCREDITATION_SECTIONS, accreditationDraft.responses)

    if (!accreditationDraft.dpoName.trim() || !accreditationDraft.dpoRole || !accreditationDraft.dpoArea) {
      toast({
        title: "Completa la ficha del Departamento de Datos Personales",
        description: "Nombre, cargo y área son obligatorios para guardar la acreditación.",
        variant: "destructive",
      })
      return
    }

    if (missingQuestions.length > 0) {
      toast({
        title: "Cuestionario incompleto",
        description: `Responde los ${missingQuestions.length} reactivos pendientes antes de guardar la acreditación.`,
        variant: "destructive",
      })
      return
    }

    try {
      const record = createAccreditationRecord(accreditationDraft)
      await saveEvidenceBatch(accreditationFiles.designation, record.id, "accreditation", "designation", record.dpoName)
      await saveEvidenceBatch(accreditationFiles.training, record.id, "accreditation", "training", record.dpoName)
      await saveEvidenceBatch(
        accreditationFiles.support,
        record.id,
        "accreditation",
        "accreditation-support",
        record.dpoName,
      )

      const nextAccreditationHistory = [record, ...accreditationHistory]
      persistAll(nextAccreditationHistory, functionalHistory, projectReviews)
      setAccreditationDraft(cloneAccreditationRecordToDraft(record))
      setSelectedAccreditationId(record.id)
      resetFileInputs()
      setActiveTab("results")
      toast({
        title: "Acreditación guardada",
        description: "La evaluación de designación ya forma parte del historial del módulo.",
      })
    } catch (error) {
      console.error("Error al guardar la acreditación del Departamento de Datos Personales:", error)
      toast({
        title: "No se pudo guardar la acreditación",
        description: "Revisa los archivos adjuntos y vuelve a intentarlo.",
        variant: "destructive",
      })
    }
  }

  const handleSaveFunctional = async () => {
    const missingQuestions = validateSectionCollection(FUNCTIONAL_SECTIONS, functionalDraft.responses)

    if (!functionalDraft.dpoName.trim() || !functionalDraft.evaluationDate || !functionalDraft.periodLabel.trim()) {
      toast({
        title: "Completa la ficha funcional",
        description: "Nombre del integrante, fecha y periodo evaluado son obligatorios.",
        variant: "destructive",
      })
      return
    }

    if (missingQuestions.length > 0) {
      toast({
        title: "Evaluación funcional incompleta",
        description: `Faltan ${missingQuestions.length} reactivos por responder antes de guardar.`,
        variant: "destructive",
      })
      return
    }

    try {
      const record = createFunctionalRecord(functionalDraft)
      await saveEvidenceBatch(functionalFiles.support, record.id, "functional", "functional-support", record.dpoName)
      await saveEvidenceBatch(functionalFiles.activityLog, record.id, "functional", "activity-log", record.dpoName)
      await saveEvidenceBatch(functionalFiles.managementAck, record.id, "functional", "management-ack", record.dpoName)

      const nextFunctionalHistory = [record, ...functionalHistory]
      persistAll(accreditationHistory, nextFunctionalHistory, projectReviews)
      setFunctionalDraft(cloneFunctionalRecordToDraft(record))
      setSelectedFunctionalId(record.id)
      resetFileInputs()
      setActiveTab("results")
      toast({
        title: "Evaluación funcional guardada",
        description: "La revisión funcional del Departamento de Datos Personales quedó registrada con su puntuación histórica.",
      })
    } catch (error) {
      console.error("Error al guardar la evaluación funcional del Departamento de Datos Personales:", error)
      toast({
        title: "No se pudo guardar la evaluación funcional",
        description: "Revisa los archivos adjuntos y vuelve a intentarlo.",
        variant: "destructive",
      })
    }
  }

  const handleSaveProject = async () => {
    const missingQuestions = validateResponses(PROJECT_REVIEW_QUESTIONS, projectDraft.responses)
    const previewAnalysis = analyzeProjectReview(projectDraft)

    if (
      !projectDraft.projectName.trim() ||
      !projectDraft.projectCategory ||
      !projectDraft.promotingArea.trim() ||
      !projectDraft.projectOwner.trim() ||
      !projectDraft.requestDate ||
      !projectDraft.projectPhase
    ) {
      toast({
        title: "Completa la identificación del proyecto",
        description: "Nombre, categoría, área promotora, responsable, fecha y fase actual son obligatorios.",
        variant: "destructive",
      })
      return
    }

    if (projectDraft.projectCategory === "otro" && !projectDraft.projectCategoryOther.trim()) {
      toast({
        title: "Describe la categoría del proyecto",
        description: "El campo “Otro” requiere una descripción específica.",
        variant: "destructive",
      })
      return
    }

    if (missingQuestions.length > 0) {
      toast({
        title: "Privacy Review incompleto",
        description: `Responde los ${missingQuestions.length} reactivos del Bloque II antes de guardar.`,
        variant: "destructive",
      })
      return
    }

    if (previewAnalysis.eipdStatus === "obligatoria" && projectDraft.dictamenResult && projectDraft.dictamenResult !== "requiere-eipd") {
      toast({
        title: "Dictamen inconsistente",
        description: "Los criterios activadores obligatorios exigen marcar “Requiere EIPD completa” o dejar el proyecto pendiente de dictamen.",
        variant: "destructive",
      })
      return
    }

    if (projectDraft.dictamenResult && (!projectDraft.dictamenFoundation.trim() || !projectDraft.recommendations.trim())) {
      toast({
        title: "Completa el dictamen del Departamento de Datos Personales",
        description: "Cuando existe dictamen debes capturar el fundamento y las recomendaciones.",
        variant: "destructive",
      })
      return
    }

    try {
      const record = createProjectReviewRecord(projectDraft)
      await saveEvidenceBatch(projectFiles.brief, record.id, "project", "project-brief", record.projectName)
      await saveEvidenceBatch(projectFiles.dictamen, record.id, "project", "project-dictamen", record.projectName)

      const nextProjectReviews = [record, ...projectReviews]
      persistAll(accreditationHistory, functionalHistory, nextProjectReviews)
      setProjectDraft(createProjectReviewDraft())
      setSelectedProjectId(record.id)
      resetFileInputs()
      toast({
        title: "Proyecto del departamento guardado",
        description: "El privacy review quedó incorporado al historial del módulo.",
      })
    } catch (error) {
      console.error("Error al guardar el proyecto del Departamento de Datos Personales:", error)
      toast({
        title: "No se pudo guardar el proyecto",
        description: "Revisa los archivos adjuntos y vuelve a intentarlo.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteEvidence = (fileId: string) => {
    const deleted = fileStorage.deleteFile(fileId)
    if (!deleted) {
      toast({
        title: "No se pudo eliminar la evidencia",
        description: "Vuelve a intentarlo o recarga la página.",
        variant: "destructive",
      })
      return
    }

    persistAll(accreditationHistory, functionalHistory, projectReviews)
    toast({
      title: "Evidencia eliminada",
      description: "El archivo se eliminó del repositorio local del módulo.",
    })
  }

  const handleExportReport = () => {
    if (!latestAccreditation && !latestFunctional && projectReviews.length === 0) {
      toast({
        title: "Sin información para exportar",
        description: "Guarda al menos una evaluación o un proyecto antes de generar el reporte.",
        variant: "destructive",
      })
      return
    }

    const doc = new jsPDF()
    const tableDoc = doc as AutoTableDoc
    let currentY = 16

    const ensureSpace = (height = 12) => {
      if (currentY + height > 280) {
        doc.addPage()
        currentY = 18
      }
    }

    const writeParagraph = (text: string, indent = 14) => {
      const lines = doc.splitTextToSize(text, 180)
      ensureSpace(lines.length * 5 + 6)
      doc.text(lines, indent, currentY)
      currentY += lines.length * 5 + 4
    }

    doc.setFontSize(18)
    doc.text("Reporte ejecutivo del Departamento de Datos Personales", 14, currentY)
    currentY += 8
    doc.setFontSize(10)
    doc.text(`Fecha de exportación: ${formatDateLabel(new Date().toISOString())}`, 14, currentY)
    currentY += 10

    if (latestAccreditation) {
      doc.setFontSize(13)
      doc.text("1. Última designación del Departamento de Datos Personales", 14, currentY)
      currentY += 7
      doc.setFontSize(10)
      writeParagraph(
        `${latestAccreditation.dpoName} · ${getOptionLabel(DPO_ROLE_OPTIONS, latestAccreditation.dpoRole) || latestAccreditation.dpoRoleOther || "Sin cargo"} · ${getOptionLabel(DPO_AREA_OPTIONS, latestAccreditation.dpoArea) || latestAccreditation.dpoAreaOther || "Sin área"}`,
      )
      writeParagraph(
        `Puntuación ${latestAccreditation.analysis.score}% · Nivel ${latestAccreditation.analysis.level}${latestAccreditation.analysis.criticalInvalidation ? " · Designación inválida por no conformidades críticas en Bloque A" : ""}`,
      )

      tableDoc.autoTable({
        startY: currentY,
        head: [["Bloque", "Sí", "No", "N/A", "Puntuación", "Umbral"]],
        body: latestAccreditation.analysis.blockScores.map((item) => [
          item.id,
          item.yes,
          item.no,
          item.na,
          `${Math.round(item.ratio * 100)}%`,
          item.passes ? "Cumple" : "No cumple",
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [10, 74, 191], textColor: 255 },
      })
      currentY = (tableDoc.lastAutoTable?.finalY || currentY) + 8

      if (latestAccreditation.analysis.criticalFindings.length > 0) {
        doc.setFontSize(11)
        doc.text("No conformidades críticas", 14, currentY)
        currentY += 6
        doc.setFontSize(10)
        latestAccreditation.analysis.criticalFindings.forEach((item) => writeParagraph(`• ${item}`, 18))
      }
    }

    if (latestFunctional) {
      ensureSpace(20)
      doc.setFontSize(13)
      doc.text("2. Última evaluación funcional", 14, currentY)
      currentY += 7
      doc.setFontSize(10)
      writeParagraph(
        `${latestFunctional.dpoName} · Periodo ${latestFunctional.periodLabel} · Puntuación ${latestFunctional.analysis.score}% · Nivel ${latestFunctional.analysis.level}`,
      )
      tableDoc.autoTable({
        startY: currentY,
        head: [["Función", "Sí", "No", "N/A", "Puntuación", "Umbral"]],
        body: latestFunctional.analysis.functionScores.map((item) => [
          item.id,
          item.yes,
          item.no,
          item.na,
          `${Math.round(item.ratio * 100)}%`,
          item.passes ? "Cumple" : "No cumple",
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      })
      currentY = (tableDoc.lastAutoTable?.finalY || currentY) + 8
    }

    ensureSpace(18)
    doc.setFontSize(13)
    doc.text("3. Portafolio de proyectos del Departamento de Datos Personales", 14, currentY)
    currentY += 7
    doc.setFontSize(10)
    writeParagraph(
      `Total: ${projectPortfolio.total} · Pendientes de dictamen: ${projectPortfolio.pendingDictamen} · EIPD obligatoria: ${projectPortfolio.eipdRequired} · EIPD recomendada: ${projectPortfolio.eipdRecommended}`,
    )

    if (projectReviews.length > 0) {
      tableDoc.autoTable({
        startY: currentY,
        head: [["Código", "Proyecto", "Dictamen", "EIPD", "Riesgo"]],
        body: projectReviews.slice(0, 8).map((item) => [
          item.projectCode,
          item.projectName,
          dictamenLabel(item.dictamenResult),
          eipdBadge(item.analysis.eipdStatus).label,
          item.analysis.riskLevel,
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      })
      currentY = (tableDoc.lastAutoTable?.finalY || currentY) + 8
    }

    if (latestSummaryActions.length > 0) {
      ensureSpace(12)
      doc.setFontSize(13)
      doc.text("4. Acciones prioritarias", 14, currentY)
      currentY += 6
      doc.setFontSize(10)
      latestSummaryActions.forEach((item) => writeParagraph(`• ${item}`, 18))
    }

    doc.save("reporte-departamento-datos-personales.pdf")
  }

  return (
    <ArcoModuleShell
      moduleLabel={DPO_META.moduleLabel}
      moduleTitle={DPO_META.moduleTitle}
      moduleDescription={DPO_META.moduleDescription}
      pageLabel="Cumplimiento"
      pageTitle="Designación, evaluación funcional y Privacy Review del Departamento de Datos Personales"
      pageDescription="Designación, evaluación funcional y privacy review del Departamento de Datos Personales."
      navItems={navItems}
      headerBadges={headerBadges}
      actions={
        <Button onClick={handleExportReport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleMetricCard
            label="Acreditación"
            value={latestAccreditation ? `${latestAccreditation.analysis.score}%` : "Pendiente"}
            helper={
              latestAccreditation
                ? `${latestAccreditation.analysis.level}${latestAccreditation.analysis.criticalInvalidation ? " · Con bloqueo crítico" : ""}`
                : "Completa los 29 reactivos de designación del Departamento de Datos Personales."
            }
            icon={ClipboardCheck}
            tone={latestAccreditation ? toneFromScore(latestAccreditation.analysis.score) : "warning"}
          />
          <ModuleMetricCard
            label="Evaluación funcional"
            value={latestFunctional ? `${latestFunctional.analysis.score}%` : "Pendiente"}
            helper={
              latestFunctional
                ? `${latestFunctional.analysis.level} · Periodo ${latestFunctional.periodLabel}`
                : "Completa la evaluación F1-F5 para medir el ejercicio efectivo del Departamento de Datos Personales."
            }
            icon={ShieldCheck}
            tone={latestFunctional ? toneFromScore(latestFunctional.analysis.score) : "warning"}
          />
          <ModuleMetricCard
            label="Proyectos del departamento"
            value={projectPortfolio.total}
            helper={`${projectPortfolio.pendingDictamen} pendientes de dictamen · ${projectPortfolio.eipdRequired} con EIPD obligatoria.`}
            icon={FolderKanban}
            tone={projectPortfolio.pendingDictamen > 0 ? "warning" : "primary"}
          />
          <ModuleMetricCard
            label="Evidencias"
            value={evidenceSummary.total}
            helper={`Acreditación ${evidenceSummary.accreditation} · Funcional ${evidenceSummary.functional} · Proyectos ${evidenceSummary.project}`}
            icon={FileCheck2}
            tone="neutral"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-[#edf4ff] p-1 lg:grid-cols-5">
            <TabsTrigger value="accreditation" className="text-xs sm:text-sm">Acreditación</TabsTrigger>
            <TabsTrigger value="functional" className="text-xs sm:text-sm">Funcional</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs sm:text-sm">Proyectos</TabsTrigger>
            <TabsTrigger value="results" className="text-xs sm:text-sm">Resumen</TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs sm:text-sm">Evid.</TabsTrigger>
          </TabsList>

          <TabsContent value="accreditation" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <ModuleSectionCard
                  title="Datos base de los miembros del Departamento de Datos Personales"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="accreditation-dpo-name">Nombre completo del integrante</Label>
                      <Input
                        id="accreditation-dpo-name"
                        className="mt-2"
                        value={accreditationDraft.dpoName}
                        onChange={(event) =>
                          setAccreditationDraft((current) => ({ ...current, dpoName: event.target.value }))
                        }
                        placeholder="Nombre y apellidos"
                      />
                    </div>
                    <div>
                      <Label>Cargo / Puesto</Label>
                      <Select
                        value={accreditationDraft.dpoRole || undefined}
                        onValueChange={(value) =>
                          setAccreditationDraft((current) => ({
                            ...current,
                            dpoRole: value as DpoAccreditationDraft["dpoRole"],
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecciona un cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          {DPO_ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {accreditationDraft.dpoRole === "otro" ? (
                        <Input
                          className="mt-2"
                          value={accreditationDraft.dpoRoleOther}
                          onChange={(event) =>
                            setAccreditationDraft((current) => ({
                              ...current,
                              dpoRoleOther: event.target.value,
                            }))
                          }
                          placeholder="Describe el cargo"
                        />
                      ) : null}
                    </div>
                    <div>
                      <Label>Área de adscripción</Label>
                      <Select
                        value={accreditationDraft.dpoArea || undefined}
                        onValueChange={(value) =>
                          setAccreditationDraft((current) => ({
                            ...current,
                            dpoArea: value as DpoAccreditationDraft["dpoArea"],
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecciona un área" />
                        </SelectTrigger>
                        <SelectContent>
                          {DPO_AREA_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {accreditationDraft.dpoArea === "otro" ? (
                        <Input
                          className="mt-2"
                          value={accreditationDraft.dpoAreaOther}
                          onChange={(event) =>
                            setAccreditationDraft((current) => ({
                              ...current,
                              dpoAreaOther: event.target.value,
                            }))
                          }
                          placeholder="Describe el área"
                        />
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor="accreditation-date">Fecha de designación vigente</Label>
                      <Input
                        id="accreditation-date"
                        type="date"
                        className="mt-2"
                        value={accreditationDraft.designationDate}
                        onChange={(event) =>
                          setAccreditationDraft((current) => ({
                            ...current,
                            designationDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="accreditation-next-review">Próxima revisión programada</Label>
                      <Input
                        id="accreditation-next-review"
                        type="date"
                        className="mt-2"
                        value={accreditationDraft.plannedNextReview}
                        onChange={(event) =>
                          setAccreditationDraft((current) => ({
                            ...current,
                            plannedNextReview: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="accreditation-notes">Observaciones generales de acreditación</Label>
                      <Textarea
                        id="accreditation-notes"
                        className="mt-2 min-h-[100px]"
                        value={accreditationDraft.notes}
                        onChange={(event) =>
                          setAccreditationDraft((current) => ({ ...current, notes: event.target.value }))
                        }
                        placeholder="Incluye contexto adicional del nombramiento, cambios de titular o aclaraciones del expediente."
                      />
                    </div>
                  </div>
                </ModuleSectionCard>

                {ACCREDITATION_SECTIONS.map((section) => (
                  <ModuleSectionCard
                    key={section.id}
                    title={section.title}
                    description={section.description}
                  >
                    <div className="space-y-4">
                      {section.questions.map((question) => (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          response={accreditationDraft.responses[question.id]}
                          onChange={(next) => updateAccreditationResponse(question.id, next)}
                        />
                      ))}
                    </div>
                  </ModuleSectionCard>
                ))}

                <ModuleSectionCard title="Evidencias de designación" description="Carga la documentación del nombramiento, formación y soportes del expediente del Departamento de Datos Personales.">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Documento de designación</Label>
                      <Input
                        key={`designation-${fileInputVersion}`}
                        type="file"
                        className="mt-2"
                        onChange={(event) =>
                          setAccreditationFiles((current) => ({
                            ...current,
                            designation: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Formación / certificaciones</Label>
                      <Input
                        key={`training-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setAccreditationFiles((current) => ({
                            ...current,
                            training: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Soporte adicional</Label>
                      <Input
                        key={`accreditation-support-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setAccreditationFiles((current) => ({
                            ...current,
                            support: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={handleSaveAccreditation}>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Guardar acreditación
                    </Button>
                    {latestAccreditation ? (
                      <Button
                        variant="outline"
                        onClick={() => setAccreditationDraft(cloneAccreditationRecordToDraft(latestAccreditation))}
                      >
                        Cargar último registro
                      </Button>
                    ) : null}
                  </div>
                </ModuleSectionCard>
              </div>

              <div className="space-y-6">
                <ModuleSectionCard
                  title="Puntuación e interpretación del Cuestionario de Designación"
                  description="Pesos del documento: A 25%, B 30%, C 25%, D 20%. Cualquier “No” en Bloque A invalida la designación."
                >
                  <ScoreBreakdown
                    sections={latestAccreditation?.analysis.blockScores || []}
                    emptyTitle="Sin acreditación guardada"
                    emptyDescription="Cuando registres la primera acreditación, aquí verás el score ponderado por bloque y el semáforo del documento."
                  />
                </ModuleSectionCard>

                {latestAccreditation ? (
                  <Card className="rounded-[28px] border-[#d6e1f6] shadow-sm">
                    <CardHeader>
                      <CardTitle>Última acreditación</CardTitle>
                      <CardDescription>{latestAccreditation.dpoName}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {statusChip(
                        `${latestAccreditation.analysis.score}% · ${latestAccreditation.analysis.level}`,
                        badgeClassFromTone(toneFromScore(latestAccreditation.analysis.score)),
                      )}
                      {latestAccreditation.analysis.criticalInvalidation ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Existe al menos una no conformidad crítica en el Bloque A. La designación no debe considerarse válida hasta corregirla.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>No hay bloqueos críticos activos en la acreditación vigente.</span>
                        </div>
                      )}
                      {latestAccreditation.analysis.criticalFindings.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-950">No conformidades críticas</p>
                          {latestAccreditation.analysis.criticalFindings.map((item) => (
                            <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="functional" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <ModuleSectionCard
                  title="Ficha de evaluación funcional"
                  description="Esta revisión debe aplicarse de forma trimestral o semestral según el ciclo del SGDP."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="functional-name">Nombre del integrante</Label>
                      <Input
                        id="functional-name"
                        className="mt-2"
                        value={functionalDraft.dpoName}
                        onChange={(event) =>
                          setFunctionalDraft((current) => ({ ...current, dpoName: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="functional-date">Fecha de evaluación</Label>
                      <Input
                        id="functional-date"
                        type="date"
                        className="mt-2"
                        value={functionalDraft.evaluationDate}
                        onChange={(event) =>
                          setFunctionalDraft((current) => ({ ...current, evaluationDate: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="functional-period">Periodo evaluado</Label>
                      <Input
                        id="functional-period"
                        className="mt-2"
                        value={functionalDraft.periodLabel}
                        onChange={(event) =>
                          setFunctionalDraft((current) => ({ ...current, periodLabel: event.target.value }))
                        }
                        placeholder="Ej. 1er semestre 2026"
                      />
                    </div>
                    <div>
                      <Label htmlFor="functional-next-review">Próxima revisión</Label>
                      <Input
                        id="functional-next-review"
                        type="date"
                        className="mt-2"
                        value={functionalDraft.plannedNextReview}
                        onChange={(event) =>
                          setFunctionalDraft((current) => ({
                            ...current,
                            plannedNextReview: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="functional-notes">Observaciones generales</Label>
                      <Textarea
                        id="functional-notes"
                        className="mt-2 min-h-[100px]"
                        value={functionalDraft.notes}
                        onChange={(event) =>
                          setFunctionalDraft((current) => ({ ...current, notes: event.target.value }))
                        }
                        placeholder="Documenta el contexto del periodo, notas de revisión y elementos de seguimiento."
                      />
                    </div>
                  </div>
                </ModuleSectionCard>

                {FUNCTIONAL_SECTIONS.map((section) => (
                  <ModuleSectionCard
                    key={section.id}
                    title={section.title}
                    description={section.description}
                  >
                    <div className="space-y-4">
                      {section.questions.map((question) => (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          response={functionalDraft.responses[question.id]}
                          onChange={(next) => updateFunctionalResponse(question.id, next)}
                        />
                      ))}
                    </div>
                  </ModuleSectionCard>
                ))}

                <ModuleSectionCard
                  title="Evidencias de evaluación funcional"
                  description="Bitácoras, soportes funcionales y acuses vinculados a la evaluación del periodo."
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label>Soporte funcional</Label>
                      <Input
                        key={`functional-support-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setFunctionalFiles((current) => ({
                            ...current,
                            support: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Bitácora del Departamento de Datos Personales</Label>
                      <Input
                        key={`functional-log-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setFunctionalFiles((current) => ({
                            ...current,
                            activityLog: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Acuses o minutas de dirección</Label>
                      <Input
                        key={`functional-ack-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setFunctionalFiles((current) => ({
                            ...current,
                            managementAck: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={handleSaveFunctional}>
                      <ListChecks className="mr-2 h-4 w-4" />
                      Guardar evaluación funcional
                    </Button>
                    {latestFunctional ? (
                      <Button
                        variant="outline"
                        onClick={() => setFunctionalDraft(cloneFunctionalRecordToDraft(latestFunctional))}
                      >
                        Cargar última evaluación
                      </Button>
                    ) : null}
                  </div>
                </ModuleSectionCard>
              </div>

              <div className="space-y-6">
                <ModuleSectionCard
                  title="Puntuación consolidada de evaluación funcional"
                  description="Pesos del documento: F1 25%, F2 20%, F3 20%, F4 20%, F5 15%."
                >
                  <ScoreBreakdown
                    sections={latestFunctional?.analysis.functionScores || []}
                    emptyTitle="Sin evaluación funcional guardada"
                    emptyDescription="Cuando registres la primera evaluación funcional, aquí verás el desempeño por función y el score consolidado."
                  />
                </ModuleSectionCard>

                {latestFunctional ? (
                  <Card className="rounded-[28px] border-[#d6e1f6] shadow-sm">
                    <CardHeader>
                      <CardTitle>Última evaluación funcional</CardTitle>
                      <CardDescription>{latestFunctional.periodLabel}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {statusChip(
                        `${latestFunctional.analysis.score}% · ${latestFunctional.analysis.level}`,
                        badgeClassFromTone(toneFromScore(latestFunctional.analysis.score)),
                      )}
                      <p className="text-sm leading-6 text-slate-600">
                        Fecha de evaluación: {formatDateLabel(latestFunctional.evaluationDate)} · Próxima revisión:
                        {" "}
                        {formatDateLabel(latestFunctional.plannedNextReview)}
                      </p>
                      {latestFunctional.analysis.actions.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-950">Acciones de mejora</p>
                          {latestFunctional.analysis.actions.map((item) => (
                            <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Proyectos revisados</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{projectPortfolio.total}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Pendientes de dictamen</p>
                <p className="mt-3 text-3xl font-semibold text-amber-800">{projectPortfolio.pendingDictamen}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">EIPD obligatoria</p>
                <p className="mt-3 text-3xl font-semibold text-rose-800">{projectPortfolio.eipdRequired}</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">EIPD recomendada</p>
                <p className="mt-3 text-3xl font-semibold text-blue-800">{projectPortfolio.eipdRecommended}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-6">
                <ModuleSectionCard
                  title="Bloque I — Identificación del proyecto"
                  description="Ficha de análisis de proyecto (Privacy Review) conforme al documento del Departamento de Datos Personales."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="project-name">Nombre del proyecto</Label>
                      <Input
                        id="project-name"
                        className="mt-2"
                        value={projectDraft.projectName}
                        onChange={(event) =>
                          setProjectDraft((current) => ({ ...current, projectName: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Categoría</Label>
                      <Select
                        value={projectDraft.projectCategory || undefined}
                        onValueChange={(value) =>
                          setProjectDraft((current) => ({
                            ...current,
                            projectCategory: value as DpoProjectReviewDraft["projectCategory"],
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {projectDraft.projectCategory === "otro" ? (
                        <Input
                          className="mt-2"
                          value={projectDraft.projectCategoryOther}
                          onChange={(event) =>
                            setProjectDraft((current) => ({
                              ...current,
                              projectCategoryOther: event.target.value,
                            }))
                          }
                          placeholder="Describe la categoría"
                        />
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-summary">Descripción ejecutiva en 2-3 líneas</Label>
                      <Textarea
                        id="project-summary"
                        className="mt-2 min-h-[100px]"
                        value={projectDraft.projectSummary}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            projectSummary: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-area">Área promotora</Label>
                      <Input
                        id="project-area"
                        className="mt-2"
                        value={projectDraft.promotingArea}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            promotingArea: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-owner">Responsable del proyecto</Label>
                      <Input
                        id="project-owner"
                        className="mt-2"
                        value={projectDraft.projectOwner}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            projectOwner: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-request-date">Fecha de solicitud de análisis</Label>
                      <Input
                        id="project-request-date"
                        type="date"
                        className="mt-2"
                        value={projectDraft.requestDate}
                        onChange={(event) =>
                          setProjectDraft((current) => ({ ...current, requestDate: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-deadline">Fecha límite para dictamen</Label>
                      <Input
                        id="project-deadline"
                        type="date"
                        className="mt-2"
                        value={projectDraft.reviewDeadline}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            reviewDeadline: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Fase actual del proyecto</Label>
                      <Select
                        value={projectDraft.projectPhase || undefined}
                        onValueChange={(value) =>
                          setProjectDraft((current) => ({
                            ...current,
                            projectPhase: value as DpoProjectReviewDraft["projectPhase"],
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecciona una fase" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_PHASE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="project-budget">Presupuesto estimado</Label>
                      <Input
                        id="project-budget"
                        className="mt-2"
                        value={projectDraft.estimatedBudget}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            estimatedBudget: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </ModuleSectionCard>

                <ModuleSectionCard
                  title="Bloque II — Análisis de privacidad (preguntas diagnóstico)"
                  description="Cada reactivo conserva el texto exacto del documento y se acompaña de observaciones."
                >
                  <div className="space-y-4">
                    {PROJECT_REVIEW_QUESTIONS.map((question) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        response={projectDraft.responses[question.id]}
                        onChange={(next) => updateProjectResponse(question.id, next)}
                      />
                    ))}
                  </div>
                </ModuleSectionCard>

                <ModuleSectionCard
                  title="Campos operativos adicionales para lógica EIPD"
                  description="Estos campos complementan los criterios del documento sin modificar el contenido base del cuestionario."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="project-subjects">Número estimado de titulares afectados</Label>
                      <Input
                        id="project-subjects"
                        type="number"
                        className="mt-2"
                        value={projectDraft.estimatedSubjects}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            estimatedSubjects: event.target.value ? Number(event.target.value) : "",
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        El sistema marcará “EIPD recomendada” si el proyecto supera 10,000 titulares o combina múltiples fuentes.
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <Checkbox
                        id="project-combines-sources"
                        checked={projectDraft.combinesMultipleSources}
                        onCheckedChange={(checked) =>
                          setProjectDraft((current) => ({
                            ...current,
                            combinesMultipleSources: checked === true,
                          }))
                        }
                      />
                      <Label htmlFor="project-combines-sources">
                        ¿Existe combinación de bases de datos de múltiples fuentes?
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <Checkbox
                        id="project-auto-decisions"
                        checked={projectDraft.hasAutomatedDecisionsWithSignificantEffect}
                        onCheckedChange={(checked) =>
                          setProjectDraft((current) => ({
                            ...current,
                            hasAutomatedDecisionsWithSignificantEffect: checked === true,
                          }))
                        }
                      />
                      <Label htmlFor="project-auto-decisions">
                        ¿Existen decisiones automatizadas con impacto legal o significativo?
                      </Label>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-transfer-details">Detalle de transferencia internacional o condiciones equivalentes</Label>
                      <Textarea
                        id="project-transfer-details"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.crossBorderTransferDetails}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            crossBorderTransferDetails: event.target.value,
                          }))
                        }
                        placeholder="Documenta país destino, medidas equivalentes y condiciones de transferencia internacional, si aplican."
                      />
                    </div>
                  </div>
                </ModuleSectionCard>

                <ModuleSectionCard
                  title="Bloque III — Dictamen del Departamento de Datos Personales"
                  description="El dictamen puede dejarse pendiente o registrarse formalmente con fundamento, riesgos y recomendaciones."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Resultado del análisis</Label>
                      <Select
                        value={projectDraft.dictamenResult || undefined}
                        onValueChange={(value) =>
                          setProjectDraft((current) => ({
                            ...current,
                            dictamenResult: value as DpoProjectReviewDraft["dictamenResult"],
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Puedes dejarlo pendiente" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_DICTAMEN_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="project-implementation-deadline">Plazo para implementar condiciones</Label>
                      <Input
                        id="project-implementation-deadline"
                        type="date"
                        className="mt-2"
                        value={projectDraft.implementationDeadline}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            implementationDeadline: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-foundation">Fundamento del dictamen</Label>
                      <Textarea
                        id="project-foundation"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.dictamenFoundation}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            dictamenFoundation: event.target.value,
                          }))
                        }
                        placeholder="Artículos de la LFPDPPP o principios del SGDP que sustentan la decisión."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-conditions">Condiciones de aprobación</Label>
                      <Textarea
                        id="project-conditions"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.dictamenConditions}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            dictamenConditions: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-risks">Riesgos identificados</Label>
                      <Textarea
                        id="project-risks"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.risksIdentified}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            risksIdentified: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-recommendations">Recomendaciones</Label>
                      <Textarea
                        id="project-recommendations"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.recommendations}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            recommendations: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-follow-up">Seguimiento requerido</Label>
                      <Textarea
                        id="project-follow-up"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.followUpRequired}
                        onChange={(event) =>
                          setProjectDraft((current) => ({
                            ...current,
                            followUpRequired: event.target.value,
                          }))
                        }
                        placeholder="¿El Departamento de Datos Personales dará seguimiento posterior? ¿En qué reunión o fecha?"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="project-notes">Observaciones generales</Label>
                      <Textarea
                        id="project-notes"
                        className="mt-2 min-h-[90px]"
                        value={projectDraft.notes}
                        onChange={(event) =>
                          setProjectDraft((current) => ({ ...current, notes: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                </ModuleSectionCard>

                <ModuleSectionCard
                  title="Documentos del proyecto"
                  description="Adjunta brief, solicitud, dictamen firmado u otra evidencia del análisis del Departamento de Datos Personales."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Documentación base del proyecto</Label>
                      <Input
                        key={`project-brief-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setProjectFiles((current) => ({
                            ...current,
                            brief: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Dictamen o anexos del Departamento de Datos Personales</Label>
                      <Input
                        key={`project-dictamen-${fileInputVersion}`}
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(event) =>
                          setProjectFiles((current) => ({
                            ...current,
                            dictamen: event.target.files ? Array.from(event.target.files) : EMPTY_FILES,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={handleSaveProject}>
                      <FolderKanban className="mr-2 h-4 w-4" />
                      Guardar Privacy Review
                    </Button>
                    <Button variant="outline" onClick={() => setProjectDraft(createProjectReviewDraft())}>
                      Reiniciar formulario
                    </Button>
                  </div>
                </ModuleSectionCard>
              </div>

              <div className="space-y-6">
                <ModuleSectionCard
                  title="Lectura automática EIPD"
                  description="La pantalla identifica si el proyecto dispara EIPD obligatoria, recomendada o no requerida."
                >
                  {(() => {
                    const preview = analyzeProjectReview(projectDraft)
                    const badge = eipdBadge(preview.eipdStatus)
                    return (
                      <div className="space-y-4">
                        {statusChip(badge.label, `border ${badge.className}`)}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          Riesgo preliminar del proyecto: <span className="font-semibold text-slate-900">{preview.riskLevel}</span>
                        </div>
                        {preview.eipdReasons.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-950">Motivos activadores</p>
                            {preview.eipdReasons.map((item) => (
                              <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                {item}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {preview.missingSafeguards.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-950">Salvaguardas pendientes</p>
                            {preview.missingSafeguards.map((item) => (
                              <div key={item} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                {item}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })()}
                </ModuleSectionCard>

                <ModuleSectionCard
                  title="Historial de proyectos analizados"
                  description="Cada privacy review se conserva como registro histórico independiente."
                >
                  <HistoryTable
                    rows={projectReviews.map((item) => ({
                      id: item.id,
                      date: item.updatedAt,
                      label: item.projectName,
                      score: item.analysis.eipdStatus === "obligatoria" ? 100 : item.analysis.eipdStatus === "recomendada" ? 70 : 40,
                      level: dictamenLabel(item.dictamenResult),
                      extra: `${item.projectCode} · ${eipdBadge(item.analysis.eipdStatus).label}`,
                    }))}
                    selectedId={selectedProject?.id || null}
                    onSelect={setSelectedProjectId}
                  />
                </ModuleSectionCard>

                {selectedProject ? (
                  <Card className="rounded-[28px] border-[#d6e1f6] shadow-sm">
                    <CardHeader>
                      <CardTitle>{selectedProject.projectName}</CardTitle>
                      <CardDescription>
                        {selectedProject.projectCode} · {selectedProject.promotingArea}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setProjectDraft(cloneProjectRecordToDraft(selectedProject))}>
                          Usar como plantilla
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("projects")}>
                          Seguir editando
                        </Button>
                      </div>
                      {statusChip(
                        dictamenLabel(selectedProject.dictamenResult),
                        badgeClassFromTone(
                          selectedProject.analysis.pendingDictamen ? "warning" : toneFromScore(80),
                        ),
                      )}
                      {statusChip(
                        eipdBadge(selectedProject.analysis.eipdStatus).label,
                        `border ${eipdBadge(selectedProject.analysis.eipdStatus).className}`,
                      )}
                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <p>Fase actual: <span className="font-semibold text-slate-900">{getOptionLabel(PROJECT_PHASE_OPTIONS, selectedProject.projectPhase)}</span></p>
                        <p>Responsable: <span className="font-semibold text-slate-900">{selectedProject.projectOwner}</span></p>
                        <p>Solicitud: <span className="font-semibold text-slate-900">{formatDateLabel(selectedProject.requestDate)}</span></p>
                        <p>Fecha límite: <span className="font-semibold text-slate-900">{formatDateLabel(selectedProject.reviewDeadline)}</span></p>
                      </div>
                      {selectedProject.analysis.eipdReasons.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-950">Criterios activados</p>
                          {selectedProject.analysis.eipdReasons.map((item) => (
                            <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="grid gap-6">
              <ModuleSectionCard
                title="Resumen ejecutivo del Departamento de Datos Personales"
                description="Resultados vigentes del cuestionario de acreditación, la evaluación funcional y el portafolio de proyectos."
              >
                {latestAccreditation || latestFunctional || projectReviews.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Acreditación</p>
                        <p className="text-3xl font-semibold text-slate-950">
                          {latestAccreditation ? `${latestAccreditation.analysis.score}%` : "—"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {latestAccreditation?.analysis.level || "Sin registro"}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Evaluación funcional</p>
                        <p className="text-3xl font-semibold text-slate-950">
                          {latestFunctional ? `${latestFunctional.analysis.score}%` : "—"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {latestFunctional?.analysis.level || "Sin registro"}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Pendientes de dictamen</p>
                        <p className="text-3xl font-semibold text-amber-800">{projectPortfolio.pendingDictamen}</p>
                        <p className="text-sm text-amber-700">Privacy reviews en espera</p>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">EIPD obligatoria</p>
                        <p className="text-3xl font-semibold text-rose-800">{projectPortfolio.eipdRequired}</p>
                        <p className="text-sm text-rose-700">Proyectos activados</p>
                      </div>
                    </div>

                    {latestSummaryActions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">Hallazgos y acciones prioritarias</p>
                        {latestSummaryActions.map((item) => (
                          <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                        No hay acciones prioritarias abiertas en el último corte del módulo.
                      </div>
                    )}
                  </div>
                ) : (
                  <ModuleEmptyState
                    title="Sin resultados todavía"
                    description="Guarda al menos una acreditación, una evaluación funcional o un proyecto para poblar esta vista."
                  />
                )}
              </ModuleSectionCard>

              <ModuleSectionCard
                title="Consulta histórica"
                description="Selecciona registros guardados para revisar su score, nivel y fecha."
              >
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-950">Historial de acreditación</p>
                    <HistoryTable
                      rows={accreditationHistory.map((item) => ({
                        id: item.id,
                        date: item.updatedAt,
                        label: item.dpoName,
                        score: item.analysis.score,
                        level: item.analysis.level,
                        extra: item.analysis.criticalInvalidation ? "Con no conformidades críticas en Bloque A" : undefined,
                      }))}
                      selectedId={selectedAccreditation?.id || null}
                      onSelect={setSelectedAccreditationId}
                    />
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-950">Historial de evaluación funcional</p>
                    <HistoryTable
                      rows={functionalHistory.map((item) => ({
                        id: item.id,
                        date: item.updatedAt,
                        label: item.periodLabel,
                        score: item.analysis.score,
                        level: item.analysis.level,
                        extra: item.dpoName,
                      }))}
                      selectedId={selectedFunctional?.id || null}
                      onSelect={setSelectedFunctionalId}
                    />
                  </div>
                </div>
              </ModuleSectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <ModuleSectionCard
                title="Detalle de acreditación seleccionada"
                description="Score por bloque, nivel y hallazgos críticos."
              >
                {accreditationAnalysis ? (
                  <div className="space-y-4">
                    {statusChip(
                      `${accreditationAnalysis.score}% · ${accreditationAnalysis.level}`,
                      badgeClassFromTone(toneFromScore(accreditationAnalysis.score)),
                    )}
                    <ScoreBreakdown
                      sections={accreditationAnalysis.blockScores}
                      emptyTitle="Sin datos"
                      emptyDescription="No hay puntuación disponible para el registro seleccionado."
                    />
                  </div>
                ) : (
                  <ModuleEmptyState
                    title="Sin acreditación seleccionada"
                    description="Selecciona una entrada del historial para consultar el detalle."
                  />
                )}
              </ModuleSectionCard>

              <ModuleSectionCard
                title="Detalle de evaluación funcional seleccionada"
                description="Score por función, umbrales y acciones derivadas."
              >
                {functionalAnalysis ? (
                  <div className="space-y-4">
                    {statusChip(
                      `${functionalAnalysis.score}% · ${functionalAnalysis.level}`,
                      badgeClassFromTone(toneFromScore(functionalAnalysis.score)),
                    )}
                    <ScoreBreakdown
                      sections={functionalAnalysis.functionScores}
                      emptyTitle="Sin datos"
                      emptyDescription="No hay puntuación disponible para el registro seleccionado."
                    />
                  </div>
                ) : (
                  <ModuleEmptyState
                    title="Sin evaluación seleccionada"
                    description="Selecciona una entrada del historial para consultar el detalle."
                  />
                )}
              </ModuleSectionCard>
            </div>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-6">
            <ModuleSectionCard
              title="Expediente de evidencias del Departamento de Datos Personales"
              description="Filtra por acreditación, evaluación funcional o proyectos para revisar y depurar soportes del módulo."
              action={
                <div className="flex flex-wrap gap-2">
                  {(["all", "accreditation", "functional", "project", "legacy"] as EvidenceFilter[]).map((filter) => (
                    <Button
                      key={filter}
                      variant={evidenceFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEvidenceFilter(filter)}
                    >
                      {evidenceFilterLabel(filter)}
                    </Button>
                  ))}
                </div>
              }
            >
              {filteredEvidence.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[840px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Ámbito</TableHead>
                        <TableHead>Tipología</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvidence.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium text-slate-950">{file.name}</TableCell>
                          <TableCell>{DPO_EVIDENCE_SCOPE_LABELS[getEvidenceScope(file)]}</TableCell>
                          <TableCell>
                            {DPO_EVIDENCE_TYPE_LABELS[file.metadata?.documentType as string] ||
                              file.metadata?.documentType ||
                              "Sin tipología"}
                          </TableCell>
                          <TableCell>{formatDateLabel(file.uploadDate)}</TableCell>
                          <TableCell>{file.metadata?.recordId || "Legado"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <a href={fileStorage.createFileURL(file.content)} target="_blank" rel="noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteEvidence(file.id)}>
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <ModuleEmptyState
                  title="Sin evidencias en este filtro"
                  description="Cuando cargues archivos en acreditación, evaluación funcional o proyectos aparecerán aquí."
                />
              )}
            </ModuleSectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </ArcoModuleShell>
  )
}
