const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const importTsModule = async (relativePath) => {
  const modulePath = path.join(__dirname, "..", relativePath)
  const imported = await import(pathToFileURL(modulePath).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("cláusulas modelo de relaciones con terceros Grünenthal", () => {
  it("expone solo las cláusulas validadas del Apéndice 1 del manual", async () => {
    const {
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES,
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE,
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE,
    } = await importTsModule("lib/grunenthal-third-party-model-clauses.ts")

    assert.equal(GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES.length, 4)
    assert.match(GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_SOURCE, /Manual de Relaciones con Terceros/)
    assert.deepEqual(
      GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES.map((clause) => clause.id),
      [
        "grunenthal-clause-c1-encargados",
        "grunenthal-clause-c2-transferencias",
        "grunenthal-clause-c3-no-aplicacion",
        "grunenthal-clause-c4-laboral",
      ],
    )

    const packageText = GRUNENTHAL_THIRD_PARTY_MODEL_CLAUSES_PACKAGE
    assert.match(packageText, /plazo máximo de 24 horas/)
    assert.match(packageText, /Base de Datos Transferida/)
    assert.match(packageText, /NO TRATAMIENTO DE DATOS PERSONALES/)
    assert.match(packageText, /Carta de Protección de Datos Personales/)
    assert.doesNotMatch(packageText, /C\\.5/)
    assert.doesNotMatch(packageText, /Representantes legales/)
  })
})
