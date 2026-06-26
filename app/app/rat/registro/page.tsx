"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SafeLink } from "@/components/SafeLink"
import {
  ChevronLeft,
  Eye,
  FilePlus,
  FileText,
  FileSpreadsheet,
  FilePenLine,
  Home,
} from "lucide-react"
import { InventoryForm } from "../components/inventory-form"
import { InventoryList } from "../components/inventory-list"
import type { Inventory } from "../types"
import { parseRatExcel } from "../utils/parseRatExcel"
import { createInventoryFromRatImport } from "../utils/rat-import"
import {
  createDefaultInventory,
  normalizeInventoryForForm,
} from "../utils/inventory-normalization"

const defaultInventory = (): Inventory => createDefaultInventory()

export default function RegistroPage() {
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [mode, setMode] = useState<"menu" | "view" | "create" | "new">("menu")
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Inventory>(defaultInventory())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setModeBase = setMode as React.Dispatch<
    React.SetStateAction<"menu" | "view" | "create">
  >
  const [hasSavedProgress, setHasSavedProgress] = useState(false)
  const [inventoriesLoaded, setInventoriesLoaded] = useState(false)

  // --- CARGA DE LOCALSTORAGE CON SANITIZACIÓN ---
  useEffect(() => {
    const saved = localStorage.getItem("inventories")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Inventory[]

        const safeParsed = parsed.map(normalizeInventoryForForm)

        setInventories(safeParsed)
      } catch {
        localStorage.removeItem("inventories")
      }
    }
    setInventoriesLoaded(true)
  }, [])

  useEffect(() => {
    if (!inventoriesLoaded) return
    localStorage.setItem("inventories", JSON.stringify(inventories))
  }, [inventories, inventoriesLoaded])

  useEffect(() => {
    if (typeof window === "undefined") return
    const updateProgressFlag = () => {
      setHasSavedProgress(Boolean(localStorage.getItem("inventories_progress")))
    }
    updateProgressFlag()
    window.addEventListener("inventory-progress-saved", updateProgressFlag)
    window.addEventListener("storage", updateProgressFlag)
    return () => {
      window.removeEventListener("inventory-progress-saved", updateProgressFlag)
      window.removeEventListener("storage", updateProgressFlag)
    }
  }, [])

  const resetForm = () => {
    setFormData(defaultInventory())
    setEditingInventoryId(null)
  }

  const handleCreateNew = () => {
    resetForm()
    setMode("create")
  }

  const handleAutomaticClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const parsed = await parseRatExcel(file)
      if (parsed.length === 0) throw new Error("No se encontraron bases de datos")
      setFormData(createInventoryFromRatImport(parsed))
      setEditingInventoryId(null)
      setMode("create")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Archivo no compatible"
      window.alert(`No se pudo importar el inventario. ${message}`)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleContinueSavedInventory = () => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem("inventories_progress")
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Inventory
      const normalized = normalizeInventoryForForm(parsed)
      setFormData(normalized)
      setEditingInventoryId(
        inventories.some((inventory) => inventory.id === normalized.id)
          ? normalized.id
          : null,
      )
      setMode("create")
    } catch {
      // Si hay un error al parsear, limpiar el progreso guardado
      localStorage.removeItem("inventories_progress")
      setHasSavedProgress(false)
    }
  }

  return (
    <motion.div
      className="container mx-auto p-4 max-w-5xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <SafeLink href="/">
              <Home className="h-4 w-4" />
            </SafeLink>
          </Button>
        </div>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold">Inventarios de Datos Personales</h1>
          <p className="text-muted-foreground mt-1">
            Gestione sus inventarios de datos personales.
          </p>
        </div>
        {/* Spacer to balance navigation buttons and center the title */}
        <div className="flex gap-2 invisible">
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm"><Home className="h-4 w-4" /></Button>
        </div>
      </div>

      {mode === "menu" && (
        <div className="grid gap-6 sm:grid-cols-2 mt-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setMode("new")}
          >
            <CardContent className="flex flex-col items-center justify-center h-40 text-center">
              <FilePlus className="h-10 w-10 mb-3 text-primary" />
              <span className="text-xl font-semibold">Registrar inventarios</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setMode("view")}
          >
            <CardContent className="flex flex-col items-center justify-center h-40 text-center">
              <Eye className="h-10 w-10 mb-3 text-primary" />
              <span className="text-xl font-semibold">Ver y/o editar inventarios existentes</span>
            </CardContent>
          </Card>
          {hasSavedProgress && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow sm:col-span-2"
              onClick={handleContinueSavedInventory}
            >
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <FilePenLine className="h-10 w-10 mb-3 text-primary" />
                <span className="text-xl font-semibold">Continuar inventario en progreso</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {mode !== "menu" && (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" onClick={() => setMode("menu")}>Volver al menú</Button>
        </div>
      )}

      {mode === "new" && (
        <div className="grid gap-6 sm:grid-cols-2 mt-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleCreateNew}
          >
            <CardContent className="flex flex-col items-center justify-center h-40 text-center">
              <FileText className="h-10 w-10 mb-3 text-primary" />
              <span className="text-xl font-semibold">Registro manual</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleAutomaticClick}
          >
            <CardContent className="flex flex-col items-center justify-center h-40 text-center">
              <FileSpreadsheet className="h-10 w-10 mb-3 text-primary" />
              <span className="text-xl font-semibold">
                Extracción automática Excel/CSV
              </span>
            </CardContent>
          </Card>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileImport}
          />
          <div className="sm:col-span-2 text-center mt-4 text-sm">
            <a
              href="/templates/rat-template.xlsx"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar plantilla
            </a>
          </div>
          {hasSavedProgress && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow sm:col-span-2"
              onClick={handleContinueSavedInventory}
            >
              <CardContent className="flex flex-col items-center justify-center h-40 text-center">
                <FilePenLine className="h-10 w-10 mb-3 text-primary" />
                <span className="text-xl font-semibold">Continuar inventario en progreso</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {mode === "view" && (
        <InventoryList
          inventories={inventories}
          setFormData={setFormData}
          setEditingInventoryId={setEditingInventoryId}
          setMode={setModeBase}
          setInventories={setInventories}
        />
      )}

      {mode === "create" && (
        <InventoryForm
          formData={formData}
          setFormData={setFormData}
          editingInventoryId={editingInventoryId}
          setEditingInventoryId={setEditingInventoryId}
          setInventories={setInventories}
          setMode={setModeBase}
          resetForm={resetForm}
          inventories={inventories}
          showInitialButtons={false}
          onProgressSaved={() => setHasSavedProgress(true)}
        />
      )}
    </motion.div>
  )
}
