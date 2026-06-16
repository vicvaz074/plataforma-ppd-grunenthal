"use client"

import Image from "next/image"
import Link from "next/link"
import type { JSX } from "react";
import * as React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/LanguageContext"
import { useSidebar } from "@/lib/SidebarContext"
import {
  Database,
  FileText,
  FileSignature,
  UserCog,
  Users,
  Shield,
  Newspaper,
  ClipboardList,
  FileCheck,
  GraduationCap,
  Scale,
  AlertTriangle,
  Bell,
  ListCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react"
import { hasModuleAccess } from "@/lib/user-permissions"
import { CLIENT_BRANDING } from "@/lib/client-branding"

type RouteKey =
  | "/rat"
  | "/privacy-notices"
  | "/third-party-contracts"
  | "/dpo"
  | "/arco-rights"
  | "/security-system"
  | "/awareness"
  | "/eipd"
  | "/data-policies"
  | "/davara-training"
  | "/litigation-management"
  | "/audit"
  | "/incidents-breaches"
  | "/audit-alarms";

type TranslationKey =
  | "dataInventory"
  | "privacyNotices"
  | "thirdPartyContracts"
  | "dataProtectionOfficer"
  | "arcoRights"
  | "personalDataSecuritySystem"
  | "awareness"
  | "impactAssessment"
  | "dataManagementProgram"
  | "davaraTraining"
  | "proceduresManagement"
  | "securityIncidentManagement"
  | "auditProgram"
  | "auditAlarms";

const translations: Record<"en" | "es", Record<TranslationKey, string>> = {
  en: {
    dataInventory: "Personal data inventories",
    privacyNotices: "Privacy notices",
    thirdPartyContracts: "Third party contracts",
    dataProtectionOfficer: "Data protection officer",
    arcoRights: "ARCO rights",
    personalDataSecuritySystem: "Personal Data Security Management System",
    awareness: "Demonstrated/Proactive Responsibility",
    impactAssessment: "Personal Data Impact Assessment",
    dataManagementProgram: "Data Protection Policies",
    davaraTraining: "Training",
    proceduresManagement: "PDP Procedures",
    auditProgram: "Data Protection Audit",
    securityIncidentManagement: "Security Incident Management",
    auditAlarms: "Reminders",
  },
  es: {
    dataInventory: "Inventarios de datos personales",
    privacyNotices: "Avisos de privacidad",
    thirdPartyContracts: "Contratos con terceros",
    dataProtectionOfficer: "Oficial de Protección de Datos",
    arcoRights: "Derechos ARCO",
    personalDataSecuritySystem: "Sistema de gestión de seguridad de datos personales",
    awareness: "Responsabilidad demostrada",
    impactAssessment: "Evaluación de Impacto Datos Personales",
    dataManagementProgram: "Políticas de Protección de Datos",
    davaraTraining: "Capacitación",
    proceduresManagement: "Procedimientos PDP",
    auditProgram: "Auditoría en protección de datos",
    securityIncidentManagement: "Gestión de incidentes de seguridad",
    auditAlarms: "Recordatorios",
  },
};

export function Sidebar() {
  const { language } = useLanguage()
  const { collapsed, toggleSidebar } = useSidebar()
  const t = translations[language]
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const isAliciaActive = pathname.startsWith("/alicia")

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail"))
    setUserRole(localStorage.getItem("userRole"))
  }, [])

  const links: {
    href: RouteKey
    icon: JSX.Element
    label: string
    route: RouteKey
  }[] = [
      { href: "/rat", icon: <Database className="w-5 h-5 flex-shrink-0" />, label: t.dataInventory, route: "/rat" },
      { href: "/privacy-notices", icon: <FileText className="w-5 h-5 flex-shrink-0" />, label: t.privacyNotices, route: "/privacy-notices" },
      { href: "/third-party-contracts", icon: <FileSignature className="w-5 h-5 flex-shrink-0" />, label: t.thirdPartyContracts, route: "/third-party-contracts" },
      { href: "/dpo", icon: <UserCog className="w-5 h-5 flex-shrink-0" />, label: t.dataProtectionOfficer, route: "/dpo" },
      { href: "/arco-rights", icon: <Users className="w-5 h-5 flex-shrink-0" />, label: t.arcoRights, route: "/arco-rights" },
      { href: "/security-system", icon: <Shield className="w-5 h-5 flex-shrink-0" />, label: t.personalDataSecuritySystem, route: "/security-system" },
      { href: "/incidents-breaches", icon: <AlertTriangle className="w-5 h-5 flex-shrink-0" />, label: t.securityIncidentManagement, route: "/incidents-breaches" },
      { href: "/eipd", icon: <ClipboardList className="w-5 h-5 flex-shrink-0" />, label: t.impactAssessment, route: "/eipd" },
      { href: "/awareness", icon: <Newspaper className="w-5 h-5 flex-shrink-0" />, label: t.awareness, route: "/awareness" },
      { href: "/data-policies", icon: <FileCheck className="w-5 h-5 flex-shrink-0" />, label: t.dataManagementProgram, route: "/data-policies" },
      { href: "/davara-training", icon: <GraduationCap className="w-5 h-5 flex-shrink-0" />, label: t.davaraTraining, route: "/davara-training" },
      { href: "/litigation-management", icon: <Scale className="w-5 h-5 flex-shrink-0" />, label: t.proceduresManagement, route: "/litigation-management" },
      { href: "/audit", icon: <ListCheck className="w-5 h-5 flex-shrink-0" />, label: t.auditProgram, route: "/audit" },
      { href: "/audit-alarms", icon: <Bell className="w-5 h-5 flex-shrink-0" />, label: t.auditAlarms, route: "/audit-alarms" },
    ]

  const isActive = (route: string) => {
    if (!pathname) return false;
    return pathname === route || pathname.startsWith(route + "/");
  }

  const canAccess = (route: string): boolean => {
    if (userRole === "admin") return true
    return hasModuleAccess(userEmail, route)
  }

  return (
    <div
      className={`sidebar-root fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out z-40 ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}
      style={{ width: collapsed ? 70 : 260 }}
    >
      {/* Header del sidebar: logo + toggle */}
      <div className="sidebar-header flex items-center px-3 pt-3 pb-1" style={{ minHeight: 56 }}>
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: collapsed ? 0 : 180, opacity: collapsed ? 0 : 1 }}
        >
          <Link href="/" className="flex items-center">
            <img
              src={CLIENT_BRANDING.productLogoWhitePath}
              alt={CLIENT_BRANDING.productName}
              width={180}
              style={{
                objectFit: "contain",
                width: "180px",
                height: "auto",
              }}
            />
          </Link>
        </div>
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn ml-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/20 transition-colors duration-200"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5 text-white" /> : <ChevronLeft className="w-5 h-5 text-white" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="flex items-center justify-center border-t border-white/10 pt-2">
            <img
              src={CLIENT_BRANDING.clientLogoPath}
              alt={CLIENT_BRANDING.clientName}
              width={CLIENT_BRANDING.clientLogoWidths.sidebar}
              style={{
                objectFit: "contain",
                width: `${CLIENT_BRANDING.clientLogoWidths.sidebar}px`,
                height: "auto",
                filter: CLIENT_BRANDING.clientLogoWhiteFilter,
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation links */}
      <nav className="sidebar-nav flex-1 flex flex-col justify-evenly overflow-hidden px-2 py-1">
        {links.map((link) => {
          const active = isActive(link.route)
          const accessible = canAccess(link.route)

          if (!accessible) {
            return (
              <div key={link.href} className="relative">
                <div
                  className={`sidebar-link flex items-center gap-3 py-1.5 rounded-lg transition-all duration-200 cursor-not-allowed opacity-35 ${collapsed ? "px-0 justify-center" : "px-3"}`}
                  title={collapsed ? `🔒 ${link.label}` : undefined}
                >
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center relative">
                    {link.icon}
                    <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-white/80" />
                  </span>
                  <span
                    className={`sidebar-label text-xs overflow-hidden transition-all duration-300 ease-in-out text-white/50 leading-tight ${collapsed ? "whitespace-nowrap" : ""}`}
                    style={{ width: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }}
                  >
                    {link.label}
                  </span>
                </div>
              </div>
            )
          }

          return (
            <div key={link.href} className="relative">
              <Link
                href={link.href}
                className={`sidebar-link flex items-center gap-3 py-1.5 rounded-lg transition-all duration-200 relative ${collapsed ? "px-0 justify-center" : "px-3"} ${active ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                title={collapsed ? link.label : undefined}
              >
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {link.icon}
                </span>
                <span
                  className={`sidebar-label text-xs overflow-hidden transition-all duration-300 ease-in-out leading-tight ${collapsed ? "whitespace-nowrap" : ""}`}
                  style={{ width: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }}
                >
                  {link.label}
                </span>
              </Link>
              {active && (
                <div
                  className="sidebar-active-triangle"
                  style={{
                    position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
                    width: 0, height: 0,
                    borderTop: "10px solid transparent", borderBottom: "10px solid transparent",
                    borderRight: "10px solid hsl(var(--background))", zIndex: 10,
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Alicia link */}
        <div className="relative">
          <Link
            href="/alicia"
            className={`sidebar-link flex min-h-9 items-center rounded-lg transition-all duration-200 relative ${collapsed ? "px-1.5 justify-center" : "px-3 justify-center"} ${isAliciaActive ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            title={collapsed ? "Alicia" : undefined}
          >
            <span className={`relative block transition-all duration-300 ${collapsed ? "h-8 w-9" : "h-9 w-full max-w-[144px]"}`}>
              <Image
                src="/images/Alicia_Sin_Despachos.png"
                alt="Alicia"
                fill
                sizes={collapsed ? "36px" : "144px"}
                className="object-contain drop-shadow-[0_2px_14px_rgba(255,255,255,0.18)]"
                priority
                unoptimized
              />
            </span>
            <span className="sr-only">Alicia</span>
          </Link>
          {isAliciaActive && (
            <div
              className="sidebar-active-triangle"
              style={{
                position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
                width: 0, height: 0,
                borderTop: "10px solid transparent", borderBottom: "10px solid transparent",
                borderRight: "10px solid hsl(var(--background))", zIndex: 10,
              }}
            />
          )}
        </div>
      </nav>
    </div>
  )
}
