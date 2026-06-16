import { createFileURL, type StoredFile } from "@/lib/fileStorage"

export type FilePreviewKind = "pdf" | "image" | "html" | "text" | "office" | "json" | "unsupported"

export type FilePreviewDescriptor = {
  title: string
  fileUrl: string
  previewUrl: string
  kind: FilePreviewKind
  previewKind: FilePreviewKind
  canEmbed: boolean
  extension: string
  downloadName: string
  sourceLabel?: string
}

const OFFICE_EXTENSIONS = new Set(["doc", "docx", "docm", "xls", "xlsx", "ppt", "pptx"])

function extensionFromName(name: string) {
  const lastSegment = name.split(/[\\/]/).pop() || name
  const dotIndex = lastSegment.lastIndexOf(".")
  return dotIndex >= 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : ""
}

function extensionFromContent(content: string) {
  const cleanContent = content.split(/[?#]/)[0] || content
  return extensionFromName(cleanContent)
}

export function getFileExtension(file: Pick<StoredFile, "name" | "content">): string {
  return extensionFromName(file.name) || extensionFromContent(file.content)
}

export function getFilePreviewKind(file: Pick<StoredFile, "name" | "type" | "content">): FilePreviewKind {
  const type = (file.type || "").toLowerCase()
  const extension = getFileExtension(file)

  if (type.includes("json") || extension === "json") return "json"
  if (type.includes("pdf") || extension === "pdf") return "pdf"
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) return "image"
  if (type.includes("html") || ["html", "htm"].includes(extension)) return "html"
  if (type.startsWith("text/") || ["txt", "csv", "md"].includes(extension)) return "text"
  if (OFFICE_EXTENSIONS.has(extension)) return "office"

  return "unsupported"
}

function canEmbedKind(kind: FilePreviewKind) {
  return kind === "pdf" || kind === "image" || kind === "html" || kind === "text"
}

function stringMetadataValue(file: StoredFile, key: string) {
  const value = file.metadata?.[key]
  return typeof value === "string" && value.trim() ? value : undefined
}

function previewCandidateFor(file: StoredFile, fallbackUrl: string) {
  const previewPdfPath = stringMetadataValue(file, "previewPdfPath")
  const previewPdfDataUrl = stringMetadataValue(file, "previewPdfDataUrl")
  const previewPath = stringMetadataValue(file, "previewPath")

  if (previewPdfPath) {
    return {
      url: createFileURL(previewPdfPath),
      kind: "pdf" as FilePreviewKind,
      explicit: true,
    }
  }

  if (previewPdfDataUrl) {
    return {
      url: createFileURL(previewPdfDataUrl),
      kind: "pdf" as FilePreviewKind,
      explicit: true,
    }
  }

  if (previewPath) {
    const previewUrl = createFileURL(previewPath)
    return {
      url: previewUrl,
      kind: getFilePreviewKind({
        name: previewPath,
        type: stringMetadataValue(file, "previewMimeType") || "",
        content: previewPath,
      }),
      explicit: true,
    }
  }

  return {
    url: fallbackUrl,
    kind: getFilePreviewKind(file),
    explicit: false,
  }
}

export function buildFilePreviewDescriptor(file: StoredFile): FilePreviewDescriptor {
  const kind = getFilePreviewKind(file)
  const fileUrl = createFileURL(file.content)
  const preview = previewCandidateFor(file, fileUrl)
  const extension = getFileExtension(file).toUpperCase() || "ARCHIVO"
  const title =
    String(file.metadata?.noticeName || file.metadata?.title || file.metadata?.displayName || file.name || "Documento")

  return {
    title,
    fileUrl,
    previewUrl: preview.url,
    kind,
    previewKind: preview.kind,
    canEmbed: preview.kind !== "json" && canEmbedKind(preview.kind),
    extension,
    downloadName: file.name || `${title}.${extension.toLowerCase()}`,
    sourceLabel: typeof file.metadata?.sourceRelativePath === "string" ? file.metadata.sourceRelativePath : undefined,
  }
}

export function canOfferFilePreview(fileOrDescriptor: StoredFile | FilePreviewDescriptor) {
  if ("previewKind" in fileOrDescriptor) {
    return fileOrDescriptor.kind !== "json" && fileOrDescriptor.previewKind !== "json" && fileOrDescriptor.canEmbed
  }

  const descriptor = buildFilePreviewDescriptor(fileOrDescriptor)
  return canOfferFilePreview(descriptor)
}
