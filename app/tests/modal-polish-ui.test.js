const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const dialogPath = path.join(__dirname, "..", "components", "ui", "dialog.tsx")
const alertDialogPath = path.join(__dirname, "..", "components", "ui", "alert-dialog.tsx")
const contractsDocumentsPath = path.join(
  __dirname,
  "..",
  "app",
  "third-party-contracts",
  "documents",
  "page.tsx",
)
const filePreviewDialogPath = path.join(__dirname, "..", "components", "file-preview-dialog.tsx")

describe("pulido visual de modales", () => {
  it("usa un cierre compacto y reserva aire en headers/footers del Dialog base", () => {
    const source = fs.readFileSync(dialogPath, "utf8")

    assert.match(source, /size-9/, "el botón de cerrar debe tener una superficie táctil consistente")
    assert.match(source, /rounded-full/, "el cierre debe sentirse premium y no como una x flotante")
    assert.match(source, /DialogHeader[\s\S]*pr-14/, "los headers deben reservar espacio para el cierre")
    assert.match(source, /DialogFooter[\s\S]*gap-2/, "los footers deben usar gaps simétricos")
    assert.doesNotMatch(source, /space-x-2/, "el footer base no debe depender de space-x")
    assert.doesNotMatch(source, /space-y-1\.5/, "el header base no debe depender de space-y")
  })

  it("homologa AlertDialog con el mismo patrón de composición", () => {
    const source = fs.readFileSync(alertDialogPath, "utf8")

    assert.match(source, /rounded-\[20px\]/)
    assert.match(source, /AlertDialogHeader[\s\S]*gap-2/)
    assert.match(source, /AlertDialogFooter[\s\S]*gap-2/)
    assert.doesNotMatch(source, /space-x-2/)
    assert.doesNotMatch(source, /space-y-2/)
  })

  it("el modal de análisis de contratos evita solapes con la x y mantiene cuerpo/footer simétricos", () => {
    const source = fs.readFileSync(contractsDocumentsPath, "utf8")

    assert.match(source, /!\w-\[min\(1040px,calc\(100vw_-_2rem\)\)\]/)
    assert.match(source, /pr-16/, "el header del análisis debe reservar aire para la x")
    assert.match(source, /grid gap-4 sm:grid-cols-\[minmax\(0,1fr\)_auto\]/)
    assert.match(source, /max-h-\[min\(62vh,640px\)\]/, "el cuerpo debe sentirse contenido y scrolleable")
    assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_320px\]/)
    assert.match(source, /sticky top-0/, "el resumen lateral debe mantenerse legible sin crecer de más")
    assert.match(source, /justify-between/, "el footer debe equilibrar contexto y acción principal")
  })

  it("el visor documental comparte el mismo cierre seguro en header", () => {
    const source = fs.readFileSync(filePreviewDialogPath, "utf8")

    assert.match(source, /pr-16/)
    assert.match(source, /!\w-\[min\(944px,calc\(100vw_-_2rem\)\)\]/)
  })
})
