type OfficePreviewCandidate = {
  name: string
  type?: string
}

type TextPdfPreviewInput = {
  title: string
  sourceLabel?: string
  text: string
}

const OFFICE_PREVIEW_EXTENSIONS = new Set(["docx", "docm"])
const OFFICE_PREVIEW_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word.document.macroenabled.12",
])

function extensionFromName(name: string) {
  const lastSegment = name.split(/[\\/]/).pop() || name
  const dotIndex = lastSegment.lastIndexOf(".")
  return dotIndex >= 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : ""
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64")
  }

  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function textOrFallback(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  return normalized || "No se pudo extraer texto del documento. Descarga el archivo original para consultarlo completo."
}

export function canGenerateOfficePdfPreview(file: OfficePreviewCandidate) {
  const type = (file.type || "").toLowerCase()
  const extension = extensionFromName(file.name)
  return OFFICE_PREVIEW_EXTENSIONS.has(extension) || OFFICE_PREVIEW_MIME_TYPES.has(type)
}

export async function createTextPdfPreviewDataUrl(input: TextPdfPreviewInput) {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "letter" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 54
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 14
  let y = margin

  const addPageIfNeeded = (requiredHeight = lineHeight) => {
    if (y + requiredHeight <= pageHeight - margin) return
    pdf.addPage()
    y = margin
  }

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(14)
  const titleLines = pdf.splitTextToSize(input.title || "Vista previa", maxWidth)
  for (const line of titleLines) {
    addPageIfNeeded(18)
    pdf.text(line, margin, y)
    y += 18
  }

  if (input.sourceLabel) {
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    const sourceLines = pdf.splitTextToSize(input.sourceLabel, maxWidth)
    for (const line of sourceLines) {
      addPageIfNeeded(12)
      pdf.text(line, margin, y)
      y += 12
    }
  }

  y += 12
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(10)

  for (const paragraph of textOrFallback(input.text).split("\n")) {
    const lines = pdf.splitTextToSize(paragraph || " ", maxWidth)
    for (const line of lines) {
      addPageIfNeeded(lineHeight)
      pdf.text(line, margin, y)
      y += lineHeight
    }
    y += 5
  }

  const arrayBuffer = pdf.output("arraybuffer")
  return `data:application/pdf;base64,${arrayBufferToBase64(arrayBuffer)}`
}

export async function createOfficePdfPreviewDataUrl(file: File) {
  if (!canGenerateOfficePdfPreview(file) || typeof file.arrayBuffer !== "function") return undefined

  try {
    const mammothModule = await import("mammoth")
    const mammoth = (mammothModule.default || mammothModule) as typeof mammothModule
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })

    return createTextPdfPreviewDataUrl({
      title: file.name.replace(/\.[^.]+$/, ""),
      sourceLabel: file.name,
      text: result.value,
    })
  } catch (error) {
    console.warn("No se pudo generar el preview PDF del documento Office:", error)
    return undefined
  }
}
