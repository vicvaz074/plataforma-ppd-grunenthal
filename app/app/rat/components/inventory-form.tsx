"use client"

import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { X, CheckCircle } from "lucide-react"
import type {
  Inventory,
  SubInventory,
  PersonalData,
  AdditionalAccess,
  AdditionalTransfer,
  AdditionalRemission,
  AdditionalConservation,
  AdditionalBlocking,
} from "../types"
import StepRenderer from "./step-renderer"
import { StepperNav } from "./stepper-nav"
import { saveFile } from "@/lib/fileStorage"
import { parseRatExcel } from "../utils/parseRatExcel"
import { parseExcelOrCsvManual } from "../utils/fileParserManual"
import { createInventoryFromRatImport } from "../utils/rat-import"
import {
  DEFAULT_REPORT_ACCENT_COLOR,
  createDefaultInventory,
  normalizeInventoryForForm,
  prepareInventorySave,
} from "../utils/inventory-normalization"

const normalizePurposeDisplay = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const collapsed = value.trim().replace(/\s+/g, " ")
  return collapsed.length > 0 ? collapsed : null
}

const normalizePurposeKey = (value: unknown): string => {
  const display = normalizePurposeDisplay(value)
  return display ? display.toLocaleLowerCase("es") : "__empty__"
}

const sanitizeTextList = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const sanitized: string[] = []
  values.forEach((value) => {
    if (typeof value !== "string") return
    const trimmed = value.trim()
    if (!trimmed) return
    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      sanitized.push(trimmed)
    }
  })
  return sanitized
}

const sanitizePurposeList = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const sanitized: string[] = []
  values.forEach((value) => {
    const display = normalizePurposeDisplay(value)
    if (!display || seen.has(display)) return
    seen.add(display)
    sanitized.push(display)
  })
  return sanitized
}

const sanitizePersonalDataEntries = (entries?: PersonalData[]): PersonalData[] => {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    ...entry,
    category:
      typeof entry.category === "string" && entry.category.trim().length > 0
        ? entry.category
        : "Sin categoría",
    purposesPrimary: sanitizePurposeList(entry.purposesPrimary),
    purposesSecondary: sanitizePurposeList(entry.purposesSecondary),
  }))
}

const sanitizeSecondaryConsent = (
  consent: SubInventory["secondaryPurposesConsent"] | undefined,
  personalData: PersonalData[],
): SubInventory["secondaryPurposesConsent"] => {
  const active = new Map<string, string>()
  personalData.forEach((item) => {
    sanitizePurposeList(item.purposesSecondary).forEach((purpose) => {
      const key = normalizePurposeKey(purpose)
      if (!active.has(key)) {
        active.set(key, purpose)
      }
    })
  })

  if (!consent || typeof consent !== "object") {
    return {}
  }

  return Object.entries(consent).reduce<SubInventory["secondaryPurposesConsent"]>((acc, [rawPurpose, details]) => {
    if (!details) return acc
    const normalizedKey = normalizePurposeKey(rawPurpose)
    const display = active.get(normalizedKey)
    if (!display) {
      return acc
    }
    acc[display] = {
      consentType: details.consentType || "",
      consentMechanism: details.consentMechanism || "",
      exceptions: sanitizeTextList(details.exceptions),
    }
    return acc
  }, {})
}

const sanitizeSubInventoryPurposes = (sub: SubInventory): SubInventory => {
  const personalData = sanitizePersonalDataEntries(sub.personalData)
  return {
    ...sub,
    personalData,
    secondaryPurposesConsent: sanitizeSecondaryConsent(
      sub.secondaryPurposesConsent,
      personalData,
    ),
  }
}

// ------- AUTODETECCIÓN DE COLUMNAS -------
const autoDetectColumn = (columns: string[], keywords: string[]): string => {
  return (
    columns.find((col) =>
      keywords.some((kw) => col.toLowerCase().replace(/\s/g, "").includes(kw))
    ) || ""
  )
}

interface InventoryFormProps {
  formData: Inventory
  setFormData: React.Dispatch<React.SetStateAction<Inventory>>
  editingInventoryId: string | null
  setEditingInventoryId: React.Dispatch<React.SetStateAction<string | null>>
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>
  setMode: React.Dispatch<React.SetStateAction<"menu" | "view" | "create">>
  resetForm: () => void
  inventories: Inventory[]
  showInitialButtons?: boolean
  onProgressSaved?: () => void
}

const defaultAdditionalAccess = (): AdditionalAccess => ({
  id: Date.now().toString(),
  area: "",
  showOtherArea: false,
  privileges: [],
  otherPrivilege: "",
})

const defaultAdditionalTransfer = (): AdditionalTransfer => ({
  recipient: "",
  purposes: "",
  consentRequired: false,
  consentType: "",
  tacitDescription: "",
  expresoForm: "",
  expresoEscritoForm: "",
  consentFile: undefined,
  consentFileId: undefined,
  consentFileName: undefined,
  contractFile: undefined,
  contractFileId: undefined,
  contractFileName: undefined,
  exceptions: [],
  legalInstrument: [],
  otherLegalInstrument: "",
  inAP: false,
})

const defaultAdditionalRemission = (): AdditionalRemission => ({
  recipient: "",
  purposes: [],
  otherPurpose: "",
  legalInstrument: [],
  otherLegalInstrument: "",
  contractFile: undefined,
  contractFileId: undefined,
  contractFileName: undefined,
})

const defaultAdditionalConservation = (): AdditionalConservation => ({
  term: "",
  showOtherTerm: false,
  justification: [],
  legalBasis: "",
  otherJustification: "",
  detail: "",
})

