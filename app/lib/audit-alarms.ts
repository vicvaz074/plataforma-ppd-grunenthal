// Tipos para los recordatorios de auditoría
export type AuditPriority = "alta" | "media" | "baja"
export type AuditStatus = "pendiente" | "en-progreso" | "completada" | "vencida"
export type AuditReminderRecurrenceInterval = "monthly" | "quarterly" | "semiannual" | "annual"

export interface AuditReminderRecurrence {
  interval: AuditReminderRecurrenceInterval
  sourceModule: "third-party-contracts"
  sourceRecordId: string
}

export interface AuditModule {
  id: string
  name: string
  description: string
  path: string
  owner: string
  area: string
}

export interface AuditReminder {
  id: string
  title: string
  description: string
  dueDate: Date
  createdAt: Date
  priority: AuditPriority
  status: AuditStatus
  assignedTo: string[]
  category: string
  moduleId: string
  documents?: string[]
  notes?: string
  completedAt?: Date
  referenceKey?: string
  recurrence?: AuditReminderRecurrence
}

export const auditModules: AuditModule[] = [
  {
    id: "inventario-datos",
    name: "Inventario de Datos Personales",
    description: "Registro de ciclos de vida, bases legales y áreas responsables.",
    path: "/rat",
    owner: "Privacidad",
    area: "Datos",
  },
  {
    id: "avisos-privacidad",
    name: "Avisos de Privacidad",
    description: "Actualización y publicación de avisos en canales oficiales.",
    path: "/document-management",
    owner: "Legal",
    area: "Documentación",
  },
  {
    id: "contratos-terceros",
    name: "Contratos con Terceros",
    description: "Supervisión de cláusulas y obligaciones con proveedores.",
    path: "/third-party-contracts",
    owner: "Compras",
    area: "Documentación",
  },
  {
    id: "oficial-proteccion",
    name: "Oficial de Protección de Datos",
    description: "Agenda de actividades y reportes del DPD.",
    path: "/dpo",
    owner: "DPO",
    area: "Cumplimiento",
  },
  {
    id: "derechos-arco",
    name: "Derechos de los Titulares",
    description: "Gestión de solicitudes, plazos críticos, expediente y recordatorios normativos.",
    path: "/arco-rights",
    owner: "Atención a Titulares",
    area: "Cumplimiento",
  },
  {
    id: "sistema-seguridad",
    name: "Sistema de Gestión de Seguridad",
    description: "Control de medidas técnicas y organizativas.",
    path: "/security-system",
    owner: "Seguridad",
    area: "Seguridad",
  },
  {
    id: "entrenamiento-davara",
    name: "Capacitación",
    description: "Cursos y certificaciones de cumplimiento.",
    path: "/davara-training",
    owner: "Talento",
    area: "Capacitación",
  },
  {
    id: "concientizacion",
    name: "Responsabilidad demostrada",
    description: "Gobierno del SGDP, KPIs, KRIs, expediente y seguimiento de accountability.",
    path: "/awareness",
    owner: "Cumplimiento",
    area: "Cumplimiento",
  },
  {
    id: "programa-gestion",
    name: "Políticas de Protección de Datos",
    description: "Control de políticas, procedimientos y revisiones.",
    path: "/data-policies",
    owner: "Legal",
    area: "Cumplimiento",
  },
  {
    id: "gestion-procedimientos",
    name: "Gestión de Procedimientos",
    description: "Seguimiento de procesos legales y regulatorios.",
    path: "/litigation-management",
    owner: "Legal",
    area: "Cumplimiento",
  },
  {
    id: "auditoria-integral",
    name: "Auditoría en Protección de Datos",
    description: "Plan de auditorías y evidencia consolidada.",
    path: "/audit",
    owner: "Auditoría",
    area: "Cumplimiento",
  },
  {
    id: "incidentes-seguridad",
    name: "Gestión de Incidentes",
    description: "Respuesta a incidentes y reportes regulatorios.",
    path: "/incidents-breaches",
    owner: "Seguridad",
    area: "Seguridad",
  },
  {
    id: "recordatorios-auditoria",
    name: "Recordatorios",
    description: "Alertas personalizadas, cronogramas de revisión y notificaciones automáticas.",
    path: "/audit-alarms",
    owner: "Cumplimiento",
    area: "Cumplimiento",
  },
]

// Datos de ejemplo para los recordatorios
const AUDIT_REMINDERS_KEY = "auditReminders"
const isBrowser = typeof window !== "undefined"
let auditReminders: AuditReminder[] = []

type StoredAuditReminder = Omit<AuditReminder, "dueDate" | "createdAt" | "completedAt"> & {
  dueDate: string
  createdAt: string
  completedAt?: string
}

const parseReminderDates = (reminder: StoredAuditReminder): AuditReminder => ({
  ...reminder,
  dueDate: new Date(reminder.dueDate),
  createdAt: new Date(reminder.createdAt),
  completedAt: reminder.completedAt ? new Date(reminder.completedAt) : undefined,
})

const serializeReminderDates = (reminder: AuditReminder): StoredAuditReminder => ({
  ...reminder,
  dueDate: reminder.dueDate.toISOString(),
  createdAt: reminder.createdAt.toISOString(),
  completedAt: reminder.completedAt ? reminder.completedAt.toISOString() : undefined,
})

