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

async function loadXlsx() {
  const imported = await import("xlsx-js-style")
  return imported.default ? { ...imported.default, ...imported } : imported
}

function workbookFromSheets(xlsx, sheets) {
  const workbook = xlsx.utils.book_new()
  Object.entries(sheets).forEach(([name, rows]) => {
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), name)
  })
  return workbook
}

describe("importacion Excel RAT", () => {
  it("importa el template normalizado con subinventarios, datos, transferencias y remisiones", async () => {
    const xlsx = await loadXlsx()
    const { parseRatWorkbook } = await importModule("app/rat/utils/parseRatExcel.ts")

    const workbook = workbookFromSheets(xlsx, {
      Inventarios: [
        [
          "Subinventario ID",
          "Nombre del inventario general",
          "Base de datos",
          "Tipo de titulares",
          "Volumen de titulares",
          "Accesibilidad",
          "Entorno",
          "Area responsable",
          "Medio de obtencion",
          "Fuente de obtencion",
          "¿Requiere consentimiento?",
          "Tipo de consentimiento",
          "Mecanismo de consentimiento",
          "Area encargada",
          "Sistema / metodo",
          "Nombre del sistema",
          "Descripcion del procesamiento",
          "Privilegios",
          "Medio de almacenamiento",
          "Ubicacion fisica",
          "Periodicidad de respaldo",
          "¿Se respalda?",
          "Descripcion del respaldo",
          "Responsable del respaldo",
          "Plazo de conservacion",
          "Justificacion de conservacion",
          "Tiempo de bloqueo",
          "Metodos de supresion",
          "¿Existe transferencia?",
          "¿Existe remision?",
        ],
        [
          "sub-1",
          "Inventario RH",
          "Nomina",
          "Empleados; Candidatos",
          "<5k",
          "A2",
          "E2",
          "Recursos Humanos",
          "directo",
          "Formulario interno",
          "Si",
          "expreso",
          "escrito",
          "Recursos Humanos",
          "Electronico",
          "Workday",
          "Registro; Uso",
          "Visualizacion; Edicion",
          "nube",
          "CDMX",
          "Mensual",
          "Si",
          "Replica diaria",
          "ti",
          "5 anos",
          "Cumplimiento legal",
          "2 anos",
          "Trituracion; Sobre-escritura",
          "Si",
          "Si",
        ],
        [
          "sub-2",
          "Inventario RH",
          "Candidatos",
          "Candidatos",
          "<500",
          "A1",
          "E5",
          "Recursos Humanos",
          "indirecto",
          "Bolsa de trabajo",
          "No",
          "",
          "",
          "Recursos Humanos",
          "Electronico",
          "ATS",
          "Captura",
          "Visualizacion",
          "nube",
          "Remoto",
          "",
          "No",
          "",
          "",
          "1 ano",
          "Relacion juridica",
          "6 meses",
          "Sobre-escritura",
          "No",
          "No",
        ],
      ],
      "Datos personales": [
        [
          "Subinventario ID",
          "Dato personal",
          "Categoria",
          "Nivel de riesgo",
          "Proporcionalidad",
          "Finalidades primarias",
          "Finalidades secundarias",
        ],
        ["sub-1", "Nombre", "Identificacion", "BAJO", "Si", "Gestion de nomina; Contacto laboral", ""],
        ["sub-1", "Estado de salud", "Salud", "ALTO", "No", "Prestaciones", "Estadistica interna"],
        ["sub-2", "Correo", "Contacto", "Medio", "þ", "Reclutamiento", ""],
      ],
      Transferencias: [
        [
          "Subinventario ID",
          "Destinatario",
          "Finalidades",
          "¿Requiere consentimiento?",
          "Tipo de consentimiento",
          "Instrumento juridico",
          "¿Esta en el AP?",
        ],
        ["sub-1", "Proveedor cloud", "Alojamiento", "No", "", "Contrato", "Si"],
        ["sub-1", "Autoridad laboral", "Cumplimiento legal", "No", "", "Excepcion legal", "No"],
      ],
      Remisiones: [
        ["Subinventario ID", "Destinatario", "Finalidades", "Instrumento juridico"],
        ["sub-1", "Despacho externo", "Soporte; Auditoria", "Contrato de encargado"],
        ["sub-1", "Mesa de ayuda", "Soporte", "Orden de servicio"],
      ],
    })

    const parsed = parseRatWorkbook(workbook)

    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].databaseName, "Nomina")
    assert.deepEqual(parsed[0].holderTypes, ["Empleados", "Candidatos"])
    assert.equal(parsed[0].consentRequired, true)
    assert.deepEqual(parsed[0].processingArea, ["Recursos Humanos"])
    assert.deepEqual(parsed[0].processingDescription, ["Registro", "Uso"])
    assert.equal(parsed[0].isBackedUp, true)
    assert.deepEqual(parsed[0].deletionMethods, ["Trituracion", "Sobre-escritura"])
    assert.equal(parsed[0].personalData.length, 2)
    assert.deepEqual(parsed[0].personalData[0].purposesPrimary, ["Gestion de nomina", "Contacto laboral"])
    assert.equal(parsed[0].personalData[1].riesgo, "alto")
    assert.equal(parsed[0].personalData[1].proporcionalidad, false)
    assert.deepEqual(parsed[0].personalData[1].purposesSecondary, ["Estadistica interna"])
    assert.equal(parsed[0].dataTransfer, "si")
    assert.equal(parsed[0].transferRecipient, "Proveedor cloud")
    assert.equal(parsed[0].transferConsentRequired, false)
    assert.deepEqual(parsed[0].transferLegalInstrument, ["Contrato"])
    assert.equal(parsed[0].additionalTransfers.length, 1)
    assert.equal(parsed[0].additionalTransfers[0].recipient, "Autoridad laboral")
    assert.equal(parsed[0].dataRemission, "si")
    assert.equal(parsed[0].remissionRecipient, "Despacho externo")
    assert.deepEqual(parsed[0].remissionPurposes, ["Soporte", "Auditoria"])
    assert.equal(parsed[0].additionalRemissions.length, 1)
    assert.equal(parsed[1].consentRequired, false)
    assert.equal(parsed[1].dataTransfer, "no")
    assert.equal(parsed[1].personalData[0].riesgo, "medio")
    assert.equal(parsed[1].personalData[0].proporcionalidad, true)
  })

  it("mantiene compatibilidad con el formato Davara horizontal y aliases de encabezados", async () => {
    const xlsx = await loadXlsx()
    const { parseRatWorkbook } = await importModule("app/rat/utils/parseRatExcel.ts")

    const workbook = workbookFromSheets(xlsx, {
      Inventario: [
        ["Inventario de Datos Personales"],
        ["Area", "", "Legal"],
        ["Titulares", "", "Clientes"],
        [],
        ["Nombre del Area: Legal", "", "", "", "Tratamiento"],
        ["Bases de datos identificadas", "", "", "", "Obtencion de datos"],
        [
          "Base de datos",
          "Categorias de datos personales",
          "Clasificacion del riesgo inherente del dato (Bajo/Medio/Alto/Reforzado)",
          "Proporcionalidad",
          "Medio de obtencion",
          "Finalidades del tratamiento",
          "¿Se requiere el consentimiento del titular para el tratamiento?   SI/NO",
          "Area dentro de la empresa encargada de dar tratamiento a los datos personales",
          "Sistema, aplicacion o metodo con el que se procesa la informacion",
          "Descripcion del procesamiento",
          "Descripcion del acceso del area encargada (total o limitado/ visualizacion, edicion o descarga)",
          "Medio de almacenamiento",
          "¿Se respalda la informacion?",
          "Descripcion de la supresion",
          "Tercero a quien se realiza una transferencia",
          "Finalidades de la transferencia",
          "¿Se requiere el consentimiento del titular para la transferencia?   SI/NO",
          "Tipo de consentimiento para realizar la transferencia",
          "Instrumento juridico donde se encuentre la clausula de transferencia",
          "¿Existe remision?",
          "¿A quien aplica la remision?",
          "Finalidades de la remision",
          "Instrumento juridico donde se encuentre la clausula de remision",
        ],
        [
          "Expedientes legales",
          "Identificacion; Contacto",
          "Medio",
          "þ",
          "Directo",
          "Gestion contractual; Defensa juridica",
          "No",
          "Legal",
          "SharePoint",
          "Consulta; Actualizacion",
          "Visualizacion; Descarga",
          "nube",
          "Si",
          "Trituracion",
          "Autoridad competente",
          "Atender requerimientos",
          "No",
          "",
          "Excepcion legal",
          "Si",
          "Despacho externo",
          "Servicios juridicos",
          "Contrato de encargado",
        ],
      ],
    })

    const parsed = parseRatWorkbook(workbook)

    assert.equal(parsed.length, 1)
    assert.equal(parsed[0].databaseName, "Expedientes legales")
    assert.equal(parsed[0].consentRequired, false)
    assert.equal(parsed[0].isBackedUp, true)
    assert.deepEqual(parsed[0].processingArea, ["Legal"])
    assert.deepEqual(parsed[0].processingDescription, ["Consulta", "Actualizacion"])
    assert.deepEqual(parsed[0].accessDescription, ["Visualizacion", "Descarga"])
    assert.equal(parsed[0].dataTransfer, "si")
    assert.equal(parsed[0].transferRecipient, "Autoridad competente")
    assert.deepEqual(parsed[0].transferLegalInstrument, ["Excepcion legal"])
    assert.equal(parsed[0].dataRemission, "si")
    assert.equal(parsed[0].remissionRecipient, "Despacho externo")
    assert.deepEqual(parsed[0].remissionPurposes, ["Servicios juridicos"])
    assert.equal(parsed[0].personalData.length, 2)
    assert.deepEqual(
      parsed[0].personalData.map((item) => item.name),
      ["Identificacion", "Contacto"],
    )
    assert.equal(parsed[0].personalData[0].category, "Identificacion")
    assert.equal(parsed[0].personalData[0].riesgo, "medio")
    assert.deepEqual(parsed[0].personalData[0].purposesPrimary, [
      "Gestion contractual",
      "Defensa juridica",
    ])
  })

  it("expone la plantilla publica de RAT con las hojas requeridas", async () => {
    const xlsx = await loadXlsx()
    const templatePath = path.join(appDir, "public/templates/rat-template.xlsx")

    assert.equal(fs.existsSync(templatePath), true)

    const workbook = xlsx.readFile(templatePath)
    assert.deepEqual(
      [
        "Instrucciones",
        "Inventarios",
        "Datos personales",
        "Transferencias",
        "Remisiones",
        "Accesos adicionales",
        "Conservaciones adicionales",
        "Bloqueos adicionales",
        "Listas",
      ].every((sheetName) => workbook.SheetNames.includes(sheetName)),
      true,
    )
  })

  it("convierte subinventarios parseados en un inventario normalizado para el formulario", async () => {
    const { createInventoryFromRatImport } = await importModule("app/rat/utils/rat-import.ts")

    const inventory = createInventoryFromRatImport(
      [
        {
          id: "sub-1",
          databaseName: "Nomina",
          personalData: [
            {
              id: "dato-1",
              name: "Nombre",
              category: "",
              proporcionalidad: true,
              riesgo: "BAJO",
              purposesPrimary: "Gestion laboral",
              purposesSecondary: "",
            },
          ],
        },
        {
          id: "sub-2",
          databaseName: "Candidatos",
          personalData: [],
        },
      ],
      {
        id: "inventory-import",
        now: "2026-06-25T00:00:00.000Z",
      },
    )

    assert.equal(inventory.id, "inventory-import")
    assert.equal(inventory.databaseName, "Nomina / Candidatos")
    assert.equal(inventory.subInventories.length, 2)
    assert.equal(inventory.subInventories[0].privacyNoticeFile, undefined)
    assert.equal(inventory.subInventories[0].personalData[0].category, "Sin categoría")
    assert.equal(inventory.subInventories[0].personalData[0].riesgo, "bajo")
    assert.deepEqual(inventory.subInventories[0].personalData[0].purposesPrimary, [
      "Gestion laboral",
    ])
  })
})
