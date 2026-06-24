"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/lib/LanguageContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SafeLink } from "@/components/SafeLink"
import { aliciaTranslations } from "@/lib/alicia-translations"
import aliciaImg from "@/app/public/images/alicia_person.jpeg"
import { hasModuleAccess } from "@/lib/user-permissions"
import {
  Database,
  FileText,
  FileSignature,
  UserCog,
  Users,
  Newspaper,
  ClipboardList,
  FileCheck,
  Scale,
  AlertTriangle,
  Bell,
  GraduationCap,
  Shield,
  BadgeCheck,
  Lock,
  type LucideIcon,
} from "lucide-react"

// -----------------------------
// Tipos
// -----------------------------
type OptionKey =
  | "dataInventory"
  | "privacyNotices"
  | "thirdPartyContracts"
  | "dataProtectionOfficer"
  | "arcoRights"
  | "personalDataSecuritySystem"
  | "davaraTraining"
  | "awareness"
  | "impactAssessment"
  | "dataManagementProgram"
  | "proceduresManagement"
  | "securityIncidentManagement"
  | "auditAlarms"

type Option = {
  name: OptionKey | "alicia"
  icon: LucideIcon
  href: string
  external?: boolean
  image?: string
}

// -----------------------------
// Traducciones
// -----------------------------
const translations: Record<"en" | "es", Record<OptionKey | "welcome", string>> = {
  en: {
    welcome: "Welcome to Integral Platform",
    dataInventory: "Personal data inventory",
    privacyNotices: "Privacy notices",
    thirdPartyContracts: "Third party contracts",
    dataProtectionOfficer: "Personal Data Department Members",
    arcoRights: "ARCO rights",
    personalDataSecuritySystem: "Personal Data Security Management System",
    davaraTraining: "Training",
    awareness: "Demonstrated/Proactive Responsibility",
    impactAssessment: "Personal Data Impact Assessment",
    dataManagementProgram: "Data Protection Policies",
    proceduresManagement: "PDP Procedures",
    securityIncidentManagement: "Security Incident Management",
    auditAlarms: "Audit Reminders",
  },
  es: {
    welcome: "Bienvenido a Protección de Datos Personales",
    dataInventory: "Inventario de datos personales",
    privacyNotices: "Avisos de privacidad",
    thirdPartyContracts: "Contratos con terceros",
    dataProtectionOfficer: "Miembros del Departamento de Datos Personales",
    arcoRights: "Derechos ARCO",
    personalDataSecuritySystem: "Sistema de gestión de seguridad de datos personales",
    davaraTraining: "Capacitación",
    awareness: "Responsabilidad demostrada",
    impactAssessment: "Evaluación de Impacto Datos Personales",
    dataManagementProgram: "Políticas de Protección de Datos",
    proceduresManagement: "Procedimientos PDP",
    securityIncidentManagement: "Gestión de incidentes de seguridad",
    auditAlarms: "Recordatorios Auditoría",
  },
}

