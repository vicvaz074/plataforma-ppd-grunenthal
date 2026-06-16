"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/LanguageContext"
import { translations } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Moon, Sun, Globe } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { hashPassword, saveUser, authenticateUser } from "@/lib/auth"
import { cacheCurrentUserPermissions } from "@/lib/user-permissions"
import { useSecurityContext } from "@/lib/SecurityContext"
import { checkRateLimit, formatRetryAfter, getRemainingAttempts } from "@/lib/rate-limiter"
import { validatePasswordStrength, getStrengthColor, getStrengthLabel } from "@/lib/password-validation"
import { sanitizeEmail } from "@/lib/sanitize"
import { startInactivityMonitor } from "@/lib/session"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"
import { useTheme } from "next-themes"
import { GRUNENTHAL_LOGO } from "@/lib/grunenthal-assets"

export default function LoginPage() {
  const { language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const t = translations[language]
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [passwordStrength, setPasswordStrength] = useState<string>("")
  const router = useRouter()
  const { initializeEncryption } = useSecurityContext()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true"
    if (!isAuthenticated) return

    const isFile = window.location.protocol === "file:"
    if (isFile) {
      const targetUrl = new URL("../index.html", window.location.href)
      window.location.replace(targetUrl.toString())
    } else {
      router.replace("/")
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
  
    if (!isLogin && (!name || !email || !password)) {
      setAlert({ type: "error", message: t.fillAllFields })
      return
    }
  
    if (isLogin && (!email || !password)) {
      setAlert({ type: "error", message: t.fillAllFields })
      return
    }
  
    const cleanEmail = sanitizeEmail(email)

    if (isLogin) {
      // Verificar rate limiting antes de intentar
      const rateCheck = checkRateLimit(cleanEmail)
      if (rateCheck.blocked) {
        setAlert({
          type: "error",
          message: `Demasiados intentos. Intenta de nuevo en ${formatRetryAfter(rateCheck.retryAfter!)}`,
        })
        return
      }

      const result = await authenticateUser(cleanEmail, password)

      if (result.rateLimited) {
        setAlert({
          type: "error",
          message: `Demasiados intentos. Intenta de nuevo en ${formatRetryAfter(result.retryAfter!)}`,
        })
        return
      }

      if (result.authenticated && result.user) {
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("userRole", result.user.role || "user")
        localStorage.setItem("userName", result.user.name)
        localStorage.setItem("userEmail", result.user.email || cleanEmail)
        if (result.user.modulePermissions) {
          localStorage.setItem("modulePermissions", JSON.stringify(result.user.modulePermissions))
        }
        cacheCurrentUserPermissions(result.user.email || cleanEmail)

        // Inicializar cifrado en reposo (derivar KEK del password, descifrar/crear DEK)
        try {
          await initializeEncryption(password)
        } catch {
          // Si falla el cifrado, continuar sin cifrado (primer uso o datos corruptos)
          console.warn("No se pudo inicializar el cifrado en reposo")
        }

        // Iniciar monitor de inactividad
        startInactivityMonitor()
        localStorage.setItem("showPostLoginWelcome", "true")

        const isFile = window.location.protocol === "file:"
        if (isFile) {
          window.location.href = "./index.html"
        } else {
          router.push("/")
        }
      } else {
        const remaining = getRemainingAttempts(cleanEmail)
        const msg = remaining > 0
          ? `${t.invalidCredentials} (${remaining} intentos restantes)`
          : t.invalidCredentials
        setAlert({ type: "error", message: msg })
      }
    } else {
      // Validar fortaleza de contraseña en registro
      const validation = validatePasswordStrength(password)
      if (!validation.valid) {
        setAlert({ type: "error", message: validation.errors[0] })
        return
      }

      const hashedPassword = await hashPassword(password)
      saveUser({ name, email: cleanEmail, password: hashedPassword })
      setAlert({ type: "success", message: t.accountCreatedDescription })
      setIsLogin(true)
    }
  }
  

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800"
      >
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">

            <Image
              src={GRUNENTHAL_LOGO.path}
              alt="Grünenthal"
              width={theme === "dark" ? 180 : 252}
              height={theme === "dark" ? 92 : 129}
              style={{ objectFit: "contain", filter: theme === "dark" ? GRUNENTHAL_LOGO.whiteFilter : GRUNENTHAL_LOGO.blackFilter }}
              unoptimized // 👈 importante para que no intente usar /_next/image
            />

          </div>
          <CardTitle className="text-2xl font-bold text-center">{isLogin ? t.loginTitle : t.registerTitle}</CardTitle>
          <CardDescription className="text-center">
            {isLogin ? t.loginDescription : t.registerDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              {!isLogin && (
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name">{t.name}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">{t.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (!isLogin && e.target.value) {
                        const v = validatePasswordStrength(e.target.value)
                        setPasswordErrors(v.errors)
                        setPasswordStrength(getStrengthLabel(v.strength))
                      } else {
                        setPasswordErrors([])
                        setPasswordStrength("")
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <motion.div
                      animate={{ scale: showPassword ? 0 : 1, opacity: showPassword ? 0 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <EyeOff className="h-4 w-4" />
                    </motion.div>
                    <motion.div
                      animate={{ scale: showPassword ? 1 : 0, opacity: showPassword ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ position: "absolute" }}
                    >
                      <Eye className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </div>
                {!isLogin && password && (
                  <div className="mt-1 space-y-1">
                    <p className={`text-xs font-medium ${
                      passwordErrors.length === 0 ? "text-green-500" : "text-orange-500"
                    }`}>
                      Fortaleza: {passwordStrength}
                    </p>
                    {passwordErrors.slice(0, 2).map((err, i) => (
                      <p key={i} className="text-xs text-red-500">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
            <Button
              className="w-full bg-[#2E7D73] hover:bg-[#246158] text-white dark:text-white"
              onClick={handleSubmit}
            >
              {isLogin ? t.loginButton : t.registerButton}
            </Button>
          </motion.div>
          <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? t.switchToRegister : t.switchToLogin}
          </Button>
          <div className="flex justify-between items-center w-full gap-2">
            <div className="flex-1">
              <Select value={language} onValueChange={(value: "es" | "en") => setLanguage(value)}>
                <SelectTrigger className="w-full">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t.language} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={toggleTheme}
                aria-label={theme === "light" ? t.darkMode : t.lightMode}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span>{theme === "light" ? t.darkMode : t.lightMode}</span>
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <Alert variant={alert.type === "success" ? "default" : "destructive"}>
              <AlertTitle>{alert.type === "success" ? t.success : t.error}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </>
  )
}
