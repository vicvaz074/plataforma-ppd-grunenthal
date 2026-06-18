"use client"

import { useEffect, useState } from "react"
import { Info, Save, UserCog } from "lucide-react"

import {
  ArcoModuleShell,
  ModuleSectionCard,
} from "@/components/arco-module-shell"
import { DPO_META, DPO_NAV } from "@/components/arco-module-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFilesByCategory } from "@/lib/fileStorage"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  DPO_ROLE_OPTIONS,
  DPO_AREA_OPTIONS,
  type DpoAccreditationRecord,
  type DpoAccreditationDraft,
  buildDpoSnapshot,
  createAccreditationDraft,
  createAccreditationRecord,
  formatDateLabel,
  getOptionLabel,
  loadAccreditationHistory,
  loadFunctionalHistory,
  loadProjectReviews,
  notifyDpoStorageChange,
  persistDpoSnapshot,
  saveAccreditationHistory,
} from "../opd-compliance-model"

export const DPO_REGISTRATION_DRAFT_KEY = "dpo-registration-draft-v1"

function hasRegistrationDraftContent(draft: DpoAccreditationDraft) {
  return Boolean(
    draft.dpoName.trim() ||
      draft.dpoRole ||
      draft.dpoRoleOther.trim() ||
      draft.dpoArea ||
      draft.dpoAreaOther.trim() ||
      draft.designationDate ||
      draft.plannedNextReview ||
      draft.notes.trim(),
  )
}

function readRegistrationDraft() {
  if (typeof window === "undefined") return createAccreditationDraft()

  try {
    const rawDraft = window.localStorage.getItem(DPO_REGISTRATION_DRAFT_KEY)
    return rawDraft ? createAccreditationDraft(JSON.parse(rawDraft)) : createAccreditationDraft()
  } catch {
    return createAccreditationDraft()
  }
}

export default function DpoRegistroPage() {
  const { toast } = useToast()
  const [draft, setDraft] = useState<DpoAccreditationDraft>(createAccreditationDraft())
  const [history, setHistory] = useState<DpoAccreditationRecord[]>([])
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    setDraft(readRegistrationDraft())
    setHistory(loadAccreditationHistory())
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady || typeof window === "undefined") return

    if (hasRegistrationDraftContent(draft)) {
      window.localStorage.setItem(DPO_REGISTRATION_DRAFT_KEY, JSON.stringify(draft))
    } else {
      window.localStorage.removeItem(DPO_REGISTRATION_DRAFT_KEY)
    }
  }, [draft, draftReady])

  const showDemoInfo = () => {
    toast({
      title: "Demo con persistencia local",
      description:
        "Los datos se guardan en este navegador para la demo. No se envían a un servidor y pueden limpiarse al borrar el almacenamiento local.",
    })
  }

  const handleSave = () => {
    if (!draft.dpoName.trim()) {
      toast({ title: "Campo requerido", description: "El nombre del integrante es obligatorio.", variant: "destructive" })
      return
    }

    const record = createAccreditationRecord(draft)
    const nextHistory = [record, ...loadAccreditationHistory()]
    saveAccreditationHistory(nextHistory)
    persistDpoSnapshot(
      buildDpoSnapshot(nextHistory, loadFunctionalHistory(), loadProjectReviews(), getFilesByCategory("dpo-compliance")),
    )
    notifyDpoStorageChange()

    setHistory(nextHistory)
    setDraft(createAccreditationDraft())
    toast({
      title: "Registro guardado",
      description: `Se registró a ${record.dpoName} dentro de los Miembros del Departamento de Datos Personales.`,
    })
  }

  return (
    <ArcoModuleShell
      {...DPO_META}
      navItems={DPO_NAV}
      pageLabel="Registro"
      pageTitle="Designación de los miembros del Departamento de Datos Personales"
      pageDescription="Captura la designación y acreditación de los miembros del Departamento de Datos Personales."
      backHref="/"
      backLabel="Volver al inicio"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={showDemoInfo} className="rounded-full">
            <Info className="mr-2 h-4 w-4" /> Demo
          </Button>
          <Button onClick={handleSave} className="rounded-full">
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <ModuleSectionCard
          title="Datos base de los miembros del Departamento de Datos Personales"
          description="Usa la misma superficie de captura tipo ARCO antes de entrar a los 29 reactivos de acreditación."
          action={
            <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
              <UserCog className="h-5 w-5" />
            </div>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dpoName">Nombre completo</Label>
              <Input
                id="dpoName"
                value={draft.dpoName}
                onChange={(e) => setDraft((prev) => ({ ...prev, dpoName: e.target.value }))}
                placeholder="Nombre del integrante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dpoRole">Rol</Label>
              <Select
                value={draft.dpoRole}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, dpoRole: v as DpoAccreditationDraft["dpoRole"] }))}
              >
                <SelectTrigger id="dpoRole">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {DPO_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.dpoRole === "otro" && (
              <div className="space-y-2">
                <Label htmlFor="dpoRoleOther">Especificar rol</Label>
                <Input
                  id="dpoRoleOther"
                  value={draft.dpoRoleOther}
                  onChange={(e) => setDraft((prev) => ({ ...prev, dpoRoleOther: e.target.value }))}
                  placeholder="Descripción del rol"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dpoArea">Área</Label>
              <Select
                value={draft.dpoArea}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, dpoArea: v as DpoAccreditationDraft["dpoArea"] }))}
              >
                <SelectTrigger id="dpoArea">
                  <SelectValue placeholder="Seleccionar área" />
                </SelectTrigger>
                <SelectContent>
                  {DPO_AREA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.dpoArea === "otro" && (
              <div className="space-y-2">
                <Label htmlFor="dpoAreaOther">Especificar área</Label>
                <Input
                  id="dpoAreaOther"
                  value={draft.dpoAreaOther}
                  onChange={(e) => setDraft((prev) => ({ ...prev, dpoAreaOther: e.target.value }))}
                  placeholder="Descripción del área"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="designationDate">Fecha de designación</Label>
              <Input
                id="designationDate"
                type="date"
                value={draft.designationDate}
                onChange={(e) => setDraft((prev) => ({ ...prev, designationDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedNextReview">Próxima revisión</Label>
              <Input
                id="plannedNextReview"
                type="date"
                value={draft.plannedNextReview}
                onChange={(e) => setDraft((prev) => ({ ...prev, plannedNextReview: e.target.value }))}
              />
            </div>
            <div className="col-span-full space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones sobre la designación, formación, experiencia relevante..."
                rows={3}
              />
            </div>
          </div>
        </ModuleSectionCard>

        <ModuleSectionCard
          title="Registros guardados"
          description="Historial persistente en este navegador para la demo."
        >
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.slice(0, 6).map((record) => {
                const role =
                  getOptionLabel(DPO_ROLE_OPTIONS, record.dpoRole) || record.dpoRoleOther || "Sin rol registrado"
                const area =
                  getOptionLabel(DPO_AREA_OPTIONS, record.dpoArea) || record.dpoAreaOther || "Sin área registrada"

                return (
                  <div
                    key={record.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{record.dpoName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {role} · {area}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Designación {formatDateLabel(record.designationDate)} · Guardado{" "}
                        {formatDateLabel(record.updatedAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDraft(createAccreditationDraft(record))}
                      className="shrink-0"
                    >
                      Usar como base
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Aún no hay registros guardados. Cuando guardes el primer integrante aparecerá aquí y también alimentará el overview del módulo.
            </div>
          )}
        </ModuleSectionCard>
      </div>
    </ArcoModuleShell>
  )
}