const descriptions: Record<"en" | "es", Record<OptionKey, string>> = {
  en: {
    dataInventory:
      "Document the lifecycle of the data and its proportionality in the different areas of the company or organization.",
    privacyNotices:
      "Review, adapt, and generate the privacy notices required by the organization, as well as document the process of making them available.",
    thirdPartyContracts:
      "Review and adapt the legal instruments to regulate the communication of personal data to third parties (revisions and transfers).",
    dataProtectionOfficer:
      "Document the appointment and periodic activities of the Personal Data Department members.",
    arcoRights:
      "Review the processes for handling ARCO rights and record the received ARCO rights requests, as well as their processing.",
    personalDataSecuritySystem:
      "Identify the security measures applicable to personal data and review their implementation within the organization.",
    davaraTraining:
      "Access general training courses specialized in data protection.",
    awareness:
      "Review and improve internal data protection practices by creating and disseminating demonstrated/proactive responsibility materials.",
    impactAssessment:
      "Conduct and document personal data impact assessments to identify and mitigate risks.",
    dataManagementProgram:
      "Review the implementation of data protection policies and procedures.",
    proceduresManagement:
      "Register, track, and analyse PDP procedures, including authorities, procedural stages, and evidences.",
    securityIncidentManagement:
      "Identify the elements for managing security incidents and record them.",
    auditAlarms:
      "Set up monitoring and auditing systems for continuous data protection compliance.",
  },
  es: {
    dataInventory:
      "Documenta el ciclo de vida de los datos y la proporcionalidad de los mismos, en las distintas áreas de la empresa u organización.",
    privacyNotices:
      "Revisa, adecuar y generar los avisos de privacidad requeridos por la organización, así como documentar el proceso de puesta a disposición.",
    thirdPartyContracts:
      "Revisa y adapta los instrumentos jurídicos para regular comunicaciones de datos personales a terceros (revisiones y transferencias).",
    dataProtectionOfficer:
      "Documenta la designación y actividades periódicas de los Miembros del Departamento de Datos Personales ante la Alta Dirección.",
    arcoRights:
      "Revisa los procesos para la atención de derechos ARCO y registra las solicitudes recibidas y su proceso de atención.",
    personalDataSecuritySystem:
      "Identifica las medidas de seguridad aplicables a los datos personales y revisa su implementación dentro de la organización.",
    davaraTraining:
      "Gestiona cursos de capacitación generales especializados.",
    awareness:
      "Revisa y mejora prácticas internas de protección de datos creando y difundiendo materiales de responsabilidad demostrada.",
    impactAssessment:
      "Realiza y documenta evaluaciones de impacto de datos personales para identificar y mitigar riesgos.",
    dataManagementProgram:
      "Revisa la implementación de políticas y procedimientos de protección de datos.",
    proceduresManagement:
      "Centraliza los Procedimientos PDP, su trazabilidad procesal, riesgos y evidencias asociadas.",
    securityIncidentManagement:
      "Identifica los elementos para la gestión de incidentes de seguridad y registra su seguimiento.",
    auditAlarms:
      "Configura sistemas de monitoreo y auditoría para el cumplimiento continuo de protección de datos.",
  },
}

// -----------------------------
// Opciones (incluye Alicia con imagen y external)
// -----------------------------
const options: Option[] = [
  { name: "dataInventory", icon: Database, href: "/rat" },
  { name: "privacyNotices", icon: FileText, href: "/privacy-notices" },
  { name: "thirdPartyContracts", icon: FileSignature, href: "/third-party-contracts" },
  { name: "dataProtectionOfficer", icon: UserCog, href: "/dpo" },
  { name: "arcoRights", icon: Users, href: "/arco-rights" },
  { name: "personalDataSecuritySystem", icon: Shield, href: "/security-system" },
  { name: "securityIncidentManagement", icon: AlertTriangle, href: "/incidents-breaches" },
  { name: "impactAssessment", icon: ClipboardList, href: "/eipd" },
  { name: "awareness", icon: Newspaper, href: "/awareness" },
  { name: "dataManagementProgram", icon: FileCheck, href: "/data-policies" },
  { name: "davaraTraining", icon: GraduationCap, href: "/davara-training" },
  { name: "proceduresManagement", icon: Scale, href: "/litigation-management" },
  { name: "auditAlarms", icon: Bell, href: "/audit-alarms" },
  {
    name: "alicia",
    icon: BadgeCheck,
    href: "/alicia",
    image: "/images/alicia_person.jpeg",
  },
]

