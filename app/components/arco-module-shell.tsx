"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, Download, Eye, FileArchive, FileJson, Menu, Share2, type LucideIcon } from "lucide-react"

import { FilePreviewDialog } from "@/components/file-preview-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { createFileURL, getAllFiles, type StoredFile } from "@/lib/fileStorage"
import { canOfferFilePreview } from "@/lib/file-preview"
import {
  buildModuleExportData,
  getCurrentModuleExportDefinition,
  triggerDataUrlDownloads,
} from "@/lib/module-export"

export type ModuleWorkspaceNavItem = {
  id?: string
  href?: string
  label: string
  shortLabel?: string
  mobileLabel?: string
  icon: LucideIcon
  badge?: number | string
  activePaths?: string[]
  group?: string
}

export type ArcoModuleNavItem = ModuleWorkspaceNavItem & {
  href: string
}

type HeaderBadgeTone = "primary" | "positive" | "warning" | "critical" | "neutral"

type HeaderBadge = {
  label: string
  tone?: HeaderBadgeTone
}

type BaseWorkspaceShellProps = {
  moduleLabel: string
  moduleTitle: string
  moduleDescription: string
  pageLabel: string
  pageTitle: string
  pageDescription?: string
  navItems: ModuleWorkspaceNavItem[]
  headerBadges?: HeaderBadge[]
  actions?: ReactNode
  children: ReactNode
  contentClassName?: string
  backHref?: string
  backLabel?: string
  activeNavId?: string
  onNavSelect?: (itemId: string) => void
  surfaceClassName?: string
}

type ArcoModuleShellProps = Omit<BaseWorkspaceShellProps, "activeNavId" | "onNavSelect"> & {
  navItems: ArcoModuleNavItem[]
}

type ModuleMetricCardProps = {
  label: string
  value: string | number
  helper: string
  icon?: LucideIcon
  tone?: HeaderBadgeTone
}

type ResolvedNavItem = ModuleWorkspaceNavItem & {
  key: string
  active: boolean
}

type NavGroup = {
  key: string
  label?: string
  items: ResolvedNavItem[]
}

type DesktopSidebarFrame = {
  left: number
  top: number
  width: number
  height: number
  shellWidth: number
}

function downloadAsJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function canPreviewExportStoredFile(file: StoredFile) {
  try {
    return canOfferFilePreview(file)
  } catch {
    return false
  }
}

