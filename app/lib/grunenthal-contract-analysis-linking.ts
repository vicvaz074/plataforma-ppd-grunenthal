import type { GrunenthalGrtContractDocument } from "@/lib/grunenthal-contracts-grt"
import {
  GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS,
  type GrunenthalThirdPartyContractSeed,
} from "@/lib/grunenthal-repository"
import {
  GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX,
  type GrunenthalThirdPartyAnalysisMatrixRow,
} from "@/lib/grunenthal-third-party-analysis-matrix"

export type GrunenthalContractAnalysisLink = {
  analysisRecord: GrunenthalThirdPartyContractSeed | null
  matrixRow: GrunenthalThirdPartyAnalysisMatrixRow | null
}

export const GRUNENTHAL_THIRD_PARTY_ANALYSIS_SOURCE_ASSET_ID =
  "grunenthal-third-party-contracts-analisisderelacionesgrunenthal"

export const normalizeGrunenthalContractParty = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(s a de c v|sapi de cv|s de rl de cv|sc|sa de cv|s c|s a p i de c v|inc|ag|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()

const analysisRecordByPartyKey = new Map(
  GRUNENTHAL_INDIVIDUAL_THIRD_PARTY_RECORDS.map((record) => [
    normalizeGrunenthalContractParty(record.providerIdentity),
    record,
  ]),
)

const analysisMatrixByPartyKey = new Map(
  GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.map((row) => [
    normalizeGrunenthalContractParty(row.thirdParty),
    row,
  ]),
)

export function findGrunenthalContractAnalysisLink(
  contractOrProvider: GrunenthalGrtContractDocument | string,
): GrunenthalContractAnalysisLink {
  const providerIdentity =
    typeof contractOrProvider === "string" ? contractOrProvider : contractOrProvider.providerIdentity
  const partyKey = normalizeGrunenthalContractParty(providerIdentity)

  return {
    analysisRecord: analysisRecordByPartyKey.get(partyKey) ?? null,
    matrixRow: analysisMatrixByPartyKey.get(partyKey) ?? null,
  }
}
