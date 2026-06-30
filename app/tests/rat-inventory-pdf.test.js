const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")
const projectRoot = path.join(appDir, "..")

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

  it("normaliza caracteres combinantes en textos de celdas para no deformar el PDF", async () => {
    const pdf = await importModule("app/rat/utils/inventory-pdf.ts")
    const rawNoticeName = "AvisoPrivacidad HCPGRu\u0308nenthal v 4 Davara.docx"

    assert.equal(typeof pdf.normalizePdfCellText, "function")
    assert.equal(
      pdf.normalizePdfCellText(rawNoticeName),
      "AvisoPrivacidad HCPGRünenthal v 4 Davara.docx",
    )
    assert.doesNotMatch(pdf.normalizePdfCellText(rawNoticeName), /\p{M}/u)
  })

  it("mantiene las finalidades como tablas de una sola columna con el texto original", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/utils/inventory-pdf.ts"),
      "utf8",
    )

    assert.doesNotMatch(source, /Finalidades primarias registradas/)
    assert.doesNotMatch(source, /Finalidades secundarias y consentimiento asociado/)
    assert.doesNotMatch(source, /"Finalidad secundaria",\s*"Tipo de consentimiento",\s*"Mecanismo"/)
    assert.match(source, /renderPurposeTable\(\s*"Finalidades primarias"/)
    assert.match(source, /renderPurposeTable\(\s*"Finalidades secundarias"/)
    assert.match(source, /head:\s*\[\[title\]\]/)
  })

  it("conserva cada finalidad en una fila del PDF y omite la tabla de otros campos", async () => {
    const pdf = await importModule("app/rat/utils/inventory-pdf.ts")
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/utils/inventory-pdf.ts"),
      "utf8",
    )

    assert.equal(typeof pdf.buildPurposeTableRows, "function")
    assert.deepEqual(
      pdf.buildPurposeTableRows([
        "Primera línea del mismo párrafo\nsegunda línea del mismo párrafo",
        "Otra finalidad completa",
      ]),
      [
        ["Primera línea del mismo párrafo\nsegunda línea del mismo párrafo"],
        ["Otra finalidad completa"],
      ],
    )
    assert.match(source, /const body = buildPurposeTableRows\(purposes\)/)
    assert.doesNotMatch(source, /Otros datos capturados/)
  })

  it("conserva el orden capturado y une continuaciones sin imponer catálogos de ejemplo", async () => {
    const pdf = await importModule("app/rat/utils/inventory-pdf.ts")
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/utils/inventory-pdf.ts"),
      "utf8",
    )

    assert.deepEqual(
      pdf.buildPurposeTableRows([
        "Identificación y registro: Identificarlo y registrarlo como colaborador de Grünenthal,",
        "darlo de alta en los sistemas internos,",
        "asignarle un correo institucional y generar su credencial de empleado.",
        "Expediente laboral: Crear,",
        "actualizar y conservar su expediente laboral",
        "así como administrar la información relacionada con su trayectoria en la empresa.",
        "Acceso a instalaciones: Controlar su ingreso a las instalaciones y, en su caso,",
        "asignarle un espacio de estacionamiento.",
        "caja de ahorro",
        "Comunicación interna: Mantener comunicaciones estrictamente relacionadas con asuntos laborales.",
      ]),
      [
        [
          "Identificación y registro: Identificarlo y registrarlo como colaborador de Grünenthal, darlo de alta en los sistemas internos, asignarle un correo institucional y generar su credencial de empleado.",
        ],
        [
          "Expediente laboral: Crear, actualizar y conservar su expediente laboral así como administrar la información relacionada con su trayectoria en la empresa.",
        ],
        [
          "Acceso a instalaciones: Controlar su ingreso a las instalaciones y, en su caso, asignarle un espacio de estacionamiento.",
        ],
        [
          "caja de ahorro",
        ],
        [
          "Comunicación interna: Mantener comunicaciones estrictamente relacionadas con asuntos laborales.",
        ],
      ],
    )
    assert.doesNotMatch(source, /Gestión de nómina y prestaciones: Administrar el pago de nómina/)
    assert.doesNotMatch(source, /Uso y seguridad de sistemas: Gestionar, verificar/)
    assert.doesNotMatch(source, /\.sort\(\(a, b\) => a\.purpose/)
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

  it("expone los nombres actualizados de subinventarios Grünenthal", async () => {
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const expectedNamesById = new Map([
      [
        "grunenthal-rat-inventario-flotilla-informacion-solicitada-a-empleado-por-correo",
        "Compraventa-vehículo empleados",
      ],
      [
        "grunenthal-rat-inventario-human-resources-checklist-de-documentacion",
        "Checklist documentación de nuevos empleados",
      ],
      ["grunenthal-rat-inventario-human-resources-cedula-de-datos", "MyView"],
      ["grunenthal-rat-inventario-human-resources-formato-de-alta-proveedor", "Empleados de proveedores"],
      [
        "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesional-de-salud-nacional",
        "Lista de requerimientos contratación HCP (Profesional de salud nacional)",
      ],
      [
        "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesionales-de-la-salud-extranjero",
        "Lista de requerimientos contratación HCP (Profesionales de la salud extranjero)",
      ],
    ])
    const expectedDownloadNamesById = new Map([
      [
        "grunenthal-rat-inventario-flotilla-informacion-solicitada-a-empleado-por-correo",
        "inventario-flotilla-compraventa-vehiculo-empleados.pdf",
      ],
      [
        "grunenthal-rat-inventario-human-resources-checklist-de-documentacion",
        "inventario-human-resources-checklist-documentacion-de-nuevos-empleados.pdf",
      ],
      ["grunenthal-rat-inventario-human-resources-cedula-de-datos", "inventario-human-resources-myview.pdf"],
      [
        "grunenthal-rat-inventario-human-resources-formato-de-alta-proveedor",
        "inventario-human-resources-empleados-de-proveedores.pdf",
      ],
      [
        "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesional-de-salud-nacional",
        "inventario-medical-lista-de-requerimientos-contratacion-hcp-profesional-de-salud-nacional.pdf",
      ],
      [
        "grunenthal-rat-inventario-medical-lista-de-requerimientos-hcp-profesionales-de-la-salud-extranjero",
        "inventario-medical-lista-de-requerimientos-contratacion-hcp-profesionales-de-la-salud-extranjero.pdf",
      ],
    ])
    const subInventoriesById = new Map(
      ratData.GRUNENTHAL_RAT_INVENTORIES.flatMap((inventory) =>
        inventory.subInventories.map((subInventory) => [subInventory.id, subInventory.databaseName]),
      ),
    )
    const pdfLinksBySubInventoryId = new Map(
      ratData.GRUNENTHAL_RAT_PDF_LINKS.map((link) => [link.subInventoryId, link.subInventoryName]),
    )
    const sourceDownloadsById = new Map(
      ratData.GRUNENTHAL_RAT_INVENTORIES.flatMap((inventory) =>
        sourcePdfs.collectInventorySourcePdfs(inventory).map((download) => [download.subInventoryId, download]),
      ),
    )

    for (const [id, expectedName] of expectedNamesById) {
      assert.equal(subInventoriesById.get(id), expectedName)
      assert.equal(pdfLinksBySubInventoryId.get(id), expectedName)
      assert.equal(sourceDownloadsById.get(id)?.downloadName, expectedDownloadNamesById.get(id))
    }
  })

  it("registra el PDF fuente corregido de Gestión de Evaluaciones (MasterControl)", async () => {
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-entrenamiento",
    )

    assert.ok(inventory, "debe existir el inventario Entrenamiento")

    const subInventory = inventory.subInventories.find(
      (item) => item.id === "grunenthal-rat-inventario-entrenamiento-master-evaluaciones",
    )
    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)
    const download = plan.sourcePdfs.find(
      (item) => item.subInventoryId === "grunenthal-rat-inventario-entrenamiento-master-evaluaciones",
    )

    assert.ok(subInventory, "debe existir el subinventario MasterControl")
    assert.equal(subInventory.databaseName, "Gestión de Evaluaciones (MasterControl)")
    assert.equal(subInventory.responsibleArea, "Calidad")
    assert.equal(subInventory.processingSystemName, "MasterControl")
    assert.ok(download, "debe exponer PDF fuente para MasterControl")
    assert.equal(download.subInventoryName, "Gestión de Evaluaciones (MasterControl)")
    assert.equal(download.downloadName, "inventario-entrenamiento-gestion-de-evaluaciones-mastercontrol.pdf")
    assert.equal(
      fs.existsSync(path.join(appDir, "public", download.url.replace(/^\//, ""))),
      true,
      "el PDF público corregido de MasterControl debe existir",
    )

    const pdfContent = fs.readFileSync(
      path.join(projectRoot, "app/public/client/grunenthal/rat/entrenamiento/inventario-entrenamiento-master-evaluaciones.pdf"),
      "latin1",
    )
    assert.match(pdfContent, /Gesti[oó]n de Evaluaciones/)
    assert.doesNotMatch(pdfContent, /Finalidades primarias registradas/)
    assert.doesNotMatch(pdfContent, /Master Evaluaciones/)
  })

  it("registra el PDF fuente corregido de Casos Reportados (Argus - Oracle)", async () => {
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-farmacovigilancia",
    )

    assert.ok(inventory, "debe existir el inventario Farmacovigilancia")

    const subInventory = inventory.subInventories.find(
      (item) => item.id === "grunenthal-rat-inventario-farmacovigilancia-casos-reportados-argus-oracle",
    )
    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)
    const download = plan.sourcePdfs.find(
      (item) => item.subInventoryId === "grunenthal-rat-inventario-farmacovigilancia-casos-reportados-argus-oracle",
    )

    assert.ok(subInventory, "debe existir el subinventario Argus")
    assert.equal(subInventory.databaseName, "Casos Reportados (Argus - Oracle)")
    assert.equal(subInventory.responsibleArea, "Farmacovigilancia")
    assert.equal(subInventory.personalData.length, 12)
    assert.equal(subInventory.personalData[0].purposesPrimary.length, 10)
    assert.equal(subInventory.personalData[0].purposesSecondary.length, 0)
    assert.ok(download, "debe exponer PDF fuente para Argus")
    assert.equal(download.subInventoryName, "Casos Reportados (Argus - Oracle)")
    assert.equal(download.downloadName, "inventario-farmacovigilancia-casos-reportados-argus-oracle.pdf")
    assert.equal(plan.sourcePdfs.length, 1)
    assert.equal(plan.generatedInventories.length, 0)
    assert.equal(
      fs.existsSync(path.join(appDir, "public", download.url.replace(/^\//, ""))),
      true,
      "el PDF público corregido de Argus debe existir",
    )

    const pdfContent = fs.readFileSync(
      path.join(projectRoot, "app/public/client/grunenthal/rat/farmacovigilancia/inventario-farmacovigilancia-casos-reportados-argus-oracle.pdf"),
      "latin1",
    )
    assert.match(pdfContent, /Casos Reportados/)
    assert.doesNotMatch(pdfContent, /Otros datos capturados/)
    assert.doesNotMatch(pdfContent, /17 finalidades primarias/)
  })

  it("mantiene los PDF fuente RAT con solo nombres actualizados", () => {
    const pdfExpectations = [
      [
        "app/public/client/grunenthal/rat/flotilla/inventario-flotilla-informacion-solicitada-a-empleado-por-correo.pdf",
        "Compraventa-vehículo empleados",
        "Información solicitada a empleado por",
      ],
      [
        "app/public/client/grunenthal/rat/hr/inventario-human-resources-checklist-de-documentacion.pdf",
        "Checklist documentación",
        "Checklist de documentación",
      ],
      [
        "app/public/client/grunenthal/rat/hr/inventario-human-resources-cedula-de-datos.pdf",
        "Human resources - MyView",
        "Human resources - Cédula de Datos",
      ],
      [
        "app/public/client/grunenthal/rat/hr/inventario-human-resources-formato-de-alta-proveedor.pdf",
        "Human Resources - Empleados de proveedores",
        "Human Resources - Formato de alta proveedor",
      ],
      [
        "app/public/client/grunenthal/rat/medical/inventario-medical-lista-de-requerimientos-hcp-profesional-de-salud-nacional.pdf",
        "Lista de requerimientos contratación HCP",
        "Lista de requerimientos HCP",
      ],
      [
        "app/public/client/grunenthal/rat/medical/inventario-medical-lista-de-requerimientos-hcp-profesionales-de-la-salud-extranjero.pdf",
        "Lista de requerimientos contratación HCP",
        "Lista de requerimientos HCP",
      ],
    ]

    for (const [relativePath, expectedText, oldText] of pdfExpectations) {
      const pdfContent = fs.readFileSync(path.join(projectRoot, relativePath), "latin1")
      assert.match(pdfContent, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
      assert.doesNotMatch(pdfContent, new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  it("planea siete descargas PDF para COMEX, incluyendo PDFs generados para subinventarios sin fuente", async () => {
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-comex",
    )

    assert.ok(inventory, "debe existir el inventario COMEX")
    assert.equal(typeof sourcePdfs.createInventoryPdfDownloadPlan, "function")

    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)

    assert.equal(plan.sourcePdfs.length, 4)
    assert.equal(plan.generatedInventories.length, 3)
    assert.equal(plan.totalPdfDownloads, 7)
    assert.ok(
      plan.sourcePdfs.some((download) =>
        download.url.endsWith("/client/grunenthal/rat/comex/inventario-comex-open-data-veeva-registro-de-medicos.pdf"),
      ),
      "Open Data Veeva debe descargarse como PDF público vinculado",
    )
    assert.deepEqual(
      plan.generatedInventories.map((item) => item.databaseName).sort(),
      [
        "Gestión De Registro (AgenciaEspañola)",
        "Gestión de Proms y Materiales (Promomats)",
        "Plataforma de Streaming Webinars (Vimeo)",
      ].sort(),
    )
  })

  it("planea PDF fuente para Reporte de Distribuidores Xeomeen dentro de Ventas Internas", async () => {
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-ventas-internas",
    )

    assert.ok(inventory, "debe existir el inventario Ventas Internas")

    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)
    assert.equal(plan.sourcePdfs.length, 2)
    assert.equal(plan.generatedInventories.length, 0)
    assert.equal(plan.totalPdfDownloads, 2)
    assert.ok(
      plan.sourcePdfs.some((download) =>
        download.url.endsWith(
          "/client/grunenthal/rat/ventas-internas/inventario-ventas-internas-reporte-de-distribuidores-xeomeen.pdf",
        ),
      ),
      "Reporte de Distribuidores Xeomeen debe descargarse como PDF público vinculado",
    )
  })

  it("planea dos descargas PDF fuente para Plataformas Grünenthal", async () => {
    const sourcePdfs = await importModule("app/rat/utils/inventory-source-pdfs.ts")
    const ratData = await importModule("lib/grunenthal-rat-data.ts")
    const inventory = ratData.GRUNENTHAL_RAT_INVENTORIES.find(
      (item) => item.id === "grunenthal-rat-area-plataformas-grunenthal",
    )

    assert.ok(inventory, "debe existir el inventario Plataformas Grünenthal")

    const plan = sourcePdfs.createInventoryPdfDownloadPlan(inventory)

    assert.equal(plan.sourcePdfs.length, 2)
    assert.equal(plan.generatedInventories.length, 0)
    assert.equal(plan.totalPdfDownloads, 2)
    assert.deepEqual(
      plan.sourcePdfs.map((download) => download.subInventoryName).sort(),
      ["Beyond / Connect", "Formulario de Contacto Página GRT"].sort(),
    )
    assert.ok(
      plan.sourcePdfs.some((download) =>
        download.url.endsWith(
          "/client/grunenthal/rat/plataformas-grunenthal/inventario-plataformas-grunenthal-beyond-connect.pdf",
        ),
      ),
      "Beyond / Connect debe descargarse como PDF público vinculado",
    )
    assert.ok(
      plan.sourcePdfs.some((download) =>
        download.url.endsWith(
          "/client/grunenthal/rat/plataformas-grunenthal/inventario-plataformas-grunenthal-formulario-de-contacto-pagina-grt.pdf",
        ),
      ),
      "Formulario de Contacto Página GRT debe descargarse como PDF público vinculado",
    )
    assert.equal(
      plan.sourcePdfs.every((download) =>
        fs.existsSync(path.join(appDir, "public", download.url.replace(/^\//, ""))),
      ),
      true,
      "los PDFs públicos de Plataformas Grünenthal deben existir en public",
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

  it("no renderiza la tabla catch-all de otros datos al final del PDF", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/rat/utils/inventory-pdf.ts"),
      "utf8",
    )

    assert.doesNotMatch(source, /const remaining = Object\.keys\(sub\)/)
    assert.doesNotMatch(source, /const otherData/)
    assert.doesNotMatch(source, /Otros datos capturados/)
  })
})