export const MODULE_COLOR_PALETTES = {
  privacy: ["#0f4c81", "#1d70a2", "#2a9d8f", "#82c91e", "#f59f00", "#ef476f", "#8b5cf6", "#264653"],
  contracts: ["#1d4ed8", "#0ea5e9", "#14b8a6", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#7c3aed"],
  dpo: ["#0a4abf", "#2563eb", "#14b8a6", "#22c55e", "#f59e0b", "#fb7185", "#8b5cf6", "#1f2937"],
  eipd: ["#1e3a8a", "#2563eb", "#0284c7", "#10b981", "#84cc16", "#f59e0b", "#ef4444", "#7c3aed"],
  policies: ["#1d4ed8", "#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ef4444", "#8b5cf6", "#334155"],
  awareness: ["#1b75bc", "#0a4abf", "#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#334155"],
} as const

function badgeToneClasses(tone: HeaderBadgeTone = "neutral") {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "critical") return "border-red-200 bg-red-50 text-red-700"
  if (tone === "primary") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function metricAccentClasses(tone: HeaderBadgeTone = "primary") {
  if (tone === "positive") return "bg-emerald-500"
  if (tone === "warning") return "bg-amber-500"
  if (tone === "critical") return "bg-red-500"
  if (tone === "neutral") return "bg-slate-400"
  return "bg-[#0a4abf]"
}

function getNavItemKey(item: ModuleWorkspaceNavItem, index: number) {
  return item.id || item.href || `${item.label}-${index}`
}

function getNavItemValue(item: ModuleWorkspaceNavItem, index: number) {
  return item.id || item.href || `${item.label}-${index}`
}

function isRouteItemActive(pathname: string, item: ModuleWorkspaceNavItem) {
  if (!item.href) return false

  const basePath = item.href.split("?")[0]
  const matchTargets = item.activePaths && item.activePaths.length > 0 ? item.activePaths : [basePath]

  return matchTargets.some((target) => {
    const normalizedTarget = target.endsWith("/") && target.length > 1 ? target.slice(0, -1) : target
    const isModuleRoot = normalizedTarget.split("/").filter(Boolean).length === 1

    if (pathname === normalizedTarget) return true
    if (isModuleRoot) return false

    return pathname.startsWith(`${normalizedTarget}/`)
  })
}

function buildNavGroups(items: ResolvedNavItem[]): NavGroup[] {
  const groups: NavGroup[] = []

  items.forEach((item) => {
    const key = item.group || "__default__"
    const existing = groups.find((group) => group.key === key)

    if (existing) {
      existing.items.push(item)
      return
    }

    groups.push({
      key,
      label: item.group,
      items: [item],
    })
  })

  return groups
}

function DesktopNavItem({
  item,
  onSelect,
}: {
  item: ResolvedNavItem
  onSelect?: (itemId: string) => void
}) {
  const Icon = item.icon
  const label = item.shortLabel || item.label
  const itemId = item.id || item.href || item.key
  const classes = cn(
    "flex min-h-[36px] w-full items-center gap-2.5 rounded-[20px] px-2.5 py-2 text-left text-[12px] font-medium transition-all",
    item.active
      ? "bg-white text-[#1b75bc] shadow-[0_12px_24px_rgba(27,117,188,0.08)]"
      : "text-[#4f6788] hover:bg-white/80 hover:text-[#1b75bc]",
  )

  const content = (
    <>
      <span className={cn("h-2.5 w-2.5 rounded-full", item.active ? "bg-[#0a4abf]" : "bg-[#7ea4df]")} />
      <Icon className={cn("h-4 w-4 shrink-0", item.active ? "text-[#1b75bc]" : "text-[#5f7698]")} />
      <span className="min-w-0 flex-1 truncate leading-tight" title={item.label}>
        {label}
      </span>
      {item.badge !== undefined ? (
        <span className="ml-auto rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#0a4abf]">
          {item.badge}
        </span>
      ) : null}
    </>
  )

  if (item.href) {
    return (
      <Link key={item.key} href={item.href} className={classes} title={item.label}>
        {content}
      </Link>
    )
  }

  return (
    <button
      key={item.key}
      type="button"
      className={classes}
      title={item.label}
      onClick={() => onSelect?.(itemId)}
    >
      {content}
    </button>
  )
}

function MobileNavItem({
  item,
  close,
  onSelect,
}: {
  item: ResolvedNavItem
  close: () => void
  onSelect?: (itemId: string) => void
}) {
  const Icon = item.icon
  const label = item.mobileLabel || item.label
  const itemId = item.id || item.href || item.key
  const classes = cn(
    "flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors",
    item.active
      ? "bg-white text-[#1b75bc] shadow-[0_12px_24px_rgba(27,117,188,0.08)]"
      : "text-[#4f6788] hover:bg-white/80 hover:text-[#1b75bc]",
  )

  const content = (
    <>
      <span className={cn("h-2.5 w-2.5 rounded-full", item.active ? "bg-[#0a4abf]" : "bg-[#7ea4df]")} />
      <Icon className={cn("h-4 w-4 shrink-0", item.active ? "text-[#1b75bc]" : "text-[#5f7698]")} />
      <span className="min-w-0 flex-1 break-words leading-snug">{label}</span>
      {item.badge !== undefined ? (
        <span className="ml-auto rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#0a4abf]">
          {item.badge}
        </span>
      ) : null}
    </>
  )

  if (item.href) {
    return (
      <Link key={item.key} href={item.href} className={classes} onClick={close}>
        {content}
      </Link>
    )
  }

  return (
    <button
      key={item.key}
      type="button"
      className={classes}
      onClick={() => {
        onSelect?.(itemId)
        close()
      }}
    >
      {content}
    </button>
  )
}

export function ModuleMetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: ModuleMetricCardProps) {
  return (
    <Card className="rounded-[24px] border-[#d6e1f6] shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </CardDescription>
          {Icon ? (
            <div className="rounded-xl bg-slate-50 p-2 text-slate-600">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold tracking-tight text-slate-950">{value}</span>
          <span className={cn("mb-2 h-2.5 w-2.5 rounded-full", metricAccentClasses(tone))} />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  )
}

export function ModuleSectionCard({
  title,
  description,
  children,
  action,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("rounded-[28px] border-[#d6e1f6] shadow-sm", className)}>
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-slate-950">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

export function ModuleEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#c5d7f2] bg-[#f8fbff] p-10 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ModuleWorkspaceShell({
  moduleLabel,
  moduleTitle,
  moduleDescription,
  pageLabel,
  pageTitle,
  pageDescription,
  navItems,
  headerBadges,
  actions,
  children,
  contentClassName,
  backHref = "/",
  backLabel = "Volver al inicio",
  activeNavId,
  onNavSelect,
  surfaceClassName,
}: BaseWorkspaceShellProps) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [previewExportFile, setPreviewExportFile] = useState<StoredFile | null>(null)
  const shellSurfaceRef = useRef<HTMLDivElement | null>(null)
  const [desktopSidebarFrame, setDesktopSidebarFrame] = useState<DesktopSidebarFrame | null>(null)
  const moduleExportDefinition = useMemo(() => getCurrentModuleExportDefinition(pathname), [pathname])
  const moduleExportData = useMemo(() => {
    if (typeof window === "undefined" || !moduleExportDefinition) {
      return null
    }

    const localStorageValues = Object.keys(window.localStorage).reduce<Record<string, string | null>>((acc, key) => {
      acc[key] = window.localStorage.getItem(key)
      return acc
    }, {})

    return buildModuleExportData({
      pathname,
      moduleLabel,
      moduleTitle,
      moduleDescription,
      definition: moduleExportDefinition,
      localStorageValues,
      files: getAllFiles(),
    })
  }, [moduleDescription, moduleExportDefinition, moduleLabel, moduleTitle, pathname])

  const handleDownloadDocuments = () => {
    if (!moduleExportData || moduleExportData.files.length === 0) return

    triggerDataUrlDownloads(
      moduleExportData.files.map((file, index) => ({
        href: createFileURL(file.content),
        filename: file.name || `documento-${index + 1}`,
      })),
    )
  }

  const handleDownloadDocument = (file: StoredFile, index: number) => {
    triggerDataUrlDownloads([
      {
        href: createFileURL(file.content),
        filename: file.name || `documento-${index + 1}`,
      },
    ])
  }

  const resolvedItems = useMemo<ResolvedNavItem[]>(() => {
    return navItems.map((item, index) => {
      const key = getNavItemKey(item, index)
      const value = getNavItemValue(item, index)
      const active = activeNavId ? activeNavId === value : isRouteItemActive(pathname, item)

      return {
        ...item,
        key,
        active,
      }
    })
  }, [activeNavId, navItems, pathname])

  const navGroups = useMemo(() => buildNavGroups(resolvedItems), [resolvedItems])
  const activeItem =
    resolvedItems.find((item) => item.active) || resolvedItems[0]
  const ActiveIcon = activeItem?.icon
  const visibleHeaderBadges = useMemo(() => (headerBadges ?? []).slice(0, 2), [headerBadges])

  useEffect(() => {
    const node = shellSurfaceRef.current
    if (!node || typeof window === "undefined") return

    let frame = 0

    const updateFrame = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const width = Math.round(Math.min(228, Math.max(212, rect.width * 0.18)))
      const shellWidth = rect.width
      const height = Math.min(rect.height, Math.max(320, window.innerHeight - top))

      setDesktopSidebarFrame((current) => {
        if (
          current &&
          current.left === rect.left &&
          current.top === top &&
          current.width === width &&
          current.height === height &&
          current.shellWidth === shellWidth
        ) {
          return current
        }

        return {
          left: rect.left,
          top,
          width,
          height,
          shellWidth,
        }
      })
    }

    const scheduleFrameUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateFrame)
    }

    scheduleFrameUpdate()
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scheduleFrameUpdate)
    })

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleFrameUpdate)
    observer?.observe(node)
    window.addEventListener("resize", scheduleFrameUpdate)
    window.addEventListener("scroll", scheduleFrameUpdate, { passive: true })

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener("resize", scheduleFrameUpdate)
      window.removeEventListener("scroll", scheduleFrameUpdate)
    }
  }, [pathname])

  const desktopSidebarStyle = useMemo<CSSProperties | undefined>(() => {
    if (!desktopSidebarFrame) return undefined
    return {
      left: desktopSidebarFrame.left,
      top: desktopSidebarFrame.top,
      width: desktopSidebarFrame.width,
      height: desktopSidebarFrame.height,
    }
  }, [desktopSidebarFrame])

  const desktopContentFrameStyle = useMemo<CSSProperties | undefined>(() => {
    if (!desktopSidebarFrame || typeof window === "undefined" || window.innerWidth < 1024) return undefined

    const contentWidth = desktopSidebarFrame.shellWidth - desktopSidebarFrame.width
    if (!Number.isFinite(contentWidth) || contentWidth <= 0) return undefined

    return {
      left: desktopSidebarFrame.left + desktopSidebarFrame.width,
      top: desktopSidebarFrame.top,
      width: contentWidth,
      height: desktopSidebarFrame.height,
    }
  }, [desktopSidebarFrame])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(10,74,191,0.08),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_100%)]">
      <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div
          ref={shellSurfaceRef}
          className="relative"
        >
          <aside className="hidden lg:block">
            <div
              className={cn(
                "fixed z-30 hidden overflow-hidden rounded-l-[34px] border border-stone-200 border-r-[#d6e1f6] bg-[#edf4ff] shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-[top,left,width,height,opacity] duration-200 ease-out motion-reduce:transition-none lg:flex lg:flex-col",
                desktopSidebarFrame ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={desktopSidebarStyle}
            >
              <div className="flex h-full flex-col gap-3 px-3 py-4">
                <div className="space-y-2.5">
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-1 text-sm text-[#5f7698] transition-colors hover:text-[#1b75bc]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {backLabel}
                  </Link>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5f7698]">{moduleLabel}</p>
                    <p className="text-xl font-semibold leading-tight text-[#1b75bc]">{moduleTitle}</p>
                  </div>
                </div>

                <nav className="flex-1 space-y-2">
                  {navGroups.map((group) => (
                    <div key={group.key} className="space-y-1">
                      {group.label ? (
                        <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f86a6]">
                          {group.label}
                        </p>
                      ) : null}
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
                          <DesktopNavItem key={item.key} item={item} onSelect={onNavSelect} />
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          <div className="min-h-[calc(100vh-6rem)] w-full overflow-x-hidden">
            <div
              className={cn(
                "min-w-0 overflow-hidden rounded-[34px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none lg:fixed lg:z-20 lg:flex lg:min-h-0 lg:flex-col lg:rounded-l-none lg:border-l-0",
                surfaceClassName,
              )}
              style={desktopContentFrameStyle}
            >
              <div className="border-b border-stone-200 bg-white px-4 py-4 sm:px-6 sm:py-5 lg:shrink-0 lg:px-5 lg:py-4 xl:px-6 xl:py-5">
                {resolvedItems.length > 0 ? (
                  <div className="mb-4 lg:hidden">
                    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                      <SheetTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto w-full justify-between rounded-2xl border-[#d6e1f6] bg-[#f8fbff] px-4 py-3 text-left text-slate-700 hover:bg-[#edf4ff]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {ActiveIcon ? <ActiveIcon className="h-4 w-4 shrink-0 text-[#0a4abf]" /> : null}
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f7698]">
                                {moduleTitle}
                              </p>
                              <p className="truncate text-sm font-medium text-slate-900">
                                {activeItem?.mobileLabel || activeItem?.label || pageTitle}
                              </p>
                            </div>
                          </div>
                          <Menu className="h-4 w-4 shrink-0 text-slate-500" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-[#d6e1f6] bg-[#edf4ff] p-0">
                        <SheetHeader className="border-b border-[#d6e1f6] px-5 py-5 text-left">
                          <SheetTitle className="text-xl text-[#1b75bc]">{moduleTitle}</SheetTitle>
                          <SheetDescription className="text-sm leading-6 text-[#5f7698]">
                            {moduleDescription}
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 px-4 py-4">
                          {navGroups.map((group) => (
                            <div key={group.key} className="space-y-2">
                              {group.label ? (
                                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f86a6]">
                                  {group.label}
                                </p>
                              ) : null}
                              <div className="space-y-1">
                                {group.items.map((item) => (
                                  <MobileNavItem
                                    key={item.key}
                                    item={item}
                                    close={() => setMobileNavOpen(false)}
                                    onSelect={onNavSelect}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-500">{pageLabel}</p>
                    <h1 className="mt-1 break-words text-2xl font-semibold text-slate-950 sm:text-3xl">{pageTitle}</h1>
                    {pageDescription ? (
                      <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500 sm:text-base">
                        {pageDescription}
                      </p>
                    ) : null}
                    {visibleHeaderBadges.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {visibleHeaderBadges.map((badge) => (
                          <Badge
                            key={`${badge.label}-${badge.tone || "neutral"}`}
                            variant="outline"
                            className={badgeToneClasses(badge.tone)}
                          >
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {moduleExportData ? (
                      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" className="gap-2">
                            <Share2 className="h-4 w-4" />
                            Compartir
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Exportar datos del módulo</DialogTitle>
                            <DialogDescription>
                              Descarga metadatos y documentos para migrar la información de {moduleExportData.module.label}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 text-sm">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <p className="font-semibold text-slate-800">{moduleExportData.module.moduleTitle}</p>
                              <p className="text-slate-600">{moduleExportData.module.route}</p>
                              <p className="mt-1 text-slate-600">
                                Llaves detectadas: {moduleExportData.keys.length} · Documentos: {moduleExportData.files.length}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                className="gap-2"
                                onClick={() =>
                                  downloadAsJson(
                                    `${moduleExportData.module.id}-metadata-${Date.now()}.json`,
                                    moduleExportData,
                                  )
                                }
                              >
                                <FileJson className="h-4 w-4" />
                                Descargar metadatos (JSON)
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="gap-2"
                                disabled={moduleExportData.files.length === 0}
                                onClick={handleDownloadDocuments}
                              >
                                <FileArchive className="h-4 w-4" />
                                Descargar documentos
                              </Button>
                            </div>
                            {moduleExportData.files.length > 0 ? (
                              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                {moduleExportData.files.map((file, index) => {
                                  const canPreview = canPreviewExportStoredFile(file)

                                  return (
                                    <div
                                      key={file.id || `${file.name}-${index}`}
                                      className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <div className="min-w-0">
                                        <p className="break-words text-sm font-semibold text-slate-800">
                                          {file.name || `Documento ${index + 1}`}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                          {file.category || "documento"} · {file.type || "archivo"}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 flex-wrap gap-1.5">
                                        {canPreview ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5"
                                            onClick={() => setPreviewExportFile(file)}
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            Observar
                                          </Button>
                                        ) : null}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 gap-1.5"
                                          onClick={() => handleDownloadDocument(file, index)}
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          Descargar
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : null}
                            <p className="text-xs text-slate-500">
                              Nota: los documentos se descargan de forma individual con su nombre original.
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                    {actions}
                  </div>
                </div>
              </div>

              <div className={cn("p-4 sm:p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-5 xl:p-6", contentClassName)}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FilePreviewDialog
        file={previewExportFile}
        open={Boolean(previewExportFile)}
        onOpenChange={(open) => {
          if (!open) setPreviewExportFile(null)
        }}
      />
    </div>
  )
}

export function ArcoModuleShell(props: ArcoModuleShellProps) {
  return <ModuleWorkspaceShell {...props} />
}
