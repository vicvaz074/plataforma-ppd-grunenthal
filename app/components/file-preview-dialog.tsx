"use client"

import * as React from "react"
import { Download, ExternalLink, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buildFilePreviewDescriptor } from "@/lib/file-preview"
import type { StoredFile } from "@/lib/fileStorage"

type FilePreviewDialogProps = {
  file: StoredFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewLoadState = {
  status: "idle" | "loading" | "ready" | "error"
  message?: string
}

function PdfCanvasPreview({ src, title }: { src: string; title: string }) {
  const pagesRef = React.useRef<HTMLDivElement | null>(null)
  const renderTokenRef = React.useRef(0)
  const [state, setState] = React.useState<PreviewLoadState>({ status: "idle" })

  React.useEffect(() => {
    const host = pagesRef.current
    if (!host) return
    const hostElement = host

    let cancelled = false
    let loadingTask: { promise: Promise<any>; destroy?: () => Promise<void> } | null = null
    const renderToken = renderTokenRef.current + 1
    renderTokenRef.current = renderToken
    host.innerHTML = ""
    setState({ status: "loading" })

    async function renderPdf() {
      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString()

        loadingTask = pdfjs.getDocument({ url: src })
        const pdf = await loadingTask.promise
        if (cancelled || renderTokenRef.current !== renderToken) return

        const hostWidth = Math.max(300, Math.min(782, hostElement.clientWidth || 736))

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || renderTokenRef.current !== renderToken) return

          const page = await pdf.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = Math.max(0.45, Math.min(1.6, (hostWidth - 32) / baseViewport.width))
          const viewport = page.getViewport({ scale })
          const outputScale = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")

          if (!context) throw new Error("No se pudo crear el lienzo de vista previa.")

          canvas.width = Math.floor(viewport.width * outputScale)
          canvas.height = Math.floor(viewport.height * outputScale)
          canvas.style.width = `${Math.floor(viewport.width)}px`
          canvas.style.height = `${Math.floor(viewport.height)}px`
          canvas.className = "max-w-full rounded-sm bg-white shadow-sm"

          const pageShell = document.createElement("div")
          pageShell.className = "flex justify-center border-b border-slate-200/80 bg-slate-100/70 p-3 last:border-b-0 sm:p-5"
          pageShell.setAttribute("aria-label", `${title}, página ${pageNumber}`)
          pageShell.appendChild(canvas)
          hostElement.appendChild(pageShell)

          await page.render({
            canvasContext: context,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          }).promise
        }

        if (!cancelled && renderTokenRef.current === renderToken) {
          setState({ status: "ready" })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "No se pudo renderizar el PDF.",
          })
        }
      }
    }

    renderPdf()

    return () => {
      cancelled = true
      loadingTask?.destroy?.().catch(() => undefined)
    }
  }, [src, title])

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-muted/20 shadow-inner">
      {state.status === "loading" ? (
        <div className="absolute inset-x-0 top-0 z-10 border-b bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground">
          Preparando vista previa...
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">No se pudo renderizar el PDF.</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{state.message}</p>
        </div>
      ) : (
        <div ref={pagesRef} className="min-h-[340px] bg-slate-100 px-2 py-3" />
      )}
    </div>
  )
}

function TextPreview({ src }: { src: string }) {
  const [state, setState] = React.useState<PreviewLoadState>({ status: "idle" })
  const [content, setContent] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    setState({ status: "loading" })
    setContent("")

    fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo leer el contenido.")
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        setContent(text)
        setState({ status: "ready" })
      })
      .catch((error) => {
        if (cancelled) return
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar la vista previa.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
        Preparando vista previa...
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">No se pudo abrir este documento.</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{state.message}</p>
      </div>
    )
  }

  return (
    <pre className="min-h-[360px] whitespace-pre-wrap break-words rounded-md border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
      {content || "Sin contenido visible."}
    </pre>
  )
}

export function FilePreviewDialog({ file, open, onOpenChange }: FilePreviewDialogProps) {
  const descriptor = React.useMemo(() => {
    if (!file) return null

    try {
      return { value: buildFilePreviewDescriptor(file), error: null }
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : "No se pudo preparar el visor.",
      }
    }
  }, [file])

  const preview = descriptor?.value
  const error = descriptor?.error

  const openInNewTab = () => {
    if (!preview) return
    window.open(preview.previewUrl, "_blank", "noopener,noreferrer")
  }

  const saveCopy = () => {
    if (!preview) return

    const link = document.createElement("a")
    link.href = preview.fileUrl
    link.download = preview.downloadName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const previewSurface = () => {
    if (error) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">No se pudo abrir este documento.</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
      )
    }

    if (!preview?.canEmbed) {
      return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Vista previa no disponible para este formato.</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            El archivo queda accesible desde esta ventana y puede abrirse en una pestaña nueva.
          </p>
        </div>
      )
    }

    if (preview.previewKind === "image") {
      return (
        <div className="flex min-h-[360px] items-center justify-center rounded-md border bg-background p-4">
          <img
            src={preview.previewUrl}
            alt={preview.title}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )
    }

    if (preview.previewKind === "pdf") {
      return <PdfCanvasPreview src={preview.previewUrl} title={preview.title} />
    }

    if (preview.previewKind === "text" || preview.previewKind === "html") {
      return <TextPreview src={preview.previewUrl} />
    }

    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Vista previa no disponible para este formato.</p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[86vh] !w-[min(944px,calc(100vw_-_2rem))] !max-w-[944px] flex-col gap-0 overflow-hidden rounded-[24px] border-slate-200 p-0 shadow-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            {preview && <Badge variant="secondary">{preview.extension}</Badge>}
            {file?.category && <Badge variant="outline">{file.category}</Badge>}
          </div>
          <DialogTitle className="leading-snug">{preview?.title || file?.name || "Documento"}</DialogTitle>
          <DialogDescription>
            {preview?.sourceLabel || "Documento disponible en la biblioteca del módulo."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4 sm:px-5">
          {previewSurface()}
        </div>

        {preview && (
          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:space-x-0">
            <Button type="button" variant="outline" onClick={saveCopy}>
              <Download className="mr-2 h-4 w-4" />
              Guardar copia
            </Button>
            <Button type="button" onClick={openInNewTab}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir vista previa
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
