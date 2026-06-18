// app/rat/informes/page.tsx
"use client"

import React, { useState, useEffect, useMemo } from "react"
import type { Inventory, SubInventory, PersonalData } from "../types"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { useToast } from "@/components/ui/use-toast"
import { SafeLink } from "@/components/SafeLink"
import {
  ChevronLeft,
  Download,
  FileText,
  PieChartIcon,
  BarChartIcon,
  FileSpreadsheet,
} from "lucide-react"
import { motion } from "framer-motion"
import {
  DEFAULT_REPORT_ACCENT_COLOR,
  DEFAULT_REPORT_RESPONSIBLE,
  normalizeInventoryForForm,
} from "../utils/inventory-normalization"

// Etiquetas amigables para PDF
const FIELD_LABELS: Record<string, string> = {
  databaseName: "Nombre de la base de datos",
  responsibleArea: "Área responsable",
  holderTypes: "Tipo de titulares",
  obtainingMethod: "Método de obtención",
  obtainingSource: "Fuente de obtención",
  otherHolderType: "Otro tipo de titular",
  otherLegalBasis: "Otra base legal",
  privacyNoticeFileName: "Aviso de privacidad (archivo)",
  consentRequired: "¿Requiere consentimiento?",
  consentException: "Excepción de consentimiento",
  otherConsentException: "Otra excepción de consentimiento",
  consentMechanism: "Mecanismo de consentimiento",
  otherConsentMechanism: "Otro mecanismo de consentimiento",
  consentType: "Tipo de consentimiento",
  otherConsentType: "Otro tipo de consentimiento",
  consentFileName: "Consentimiento (archivo)",
  tacitDescription: "Descripción de consentimiento tácito",
  secondaryConsentType: "Tipo de consentimiento secundario",
  secondaryConsentMechanism: "Mecanismo de consentimiento secundario",
  secondaryTacitDescription: "Descripción de consentimiento tácito secundario",
  secondaryConsentFileName: "Consentimiento secundario (archivo)",
  secondaryExpresoForm: "Forma de consentimiento expreso secundario",
  secondaryExpresoEscritoForm: "Formulario expreso escrito secundario",
  processingArea: "Área de tratamiento",
  otherProcessingArea: "Otra área de tratamiento",
  processingSystem: "Sistema de tratamiento",
  processingSystemName: "Nombre del sistema de tratamiento",
  processingDescription: "Descripción tratamiento",
  accessDescription: "Descripción de acceso",
  otherAccessDescription: "Otra descripción de acceso",
  dataLifecyclePrivileges: "Privilegios del ciclo de vida",
  additionalAreas: "Áreas adicionales",
  additionalAreasAccess: "Accesos adicionales",
  otherAdditionalAreasAccess: "Otro acceso de áreas adicionales",
  additionalAreasLegalBasis: "Base legal áreas adicionales",
  otherAdditionalAreasLegalBasis: "Otra base legal áreas adicionales",
  additionalAreasLegalBasisFileName: "Áreas adicionales base legal (archivo)",
  additionalAreasPurposes: "Finalidades de áreas adicionales",
  otherAdditionalAreasPurposes: "Otras finalidades de áreas adicionales",
  storageMethod: "Medio de almacenamiento",
  otherStorageMethod: "Otro medio de almacenamiento",
  physicalLocation: "Ubicación física",
  isBackedUp: "¿Respaldado?",
  backupDescription: "Descripción respaldo",
  backupResponsible: "Responsable respaldo",
  conservationTerm: "Plazo de conservación",
  conservationJustification: "Justificación de conservación",
  otherConservationJustification: "Otra justificación de conservación",
  conservationJustificationDetail: "Detalle de justificación de conservación",
  conservationLegalBasis: "Base legal de conservación",
  processingTime: "Tiempo de tratamiento",
  postRelationshipProcessing: "Tratamiento posterior",
  legalConservation: "Conservación legal",
  otherLegalConservation: "Otra conservación legal",
  blockingTime: "Tiempo de bloqueo",
  legalPrescription: "Prescripción legal",
  otherLegalPrescription: "Otra prescripción legal",
  blockingLegalDisposition: "Disposición legal de bloqueo",
  deletionMethods: "Métodos de supresión",
  otherDeletionMethod: "Otro método de supresión",
  deletionMethod: "Método de supresión",
  dataTransfer: "¿Existe transferencia?",
  transferRecipient: "Tercero receptor",
  transferPurposes: "Finalidades de la transferencia",
  transferConsentRequired: "¿Requiere consentimiento para transferencia?",
  transferExceptions: "Excepciones de transferencia",
  transferConsentType: "Tipo de consentimiento transferencia",
  transferTacitDescription: "Descripción tácito de transferencia",
  transferExpresoForm: "Forma de consentimiento expreso de transferencia",
  transferOtherExpresoForm: "Otra forma de consentimiento expreso de transferencia",
  transferExpresoEscritoForm: "Formulario expreso escrito de transferencia",
  transferOtherExpresoEscritoForm: "Otro formulario expreso escrito de transferencia",
  transferConsentFileName: "Consentimiento transferencia (archivo)",
  transferLegalInstrument: "Instrumentos jurídicos",
  otherTransferLegalInstrument: "Otros instrumentos jurídicos",
  transferInAP: "¿La transferencia está en el AP?",
  dataRemission: "¿Existe remisión?",
  remissionRecipient: "Denominación social o nombre comercial",
  remissionPurposes: "Finalidades remisión",
  otherRemissionPurpose: "Otra finalidad de remisión",
  remissionContractFileName: "Evidencia remisión (archivo)",
  remissionLegalInstrument: "Instrumentos jurídicos remisión",
  otherRemissionLegalInstrument: "Otros instrumentos jurídicos remisión",
}

