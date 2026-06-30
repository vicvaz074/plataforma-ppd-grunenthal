const { before, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("visor de archivos", () => {
  let filePreview

  before(async () => {
    filePreview = await importModule("lib/file-preview.ts")
  })

  it("usa un PDF seguro como preview para un aviso DOCX público y conserva la descarga original", () => {
    const descriptor = filePreview.buildFilePreviewDescriptor({
      id: "grunenthal-privacy-notices-manualap-grunentha-davara-v6",
      name: "ManualAP_Grünentha Davara v6.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 165781,
      content: "/client/grunenthal/privacy-notices/manualap-grunentha-davara-v6.docx",
      uploadDate: "2026-01-01T00:00:00.000Z",
      category: "privacy-notice",
      metadata: {
        title: "ManualAP_Grünentha Davara v6",
        module: "privacy-notices",
        previewPdfPath: "/client/grunenthal/privacy-notices/manualap-grunentha-davara-v6-preview.pdf",
      },
    })

    assert.equal(descriptor.kind, "office")
    assert.equal(descriptor.previewKind, "pdf")
    assert.equal(
      descriptor.fileUrl,
      "/client/grunenthal/privacy-notices/manualap-grunentha-davara-v6.docx",
    )
    assert.equal(
      descriptor.previewUrl,
      "/client/grunenthal/privacy-notices/manualap-grunentha-davara-v6-preview.pdf",
    )
    assert.equal(descriptor.canEmbed, true)
    assert.equal(descriptor.extension, "DOCX")
    assert.equal(descriptor.downloadName, "ManualAP_Grünentha Davara v6.docx")
    assert.equal(descriptor.title, "ManualAP_Grünentha Davara v6")
  })

  it("no ofrece vista previa para JSON aunque conserve la descarga segura", () => {
    const descriptor = filePreview.buildFilePreviewDescriptor({
      id: "export-json",
      name: "inventarios.json",
      type: "application/json",
      size: 42,
      content: "data:application/json;base64,e30=",
      uploadDate: "2026-01-01T00:00:00.000Z",
      category: "export",
      metadata: {},
    })

    assert.equal(descriptor.kind, "json")
    assert.equal(descriptor.previewKind, "json")
    assert.equal(descriptor.canEmbed, false)
    assert.equal(filePreview.canOfferFilePreview(descriptor), false)
  })

  it("incrusta PDFs públicos directamente", () => {
    const descriptor = filePreview.buildFilePreviewDescriptor({
      id: "rat-pdf",
      name: "Inventario.pdf",
      type: "application/pdf",
      size: 1234,
      content: "/client/grunenthal/rat/comex/comex-ranking-de-efectividad.pdf",
      uploadDate: "2026-01-01T00:00:00.000Z",
      category: "rat-inventory",
      metadata: {},
    })

    assert.equal(descriptor.kind, "pdf")
    assert.equal(
      descriptor.previewUrl,
      "/client/grunenthal/rat/comex/comex-ranking-de-efectividad.pdf",
    )
    assert.equal(descriptor.canEmbed, true)
    assert.equal(descriptor.extension, "PDF")
  })

  it("rechaza rutas inseguras antes de construir el preview", () => {
    assert.throws(
      () =>
        filePreview.buildFilePreviewDescriptor({
          id: "unsafe",
          name: "unsafe.pdf",
          type: "application/pdf",
          size: 1,
          content: "https://example.com/unsafe.pdf",
          uploadDate: "2026-01-01T00:00:00.000Z",
          category: "privacy-notice",
          metadata: {},
        }),
      /URL de archivo no permitida/,
    )
  })
})
