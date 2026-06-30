import type {
  AdditionalAccess,
  AdditionalBlocking,
  AdditionalConservation,
  AdditionalRemission,
  AdditionalTransfer,
  Inventory,
  PersonalData,
  SubInventory,
} from "../types"
import { GRUNENTHAL_CLIENT_NAME, GRUNENTHAL_LOGO } from "@/lib/grunenthal-assets"
import { GRUNENTHAL_LOGO_DATA_URL } from "@/lib/grunenthal-rat-data"

type LooseRecord = Record<string, unknown>
type NormalizedRisk = PersonalData["riesgo"]

export const DEFAULT_REPORT_ACCENT_COLOR = "#40BB6A"
export const DEFAULT_REPORT_RESPONSIBLE = GRUNENTHAL_CLIENT_NAME
export const DEFAULT_REPORT_LOGO_FILE_NAME = "Grünenthal_logo_green.png"
export const DEFAULT_REPORT_LOGO_PUBLIC_PATH = GRUNENTHAL_LOGO.path
export const DEFAULT_REPORT_LOGO_DATA_URL = GRUNENTHAL_LOGO_DATA_URL

const isRecord = (value: unknown): value is LooseRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const cleanText = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  return String(value).replace(/\s+/g, " ").trim()
}

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const normalizedKey = (value: unknown) =>
  stripAccents(cleanText(value)).toLowerCase()

const uniqueCleanTextList = (values: unknown[]): string[] => {
  const seen = new Set<string>()
  return values.reduce<string[]>((acc, raw) => {
    const trimmed = cleanText(raw)
    const key = normalizedKey(trimmed)
    if (!trimmed || seen.has(key)) return acc
    seen.add(key)
    acc.push(trimmed)
    return acc
  }, [])
}

const splitTextList = (value: unknown): string[] => {
  const source = Array.isArray(value) ? value : [value]
  const values = source.flatMap((item) =>
    typeof item === "string" ? item.split(/[,;\n]/g) : [cleanText(item)],
  )

  return uniqueCleanTextList(values)
}

const PURPOSE_LABEL_PATTERN = /^[A-ZÁÉÍÓÚÜÑ][^:\n]{2,80}:\s+\S/u
const PURPOSE_CONTINUATION_AFTER_PERIOD_PATTERN =
  /^(?:asi|e|en su caso|incluyendo|mediante|o|para|u|y)\b/

const looksLikeLabeledPurpose = (value: string) =>
  PURPOSE_LABEL_PATTERN.test(value.trim())

const shouldJoinPurposeFragment = (base: string, fragment: string) => {
  const normalizedFragment = normalizedKey(fragment)
  if (!normalizedFragment) return false
  if (!/[.!?]$/.test(cleanText(base))) return true
  return PURPOSE_CONTINUATION_AFTER_PERIOD_PATTERN.test(normalizedFragment)
}

const joinPurposeFragments = (base: string, fragment: string) =>
  `${base.trimEnd()} ${fragment.trimStart()}`
    .replace(/[ \t]+/g, " ")
    .trim()

const restorePurposeFragments = (purposes: string[]): string[] => {
  let activeLabeledPurposeIndex = -1

  return purposes.reduce<string[]>((rows, purpose) => {
    if (looksLikeLabeledPurpose(purpose)) {
      rows.push(purpose)
      activeLabeledPurposeIndex = rows.length - 1
      return rows
    }

    if (
      activeLabeledPurposeIndex >= 0 &&
      shouldJoinPurposeFragment(rows[activeLabeledPurposeIndex], purpose)
    ) {
      rows[activeLabeledPurposeIndex] = joinPurposeFragments(
        rows[activeLabeledPurposeIndex],
        purpose,
      )
      return rows
    }

    rows.push(purpose)
    activeLabeledPurposeIndex = -1
    return rows
  }, [])
}

