const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const appDir = path.join(__dirname, "..")
const proceduresPath = path.join(appDir, "app/arco-rights/components/arco-procedures.tsx")

describe("plantilla Excel ARCO", () => {
  it("expone la matriz de control ARCO como plantilla descargable y previsualizable", () => {
    const source = fs.readFileSync(proceduresPath, "utf8")

    assert.match(
      source,
      /ARCO_TEMPLATE_ASSET_ID/,
      "el componente debe referenciar explícitamente el asset de matriz ARCO",
    )
    assert.match(source, /Plantilla operativa ARCO/, "debe mostrar una tarjeta clara de plantilla")
    assert.match(source, /Matriz de control y seguimiento/, "debe nombrar la matriz para el usuario")
    assert.match(source, /FilePreviewDialog/, "debe permitir observar la plantilla")
    assert.match(source, /Descargar plantilla/, "debe incluir una acción elegante de descarga")
    assert.match(source, /canOfferFilePreview/, "debe respetar la regla de no previsualizar formatos no permitidos")
  })
})
