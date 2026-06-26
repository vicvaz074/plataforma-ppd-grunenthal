import * as XLSX from "xlsx-js-style"
import type {
  AdditionalAccess,
  AdditionalBlocking,
  AdditionalConservation,
  AdditionalRemission,
  AdditionalTransfer,
  PersonalData,
  SubInventory,
} from "../types"

type ParsedRatArrayFields =
  | "personalData"
  | "additionalAccesses"
  | "additionalTransfers"
  | "additionalRemissions"
  | "additionalConservations"
  | "additionalBlockings"

export type ParsedRatSubInventory = Omit<Partial<SubInventory>, ParsedRatArrayFields> & {
  personalData: PersonalData[]
  additionalAccesses?: Partial<AdditionalAccess>[]
  additionalTransfers?: Partial<AdditionalTransfer>[]
  additionalRemissions?: Partial<AdditionalRemission>[]
  additionalConservations?: Partial<AdditionalConservation>[]
  additionalBlockings?: Partial<AdditionalBlocking>[]
  ratImportInventoryName?: string
}

type Row = unknown[]
type HeaderMap = Map<string, number>

const cleanText = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  return String(value).replace(/\s+/g, " ").trim()
}

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const keyFor = (value: unknown): string =>
  stripAccents(cleanText(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

const splitList = (value: unknown): string[] => {
  const raw = cleanText(value)
  if (!raw) return []

  const seen = new Set<string>()
  return raw
    .split(/[;,\n]+/g)
    .map((item) => cleanText(item))
    .filter((item) => {
      const key = keyFor(item)
      if (!item || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const TRUE_VALUES = new Set(["si", "sí", "true", "1", "yes", "y", "þ"])
const FALSE_VALUES = new Set(["no", "false", "0", "n"])

const booleanKey = (value: unknown): string =>
  stripAccents(cleanText(value)).toLowerCase()

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value
  const key = booleanKey(value)
  if (TRUE_VALUES.has(key)) return true
  if (FALSE_VALUES.has(key)) return false
  return fallback
}

const toYesNo = (value: unknown): string => {
  if (typeof value === "boolean") return value ? "si" : "no"
  const key = booleanKey(value)
  if (TRUE_VALUES.has(key)) return "si"
  if (FALSE_VALUES.has(key)) return "no"
  return cleanText(value)
}

const normalizeRisk = (value: unknown): PersonalData["riesgo"] => {
  const key = keyFor(value)
  if (key.includes("reforzado")) return "reforzado"
  if (key.includes("alto")) return "alto"
  if (key.includes("medio")) return "medio"
  return "bajo"
}

const hasValue = (row: Row): boolean =>
  row.some((cell) => cleanText(cell).length > 0)

const getSheetRows = (sheet: XLSX.WorkSheet): Row[] =>
  XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Row[]

const buildHeaderMap = (header: Row): HeaderMap => {
  const map: HeaderMap = new Map()
  header.forEach((cell, index) => {
    const key = keyFor(cell)
    if (key && !map.has(key)) map.set(key, index)
  })
  return map
}

const aliases = (...values: string[]) => values.map(keyFor)

const findIndex = (headers: HeaderMap, candidates: string[]): number | undefined => {
  for (const candidate of candidates) {
    const index = headers.get(candidate)
    if (index !== undefined) return index
  }
  for (const candidate of candidates) {
    for (const [header, index] of headers.entries()) {
      if (header.includes(candidate)) return index
    }
  }
  return undefined
}

const valueFor = (row: Row, headers: HeaderMap, candidates: string[]): string => {
  const index = findIndex(headers, candidates)
  return index === undefined ? "" : cleanText(row[index])
}

const findHeaderRow = (rows: Row[], required: string[][]): number =>
  rows.findIndex((row) => {
    const headers = buildHeaderMap(row)
    return required.every((candidateGroup) => findIndex(headers, candidateGroup) !== undefined)
  })

const findSheetName = (workbook: XLSX.WorkBook, expectedName: string): string | undefined => {
  const expected = keyFor(expectedName)
  return workbook.SheetNames.find((sheetName) => keyFor(sheetName) === expected)
}

const createPersonalData = (
  source: {
    id: string
    name: string
    category?: string
    riesgo?: unknown
    proporcionalidad?: unknown
    purposesPrimary?: unknown
    purposesSecondary?: unknown
    subsection?: string
  },
): PersonalData => ({
  id: source.id,
  name: cleanText(source.name),
  category: cleanText(source.category) || "Sin categoría",
  subsection: cleanText(source.subsection) || undefined,
  proporcionalidad: toBoolean(source.proporcionalidad, true),
  riesgo: normalizeRisk(source.riesgo),
  purposesPrimary: splitList(source.purposesPrimary),
  purposesSecondary: splitList(source.purposesSecondary),
})

const ensureSub = (
  map: Map<string, ParsedRatSubInventory>,
  subId: string,
): ParsedRatSubInventory | undefined => map.get(subId)

const normalizedHeaders = {
  subId: aliases("Subinventario ID", "ID subinventario", "Sub ID"),
  inventoryName: aliases("Nombre del inventario general", "Inventario general"),
  databaseName: aliases("Base de datos", "Nombre de la base de datos"),
  holderTypes: aliases("Tipo de titulares", "Titulares"),
  holdersVolume: aliases("Volumen de titulares"),
  accessibility: aliases("Accesibilidad"),
  environment: aliases("Entorno", "Entorno de acceso"),
  responsibleArea: aliases("Área responsable", "Area responsable", "Área encargada del tratamiento"),
  obtainingMethod: aliases("Medio de obtención", "Medio de obtencion"),
  obtainingSource: aliases("Fuente de obtención", "Fuente de obtencion"),
  consentRequired: aliases("¿Requiere consentimiento?", "Requiere consentimiento"),
  consentType: aliases("Tipo de consentimiento"),
  consentMechanism: aliases("Mecanismo de consentimiento"),
  processingArea: aliases("Área encargada", "Area encargada"),
  processingSystem: aliases("Sistema / método", "Sistema / metodo", "Sistema o método"),
  processingSystemName: aliases("Nombre del sistema"),
  processingDescription: aliases("Descripción del procesamiento", "Descripcion del procesamiento"),
  accessDescription: aliases("Privilegios", "Descripción del acceso", "Descripcion del acceso"),
  storageMethod: aliases("Medio de almacenamiento"),
  physicalLocation: aliases("Ubicación física", "Ubicacion fisica"),
  backupPeriodicity: aliases("Periodicidad de respaldo"),
  isBackedUp: aliases("¿Se respalda?", "Se respalda"),
  backupDescription: aliases("Descripción del respaldo", "Descripcion del respaldo"),
  backupResponsible: aliases("Responsable del respaldo"),
  conservationTerm: aliases("Plazo de conservación", "Plazo de conservacion"),
  conservationJustification: aliases("Justificación de conservación", "Justificacion de conservacion"),
  blockingTime: aliases("Tiempo de bloqueo"),
  deletionMethods: aliases("Métodos de supresión", "Metodos de supresion"),
  dataTransfer: aliases("¿Existe transferencia?", "Existe transferencia"),
  dataRemission: aliases("¿Existe remisión?", "Existe remision"),
}

const personalDataHeaders = {
  subId: normalizedHeaders.subId,
  name: aliases("Dato personal", "Datos personales contenidos en la base de datos"),
  category: aliases("Categoría", "Categoria", "Categoría del dato personal"),
  risk: aliases("Nivel de riesgo", "Riesgo", "Clasificación del riesgo inherente del dato"),
  proportionality: aliases("Proporcionalidad"),
  primaryPurposes: aliases("Finalidades primarias", "Finalidades del tratamiento"),
  secondaryPurposes: aliases("Finalidades secundarias"),
}

const transferHeaders = {
  subId: normalizedHeaders.subId,
  recipient: aliases("Destinatario", "Tercero receptor", "Tercero"),
  purposes: aliases("Finalidades", "Finalidades de la transferencia"),
  consentRequired: aliases("¿Requiere consentimiento?", "Requiere consentimiento"),
  consentType: aliases("Tipo de consentimiento"),
  legalInstrument: aliases("Instrumento jurídico", "Instrumento juridico"),
  inAP: aliases("¿Está en el AP?", "¿Esta en el AP?", "Está en el AP"),
}

const remissionHeaders = {
  subId: normalizedHeaders.subId,
  recipient: aliases("Destinatario", "Encargado", "Proveedor"),
  purposes: aliases("Finalidades", "Finalidades de remisión", "Finalidades de remision"),
  legalInstrument: aliases("Instrumento jurídico", "Instrumento juridico"),
}

const parseNormalizedWorkbook = (workbook: XLSX.WorkBook): ParsedRatSubInventory[] => {
  const inventorySheetName = findSheetName(workbook, "Inventarios")
  const personalDataSheetName = findSheetName(workbook, "Datos personales")
  if (!inventorySheetName || !personalDataSheetName) return []

  const inventoryRows = getSheetRows(workbook.Sheets[inventorySheetName])
  const headerIdx = findHeaderRow(inventoryRows, [
    normalizedHeaders.subId,
    normalizedHeaders.databaseName,
  ])
  if (headerIdx < 0) return []

  const headers = buildHeaderMap(inventoryRows[headerIdx])
  const subInventories = new Map<string, ParsedRatSubInventory>()

  inventoryRows.slice(headerIdx + 1).forEach((row, index) => {
    if (!hasValue(row)) return
    const subId = valueFor(row, headers, normalizedHeaders.subId) || `sub-${index + 1}`
    const databaseName = valueFor(row, headers, normalizedHeaders.databaseName)
    if (!databaseName) return

    subInventories.set(subId, {
      id: subId,
      databaseName,
      holderTypes: splitList(valueFor(row, headers, normalizedHeaders.holderTypes)),
      holdersVolume: valueFor(row, headers, normalizedHeaders.holdersVolume),
      accessibility: valueFor(row, headers, normalizedHeaders.accessibility),
      environment: valueFor(row, headers, normalizedHeaders.environment),
      responsibleArea: valueFor(row, headers, normalizedHeaders.responsibleArea),
      obtainingMethod: valueFor(row, headers, normalizedHeaders.obtainingMethod),
      obtainingSource: valueFor(row, headers, normalizedHeaders.obtainingSource),
      consentRequired: toBoolean(valueFor(row, headers, normalizedHeaders.consentRequired), true),
      consentType: valueFor(row, headers, normalizedHeaders.consentType),
      consentMechanism: valueFor(row, headers, normalizedHeaders.consentMechanism),
      processingArea: splitList(valueFor(row, headers, normalizedHeaders.processingArea)),
      processingSystem: valueFor(row, headers, normalizedHeaders.processingSystem),
      processingSystemName: valueFor(row, headers, normalizedHeaders.processingSystemName),
      processingDescription: splitList(valueFor(row, headers, normalizedHeaders.processingDescription)),
      accessDescription: splitList(valueFor(row, headers, normalizedHeaders.accessDescription)),
      storageMethod: valueFor(row, headers, normalizedHeaders.storageMethod),
      physicalLocation: valueFor(row, headers, normalizedHeaders.physicalLocation),
      backupPeriodicity: valueFor(row, headers, normalizedHeaders.backupPeriodicity),
      isBackedUp: toBoolean(valueFor(row, headers, normalizedHeaders.isBackedUp), false),
      backupDescription: valueFor(row, headers, normalizedHeaders.backupDescription),
      backupResponsible: valueFor(row, headers, normalizedHeaders.backupResponsible),
      conservationTerm: valueFor(row, headers, normalizedHeaders.conservationTerm),
      conservationJustification: splitList(valueFor(row, headers, normalizedHeaders.conservationJustification)),
      blockingTime: valueFor(row, headers, normalizedHeaders.blockingTime),
      deletionMethods: splitList(valueFor(row, headers, normalizedHeaders.deletionMethods)),
      dataTransfer: toYesNo(valueFor(row, headers, normalizedHeaders.dataTransfer)),
      dataRemission: toYesNo(valueFor(row, headers, normalizedHeaders.dataRemission)),
      personalData: [],
      additionalAccesses: [],
      additionalTransfers: [],
      additionalRemissions: [],
      additionalConservations: [],
      additionalBlockings: [],
      ratImportInventoryName: valueFor(row, headers, normalizedHeaders.inventoryName),
    } as ParsedRatSubInventory)
  })

  parseNormalizedPersonalData(workbook, personalDataSheetName, subInventories)
  parseNormalizedTransfers(workbook, subInventories)
  parseNormalizedRemissions(workbook, subInventories)
  parseNormalizedAdditionalAccesses(workbook, subInventories)
  parseNormalizedAdditionalConservations(workbook, subInventories)
  parseNormalizedAdditionalBlockings(workbook, subInventories)

  return Array.from(subInventories.values()).filter((sub) => sub.databaseName)
}

const parseNormalizedPersonalData = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  subInventories: Map<string, ParsedRatSubInventory>,
) => {
  const rows = getSheetRows(workbook.Sheets[sheetName])
  const headerIdx = findHeaderRow(rows, [personalDataHeaders.subId, personalDataHeaders.name])
  if (headerIdx < 0) return
  const headers = buildHeaderMap(rows[headerIdx])

  rows.slice(headerIdx + 1).forEach((row, index) => {
    if (!hasValue(row)) return
    const subId = valueFor(row, headers, personalDataHeaders.subId)
    const sub = ensureSub(subInventories, subId)
    if (!sub) return
    const name = valueFor(row, headers, personalDataHeaders.name)
    if (!name) return
    sub.personalData.push(createPersonalData({
      id: `${subId}-dato-${index + 1}`,
      name,
      category: valueFor(row, headers, personalDataHeaders.category),
      riesgo: valueFor(row, headers, personalDataHeaders.risk),
      proporcionalidad: valueFor(row, headers, personalDataHeaders.proportionality),
      purposesPrimary: valueFor(row, headers, personalDataHeaders.primaryPurposes),
      purposesSecondary: valueFor(row, headers, personalDataHeaders.secondaryPurposes),
    }))
  })
}

const parseNormalizedTransfers = (
  workbook: XLSX.WorkBook,
  subInventories: Map<string, ParsedRatSubInventory>,
) => {
  const sheetName = findSheetName(workbook, "Transferencias")
  if (!sheetName) return
  const rows = getSheetRows(workbook.Sheets[sheetName])
  const headerIdx = findHeaderRow(rows, [transferHeaders.subId, transferHeaders.recipient])
  if (headerIdx < 0) return
  const headers = buildHeaderMap(rows[headerIdx])
  const seenBySub = new Map<string, number>()

  rows.slice(headerIdx + 1).forEach((row) => {
    if (!hasValue(row)) return
    const subId = valueFor(row, headers, transferHeaders.subId)
    const sub = ensureSub(subInventories, subId)
    if (!sub) return
    const recipient = valueFor(row, headers, transferHeaders.recipient)
    if (!recipient) return

    const transfer: Partial<AdditionalTransfer> = {
      recipient,
      purposes: valueFor(row, headers, transferHeaders.purposes),
      consentRequired: toBoolean(valueFor(row, headers, transferHeaders.consentRequired), false),
      consentType: valueFor(row, headers, transferHeaders.consentType),
      legalInstrument: splitList(valueFor(row, headers, transferHeaders.legalInstrument)),
      inAP: toBoolean(valueFor(row, headers, transferHeaders.inAP), false),
    }

    const count = seenBySub.get(subId) || 0
    if (count === 0) {
      sub.dataTransfer = "si"
      sub.transferRecipient = transfer.recipient || ""
      sub.transferPurposes = transfer.purposes || ""
      sub.transferConsentRequired = Boolean(transfer.consentRequired)
      sub.transferConsentType = transfer.consentType || ""
      sub.transferLegalInstrument = transfer.legalInstrument || []
      sub.transferInAP = Boolean(transfer.inAP)
    } else {
      sub.additionalTransfers = [...(sub.additionalTransfers || []), transfer]
    }
    seenBySub.set(subId, count + 1)
  })
}

const parseNormalizedRemissions = (
  workbook: XLSX.WorkBook,
  subInventories: Map<string, ParsedRatSubInventory>,
) => {
  const sheetName = findSheetName(workbook, "Remisiones")
  if (!sheetName) return
  const rows = getSheetRows(workbook.Sheets[sheetName])
  const headerIdx = findHeaderRow(rows, [remissionHeaders.subId, remissionHeaders.recipient])
  if (headerIdx < 0) return
  const headers = buildHeaderMap(rows[headerIdx])
  const seenBySub = new Map<string, number>()

  rows.slice(headerIdx + 1).forEach((row) => {
    if (!hasValue(row)) return
    const subId = valueFor(row, headers, remissionHeaders.subId)
    const sub = ensureSub(subInventories, subId)
    if (!sub) return
    const recipient = valueFor(row, headers, remissionHeaders.recipient)
    if (!recipient) return

    const remission: Partial<AdditionalRemission> = {
      recipient,
      purposes: splitList(valueFor(row, headers, remissionHeaders.purposes)),
      legalInstrument: splitList(valueFor(row, headers, remissionHeaders.legalInstrument)),
    }

    const count = seenBySub.get(subId) || 0
    if (count === 0) {
      sub.dataRemission = "si"
      sub.remissionRecipient = remission.recipient || ""
      sub.remissionPurposes = remission.purposes || []
      sub.remissionLegalInstrument = remission.legalInstrument || []
    } else {
      sub.additionalRemissions = [...(sub.additionalRemissions || []), remission]
    }
    seenBySub.set(subId, count + 1)
  })
}

const parseNormalizedAdditionalAccesses = (
  workbook: XLSX.WorkBook,
  subInventories: Map<string, ParsedRatSubInventory>,
) => {
  const sheetName = findSheetName(workbook, "Accesos adicionales")
  if (!sheetName) return
  const rows = getSheetRows(workbook.Sheets[sheetName])
  const headerIdx = findHeaderRow(rows, [
    normalizedHeaders.subId,
    aliases("Área", "Area", "Área adicional"),
  ])
  if (headerIdx < 0) return
  const headers = buildHeaderMap(rows[headerIdx])
  const areaAliases = aliases("Área", "Area", "Área adicional")
  const privilegeAliases = aliases("Privilegios", "Acceso")
  const roleAliases = aliases("Rol", "Perfil")

  rows.slice(headerIdx + 1).forEach((row, index) => {
    if (!hasValue(row)) return
    const sub = ensureSub(subInventories, valueFor(row, headers, normalizedHeaders.subId))
    if (!sub) return
    const area = valueFor(row, headers, areaAliases)
    if (!area) return
    sub.additionalAccesses = [
      ...(sub.additionalAccesses || []),
      {
        id: `${sub.id || "sub"}-access-${index + 1}`,
        area,
        privileges: splitList(valueFor(row, headers, privilegeAliases)),
        role: valueFor(row, headers, roleAliases),
      },
    ]
  })
}

const parseNormalizedAdditionalConservations = (
  workbook: XLSX.WorkBook,
  subInventories: Map<string, ParsedRatSubInventory>,
) => {
  const sheetName = findSheetName(workbook, "Conservaciones adicionales")
  if (!sheetName) return
  const rows = getSheetRows(workbook.Sheets[sheetName])
  const headerIdx = findHeaderRow(rows, [
    normalizedHeaders.subId,
    normalizedHeaders.conservationTerm,
  ])
  if (headerIdx < 0) return
  const headers = buildHeaderMap(rows[headerIdx])
  const legalBasisAliases = aliases("Base legal", "Fundamento legal")
  const detailAliases = aliases("Detalle", "Descripcion", "Descripción")

  rows.slice(headerIdx + 1).forEach((row) => {
    if (!hasValue(row)) return
    const sub = ensureSub(subInventories, valueFor(row, headers, normalizedHeaders.subId))
    if (!sub) return
    const term = valueFor(row, headers, normalizedHeaders.conservationTerm)
    if (!term) return
    sub.additionalConservations = [
      ...(sub.additionalConservations || []),
      {
        term,
        justification: splitList(valueFor(row, headers, normalizedHeaders.conservationJustification)),
        legalBasis: valueFor(row, headers, legalBasisAliases),
        detail: valueFor(row, headers, detailAliases),
      },
    ]
  })
}

const parseNormalizedAdditionalBlockings = (
  workbook: XLSX.WorkBook,
  subInventories: Map<string, ParsedRatSubInventory>,
) => {
  const sheetName = findSheetName(workbook, "Bloqueos adicionales")
  if (!sheetName) return
  const rows = getSheetRows(workbook.Sheets[sheetName])
  const headerIdx = findHeaderRow(rows, [
    normalizedHeaders.subId,
    normalizedHeaders.blockingTime,
  ])
  if (headerIdx < 0) return
  const headers = buildHeaderMap(rows[headerIdx])
  const prescriptionAliases = aliases("Prescripción", "Prescripcion")
  const dispositionAliases = aliases("Disposición legal", "Disposicion legal")

  rows.slice(headerIdx + 1).forEach((row) => {
    if (!hasValue(row)) return
    const sub = ensureSub(subInventories, valueFor(row, headers, normalizedHeaders.subId))
    if (!sub) return
    const time = valueFor(row, headers, normalizedHeaders.blockingTime)
    if (!time) return
    sub.additionalBlockings = [
      ...(sub.additionalBlockings || []),
      {
        time,
        prescription: splitList(valueFor(row, headers, prescriptionAliases)),
        disposition: valueFor(row, headers, dispositionAliases),
      },
    ]
  })
}

const legacyHeaders = {
  databaseName: aliases("Base de datos"),
  dataNames: aliases("Datos personales contenidos en la base de datos", "Dato personal"),
  dataCategories: aliases("Categoría del dato personal", "Categoria del dato personal", "Categorías de datos personales", "Categorias de datos personales"),
  risk: aliases("Clasificación del riesgo inherente del dato", "Clasificacion del riesgo inherente del dato", "Nivel de riesgo", "Riesgo"),
  proportionality: aliases("Proporcionalidad"),
  obtainingMethod: aliases("MEDIO de obtención", "Medio de obtencion"),
  purpose: aliases("Finalidades del tratamiento"),
  consentRequired: aliases("¿Se requiere el consentimiento del titular para el tratamiento? SÍ/NO", "¿Se requiere el consentimiento del titular para el tratamiento? SI/NO"),
  consentType: aliases("Tipo de consentimiento"),
  processingArea: aliases("Área dentro de la empresa encargada de dar tratamiento a los datos personales", "Area dentro de la empresa encargada de dar tratamiento a los datos personales"),
  processingSystemName: aliases("Sistema, aplicación o método con el que se procesa la información", "Sistema, aplicacion o metodo con el que se procesa la informacion"),
  processingDescription: aliases("Descripción del procesamiento", "Descripcion del procesamiento"),
  accessDescription: aliases("Descripción del acceso del área encargada", "Descripcion del acceso del area encargada"),
  accessProcedure: aliases("Procedimiento del área encargada para acceder a la base de datos", "Procedimiento del area encargada para acceder a la base de datos"),
  additionalAreas: aliases("Áreas distintas a la encargada con acceso a la base de datos", "Areas distintas a la encargada con acceso a la base de datos"),
  additionalAreasAccess: aliases("Descripción del acceso de otras áreas", "Descripcion del acceso de otras areas"),
  storageMethod: aliases("Medio de almacenamiento"),
  physicalLocation: aliases("Ubicación física de la base de datos", "Ubicacion fisica de la base de datos"),
  isBackedUp: aliases("¿Se respalda la información?", "¿Se respalda la informacion?"),
  backupDescription: aliases("Descripción del respaldo", "Descripcion del respaldo"),
  backupResponsible: aliases("Persona o área responsable del respaldo de los datos personales", "Persona o area responsable del respaldo de los datos personales"),
  processingTime: aliases("Tiempo aproximado en el que se da tratamiento a la información", "Tiempo aproximado en el que se da tratamiento a la informacion"),
  postRelationshipProcessing: aliases("Después de terminada la relación con el titular ¿se sigue dando tratamiento a sus datos personales?", "Despues de terminada la relacion con el titular se sigue dando tratamiento a sus datos personales"),
  legalConservation: aliases("¿Debe conservar los datos por ley?", "Debe conservar los datos por ley"),
  blockingTime: aliases("Tiempo de Bloqueo", "Tiempo de bloqueo"),
  deletionMethod: aliases("Descripción de la supresión", "Descripcion de la supresion"),
  remissionRecipient: aliases("Encargados con quienes se comparten los datos personales", "¿A quién aplica la remisión?", "¿A quien aplica la remision?"),
  remissionPurposes: aliases("Finalidad de la remisión", "Finalidades de la remisión", "Finalidades de la remision"),
  remissionLegalInstrument: aliases("Instrumento jurídico donde se encuentra la cláusula de encargado", "Instrumento juridico donde se encuentra la clausula de encargado", "Instrumento jurídico donde se encuentre la cláusula de remisión", "Instrumento juridico donde se encuentre la clausula de remision"),
  dataTransfer: aliases("¿Existe transferencia?", "Existe transferencia"),
  transferRecipient: aliases("Tercero a quien se realiza una transferencia", "¿A quién aplica la transferencia?", "¿A quien aplica la transferencia?"),
  transferPurposes: aliases("Finalidades de la transferencia"),
  transferConsentRequired: aliases("¿Se requiere el consentimiento del titular para la transferencia? SÍ/NO", "¿Se requiere el consentimiento del titular para la transferencia? SI/NO"),
  transferConsentType: aliases("Tipo de consentimiento para realizar la transferencia"),
  transferLegalInstrument: aliases("Instrumento jurídico donde se encuentre la cláusula de transferencia", "Instrumento juridico donde se encuentre la clausula de transferencia"),
  transferInAP: aliases("¿La transferencia está en el AP?", "¿La transferencia esta en el AP?"),
  dataRemission: aliases("¿Existe remisión?", "¿Existe remision?"),
}

const parseLegacyWorkbook = (workbook: XLSX.WorkBook): ParsedRatSubInventory[] => {
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const rows = getSheetRows(workbook.Sheets[firstSheetName])
  const headerIdx = findHeaderRow(rows, [legacyHeaders.databaseName])
  if (headerIdx < 0) return []

  const headers = buildHeaderMap(rows[headerIdx])
  const results: ParsedRatSubInventory[] = []
  let current: ParsedRatSubInventory | undefined

  rows.slice(headerIdx + 1).forEach((row, offset) => {
    if (!hasValue(row)) return
    const databaseName = valueFor(row, headers, legacyHeaders.databaseName)
    if (databaseName) {
      current = parseLegacySubInventory(row, headers, databaseName, offset)
      results.push(current)
    }
    if (!current) return
    parseLegacyPersonalDataRow(row, headers, current, offset)
  })

  return results.filter((sub) => sub.databaseName)
}

const parseLegacySubInventory = (
  row: Row,
  headers: HeaderMap,
  databaseName: string,
  offset: number,
): ParsedRatSubInventory => {
  const transferRecipient = valueFor(row, headers, legacyHeaders.transferRecipient)
  const remissionRecipient = valueFor(row, headers, legacyHeaders.remissionRecipient)
  const explicitTransfer = toYesNo(valueFor(row, headers, legacyHeaders.dataTransfer))
  const explicitRemission = toYesNo(valueFor(row, headers, legacyHeaders.dataRemission))
  const deletionMethod = valueFor(row, headers, legacyHeaders.deletionMethod)

  return {
    id: `legacy-${offset + 1}`,
    databaseName,
    obtainingMethod: valueFor(row, headers, legacyHeaders.obtainingMethod),
    consentRequired: toBoolean(valueFor(row, headers, legacyHeaders.consentRequired), true),
    consentType: valueFor(row, headers, legacyHeaders.consentType),
    processingArea: splitList(valueFor(row, headers, legacyHeaders.processingArea)),
    processingSystemName: valueFor(row, headers, legacyHeaders.processingSystemName),
    processingDescription: splitList(valueFor(row, headers, legacyHeaders.processingDescription)),
    accessDescription: splitList(valueFor(row, headers, legacyHeaders.accessDescription)),
    dataLifecyclePrivileges: valueFor(row, headers, legacyHeaders.accessProcedure),
    additionalAreas: splitList(valueFor(row, headers, legacyHeaders.additionalAreas)),
    additionalAreasAccess: splitList(valueFor(row, headers, legacyHeaders.additionalAreasAccess)),
    storageMethod: valueFor(row, headers, legacyHeaders.storageMethod),
    physicalLocation: valueFor(row, headers, legacyHeaders.physicalLocation),
    isBackedUp: toBoolean(valueFor(row, headers, legacyHeaders.isBackedUp), false),
    backupDescription: valueFor(row, headers, legacyHeaders.backupDescription),
    backupResponsible: valueFor(row, headers, legacyHeaders.backupResponsible),
    processingTime: valueFor(row, headers, legacyHeaders.processingTime),
    postRelationshipProcessing: valueFor(row, headers, legacyHeaders.postRelationshipProcessing),
    legalConservation: splitList(valueFor(row, headers, legacyHeaders.legalConservation)),
    blockingTime: valueFor(row, headers, legacyHeaders.blockingTime),
    deletionMethod,
    deletionMethods: splitList(deletionMethod),
    dataTransfer: explicitTransfer || (transferRecipient ? "si" : "no"),
    transferRecipient,
    transferPurposes: valueFor(row, headers, legacyHeaders.transferPurposes),
    transferConsentRequired: toBoolean(valueFor(row, headers, legacyHeaders.transferConsentRequired), false),
    transferConsentType: valueFor(row, headers, legacyHeaders.transferConsentType),
    transferLegalInstrument: splitList(valueFor(row, headers, legacyHeaders.transferLegalInstrument)),
    transferInAP: toBoolean(valueFor(row, headers, legacyHeaders.transferInAP), false),
    dataRemission: explicitRemission || (remissionRecipient ? "si" : "no"),
    remissionRecipient,
    remissionPurposes: splitList(valueFor(row, headers, legacyHeaders.remissionPurposes)),
    remissionLegalInstrument: splitList(valueFor(row, headers, legacyHeaders.remissionLegalInstrument)),
    personalData: [],
    additionalTransfers: [],
    additionalRemissions: [],
  }
}

const parseLegacyPersonalDataRow = (
  row: Row,
  headers: HeaderMap,
  current: ParsedRatSubInventory,
  offset: number,
) => {
  const names = splitList(valueFor(row, headers, legacyHeaders.dataNames))
  const categories = splitList(valueFor(row, headers, legacyHeaders.dataCategories))
  const risk = valueFor(row, headers, legacyHeaders.risk)
  const proportionality = valueFor(row, headers, legacyHeaders.proportionality)
  const purposesPrimary = valueFor(row, headers, legacyHeaders.purpose)

  const items = names.length > 0
    ? names.map((name, index) => ({
        name,
        category: categories[index] || categories[0] || "Sin categoría",
      }))
    : categories.map((category) => ({ name: category, category }))

  items.forEach((item, index) => {
    if (!item.name) return
    current.personalData.push(createPersonalData({
      id: `${current.id || "legacy"}-dato-${offset + 1}-${index + 1}`,
      name: item.name,
      category: item.category,
      riesgo: risk,
      proporcionalidad: proportionality,
      purposesPrimary,
    }))
  })
}

export const parseRatWorkbook = (workbook: XLSX.WorkBook): ParsedRatSubInventory[] => {
  const normalized = parseNormalizedWorkbook(workbook)
  return normalized.length > 0 ? normalized : parseLegacyWorkbook(workbook)
}

export async function parseRatExcel(file: File): Promise<ParsedRatSubInventory[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = reader.result as ArrayBuffer
        const workbook = XLSX.read(data, { type: "array" })
        resolve(parseRatWorkbook(workbook))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}
