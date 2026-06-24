import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { GRUNENTHAL_CLIENT_NAME } from "@/lib/grunenthal-assets"
import { GRUNENTHAL_LOGO_DATA_URL } from "@/lib/grunenthal-rat-data"
import type { StoredFile } from "@/lib/fileStorage"

const ACCENT_RGB: [number, number, number] = [64, 187, 106]
const LIGHT_ACCENT_RGB: [number, number, number] = [229, 248, 235]

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bDireccion General\b/gi, "Dirección General"],
  [/\bGrunenthal\b/gi, GRUNENTHAL_CLIENT_NAME],
]

const HOLDER_LABELS: Record<string, string> = {
  clientes_usuarios_finales: "Clientes / Usuarios finales",
  potenciales_clientes: "Potenciales clientes / Prospectos comerciales",
  empleados: "Empleados / Colaboradores actuales",
  candidatos: "Candidatos / Aspirantes",
  excolaboradores: "Excolaboradores / Jubilados",
  proveedores: "Proveedores / Contratistas / Prestadores de servicios",
  socios_comerciales: "Socios comerciales / Aliados estratégicos",
  accionistas: "Accionistas / Inversionistas",
  visitantes: "Visitantes / Personas que ingresan a instalaciones",
  usuarios_plataformas: "Usuarios de plataformas o aplicaciones digitales",
  suscriptores: "Suscriptores / Newsletters o campañas",
  participantes_eventos: "Participantes en eventos, sorteos o promociones",
  menores: "Menores de edad / Padres o tutores",
  pacientes: "Pacientes / Beneficiarios",
  estudiantes: "Estudiantes / Padres de familia / Docentes",
  consultores: "Consultores externos y profesionales de la salud",
  representantes_legales: "Representantes legales / Contactos de negocio",
  autoridades: "Autoridades o servidores públicos",
  terceros_referidos: "Terceros referidos por clientes o empleados",
}

const NOTICE_TYPE_LABELS: Record<string, string> = {
  integral: "Integral",
  simplificado: "Simplificado",
  corto: "Corto",
}

const AREA_LABELS: Record<string, string> = {
  recursos_humanos: "Recursos Humanos",
  marketing: "Marketing / Comunicación",
  ventas: "Ventas / Comercial",
  juridico: "Jurídico / Legal",
  tecnologia: "Tecnología / Sistemas",
  seguridad: "Seguridad / Recepción",
  compras: "Compras / Proveedores",
  medical: "Medical",
  comunicacion: "Comunicación",
  farmacovigilancia: "Farmacovigilancia",
}

const DISPOSITION_LABELS: Record<string, string> = {
  sitio_web: "Sitio web",
  formato_fisico: "Formato físico",
  contrato_formulario: "Contrato o formulario",
  antes_obtencion: "Antes de la obtención",
  consentimiento_expreso: "Consentimiento expreso",
}

export type PrivacyNoticeRecordPdfRow = {
  label: string
  value: string
  lines: string[]
}

export const normalizePrivacyNoticePdfText = (value: unknown): string => {
  const raw = value === null || value === undefined ? "" : String(value)
  const collapsed = raw.normalize("NFC").replace(/\s+/g, " ").trim()
  return TEXT_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    collapsed,
  )
}