const SECTION_GROUPS = [
  {
    name: "Información General",
    fields: [
      "databaseName",
      "responsibleArea",
      "holderTypes",
      "holdersVolume",
      "accessibility",
      "environment",
    ],
  },
  {
    name: "Obtención de Datos",
    fields: ["obtainingMethod", "privacyNoticeFileName"],
  },
  {
    name: "Consentimiento",
    fields: [
      "consentRequired",
      "consentType",
      "consentMechanism",
      "consentException",
      "otherConsentException",
      "consentFileName",
    ],
  },
    {
      name: "tratamiento",
      fields: [
        "processingArea",
        "processingSystem",
        "processingDescription",
        "accessDescription",
      ],
    },
  {
    name: "Accesos y Almacenamiento",
    fields: [
      "storageMethod",
      "physicalLocation",
      "isBackedUp",
      "backupDescription",
      "backupResponsible",
    ],
  },
  {
    name: "Retención y Supresión",
    fields: [
      "processingTime",
      "postRelationshipProcessing",
      "legalConservation",
      "blockingTime",
      "deletionMethod",
    ],
  },
  {
    name: "Transferencia",
    fields: [
      "dataTransfer",
      "transferRecipient",
      "transferPurposes",
      "transferConsentRequired",
      "transferConsentType",
      "transferConsentFileName",
      "transferLegalInstrument",
      "transferInAP",
    ],
  },
  {
    name: "Remisión",
    fields: [
      "dataRemission",
      "remissionRecipient",
      "remissionPurposes",
      "remissionLegalInstrument",
      "remissionContractFileName",
    ],
  },
]

const TRANSFER_SECTION_FIELDS = new Set(
  SECTION_GROUPS.find((section) => section.name === "Transferencia")?.fields || []
)

const REMISSION_SECTION_FIELDS = new Set(
  SECTION_GROUPS.find((section) => section.name === "Remisión")?.fields || []
)

const DEFAULT_ACCENT_COLOR = DEFAULT_REPORT_ACCENT_COLOR
const HEX_COLOR_REGEX = /^#?[0-9A-Fa-f]{6}$/

const normalizeHexColor = (value?: string | null): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!HEX_COLOR_REGEX.test(trimmed)) return null
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed
  return `#${withoutHash.toUpperCase()}`
}

const clampColor = (value: number) => Math.max(0, Math.min(255, value))

