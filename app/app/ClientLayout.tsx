"use client"

import React, { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/LanguageContext"
import { AppProvider } from "@/lib/AppContext"
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext"
import { SecurityProvider } from "@/lib/SecurityContext"
import "@/lib/zod-config"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/toaster"
import { isSessionValid, startInactivityMonitor, onSessionExpired, destroySession } from "@/lib/session"
import { seedGrunenthalDemoData } from "@/lib/grunenthal-seed"

function AppShell({ authed, children }: { authed: boolean; children: React.ReactNode }) {
  const { collapsed, isMobile } = useSidebar()
  const sidebarOffset = isMobile ? 70 : collapsed ? 70 : 260

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16">{children}</main>
      </div>
    )
  }

  return (
    <>
      <Sidebar />
      <Header withSidebar />
      <div
        className="min-h-screen flex min-w-0 flex-col overflow-x-hidden transition-[margin,width] duration-300 ease-in-out pt-16"
        style={{ marginLeft: sidebarOffset, width: `calc(100% - ${sidebarOffset}px)` }}
      >
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setHydrated(true)
    seedGrunenthalDemoData().catch((error) => {
      console.error("No se pudo inicializar la demo Grünenthal:", error)
    })

    const authenticated = localStorage.getItem("isAuthenticated") === "true"
    // Verificar también la sesión (timeout por inactividad y expiración)
    const sessionOk = isSessionValid()
    const isValid = authenticated && sessionOk

    // Si había sesión pero expiró, limpiar
    if (authenticated && !sessionOk) {
      destroySession()
    }

    setAuthed(isValid)

    // Configurar auto-logout por inactividad
    if (isValid) {
      onSessionExpired(() => {
        destroySession()
        setAuthed(false)
        const fileProto = window.location.protocol === "file:"
        window.location.href = fileProto ? "./login/index.html" : "/login"
      })
      startInactivityMonitor()
    }

    const fileProto = window.location.protocol === "file:"

    if (fileProto) {
      const depth = pathname.split("/").filter(Boolean).length
      const baseHref = depth > 0 ? "../".repeat(depth) : "./"
      let baseEl = document.querySelector("base")
      if (!baseEl) {
        baseEl = document.createElement("base")
        document.head.prepend(baseEl)
      }
      baseEl.setAttribute("href", baseHref)

      const isLogin = pathname.includes("/login")
      if (!isValid && !isLogin) {
        window.location.href = "./login/index.html"
      }
    } else {
      const isLogin = pathname === "/login" || pathname === "/login/"
      if (!isValid && !isLogin) {
        window.location.href = "/login"
      }
    }
  }, [pathname])

  if (!hydrated) return null

  const isLoginPage =
    pathname === "/login" ||
    pathname === "/login/" ||
    pathname.endsWith("/login/index.html")

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <SecurityProvider>
        <AppProvider>
          <LanguageProvider>
            <SidebarProvider>
              {isLoginPage ? (
                <>{children}</>
              ) : (
                <AppShell authed={authed}>
                  {children}
                </AppShell>
              )}
            </SidebarProvider>
          </LanguageProvider>
        </AppProvider>
      </SecurityProvider>
      <Toaster />
    </ThemeProvider>
  )
}
