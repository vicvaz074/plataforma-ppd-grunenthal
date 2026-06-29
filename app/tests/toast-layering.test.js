const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const clientLayoutPath = path.join(__dirname, "..", "app", "ClientLayout.tsx")
const toastPath = path.join(__dirname, "..", "components", "ui", "toast.tsx")

describe("toasts globales", () => {
  it("monta el toaster global y lo mantiene por encima de modales", () => {
    const clientLayoutSource = fs.readFileSync(clientLayoutPath, "utf8")
    const toastSource = fs.readFileSync(toastPath, "utf8")

    assert.match(clientLayoutSource, /import \{ Toaster \} from "@\/components\/ui\/toaster"/)
    assert.match(clientLayoutSource, /<Toaster \/>/)
    assert.match(
      toastSource,
      /z-\[10000\]/,
      "el viewport de toast debe estar por encima de DialogContent z-50 y menús z-[9999]",
    )
  })
})
