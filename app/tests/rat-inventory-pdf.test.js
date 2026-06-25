const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("generación PDF de inventarios RAT", () => {
  it("usa el verde Grünenthal como color predeterminado en reportes RAT", () => {
    const reportSources = [
      "app/rat/utils/inventory-pdf.ts",
      "app/rat/informes/page.tsx",
      "app/rat/components/inventory-form.tsx",
      "app/rat/utils/inventory-normalization.ts",
    ]

    for (const relativePath of reportSources) {
      const source = fs.readFileSync(path.join(appDir, relativePath), "utf8")
      assert.doesNotMatch(source, /#1E3A8A/, `${relativePath} conserva el azul anterior`)
    }
  })

  it("prepara las líneas de portada con acentos y ancho acotado", async () => {
    const { jsPDF } = await import("jspdf")
    const pdf = await importModule("app/rat/utils/inventory-pdf.ts")

    assert.equal(typeof pdf.buildCoverInfoRows, "function")

    const doc = new jsPDF()
    doc.setFontSize(12)
    const maxWidth = 70
    const rows = pdf.buildCoverInfoRows(
      doc,
      {
        databaseName:
          "Direccion General con una descripción extendida para comprobar que el texto no se sale del bloque de portada",
        responsible: "grunenthal",
        createdAt: "2025-11-17T00:00:00.000Z",
        updatedAt: "2026-01-06T00:00:00.000Z",
      },
      maxWidth,
    )

    const renderedText = rows.flatMap((row) => row.lines).join("\n")

    assert.match(renderedText, /Dirección General/)
    assert.match(renderedText, /Responsable: Grünenthal/)
    assert.doesNotMatch(renderedText, /D i r e c c i o n/)

    for (const line of rows.flatMap((row) => row.lines)) {
      assert.ok(
        doc.getTextWidth(line) <= maxWidth + 0.01,
        `La línea de portada excede el ancho permitido: ${line}`,
      )
    }
  })

  it("normaliza acentos combinados para texto visible y usa nombres de archivo sin acentos", async () => {
    const pdf = await importModule("app/rat/utils/inventory-pdf.ts")

    assert.equal(
      pdf.normalizeReportText("Direccio\u0301n General"),
      "Dirección General",
    )
    assert.equal(
      pdf.buildInventoryPdfFileName("Direccio\u0301n General"),
      "inventario_Direccion_General.pdf",
    )
  })

  it("prefiere los PDFs fuente vinculados para descargar inventarios Grünenthal", async () => {
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-direccion-general",
    )

    assert.ok(inventory, "debe existir el inventario Dirección General")

    const downloads = sourcePdfs.collectInventorySourcePdfs(inventory)

    assert.equal(downloads.length, 3)
    assert.deepEqual(
      downloads.map((download) => download.subInventoryName).sort(),
      ["Conave México", "Listado de Tallas Core Team", "Rooming General"].sort(),
    )
    assert.equal(
      downloads.every((download) =>
        download.url.startsWith("/client/grunenthal/rat/direccion-general/"),
      ),
      true,
    )
    assert.equal(
      downloads.every((download) => download.downloadName.startsWith("inventario-direccion-general-")),
      true,
    )
  })

  it("planea cuatro descargas PDF para COMEX, incluyendo un PDF generado por subinventario sin fuente", async () => {
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-comex",
    )

    assert.ok(inventory, "debe existir el inventario COMEX")
    assert.equal(typeof sourcePdfs.createInventoryPdfDownloadPlan, "function")

    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)

    assert.equal(plan.sourcePdfs.length, 3)
    assert.equal(plan.generatedInventories.length, 1)
    assert.equal(plan.totalPdfDownloads, 4)
    assert.equal(plan.generatedInventories[0].databaseName, "Open Data (Veeva) - Registro de Médicos")
    assert.deepEqual(
      plan.generatedInventories[0].subInventories.map((subInventory) => subInventory.databaseName),
      ["Open Data (Veeva) - Registro de Médicos"],
    )
  })

  it("planea PDF generado para Reporte de Distribuidores Xeomeen dentro de Ventas Internas", async () => {
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-ventas-internas",
    )

    assert.ok(inventory, "debe existir el inventario Ventas Internas")

    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)
    const generatedNames = plan.generatedInventories.map((item) => item.databaseName)

    assert.equal(plan.sourcePdfs.length, 1)
    assert.equal(plan.generatedInventories.length, 1)
    assert.equal(plan.totalPdfDownloads, 2)
    assert.deepEqual(generatedNames, ["Reporte de Distribuidores Xeomeen"])
    assert.deepEqual(
      plan.generatedInventories[0].subInventories.map((subInventory) => subInventory.databaseName),
      ["Reporte de Distribuidores Xeomeen"],
    )
  })

  it("aclara que el respaldo masivo de inventarios es JSON y reserva la descarga PDF a las filas", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/components/inventory-list.tsx"),
      "utf8",
    )

    assert.doesNotMatch(source, />\s*Descargar inventarios\s*</)
    assert.match(source, />\s*Exportar respaldo JSON\s*</)
  })

  it("pinta las líneas preenvueltas de portada sin pedir ajuste de ancho al renderizador", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/utils/inventory-pdf.ts"),
      "utf8",
    )

    assert.doesNotMatch(
      source,
      /maxWidth:\s*coverInfoMaxWidth/,
      "La portada ya divide el texto antes de pintar; pasar maxWidth a doc.text puede deformar el espaciado",
    )
  })

  it("oculta metadatos internos y arreglos técnicos de archivos en otros datos del PDF", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/utils/inventory-pdf.ts"),
      "utf8",
    )

    assert.match(source, /isInternalPdfMetadataField/)
    assert.match(source, /key\.startsWith\("grunenthal"\)/)
    assert.match(source, /key\.endsWith\("FileIds"\)/)
    assert.match(source, /key\.endsWith\("FileNames"\)/)
  })
})