const splitPurposeList = (value: unknown): string[] => {
  const isStoredList = Array.isArray(value)
  const source = isStoredList ? value : [value]
  const values = source.flatMap((item) => {
    if (typeof item !== "string") return [cleanText(item)]
    return isStoredList ? [item] : item.split(/[;\n]/g)
  })

  return restorePurposeFragments(uniqueCleanTextList(values))
}

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value
  const key = normalizedKey(value)
  if (["si", "true", "1", "yes"].includes(key)) return true
  if (["no", "false", "0"].includes(key)) return false
  return fallback
}

const toYesNo = (value: unknown): string => {
  const key = normalizedKey(value)
  if (key === "si" || key === "yes" || key === "true" || key === "1") return "si"
  if (key === "no" || key === "false" || key === "0") return "no"
  return cleanText(value)
}

const normalizeRisk = (value: unknown): NormalizedRisk => {
  const key = normalizedKey(value)
  if (["reforzado", "alto", "medio", "bajo"].includes(key)) {
    return key as NormalizedRisk
  }
  return "bajo"
}

const generatedId = (prefix: string, index = 0) => `${prefix}-${index + 1}`

const toFile = (value: unknown): File | undefined => {
  if (typeof File !== "undefined" && value instanceof File) return value
  return undefined
}

const fileList = (value: unknown): File[] =>
  Array.isArray(value) ? value.flatMap((item) => {
    const file = toFile(item)
    return file ? [file] : []
  }) : []

export const createDefaultPersonalData = (index = 0): PersonalData => ({
  id: generatedId("personal-data", index),
  name: "",
  category: "Sin categoría",
  proporcionalidad: true,
  riesgo: "bajo",
  purposesPrimary: [],
  purposesSecondary: [],
})

export const createDefaultAdditionalAccess = (index = 0): AdditionalAccess => ({
  id: generatedId("additional-access", index),
  area: "",
  showOtherArea: false,
  privileges: [],
  otherPrivilege: "",
  role: "",
  otherRole: "",
})

