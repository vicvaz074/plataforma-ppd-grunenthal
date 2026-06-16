import { createFileURL, type StoredFile } from "@/lib/fileStorage"

export type FilePreviewKind = "pdf" | "image" | "html" | "text" | "office" | "unsupported"

export type FilePreviewDescriptor = {
  title: string
  fileUrl: string
  previewUrl: string
  kind: FilePreviewKind
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

  if (type.includes("pdf") || extension === "pdf") return "pdf"
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) return "image"
  if (type.includes("html") || ["html", "htm"].includes(extension)) return "html"
  if (type.startsWith("text/") || ["txt", "csv", "json", "md"].includes(extension)) return "text"
  if (OFFICE_EXTENSIONS.has(extension)) return "office"

  return "unsupported"
}

function canEmbedKind(kind: FilePreviewKind) {
  return kind === "pdf" || kind === "image" || kind === "html" || kind === "text"
}

export function buildFilePreviewDescriptor(file: StoredFile): FilePreviewDescriptor {
  const kind = getFilePreviewKind(file)
  const fileUrl = createFileURL(file.content)
  const previewPath = typeof file.metadata?.previewPath === "string" ? file.metadata.previewPath : undefined
  const previewUrl = previewPath ? createFileURL(previewPath) : fileUrl
  const extension = getFileExtension(file).toUpperCase() || "ARCHIVO"
  const title =
    String(file.metadata?.noticeName || file.metadata?.title || file.metadata?.displayName || file.name || "Documento")

  return {
    title,
    fileUrl,
    previewUrl,
    kind,
    canEmbed: Boolean(previewPath) || canEmbedKind(kind),
    extension,
    downloadName: file.name || `${title}.${extension.toLowerCase()}`,
    sourceLabel: typeof file.metadata?.sourceRelativePath === "string" ? file.metadata.sourceRelativePath : undefined,
  }
}
