const { before, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")
const departmentLabel = "Miembros del Departamento de Datos Personales"

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

function read(relativePath) {
  return fs.readFileSync(path.join(appDir, relativePath), "utf8")
}

describe("módulo Departamento de Datos Personales", () => {
  let model

  before(async () => {
    model = await importModule("app/dpo/opd-compliance-model.ts")
  })

  it("homologa la terminología visible del módulo", () => {
    const visibleSources = [
      "app/page.tsx",
      "components/arco-module-config.ts",
      "components/sidebar.tsx",
      "components/user-progress-dashboard.tsx",
      "app/dpo/page.tsx",
      "app/dpo/registro/page.tsx",
      "app/dpo/compliance/page.tsx",
      "app/dpo/reports/page.tsx",
      "app/dpo/opd-compliance-model.ts",
    ]
      .map(read)
      .join("\n")

    assert.match(visibleSources, new RegExp(departmentLabel))
    assert.doesNotMatch(visibleSources, /Oficial de Protecci[oó]n de Datos/i)
    assert.doesNotMatch(visibleSources, /Data protection officer/i)
    assert.equal(visibleSources.includes("OPD"), false)
    assert.equal(visibleSources.includes("DPD"), false)
  })

  it("usa la nueva etiqueta en opciones y códigos visibles", () => {
    assert.equal(model.DPO_ROLE_OPTIONS[0].label, departmentLabel)
    const record = model.createProjectReviewRecord(model.createProjectReviewDraft({ projectName: "Proyecto demo" }))
    assert.match(record.projectCode, /^PRY-DDP-/)
  })

  it("persiste localmente los datos de registro y muestra aviso de demo", () => {
    const registrationSource = read("app/dpo/registro/page.tsx")
    const complianceSource = read("app/dpo/compliance/page.tsx")

    assert.match(registrationSource, /DPO_REGISTRATION_DRAFT_KEY/)
    assert.doesNotMatch(registrationSource, /export\s+const\s+DPO_REGISTRATION_DRAFT_KEY/)
    assert.match(registrationSource, /localStorage\.setItem\(DPO_REGISTRATION_DRAFT_KEY/)
    assert.match(registrationSource, /persistDpoSnapshot/)
    assert.match(registrationSource, /Registros guardados/)
    assert.match(registrationSource, /Demo con persistencia local/)

    assert.match(complianceSource, /DPO_ACCREDITATION_DRAFT_KEY/)
    assert.match(complianceSource, /readStoredAccreditationDraft/)
    assert.match(complianceSource, /setStorageReady\(true\)/)
    assert.match(complianceSource, /localStorage\.setItem\(DPO_ACCREDITATION_DRAFT_KEY/)
  })
})
