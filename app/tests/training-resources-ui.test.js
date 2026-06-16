const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const appDir = path.join(__dirname, "..")
const recursosPath = path.join(appDir, "app/davara-training/components/RecursosMateriales.tsx")
const pagePath = path.join(appDir, "app/davara-training/page.tsx")

describe("recursos de capacitación", () => {
  it("ofrece vista previa modal para recursos descargables y evita preview en JSON", () => {
    const source = fs.readFileSync(recursosPath, "utf8")

    assert.match(source, /FilePreviewDialog/, "debe usar el visor común de archivos")
    assert.match(source, /saveFile\(/, "debe persistir archivos subidos en storedFiles")
    assert.match(source, /getFileById\(/, "debe recuperar archivos reales para previsualizar/descargar")
    assert.match(source, /canOfferFilePreview/, "debe ocultar vista previa para JSON")
    assert.match(source, />\s*(Observar|Ver)\s*</, "debe mostrar una acción visible para observar")
    assert.match(source, /previewFile/, "debe conservar el archivo seleccionado para el modal")
  })

  it("mantiene el tab de recursos dentro de pantalla y usa acentos azules en capacitación", () => {
    const pageSource = fs.readFileSync(pagePath, "utf8")
    const resourcesSource = fs.readFileSync(recursosPath, "utf8")

    assert.match(pageSource, /min-w-0/, "la página debe permitir que las pestañas encojan sin desbordar")
    assert.match(pageSource, /overflow-x-auto/, "las pestañas deben desplazarse horizontalmente en pantallas estrechas")
    assert.match(pageSource, /text-blue-600/, "el icono activo de capacitación debe ser azul")
    assert.doesNotMatch(pageSource, /text-emerald-600/, "el icono principal no debe quedar verde")

    assert.match(resourcesSource, /min-w-0/, "las tarjetas y filtros de recursos deben proteger textos largos")
    assert.match(resourcesSource, /overflow-x-auto/, "la zona de filtros debe manejar contenido ancho")
    assert.match(resourcesSource, /text-blue-600/, "los encabezados de recursos deben usar azul")
  })
})
