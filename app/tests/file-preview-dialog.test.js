const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const dialogPath = path.join(__dirname, "../components/file-preview-dialog.tsx")

describe("modal de vista previa documental", () => {
  it("renderiza PDFs sin iframe bloqueado y mantiene acciones visibles", () => {
    const source = fs.readFileSync(dialogPath, "utf8")

    assert.match(source, /PdfCanvasPreview/, "debe usar un visor PDF propio")
    assert.match(source, /pdfjs-dist/, "debe renderizar PDFs con PDF.js")
    assert.match(source, /PDF_PAGE_BATCH_SIZE/, "debe renderizar PDFs pesados por tandas")
    assert.match(source, /setRenderedPageCount/, "debe marcar páginas visibles conforme se renderizan")
    assert.match(source, /ImagePagePreview/, "debe tener fallback visual para PDFs que PDF.js pinta en blanco")
    assert.match(source, /previewPageImageUrls/, "debe aceptar páginas pre-renderizadas como imágenes")
    assert.match(source, /Cargar más páginas/, "debe permitir continuar el preview sin bloquear el modal")
    assert.doesNotMatch(source, /<iframe/i, "no debe usar iframe porque frame-src bloquea el contenido")
    assert.match(source, /flex-col/, "el modal debe separar header, cuerpo y footer en columna")
    assert.match(source, /overflow-y-auto/, "solo el cuerpo del preview debe hacer scroll")
    assert.match(source, /DialogFooter className=.*border-t/, "las acciones deben quedar en un footer visible")
  })

  it("mantiene el modal visualmente contenido en el viewport", () => {
    const source = fs.readFileSync(dialogPath, "utf8")

    assert.match(source, /max-h-\[86vh\]/, "el modal no debe ocupar casi toda la altura de pantalla")
    assert.match(source, /!\w-\[min\(944px,calc\(100vw_-_2rem\)\)\]/, "el modal debe tener 15% más ancho sin desbordar el viewport")
    assert.match(source, /!max-w-\[944px\]/, "el modal debe impedir que md:w-full lo expanda")
    assert.match(source, /rounded-\[24px\]/, "el contenedor debe sentirse cerrado y no desbordado")
    assert.match(source, /Math\.min\(782/, "las páginas PDF deben renderizarse a una escala legible pero contenida")
  })
})