const readStoredReminders = () => {
  if (!isBrowser) {
    return auditReminders
  }

  const stored = localStorage.getItem(AUDIT_REMINDERS_KEY)
  if (!stored) {
    return auditReminders
  }

  try {
    const parsed = JSON.parse(stored) as StoredAuditReminder[]
    if (!Array.isArray(parsed)) {
      return auditReminders
    }
    return parsed.map(parseReminderDates)
  } catch {
    return auditReminders
  }
}

const writeStoredReminders = (reminders: AuditReminder[]) => {
  auditReminders = reminders
  if (!isBrowser) return

  const payload = reminders.map(serializeReminderDates)
  const serialized = JSON.stringify(payload)
  if (localStorage.getItem(AUDIT_REMINDERS_KEY) !== serialized) {
    localStorage.setItem(AUDIT_REMINDERS_KEY, serialized)
  }
}

// Funciones para gestionar los recordatorios
export function getAuditReminders() {
  const reminders = readStoredReminders()
  return [...reminders].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}

export function getAuditModules() {
  return [...auditModules]
}

export function getAuditModuleById(moduleId: string) {
  return auditModules.find((module) => module.id === moduleId) || null
}

export function getAuditRemindersByStatus(status: AuditStatus) {
  return getAuditReminders().filter((reminder) => reminder.status === status)
}

export function getAuditRemindersByPriority(priority: AuditPriority) {
  return getAuditReminders().filter((reminder) => reminder.priority === priority)
}

export function getUpcomingAuditReminders(days = 7) {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + days)

  return getAuditReminders().filter(
    (reminder) => reminder.status !== "completada" && reminder.dueDate > today && reminder.dueDate <= futureDate,
  )
}

export function getOverdueAuditReminders() {
  const today = new Date()

  return getAuditReminders().filter((reminder) => reminder.status !== "completada" && reminder.dueDate < today)
}

export function addAuditReminder(reminder: Omit<AuditReminder, "id" | "createdAt">) {
  const reminders = readStoredReminders()
  const newReminder: AuditReminder = {
    ...reminder,
    id: Date.now().toString(),
    createdAt: new Date(),
  }

  writeStoredReminders([...reminders, newReminder])
  return newReminder
}

export function getAuditReminderByReferenceKey(referenceKey: string) {
  return getAuditReminders().find((reminder) => reminder.referenceKey === referenceKey) || null
}

export function upsertAuditReminderByReferenceKey(
  referenceKey: string,
  reminder: Omit<AuditReminder, "id" | "createdAt">,
) {
  const existing = getAuditReminderByReferenceKey(referenceKey)

  if (!existing) {
    return addAuditReminder({
      ...reminder,
      referenceKey,
    })
  }

  const updated = updateAuditReminder(existing.id, {
    ...reminder,
    referenceKey,
  })

  return updated || existing
}

export function updateAuditReminder(id: string, updates: Partial<AuditReminder>) {
  const reminders = readStoredReminders()
  const index = reminders.findIndex((reminder) => reminder.id === id)
  if (index !== -1) {
    const updated = { ...reminders[index], ...updates }
    if (JSON.stringify(serializeReminderDates(updated)) === JSON.stringify(serializeReminderDates(reminders[index]))) {
      return reminders[index]
    }
    const next = [...reminders]
    next[index] = updated
    writeStoredReminders(next)
    return updated
  }
  return null
}

export function deleteAuditReminder(id: string) {
  const reminders = readStoredReminders()
  const index = reminders.findIndex((reminder) => reminder.id === id)
  if (index !== -1) {
    const next = [...reminders]
    const deleted = next.splice(index, 1)
    writeStoredReminders(next)
    return deleted[0]
  }
  return null
}

const RECURRENCE_MONTHS: Record<AuditReminderRecurrenceInterval, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}

export function getNextRecurringDueDate(
  dueDate: Date,
  interval: AuditReminderRecurrenceInterval,
  now: Date = new Date(),
) {
  const months = RECURRENCE_MONTHS[interval]
  let next = new Date(dueDate.getTime())
  next.setUTCMonth(next.getUTCMonth() + months)

  while (next <= now) {
    next = new Date(next.getTime())
    next.setUTCMonth(next.getUTCMonth() + months)
  }

  return next
}

export function completeAuditReminder(id: string) {
  const existing = getAuditReminders().find((reminder) => reminder.id === id)

  if (existing?.recurrence) {
    return updateAuditReminder(id, {
      status: "pendiente",
      dueDate: getNextRecurringDueDate(existing.dueDate, existing.recurrence.interval),
      completedAt: undefined,
    })
  }

  return updateAuditReminder(id, {
    status: "completada",
    completedAt: new Date(),
  })
}

// Función para obtener el color de prioridad
export function getPriorityColor(priority: AuditPriority) {
  switch (priority) {
    case "alta":
      return "text-primary"
    case "media":
      return "text-primary/80"
    case "baja":
      return "text-primary/60"
    default:
      return ""
  }
}

// Función para obtener el color de estado
export function getStatusColor(status: AuditStatus) {
  switch (status) {
    case "pendiente":
      return "bg-primary/10 text-primary border-none"
    case "en-progreso":
      return "bg-primary/20 text-primary border-none"
    case "completada":
      return "bg-primary/30 text-primary border-none"
    case "vencida":
      return "bg-primary/15 text-primary border-none"
    default:
      return ""
  }
}

// Función para formatear fechas
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

// Función para calcular días restantes
export function getDaysRemaining(dueDate: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}
