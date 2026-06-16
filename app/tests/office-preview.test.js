const { before, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("previsualización PDF de documentos Office", () => {
  let officePreview

  before(async () => {
    officePreview = await importModule("lib/office-preview.ts")
  })

  it("detecta DOCX y DOCM como convertibles a PDF de preview", () => {
    assert.equal(
      officePreview.canGenerateOfficePdfPreview({
        name: "Manual.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      true,
    )
    assert.equal(
      officePreview.canGenerateOfficePdfPreview({
        name: "Procedimiento.docm",
        type: "application/vnd.ms-word.document.macroEnabled.12",
      }),
      true,
    )
    assert.equal(
      officePreview.canGenerateOfficePdfPreview({
        name: "inventario.json",
        type: "application/json",
      }),
      false,
    )
  })

  it("genera un PDF data URL a partir de texto extraído", async () => {
    const dataUrl = await officePreview.createTextPdfPreviewDataUrl({
      title: "Manual de prueba",
      sourceLabel: "manual.docx",
      text: "Contenido de prueba para la vista previa.",
    })

    assert.match(dataUrl, /^data:application\/pdf;base64,/)
    assert.ok(dataUrl.length > 200, "debe generar un PDF con contenido real")
  })
})