export const buildPrivacyNoticeRecordPdfFileName = (noticeName: unknown): string => {
  const safeName = normalizePrivacyNoticePdfText(noticeName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")

  return `soporte_aviso_${safeName || "registro"}.pdf`
}

const formatDate = (value: unknown) => {
  if (!value) return "-"
  const normalized = normalizePrivacyNoticePdfText(value)
  const localDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (localDateMatch) {
    const [, year, month, day] = localDateMatch
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("es-MX")
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return normalized
  return date.toLocaleDateString("es-MX")
}

const formatList = (value: unknown, labels: Record<string, string>, other?: unknown) => {
  const values = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : []
  const formatted = values
    .map((entry) => normalizePrivacyNoticePdfText(labels[String(entry)] || entry))
    .filter(Boolean)

  const otherText = normalizePrivacyNoticePdfText(other)
  if (otherText) formatted.push(otherText)

  return formatted.length > 0 ? formatted.join(", ") : "-"
}

export const buildPrivacyNoticeRecordRows = (
  doc: Pick<jsPDF, "splitTextToSize">,
  notice: StoredFile,
  maxWidth: number,
): PrivacyNoticeRecordPdfRow[] => {
  const metadata = notice.metadata || {}
  const entries: [string, string][] = [
    ["Nombre del aviso", normalizePrivacyNoticePdfText(metadata.noticeName || metadata.title || notice.name) || "-"],
    [
      "Categorías de titulares",
      formatList(metadata.holderCategories || metadata.category, HOLDER_LABELS, metadata.holderCategoryOther || metadata.otherCategory),
    ],
    ["Tipo de aviso", formatList(metadata.noticeTypes, NOTICE_TYPE_LABELS, metadata.noticeTypeOther)],
    ["Área responsable", formatList(metadata.responsibleAreas, AREA_LABELS, metadata.responsibleAreaOther)],
    ["Versión", normalizePrivacyNoticePdfText(metadata.versionCode) || "Sin versión"],
    ["Fecha de emisión", formatDate(metadata.issueDate || notice.uploadDate)],
    ["Creado por", normalizePrivacyNoticePdfText(metadata.createdBy) || "Legal"],
    ["Última modificación", formatDate(metadata.lastUpdated || metadata.createdAt || notice.uploadDate)],
    ["Medio de puesta a disposición", formatList(metadata.dispositionMethods, DISPOSITION_LABELS, metadata.dispositionMethodOther)],
    ["Evidencia / soporte", normalizePrivacyNoticePdfText(metadata.evidenceNotes) || "Sin notas de evidencia"],
    [
      "Fuente documental",
      normalizePrivacyNoticePdfText(
        [
          metadata.sourceLabel,
          metadata.sourceRelativePath,
          metadata.sourceLineRange ? `líneas ${metadata.sourceLineRange}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ) || normalizePrivacyNoticePdfText(notice.name),
    ],
  ]

  return entries.map(([label, value]) => {
    const text = `${label}: ${value}`
    const lines = doc
      .splitTextToSize(text, maxWidth)
      .map((line: string) => normalizePrivacyNoticePdfText(line))

    return { label, value, lines }
  })
}

const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`${GRUNENTHAL_CLIENT_NAME} · Soporte de aviso de privacidad · Página ${pageNumber}`, pageWidth / 2, pageHeight - 12, {
    align: "center",
  })
}

export function generatePrivacyNoticeRecordPDF(notice: StoredFile) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - 40
  const noticeName = normalizePrivacyNoticePdfText(notice.metadata?.noticeName || notice.metadata?.title || notice.name)
  const rows = buildPrivacyNoticeRecordRows(doc, notice, contentWidth)

  doc.setFillColor(...LIGHT_ACCENT_RGB)
  doc.rect(0, 0, pageWidth, 42, "F")
  doc.setDrawColor(...ACCENT_RGB)
  doc.setLineWidth(1.2)
  doc.line(20, 42, pageWidth - 20, 42)

  try {
    doc.addImage(GRUNENTHAL_LOGO_DATA_URL, "PNG", 20, 14, 40, 21)
  } catch {
    doc.setFontSize(12)
    doc.setTextColor(...ACCENT_RGB)
    doc.text(GRUNENTHAL_CLIENT_NAME, 20, 26)
  }

  doc.setFontSize(23)
  doc.setTextColor(...ACCENT_RGB)
  doc.text("Soporte de aviso de privacidad", pageWidth / 2, 82, { align: "center" })

  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  const coverY = 96
  const coverLines = doc.splitTextToSize(noticeName || "Aviso de privacidad", contentWidth)
  doc.text(coverLines, pageWidth / 2, coverY, { align: "center" })

  doc.setFontSize(10)
  const authorLine = normalizePrivacyNoticePdfText(`Creado por: ${notice.metadata?.createdBy || "Legal"}`)
  doc.text(authorLine, pageWidth / 2, coverY + coverLines.length * 6 + 10, { align: "center" })

  addFooter(doc, 1)

  doc.addPage()
  addFooter(doc, 2)
  doc.setFontSize(16)
  doc.setTextColor(...ACCENT_RGB)
  doc.text("Registro documental", 20, 24)

  autoTable(doc, {
    startY: 34,
    head: [["Campo", "Detalle"]],
    body: rows.map((row) => [row.label, row.value]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: ACCENT_RGB,
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold" },
      1: { cellWidth: contentWidth - 48 },
    },
    margin: { left: 20, right: 20 },
  })

  doc.save(buildPrivacyNoticeRecordPdfFileName(noticeName))
}
