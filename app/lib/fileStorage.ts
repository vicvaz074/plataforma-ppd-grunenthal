// Servicio para almacenar archivos localmente usando localStorage
// Con soporte para cifrado en reposo via encrypted-storage

import { secureRandomId } from "@/lib/secure-random"
import { setEncrypted, getEncrypted } from "@/lib/encrypted-storage"
import { logAuditEvent } from "@/lib/audit-log"
import { canGenerateOfficePdfPreview, createOfficePdfPreviewDataUrl } from "@/lib/office-preview"

export interface StoredFile {
  id: string
  name: string
  type: string
  size: number
  content: string // Base64 encoded content
  uploadDate: string
  category: string // Ej: "privacy-notice", "consent", "transfer-consent", etc.
  metadata: Record<string, any> // Metadatos adicionales como título, descripción, etc.
}

type StoredFileInput = {
  id?: string
  name: string
  type: string
  size: number
  content: string
  category: string
  metadata?: Record<string, any>
  uploadDate?: string
}

const STORAGE_KEY = "storedFiles"

async function withGeneratedPreviewMetadata(file: File, metadata: Record<string, any>) {
  if (
    metadata.previewPdfPath ||
    metadata.previewPdfDataUrl ||
    metadata.previewPath ||
    !canGenerateOfficePdfPreview(file)
  ) {
    return metadata
  }

  const previewPdfDataUrl = await createOfficePdfPreviewDataUrl(file)
  if (!previewPdfDataUrl) return metadata

  return {
    ...metadata,
    previewPdfDataUrl,
    previewMimeType: "application/pdf",
    previewGeneratedFrom: "office-to-pdf",
  }
}

// Convertir un archivo a base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

// ─── Funciones con cifrado (requieren DEK) ──────────────────────────────────

/** Guardar archivo cifrado en localStorage */
export const saveFileEncrypted = async (
  file: File,
  dek: CryptoKey,
  metadata: Record<string, any> = {},
  category = "default",
): Promise<StoredFile> => {
  const content = await fileToBase64(file)
  const finalMetadata = await withGeneratedPreviewMetadata(file, metadata)
  const storedFile: StoredFile = {
    id: secureRandomId("stored-file"),
    name: file.name,
    type: file.type,
    size: file.size,
    content,
    uploadDate: new Date().toISOString(),
    category,
    metadata: finalMetadata,
  }

  const existingFiles = await getEncrypted<StoredFile[]>(STORAGE_KEY, dek, [])
  existingFiles.push(storedFile)
  await setEncrypted(STORAGE_KEY, existingFiles, dek)

  logAuditEvent("FILE_UPLOADED", finalMetadata.userEmail || "unknown", `Archivo subido: ${file.name} (${category})`)
  return storedFile
}

/** Obtener todos los archivos descifrados */
export const getAllFilesEncrypted = async (dek: CryptoKey): Promise<StoredFile[]> => {
  return getEncrypted<StoredFile[]>(STORAGE_KEY, dek, [])
}

/** Eliminar archivo (cifrado) */
export const deleteFileEncrypted = async (id: string, dek: CryptoKey): Promise<boolean> => {
  try {
    const allFiles = await getEncrypted<StoredFile[]>(STORAGE_KEY, dek, [])
    const updatedFiles = allFiles.filter((file) => file.id !== id)
    await setEncrypted(STORAGE_KEY, updatedFiles, dek)
    logAuditEvent("FILE_DELETED", "system", `Archivo eliminado: ${id}`)
    return true
  } catch (error) {
    console.error("Error al eliminar el archivo:", error)
    return false
  }
}

// ─── Funciones sin cifrado (compatibilidad hacia atrás) ─────────────────────

