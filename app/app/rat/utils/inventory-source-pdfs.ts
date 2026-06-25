import { createFileURL, type StoredFile } from "@/lib/fileStorage"
import type { Inventory, SubInventory } from "../types"

export type InventorySourcePdfDownload = {
  id: string
  subInventoryId: string
  subInventoryName: string
  url: string
  downloadName: string
}

const PDF_EXTENSION_PATTERN = /\.pdf(?:$|[?#])/i

const cleanFileNameSegment = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const buildFallbackPdfName = (databaseName: string) => {
  const fallbackSlug =
    databaseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "inventario"

  return `inventario-${fallbackSlug}.pdf`
}

export const getPdfFileNameFromSource = (source: string, fallbackTitle: string) => {
  const sourceWithoutQuery = source.split("#")[0]?.split("?")[0] || ""
  const candidate = cleanFileNameSegment(sourceWithoutQuery.split("/").filter(Boolean).pop() || "")

  return PDF_EXTENSION_PATTERN.test(candidate)
    ? candidate
    : buildFallbackPdfName(fallbackTitle)
}

const readSourcePdf = (
  subInventory: SubInventory,
  getStoredFileById: (id: string) => StoredFile | undefined,
) => {
  const storedFile = subInventory.grunenthalSourcePdfFileId
    ? getStoredFileById(subInventory.grunenthalSourcePdfFileId)
    : undefined
  const source = storedFile?.content || subInventory.grunenthalSourcePdfPath || ""

  if (!source || !PDF_EXTENSION_PATTERN.test(source)) {
    return null
  }

  try {
    const url = createFileURL(source)

    return {
      id:
        subInventory.grunenthalSourcePdfFileId ||
        `${subInventory.id || subInventory.databaseName}-source-pdf`,
      subInventoryId: subInventory.id,
      subInventoryName: subInventory.databaseName,
      url,
      downloadName: getPdfFileNameFromSource(
        source,
        storedFile?.name || subInventory.databaseName || "inventario",
      ),
    } satisfies InventorySourcePdfDownload
  } catch {
    return null
  }
}

export const collectInventorySourcePdfs = (
  inventory: Inventory,
  getStoredFileById: (id: string) => StoredFile | undefined = () => undefined,
) => {
  const seen = new Set<string>()

  return inventory.subInventories
    .map((subInventory) => readSourcePdf(subInventory, getStoredFileById))
    .filter((download): download is InventorySourcePdfDownload => {
      if (!download) return false
      const key = `${download.id}:${download.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

