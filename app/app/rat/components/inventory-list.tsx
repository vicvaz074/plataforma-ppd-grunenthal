"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import type { Inventory, SubInventory } from "../types"
import { createFileURL, getAllFiles, getFileById } from "@/lib/fileStorage"
import {
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Home,
  ChevronLeft,
  FilePenLine,
  Download,
  Upload,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SafeLink } from "@/components/SafeLink"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { generateInventoryPDF } from "../utils/inventory-pdf"
import { Input } from "@/components/ui/input"

interface InventoryListProps {
  inventories: Inventory[]
  setFormData: React.Dispatch<React.SetStateAction<Inventory>>
  setEditingInventoryId: React.Dispatch<React.SetStateAction<string | null>>
  setMode: React.Dispatch<React.SetStateAction<"menu" | "view" | "create">>
  setInventories: React.Dispatch<React.SetStateAction<Inventory[]>>
}

export function InventoryList({
  inventories,
  setFormData,
  setEditingInventoryId,
  setMode,
  setInventories,
}: InventoryListProps) {
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<"general" | "datos" | "documentos">("general")
  const { toast } = useToast()
  const [expandedInventoryId, setExpandedInventoryId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sortedInventories = useMemo(
    () => [...inventories].sort((a, b) => a.databaseName.localeCompare(b.databaseName)),
    [inventories]
  )

  const getResponsibleAreas = useCallback(
    (inv: Inventory) =>
      Array.from(
        new Set(
          inv.subInventories
            .map((si) => si.responsibleArea)
            .filter((area): area is string => Boolean(area && area.trim()))
        )
      ).sort(),
    []
  )

  const getHolderTypes = useCallback((inv: Inventory) => {
    const holderNames = inv.subInventories.flatMap((si) => {
      if (!Array.isArray(si.holderTypes)) {
        return [] as string[]
      }

      return si.holderTypes.map((raw) => {
        if (!raw) return ""

        const value = raw.toString().trim()
        if (!value) return ""

        if (value.toLowerCase() === "otro") {
          const custom = si.otherHolderType?.toString().trim()
          return custom || "Otro"
        }

        return value
      })
    })

    const uniqueNames = Array.from(
      new Map(
        holderNames
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values()
    )

    return uniqueNames.sort((a, b) => a.localeCompare(b))
  }, [])

  const getPrivacyNoticeEntries = useCallback((sub: SubInventory) => {
    const names = Array.isArray(sub.privacyNoticeFileNames)
      ? sub.privacyNoticeFileNames
      : typeof sub.privacyNoticeFileName === "string" && sub.privacyNoticeFileName.trim().length > 0
        ? sub.privacyNoticeFileName
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        : []

    const ids = Array.isArray(sub.privacyNoticeFileIds)
      ? sub.privacyNoticeFileIds
      : sub.privacyNoticeFileId
        ? [sub.privacyNoticeFileId]
        : []

    const files = Array.isArray(sub.privacyNoticeFiles)
      ? sub.privacyNoticeFiles
      : sub.privacyNoticeFile
        ? [sub.privacyNoticeFile]
        : []

    const maxLength = Math.max(names.length, ids.length, files.length)
    if (maxLength === 0) {
      return [] as { id: string; name: string }[]
    }

    return Array.from({ length: maxLength }).map((_, index) => {
      const fallbackName =
        names[index] || files[index]?.name || names[0] || files[0]?.name || `Aviso ${index + 1}`
      const identifier = ids[index] || ids[0] || files[index]?.name || files[0]?.name || ""

      return {
        id: identifier,
        name: fallbackName,
      }
    })
  }, [])

  const getInventoryStatus = (inv: Inventory) => inv.status || "pendiente"

  const filteredInventories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return sortedInventories
    }

    return sortedInventories.filter((inv) => {
      const areaText = getResponsibleAreas(inv).join(" ").toLowerCase()
      const holderText = getHolderTypes(inv).join(" ").toLowerCase()
      const subInventoryNames = inv.subInventories
        .map((si) => si.databaseName)
        .join(" ")
        .toLowerCase()

      return [
        inv.databaseName.toLowerCase(),
        areaText,
        holderText,
        subInventoryNames,
        getInventoryStatus(inv).toLowerCase(),
      ].some((value) => value.includes(term))
    })
  }, [getHolderTypes, getResponsibleAreas, searchTerm, sortedInventories])

  const handleEdit = (inventory: Inventory) => {
    setFormData(inventory)
    setEditingInventoryId(inventory.id)
    setMode("create")
  }

  const handleDelete = (id: string) => {
    const updated = inventories.filter(inv => inv.id !== id)
    setInventories(updated)
    localStorage.setItem("inventories", JSON.stringify(updated))
    toast({ title: "Inventario eliminado", description: "El inventario ha sido eliminado correctamente." })
  }

  const handleViewDetails = (inventory: Inventory) => {
    setSelectedInventory(inventory)
    setIsDialogOpen(true)
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "bajo": return "bg-green-100 text-green-800"
      case "medio": return "bg-yellow-100 text-yellow-800"
      case "alto": return "bg-orange-100 text-orange-800"
      case "reforzado": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const openStoredFile = (fileIdentifier: string) => {
    if (!fileIdentifier) {
      toast({
        title: "Archivo no disponible",
        description: "No se encontró información del archivo seleccionado.",
        variant: "destructive",
      })
      return
    }

    const file =
      getFileById(fileIdentifier) ||
      getAllFiles().find((stored) => stored.name === fileIdentifier)

    if (!file) {
      toast({ title: "Error", description: "No se pudo abrir el archivo.", variant: "destructive" })
      return
    }
    const anchor = document.createElement("a")
    try {
      anchor.href = createFileURL(file.content)
      anchor.target = "_blank"
      anchor.rel = "noopener noreferrer"
      anchor.click()
    } catch {
      toast({ title: "Error", description: "El formato del archivo no es válido.", variant: "destructive" })
    }
  }

const generatePDF = (inventory: Inventory) => {
  try {
    const currentUserName =
      typeof window !== "undefined"
        ? localStorage.getItem("userName") || "Usuario actual"
        : "Usuario actual"
    generateInventoryPDF(inventory, { currentUserName })
    toast({
      title: "PDF generado",
      description: "El PDF ha sido generado correctamente.",
    })
  } catch (e) {
    console.error("Error al generar PDF de inventario", e)
    toast({
      title: "Error",
      description: "Ocurrió un error al generar el PDF.",
      variant: "destructive",
    })
  }
}

  const handleExport = () => {
    try {
      if (inventories.length === 0) {
        toast({
          title: "Sin inventarios",
          description: "No hay inventarios para exportar actualmente.",
        })
        return
      }

      const exportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        inventories,
      }

      const jsonString = JSON.stringify(
        exportPayload,
        (_key, value) => {
          if (typeof File !== "undefined" && value instanceof File) {
            return undefined
          }
          if (typeof Blob !== "undefined" && value instanceof Blob) {
            return undefined
          }
          return value
        },
        2
      )

      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const formattedDate = new Date().toISOString().replace(/[:.]/g, "-")
      link.href = url
      link.download = `inventarios-rat-${formattedDate}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Inventarios exportados",
        description: "El archivo con los inventarios se ha descargado correctamente.",
      })
    } catch (error) {
      console.error("Error al exportar inventarios", error)
      toast({
        title: "Error al exportar",
        description: "No se pudieron exportar los inventarios. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const text = reader.result
        if (typeof text !== "string") {
          throw new Error("Formato de archivo inválido")
        }

        const parsed = JSON.parse(text)
        const importedInventories: Inventory[] | undefined = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.inventories)
          ? parsed.inventories
          : undefined

        if (!importedInventories || importedInventories.length === 0) {
          toast({
            title: "Sin datos",
            description: "El archivo seleccionado no contiene inventarios válidos.",
            variant: "destructive",
          })
          return
        }

        const validInventories = importedInventories.filter(inv => {
          return (
            inv &&
            typeof inv.id === "string" &&
            typeof inv.databaseName === "string" &&
            Array.isArray(inv.subInventories)
          )
        })

        if (validInventories.length === 0) {
          toast({
            title: "Importación inválida",
            description: "No se encontraron inventarios con el formato esperado.",
            variant: "destructive",
          })
          return
        }

        const now = new Date().toISOString()
        const normalizedInventories = validInventories.map(inv => ({
          ...inv,
          createdAt: inv.createdAt || now,
          updatedAt: inv.updatedAt || now,
        }))

        const inventoryMap = new Map<string, Inventory>()
        inventories.forEach(existing => {
          inventoryMap.set(existing.id, existing)
        })
        normalizedInventories.forEach(imported => {
          inventoryMap.set(imported.id, imported)
        })

        const mergedInventories = Array.from(inventoryMap.values())
        setInventories(mergedInventories)
        localStorage.setItem("inventories", JSON.stringify(mergedInventories))
        setExpandedInventoryId(null)

        toast({
          title: "Inventarios importados",
          description: "Los inventarios fueron cargados correctamente.",
        })
      } catch (error) {
        console.error("Error al importar inventarios", error)
        toast({
          title: "Error al importar",
          description: "No fue posible leer el archivo seleccionado.",
          variant: "destructive",
        })
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    reader.onerror = () => {
      console.error("Error leyendo archivo de inventarios", reader.error)
      toast({
        title: "Error al leer archivo",
        description: "Ocurrió un problema al leer el archivo seleccionado.",
        variant: "destructive",
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }

    reader.readAsText(file)
  }


  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setMode("menu")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <SafeLink href="/">
            <Home className="h-4 w-4" />
          </SafeLink>
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Inventarios registrados</h2>
              <p className="text-sm text-muted-foreground">
                Exporta tus inventarios para compartirlos y vuelve a cargarlos cuando lo necesites.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex items-center gap-2" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Descargar inventarios
              </Button>
              <Button className="flex items-center gap-2" onClick={handleImportClick}>
                <Upload className="h-4 w-4" />
                Cargar inventarios
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
          {inventories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay inventarios registrados.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar inventarios"
                    className="pl-9"
                    aria-label="Buscar inventarios"
                  />
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="align-top">Área responsable</TableHead>
                      <TableHead className="align-top">Titulares</TableHead>
                      <TableHead className="align-top">Nombre de inventario</TableHead>
                      <TableHead className="align-top">Subinventarios</TableHead>
                      <TableHead className="align-top">Fecha de creación</TableHead>
                      <TableHead className="align-top">Fecha de última edición</TableHead>
                      <TableHead className="align-top">Estatus</TableHead>
                      <TableHead className="align-top">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredInventories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No se encontraron inventarios que coincidan con la búsqueda.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredInventories.map((inv) => {
                    const holderNames = getHolderTypes(inv)

                    return (
                      <React.Fragment key={inv.id}>
                        <TableRow>
                          <TableCell className="align-top text-sm">
                          {getResponsibleAreas(inv).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="align-top text-xs sm:text-sm">
                          {holderNames.length > 0 ? (
                            <TooltipProvider delayDuration={150}>
                              <div className="flex flex-wrap gap-2">
                                {holderNames.map((name, index) => (
                                  <Tooltip key={`${inv.id}-holder-${index}`}>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="secondary"
                                        className="max-w-[200px] px-2 py-1 font-normal text-[0.7rem] sm:text-xs"
                                      >
                                        <span className="block max-w-[170px] truncate">{name}</span>
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs break-words">
                                      <p className="max-w-xs break-words">{name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            </TooltipProvider>
                          ) : (
                            <span>-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{inv.databaseName}</TableCell>
                        <TableCell>
                          {inv.subInventories.length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() =>
                                setExpandedInventoryId(
                                  expandedInventoryId === inv.id ? null : inv.id
                                )
                              }
                            >
                              Subinventarios ({inv.subInventories.length})
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  expandedInventoryId === inv.id && "rotate-180"
                                )}
                              />
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {inv.createdAt
                            ? new Date(inv.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {inv.updatedAt
                            ? new Date(inv.updatedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{getInventoryStatus(inv)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewDetails(inv)}
                              aria-label="Ver"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(inv)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {inv.status !== "completado" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleEdit(inv)}
                                      aria-label="Continuar"
                                    >
                                      <FilePenLine className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Continuar inventario</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => generatePDF(inv)}
                              aria-label="Generar PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Eliminar">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esto eliminará permanentemente "{inv.databaseName}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(inv.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedInventoryId === inv.id && (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <div className="flex flex-wrap gap-2 p-4">
                              {inv.subInventories.map(si => (
                                <Badge key={si.id} variant="secondary">
                                  {si.databaseName}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                    )
                  })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalles del inventario</DialogTitle>
            <DialogDescription>
              {selectedInventory?.databaseName}
            </DialogDescription>
          </DialogHeader>
          {selectedInventory && (
            <Tabs
              value={activeDetailTab}
              onValueChange={v => setActiveDetailTab(v as "general" | "datos" | "documentos")}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="general">Información general</TabsTrigger>
                <TabsTrigger value="datos">Datos personales</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Base de datos</h3>
                    <p>{selectedInventory.databaseName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Responsable</h3>
                    <p>{selectedInventory.responsible?.trim() || "No disponible"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Nivel de riesgo</h3>
                    <Badge className={getRiskBadgeColor(selectedInventory.riskLevel || "bajo")}>
                      {selectedInventory.riskLevel || "Bajo"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold">Fecha de creación</h3>
                    <p>{selectedInventory.createdAt ? new Date(selectedInventory.createdAt).toLocaleDateString() : "No disponible"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Fecha de última edición</h3>
                    <p>{selectedInventory.updatedAt ? new Date(selectedInventory.updatedAt).toLocaleDateString() : "No disponible"}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="datos">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sub-base</TableHead>
                        <TableHead>Datos personales</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Riesgo</TableHead>
                        <TableHead>Proporcionalidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInventory.subInventories.map(si =>
                        si.personalData.map(pd => (
                          <TableRow key={si.id + "_" + pd.id}>
                            <TableCell>{si.databaseName}</TableCell>
                            <TableCell>{pd.name}</TableCell>
                            <TableCell>{pd.category || "No especificada"}</TableCell>
                            <TableCell>
                              <Badge className={getRiskBadgeColor(pd.riesgo)}>{pd.riesgo}</Badge>
                            </TableCell>
                            <TableCell>{pd.proporcionalidad ? "Sí" : "No"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="documentos">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold">Aviso de Privacidad</h3>
                    {(() => {
                      const documents = selectedInventory.subInventories
                        .map((sub) => ({ sub, entries: getPrivacyNoticeEntries(sub) }))
                        .filter((item) => item.entries.length > 0)

                      if (documents.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            No hay avisos de privacidad cargados.
                          </p>
                        )
                      }

                      return (
                        <div className="mt-2 space-y-3">
                          {documents.map(({ sub, entries }) => (
                            <div
                              key={`privacy-${sub.id}`}
                              className="rounded-md border border-muted-foreground/40 bg-muted/20 p-3"
                            >
                              <p className="text-sm font-medium">{sub.databaseName}</p>
                              <ul className="mt-2 space-y-2 text-xs sm:text-sm">
                                {entries.map((entry, index) => (
                                  <li
                                    key={`${sub.id}-privacy-${index}`}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="flex-1 break-words" title={entry.name}>
                                      {entry.name}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => entry.id && openStoredFile(entry.id)}
                                      disabled={!entry.id}
                                    >
                                      Ver
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <div>
                    <h3 className="font-semibold">Consentimiento</h3>
                    {(() => {
                      const consentDocs = selectedInventory.subInventories.filter(
                        (sub) => sub.consentFile || sub.consentFileId
                      )

                      if (consentDocs.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Sin archivos de consentimiento cargados.
                          </p>
                        )
                      }

                      return (
                        <div className="mt-2 space-y-2">
                          {consentDocs.map((sub) => (
                            <div
                              key={`consent-${sub.id}`}
                              className="flex flex-wrap items-center gap-2 rounded-md border border-muted-foreground/40 bg-muted/20 px-3 py-2 text-xs sm:text-sm"
                            >
                              <span className="font-medium">{sub.databaseName}</span>
                              <span className="flex-1 break-words">
                                {sub.consentFileName || sub.consentFile?.name || "Archivo de consentimiento"}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => sub.consentFileId && openStoredFile(sub.consentFileId)}
                                disabled={!sub.consentFileId}
                              >
                                Ver
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <div>
                    <h3 className="font-semibold">Consentimiento Transferencia</h3>
                    {(() => {
                      const transferDocs = selectedInventory.subInventories.filter(
                        (sub) => sub.transferConsentFile || sub.transferConsentFileId
                      )

                      if (transferDocs.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Sin archivos de consentimiento para transferencia.
                          </p>
                        )
                      }

                      return (
                        <div className="mt-2 space-y-2">
                          {transferDocs.map((sub) => (
                            <div
                              key={`transfer-${sub.id}`}
                              className="flex flex-wrap items-center gap-2 rounded-md border border-muted-foreground/40 bg-muted/20 px-3 py-2 text-xs sm:text-sm"
                            >
                              <span className="font-medium">{sub.databaseName}</span>
                              <span className="flex-1 break-words">
                                {sub.transferConsentFileName ||
                                  sub.transferConsentFile?.name ||
                                  "Archivo de consentimiento"}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  sub.transferConsentFileId && openStoredFile(sub.transferConsentFileId)
                                }
                                disabled={!sub.transferConsentFileId}
                              >
                                Ver
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <div>
                    <h3 className="font-semibold">Evidencia Remisión</h3>
                    {(() => {
                      const remissionDocs = selectedInventory.subInventories.filter(
                        (sub) => sub.remissionContractFile || sub.remissionContractFileId
                      )

                      if (remissionDocs.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Sin evidencias de remisión cargadas.
                          </p>
                        )
                      }

                      return (
                        <div className="mt-2 space-y-2">
                          {remissionDocs.map((sub) => (
                            <div
                              key={`remission-${sub.id}`}
                              className="flex flex-wrap items-center gap-2 rounded-md border border-muted-foreground/40 bg-muted/20 px-3 py-2 text-xs sm:text-sm"
                            >
                              <span className="font-medium">{sub.databaseName}</span>
                              <span className="flex-1 break-words">
                                {sub.remissionContractFileName ||
                                  sub.remissionContractFile?.name ||
                                  "Evidencia de remisión"}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  sub.remissionContractFileId && openStoredFile(sub.remissionContractFileId)
                                }
                                disabled={!sub.remissionContractFileId}
                              >
                                Ver
                              </Button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