const lightenColor = (hex: string | undefined, amount = 0.2) => {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return DEFAULT_ACCENT_COLOR
  const numeric = parseInt(normalized.slice(1), 16)
  const r = clampColor(
    Math.round(((numeric >> 16) & 0xff) + (255 - ((numeric >> 16) & 0xff)) * amount)
  )
  const g = clampColor(
    Math.round(((numeric >> 8) & 0xff) + (255 - ((numeric >> 8) & 0xff)) * amount)
  )
  const b = clampColor(
    Math.round((numeric & 0xff) + (255 - (numeric & 0xff)) * amount)
  )
  const toHex = (component: number) => component.toString(16).padStart(2, "0").toUpperCase()
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const hexToRgb = (hex?: string | null) => {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  const numeric = parseInt(normalized.slice(1), 16)
  return {
    r: (numeric >> 16) & 0xff,
    g: (numeric >> 8) & 0xff,
    b: numeric & 0xff,
  }
}

type SupportedImageFormat = "PNG" | "JPEG" | "WEBP"

const getImageFormatFromDataUrl = (dataUrl?: string | null): SupportedImageFormat => {
  if (!dataUrl) return "PNG"
  const lower = dataUrl.slice(0, 32).toLowerCase()
  if (lower.includes("image/png")) return "PNG"
  if (lower.includes("image/jpeg") || lower.includes("image/jpg")) return "JPEG"
  if (lower.includes("image/webp")) return "WEBP"
  return "PNG"
}

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())

const PROCESSING_DESCRIPTION_MAP: Record<string, string> = {
  O: "Obtención",
  U: "Uso",
  D: "Divulgación",
  A: "Almacenamiento",
  B: "Bloqueo",
  S: "Supresión",
}

const formatValue = (key: string, value: any): string => {
  if (key === "processingDescription" && Array.isArray(value)) {
    const mapped = value.map((v) => PROCESSING_DESCRIPTION_MAP[v] || v)
    return mapped.length > 0 ? mapped.join(", ") : "No lo completó"
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "No lo completó"
    if (value.some((v) => typeof v === "object")) {
      return JSON.stringify(value)
    }
    return value.join(", ")
  }
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (value === undefined || value === null || value === "") return "No lo completó"
  if (typeof value === "object") {
    const keys = Object.keys(value)
    return keys.length ? JSON.stringify(value) : "No lo completó"
  }
  return String(value)
}

const hasUserResponse = (value: any) => {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value).length > 0
  return true
}

const getField = (obj: any, key: string) => {
  if (key.endsWith("FileName")) return obj[key] || "No subió archivo"
  return formatValue(key, obj[key])
}

