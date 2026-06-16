const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const shellPath = path.join(__dirname, "../components/arco-module-shell.tsx")

describe("visor documental en shell de módulos", () => {
  it("muestra acciones visuales por documento exportable sin previsualizar JSON", () => {
    const source = fs.readFileSync(shellPath, "utf8")

    assert.match(source, /FilePreviewDialog/, "debe reutilizar el modal común de vista previa")
    assert.match(source, /canOfferFilePreview/, "debe omitir vista previa para JSON")
    assert.match(source, /previewExportFile/, "debe mantener el documento seleccionado para observar")
    assert.match(source, />\s*Observar\s*</, "debe mostrar una acción explícita para observar")
    assert.match(source, /Descargar documentos/, "debe conservar la descarga masiva existente")
  })
})
