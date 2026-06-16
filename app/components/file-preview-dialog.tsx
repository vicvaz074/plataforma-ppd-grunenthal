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
    window.open(preview.fileUrl, "_blank", "noopener,noreferrer")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            {preview && <Badge variant="secondary">{preview.extension}</Badge>}
            {file?.category && <Badge variant="outline">{file.category}</Badge>}
          </div>
          <DialogTitle className="leading-snug">{preview?.title || file?.name || "Documento"}</DialogTitle>
          <DialogDescription>
            {preview?.sourceLabel || "Documento disponible en la biblioteca del módulo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          {error ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">No se pudo abrir este documento.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
          ) : preview?.canEmbed ? (
            <div className="overflow-hidden rounded-md border bg-muted/20">
              {preview.kind === "image" ? (
                <div className="flex h-[70vh] min-h-[420px] items-center justify-center bg-background p-4">
                  <img
                    src={preview.previewUrl}
                    alt={preview.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={preview.previewUrl}
                  title={preview.title}
                  className="h-[70vh] min-h-[420px] w-full bg-background"
                />
              )}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border bg-muted/30 p-8 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Vista previa no disponible para este formato.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                El archivo queda accesible desde esta ventana y puede abrirse en una pestaña nueva.
              </p>
            </div>
          )}

          {preview && (
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button type="button" variant="outline" onClick={saveCopy}>
                <Download className="mr-2 h-4 w-4" />
                Guardar copia
              </Button>
              <Button type="button" onClick={openInNewTab}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir en pestaña
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
