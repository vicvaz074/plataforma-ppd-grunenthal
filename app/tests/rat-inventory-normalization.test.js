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
})
