const { before, describe, it } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

const appDir = path.join(__dirname, "..")

async function importModule(relativePath) {
  const imported = await import(pathToFileURL(path.join(appDir, relativePath)).href)
  return imported.default ? { ...imported.default, ...imported } : imported
}

describe("co-branding DavaraGovernance + Grünenthal", () => {
  let branding

  before(async () => {
    branding = await importModule("lib/client-branding.ts")
  })

  it("mantiene DavaraGovernance como producto y Grünenthal como cliente", () => {
    assert.equal(branding.CLIENT_BRANDING.productName, "DavaraGovernance")
    assert.equal(branding.CLIENT_BRANDING.productLogoBlackPath, "/images/logo-davara-governance-black.png")
    assert.equal(branding.CLIENT_BRANDING.productLogoWhitePath, "/images/logo-davara-governance-white.png")
    assert.equal(branding.CLIENT_BRANDING.loginLightLogoPath, "/images/logo-davara-governance-black.png")
    assert.equal(branding.CLIENT_BRANDING.loginDarkLogoPath, "/images/logo-davara-governance-white.png")
    assert.equal(branding.CLIENT_BRANDING.clientName, "Grünenthal")
    assert.equal(branding.CLIENT_BRANDING.clientLogoPath, "/client/grunenthal/brand/grunenthal-logo-green.png")
    assert.equal(branding.CLIENT_BRANDING.clientLogoWhiteFilter, "brightness(0) invert(1)")
    assert.equal(branding.CLIENT_BRANDING.clientLogoBlackFilter, "brightness(0)")
    assert.deepEqual(branding.CLIENT_BRANDING.clientLogoWidths, {
      header: 80,
      sidebar: 95,
      login: 100,
    })
  })

  it("versiona los logos nuevos de DavaraGovernance", () => {
    for (const logoPath of [
      branding.CLIENT_BRANDING.productLogoBlackPath,
      branding.CLIENT_BRANDING.productLogoWhitePath,
    ]) {
      assert.equal(fs.existsSync(path.join(appDir, "public", logoPath)), true)
    }
  })

  it("no usa el texto explícito Cliente en los lockups de marca", () => {
    const lockupFiles = [
      "components/sidebar.tsx",
      "components/header.tsx",
      "app/login/page.tsx",
    ]
    const lockupSource = lockupFiles
      .map((file) => fs.readFileSync(path.join(appDir, file), "utf8"))
      .join("\n")

    assert.equal(/>\s*Cliente\s*</.test(lockupSource), false)
  })

  it("mantiene aire suficiente entre el logo de Grünenthal y el título del login", () => {
    const loginSource = fs.readFileSync(path.join(appDir, "app/login/page.tsx"), "utf8")

    assert.match(loginSource, /mb-12/)
  })

  it("evita duplicar Grünenthal entre sidebar desplegada y header colapsado", () => {
    const sidebarSource = fs.readFileSync(path.join(appDir, "components/sidebar.tsx"), "utf8")
    const headerSource = fs.readFileSync(path.join(appDir, "components/header.tsx"), "utf8")

    assert.match(sidebarSource, /!collapsed && \(/)
    assert.match(sidebarSource, /filter: CLIENT_BRANDING\.clientLogoWhiteFilter/)
    assert.match(headerSource, /collapsed && \(/)
    assert.match(headerSource, /filter: CLIENT_BRANDING\.clientLogoBlackFilter/)
  })
})
