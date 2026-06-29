import type { ContractMeta } from "../types"

type ContractAnalysisSource = Pick<
  ContractMeta,
  | "clauseComplianceLabel"
  | "clauseRegulation"
  | "clauseType"
  | "clauseComplianceNotes"
  | "complianceNeeds"
  | "riskNotes"
>

export type ContractAnalysisModalDetails = {
  result: string
  clauseType?: string
  criterion?: string
  recommendation?: string
  note?: string
  riskNote?: string
}

export const normalizeContractAnalysisModalText = (value?: string | null) => {
  if (!value) return ""

  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/^nota:\s*/i, "")
    .trim()
    .replace(/[.;:\s]+$/g, "")
    .toLocaleLowerCase("es-MX")
}

const compactText = (value?: string | null) => value?.replace(/\s+/g, " ").trim() || ""

const valueKey = (value?: string | null) => normalizeContractAnalysisModalText(value)

const hasEquivalentText = (value: string, values: Array<string | undefined>) => {
  const key = valueKey(value)
  if (!key) return false
  return values.filter((candidate) => valueKey(candidate) === key).length > 1
}

const uniqueValue = (value: string | undefined, seen: Set<string>) => {
  const compacted = compactText(value)
  const key = valueKey(compacted)
  if (!compacted || !key || seen.has(key)) return undefined

  seen.add(key)
  return compacted
}

export function buildContractAnalysisModalDetails(contract: ContractAnalysisSource): ContractAnalysisModalDetails {
  const sourceValues = [
    contract.clauseRegulation,
    contract.complianceNeeds,
    contract.clauseComplianceNotes,
    contract.riskNotes,
  ].map(compactText)
  const repeatedGuidance =
    sourceValues.find((value) => value && hasEquivalentText(value, sourceValues)) || ""
  const note = compactText(contract.clauseComplianceNotes) || repeatedGuidance
  const result = compactText(contract.clauseComplianceLabel) || compactText(contract.clauseRegulation) || "Sin resultado"
  const seen = new Set<string>()

  const resultKey = valueKey(result)
  if (resultKey) seen.add(resultKey)

  const noteKey = valueKey(note)
  if (noteKey) seen.add(noteKey)

  return {
    result,
    clauseType: uniqueValue(contract.clauseType, seen),
    criterion: uniqueValue(contract.clauseRegulation, seen),
    recommendation: uniqueValue(contract.complianceNeeds, seen),
    note: note || undefined,
    riskNote: uniqueValue(contract.riskNotes, seen),
  }
}
