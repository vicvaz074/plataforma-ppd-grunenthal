import bcrypt from "bcryptjs"
import { serialize } from "cookie"
import {
  getUsers,
  initializeDefaultUsers,
  ensureDemoUser,
  ensureGrunenthalAdminUser,
  getUserPermissions,
  ROLE_PRESETS,
  type PlatformUser,
} from "./user-permissions"
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "./rate-limiter"
import { logAuditEvent } from "./audit-log"
import { createSession } from "./session"
import { sanitizeEmail } from "./sanitize"

type StoredUser = {
  name: string
  email: string
  password: string
  approved: boolean
  role?: string
}

const DEFAULT_USERS: StoredUser[] = [
  {
    name: "Alexis Cervantes Padilla",
    email: "acervantes@davara.com.mx",
    password: "$2b$10$rDECJL8/Ju685.4TyU764OQSS.N8x0BoTE5rupTK7FC/tMrhAy5Je",
    approved: true,
    role: "user",
  },
  {
    name: "Gregorio Barco Vega",
    email: "gbarco@davara.com.mx",
    password: "$2b$10$rDECJL8/Ju685.4TyU764OQSS.N8x0BoTE5rupTK7FC/tMrhAy5Je",
    approved: true,
    role: "admin",
  },
  {
    name: "David Casero",
    email: "info@haikulabs.es",
    password: "$2b$10$PU3.DVZmgrzor0NMQ88A5eM9mki2BNUSxPc.90nbagw2L6nPzX09y",
    approved: true,
    role: "user",
  },
  {
    name: "Veronica García",
    email: "veronica.garciao@oxxo.com",
    password: "$2b$10$hte6S2D7LhTxUqya7tWKdukfETPcDkK4NY/vBqEJxAO45l5jG5QFe",
    approved: true,
    role: "user",
  },
  {
    name: "Manola Izquierdo",
    email: "izquierdo.manola@gmail.com",
    password: "$2b$10$UyYUnv33oKfOxMmA60ppbej6c/GebDgVW2Qu3OhebZ9BJ9SEKuSpm",
    approved: true,
    role: "admin",
  },
  {
    name: "María Elena Velazquez",
    email: "mariaelena.velazquez@bbva.com",
    password: "$2b$10$tWU29YMDlIkg..bNyoJvp.A2KHUscJ5.Pdv21WMV7hRMFC0oMk5b.",
    approved: true,
    role: "user",
  },
  {
    name: "Verónica García Ochoa",
    email: "veronica.garciao@femsa.com",
    password: "$2b$10$O0fCnjrfo7RPdcZAIO1I..DqVr.h6TjIMHv0OE7WaFJGl/6k6y8Hm",
    approved: true,
    role: "admin",
  },
  {
    name: "Jorge Valderrama",
    email: "jorge.valderrama@externo.mx",
    password: "$2b$10$wvAajXszm9A1VQtbpynjfuPfj8FpbyefYnWto0v9UsnrHumUSvbwG",
    approved: true,
    role: "admin",
  },
  {
    name: "Karen Mendoza",
    email: "karen.mendoza@yza.mx",
    password: "$2b$10$AT6XpbZBYJfZapK612voBeuIJ9tJ/qdnHYVnhsySloIwO.kafIUN2",
    approved: true,
    role: "admin",
  },
]