// Guardar un archivo en localStorage (sin cifrado)
export const saveFile = async (
  file: File,
  metadata: Record<string, any> = {},
  category = "default",
): Promise<StoredFile> => {
  try {
    const content = await fileToBase64(file)
    const finalMetadata = await withGeneratedPreviewMetadata(file, metadata)
    const storedFile: StoredFile = {
      id: secureRandomId("stored-file"),
      name: file.name,
      type: file.type,
      size: file.size,
      content,
      uploadDate: new Date().toISOString(),
      category: category,
      metadata: finalMetadata,
    }

    const existingFiles: StoredFile[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    existingFiles.push(storedFile)
    writeAllFiles(existingFiles)

    logAuditEvent("FILE_UPLOADED", finalMetadata.userEmail || "unknown", `Archivo subido: ${file.name} (${category})`)
    return storedFile
  } catch (error) {
    console.error("Error al guardar el archivo:", error)
    throw error
  }
}

// Obtener todos los archivos
export const getAllFiles = (): StoredFile[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
}

const writeAllFiles = (files: StoredFile[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"))
  }
}

export const saveStoredFileRecord = (input: StoredFileInput): StoredFile => {
  const storedFile: StoredFile = {
    id: input.id || secureRandomId("stored-file"),
    name: input.name,
    type: input.type,
    size: input.size,
    content: input.content,
    uploadDate: input.uploadDate || new Date().toISOString(),
    category: input.category,
    metadata: input.metadata || {},
  }

  const existingFiles = getAllFiles()
  existingFiles.push(storedFile)
  writeAllFiles(existingFiles)

  return storedFile
}

// Obtener archivos por categoría
export const getFilesByCategory = (category: string): StoredFile[] => {
  const allFiles = getAllFiles()
  return allFiles.filter((file) => file.category === category)
}

// Obtener un archivo por ID
export const getFileById = (id: string): StoredFile | undefined => {
  const allFiles = getAllFiles()
  return allFiles.find((file) => file.id === id)
}

// Eliminar un archivo
export const deleteFile = (id: string): boolean => {
  try {
    const allFiles = getAllFiles()
    const updatedFiles = allFiles.filter((file) => file.id !== id)
    writeAllFiles(updatedFiles)
    logAuditEvent("FILE_DELETED", "system", `Archivo eliminado: ${id}`)
    return true
  } catch (error) {
    console.error("Error al eliminar el archivo:", error)
    return false
  }
}

// Actualizar metadatos de un archivo
export const updateFileMetadata = (id: string, metadata: Record<string, any>): boolean => {
  try {
    const allFiles = getAllFiles()
    const fileIndex = allFiles.findIndex((file) => file.id === id)

    if (fileIndex === -1) {
      console.error("Archivo no encontrado:", id)
      return false
    }

    // Crear una copia profunda del archivo
    const updatedFile = JSON.parse(JSON.stringify(allFiles[fileIndex]))

    // Actualizar los metadatos
    updatedFile.metadata = {
      ...updatedFile.metadata,
      ...metadata,
    }

    // Actualizar el array de archivos
    allFiles[fileIndex] = updatedFile

    // Guardar en localStorage
    writeAllFiles(allFiles)

    return true
  } catch (error) {
    console.error("Error al actualizar metadatos del archivo:", error)
    return false
  }
}

// Actualizar el contenido de un archivo existente
export const updateFile = async (
  id: string,
  file: File,
  metadata: Record<string, any> = {},
): Promise<boolean> => {
  try {
    const allFiles = getAllFiles()
    const fileIndex = allFiles.findIndex((f) => f.id === id)

    if (fileIndex === -1) {
      console.error("Archivo no encontrado:", id)
      return false
    }

    const content = await fileToBase64(file)
    const finalMetadata = await withGeneratedPreviewMetadata(file, {
      ...allFiles[fileIndex].metadata,
      ...metadata,
    })

    const updatedFile: StoredFile = {
      ...allFiles[fileIndex],
      name: file.name,
      type: file.type,
      size: file.size,
      content,
      metadata: finalMetadata,
    }

    allFiles[fileIndex] = updatedFile
    writeAllFiles(allFiles)
    return true
  } catch (error) {
    console.error("Error al actualizar el archivo:", error)
    return false
  }
}

// Crear una URL para visualizar el archivo
export const createFileURL = (fileContent: string): string => {
  const content = fileContent.trim()

  if (content.startsWith("data:") || content.startsWith("blob:")) {
    return content
  }

  if (content.startsWith("/client/grunenthal/") && !content.includes("..")) {
    return content
  }

  throw new Error("URL de archivo no permitida")
}

export const fileStorage = {
  fileToBase64,
  saveFile,
  saveFileEncrypted,
  saveStoredFileRecord,
  getAllFiles,
  getAllFilesEncrypted,
  getFilesByCategory,
  getFileById,
  deleteFile,
  deleteFileEncrypted,
  updateFile,
  updateFileMetadata,
  createFileURL,
}
