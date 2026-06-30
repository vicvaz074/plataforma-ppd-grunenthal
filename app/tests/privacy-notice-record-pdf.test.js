const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("PDF soporte de avisos de privacidad", () => {
  it("normaliza texto visible y nombres de archivo sin romper acentos", async () => {
    const pdf = await importModule("app/privacy-notices/utils/privacy-notice-record-pdf.ts")

    assert.equal(
      pdf.normalizePrivacyNoticePdfText("Aviso Direccio\u0301n General Grunenthal"),
      "Aviso Dirección General Grünenthal",
    )
    assert.equal(
      pdf.buildPrivacyNoticeRecordPdfFileName("Aviso Direccio\u0301n General Grünenthal"),
      "soporte_aviso_Aviso_Direccion_General_Grunenthal.pdf",
    )
  })

  it("construye filas de soporte con autoría Legal y wrapping acotado", async () => {
    const { jsPDF } = await import("jspdf")
    const pdf = await importModule("app/privacy-notices/utils/privacy-notice-record-pdf.ts")
    const doc = new jsPDF()
    doc.setFontSize(10)
    const rows = pdf.buildPrivacyNoticeRecordRows(
      doc,
      {
        id: "notice-1",
        name: "Aviso Dirección General Grünenthal.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 0,
        content: "/client/grunenthal/privacy-notices/manualap-grunentha-davara-v6.docx",
        uploadDate: "2026-01-01T00:00:00.000Z",
        category: "privacy-notice",
        metadata: {
          noticeName: "Aviso Dirección General Grünenthal con descripción extensa para validar ajuste",
          createdBy: "Legal",
          holderCategories: ["empleados"],
          noticeTypes: ["integral"],
          responsibleAreas: ["recursos_humanos"],
          versionCode: "1.0",
          issueDate: "2025-12-31",
          evidenceNotes: "Registro extraído del ManualAP.",
        },
      },
      88,
    )

    const printable = rows.flatMap((row) => row.lines).join("\n")
    assert.match(printable, /Creado por: Legal/)
    assert.match(printable, /Aviso Dirección General Grünenthal/)
    assert.equal(rows.find((row) => row.label === "Fecha de emisión")?.value, "31/12/2025")

    for (const line of rows.flatMap((row) => row.lines)) {
      assert.ok(doc.getTextWidth(line) <= 88 + 0.01, `línea fuera de ancho: ${line}`)
    }
  })
})