const defaultAdditionalBlocking = (): AdditionalBlocking => ({
  time: "",
  showOtherTime: false,
  prescription: [],
  otherPrescription: "",
  disposition: "",
})

const defaultSubInventory = (): SubInventory => ({
  id: Date.now().toString(),
  databaseName: "",
  holderTypes: [],
  otherConsentException: "",
  otherConsentMechanism: "",
  otherHolderType: "",
  otherConsentType: "",
  holdersVolume: "",
  accessibility: "",
  environment: "",
  responsibleArea: "",
  showOtherResponsibleArea: false,
  obtainingMethod: "",
  showOtherObtainingMethod: false,
  obtainingSource: "",
  privacyNoticeFiles: [],
  privacyNoticeFileIds: [],
  privacyNoticeFileNames: [],
  privacyNoticeFile: undefined,
  privacyNoticeFileId: undefined,
  otherLegalBasis: "",
  privacyNoticeFileName: undefined,
  otherProcessingArea: "",
  // ⚠️ Asegúrate de mantener consistencia con types.ts:
  showOtherProcessingArea: false,

  consentFile: undefined,
  consentFileId: undefined,
  consentFileName: undefined,
  transferConsentFile: undefined,
  transferConsentFileId: undefined,
  transferConsentFileName: undefined,
  transferContractFile: undefined,
  transferContractFileId: undefined,
  transferContractFileName: undefined,

  consentRequired: true,
  consentException: [],
  consentMechanism: "",
  consentType: "",
  tacitDescription: "",

  secondaryConsentType: "",
  secondaryConsentMechanism: "",
  secondaryTacitDescription: "",
  secondaryConsentFile: undefined,
  secondaryConsentFileId: undefined,
  secondaryConsentFileName: undefined,
  secondaryExpresoForm: "",
  secondaryExpresoEscritoForm: "",
  secondaryPurposesConsent: {},

  processingArea: [],
  processingSystem: "",
  processingSystemName: "",
  processingDescription: [],
  accessDescription: [],
  otherAccessDescription: "",
  dataLifecyclePrivileges: "",

  // Modelo por ítems
  additionalAccesses: [defaultAdditionalAccess()],

  // 👇 NUEVOS (compat step 7)
  showOtherAdditionalAreasAccess: false,
  additionalAreas: [],
  additionalAreasAccess: [],
  otherAdditionalAreasAccess: "",

  // --- Missing fields added below ---
  additionalAreasLegalBasis: [],
  otherAdditionalAreasLegalBasis: "",
  additionalAreasPurposes: [],
  otherAdditionalAreasPurposes: "",
  deletionMethods: [],

  storageMethod: "",
  otherStorageMethod: "",
  physicalLocation: "",
  backupPeriodicity: "",
  isBackedUp: false,
  backupDescription: "",
  backupResponsible: "",
  showOtherBackupResponsible: false,

  conservationTerm: "",
  showOtherConservationTerm: false,
  conservationJustification: [],
  otherConservationJustification: "",
  conservationJustificationDetail: "",
  conservationLegalBasis: "",
  blockingTime: "",
  showOtherBlockingTime: false,
  legalPrescription: [],
  otherLegalPrescription: "",
  blockingLegalDisposition: "",
  additionalConservations: [],
  additionalBlockings: [],

  // 👇 NUEVOS (compat step 9)
  showOtherProcessingTime: false,
  processingTime: "",
  postRelationshipProcessing: "",
  legalConservation: [],
  otherLegalConservation: "",
  otherDeletionMethod: "",
  // 👇 NUEVO (compat step 10)
  deletionMethod: "",

  additionalTransfers: [],
  dataTransfer: "",
  transferRecipient: "",
  transferPurposes: "",
  transferConsentRequired: false,
  transferExceptions: [],
  transferConsentType: "",
  transferTacitDescription: "",
  transferExpresoForm: "",
  transferOtherExpresoForm: "",
  transferExpresoEscritoForm: "",
  transferOtherExpresoEscritoForm: "",
  transferLegalInstrument: [],
  otherTransferLegalInstrument: "",
  transferInAP: false,

  dataRemission: "",
  remissionRecipient: "",
  remissionPurposes: [],
  otherRemissionPurpose: "",
  remissionLegalInstrument: [],
  otherRemissionLegalInstrument: "",
  remissionContractFile: undefined,
  remissionContractFileId: undefined,
  remissionContractFileName: undefined,
  additionalRemissions: [],

  personalData: [],
})

const defaultInventory = (): Inventory => createDefaultInventory()

