import type { Inventory, PersonalData, SubInventory } from "../types"
import type { ParsedRatSubInventory } from "./parseRatExcel"
import {
  createDefaultInventory,
  createDefaultSubInventory,
  normalizeInventoryForForm,
} from "./inventory-normalization"

type RatImportOptions = {
  id?: string
  now?: string
  baseInventory?: Partial<Inventory>
  inventoryIdFactory?: () => string
  subInventoryIdFactory?: (index: number) => string
}

const cleanText = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  return String(value).replace(/\s+/g, " ").trim()
}

const importedPersonalData = (
  data: Partial<PersonalData> | Record<string, unknown>,
  subId: string,
  index: number,
): PersonalData => ({
  id: cleanText(data.id) || `${subId}-dato-${index + 1}`,
  name: cleanText(data.name),
  category: cleanText(data.category) || "Sin categoría",
  proporcionalidad: data.proporcionalidad as boolean,
  riesgo: (data.riesgo as PersonalData["riesgo"]) || "bajo",
  purposesPrimary: Array.isArray(data.purposesPrimary)
    ? data.purposesPrimary
    : (data.purposesPrimary as any),
  purposesSecondary: Array.isArray(data.purposesSecondary)
    ? data.purposesSecondary
    : (data.purposesSecondary as any),
})

export const createSubInventoriesFromRatImport = (
  parsed: ParsedRatSubInventory[],
  options: Pick<RatImportOptions, "subInventoryIdFactory"> = {},
): SubInventory[] =>
  parsed.map((sub, index) => {
    const defaultSub = createDefaultSubInventory(index)
    const subId =
      cleanText(sub.id) ||
      options.subInventoryIdFactory?.(index) ||
      `rat-import-sub-${index + 1}`

    return {
      ...defaultSub,
      ...sub,
      id: subId,
      databaseName: cleanText(sub.databaseName),
      personalData: (sub.personalData || []).map((data, dataIndex) =>
        importedPersonalData(data, subId, dataIndex),
      ),
      privacyNoticeFiles: [],
      privacyNoticeFileIds: [],
      privacyNoticeFileNames: [],
      privacyNoticeFile: undefined,
      privacyNoticeFileId: undefined,
      privacyNoticeFileName: undefined,
      consentFile: undefined,
      consentFileId: undefined,
      consentFileName: undefined,
      transferConsentFile: undefined,
      transferConsentFileId: undefined,
      transferConsentFileName: undefined,
      transferContractFile: undefined,
      transferContractFileId: undefined,
      transferContractFileName: undefined,
      remissionContractFile: undefined,
      remissionContractFileId: undefined,
      remissionContractFileName: undefined,
    } as SubInventory
  })

export const createInventoryFromRatImport = (
  parsed: ParsedRatSubInventory[],
  options: RatImportOptions = {},
): Inventory => {
  const now = options.now || new Date().toISOString()
  const subInventories = createSubInventoriesFromRatImport(parsed, options)
  const importedName =
    subInventories.length === 1
      ? subInventories[0]?.databaseName || "Inventario importado"
      : subInventories
          .map((sub) => sub.databaseName)
          .filter(Boolean)
          .join(" / ") || "Inventario importado"

  return normalizeInventoryForForm({
    ...createDefaultInventory(),
    ...options.baseInventory,
    id:
      options.id ||
      cleanText(options.baseInventory?.id) ||
      options.inventoryIdFactory?.() ||
      `inventory-${Date.now()}`,
    databaseName: importedName,
    subInventories,
    createdAt: cleanText(options.baseInventory?.createdAt) || now,
    updatedAt: now,
    status: "pendiente",
  })
}
