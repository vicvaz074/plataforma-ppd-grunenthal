const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("normalización de inventarios RAT para edición", () => {
  it("crea inventarios nuevos con la identidad de reporte de Grünenthal", async () => {
    const { createDefaultInventory } = await importModule("app/rat/utils/inventory-normalization.ts")

    const defaults = createDefaultInventory()

    assert.equal(defaults.responsible, "Grünenthal")
    assert.equal(defaults.reportAccentColor, "#40BB6A")
    assert.equal(defaults.companyLogoFileName, "Grünenthal_logo_green.png")
    assert.equal(defaults.companyLogoPublicPath, "/client/grunenthal/brand/grunenthal-logo-green.png")
    assert.match(defaults.companyLogoDataUrl, /^data:image\/png;base64,/)
  })

  it("precarga inventarios sembrados con estructuras compatibles con el formulario", async () => {
    const { normalizeInventoryForForm } = await importModule("app/rat/utils/inventory-normalization.ts")

    const normalized = normalizeInventoryForForm({
      id: "inventory-1",
      databaseName: "Área de prueba",
      responsible: "Grünenthal",
      reportAccentColor: "#40BB6A",
      companyLogoDataUrl: "data:image/png;base64,AAAA",
      companyLogoFileName: "grunenthal-logo-green.png",
      subInventories: [
        {
          id: "sub-1",
          databaseName: "Subinventario",
          holderTypes: "Empleados",
          processingArea: "COMEX",
          consentRequired: "No",
          transferConsentRequired: "Sí",
          transferInAP: "No",
          dataTransfer: "Sí",
          transferRecipient: "Autoridades competentes",
          additionalTransfers: [
            {
              recipient: "Tercero adicional",
              purposes: "Servicios",
              consentRequired: "No",
              legalInstrument: "Otro",
              inAP: "Sí",
            },
          ],
          dataRemission: "si",
          remissionPurposes: "Provisión de servicios",
          additionalRemissions: [
            {
              recipient: "Encargado",
              purposes: "Soporte",
              legalInstrument: "Otro",
            },
          ],
          personalData: [
            {
              id: "dato-1",
              name: "Nombre",
              category: "",
              riesgo: "BAJO",
              proporcionalidad: "Sí",
              purposesPrimary: "Identificación",
              purposesSecondary: "Comunicaciones",
            },
          ],
        },
      ],
    })

    const sub = normalized.subInventories[0]

    assert.equal(normalized.reportAccentColor, "#40BB6A")
    assert.equal(normalized.companyLogoFileName, "grunenthal-logo-green.png")
    assert.deepEqual(sub.holderTypes, ["Empleados"])
    assert.deepEqual(sub.processingArea, ["COMEX"])
    assert.equal(sub.consentRequired, false)
    assert.equal(sub.transferConsentRequired, true)
    assert.equal(sub.transferInAP, false)
    assert.equal(sub.dataTransfer, "si")
    assert.deepEqual(sub.transferLegalInstrument, [])
    assert.equal(sub.additionalTransfers[0].consentRequired, false)
    assert.deepEqual(sub.additionalTransfers[0].legalInstrument, ["Otro"])
    assert.equal(sub.additionalTransfers[0].inAP, true)
    assert.equal(sub.dataRemission, "si")
    assert.deepEqual(sub.remissionPurposes, ["Provisión de servicios"])
    assert.deepEqual(sub.additionalRemissions[0].purposes, ["Soporte"])
    assert.deepEqual(sub.additionalRemissions[0].legalInstrument, ["Otro"])
    assert.equal(sub.personalData[0].category, "Sin categoría")
    assert.equal(sub.personalData[0].riesgo, "bajo")
    assert.equal(sub.personalData[0].proporcionalidad, true)
    assert.deepEqual(sub.personalData[0].purposesPrimary, ["Identificación"])
    assert.deepEqual(sub.personalData[0].purposesSecondary, ["Comunicaciones"])
  })

  it("mantiene cada finalidad capturada como un solo elemento aunque incluya comas", async () => {
    const { normalizeInventoryForForm } = await importModule("app/rat/utils/inventory-normalization.ts")

    const primaryPurposes = [
      "Identificación y registro: Identificarlo y registrarlo como colaborador de Grünenthal, darlo de alta en los sistemas internos, asignarle un correo institucional y generar su credencial de empleado.",
      "Expediente laboral: Crear, actualizar y conservar su expediente laboral, así como administrar la información relacionada con su trayectoria en la empresa.",
      "Gestión de nómina y prestaciones: Administrar el pago de nómina, prestaciones laborales, caja de ahorro, seguros, pensiones, vales, viáticos, viajes de negocio y demás beneficios que correspondan.",
    ]
    const secondaryPurposes = [
      "Eventos corporativos: En su caso, invitarlo y gestionar su viaje, hospedaje y participación en eventos organizados por Grünenthal.",
    ]

    const normalized = normalizeInventoryForForm({
      id: "inventory-1",
      databaseName: "Área de prueba",
      subInventories: [
        {
          id: "sub-1",
          databaseName: "Subinventario",
          personalData: [
            {
              id: "dato-1",
              name: "Nombre",
              purposesPrimary: primaryPurposes,
              purposesSecondary: secondaryPurposes,
            },
          ],
        },
      ],
    })

    const personalData = normalized.subInventories[0].personalData[0]

    assert.deepEqual(personalData.purposesPrimary, primaryPurposes)
    assert.deepEqual(personalData.purposesSecondary, secondaryPurposes)
  })

  it("recompone continuaciones de finalidades etiquetadas que ya venían fragmentadas", async () => {
    const { normalizeInventoryForForm } = await importModule("app/rat/utils/inventory-normalization.ts")

    const normalized = normalizeInventoryForForm({
      id: "inventory-1",
      databaseName: "Área de prueba",
      subInventories: [
        {
          id: "sub-1",
          databaseName: "Subinventario",
          personalData: [
            {
              id: "dato-1",
              name: "Nombre",
              purposesPrimary: [
                "Finalidad alfa: Procesar datos del trámite",
                "revisar documentación",
                "archivar comprobantes.",
                "Finalidad beta: Notificar avances al titular.",
                "recordatorio independiente",
              ],
            },
          ],
        },
      ],
    })

    assert.deepEqual(normalized.subInventories[0].personalData[0].purposesPrimary, [
      "Finalidad alfa: Procesar datos del trámite revisar documentación archivar comprobantes.",
      "Finalidad beta: Notificar avances al titular.",
      "recordatorio independiente",
    ])
  })

  it("conserva inventarios sembrados con logo público sin regenerar base64 al editar", async () => {
    const { normalizeInventoryForForm } = await importModule("app/rat/utils/inventory-normalization.ts")

    const normalized = normalizeInventoryForForm({
      id: "inventory-public-logo",
      databaseName: "Área con logo público",
      companyLogoPublicPath: "/client/grunenthal/brand/grunenthal-logo-green.png",
      subInventories: [],
    })

    assert.equal(normalized.companyLogoDataUrl, undefined)
    assert.equal(normalized.companyLogoPublicPath, "/client/grunenthal/brand/grunenthal-logo-green.png")
  })

  it("crea un inventario nuevo cuando el borrador trae un id que no existe", async () => {
    const { createDefaultInventory, prepareInventorySave } = await importModule("app/rat/utils/inventory-normalization.ts")

    const existing = createDefaultInventory()
    existing.id = "inventory-existente"
    existing.databaseName = "Área existente"

    const draft = createDefaultInventory()
    draft.id = "inventory-borrador"
    draft.databaseName = "Dirección General"

    const result = prepareInventorySave({
      inventories: [existing],
      formData: draft,
      editingInventoryId: "inventory-borrador",
      actorName: "Legal",
      now: "2026-06-25T00:00:00.000Z",
      idFactory: () => "inventory-nuevo",
    })

    assert.equal(result.operation, "created")
    assert.equal(result.inventories.length, 2)
    assert.equal(result.inventories[1].id, "inventory-nuevo")
    assert.equal(result.inventories[1].databaseName, "Dirección General")
    assert.equal(result.inventories[1].status, "completado")
    assert.equal(result.inventories[1].createdBy, "Legal")
    assert.equal(result.inventories[1].updatedBy, "Legal")
  })

  it("actualiza el inventario cuando el id de edición sí existe", async () => {
    const { createDefaultInventory, prepareInventorySave } = await importModule("app/rat/utils/inventory-normalization.ts")

    const existing = createDefaultInventory()
    existing.id = "inventory-existente"
    existing.databaseName = "Área existente"
    existing.createdBy = "Usuario original"

    const formData = {
      ...existing,
      databaseName: "Área actualizada",
    }

    const result = prepareInventorySave({
      inventories: [existing],
      formData,
      editingInventoryId: "inventory-existente",
      actorName: "Legal",
      now: "2026-06-25T00:00:00.000Z",
      idFactory: () => "inventory-no-debe-usarse",
    })

    assert.equal(result.operation, "updated")
    assert.equal(result.inventories.length, 1)
    assert.equal(result.inventories[0].id, "inventory-existente")
    assert.equal(result.inventories[0].databaseName, "Área actualizada")
    assert.equal(result.inventories[0].createdBy, "Usuario original")
    assert.equal(result.inventories[0].updatedBy, "Legal")
  })
})
