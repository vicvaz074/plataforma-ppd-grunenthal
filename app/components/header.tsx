"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/LanguageContext"
import { useSidebar } from "@/lib/SidebarContext"
import { destroySession } from "@/lib/session"
import { logAuditEvent } from "@/lib/audit-log"
import { useRouter, usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { translations } from "@/lib/translations"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
import { Moon, Sun, Globe, User, ChevronDown, LogOut, LayoutDashboard, Bell, ArrowRight } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  generateAllNotifications,
  markAsRead,
  markAllAsRead,
  NOTIFICATIONS_CHANGED_EVENT,
  MODULE_LABELS,
  MODULE_ICONS,
  type PlatformNotification,
} from "@/lib/notification-engine"
import { DAVARA_STORAGE_EVENT, ensureBrowserStorageEvents } from "@/lib/browser-storage-events"
import { CLIENT_BRANDING } from "@/lib/client-branding"

export function Header({ withSidebar = false }: { withSidebar?: boolean }) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { collapsed, isMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  const t = translations[language]
  const [userName, setUserName] = useState("")

  // Notifications state
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedUserName = localStorage.getItem("userName")
    if (storedUserName) {
      setUserName(storedUserName)
    }
  }, [])

  const refreshNotifications = useCallback(() => {
    const fresh = generateAllNotifications()
    setNotifications(fresh)
  }, [])

  useEffect(() => {
    ensureBrowserStorageEvents()
    refreshNotifications()

    const interval = setInterval(refreshNotifications, 60000)

    const handleStorageMutation = () => refreshNotifications()
    const handleNotificationMutation = () => refreshNotifications()

    window.addEventListener(DAVARA_STORAGE_EVENT, handleStorageMutation)
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationMutation)
    window.addEventListener("focus", handleStorageMutation)

    return () => {
      clearInterval(interval)
      window.removeEventListener(DAVARA_STORAGE_EVENT, handleStorageMutation)
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationMutation)
      window.removeEventListener("focus", handleStorageMutation)
    }
  }, [refreshNotifications])

  // Also refresh when pathname changes (user navigates)
  useEffect(() => {
    refreshNotifications()
  }, [pathname, refreshNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.leida).length
  const recent = notifications.slice(0, 5)

  const handleNotificationClick = (n: PlatformNotification) => {
    markAsRead(n.id)
    setShowNotifications(false)
    refreshNotifications()
    router.push(n.ruta)
  }

  const handleMarkAllRead = () => {
    markAllAsRead()
    refreshNotifications()
  }

  const handleLogout = () => {
    const userEmail = localStorage.getItem("userEmail") || "unknown"
    logAuditEvent("LOGOUT", userEmail, "Cierre de sesión")
    destroySession()

    toast({
      title: t.logout,
      description: t.goodbye || "Has cerrado sesión correctamente.",
    })

    const isFile = window.location.protocol === "file:"
    setTimeout(() => {
      if (isFile) {
        window.location.href = "./login/index.html"
      } else {
        router.push("/login")
      }
    }, 1500)
  }

  const dashboardActive =
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/")

  const prioColor = (p: string) => {
    if (p === "alta") return "bg-red-500"
    if (p === "media") return "bg-amber-500"
    return "bg-blue-400"
  }

  const prioBorder = (p: string) => {
    if (p === "alta") return "border-l-red-500"
    if (p === "media") return "border-l-amber-400"
    return "border-l-blue-300"
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 right-0 z-50 border-b bg-white dark:bg-gray-950 transition-[left] duration-300 ease-in-out"
      style={{ left: withSidebar ? (isMobile ? 70 : collapsed ? 70 : 260) : 0 }}
    >
      <div className="flex h-16 items-center px-6 justify-between">
        {/* Left side: logo (when sidebar collapsed) + title */}
        <div className="flex items-center gap-4">
          {/* Logo shown only when sidebar is collapsed */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              width: collapsed ? 150 : 0,
              opacity: collapsed ? 1 : 0,
            }}
          >
            <Link href="/" className="flex items-center">
              <img
                src={CLIENT_BRANDING.productLogoBlackPath}
                alt={CLIENT_BRANDING.productName}
                width={150}
                style={{
                  objectFit: "contain",
                  width: "150px",
                  height: "auto",
                }}
              />
            </Link>
          </div>

          <div className="hidden md:block">
            <h1 className="text-xl font-normal text-black" style={{ fontFamily: "Futura PT Medium, sans-serif" }}>
              {t.welcomeMessage}
            </h1>
          </div>

          {collapsed && (
            <div className="hidden lg:flex items-center border-l pl-4">
              <img
                src={CLIENT_BRANDING.clientLogoPath}
                alt={CLIENT_BRANDING.clientName}
                width={CLIENT_BRANDING.clientLogoWidths.header}
                style={{
                  objectFit: "contain",
                  width: `${CLIENT_BRANDING.clientLogoWidths.header}px`,
                  height: "auto",
                  filter: CLIENT_BRANDING.clientLogoBlackFilter,
                }}
              />
            </div>
          )}
        </div>

        {/* Controles a la derecha */}
        <div className="flex items-center gap-4">
          {/* Selector de idioma */}
          <Select value={language} onValueChange={(value: "es" | "en") => setLanguage(value)}>
            <SelectTrigger className="w-[100px]">
              <Globe className="mr-2 h-4 w-4" />
              <SelectValue placeholder={language.toUpperCase()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">ES</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>

          {/* Panel de control en medio */}
          <Link href="/dashboard">
            <Button
              variant={dashboardActive ? "default" : "outline"}
              className="gap-2"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="hidden sm:inline">{t.dashboard}</span>
            </Button>
          </Link>

          {/* ─── Bell Icon — Notificaciones ─── */}
          <div ref={bellRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </motion.span>
              )}
            </Button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden z-[9999]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Notificaciones
                      </span>
                      {notifications.length > 0 && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {notifications.length}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto">
                    {recent.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="h-8 w-8 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                          Sin notificaciones
                        </p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                          Todo está en orden
                        </p>
                      </div>
                    ) : (
                      recent.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left px-4 py-3 border-b border-slate-50 dark:border-gray-800 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors border-l-[3px] ${prioBorder(n.prioridad)} ${!n.leida ? "bg-primary/[0.03]" : ""
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg shrink-0 mt-0.5">
                              {MODULE_ICONS[n.tipo]}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                                  {MODULE_LABELS[n.tipo]}
                                </span>
                                <span className={`h-1.5 w-1.5 rounded-full ${prioColor(n.prioridad)}`} />
                                {!n.leida && (
                                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {n.titulo}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {n.descripcion}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <Link
                      href="/audit-alarms"
                      onClick={() => setShowNotifications(false)}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 border-t border-slate-100 dark:border-gray-700 transition-colors"
                    >
                      Ver todas ({notifications.length})
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Menú de usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline-block">
                  {userName || t.users}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => router.push("/profile")}>
                {t.profile}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/settings")}>
                {t.settings}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleLogout}>
                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.logout}
                </motion.div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón theme */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: theme === "light" ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </motion.div>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
