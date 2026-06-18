const { before, beforeEach, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
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

  clear() {
    this.store.clear()
  }
}

describe("dashboard de avance documental", () => {
  let seed
  let dashboardProgress

  before(async () => {
    seed = await importModule("lib/grunenthal-seed.ts")
    dashboardProgress = await importModule("lib/dashboard-progress.ts")
  })

  beforeEach(() => {
    const localStorage = new LocalStorageMock()
    global.localStorage = localStorage
    global.window = {
      localStorage,
      dispatchEvent() {},
    }
  })

  it("cuenta recursos de capacitación y documentos de políticas como avance parcial", async () => {
    await seed.seedGrunenthalDemoData()

    const training = dashboardProgress.getTrainingDashboardSnapshot()
    assert.equal(training.programs > 0, true)
    assert.equal(training.resources > 0, true)
    assert.equal(training.score > 0, true)
    assert.equal(training.score < 100, true)

    const policies = dashboardProgress.getPolicyDashboardSnapshot()
    assert.equal(policies.total > 0, true)
    assert.equal(policies.documentCount > 0, true)
    assert.equal(policies.score > 0, true)
    assert.equal(policies.score < 100, true)
  })

  it("conecta los snapshots al dashboard admin y al progreso de usuario", () => {
    const dashboardSource = fs.readFileSync(path.join(appDir, "app", "dashboard", "page.tsx"), "utf8")
    const progressSource = fs.readFileSync(path.join(appDir, "components", "user-progress-dashboard.tsx"), "utf8")

    assert.match(dashboardSource, /getTrainingDashboardSnapshot/)
    assert.match(dashboardSource, /getPolicyDashboardSnapshot/)
    assert.match(progressSource, /applyEvidenceProgress/)
    assert.match(progressSource, /getTrainingDashboardSnapshot/)
    assert.match(progressSource, /getPolicyDashboardSnapshot/)
  })
})
