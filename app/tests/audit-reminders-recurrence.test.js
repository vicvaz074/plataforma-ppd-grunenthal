const { beforeEach, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importFresh(relativePath) {
  const modulePath = pathToFileURL(path.join(appDir, relativePath)).href
  const imported = await import(`${modulePath}?recurrence=${Date.now()}-${Math.random()}`)
  return imported.default ? { ...imported.default, ...imported } : imported
}

class LocalStorageMock {
  constructor() {
    this.store = new Map()
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }

  removeItem(key) {
    this.store.delete(key)
  }
}

describe("recordatorios recurrentes de contratos", () => {
  beforeEach(() => {
    const localStorage = new LocalStorageMock()
    global.localStorage = localStorage
    global.window = {
      localStorage,
      dispatchEvent() {},
    }
  })

  it("al completar un recordatorio recurrente programa el siguiente vencimiento", async () => {
    const audit = await importFresh("lib/audit-alarms.ts")
    const referenceKey = "third-party-contract:update:contract-grt-demo"

    const reminder = audit.upsertAuditReminderByReferenceKey(referenceKey, {
      title: "Actualizar contrato: HAYS - AG",
      description: "Revisar vigencia, cláusulas y anexos del contrato.",
      dueDate: new Date("2099-01-10T09:00:00.000Z"),
      priority: "media",
      status: "pendiente",
      assignedTo: ["Admin"],
      category: "Contratos con terceros",
      moduleId: "contratos-terceros",
      notes: "Contrato GRT-CTR-2026-001",
      referenceKey,
      recurrence: {
        interval: "quarterly",
        sourceModule: "third-party-contracts",
        sourceRecordId: "contract-grt-demo",
      },
    })

    const completed = audit.completeAuditReminder(reminder.id)
    const stored = audit.getAuditReminderByReferenceKey(referenceKey)

    assert.equal(completed.status, "pendiente")
    assert.equal(stored.status, "pendiente")
    assert.equal(stored.dueDate.toISOString(), "2099-04-10T09:00:00.000Z")
    assert.equal(stored.recurrence.interval, "quarterly")
    assert.equal(audit.getAuditReminders().length, 1)
  })
})
