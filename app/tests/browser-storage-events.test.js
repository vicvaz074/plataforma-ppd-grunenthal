const { afterEach, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

function makeRepeatingInventoryPayload() {
  return JSON.stringify(
    Array.from({ length: 250 }, (_, index) => ({
      id: `inventory-${index}`,
      databaseName: "Human Resources",
      subInventories: [
        {
          id: `sub-${index}`,
          databaseName: "Checklist documentación de nuevos empleados",
          primaryPurposes: [
            "Identificación y registro: Identificarlo y registrarlo como colaborador de Grünenthal, darlo de alta en los sistemas internos, asignarle un correo institucional y generar su credencial de empleado.",
            "Expediente laboral: Crear, actualizar y conservar su expediente laboral, así como administrar la información relacionada con su trayectoria en la empresa.",
            "Cumplimiento normativo: Dar cumplimiento a la legislación aplicable y atender requerimientos de autoridades competentes en los casos legalmente previstos.",
          ],
        },
      ],
    })),
  )
}

function createQuotaStorageClass(limit) {
  return class QuotaLocalStorageMock {
    constructor() {
      this.store = new Map()
    }

    get length() {
      return this.store.size
    }

    key(index) {
      return Array.from(this.store.keys())[index] || null
    }

    getItem(key) {
      return this.store.has(key) ? this.store.get(key) : null
    }

    setItem(key, value) {
      const nextStore = new Map(this.store)
      nextStore.set(key, String(value))
      const nextSize = Array.from(nextStore.values()).reduce((total, item) => total + item.length, 0)

      if (nextSize > limit) {
        const error = new Error("Setting the value exceeded the quota")
        error.name = "QuotaExceededError"
        throw error
      }

      this.store = nextStore
    }

    removeItem(key) {
      this.store.delete(key)
    }

    clear() {
      this.store.clear()
    }

    rawItem(key) {
      return this.store.has(key) ? this.store.get(key) : null
    }
  }
}

describe("puente de eventos de localStorage", () => {
  afterEach(() => {
    delete global.window
    delete global.localStorage
    delete global.CustomEvent
    delete global.Event
  })

  it("comprime valores grandes sin cambiar lo que lee la aplicación", async () => {
    const payload = makeRepeatingInventoryPayload()
    const StorageMock = createQuotaStorageClass(Math.floor(payload.length * 0.65))
    const localStorage = new StorageMock()

    assert.throws(
      () => localStorage.setItem("inventories", payload),
      /quota/i,
      "sin compresión, el payload debe exceder la cuota simulada",
    )

    global.CustomEvent = class CustomEvent {
      constructor(type, init) {
        this.type = type
        this.detail = init?.detail
      }
    }
    global.Event = class Event {
      constructor(type) {
        this.type = type
      }
    }
    global.window = {
      localStorage,
      dispatchEvent() {},
    }
    global.localStorage = localStorage

    const storageBridge = await importModule("lib/browser-storage-events.ts")

    storageBridge.ensureBrowserStorageEvents()

    assert.doesNotThrow(() => window.localStorage.setItem("inventories", payload))
    assert.equal(window.localStorage.getItem("inventories"), payload)
    assert.deepEqual(JSON.parse(window.localStorage.getItem("inventories")), JSON.parse(payload))

    const rawValue = localStorage.rawItem("inventories")
    assert.match(rawValue, /^__davara_lz_utf16__:/)
    assert.ok(rawValue.length < payload.length * 0.65, "el valor persistido debe quedar por debajo de la cuota")
  })

  it("instala el puente de storage antes de sembrar la demo", () => {
    const source = fs.readFileSync(path.join(appDir, "app/ClientLayout.tsx"), "utf8")

    assert.match(source, /ensureBrowserStorageEvents/)
    assert.ok(
      source.indexOf("ensureBrowserStorageEvents()") < source.indexOf("seedGrunenthalDemoData()"),
      "ClientLayout debe preparar localStorage antes de escribir inventarios",
    )
  })
})