export function InventoryForm({
  formData,
  setFormData,
  editingInventoryId,
  setEditingInventoryId,
  setInventories,
  setMode,
  resetForm,
  inventories,
  showInitialButtons = true,
  onProgressSaved,
}: InventoryFormProps) {
  const [step, setStep] = useState(1)
  const [activeSub, setActiveSub] = useState(0)
  const [progressSaved, setProgressSaved] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Estados para importación manual de datos personales
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [selectedNameColumn, setSelectedNameColumn] = useState<string>("")
  const [selectedCategoryColumn, setSelectedCategoryColumn] = useState<string>("")
  const [selectedRiskColumn, setSelectedRiskColumn] = useState<string>("none")
  const [fileToProcess, setFileToProcess] = useState<File | null>(null)
  const [overwriteCategories, setOverwriteCategories] = useState(false)
  const [overwriteRisk, setOverwriteRisk] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const companyLogoInputRef = useRef<HTMLInputElement>(null)
  const [importingFull, setImportingFull] = useState(false)

  const handleCompanyLogoUpload = (file: File | null) => {
    if (!file) {
      if (companyLogoInputRef.current) {
        companyLogoInputRef.current.value = ""
      }
      setFormData((prev) => ({
        ...prev,
        companyLogoDataUrl: undefined,
        companyLogoFileName: undefined,
        companyLogoPublicPath: undefined,
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (companyLogoInputRef.current) {
        companyLogoInputRef.current.value = ""
      }
      setFormData((prev) => ({
        ...prev,
        companyLogoDataUrl: reader.result as string,
        companyLogoFileName: file.name,
        companyLogoPublicPath: undefined,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleAccentColorChange = (value: string) => {
    if (!value) {
      setFormData((prev) => ({ ...prev, reportAccentColor: DEFAULT_REPORT_ACCENT_COLOR }))
      return
    }
    const normalized = value.startsWith("#") ? value : `#${value}`
    setFormData((prev) => ({
      ...prev,
      reportAccentColor: normalized.slice(0, 7).toUpperCase(),
    }))
  }

  // Guardar progreso en localStorage
  const handleSaveProgress = () => {
    if (typeof window !== "undefined") {
      // Arregla categorías vacías antes de guardar
      const dataToSave = JSON.parse(JSON.stringify(formData))
      dataToSave.subInventories.forEach((sub: any) => {
        sub.personalData = (sub.personalData || []).map((d: any) => ({
          ...d,
          category: d.category || "Sin categoría"
        }))
      })
      dataToSave.status = "en proceso"
      localStorage.setItem("inventories_progress", JSON.stringify(dataToSave))
      setProgressSaved(true)
      onProgressSaved?.()
      window.dispatchEvent(new Event("inventory-progress-saved"))
      setTimeout(() => setProgressSaved(false), 2500)
    }
  }

  // Cargar progreso guardado
  const handleContinueProgress = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("inventories_progress")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Recorre y arregla las categorías si están vacías:
          parsed.subInventories.forEach((sub: any) => {
            sub.personalData = (sub.personalData || []).map((d: any) => ({
              ...d,
              category: d.category || "Sin categoría"
            }))
          })
          setFormData(normalizeInventoryForForm(parsed))
          setMode("create")
        } catch {}
      }
    }
  }

  const hasProgress =
    typeof window !== "undefined" && Boolean(localStorage.getItem("inventories_progress"))

  // Importar todo el inventario desde un archivo
  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingFull(true)
    try {
      const parsed = await parseRatExcel(file)
      if (parsed.length === 0) throw new Error("No se encontraron bases de datos")
      if (parsed.length === 1 && !editingInventoryId) {
        const imported = createInventoryFromRatImport(parsed, {
          baseInventory: formData,
          id: formData.id,
        })
        setFormData((f) => ({
          ...f,
          subInventories: imported.subInventories,
          databaseName: imported.databaseName,
          responsible: f.responsible || imported.responsible || defaultInventory().responsible,
        }))
        setStep(13)
      } else {
        const newInv = createInventoryFromRatImport(parsed, {
          id: Date.now().toString(),
        })
        setInventories((all) => [...all, newInv])
        setMode("view")
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Archivo no compatible"
      alert(`No se pudo importar el inventario. ${message}`)
    } finally {
      setImportingFull(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ---------- BLOQUE IMPORTAR DATOS PERSONALES MANUAL ----------
  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileToProcess(file);

    try {
      const result = await parseExcelOrCsvManual(file, "", "");
      const columns = result.columns || [];
      setFileColumns(columns);

      // Autodetectar columnas
      setSelectedNameColumn(
        autoDetectColumn(columns, ["nombre", "name", "dato", "campo", "data"])
      );
      setSelectedCategoryColumn(
        autoDetectColumn(columns, ["categoría", "category", "tipo", "grupo"])
      );
      setSelectedRiskColumn(
        autoDetectColumn(columns, ["riesgo", "risk", "nivel"]) || "none"
      );
    } catch (err) {
      alert("No se pudieron leer las columnas del archivo.");
      setFileColumns([]);
      setSelectedNameColumn("");
      setSelectedCategoryColumn("");
      setSelectedRiskColumn("none");
    }
  };

  const processFileWithColumns = async () => {
    if (
      fileToProcess &&
      selectedNameColumn &&
      selectedCategoryColumn
    ) {
      try {
        const result = await parseExcelOrCsvManual(
          fileToProcess,
          selectedNameColumn,
          selectedCategoryColumn,
          selectedRiskColumn === "none" ? undefined : selectedRiskColumn
        );

        const newData: PersonalData[] = result.data.map((item, idx) => ({
          id: `${Date.now()}_${idx}`,
          name: item.name,
          // ¡¡Nunca vacío!!
          category: item.category || "Sin categoría",
          riesgo: (["bajo", "medio", "alto", "reforzado"].includes((item.risk ?? "").toLowerCase())
            ? (item.risk?.toLowerCase() as "bajo" | "medio" | "alto" | "reforzado")
            : "bajo"),
          proporcionalidad: false,
          purposesPrimary: [],
          purposesSecondary: [],
        }));

        replaceAllPersonalData(newData);
        setFileToProcess(null);
        setFileColumns([]);
        setSelectedNameColumn("");
        setSelectedCategoryColumn("");
        setSelectedRiskColumn("none");
      } catch (error) {
        alert("Ocurrió un error al procesar el archivo.");
      }
    }
  };
  // -------------------------------------------------------------

  const handleAddSub = () => {
    setFormData({
      ...formData,
      subInventories: [
        ...formData.subInventories,
        { ...defaultSubInventory(), id: Date.now().toString() }
      ]
    })
  }
  const handleRemoveSub = (idx: number) => {
    if (formData.subInventories.length === 1) return
    const newSubs = formData.subInventories.filter((_, i) => i !== idx)
    setFormData({ ...formData, subInventories: newSubs })
    if (activeSub >= newSubs.length) setActiveSub(newSubs.length - 1)
  }
  const handleChangeSubName = (idx: number, value: string) => {
    const newSubs = [...formData.subInventories]
    newSubs[idx].databaseName = value
    setFormData({ ...formData, subInventories: newSubs })
  }

  // Handlers para fields de subInventories
  const updateSub = (changes: Partial<SubInventory>) => {
    setFormData((prev) => {
      const arr = [...prev.subInventories]
      const current = arr[activeSub]
      if (!current) return prev
      const merged = sanitizeSubInventoryPurposes({
        ...current,
        ...changes,
      } as SubInventory)
      arr[activeSub] = merged
      return { ...prev, subInventories: arr }
    })
  }

  const updatePersonalData = (
    updater: (current: PersonalData[]) => PersonalData[],
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const existing = Array.isArray(current.personalData)
        ? current.personalData
        : []
      const updatedPersonalData = sanitizePersonalDataEntries(updater(existing))
      subs[activeSub] = sanitizeSubInventoryPurposes({
        ...current,
        personalData: updatedPersonalData,
      } as SubInventory)
      return { ...prev, subInventories: subs }
    })
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => updateSub({ [e.target.name]: e.target.value } as any)

  const handleCheckboxChange = (val: string, field: keyof SubInventory) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      const arr = (current[field] as string[]) || []
      subs[activeSub] = {
        ...current,
        [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
      } as any
      return { ...prev, subInventories: subs }
    })
  }

  const handleSelectChange = (name: keyof SubInventory, value: any) => {
    if (name === "responsibleArea") {
      updateSub({
        [name]: value === "Otro" ? "" : value,
        showOtherResponsibleArea: value === "Otro",
      } as any)
    } else if (name === "obtainingMethod") {
      updateSub({
        [name]: value === "otro" ? "" : value,
        showOtherObtainingMethod: value === "otro",
      } as any)
    } else if (name === "processingArea") {
      updateSub({
        [name]: value === "Otro" ? "" : value,
        showOtherProcessingArea: value === "Otro",
      } as any)
    } else if (name === "backupResponsible") {
      updateSub({
        [name]: value === "otros" ? "" : value,
        showOtherBackupResponsible: value === "otros",
      } as any)
    } else if (name === "conservationTerm") {
      updateSub({
        [name]: value === "Indefinido u otro (conservación sin eliminación)" ? "" : value,
        showOtherConservationTerm:
          value === "Indefinido u otro (conservación sin eliminación)",
      } as any)
    } else if (name === "blockingTime") {
      updateSub({
        [name]:
          value === "Indefinido u otro (conservación sin eliminación)" ? "" : value,
        showOtherBlockingTime:
          value === "Indefinido u otro (conservación sin eliminación)",
      } as any)
    } else if (name === "storageMethod") {
      updateSub({
        [name]: value,
        otherStorageMethod: value === "Otro" ? "" : undefined,
      } as any)
      } else if (name === "consentType") {
      updateSub({
        consentType: value,
        consentMechanism: "",
      } as any)
    } else if (name === "secondaryConsentType") {
      updateSub({
        secondaryConsentType: value,
        secondaryConsentMechanism: "",
      } as any)
    } else {
      updateSub({ [name]: value } as any)
    }
  }

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof SubInventory
  ) => {
    const inputFiles = e.target.files
    if (!inputFiles || inputFiles.length === 0) return

    const currentSub = formData.subInventories[activeSub]
    const metadata = { title: currentSub?.databaseName || "" }

    if (field === "privacyNoticeFiles") {
      if (!currentSub) return

      const selectedFiles = Array.from(inputFiles)
      const existingFiles = Array.isArray(currentSub.privacyNoticeFiles)
        ? currentSub.privacyNoticeFiles
        : []
      const existingNames = Array.isArray(currentSub.privacyNoticeFileNames)
        ? currentSub.privacyNoticeFileNames
        : []
      const existingIds = Array.isArray(currentSub.privacyNoticeFileIds)
        ? currentSub.privacyNoticeFileIds
        : currentSub.privacyNoticeFileId
          ? [currentSub.privacyNoticeFileId]
          : []

      const mergedFiles = [...existingFiles, ...selectedFiles]
      const mergedNames = [...existingNames, ...selectedFiles.map((file) => file.name)]

      updateSub({
        privacyNoticeFiles: mergedFiles,
        privacyNoticeFileNames: mergedNames,
        privacyNoticeFileName: mergedNames.length ? mergedNames.join(", ") : undefined,
        privacyNoticeFile: mergedFiles[0],
      } as any)

      const uploadIds = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            const stored = await saveFile(file, metadata, "privacy-notice")
            return stored.id
          } catch (error) {
            console.error("Error al guardar aviso de privacidad", error)
            return null
          }
        })
      )

      const newIds = uploadIds.filter((id): id is string => Boolean(id))
      const mergedIds = [...existingIds, ...newIds]

      updateSub({
        privacyNoticeFileIds: mergedIds,
        privacyNoticeFileId: mergedIds[0],
      } as any)

      e.target.value = ""
      return
    }

    const file = inputFiles[0]
    if (!file) return

    updateSub({ [field]: file, [`${field}Name`]: file.name } as any)

    let category = ""
    if (field === "privacyNoticeFile") {
      category = "privacy-notice"
    } else if (field === "consentFile") {
      category = "consent"
    } else if (field === "transferConsentFile") {
      category = "transfer-consent"
    } else if (field === "transferContractFile") {
      category = "transfer-contract"
    } else if (field === "remissionContractFile") {
      category = "remission-contract"
    }

    if (category) {
      try {
        const stored = await saveFile(file, metadata, category)
        updateSub({ [`${field}Id`]: stored.id } as any)
      } catch (error) {
        console.error("Error al guardar archivo", error)
      }
    }

    e.target.value = ""
  }


  const handlePersonalDataChange = (
    id: string,
    field: keyof PersonalData,
    value: string | boolean | string[],
  ) => {
    updatePersonalData((data) =>
      data.map((d) =>
        d.id === id ? ({ ...d, [field]: value } as PersonalData) : d,
      ),
    )
  }
  const handleAddPersonalData = () => {
    const pd: PersonalData = {
      id: Date.now().toString(),
      name: "",
      category: "Sin categoría",
      proporcionalidad: true,
      riesgo: "bajo",
      purposesPrimary: [],
      purposesSecondary: [],
    }
    updatePersonalData((data) => [...data, pd])
  }
  const handleRemovePersonalData = (id: string) =>
    updatePersonalData((data) => data.filter((d) => d.id !== id))

  const replaceAllPersonalData = (newData: PersonalData[]) => {
    updatePersonalData(() =>
      newData.map((d) => ({
        ...d,
        category: d.category || "Sin categoría",
      })),
    )
  }

  // ----- Accesos Adicionales -----
    const addAdditionalArea = () => {
      const subs = [...formData.subInventories]
      const sub = subs[activeSub]
      const newAccess: AdditionalAccess = {
        id: Date.now().toString(),
        area: "",
        showOtherArea: false,
        privileges: [],
        otherPrivilege: "",
      }
      subs[activeSub] = {
        ...sub,
        additionalAccesses: [...sub.additionalAccesses, newAccess],
      }
      setFormData({ ...formData, subInventories: subs })
    }

  const removeAdditionalArea = (idx: number) => {
    const subs = [...formData.subInventories]
    const sub = subs[activeSub]
    subs[activeSub] = {
      ...sub,
      additionalAccesses: sub.additionalAccesses.filter((_, i) => i !== idx),
    }
    setFormData({ ...formData, subInventories: subs })
  }

  const handleAdditionalAreaSelect = (idx: number, value: string) => {
    const subs = [...formData.subInventories]
    const sub = subs[activeSub]
    const accesses = [...sub.additionalAccesses]
    const acc = { ...accesses[idx] }
    if (value === "Otro") {
      acc.area = ""
      acc.showOtherArea = true
    } else {
      acc.area = value
      acc.showOtherArea = false
    }
    accesses[idx] = acc
    subs[activeSub] = { ...sub, additionalAccesses: accesses }
    setFormData({ ...formData, subInventories: subs })
  }

  const handleAdditionalAreaInput = (
    idx: number,
    field: keyof AdditionalAccess,
    value: string
  ) => {
    const subs = [...formData.subInventories]
    const sub = subs[activeSub]
    const accesses = [...sub.additionalAccesses]
    accesses[idx] = { ...accesses[idx], [field]: value }
    subs[activeSub] = { ...sub, additionalAccesses: accesses }
    setFormData({ ...formData, subInventories: subs })
  }

  const handleAdditionalAreaCheckbox = (idx: number, value: string) => {
    const subs = [...formData.subInventories]
    const sub = subs[activeSub]
    const accesses = [...sub.additionalAccesses]
    const list = accesses[idx].privileges
    accesses[idx].privileges = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value]
    subs[activeSub] = { ...sub, additionalAccesses: accesses }
    setFormData({ ...formData, subInventories: subs })
  }

  const addExtraConservation = () => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const conservations = [...(current.additionalConservations || [])]
      conservations.push(defaultAdditionalConservation())
      subs[activeSub] = { ...current, additionalConservations: conservations }
      return { ...prev, subInventories: subs }
    })
  }

  const updateExtraConservation = (
    idx: number,
    field: keyof AdditionalConservation,
    value: any,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const conservations = [...(current.additionalConservations || [])]
      if (!conservations[idx]) return prev
      conservations[idx] = {
        ...conservations[idx],
        [field]: value,
      } as AdditionalConservation
      subs[activeSub] = { ...current, additionalConservations: conservations }
      return { ...prev, subInventories: subs }
    })
  }

  const removeExtraConservation = (idx: number) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const conservations = (current.additionalConservations || []).filter((_, i) => i !== idx)
      subs[activeSub] = { ...current, additionalConservations: conservations }
      return { ...prev, subInventories: subs }
    })
  }

  const toggleExtraConservationJustification = (
    idx: number,
    value: string,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev

      const conservations = [...(current.additionalConservations || [])]
      const target = conservations[idx]
      if (!target) return prev

      const currentList = target.justification || []
      const nextList = currentList.includes(value)
        ? currentList.filter((item) => item !== value)
        : [...currentList, value]

      conservations[idx] = { ...target, justification: nextList }
      subs[activeSub] = { ...current, additionalConservations: conservations }
      return { ...prev, subInventories: subs }
    })
  }

  const addExtraBlocking = () => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const blockings = [...(current.additionalBlockings || [])]
      blockings.push(defaultAdditionalBlocking())
      subs[activeSub] = { ...current, additionalBlockings: blockings }
      return { ...prev, subInventories: subs }
    })
  }

  const updateExtraBlocking = (
    idx: number,
    field: keyof AdditionalBlocking,
    value: any,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const blockings = [...(current.additionalBlockings || [])]
      if (!blockings[idx]) return prev
      blockings[idx] = {
        ...blockings[idx],
        [field]: value,
      } as AdditionalBlocking
      subs[activeSub] = { ...current, additionalBlockings: blockings }
      return { ...prev, subInventories: subs }
    })
  }

  const removeExtraBlocking = (idx: number) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const blockings = (current.additionalBlockings || []).filter((_, i) => i !== idx)
      subs[activeSub] = { ...current, additionalBlockings: blockings }
      return { ...prev, subInventories: subs }
    })
  }

  const toggleExtraBlockingPrescription = (idx: number, value: string) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev

      const blockings = [...(current.additionalBlockings || [])]
      const target = blockings[idx]
      if (!target) return prev

      const currentList = target.prescription || []
      const nextList = currentList.includes(value)
        ? currentList.filter((item) => item !== value)
        : [...currentList, value]

      blockings[idx] = { ...target, prescription: nextList }
      subs[activeSub] = { ...current, additionalBlockings: blockings }
      return { ...prev, subInventories: subs }
    })
  }

  const addExtraTransfer = () => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const transfers = [...(current.additionalTransfers || [])]
      transfers.push(defaultAdditionalTransfer())
      subs[activeSub] = { ...current, additionalTransfers: transfers }
      return { ...prev, subInventories: subs }
    })
  }

  const updateExtraTransfer = (
    idx: number,
    field: keyof AdditionalTransfer,
    value: any,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const transfers = [...(current.additionalTransfers || [])]
      if (!transfers[idx]) return prev
      transfers[idx] = { ...transfers[idx], [field]: value } as AdditionalTransfer
      subs[activeSub] = { ...current, additionalTransfers: transfers }
      return { ...prev, subInventories: subs }
    })
  }

  const toggleExtraTransferArray = (
    idx: number,
    field: "exceptions" | "legalInstrument",
    value: string,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const transfers = [...(current.additionalTransfers || [])]
      if (!transfers[idx]) return prev
      const list = transfers[idx][field] || []
      const nextList = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
      transfers[idx] = {
        ...transfers[idx],
        [field]: nextList,
      } as AdditionalTransfer
      subs[activeSub] = { ...current, additionalTransfers: transfers }
      return { ...prev, subInventories: subs }
    })
  }

  const removeExtraTransfer = (idx: number) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const transfers = (current.additionalTransfers || []).filter((_, i) => i !== idx)
      subs[activeSub] = { ...current, additionalTransfers: transfers }
      return { ...prev, subInventories: subs }
    })
  }

  const handleExtraTransferFileChange = async (
    idx: number,
    field: "consentFile" | "contractFile",
    file?: File | null,
  ) => {
    if (!file) return

    const nameField = field === "consentFile" ? "consentFileName" : "contractFileName"
    const idField = field === "consentFile" ? "consentFileId" : "contractFileId"

    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const transfers = [...(current.additionalTransfers || [])]
      if (!transfers[idx]) return prev
      transfers[idx] = {
        ...transfers[idx],
        [field]: file,
        [nameField]: file.name,
      } as AdditionalTransfer
      subs[activeSub] = { ...current, additionalTransfers: transfers }
      return { ...prev, subInventories: subs }
    })

    const metadata = {
      title: formData.subInventories[activeSub]?.databaseName || "",
    }
    const category = field === "consentFile" ? "transfer-consent" : "transfer-contract"

    try {
      const stored = await saveFile(file, metadata, category)
      setFormData((prev) => {
        const subs = [...prev.subInventories]
        const current = subs[activeSub]
        if (!current) return prev
        const transfers = [...(current.additionalTransfers || [])]
        if (!transfers[idx]) return prev
        transfers[idx] = {
          ...transfers[idx],
          [idField]: stored.id,
        } as AdditionalTransfer
        subs[activeSub] = { ...current, additionalTransfers: transfers }
        return { ...prev, subInventories: subs }
      })
    } catch (error) {
      console.error("Error al guardar archivo de transferencia adicional", error)
    }
  }

  const addExtraRemission = () => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const remissions = [...(current.additionalRemissions || [])]
      remissions.push(defaultAdditionalRemission())
      subs[activeSub] = { ...current, additionalRemissions: remissions }
      return { ...prev, subInventories: subs }
    })
  }

  const updateExtraRemission = (
    idx: number,
    field: keyof AdditionalRemission,
    value: any,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const remissions = [...(current.additionalRemissions || [])]
      if (!remissions[idx]) return prev
      remissions[idx] = {
        ...remissions[idx],
        [field]: value,
      } as AdditionalRemission
      subs[activeSub] = { ...current, additionalRemissions: remissions }
      return { ...prev, subInventories: subs }
    })
  }

  const toggleExtraRemissionArray = (
    idx: number,
    field: "purposes" | "legalInstrument",
    value: string,
  ) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const remissions = [...(current.additionalRemissions || [])]
      if (!remissions[idx]) return prev
      const list = remissions[idx][field] || []
      const nextList = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
      remissions[idx] = {
        ...remissions[idx],
        [field]: nextList,
      } as AdditionalRemission
      subs[activeSub] = { ...current, additionalRemissions: remissions }
      return { ...prev, subInventories: subs }
    })
  }

  const removeExtraRemission = (idx: number) => {
    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const remissions = (current.additionalRemissions || []).filter((_, i) => i !== idx)
      subs[activeSub] = { ...current, additionalRemissions: remissions }
      return { ...prev, subInventories: subs }
    })
  }

  const handleExtraRemissionFileChange = async (
    idx: number,
    file?: File | null,
  ) => {
    if (!file) return

    setFormData((prev) => {
      const subs = [...prev.subInventories]
      const current = subs[activeSub]
      if (!current) return prev
      const remissions = [...(current.additionalRemissions || [])]
      if (!remissions[idx]) return prev
      remissions[idx] = {
        ...remissions[idx],
        contractFile: file,
        contractFileName: file.name,
      } as AdditionalRemission
      subs[activeSub] = { ...current, additionalRemissions: remissions }
      return { ...prev, subInventories: subs }
    })

    const metadata = {
      title: formData.subInventories[activeSub]?.databaseName || "",
    }

    try {
      const stored = await saveFile(file, metadata, "remission-contract")
      setFormData((prev) => {
        const subs = [...prev.subInventories]
        const current = subs[activeSub]
        if (!current) return prev
        const remissions = [...(current.additionalRemissions || [])]
        if (!remissions[idx]) return prev
        remissions[idx] = {
          ...remissions[idx],
          contractFileId: stored.id,
        } as AdditionalRemission
        subs[activeSub] = { ...current, additionalRemissions: remissions }
        return { ...prev, subInventories: subs }
      })
    } catch (error) {
      console.error("Error al guardar archivo de remisión adicional", error)
    }
  }

  const handleNextStep = () => {
    setCompletedSteps((prev) => new Set([...prev, step]))
    setStep((s) => s + 1)
  }
  const handlePrevStep = () => setStep((s) => s - 1)

  const renderSubTabs = () =>
    step > 1 &&
    formData.subInventories.length > 1 && (
      <div className="w-full overflow-x-auto pb-2 mb-2">
        <div className="flex gap-2 min-w-[600px]">
          {formData.subInventories.map((si, idx) => (
            <Button
              key={si.id}
              size="sm"
              className={
                `${idx === activeSub
                  ? "bg-primary text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"} 
                  rounded-full 
                  whitespace-normal 
                  max-w-[90px] 
                  text-ellipsis 
                  overflow-hidden 
                  px-3 
                  text-center 
                  transition-all 
                  duration-150`
              }
              style={{
                lineHeight: "1.1",
                height: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={si.databaseName}
              onClick={() => {
                setActiveSub(idx);
                setStep(2);
              }}
            >
              {si.databaseName || `Base ${idx + 1}`}
            </Button>
          ))}
        </div>
      </div>
    )

  const handleSubmit = () => {
    const currentUserName =
      typeof window !== "undefined"
        ? localStorage.getItem("userName") || "Usuario actual"
        : "Usuario actual"
    const { inventories: updated } = prepareInventorySave({
      inventories,
      formData,
      editingInventoryId,
      actorName: currentUserName,
    })
    setInventories(updated)
    localStorage.setItem("inventories", JSON.stringify(updated))
    if (typeof window !== "undefined") {
      localStorage.removeItem("inventories_progress")
      window.dispatchEvent(new Event("inventory-progress-saved"))
    }
    resetForm()
    setEditingInventoryId(null)
    setMode("view")
  }

  return (
    <>
      {showInitialButtons && step <= 2 && (
        <div className="mb-4 flex gap-4 items-center">
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importingFull}
          >
            {importingFull ? "Importando..." : "Importar Excel completo"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFormData(defaultInventory())
              setActiveSub(0)
              setStep(1)
            }}
          >
            Nuevo inventario
          </Button>
          {hasProgress && (
            <Button
              variant="outline"
              onClick={handleContinueProgress}
              className="ml-2"
            >
              Continuar inventario
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFullImport}
          />
        </div>
      )}

      <StepperNav
        currentStep={step}
        onStepClick={setStep}
        completedSteps={completedSteps}
      />

      {step > 1 && renderSubTabs()}

      {step === 1 && (
        <>
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block">Nombre del Inventario</Label>
                  <Input
                    value={formData.databaseName}
                    onChange={(e) =>
                      setFormData({ ...formData, databaseName: e.target.value })
                    }
                    placeholder="Nombre general del inventario"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Responsable</Label>
                  <Input
                    value={formData.responsible || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, responsible: e.target.value })
                    }
                    placeholder="Persona o área responsable del inventario"
                  />
                </div>

                <div>
                  <Label className="mb-2 block">
                    Logo de la empresa responsable
                  </Label>
                  <div className="flex flex-col gap-4 rounded-lg border border-dashed border-muted-foreground/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                        {formData.companyLogoDataUrl || formData.companyLogoPublicPath ? (
                          <img
                            src={formData.companyLogoDataUrl || formData.companyLogoPublicPath}
                            alt="Logo de la empresa responsable"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="px-2 text-center text-xs text-muted-foreground">
                            Sin logo
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formData.companyLogoFileName ? (
                          <>
                            <p className="font-medium text-foreground">
                              {formData.companyLogoFileName}
                            </p>
                            <p>Este logo aparecerá en los reportes generados.</p>
                          </>
                        ) : (
                          <p>
                            Suba un archivo PNG, JPG o SVG para personalizar sus
                            informes.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={companyLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          handleCompanyLogoUpload(
                            event.target.files?.[0] ?? null
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => companyLogoInputRef.current?.click()}
                      >
                        {formData.companyLogoDataUrl || formData.companyLogoPublicPath
                          ? "Actualizar logo"
                          : "Subir logo"}
                      </Button>
                      {(formData.companyLogoDataUrl || formData.companyLogoPublicPath) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCompanyLogoUpload(null)}
                          aria-label="Eliminar logo de la empresa"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">
                    Color principal del reporte
                  </Label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.reportAccentColor || DEFAULT_REPORT_ACCENT_COLOR}
                        onChange={(event) =>
                          handleAccentColorChange(event.target.value)
                        }
                        className="h-12 w-16 cursor-pointer rounded border bg-white shadow-sm"
                        aria-label="Seleccionar color principal del reporte"
                      />
                      <span className="text-sm text-muted-foreground">
                        Este color se aplicará a los encabezados y gráficos del
                        informe.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Input
                        value={formData.reportAccentColor || DEFAULT_REPORT_ACCENT_COLOR}
                        onChange={(event) =>
                          handleAccentColorChange(event.target.value)
                        }
                        className="w-32 uppercase"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleAccentColorChange(DEFAULT_REPORT_ACCENT_COLOR)}
                      >
                        Restablecer
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">
                    Subinventarios / Bases de datos
                  </Label>
                  {formData.subInventories.map((sub, idx) => (
                    <div key={sub.id} className="mt-2 flex items-center gap-2">
                      <Input
                        value={sub.databaseName}
                        onChange={(e) => handleChangeSubName(idx, e.target.value)}
                        placeholder={`Nombre del subinventario #${idx + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSub(idx)}
                        disabled={formData.subInventories.length === 1}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={handleAddSub}
                  >
                    Agregar subinventario
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mb-6">
            <Button onClick={handleNextStep}>
              Siguiente
            </Button>
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {step > 1 && (
          <motion.div
            key={`${activeSub}-${step}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mt-4">
              <CardContent className="pt-6">
                <StepRenderer
                  step={step}
                  activeSub={activeSub}
                  setActiveSub={setActiveSub}
                  formData={formData}
                  handleIncompleteSection={(index) => {
                    setStep(index + 1)
                    setActiveSub(0)
                  } }
                  handleInputChange={handleInputChange}
                  handleFileChange={handleFileChange}
                  handleCheckboxChange={handleCheckboxChange}
                  handleSelectChange={handleSelectChange}
                  handlePersonalDataChange={handlePersonalDataChange}
                  handleAddPersonalData={handleAddPersonalData}
                  handleRemovePersonalData={handleRemovePersonalData}
                  handleFileSelection={handleFileSelection}
                  fileColumns={fileColumns}
                  selectedNameColumn={selectedNameColumn}
                  setSelectedNameColumn={setSelectedNameColumn}
                  selectedCategoryColumn={selectedCategoryColumn}
                  setSelectedCategoryColumn={setSelectedCategoryColumn}
                  selectedRiskColumn={selectedRiskColumn}
                  setSelectedRiskColumn={setSelectedRiskColumn}
                  overwriteCategories={overwriteCategories}
                  setOverwriteCategories={setOverwriteCategories}
                  overwriteRisk={overwriteRisk}
                  setOverwriteRisk={setOverwriteRisk}
                  processFileWithColumns={processFileWithColumns}
                  fileToProcess={!!fileToProcess}
                  replaceAllPersonalData={replaceAllPersonalData}
                  addAdditionalArea={addAdditionalArea}
                  removeAdditionalArea={removeAdditionalArea}
                  handleAdditionalAreaSelect={handleAdditionalAreaSelect}
                  handleAdditionalAreaInput={handleAdditionalAreaInput}
                  handleAdditionalAreaCheckbox={handleAdditionalAreaCheckbox}
                  addExtraConservation={addExtraConservation}
                  updateExtraConservation={updateExtraConservation}
                  toggleExtraConservationJustification={toggleExtraConservationJustification}
                  removeExtraConservation={removeExtraConservation}
                  addExtraBlocking={addExtraBlocking}
                  updateExtraBlocking={updateExtraBlocking}
                  toggleExtraBlockingPrescription={toggleExtraBlockingPrescription}
                  removeExtraBlocking={removeExtraBlocking}
                  addExtraTransfer={addExtraTransfer}
                  updateExtraTransfer={updateExtraTransfer}
                  toggleExtraTransferArray={toggleExtraTransferArray}
                  removeExtraTransfer={removeExtraTransfer}
                  handleExtraTransferFileChange={handleExtraTransferFileChange}
                  addExtraRemission={addExtraRemission}
                  updateExtraRemission={updateExtraRemission}
                  toggleExtraRemissionArray={toggleExtraRemissionArray}
                  removeExtraRemission={removeExtraRemission}
                  handleExtraRemissionFileChange={handleExtraRemissionFileChange}
                />
                <div className="flex justify-center mb-4">
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={progressSaved ? { scale: 1.08 } : { scale: 1 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 240 }}
                    className="w-full flex flex-col items-center"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      className="mb-2 mt-6"
                      onClick={handleSaveProgress}
                      style={{ minWidth: "200px" }}
                    >
                      Guardar progreso
                    </Button>
                    <AnimatePresence>
                      {progressSaved && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 0.45 }}
                          className="flex items-center gap-2 bg-green-100 text-green-900 px-5 py-2 rounded-lg shadow mt-1"
                        >
                          <CheckCircle className="h-5 w-5 text-green-700" />
                          <span>¡Progreso guardado exitosamente!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
                <div className="flex justify-between mt-6">
                  {step > 1 && (
                    <Button onClick={handlePrevStep} variant="outline">
                      Anterior
                    </Button>
                  )}
                  <Button
                    onClick={step < 13 ? handleNextStep : handleSubmit}
                    className="ml-auto"
                  >
                    {step < 13 ? "Siguiente" : "Guardar Inventario"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
