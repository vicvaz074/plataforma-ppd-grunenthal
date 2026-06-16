"use client"

import bcrypt from "bcryptjs"
import { logAuditEvent } from "./audit-log"

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "editor" | "viewer" | "custom"

export interface ModuleDefinition {
  slug: string
  labelEs: string
  labelEn: string
  icon: string // lucide icon name
  isSpecial?: boolean // can have module password
}

export interface PlatformUser {
  name: string
  email: string
  password: string // bcrypt hash
  role: UserRole
  approved: boolean
  modulePermissions: Record<string, boolean>
  createdAt: string
  lastLogin?: string
}

export interface ModulePassword {
  moduleSlug: string
  password: string // bcrypt hash (cifrado en reposo via encrypted-storage)
  enabled: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const ALL_MODULES: ModuleDefinition[] = [
  { slug: "/rat", labelEs: "Inventarios de datos personales", labelEn: "Personal data inventories", icon: "Database" },
  { slug: "/privacy-notices", labelEs: "Avisos de privacidad", labelEn: "Privacy notices", icon: "FileText" },
  { slug: "/third-party-contracts", labelEs: "Contratos con terceros", labelEn: "Third party contracts", icon: "FileSignature" },
  { slug: "/dpo", labelEs: "Oficial de Protección de Datos", labelEn: "Data protection officer", icon: "UserCog" },
  { slug: "/arco-rights", labelEs: "Derechos ARCO", labelEn: "ARCO rights", icon: "Users", isSpecial: true },
  { slug: "/security-system", labelEs: "Sistema de gestión de seguridad", labelEn: "Security Management System", icon: "Shield" },
  { slug: "/awareness", labelEs: "Responsabilidad demostrada", labelEn: "Demonstrated Responsibility", icon: "Newspaper" },
  { slug: "/eipd", labelEs: "Evaluación de Impacto", labelEn: "Impact Assessment", icon: "ClipboardList" },
  { slug: "/data-policies", labelEs: "Políticas de Protección de Datos", labelEn: "Data Protection Policies", icon: "FileCheck", isSpecial: true },
  { slug: "/davara-training", labelEs: "Capacitación", labelEn: "Training", icon: "GraduationCap" },
  { slug: "/litigation-management", labelEs: "Procedimientos PDP", labelEn: "PDP Procedures", icon: "Scale" },
  { slug: "/audit", labelEs: "Auditoría en protección de datos", labelEn: "Data Protection Audit", icon: "ListCheck", isSpecial: true },
  { slug: "/incidents-breaches", labelEs: "Gestión de incidentes de seguridad", labelEn: "Security Incident Management", icon: "AlertTriangle" },
  { slug: "/audit-alarms", labelEs: "Recordatorios", labelEn: "Reminders", icon: "Bell" },
]

// ─── Role Presets ────────────────────────────────────────────────────────────

function allModulesPermissions(value: boolean): Record<string, boolean> {
  const perms: Record<string, boolean> = {}
  ALL_MODULES.forEach((m) => { perms[m.slug] = value })
  return perms
}

export const ROLE_PRESETS: Record<Exclude<UserRole, "custom">, Record<string, boolean>> = {
  admin: allModulesPermissions(true),
  editor: (() => {
    const perms = allModulesPermissions(true)
    perms["/audit"] = false
    return perms
  })(),
  viewer: (() => {
    const perms = allModulesPermissions(false)
    perms["/rat"] = true
    perms["/privacy-notices"] = true
    perms["/data-policies"] = true
    perms["/davara-training"] = true
    return perms
  })(),
}

export const ROLE_LABELS: Record<UserRole, { es: string; en: string }> = {
  admin: { es: "Administrador", en: "Administrator" },
  editor: { es: "Editor", en: "Editor" },
  viewer: { es: "Visor", en: "Viewer" },
  custom: { es: "Personalizado", en: "Custom" },
}

// ─── Demo User ───────────────────────────────────────────────────────────────
// Password "demo123" hashed with bcrypt (10 rounds)
// We'll generate this at runtime to avoid issues

const DEMO_USER_PERMISSIONS: Record<string, boolean> = (() => {
  const perms = allModulesPermissions(false)
  perms["/rat"] = true
  perms["/privacy-notices"] = true
  perms["/davara-training"] = true
  perms["/awareness"] = true
  return perms
})()

export const GRUNENTHAL_ADMIN_EMAIL = "sofia.jaimes@grunenthal.com"
export const GRUNENTHAL_ADMIN_NAME = "Sofia Jaimes"
const GRUNENTHAL_ADMIN_PASSWORD_HASH = "$2b$10$QHkdAHpW2GrOdg1CqIUeLuLaSzXHpGUGQYAyHBkrbTdHcFrpmg2UO"

// ─── Storage Keys ────────────────────────────────────────────────────────────

const USERS_KEY = "platform_users"
const MODULE_PASSWORDS_KEY = "module_passwords"
const USER_PERMISSIONS_CACHE_KEY = "current_user_permissions"

const FULL_ACCESS_EMAILS = new Set([
  "admin@example.com",
  "gbarco@davara.com.mx",
  "veronica.garciao@oxxo.com",
  "veronica.garciao@femsa.com",
  "jorge.valderrama@externo.mx",
  "karen.mendoza@yza.mx",
  GRUNENTHAL_ADMIN_EMAIL,
])

// ─── User CRUD ───────────────────────────────────────────────────────────────

export function getUsers(): PlatformUser[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(USERS_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveUsers(users: PlatformUser[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function initializeDefaultUsers(): void {
  const existing = getUsers()
  if (existing.length > 0) return

  // Migrate from old "users" key if present
  const oldUsers = localStorage.getItem("users")
  if (oldUsers) {
    try {
      const parsed = JSON.parse(oldUsers) as any[]
      const migrated: PlatformUser[] = parsed.map((u) => ({
        name: u.name,
        email: u.email,
        password: u.password,
        role: (u.role === "admin" ? "admin" : "editor") as UserRole,
        approved: u.approved ?? true,
        modulePermissions: u.role === "admin" ? ROLE_PRESETS.admin : ROLE_PRESETS.editor,
        createdAt: new Date().toISOString(),
      }))
      saveUsers(migrated)
      return
    } catch { /* ignore */ }
  }
}

export async function ensureDemoUser(): Promise<void> {
  const users = getUsers()
  const demoExists = users.some((u) => u.email === "demo@example.com")
  if (!demoExists) {
    // Generar el hash en tiempo de ejecución para garantizar que sea correcto
    const hashedPassword = await bcrypt.hash("demo123", 10)
    users.push({
      name: "Usuario Demo",
      email: "demo@example.com",
      password: hashedPassword,
      role: "custom",
      approved: true,
      modulePermissions: { ...DEMO_USER_PERMISSIONS },
      createdAt: new Date().toISOString(),
    })
    saveUsers(users)
  }
}

export function ensureGrunenthalAdminUser(): void {
  const users = getUsers()
  const idx = users.findIndex((u) => u.email === GRUNENTHAL_ADMIN_EMAIL)
  const user: PlatformUser = {
    name: GRUNENTHAL_ADMIN_NAME,
    email: GRUNENTHAL_ADMIN_EMAIL,
    password: idx >= 0 ? users[idx].password || GRUNENTHAL_ADMIN_PASSWORD_HASH : GRUNENTHAL_ADMIN_PASSWORD_HASH,
    role: "admin",
    approved: true,
    modulePermissions: { ...ROLE_PRESETS.admin },
    createdAt: idx >= 0 ? users[idx].createdAt : new Date().toISOString(),
  }

  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user }
  } else {
    users.push(user)
  }

  saveUsers(users)
}

export function addUser(user: Omit<PlatformUser, "createdAt">): boolean {
  const users = getUsers()
  if (users.some((u) => u.email === user.email)) return false
  users.push({ ...user, createdAt: new Date().toISOString() })
  saveUsers(users)
  return true
}

export function updateUser(email: string, updates: Partial<PlatformUser>): void {
  const users = getUsers()
  const idx = users.findIndex((u) => u.email === email)
  if (idx === -1) return
  users[idx] = { ...users[idx], ...updates }
  saveUsers(users)
}

export function deleteUser(email: string): void {
  const users = getUsers().filter((u) => u.email !== email)
  saveUsers(users)
}

export function approveUser(email: string): void {
  updateUser(email, { approved: true })
}

export function rejectUser(email: string): void {
  deleteUser(email)
}

// ─── Permission Checks ──────────────────────────────────────────────────────

export function getUserPermissions(email: string): Record<string, boolean> {
  if (FULL_ACCESS_EMAILS.has(email)) return ROLE_PRESETS.admin
  const users = getUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return allModulesPermissions(false)
  if (user.role !== "custom" && user.role in ROLE_PRESETS) {
    return ROLE_PRESETS[user.role as Exclude<UserRole, "custom">]
  }
  return user.modulePermissions || allModulesPermissions(false)
}

export function hasModuleAccess(email: string | null, moduleSlug: string): boolean {
  if (!email) return false
  if (FULL_ACCESS_EMAILS.has(email)) return true
  const perms = getUserPermissions(email)
  // Check both exact match and prefix
  if (perms[moduleSlug] === true) return true
  // Check if any permission key is a prefix of the moduleSlug
  for (const key of Object.keys(perms)) {
    if (perms[key] && moduleSlug.startsWith(key + "/")) return true
    if (perms[key] && key.startsWith(moduleSlug)) return true
  }
  return false
}

export function updateUserPermissions(email: string, permissions: Record<string, boolean>): void {
  updateUser(email, { modulePermissions: permissions, role: "custom" })
}

export function setUserRole(email: string, role: UserRole): void {
  if (role === "custom") {
    updateUser(email, { role })
  } else {
    updateUser(email, {
      role,
      modulePermissions: ROLE_PRESETS[role],
    })
  }
}

// ─── Module Passwords ────────────────────────────────────────────────────────

export function getModulePasswords(): ModulePassword[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(MODULE_PASSWORDS_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveModulePasswords(passwords: ModulePassword[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MODULE_PASSWORDS_KEY, JSON.stringify(passwords))
}

export async function setModulePassword(moduleSlug: string, password: string): Promise<void> {
  const passwords = getModulePasswords()
  const hashedPassword = await bcrypt.hash(password, 10)
  const idx = passwords.findIndex((p) => p.moduleSlug === moduleSlug)
  if (idx >= 0) {
    passwords[idx] = { moduleSlug, password: hashedPassword, enabled: true }
  } else {
    passwords.push({ moduleSlug, password: hashedPassword, enabled: true })
  }
  saveModulePasswords(passwords)
  logAuditEvent("MODULE_PASSWORD_SET", "admin", `Contraseña establecida para módulo: ${moduleSlug}`)
}

export function removeModulePassword(moduleSlug: string): void {
  const passwords = getModulePasswords().filter((p) => p.moduleSlug !== moduleSlug)
  saveModulePasswords(passwords)
  logAuditEvent("MODULE_PASSWORD_REMOVED", "admin", `Contraseña eliminada para módulo: ${moduleSlug}`)
}

export function toggleModulePassword(moduleSlug: string, enabled: boolean): void {
  const passwords = getModulePasswords()
  const idx = passwords.findIndex((p) => p.moduleSlug === moduleSlug)
  if (idx >= 0) {
    passwords[idx].enabled = enabled
    saveModulePasswords(passwords)
  }
}

export async function verifyModulePassword(moduleSlug: string, password: string): Promise<boolean> {
  const passwords = getModulePasswords()
  const entry = passwords.find((p) => p.moduleSlug === moduleSlug && p.enabled)
  if (!entry) return true // no password set = free access
  // Soportar tanto hashes bcrypt como contraseñas legacy en texto plano
  if (entry.password.startsWith("$2")) {
    return bcrypt.compare(password, entry.password)
  }
  // Fallback para contraseñas legacy en texto plano (migración pendiente)
  return entry.password === password
}

export function hasModulePassword(moduleSlug: string): boolean {
  const passwords = getModulePasswords()
  return passwords.some((p) => p.moduleSlug === moduleSlug && p.enabled)
}

// ─── Session Helpers ─────────────────────────────────────────────────────────

export function cacheCurrentUserPermissions(email: string): void {
  const perms = getUserPermissions(email)
  localStorage.setItem(USER_PERMISSIONS_CACHE_KEY, JSON.stringify(perms))
}

export function getCachedPermissions(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(USER_PERMISSIONS_CACHE_KEY)
  return raw ? JSON.parse(raw) : {}
}

export function clearPermissionsCache(): void {
  localStorage.removeItem(USER_PERMISSIONS_CACHE_KEY)
}

// ─── Session for module passwords already unlocked ───────────────────────────

const UNLOCKED_KEY = "unlocked_modules"

export function getUnlockedModules(): string[] {
  if (typeof window === "undefined") return []
  const raw = sessionStorage.getItem(UNLOCKED_KEY)
  return raw ? JSON.parse(raw) : []
}

export function unlockModule(moduleSlug: string): void {
  const unlocked = getUnlockedModules()
  if (!unlocked.includes(moduleSlug)) {
    unlocked.push(moduleSlug)
    sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked))
  }
}

export function isModuleUnlocked(moduleSlug: string): boolean {
  return getUnlockedModules().includes(moduleSlug)
}
