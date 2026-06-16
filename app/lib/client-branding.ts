import { GRUNENTHAL_LOGO } from "@/lib/grunenthal-assets"

export const CLIENT_BRANDING = {
  productName: "DavaraGovernance",
  productLogoBlackPath: "/images/logo-davara-governance-black.png",
  productLogoWhitePath: "/images/logo-davara-governance-white.png",
  loginLightLogoPath: "/images/logo-davara-governance-black.png",
  loginDarkLogoPath: "/images/logo-davara-governance-white.png",
  clientName: "Grünenthal",
  clientLogoPath: GRUNENTHAL_LOGO.path,
  clientLogoWhiteFilter: GRUNENTHAL_LOGO.whiteFilter,
  clientLogoBlackFilter: GRUNENTHAL_LOGO.blackFilter,
  clientLogoWidths: {
    header: 80,
    sidebar: 95,
    login: 100,
  },
} as const
