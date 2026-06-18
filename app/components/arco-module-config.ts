import {
  BarChart3,
  ClipboardCheck,
  FilePlus2,
  FileSearch,
  FileText,
  LayoutDashboard,
  LibraryBig,
  ShieldCheck,
} from "lucide-react"

import type { ArcoModuleNavItem } from "@/components/arco-module-shell"

export const PRIVACY_NOTICES_META = {
  moduleLabel: "Módulo Avisos de Privacidad",
  moduleTitle: "Avisos de privacidad",
  moduleDescription: "Versiones, evidencia, reportes y trazabilidad del aviso vigente.",
}

export const THIRD_PARTY_CONTRACTS_META = {
  moduleLabel: "Módulo Contratos con Terceros",
  moduleTitle: "Contratos con terceros",
  moduleDescription: "Registro contractual, cláusulas, documentos y seguimiento de vigencias.",
}

export const DPO_META = {
  moduleLabel: "Módulo Miembros del Departamento de Datos Personales",
  moduleTitle: "Miembros del Departamento de Datos Personales",
  moduleDescription:
    "Designación, evaluación funcional, proyectos, evidencias, actas e informes del Departamento de Datos Personales.",
}

export const EIPD_META = {
  moduleLabel: "Módulo Evaluación de Impacto",
  moduleTitle: "Evaluación de Impacto",
  moduleDescription: "Diagnóstico, registro, consulta y seguimiento documental de EIPD.",
}

export const DATA_POLICIES_META = {
  moduleLabel: "Módulo Políticas de Protección de Datos",
  moduleTitle: "Políticas de Protección de Datos",
  moduleDescription: "Builder PGDP, expediente, workflow y sincronización con ARCO.",
}

export const AUDIT_META = {
  moduleLabel: "Módulo Auditoría en Protección de Datos",
  moduleTitle: "Auditoría en protección de datos",
  moduleDescription: "Checklist, evidencia PDF y seguimiento operativo del programa de auditoría.",
}

export const PRIVACY_NOTICES_NAV: ArcoModuleNavItem[] = [
  { href: "/privacy-notices", label: "Panorama", shortLabel: "Inicio", mobileLabel: "Panorama del módulo", icon: LayoutDashboard },
  { href: "/privacy-notices/registro", label: "Registrar aviso", shortLabel: "Registrar", mobileLabel: "Registrar aviso", icon: FilePlus2, activePaths: ["/privacy-notices/registro"] },
  { href: "/privacy-notices/registrados", label: "Avisos registrados", shortLabel: "Registros", mobileLabel: "Avisos registrados", icon: FileSearch, activePaths: ["/privacy-notices/registrados"] },
  { href: "/privacy-notices/reportes", label: "Reportes", shortLabel: "Reportes", mobileLabel: "Reportes del módulo", icon: BarChart3, activePaths: ["/privacy-notices/reportes"] },
]

export const THIRD_PARTY_CONTRACTS_NAV: ArcoModuleNavItem[] = [
  { href: "/third-party-contracts", label: "Panorama", shortLabel: "Inicio", mobileLabel: "Panorama contractual", icon: LayoutDashboard },
  { href: "/third-party-contracts/registration", label: "Registro", shortLabel: "Registro", mobileLabel: "Registro contractual", icon: FilePlus2, activePaths: ["/third-party-contracts/registration"] },
  { href: "/third-party-contracts/documents", label: "Documentos y cláusulas", shortLabel: "Docs y cláus.", mobileLabel: "Documentos y cláusulas", icon: LibraryBig, activePaths: ["/third-party-contracts/documents"] },
  { href: "/third-party-contracts/reportes", label: "Reportes", shortLabel: "Reportes", mobileLabel: "Reportes del módulo", icon: BarChart3, activePaths: ["/third-party-contracts/reportes"] },
]

export const DPO_NAV: ArcoModuleNavItem[] = [
  { href: "/dpo", label: "Panorama", shortLabel: "Inicio", mobileLabel: "Panorama del departamento", icon: LayoutDashboard },
  { href: "/dpo/registro", label: "Registro", shortLabel: "Registro", mobileLabel: "Registro del departamento", icon: FilePlus2, activePaths: ["/dpo/registro"] },
  { href: "/dpo/compliance", label: "Cumplimiento", shortLabel: "Cumpl.", mobileLabel: "Cumplimiento del departamento", icon: ClipboardCheck, activePaths: ["/dpo/compliance"] },
  { href: "/dpo/reports", label: "Informes", shortLabel: "Informes", mobileLabel: "Informes y actas", icon: FileText, activePaths: ["/dpo/reports"] },
]

export const EIPD_NAV: ArcoModuleNavItem[] = [
  { href: "/eipd", label: "Panorama", shortLabel: "Inicio", mobileLabel: "Panorama EIPD", icon: LayoutDashboard },
  { href: "/eipd/registro?mode=new", label: "Nueva EIPD", shortLabel: "Nueva", mobileLabel: "Nueva evaluación EIPD", icon: FilePlus2, activePaths: ["/eipd/registro"] },
  { href: "/eipd/consultar", label: "Consultar", shortLabel: "Consulta", mobileLabel: "Consultar EIPD", icon: FileSearch, activePaths: ["/eipd/consultar"] },
  { href: "/eipd/reportes", label: "Reportes", shortLabel: "Reportes", mobileLabel: "Reportes EIPD", icon: BarChart3, activePaths: ["/eipd/reportes"] },
]

export const DATA_POLICIES_NAV: ArcoModuleNavItem[] = [
  { href: "/data-policies", label: "Panorama", shortLabel: "Inicio", mobileLabel: "Panorama PGDP", icon: LayoutDashboard },
  { href: "/data-policies/registro", label: "Registro", shortLabel: "Registro", mobileLabel: "Registro de política", icon: FilePlus2, activePaths: ["/data-policies/registro"] },
  { href: "/data-policies/consulta", label: "Consulta", shortLabel: "Consulta", mobileLabel: "Consulta de políticas", icon: ShieldCheck, activePaths: ["/data-policies/consulta"] },
]