const createDefaultAdditionalTransfer = (): AdditionalTransfer => ({
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

const createDefaultAdditionalRemission = (): AdditionalRemission => ({
  recipient: "",
  purposes: [],
  otherPurpose: "",
  legalInstrument: [],
  otherLegalInstrument: "",
  contractFile: undefined,
  contractFileId: undefined,
  contractFileName: undefined,
})

const createDefaultAdditionalConservation = (): AdditionalConservation => ({
  term: "",
  showOtherTerm: false,
  justification: [],
  legalBasis: "",
  otherJustification: "",
  detail: "",
})

const createDefaultAdditionalBlocking = (): AdditionalBlocking => ({
  time: "",
  showOtherTime: false,
  prescription: [],
  otherPrescription: "",
  disposition: "",
})

export const createDefaultSubInventory = (index = 0): SubInventory => ({
  id: generatedId("sub-inventory", index),
  databaseName: "",
  holderTypes: [],
  otherHolderType: "",
  otherLegalBasis: "",
  holdersVolume: "",
  accessibility: "",
  environment: "",
  responsibleArea: "",
  showOtherResponsibleArea: false,
  obtainingMethod: "",
  showOtherObtainingMethod: false,
  obtainingSource: "",
  otherConsentException: "",
  otherConsentMechanism: "",
  otherConsentType: "",
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
  otherProcessingArea: "",
  showOtherProcessingArea: false,
  processingSystem: "",
  processingSystemName: "",
  processingDescription: [],
  accessDescription: [],
  otherAccessDescription: "",
  dataLifecyclePrivileges: "",
  additionalAccesses: [createDefaultAdditionalAccess()],
  additionalAreas: [],
  additionalAreasAccess: [],
  otherAdditionalAreasAccess: "",
  showOtherAdditionalAreasAccess: false,
  additionalAreasLegalBasis: [],
  otherAdditionalAreasLegalBasis: "",
  additionalAreasLegalBasisFile: undefined,
  additionalAreasLegalBasisFileId: undefined,
  additionalAreasLegalBasisFileName: undefined,
  additionalAreasPurposes: [],
  otherAdditionalAreasPurposes: "",
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
  showOtherProcessingTime: false,
  processingTime: "",
  postRelationshipProcessing: "",
  legalConservation: [],
  otherLegalConservation: "",
  deletionMethods: [],
  otherDeletionMethod: "",
  deletionMethod: "",
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
  additionalTransfers: [],
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
  personalData: [createDefaultPersonalData()],
})

export const createDefaultInventory = (): Inventory => ({
  id: `inventory-${Date.now()}`,
  databaseName: "",
  responsible: DEFAULT_REPORT_RESPONSIBLE,
  companyLogoDataUrl: DEFAULT_REPORT_LOGO_DATA_URL,
  companyLogoFileName: DEFAULT_REPORT_LOGO_FILE_NAME,
  companyLogoPublicPath: DEFAULT_REPORT_LOGO_PUBLIC_PATH,
  reportAccentColor: DEFAULT_REPORT_ACCENT_COLOR,
  subInventories: [createDefaultSubInventory()],
  riskLevel: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: "",
  updatedBy: "",
  status: "pendiente",
})

const normalizePersonalData = (value: unknown, index: number): PersonalData => {
  const source = isRecord(value) ? value : {}
  return {
    ...createDefaultPersonalData(index),
    ...source,
    id: cleanText(source.id) || generatedId("personal-data", index),
    name: cleanText(source.name),
    category: cleanText(source.category) || "Sin categoría",
    proporcionalidad: toBoolean(source.proporcionalidad, true),
    riesgo: normalizeRisk(source.riesgo),
    purposesPrimary: splitPurposeList(source.purposesPrimary),
    purposesSecondary: splitPurposeList(source.purposesSecondary),
  }
}

const normalizeAdditionalAccess = (value: unknown, index: number): AdditionalAccess => {
  const source = isRecord(value) ? value : {}
  return {
    ...createDefaultAdditionalAccess(index),
    ...source,
    id: cleanText(source.id) || generatedId("additional-access", index),
    area: cleanText(source.area),
    showOtherArea: toBoolean(source.showOtherArea, false),
    privileges: splitTextList(source.privileges),
    otherPrivilege: cleanText(source.otherPrivilege),
    role: cleanText(source.role),
    otherRole: cleanText(source.otherRole),
  }
}

const normalizeAdditionalTransfer = (value: unknown): AdditionalTransfer => {
  const source = isRecord(value) ? value : {}
  return {
    ...createDefaultAdditionalTransfer(),
    ...source,
    recipient: cleanText(source.recipient),
    purposes: cleanText(source.purposes),
    consentRequired: toBoolean(source.consentRequired, false),
    consentType: cleanText(source.consentType),
    tacitDescription: cleanText(source.tacitDescription),
    expresoForm: cleanText(source.expresoForm),
    expresoEscritoForm: cleanText(source.expresoEscritoForm),
    consentFile: toFile(source.consentFile),
    consentFileId: cleanText(source.consentFileId) || undefined,
    consentFileName: cleanText(source.consentFileName) || undefined,
    contractFile: toFile(source.contractFile),
    contractFileId: cleanText(source.contractFileId) || undefined,
    contractFileName: cleanText(source.contractFileName) || undefined,
    exceptions: splitTextList(source.exceptions),
    legalInstrument: splitTextList(source.legalInstrument),
    otherLegalInstrument: cleanText(source.otherLegalInstrument),
    inAP: toBoolean(source.inAP, false),
  }
}

const normalizeAdditionalRemission = (value: unknown): AdditionalRemission => {
  const source = isRecord(value) ? value : {}
  return {
    ...createDefaultAdditionalRemission(),
    ...source,
    recipient: cleanText(source.recipient),
    purposes: splitTextList(source.purposes),
    otherPurpose: cleanText(source.otherPurpose),
    legalInstrument: splitTextList(source.legalInstrument),
    otherLegalInstrument: cleanText(source.otherLegalInstrument),
    contractFile: toFile(source.contractFile),
    contractFileId: cleanText(source.contractFileId) || undefined,
    contractFileName: cleanText(source.contractFileName) || undefined,
  }
}

const normalizeAdditionalConservation = (value: unknown): AdditionalConservation => {
  const source = isRecord(value) ? value : {}
  return {
    ...createDefaultAdditionalConservation(),
    ...source,
    term: cleanText(source.term),
    showOtherTerm: toBoolean(source.showOtherTerm, false),
    justification: splitTextList(source.justification),
    legalBasis: cleanText(source.legalBasis),
    otherJustification: cleanText(source.otherJustification),
    detail: cleanText(source.detail),
  }
}

const normalizeAdditionalBlocking = (value: unknown): AdditionalBlocking => {
  const source = isRecord(value) ? value : {}
  return {
    ...createDefaultAdditionalBlocking(),
    ...source,
    time: cleanText(source.time),
    showOtherTime: toBoolean(source.showOtherTime, false),
    prescription: splitTextList(source.prescription),
    otherPrescription: cleanText(source.otherPrescription),
    disposition: cleanText(source.disposition),
  }
}

const normalizeSecondaryConsent = (value: unknown): SubInventory["secondaryPurposesConsent"] => {
  if (!isRecord(value)) return {}

  return Object.entries(value).reduce<SubInventory["secondaryPurposesConsent"]>((acc, [purpose, raw]) => {
    if (!isRecord(raw)) return acc
    const normalizedPurpose = cleanText(purpose)
    if (!normalizedPurpose) return acc
    acc[normalizedPurpose] = {
      consentType: cleanText(raw.consentType),
      consentMechanism: cleanText(raw.consentMechanism),
      exceptions: splitTextList(raw.exceptions),
    }
    return acc
  }, {})
}

export const normalizeSubInventoryForForm = (
  value: Partial<SubInventory> | LooseRecord,
  index = 0,
): SubInventory => {
  const source = isRecord(value) ? value : {}
  const normalized: SubInventory = {
    ...createDefaultSubInventory(index),
    ...source,
    id: cleanText(source.id) || generatedId("sub-inventory", index),
    databaseName: cleanText(source.databaseName),
    holderTypes: splitTextList(source.holderTypes),
    otherHolderType: cleanText(source.otherHolderType),
    otherLegalBasis: cleanText(source.otherLegalBasis),
    holdersVolume: cleanText(source.holdersVolume),
    accessibility: cleanText(source.accessibility),
    environment: cleanText(source.environment),
    responsibleArea: cleanText(source.responsibleArea),
    showOtherResponsibleArea: toBoolean(source.showOtherResponsibleArea, false),
    obtainingMethod: cleanText(source.obtainingMethod),
    showOtherObtainingMethod: toBoolean(source.showOtherObtainingMethod, false),
    obtainingSource: cleanText(source.obtainingSource),
    otherConsentException: cleanText(source.otherConsentException),
    otherConsentMechanism: cleanText(source.otherConsentMechanism),
    otherConsentType: cleanText(source.otherConsentType),
    privacyNoticeFiles: fileList(source.privacyNoticeFiles),
    privacyNoticeFileIds: splitTextList(source.privacyNoticeFileIds),
    privacyNoticeFileNames: splitTextList(source.privacyNoticeFileNames),
    privacyNoticeFile: toFile(source.privacyNoticeFile),
    privacyNoticeFileId: cleanText(source.privacyNoticeFileId) || undefined,
    privacyNoticeFileName: cleanText(source.privacyNoticeFileName) || undefined,
    consentFile: toFile(source.consentFile),
    consentFileId: cleanText(source.consentFileId) || undefined,
    consentFileName: cleanText(source.consentFileName) || undefined,
    transferConsentFile: toFile(source.transferConsentFile),
    transferConsentFileId: cleanText(source.transferConsentFileId) || undefined,
    transferConsentFileName: cleanText(source.transferConsentFileName) || undefined,
    transferContractFile: toFile(source.transferContractFile),
    transferContractFileId: cleanText(source.transferContractFileId) || undefined,
    transferContractFileName: cleanText(source.transferContractFileName) || undefined,
    consentRequired: toBoolean(source.consentRequired, true),
    consentException: splitTextList(source.consentException),
    consentMechanism: cleanText(source.consentMechanism),
    consentType: cleanText(source.consentType),
    tacitDescription: cleanText(source.tacitDescription),
    secondaryConsentType: cleanText(source.secondaryConsentType),
    secondaryConsentMechanism: cleanText(source.secondaryConsentMechanism),
    secondaryTacitDescription: cleanText(source.secondaryTacitDescription),
    secondaryConsentFile: toFile(source.secondaryConsentFile),
    secondaryConsentFileId: cleanText(source.secondaryConsentFileId) || undefined,
    secondaryConsentFileName: cleanText(source.secondaryConsentFileName) || undefined,
    secondaryExpresoForm: cleanText(source.secondaryExpresoForm),
    secondaryExpresoEscritoForm: cleanText(source.secondaryExpresoEscritoForm),
    secondaryPurposesConsent: normalizeSecondaryConsent(source.secondaryPurposesConsent),
    processingArea: splitTextList(source.processingArea),
    otherProcessingArea: cleanText(source.otherProcessingArea),
    showOtherProcessingArea: toBoolean(source.showOtherProcessingArea, false),
    processingSystem: cleanText(source.processingSystem),
    processingSystemName: cleanText(source.processingSystemName),
    processingDescription: splitTextList(source.processingDescription),
    accessDescription: splitTextList(source.accessDescription),
    otherAccessDescription: cleanText(source.otherAccessDescription),
    dataLifecyclePrivileges: cleanText(source.dataLifecyclePrivileges),
    additionalAccesses: Array.isArray(source.additionalAccesses)
      ? source.additionalAccesses.map(normalizeAdditionalAccess)
      : [createDefaultAdditionalAccess()],
    additionalAreas: splitTextList(source.additionalAreas),
    additionalAreasAccess: splitTextList(source.additionalAreasAccess),
    otherAdditionalAreasAccess: cleanText(source.otherAdditionalAreasAccess),
    showOtherAdditionalAreasAccess: toBoolean(source.showOtherAdditionalAreasAccess, false),
    additionalAreasLegalBasis: splitTextList(source.additionalAreasLegalBasis),
    otherAdditionalAreasLegalBasis: cleanText(source.otherAdditionalAreasLegalBasis),
    additionalAreasLegalBasisFile: toFile(source.additionalAreasLegalBasisFile),
    additionalAreasLegalBasisFileId: cleanText(source.additionalAreasLegalBasisFileId) || undefined,
    additionalAreasLegalBasisFileName: cleanText(source.additionalAreasLegalBasisFileName) || undefined,
    additionalAreasPurposes: splitTextList(source.additionalAreasPurposes),
    otherAdditionalAreasPurposes: cleanText(source.otherAdditionalAreasPurposes),
    storageMethod: cleanText(source.storageMethod),
    otherStorageMethod: cleanText(source.otherStorageMethod),
    physicalLocation: cleanText(source.physicalLocation),
    backupPeriodicity: cleanText(source.backupPeriodicity),
    isBackedUp: toBoolean(source.isBackedUp, false),
    backupDescription: cleanText(source.backupDescription),
    backupResponsible: cleanText(source.backupResponsible),
    showOtherBackupResponsible: toBoolean(source.showOtherBackupResponsible, false),
    conservationTerm: cleanText(source.conservationTerm),
    showOtherConservationTerm: toBoolean(source.showOtherConservationTerm, false),
    conservationJustification: splitTextList(source.conservationJustification),
    otherConservationJustification: cleanText(source.otherConservationJustification),
    conservationJustificationDetail: cleanText(source.conservationJustificationDetail),
    conservationLegalBasis: cleanText(source.conservationLegalBasis),
    blockingTime: cleanText(source.blockingTime),
    showOtherBlockingTime: toBoolean(source.showOtherBlockingTime, false),
    legalPrescription: splitTextList(source.legalPrescription),
    otherLegalPrescription: cleanText(source.otherLegalPrescription),
    blockingLegalDisposition: cleanText(source.blockingLegalDisposition),
    additionalConservations: Array.isArray(source.additionalConservations)
      ? source.additionalConservations.map(normalizeAdditionalConservation)
      : [],
    additionalBlockings: Array.isArray(source.additionalBlockings)
      ? source.additionalBlockings.map(normalizeAdditionalBlocking)
      : [],
    showOtherProcessingTime: toBoolean(source.showOtherProcessingTime, false),
    processingTime: cleanText(source.processingTime),
    postRelationshipProcessing: cleanText(source.postRelationshipProcessing),
    legalConservation: splitTextList(source.legalConservation),
    otherLegalConservation: cleanText(source.otherLegalConservation),
    deletionMethods: splitTextList(source.deletionMethods),
    otherDeletionMethod: cleanText(source.otherDeletionMethod),
    deletionMethod: cleanText(source.deletionMethod),
    dataTransfer: toYesNo(source.dataTransfer),
    transferRecipient: cleanText(source.transferRecipient),
    transferPurposes: cleanText(source.transferPurposes),
    transferConsentRequired: toBoolean(source.transferConsentRequired, false),
    transferExceptions: splitTextList(source.transferExceptions),
    transferConsentType: cleanText(source.transferConsentType),
    transferTacitDescription: cleanText(source.transferTacitDescription),
    transferExpresoForm: cleanText(source.transferExpresoForm),
    transferOtherExpresoForm: cleanText(source.transferOtherExpresoForm),
    transferExpresoEscritoForm: cleanText(source.transferExpresoEscritoForm),
    transferOtherExpresoEscritoForm: cleanText(source.transferOtherExpresoEscritoForm),
    transferLegalInstrument: splitTextList(source.transferLegalInstrument),
    otherTransferLegalInstrument: cleanText(source.otherTransferLegalInstrument),
    transferInAP: toBoolean(source.transferInAP, false),
    additionalTransfers: Array.isArray(source.additionalTransfers)
      ? source.additionalTransfers.map(normalizeAdditionalTransfer)
      : [],
    dataRemission: toYesNo(source.dataRemission),
    remissionRecipient: cleanText(source.remissionRecipient),
    remissionPurposes: splitTextList(source.remissionPurposes),
    otherRemissionPurpose: cleanText(source.otherRemissionPurpose),
    remissionLegalInstrument: splitTextList(source.remissionLegalInstrument),
    otherRemissionLegalInstrument: cleanText(source.otherRemissionLegalInstrument),
    remissionContractFile: toFile(source.remissionContractFile),
    remissionContractFileId: cleanText(source.remissionContractFileId) || undefined,
    remissionContractFileName: cleanText(source.remissionContractFileName) || undefined,
    additionalRemissions: Array.isArray(source.additionalRemissions)
      ? source.additionalRemissions.map(normalizeAdditionalRemission)
      : [],
    personalData: Array.isArray(source.personalData)
      ? source.personalData.map(normalizePersonalData)
      : [createDefaultPersonalData()],
    riskLevel: cleanText(source.riskLevel) ? normalizeRisk(source.riskLevel) : undefined,
    grunenthalSourcePdfFileId: cleanText(source.grunenthalSourcePdfFileId) || undefined,
    grunenthalSourcePdfPath: cleanText(source.grunenthalSourcePdfPath) || undefined,
    grunenthalSourcePdfStatus: cleanText(source.grunenthalSourcePdfStatus) || undefined,
    grunenthalValidationStatus: cleanText(source.grunenthalValidationStatus) || undefined,
    grunenthalValidationFields: splitTextList(source.grunenthalValidationFields),
    grunenthalValidationMismatches: splitTextList(source.grunenthalValidationMismatches),
  }

  return normalized
}

export const normalizeInventoryForForm = (
  value: Partial<Inventory> | LooseRecord,
): Inventory => {
  const source = isRecord(value) ? value : {}
  const now = new Date().toISOString()
  return {
    ...createDefaultInventory(),
    ...source,
    id: cleanText(source.id) || "inventory-new",
    databaseName: cleanText(source.databaseName),
    responsible: cleanText(source.responsible) || DEFAULT_REPORT_RESPONSIBLE,
    companyLogoDataUrl: cleanText(source.companyLogoDataUrl) || DEFAULT_REPORT_LOGO_DATA_URL,
    companyLogoFileName: cleanText(source.companyLogoFileName) || DEFAULT_REPORT_LOGO_FILE_NAME,
    companyLogoPublicPath: cleanText(source.companyLogoPublicPath) || DEFAULT_REPORT_LOGO_PUBLIC_PATH,
    reportAccentColor: cleanText(source.reportAccentColor) || DEFAULT_REPORT_ACCENT_COLOR,
    subInventories: Array.isArray(source.subInventories)
      ? source.subInventories.map(normalizeSubInventoryForForm)
      : [createDefaultSubInventory()],
    riskLevel: cleanText(source.riskLevel) ? normalizeRisk(source.riskLevel) : "",
    createdAt: cleanText(source.createdAt) || now,
    updatedAt: cleanText(source.updatedAt) || now,
    createdBy: cleanText(source.createdBy),
    updatedBy: cleanText(source.updatedBy),
    status: ["pendiente", "en proceso", "completado"].includes(cleanText(source.status))
      ? (cleanText(source.status) as Inventory["status"])
      : "pendiente",
  }
}

type PrepareInventorySaveOptions = {
  inventories: Inventory[]
  formData: Inventory
  editingInventoryId: string | null
  actorName: string
  now?: string
  idFactory?: () => string
}

export const prepareInventorySave = ({
  inventories,
  formData,
  editingInventoryId,
  actorName,
  now = new Date().toISOString(),
  idFactory = () => `inventory-${Date.now()}`,
}: PrepareInventorySaveOptions): {
  inventory: Inventory
  inventories: Inventory[]
  operation: "created" | "updated"
} => {
  const existingIndex = editingInventoryId
    ? inventories.findIndex((inventory) => inventory.id === editingInventoryId)
    : -1
  const isUpdatingExisting = existingIndex >= 0
  const existingInventory = isUpdatingExisting ? inventories[existingIndex] : undefined
  const inventoryId = isUpdatingExisting ? editingInventoryId! : idFactory()

  const inventory = normalizeInventoryForForm({
    ...formData,
    id: inventoryId,
    subInventories: formData.subInventories.map((sub) => ({
      ...sub,
      personalData: (sub.personalData || []).map((data) => ({
        ...data,
        category: data.category || "Sin categoría",
      })),
    })),
    createdAt: existingInventory?.createdAt || formData.createdAt || now,
    updatedAt: now,
    createdBy: existingInventory?.createdBy || formData.createdBy || actorName,
    updatedBy: actorName,
    status: "completado",
  })

  return {
    inventory,
    inventories: isUpdatingExisting
      ? inventories.map((item, index) => (index === existingIndex ? inventory : item))
      : [...inventories, inventory],
    operation: isUpdatingExisting ? "updated" : "created",
  }
}
