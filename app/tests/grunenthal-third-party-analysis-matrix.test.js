const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const importTsModule = async (relativePath) => {
  const modulePath = path.join(__dirname, "..", relativePath)
  const imported = await import(pathToFileURL(modulePath).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("matriz de análisis de relaciones Grünenthal", () => {
  it("expone la tabla resumen con filas clave y metadatos de fuente", async () => {
    const {
      GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX,
      GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE,
    } = await importTsModule("lib/grunenthal-third-party-analysis-matrix.ts")

    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.sourceDocument, "Análisis de Relaciones Grünenthal")
    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE.lastUpdated, "21 de octubre de 2025")
    assert.equal(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.length, 34)

    const ids = new Set(GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.map((row) => row.id))
    assert.equal(ids.size, GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.length)

    const toka = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find((row) => row.thirdParty.includes("TOKA"))
    assert.ok(toka)
    assert.equal(toka.area, "HUMAN RESOURCES")
    assert.equal(toka.communicationType, "transferencia")

    const dhl = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.find((row) => row.thirdParty.includes("DHL"))
    assert.ok(dhl)
    assert.equal(dhl.area, "HUMAN RESOURCES")
    assert.equal(dhl.communicationType, "transferencia")

    const laborRows = GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX.filter((row) => row.communicationType === "no-aplica")
    assert.equal(laborRows.length, 2)
  })
})