// -----------------------------
// Componente
// -----------------------------
export default function Home() {
  const { language } = useLanguage()
  const t = translations[language]
  const d = descriptions[language]
  const aliciaT = aliciaTranslations[language]
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  // Hover tipado para aceptar OptionKey y "alicia"
  const [hoveredCard, setHoveredCard] = useState<Option["name"] | null>(null)

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail"))
    setUserRole(localStorage.getItem("userRole"))
    const shouldShowWelcome = localStorage.getItem("showPostLoginWelcome") === "true"
    setShowWelcome(shouldShowWelcome)
  }, [])

  const canAccessModule = (href: string): boolean => {
    if (userRole === "admin") return true
    return hasModuleAccess(userEmail, href)
  }

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#18181b]">
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar text-white"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center max-w-3xl text-center px-6"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 1.5 }}
                className="mb-14"
              >
                <Image
                  src="/images/logo_davaragovernance.png"
                  alt="DavaraGovernance Logo"
                  width={180}
                  height={60}
                  unoptimized
                  priority
                  className="opacity-90 brightness-0 invert"
                />
              </motion.div>

              <h1 className="text-2xl md:text-3xl font-light tracking-[0.05em] mb-2 text-white/90">
                Bienvenido a la Plataforma de Protección de Datos Personales
              </h1>

              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.0, duration: 1, ease: "easeInOut" }}
                className="w-16 h-[1px] bg-white/40 my-10 mx-auto transform origin-center"
              />

              <p className="text-base md:text-lg text-white/70 mb-16 max-w-2xl font-light leading-loose tracking-wide">
                Gestiona, protege y audita la información de manera segura, en estricto cumplimiento normativo.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.8 }}
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setShowWelcome(false)
                    localStorage.removeItem("showPostLoginWelcome")
                  }}
                  className="bg-transparent border border-white/30 text-white/90 hover:bg-white hover:text-[hsl(var(--sidebar))] transition-all duration-500 rounded-sm px-14 py-6 text-xs tracking-[0.2em] font-light uppercase"
                >
                  Continuar
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto py-8">
        {/* GRID con mezcla ícono/imagen + overlay + enlaces internos/externos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {options.map((option) => {
            const title =
              option.name === "alicia" ? aliciaT.alicia : t[option.name as OptionKey]

            const description =
              option.name === "alicia"
                ? aliciaT.aliciaDescription
                : d[option.name as OptionKey]

            const isLocked = !option.external && option.name !== "alicia" && !canAccessModule(option.href)

            const CardContent = (
              <Card
                className={`p-6 transition-shadow flex flex-col items-center justify-center h-[200px] group relative overflow-hidden bg-white dark:bg-[#18181b] ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:shadow-lg"}`}
                onMouseEnter={() => !isLocked && setHoveredCard(option.name)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {option.image ? (
                  <div className="absolute inset-0 w-full h-full">
                    <Image
                      src="/images/alicia_person.jpeg"
                      alt={title}
                      fill
                      className="object-cover"
                      priority={option.name === "alicia"}
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
                  </div>
                ) : (
                  <div className="relative">
                    <option.icon className={`h-10 w-10 mb-4 transition-colors ${isLocked ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"}`} />
                    {isLocked && (
                      <Lock className="absolute -bottom-2 -right-2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                )}

                <span
                  className={`text-base font-medium text-center transition-colors leading-tight ${
                    option.image
                      ? `text-white relative z-10 ${
                          option.name === "alicia" ? "group-hover:opacity-0" : ""
                        }`
                      : isLocked
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white"
                  }`}
                  style={{ fontFamily: "Futura PT Medium, sans-serif" }}
                >
                  {option.name === "alicia" ? (
                    <Image
                      src="/images/Alicia_Sin_Despachos.png"
                      alt="Alicia"
                      width={130}
                      height={40}
                      className="object-contain relative z-10"
                      unoptimized
                    />
                  ) : title}
                </span>

                {isLocked && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-2">Sin acceso</span>
                )}

                {!isLocked && (
                  <motion.div
                    className="absolute inset-0 bg-white/90 dark:bg-black/90 p-4 flex items-center justify-center text-sm text-gray-800 dark:text-gray-100 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: hoveredCard === option.name ? 1 : 0,
                      y: hoveredCard === option.name ? 0 : 20,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ pointerEvents: hoveredCard === option.name ? "auto" : "none" }}
                  >
                    {description}
                  </motion.div>
                )}
              </Card>
            )

            // Enlaces externos abren en nueva pestaña; internos usan SafeLink
            if (option.external) {
              return (
                <a
                  key={option.name}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={typeof title === "string" ? title : "External link"}
                >
                  {CardContent}
                </a>
              )
            }

            if (isLocked) {
              return (
                <div key={option.name} className="block" aria-label={title}>
                  {CardContent}
                </div>
              )
            }

            return (
              <SafeLink key={option.name} href={option.href} className="block" aria-label={title}>
                {CardContent}
              </SafeLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}
