const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const appDir = path.join(__dirname, "..")

describe("layout de avisos de privacidad", () => {
  it("mantiene las graficas del panorama dentro de su contenedor responsivo", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/privacy-notices/page.tsx"),
      "utf8",
    )

    assert.match(source, /ResponsiveContainer/)
    assert.match(source, /xl:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(0,0\.9fr\)\]/)
    assert.match(source, /className="h-\[320px\] min-w-0/)
    assert.doesNotMatch(source, /<(?:BarChart|PieChart)[^>]*\swidth=\{\d+\}/)
  })

  it("mantiene responsivo el filtro por titulares sin desbordar", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/privacy-notices/notices-content.tsx"),
      "utf8",
    )

    assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(220px,360px\)\]/)
    assert.match(source, /<select[\s\S]*className="[^"]*w-full[^"]*min-w-0[^"]*max-w-full/)
  })

  it("conserva paginación en registros y agrega soporte PDF de registro", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/privacy-notices/notices-content.tsx"),
      "utf8",
    )

    assert.match(source, /itemsPerPage/)
    assert.match(source, /paginatedNotices/)
    assert.match(source, /generatePrivacyNoticeRecordPDF/)
    assert.match(source, /Descargar soporte/)
  })

  it("homologa consultores y profesionales de la salud sin mencionar auditores externos", () => {
    const source = fs.readFileSync(
      path.join(appDir, "app/privacy-notices/notices-content.tsx"),
      "utf8",
    )

    assert.match(source, /Consultores externos y profesionales de la salud/)
    assert.doesNotMatch(source, /Consultores externos \/ Auditores/)
  })
})
