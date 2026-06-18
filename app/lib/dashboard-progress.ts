import { getAllFiles } from "@/lib/fileStorage"
import {
  getPolicyProgramSnapshot,
  loadPolicyRecords,
  policyHasMinimumEvidence,
  type PolicyRecord,
} from "@/lib/policy-governance"

type TrainingState = {
  programas?: unknown[]
  sesiones?: unknown[]
  resultados?: unknown[]
  constancias?: unknown[]
}

const TRAINING_STORE_KEY = "davara-training-store-v1"
const TRAINING_RESOURCES_KEY = "davara-training-recursos-v1"

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function percentageFromParts(parts: Array<[boolean, number]>) {
  return Math.min(
    100,
    parts.reduce((total, [enabled, weight]) => total + (enabled ? weight : 0), 0),
  )
}

export function getTrainingDashboardSnapshot() {
  const resources = readJson<unknown[]>(TRAINING_RESOURCES_KEY, [])
  const persisted = readJson<{ state?: TrainingState }>(TRAINING_STORE_KEY, { state: {} })
  const state = persisted.state || {}
  const programs = asArray(state.programas)
  const sessions = asArray(state.sesiones)
  const results = asArray(state.resultados)
  const certificates = asArray(state.constancias)
  const completedSessions = sessions.filter((session) => {
    const record = session as Record<string, unknown>
    return String(record.estado || record.status || "").toLowerCase() === "completada"
  })

  const score = percentageFromParts([
    [programs.length > 0, 20],
    [resources.length > 0, 30],
    [sessions.length > 0, 20],
    [completedSessions.length > 0, 15],
    [results.length > 0 || certificates.length > 0, 15],
  ])

  return {
    score,
    programs: programs.length,
    resources: resources.length,
    sessions: sessions.length,
    completedSessions: completedSessions.length,
    results: results.length,
    certificates: certificates.length,
  }
}

export function getPolicyDashboardSnapshot(records: PolicyRecord[] = loadPolicyRecords()) {
  const policySnapshot = getPolicyProgramSnapshot(records)
  const storedFiles = typeof window === "undefined" ? [] : getAllFiles()
  const storedPolicyFiles = storedFiles.filter((file) => {
    const metadata = (file.metadata || {}) as Record<string, unknown>
    const module = String(metadata.module || "")
    const category = String(file.category || "")
    return (
      module === "data-policies" ||
      module === "security-system" ||
      module === "privacy-notices" ||
      category === "data-policy-evidence" ||
      category === "privacy-policy"
    )
  })
  const recordFileIds = new Set(
    records.flatMap((record) => [
      ...record.policyDocuments.map((document) => document.fileId),
      ...record.evidence.flatMap((evidence) => evidence.fileIds),
    ]),
  )
  const documentCount = new Set([
    ...storedPolicyFiles.map((file) => file.id),
    ...Array.from(recordFileIds),
  ]).size
  const activeLinkedModules = records.reduce(
    (total, record) => total + record.linkedModules.filter((linked) => linked.active).length,
    0,
  )
  const completeEvidence = records.filter(policyHasMinimumEvidence).length

  const evidenceScore = percentageFromParts([
    [records.length > 0, 15],
    [policySnapshot.published > 0, 15],
    [documentCount > 0, 30],
    [activeLinkedModules > 0, 10],
    [completeEvidence > 0, 30],
  ])

  return {
    ...policySnapshot,
    score: Math.max(policySnapshot.score, evidenceScore),
    documentCount,
    activeLinkedModules,
    completeEvidence,
  }
}