export default function InformesPage() {
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [activeTab, setActiveTab] = useState<string>("summary")
  const { toast } = useToast()
  const [exporting, setExporting] = useState<boolean>(false)
  const [davaraLogoDataUrl, setDavaraLogoDataUrl] = useState<string | null>(null)

  const brandingSource = useMemo(() => {
    if (inventories.length === 0) return null
    return (
      inventories.find(
        (inv) => inv.companyLogoDataUrl || inv.companyLogoPublicPath || inv.reportAccentColor || inv.responsible
      ) || inventories[0]
    )
  }, [inventories])

  const accentColor = useMemo(() => {
    return normalizeHexColor(brandingSource?.reportAccentColor) || DEFAULT_ACCENT_COLOR
  }, [brandingSource?.reportAccentColor])

  const fallbackAccentRgb =
    hexToRgb(DEFAULT_ACCENT_COLOR) || { r: 64, g: 187, b: 106 }
  const accentRgb = hexToRgb(accentColor) || fallbackAccentRgb
  const accentLight = lightenColor(accentColor, 0.35)
  const accentLightRgb = hexToRgb(accentLight) || fallbackAccentRgb

  const chartColors = useMemo(
    () => [
      accentColor,
      lightenColor(accentColor, 0.2),
      lightenColor(accentColor, 0.35),
      lightenColor(accentColor, 0.5),
      "#22c55e",
      "#f97316",
      "#0ea5e9",
      "#facc15",
    ],
    [accentColor]
  )
  const companyLogo =
    brandingSource?.companyLogoDataUrl || brandingSource?.companyLogoPublicPath || null
  const responsibleName = brandingSource?.responsible || DEFAULT_REPORT_RESPONSIBLE

  // Load saved inventories
  useEffect(() => {
    const saved = localStorage.getItem("inventories")
    if (saved) {
      try {
        setInventories((JSON.parse(saved) as Inventory[]).map(normalizeInventoryForForm))
      } catch (err) {
        console.error("Failed to parse inventories", err)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false

    const loadDavaraLogo = async () => {
      try {
        const response = await fetch("/images/davara_logo.png")
        if (!response.ok) return
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          if (!cancelled) {
            setDavaraLogoDataUrl(reader.result as string)
          }
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        console.error("No se pudo cargar el logo de Davara", error)
      }
    }

    loadDavaraLogo()

    return () => {
      cancelled = true
    }
  }, [])

  // Flatten sub-inventories and collect all personal data
  const subRows: Array<{ sub: SubInventory; parentCreatedAt?: string }> = inventories.flatMap(
    (inv: Inventory) =>
      inv.subInventories.map((si: SubInventory) => ({
        sub: si,
        parentCreatedAt: inv.createdAt,
      }))
  )
  const allData: PersonalData[] = subRows.flatMap(({ sub }) => sub.personalData)

  // Compute the highest-risk label per sub-inventory
  const computeRisk = (si: SubInventory): "Bajo" | "Medio" | "Alto" | "Reforzado" => {
    const levelMap: Record<string, number> = { bajo: 1, medio: 2, alto: 3, reforzado: 4 }
    let max = 1
    si.personalData.forEach((pd: PersonalData) => {
      const val = levelMap[pd.riesgo] ?? 1
      if (val > max) max = val
    })
    return max === 4
      ? "Reforzado"
      : max === 3
      ? "Alto"
      : max === 2
      ? "Medio"
      : "Bajo"
  }

  // Distribution helpers
  const getRiskDistribution = (): { name: string; value: number; color: string }[] => {
    const counts: Record<"Bajo" | "Medio" | "Alto" | "Reforzado", number> = {
      Bajo: 0,
      Medio: 0,
      Alto: 0,
      Reforzado: 0,
    }
    subRows.forEach(({ sub }) => {
      counts[computeRisk(sub)]++
    })
    return [
      { name: "Bajo", value: counts.Bajo, color: "#10b981" },
      { name: "Medio", value: counts.Medio, color: "#f59e0b" },
      { name: "Alto", value: counts.Alto, color: "#ef4444" },
      { name: "Reforzado", value: counts.Reforzado, color: "#7f1d1d" },
    ]
  }

  const getCommonPersonalData = (): { name: string; count: number }[] => {
    const tally: Record<string, number> = {}
    allData.forEach((pd: PersonalData) => {
      const nm = pd.name.trim()
      if (nm) tally[nm] = (tally[nm] || 0) + 1
    })
    return Object.entries(tally)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const getCategoryDistribution = (): { name: string; value: number; percentage: number }[] => {
    const tally: Record<string, number> = {}
    allData.forEach((pd: PersonalData) => {
      const cat = pd.category || "No especificada"
      tally[cat] = (tally[cat] || 0) + 1
    })
    const total = allData.length
    return Object.entries(tally)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "bajo":
        return "bg-green-100 text-green-800"
      case "medio":
        return "bg-yellow-100 text-yellow-800"
      case "alto":
        return "bg-orange-100 text-orange-800"
      case "reforzado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Generate PDF report
  const generateReport = async () => {
    try {
      await new Promise((res) => setTimeout(res, 500))
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const tableWidth = pageWidth - 28
      let headerBaseline = 26

      if (brandingSource?.companyLogoDataUrl) {
        try {
          const companyLogoFormat = getImageFormatFromDataUrl(
            brandingSource.companyLogoDataUrl
          )
          doc.addImage(
            brandingSource.companyLogoDataUrl,
            companyLogoFormat,
            14,
            12,
            30,
            18,
            undefined,
            "FAST"
          )
          headerBaseline = 38
        } catch (error) {
          console.error("No se pudo añadir el logo de la empresa", error)
        }
      }

      if (davaraLogoDataUrl) {
        try {
          doc.addImage(davaraLogoDataUrl, "PNG", pageWidth - 44, 12, 30, 18, undefined, "FAST")
          headerBaseline = Math.max(headerBaseline, 38)
        } catch (error) {
          console.error("No se pudo añadir el logo de Davara", error)
        }
      }

      doc.setFontSize(22)
      doc.setTextColor(44, 62, 80)
      doc.text(
        "Informe de Inventario de Bases de Datos",
        pageWidth / 2,
        headerBaseline,
        { align: "center" }
      )
      const separatorY = headerBaseline + 4
      doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
      doc.setLineWidth(0.8)
      doc.line(14, separatorY, pageWidth - 14, separatorY)

      let yPos = separatorY + 8

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(
        `Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        14,
        yPos
      )
      yPos += 6
      if (brandingSource?.responsible) {
        doc.text(`Responsable: ${brandingSource.responsible}`, 14, yPos)
        yPos += 6
      }
      if (brandingSource?.databaseName) {
        doc.text(`Inventario principal: ${brandingSource.databaseName}`, 14, yPos)
        yPos += 6
      }
      yPos += 4

      doc.setFontSize(16)
      doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
      doc.text("Resumen General", 14, yPos)
      yPos += 8
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text(`Total de bases de datos: ${subRows.length}`, 14, yPos)
      yPos += 7
      doc.text(`Total de datos personales: ${allData.length}`, 14, yPos)
      yPos += 9

      const riskDist = getRiskDistribution()
      doc.text("Distribución por nivel de riesgo:", 14, yPos)
      yPos += 7
      riskDist.forEach((item) => {
        if (item.value > 0) {
          const pct = Math.round((item.value / subRows.length) * 100)
          doc.text(`- ${item.name}: ${item.value} (${pct}%)`, 20, yPos)
          yPos += 7
        }
      })

      const categoryDist = getCategoryDistribution().slice(0, 5)
      if (categoryDist.length > 0) {
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text("Top categorías de datos personales:", 14, yPos + 5)
        yPos += 12
        const maxVal = Math.max(...categoryDist.map((c) => c.value))
        categoryDist.forEach((cat) => {
          const barWidth = maxVal ? (cat.value / maxVal) * 60 : 0
          doc.setFillColor(accentLightRgb.r, accentLightRgb.g, accentLightRgb.b)
          doc.rect(20, yPos, barWidth, 6, "F")
          doc.setTextColor(0, 0, 0)
          doc.text(`${cat.name} (${cat.value})`, 22 + barWidth, yPos + 4)
          yPos += 8
        })
      }

      doc.setFontSize(16)
      doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
      doc.text("Lista de bases de datos", 14, yPos + 10)
      yPos += 20
      doc.setFontSize(10)
      doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
      doc.rect(14, yPos, tableWidth, 8, "F")
      doc.setTextColor(255, 255, 255)
      doc.text("Base de datos", 16, yPos + 5)
      doc.text("Datos", 100, yPos + 5)
      doc.text("Riesgo", 130, yPos + 5)
      doc.text("Creación", 170, yPos + 5)
      yPos += 8

      subRows.forEach(({ sub, parentCreatedAt }, idx) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 24
          doc.setFontSize(10)
          doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
          doc.rect(14, yPos, tableWidth, 8, "F")
          doc.setTextColor(255, 255, 255)
          doc.text("Base de datos", 16, yPos + 5)
          doc.text("Datos", 100, yPos + 5)
          doc.text("Riesgo", 130, yPos + 5)
          doc.text("Creación", 170, yPos + 5)
          yPos += 8
        }
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(14, yPos, tableWidth, 8, "F")
        }
        doc.setTextColor(60, 60, 60)
        doc.text(sub.databaseName.substring(0, 30), 16, yPos + 5)
        doc.text(sub.personalData.length.toString(), 100, yPos + 5)
        doc.text(computeRisk(sub), 130, yPos + 5)
        doc.text(
          parentCreatedAt
            ? new Date(parentCreatedAt).toLocaleDateString()
            : "No disponible",
          170,
          yPos + 5
        )
        yPos += 8
      })

      subRows.forEach(({ sub, parentCreatedAt }) => {
        doc.addPage()
        doc.setFontSize(14)
        doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b)
        doc.text(`Base de datos: ${sub.databaseName || "-"}`, 14, 20)
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        doc.text(
          `Fecha de creación: ${
            parentCreatedAt
              ? new Date(parentCreatedAt).toLocaleDateString()
              : "No disponible"
          }`,
          14,
          28
        )

        const usedFields = new Set<string>()
        SECTION_GROUPS.forEach((section, sidx) => {
          const isTransferSection = section.name === "Transferencia"
          const isRemissionSection = section.name === "Remisión"

          if (isTransferSection) {
            const hasTransferData =
              hasUserResponse(sub.dataTransfer) ||
              section.fields.some(
                (key) => key !== "dataTransfer" && hasUserResponse((sub as any)[key])
              )
            if (!hasTransferData) return
          }

          if (isRemissionSection) {
            const hasRemissionData =
              hasUserResponse(sub.dataRemission) ||
              section.fields.some(
                (key) => key !== "dataRemission" && hasUserResponse((sub as any)[key])
              )
            if (!hasRemissionData) return
          }

          const sectionData: [string, string][] = []
          section.fields.forEach((key) => {
            if (hasUserResponse((sub as any)[key])) {
              sectionData.push([
                FIELD_LABELS[key] || humanize(key),
                getField(sub as any, key),
              ])
              usedFields.add(key)
            }
          })
          if (sectionData.length > 0) {
            autoTable(doc, {
              startY:
                (doc as any).lastAutoTable
                  ? (doc as any).lastAutoTable.finalY + 6
                  : 34 + sidx * 2,
              head: [[section.name, "Respuesta"]],
              body: sectionData,
              styles: { fontSize: 10, cellPadding: 2 },
              headStyles: {
                fillColor: [accentRgb.r, accentRgb.g, accentRgb.b],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 110 },
              },
              margin: { left: 14, right: 14 },
            })
          }
        })

        if (sub.additionalAccesses && sub.additionalAccesses.length > 0) {
          const accessRows = sub.additionalAccesses.map((acc) => [
            acc.area || "No especificó",
            acc.privileges && acc.privileges.length
              ? acc.privileges.join(", ")
              : "No especificó",
          ])
          autoTable(doc, {
            startY: (doc as any).lastAutoTable
              ? (doc as any).lastAutoTable.finalY + 6
              : 34,
            head: [["Área adicional", "Privilegios"]],
            body: accessRows,
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: {
              fillColor: [accentRgb.r, accentRgb.g, accentRgb.b],
              textColor: [255, 255, 255],
              fontSize: 11,
              fontStyle: "bold",
            },
            margin: { left: 14, right: 14 },
          })
        }

        const remaining = Object.keys(sub).filter((k) => {
          const isTransferField = k.startsWith("transfer")
          const isRemissionField = k.startsWith("remission")
          return (
            k !== "personalData" &&
            k !== "id" &&
            !usedFields.has(k) &&
            !k.startsWith("showOther") &&
            !k.endsWith("File") &&
            !k.endsWith("FileId") &&
            k !== "additionalTransfers" &&
            !(isTransferField && !TRANSFER_SECTION_FIELDS.has(k)) &&
            hasUserResponse((sub as any)[k])
          )
        })
        if (remaining.length > 0) {
          const otherData = remaining.map((k) => [
            FIELD_LABELS[k] || humanize(k),
            getField(sub as any, k),
          ])
          autoTable(doc, {
            startY: (doc as any).lastAutoTable
              ? (doc as any).lastAutoTable.finalY + 6
              : 34,
            head: [["Otros datos", "Respuesta"]],
            body: otherData,
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: {
              fillColor: [accentRgb.r, accentRgb.g, accentRgb.b],
              textColor: [255, 255, 255],
              fontSize: 11,
              fontStyle: "bold",
            },
            columnStyles: {
              0: { cellWidth: 70 },
              1: { cellWidth: 110 },
            },
            margin: { left: 14, right: 14 },
          })
        }

        if (sub.personalData && sub.personalData.length > 0) {
          autoTable(doc, {
            startY: (doc as any).lastAutoTable
              ? (doc as any).lastAutoTable.finalY + 8
              : 34,
            head: [
              [
                "Nombre",
                "Categoría",
                "Riesgo",
                "Proporcionalidad",
                "Primarias",
                "Secundarias",
              ],
            ],
            body: sub.personalData.map((d) => [
              d.name || "-",
              d.category || "-",
              d.riesgo?.toString().toUpperCase() || "-",
              d.proporcionalidad ? "Sí" : "No",
              d.purposesPrimary?.join(", ") || "-",
              d.purposesSecondary?.join(", ") || "-",
            ]),
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: {
              fillColor: [accentLightRgb.r, accentLightRgb.g, accentLightRgb.b],
              textColor: [0, 0, 0],
              fontSize: 10,
              fontStyle: "bold",
            },
            margin: { left: 14, right: 14 },
          })
        } else {
          const y = (doc as any).lastAutoTable
            ? (doc as any).lastAutoTable.finalY + 10
            : 34
          doc.setFontSize(9)
          doc.setTextColor(60, 60, 60)
          doc.text("No hay datos personales registrados.", 14, y)
        }
      })

      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Página ${i} de ${pageCount}`, 14, 290)
      }

      doc.save("informe_bases_rat.pdf")
      toast({ title: "Informe PDF generado" })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(error)
      toast({ title: "Error PDF", description: msg, variant: "destructive" })
    }
  }

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExporting(true)
      const XLSX = await import("xlsx-js-style")
      const data = subRows.map(({ sub, parentCreatedAt }) => ({
        "Base de datos": sub.databaseName,
        "Datos personales": sub.personalData.length,
        "Nivel de riesgo": computeRisk(sub),
        "Fecha de creación": parentCreatedAt
          ? new Date(parentCreatedAt).toLocaleDateString()
          : "No disponible",
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Bases")
      XLSX.writeFile(wb, "bases_rat.xlsx")
      toast({ title: "Exportado a Excel" })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(error)
      toast({ title: "Error Excel", description: msg, variant: "destructive" })
    } finally {
      setExporting(false)
    }
  }

  return (
    <motion.div
      className="py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <div className="flex flex-col gap-4">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <SafeLink href="./rat">
                <ChevronLeft className="h-4 w-4" /> Volver
              </SafeLink>
            </Button>
          </div>
          <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
            <div
              className="h-2 w-full"
              style={{
                backgroundImage: `linear-gradient(90deg, ${accentColor}, ${accentLight})`,
              }}
            />
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-foreground">
                  Informes de Inventario de Datos Personales
                </h1>
                <p className="mt-2 text-sm text-muted-foreground md:max-w-xl">
                  Visualice y genere informes sobre sus bases de datos (sub-inventarios)
                  con una presentación cuidada y profesional.
                </p>
                {responsibleName && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Responsable: <span className="font-semibold text-foreground">{responsibleName}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-4 md:flex-row">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-white/80 shadow-inner">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="Logo de la empresa responsable"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="px-2 text-center text-xs text-muted-foreground">
                        Sin logo
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Empresa responsable
                  </span>
                </div>
                <div className="hidden h-12 w-px bg-border md:block" />
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-white/80 shadow-inner">
                    <img
                      src="/images/davara_logo.png"
                      alt="Logo Davara"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Davara
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border bg-background/70 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" style={{ color: accentColor }} />
              <span>{subRows.length} bases registradas</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: accentColor }} />
              <span>{allData.length} datos personales</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={exportToExcel}
              variant="outline"
              disabled={exporting}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar a Excel"}
            </Button>
            <Button
              onClick={generateReport}
              className="text-white"
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
            >
              <Download className="h-4 w-4" />
              Generar Informe PDF
            </Button>
          </div>
        </div>

        {inventories.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                No hay inventarios registrados
              </h3>
              <p className="text-muted-foreground mb-4 text-center">
                Para generar informes, primero debe crear inventarios.
              </p>
              <Button asChild>
                <SafeLink href="./rat/registro">
                  Ir a Registro de Inventarios
                </SafeLink>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="mx-auto flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border bg-background/80 p-1 shadow-sm md:w-fit">
              {[
                { value: "summary", label: "Resumen" },
                { value: "risk", label: "Riesgo" },
                { value: "categories", label: "Categorías" },
                { value: "data", label: "Datos Comunes" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-xl px-4 py-2 text-sm transition-colors"
                  style={
                    activeTab === tab.value
                      ? { backgroundColor: accentColor, color: "#fff" }
                      : undefined
                  }
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* SUMMARY */}
            <TabsContent value="summary">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle style={{ color: accentColor }}>Resumen General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total de bases de datos
                      </p>
                      <p className="text-3xl font-bold">{subRows.length}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total de datos personales
                      </p>
                      <p className="text-3xl font-bold">{allData.length}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Promedio de datos por base
                      </p>
                      <p className="text-3xl font-bold">
                        {subRows.length
                          ? Math.round(allData.length / subRows.length)
                          : 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ color: accentColor }}>Niveles de riesgo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getRiskDistribution()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent = 0 }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={60}
                            dataKey="value"
                          >
                            {getRiskDistribution().map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* RISK */}
            <TabsContent value="risk">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: accentColor }}>
                      <BarChartIcon className="h-5 w-5" style={{ color: accentColor }} />
                      Riesgo por base de datos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={subRows.map(({ sub }) => ({
                            name: sub.databaseName,
                            valor:
                              computeRisk(sub) === "Reforzado"
                                ? 4
                                : computeRisk(sub) === "Alto"
                                ? 3
                                : computeRisk(sub) === "Medio"
                                ? 2
                                : 1,
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                        >
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis
                            domain={[0, 4]}
                            ticks={[1, 2, 3, 4]}
                            tickFormatter={(v) =>
                              v === 1
                                ? "Bajo"
                                : v === 2
                                ? "Medio"
                                : v === 3
                                ? "Alto"
                                : "Reforzado"}
                          />
                          <Tooltip
                            formatter={(v) =>
                              v === 1
                                ? "Bajo"
                                : v === 2
                                ? "Medio"
                                : v === 3
                                ? "Alto"
                                : "Reforzado"}
                          />
                          <Bar dataKey="valor" fill={accentColor} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ color: accentColor }}>
                      Inventarios por nivel de riesgo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-72 space-y-4">
                      {["reforzado", "alto", "medio", "bajo"].map((r) => (
                        <div key={r}>
                          <h3 className="flex items-center gap-2 font-semibold capitalize">
                            <Badge className={getRiskBadgeColor(r)}>{r}</Badge>
                          </h3>
                          <div className="space-y-1">
                            {subRows
                              .filter(({ sub }) => computeRisk(sub).toLowerCase() === r)
                              .map(({ sub }, idx) => (
                                <div key={idx} className="rounded-md bg-muted/50 p-2">
                                  <p className="font-medium">{sub.databaseName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {sub.personalData.length} datos
                                  </p>
                                </div>
                              ))}
                            {subRows.filter(({ sub }) => computeRisk(sub).toLowerCase() === r).length ===
                              0 && (
                              <p className="text-sm italic text-muted-foreground">
                                No hay bases con este nivel
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* CATEGORIES */}
            <TabsContent value="categories">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: accentColor }}>
                      <PieChartIcon className="h-5 w-5" style={{ color: accentColor }} />
                      Categorías más frecuentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getCategoryDistribution().slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 20, right: 40, left: 60, bottom: 20 }}
                        >
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="name" type="category" width={180} />
                          <Tooltip />
                          <Bar dataKey="value" fill={accentColor} radius={6} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ color: accentColor }}>Distribución porcentual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getCategoryDistribution().slice(0, 6)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, percent }) =>
                              `${name} (${((percent ?? 0) * 100).toFixed(1)}%)`
                            }
                          >
                            {getCategoryDistribution()
                              .slice(0, 6)
                              .map((entry, idx) => (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={chartColors[idx % chartColors.length]}
                                />
                              ))}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* DATA */}
            <TabsContent value="data">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle style={{ color: accentColor }}>
                      Datos personales más comunes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-72">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dato personal</TableHead>
                            <TableHead>Ocurrencias</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCommonPersonalData().map(({ name, count }) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell>{count}</TableCell>
                            </TableRow>
                          ))}
                          {getCommonPersonalData().length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center text-muted-foreground">
                                No hay datos personales registrados.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ color: accentColor }}>Detalle exportable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Utiliza las opciones de exportación para descargar un Excel con el
                      detalle de tus inventarios o genera un PDF con gráficos y tablas de
                      resumen personalizados con tu identidad visual.
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <FileText className="h-4 w-4" style={{ color: accentColor }} />
                        Informe PDF con resúmenes y detalle
                      </p>
                      <p className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" style={{ color: accentColor }} />
                        Exportación Excel de bases
                      </p>
                      <p className="flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" style={{ color: accentColor }} />
                        Gráficas de riesgo y categorías
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </motion.div>
  )

}