function getStoredUsers(): StoredUser[] {
  const storedUsers: StoredUser[] = JSON.parse(localStorage.getItem("users") || "[]")
  const knownEmails = new Set(storedUsers.map((user) => user.email))
  let updated = false

  DEFAULT_USERS.forEach((defaultUser) => {
    if (!knownEmails.has(defaultUser.email)) {
      storedUsers.push(defaultUser)
      knownEmails.add(defaultUser.email)
      updated = true
    }
  })

  if (updated) {
    localStorage.setItem("users", JSON.stringify(storedUsers))
  }

  return storedUsers
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export function saveUser(user: { name: string; email: string; password: string }) {
  const users = getStoredUsers()

  if (users.some((existingUser) => existingUser.email === user.email)) {
    return
  }

  users.push({ ...user, approved: false })
  localStorage.setItem("users", JSON.stringify(users))

  logAuditEvent("USER_CREATED", user.email, `Nuevo usuario registrado: ${user.name}`)
}

export type AuthResult = {
  authenticated: boolean
  user?: {
    name: string
    email: string
    role: string
    modulePermissions: Record<string, boolean>
  }
  rateLimited?: boolean
  retryAfter?: number | null
  sessionToken?: string
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const cleanEmail = sanitizeEmail(email)

  // Verificar rate limiting
  const rateCheck = checkRateLimit(cleanEmail)
  if (rateCheck.blocked) {
    logAuditEvent("RATE_LIMIT_TRIGGERED", cleanEmail, "Intento de login bloqueado por rate limiting")
    return {
      authenticated: false,
      rateLimited: true,
      retryAfter: rateCheck.retryAfter,
    }
  }

  // Initialize permissions system
  initializeDefaultUsers()
  await ensureDemoUser()
  ensureGrunenthalAdminUser()

  // Admin via environment variable or fallback hardcoded (for backward compatibility)
  const adminEmail = (typeof process !== "undefined" && process.env?.ADMIN_EMAIL) || "admin@example.com"
  const adminPasswordHash = (typeof process !== "undefined" && process.env?.ADMIN_PASSWORD_HASH) || null

  if (cleanEmail === adminEmail) {
    let adminAuth = false
    if (adminPasswordHash) {
      // Producción: verificar contra hash de variable de entorno
      adminAuth = await verifyPassword(password, adminPasswordHash)
    } else {
      // Desarrollo/fallback: credenciales por defecto (solo si no hay env vars)
      adminAuth = password === "password"
    }

    if (adminAuth) {
      clearAttempts(cleanEmail)
      const sessionToken = createSession()
      logAuditEvent("LOGIN_SUCCESS", cleanEmail, "Login exitoso (admin)")
      return {
        authenticated: true,
        sessionToken,
        user: {
          name: "Administrador",
          email: adminEmail,
          role: "admin",
          modulePermissions: ROLE_PRESETS.admin,
        },
      }
    }
  }

  // Check new platform_users store first (demo user lives here)
  const platformUsers = getUsers()
  const platformUser = platformUsers.find((u) => u.email === cleanEmail && u.approved)
  if (platformUser) {
    try {
      if (await verifyPassword(password, platformUser.password)) {
        clearAttempts(cleanEmail)
        const sessionToken = createSession()
        logAuditEvent("LOGIN_SUCCESS", cleanEmail, `Login exitoso: ${platformUser.name}`)
        return {
          authenticated: true,
          sessionToken,
          user: {
            name: platformUser.name,
            email: platformUser.email,
            role: platformUser.role,
            modulePermissions: getUserPermissions(cleanEmail),
          },
        }
      }
    } catch { /* hash mismatch or invalid, fall through */ }
  }

  // Legacy users store
  const users = getStoredUsers()
  const user = users.find((u: StoredUser) => u.email === cleanEmail && u.approved)

  if (user && (await verifyPassword(password, user.password))) {
    clearAttempts(cleanEmail)
    const sessionToken = createSession()
    const perms = getUserPermissions(cleanEmail)
    logAuditEvent("LOGIN_SUCCESS", cleanEmail, `Login exitoso (legacy): ${user.name}`)
    return {
      authenticated: true,
      sessionToken,
      user: {
        ...user,
        email: user.email,
        role: user.role || "editor",
        modulePermissions: Object.keys(perms).length > 0 ? perms : ROLE_PRESETS.editor,
      },
    }
  }

  // Login fallido
  const blocked = recordFailedAttempt(cleanEmail)
  logAuditEvent("LOGIN_FAILED", cleanEmail, `Intento de login fallido${blocked ? " - cuenta bloqueada temporalmente" : ""}`)

  return { authenticated: false }
}

export function setAuthCookie(res: any, token: string) {
  const cookie = serialize("auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    maxAge: 5 * 60 * 60,
    path: "/",
  })
  res.setHeader("Set-Cookie", cookie)
}
