"use client"
import { useState, useEffect, useMemo, FormEvent } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Copy,
  Download,
  Eye,
  FileText,
  Shield,
  Search,
  Upload,
  Edit,
  Trash2,
  FilePlus,
  Layers,
  ListChecks,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FilePreviewDialog } from "@/components/file-preview-dialog"
import {
  deleteFile,
  getFilesByCategory,
  saveFile,
  getFileById,
  createFileURL,
  type StoredFile,
} from "@/lib/fileStorage"
import { canOfferFilePreview } from "@/lib/file-preview"
import { ArcoModuleShell } from "@/components/arco-module-shell"
import {
  THIRD_PARTY_CONTRACTS_META,
  THIRD_PARTY_CONTRACTS_NAV,
} from "@/components/arco-module-config"
import { SafeLink } from "@/components/SafeLink"
import type { ContractMeta } from "../types"

type LibraryDocument = {
  id: string
  title: string
  description: string
  type: string
  tags: string[]
  category: string
  content?: string
  downloadUrl?: string
}

type DocumentResource = LibraryDocument & {
  source: "library" | "custom"
  uploadedAt?: string
  metadata?: Record<string, unknown>
  storageId?: string
}

type ModelClause = {
  id: string
  title: string
  category: string
  text: string
  isCustom?: boolean
}

type TemplateRepositoryItem = {
  id: string
  title: string
  description: string
  usage: string
  placeholders: string[]
  assetId?: string
  baseTemplate?: string
  baseDownloadName?: string
  metadata: {
    tipo: string
    ambito: string
    riesgo: string
    categorias: string[]
    titulares: string[]
    baseJuridica: string[]
    garantias?: string[]
    owner: string
    aprobadores: string[]
    ultimaRevision: string
    proximaRevision: string
  }
  notes?: string[]
}

const defaultUtilityDocuments: LibraryDocument[] = [
  {
    id: "doc1",
    title: "Guía práctica para contratos con encargados",
    description:
      "Resumen accionable de las obligaciones clave que debe incluir un contrato con encargados y subencargados del tratamiento.",
    type: "pdf",
    category: "Guías operativas",
    tags: ["Encargados", "Requisitos mínimos", "Supervisión"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc2",
    title: "Checklist de verificación de contratos",
    description:
      "Lista de verificación para revisar cláusulas críticas antes de aprobar o renovar un contrato con terceros.",
    type: "xlsx",
    category: "Herramientas de control",
    tags: ["Checklist", "Auditoría", "Seguimiento"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc3",
    title: "Modelo de acuerdo de tratamiento de datos (DPA)",
    description:
      "Plantilla base alineada con el RGPD para formalizar las obligaciones del encargado y del responsable del tratamiento.",
    type: "docx",
    category: "Modelos oficiales",
    tags: ["DPA", "RGPD", "Obligaciones"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc4",
    title: "Plantilla de evaluación de riesgo de terceros",
    description:
      "Formato para documentar el análisis de riesgos y las medidas compensatorias acordadas con el proveedor.",
    type: "xlsx",
    category: "Gestión de riesgos",
    tags: ["Evaluación", "Clasificación", "Mitigación"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc5",
    title: "Cláusulas contractuales tipo (SCC) 2021",
    description:
      "Extracto comentado de las SCC publicadas por la Comisión Europea para transferencias internacionales.",
    type: "pdf",
    category: "Transferencias internacionales",
    tags: ["SCC", "EEA", "Transferencias"],
    content: "/placeholder.svg?height=400&width=300",
  },
  {
    id: "doc6",
    title: "Guía rápida para homologar proveedores",
    description:
      "Pasos sugeridos y criterios mínimos para homologar a un nuevo proveedor antes de firmar un contrato.",
    type: "pdf",
    category: "Onboarding de proveedores",
    tags: ["Homologación", "Due diligence", "Evaluación inicial"],
    content: "/placeholder.svg?height=400&width=300",
  },
]

const defaultModelClauses: ModelClause[] = [
  {
    id: "clause-remision",
    title: "Cláusula modelo de remisión (encargados)",
    category: "Remisión",
    text: `{RAZON_SOCIAL_RESPONSABLE} (el "Responsable") encomienda a {RAZON_SOCIAL_ENCARGADO} (el "Encargado") el tratamiento de datos personales identificados como {CATEGORIAS_DATOS} exclusivamente para {FINALIDADES}. El Encargado operará dentro de los sistemas {SISTEMAS_INVOLUCRADOS} y aplicará las medidas descritas en {REFERENCIA_DOCUMENTO}.

El Encargado garantizará la confidencialidad, limitará accesos, gestionará subencargados con autorización previa del Responsable e impondrá obligaciones equivalentes. Reportará incidentes de seguridad a {CONTACTO_INCIDENTES} en un plazo máximo de 24 horas y devolverá o suprimirá los datos conforme al plazo {PLAZO_BLOQUEO}.`,
  },
  {
    id: "clause-transferencia",
    title: "Cláusula modelo de transferencia (responsable a responsable)",
    category: "Transferencias",
    text: `{RAZON_SOCIAL_TRANSFERENTE} declara que los titulares fueron informados mediante el aviso disponible en {URL_AVISO} y otorgaron consentimiento {TIPO_CONSENTIMIENTO} para transferir los datos {CATEGORIAS_DATOS}. {RAZON_SOCIAL_RECEPTOR} utilizará la información para {FINALIDADES} y adoptará salvaguardas equivalentes, gestionará derechos ARCO a través de {CONTACTO_ARCO} y notificará incidentes a {CONTACTO_INCIDENTES}.`,
  },
  {
    id: "clause-aceptacion-aviso",
    title: "Cláusula de aceptación de aviso (personal interno)",
    category: "Aviso de privacidad",
    text: `{NOMBRE_EMPLEADO} reconoce haber recibido el aviso de privacidad publicado en {URL_AVISO} y se obliga a tratar los datos personales laborales únicamente para {FINALIDADES}. Mantendrá confidencialidad, reportará incidentes a {CONTACTO_INCIDENTES} y devolverá cualquier soporte con datos personales al concluir la relación laboral.`,
  },
  {
    id: "clause-representantes",
    title: "Cláusula para representantes legales",
    category: "Representación",
    text: `Las partes recabarán exclusivamente los datos de identificación y representación de {REPRESENTANTES_APLICABLES} necesarios para {FINALIDADES}. Se informará a los representantes mediante el aviso publicado en {URL_AVISO} y la conservación de los datos se limitará a {PLAZO_CONSERVACION} o al cumplimiento de obligaciones legales.`,
  },
  {
    id: "clause-no-tratamiento",
    title: "Cláusula de no tratamiento / datos anonimizados",
    category: "Anonimización",
    text: `Las partes reconocen que el servicio se presta con datos anonimizados o agregados. {PROVEEDOR} se obliga a mantener técnicas que impidan la reidentificación, a no combinar la información con otras fuentes que permitan identificar a los titulares y a documentar cualquier limitación en {BITACORA_REFERENCIA}.`,
  },
]

const templateRepository: TemplateRepositoryItem[] = [
  {
    id: "template-remision",
    title: "Contrato de Remisión (R→E)",
    description: "Base: \"Contrato Modelo de Remisión de Datos Personales (Responsable–Persona Encargada)\"",
    usage: "Utilizar cuando un proveedor trata datos personales por cuenta del responsable como encargado del tratamiento (DPA).",
    placeholders: [
      "{RAZON_SOCIAL_RESPONSABLE}",
      "{RAZON_SOCIAL_ENCARGADO}",
      "{OBJETO_SERVICIO}",
      "{SISTEMAS_INVOLUCRADOS}",
      "{FINALIDADES}",
      "{PLAZO_BLOQUEO}",
      "{CONTACTO_INCIDENTES}",
    ],
    assetId: "12d935e1-965f-4e94-99ce-cea9799",
    baseDownloadName: "Contrato_Remision_Modelo.txt",
    baseTemplate: `CONTRATO DE REMISIÓN DE DATOS PERSONALES\n\nENTRE: {RAZON_SOCIAL_RESPONSABLE}, en lo sucesivo el "Responsable", y {RAZON_SOCIAL_ENCARGADO}, en adelante el "Encargado".\n\n1. OBJETO. El Responsable encomienda al Encargado el tratamiento de datos personales estrictamente para {FINALIDADES} dentro del servicio {OBJETO_SERVICIO}.\n2. ALCANCE Y SISTEMAS. El tratamiento se realizará dentro de los sistemas y aplicaciones autorizados: {SISTEMAS_INVOLUCRADOS}.\n3. MEDIDAS DE SEGURIDAD. El Encargado aplicará medidas técnicas, administrativas y físicas alineadas al Documento de Seguridad vigente, permitirá auditorías y mantendrá una bitácora de cumplimiento.\n4. SUBENCARGADOS. El Encargado no contratará subencargados sin autorización previa y por escrito del Responsable, debiendo imponer obligaciones equivalentes.\n5. INCIDENTES. Cualquier vulneración o incidente de seguridad deberá notificarse al Responsable a través de {CONTACTO_INCIDENTES} dentro de las 24 horas siguientes a su detección.\n6. TERMINACIÓN. A la terminación del servicio, el Encargado bloqueará, devolverá o suprimirá los datos personales en un plazo máximo de {PLAZO_BLOQUEO} y entregará evidencia documental.\n7. VIGENCIA Y JURISDICCIÓN. Este contrato se mantendrá vigente mientras subsista la prestación del servicio y estará sujeto a las leyes aplicables.\n\nLas partes firman de conformidad.`,
    metadata: {
      tipo: "Remisión",
      ambito: "Nacional",
      riesgo: "medio",
      categorias: ["Identificativos", "Laborales", "Tecnológicos"],
      titulares: ["Empleados", "Proveedores"],
      baseJuridica: ["Relación contractual", "Obligación legal"],
      garantias: ["Contrato DPA", "Cláusulas de seguridad"],
      owner: "Jurídico / Cumplimiento",
      aprobadores: ["Legal", "DPO", "Seguridad"],
      ultimaRevision: "2024-10-01",
      proximaRevision: "2025-04-01",
    },
    notes: [
      "Incluye obligación de notificar incidentes ≤24h y autorización para subencargados",
      "Referenciar el Documento de Seguridad del encargado y mecanismos de supervisión",
    ],
  },
  {
    id: "template-transferencia",
    title: "Contrato de Transferencia (R→R)",
    description: "Base: \"Contrato Modelo de Transferencia de Datos Personales (Responsable–Responsable)\"",
    usage: "Aplica cuando se comunica información a otro responsable, como empresas del mismo grupo o aliados comerciales.",
    placeholders: [
      "{RAZON_SOCIAL_TRANSFERENTE}",
      "{RAZON_SOCIAL_RECEPTOR}",
      "{CATEGORIAS_DATOS}",
      "{TIPO_CONSENTIMIENTO}",
      "{FINALIDADES}",
      "{URL_AVISO}",
      "{PAIS_DESTINO}",
      "{CONTACTO_ARCO}",
      "{CONTACTO_INCIDENTES}",
    ],
    assetId: "286d088d-faa9-43e1-9182-afc94de",
    baseDownloadName: "Contrato_Transferencia_Modelo.txt",
    baseTemplate: `CONTRATO DE TRANSFERENCIA DE DATOS PERSONALES\n\nPARTES: {RAZON_SOCIAL_TRANSFERENTE} (el "Transferente") y {RAZON_SOCIAL_RECEPTOR} (el "Receptor").\n\n1. OBJETO. El Transferente autoriza la comunicación de los datos {CATEGORIAS_DATOS} para las finalidades consentidas {FINALIDADES}.\n2. CONSENTIMIENTO. Los titulares fueron informados mediante el aviso de privacidad disponible en {URL_AVISO} y otorgaron consentimiento {TIPO_CONSENTIMIENTO}.\n3. GARANTÍAS. El Receptor aplicará salvaguardas equivalentes, incluyendo cláusulas contractuales tipo, políticas internas y mecanismos de supervisión continua.\n4. DERECHOS ARCO. Las partes coordinarán la atención de solicitudes a través de {CONTACTO_ARCO} y compartirán las evidencias correspondientes.\n5. TRANSFERENCIA INTERNACIONAL. Cuando aplique, la transferencia se realizará hacia {PAIS_DESTINO} cumpliendo con las obligaciones establecidas por la autoridad competente.\n6. INCIDENTES. El Receptor notificará incidentes al Transferente y al {CONTACTO_INCIDENTES} en un plazo no mayor a 24 horas desde su detección.\n7. VIGENCIA. Este contrato permanecerá vigente hasta la finalización de las finalidades descritas o hasta que se revoque el consentimiento.\n\nFirmado por ambas partes en aceptación de obligaciones y responsabilidades.`,
    metadata: {
      tipo: "Transferencia",
      ambito: "Internacional",
      riesgo: "alto",
      categorias: ["Identificativos", "Financieros", "Salud"],
      titulares: ["Clientes", "Usuarios de app"],
      baseJuridica: ["Consentimiento", "Relación contractual"],
      garantias: ["SCCs", "BCRs", "Contrato DPA"],
      owner: "Dirección General",
      aprobadores: ["Legal", "DPO", "Seguridad"],
      ultimaRevision: "2024-11-15",
      proximaRevision: "2025-05-15",
    },
    notes: [
      "Documentar la base legal aplicable y las garantías complementarias",
      "Definir la coordinación para atender derechos ARCO y auditorías conjuntas",
    ],
  },
  {
    id: "template-apendices",
    title: "Apéndices y cláusulas modelo insertables",
    description: "Cláusulas reutilizables para anexar a contratos existentes según el tipo de relación.",
    usage: "Ideal para actualizar contratos vigentes con obligaciones de privacidad específicas sin rehacer el instrumento completo.",
    placeholders: [
      "{URL_AVISO}",
      "{FINALIDADES}",
      "{REPRESENTANTES_APLICABLES}",
      "{BITACORA_REFERENCIA}",
      "{CONTACTO_INCIDENTES}",
    ],
    assetId: "78a417dd-e10e-4564-a6fc-fc41963",
    baseDownloadName: "Paquete_Clausulas_Modelo.txt",
    baseTemplate: `PAQUETE DE CLÁUSULAS MODELO\n\nC.1 ENCARGADOS (REMISIÓN)\n- Seguridad y confidencialidad reforzada.\n- Autorización previa para subcontratación y obligación de equivalencia.\n- Procedimiento de devolución/supresión conforme a {FINALIDADES}.\n- Notificación de incidentes en ≤24h a {CONTACTO_INCIDENTES}.\n\nC.2 TRANSFERENCIAS (RESPONSABLE A RESPONSABLE)\n- Aviso de privacidad puesto a disposición en {URL_AVISO}.\n- Finalidades consentidas: {FINALIDADES}.\n- Obligaciones del transferente y receptor respecto a titulares.\n\nC.3 ACEPTACIÓN DE AVISO (LABORAL)\n- Reconocimiento por parte del colaborador.\n- Obligación de reportar incidentes y devolver soportes.\n\nC.4 REPRESENTANTES LEGALES\n- Categorías mínimas recabadas de {REPRESENTANTES_APLICABLES}.\n- Finalidades específicas y plazo de conservación alineado con {BITACORA_REFERENCIA}.\n\nC.5 NO TRATAMIENTO / DATOS ANONIMIZADOS\n- Uso exclusivo de datos anonimizados.\n- Prohibición de reidentificación y controles documentales en {BITACORA_REFERENCIA}.\n\nPersonaliza cada cláusula reemplazando las variables y adjunta el documento correspondiente al expediente del contrato.`,
    metadata: {
      tipo: "Cláusula",
      ambito: "Mixto",
      riesgo: "medio",
      categorias: ["Identificativos", "Laborales", "Tecnológicos"],
      titulares: ["Empleados", "Representantes", "Proveedores"],
      baseJuridica: ["Relación contractual", "Interés legítimo"],
      garantias: ["Políticas internas", "Protocolos de anonimización"],
      owner: "Cumplimiento",
      aprobadores: ["Legal", "DPO"],
      ultimaRevision: "2024-09-10",
      proximaRevision: "2025-03-10",
    },
    notes: [
      "C.1 Encargados (remisión): seguridad, confidencialidad, subcontratación, devolución/supresión, notificación 24h.",
      "C.2 Transferencias (R→R): aviso puesto a disposición, finalidades, obligaciones del transferente/receptor.",
      "C.3 Aceptación de aviso (laboral): reconocimiento y obligaciones del empleado.",
      "C.4 Representantes legales: categorías mínimas, fines y aviso informado.",
      "C.5 No tratamiento: uso de datos anonimizados y prohibición de reidentificación.",
    ],
  },
]

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const applyTemplateValues = (template: string, values: Record<string, string>) => {
  let result = template
  Object.entries(values).forEach(([placeholder, replacement]) => {
    if (!placeholder) return
    const safePlaceholder = escapeRegExp(placeholder)
    const regex = new RegExp(safePlaceholder, "g")
    result = result.replace(regex, replacement || placeholder)
  })
  return result
}

const triggerTextDownload = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function DocumentsAndClausesPage() {
  const { toast } = useToast()
  const [uploadedContracts, setUploadedContracts] = useState<StoredFile[]>([])
  const [templateFiles, setTemplateFiles] = useState<StoredFile[]>([])
  const [contractHistory, setContractHistory] = useState<ContractMeta[]>([])
  const [userClauses, setUserClauses] = useState<ModelClause[]>([])
  const [customClausesLoaded, setCustomClausesLoaded] = useState(false)
  const [documentSearchTerm, setDocumentSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [templateTitle, setTemplateTitle] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateTags, setTemplateTags] = useState("")
  const [templateCategory, setTemplateCategory] = useState("Plantillas personalizadas")
  const [isClauseDialogOpen, setIsClauseDialogOpen] = useState(false)
  const [clauseFormState, setClauseFormState] = useState({ title: "", category: "", text: "" })
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null)
  const [contractSearchTerm, setContractSearchTerm] = useState("")
  const [contractModeFilter, setContractModeFilter] = useState("all")
  const [communicationFilter, setCommunicationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [isTemplateFillDialogOpen, setIsTemplateFillDialogOpen] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<TemplateRepositoryItem | null>(null)
  const [templatePlaceholderValues, setTemplatePlaceholderValues] = useState<Record<string, string>>({})
  const [previewContractFile, setPreviewContractFile] = useState<StoredFile | null>(null)

  const filledTemplateText = useMemo(() => {
    if (!activeTemplate?.baseTemplate) return ""
    return applyTemplateValues(activeTemplate.baseTemplate, templatePlaceholderValues)
  }, [activeTemplate, templatePlaceholderValues])

  const activeTemplatePlaceholders = activeTemplate?.placeholders ?? []

  const normalizeType = (value: string) => {
    if (!value) return "OTRO"
    let normalized = value
    if (value.includes("/")) {
      normalized = value.split("/").pop() ?? value
    } else if (value.includes(".")) {
      normalized = value.split(".").pop() ?? value
    }
    return normalized.replace(/\./g, "").toUpperCase()
  }

  const parseStoredTags = (tags: unknown): string[] => {
    if (!tags) return []
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag)).filter(Boolean)
    }
    if (typeof tags === "string") {
      return tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    }
    return []
  }

  const resetTemplateFill = () => {
    setTemplatePlaceholderValues({})
    setActiveTemplate(null)
  }

  const openTemplateFillDialog = (template: TemplateRepositoryItem) => {
    const initialValues: Record<string, string> = {}
    template.placeholders.forEach((placeholder) => {
      initialValues[placeholder] = ""
    })
    setTemplatePlaceholderValues(initialValues)
    setActiveTemplate(template)
    setIsTemplateFillDialogOpen(true)
  }

  const handlePlaceholderInput = (placeholder: string, value: string) => {
    setTemplatePlaceholderValues((prev) => ({
      ...prev,
      [placeholder]: value,
    }))
  }

  const loadStoredContracts = () => {
    setUploadedContracts(getFilesByCategory("third-party-contract"))
  }

  const loadTemplateFiles = () => {
    setTemplateFiles(getFilesByCategory("third-party-template"))
  }

  const loadContractHistory = () => {
    try {
      const raw = localStorage.getItem("contractsHistory")
      if (raw) {
        const parsed = JSON.parse(raw) as ContractMeta[]
        setContractHistory(parsed)
      } else {
        setContractHistory([])
      }
    } catch {
      setContractHistory([])
    }
  }

  const loadCustomClauses = () => {
    try {
      const stored = localStorage.getItem("thirdPartyCustomClauses")
      if (stored) {
        const parsed = JSON.parse(stored) as ModelClause[]
        setUserClauses(parsed.map((clause) => ({ ...clause, isCustom: true })))
      } else {
        setUserClauses([])
      }
    } catch {
      setUserClauses([])
    } finally {
      setCustomClausesLoaded(true)
    }
  }

  useEffect(() => {
    loadStoredContracts()
    loadTemplateFiles()
    loadContractHistory()
    loadCustomClauses()

    const handleStorageChange = () => {
      loadStoredContracts()
      loadTemplateFiles()
      loadContractHistory()
      loadCustomClauses()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("contractsHistoryUpdated", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("contractsHistoryUpdated", handleStorageChange)
    }
  }, [])

  useEffect(() => {
    if (!customClausesLoaded) return

    try {
      const payload = userClauses.map(({ isCustom, ...rest }) => rest)
      localStorage.setItem("thirdPartyCustomClauses", JSON.stringify(payload))
    } catch (error) {
      console.error("No fue posible guardar las cláusulas personalizadas", error)
    }
  }, [userClauses, customClausesLoaded])

  const resetTemplateForm = () => {
    setTemplateFile(null)
    setTemplateTitle("")
    setTemplateDescription("")
    setTemplateTags("")
    setTemplateCategory("Plantillas personalizadas")
    setIsSavingTemplate(false)
  }

  const handleTemplateUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!templateFile) {
      toast({
        title: "Seleccione un archivo",
        description: "Necesita elegir un documento para crear la plantilla.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSavingTemplate(true)
      const tags = templateTags
        ? templateTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : []

      await saveFile(
        templateFile,
        {
          title: templateTitle || templateFile.name,
          description: templateDescription,
          tags,
          category: templateCategory,
        },
        "third-party-template",
      )

      toast({
        title: "Plantilla guardada",
        description: "La plantilla ahora está disponible para tu equipo.",
      })

      resetTemplateForm()
      setIsUploadDialogOpen(false)
      loadTemplateFiles()
    } catch {
      toast({
        title: "Error al guardar",
        description: "Ocurrió un problema al almacenar la plantilla. Inténtalo nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = (id: string) => {
    const success = deleteFile(id)
    if (success) {
      setTemplateFiles((prev) => prev.filter((file) => file.id !== id))
      toast({
        title: "Plantilla eliminada",
        description: "El documento ya no está disponible en la biblioteca.",
      })
    } else {
      toast({
        title: "No se pudo eliminar",
        description: "Intente nuevamente o recargue la página para actualizar la lista.",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado al portapapeles",
      description: "El texto ha sido copiado para que puedas reutilizarlo.",
    })
  }

  const downloadTemplateBase = (template: TemplateRepositoryItem) => {
    if (!template.baseTemplate) {
      toast({
        title: "Plantilla sin documento base",
        description: "Agrega tu propia plantilla oficial para poder descargarla.",
      })
      return
    }

    const fileName = template.baseDownloadName || `${template.title.replace(/\s+/g, "_")}.txt`
    triggerTextDownload(template.baseTemplate, fileName)
    toast({
      title: "Documento generado",
      description: `Descargando ${fileName}`,
    })
  }

  const downloadDocument = (resource: DocumentResource) => {
    if (resource.source === "custom" && resource.downloadUrl) {
      const link = document.createElement("a")
      link.href = resource.downloadUrl
      link.download = resource.title
      link.target = "_blank"
      link.rel = "noopener"
      link.click()
      toast({
        title: "Descarga iniciada",
        description: `Abriendo ${resource.title}`,
      })
      return
    }

    if (resource.downloadUrl) {
      window.open(resource.downloadUrl, "_blank", "noopener")
      toast({
        title: "Descarga iniciada",
        description: `Abriendo ${resource.title}`,
      })
      return
    }

    toast({
      title: "Recurso de referencia",
      description: "Esta ficha es orientativa. Añade tu plantilla para descargarla.",
    })
  }

  const downloadFilledTemplate = () => {
    if (!activeTemplate) {
      toast({
        title: "Sin plantilla seleccionada",
        description: "Elige una plantilla del repositorio para personalizarla.",
        variant: "destructive",
      })
      return
    }

    const content = filledTemplateText || activeTemplate.baseTemplate || ""

    if (!content) {
      toast({
        title: "Sin contenido para descargar",
        description: "Completa los campos o adjunta un formato base para generar el documento.",
        variant: "destructive",
      })
      return
    }

    const suggestedName = activeTemplate.baseDownloadName || `${activeTemplate.title.replace(/\s+/g, "_")}.txt`
    const fileName = suggestedName.endsWith(".txt")
      ? suggestedName.replace(/\.txt$/i, "_personalizado.txt")
      : `${suggestedName}_personalizado.txt`

    triggerTextDownload(content, fileName)
    toast({
      title: "Plantilla personalizada lista",
      description: `Descargando ${fileName}`,
    })
  }

  const openClauseDialog = (clause?: ModelClause, mode: "create" | "edit" | "duplicate" = "create") => {
    if (clause) {
      setClauseFormState({ title: clause.title, category: clause.category, text: clause.text })
      setEditingClauseId(mode === "edit" ? clause.id : null)
    } else {
      setClauseFormState({ title: "", category: "", text: "" })
      setEditingClauseId(null)
    }
    setIsClauseDialogOpen(true)
  }

  const resetClauseForm = () => {
    setClauseFormState({ title: "", category: "", text: "" })
    setEditingClauseId(null)
  }

  const handleClauseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = clauseFormState.title.trim()
    const category = clauseFormState.category.trim()
    const text = clauseFormState.text.trim()

    if (!title || !category || !text) {
      toast({
        title: "Completa la información",
        description: "Indica un título, categoría y contenido para la cláusula.",
        variant: "destructive",
      })
      return
    }

    if (editingClauseId) {
      setUserClauses((prev) =>
        prev.map((clause) =>
          clause.id === editingClauseId
            ? {
                ...clause,
                title,
                category,
                text,
              }
            : clause,
        ),
      )
      toast({
        title: "Cláusula actualizada",
        description: "Los cambios fueron guardados correctamente.",
      })
    } else {
      setUserClauses((prev) => [
        {
          id: `custom-${Date.now()}`,
          title,
          category,
          text,
          isCustom: true,
        },
        ...prev,
      ])
      toast({
        title: "Cláusula guardada",
        description: "Tu cláusula personalizada ya está disponible en el catálogo.",
      })
    }

    setIsClauseDialogOpen(false)
    resetClauseForm()
  }

  const handleDeleteClause = (id: string) => {
    setUserClauses((prev) => prev.filter((clause) => clause.id !== id))
    toast({
      title: "Cláusula eliminada",
      description: "La cláusula personalizada fue eliminada del catálogo.",
    })
  }

  const getContractModeLabel = (mode: "marco" | "especifico") =>
    mode === "marco" ? "Contrato marco" : "Contrato específico"

  const formatDate = (value: string) => {
    if (!value) return "No definido"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleDateString()
  }

  const previewStoredContract = (contract: StoredFile) => {
    if (!canOfferFilePreview(contract)) {
      toast({
        title: "Vista previa no disponible",
        description: "Puedes descargar el contrato original desde esta misma tarjeta.",
        variant: "destructive",
      })
      return
    }

    setPreviewContractFile(contract)
  }

  const downloadStoredContract = (contract: StoredFile) => {
    const link = document.createElement("a")
    link.href = createFileURL(contract.content)
    link.download = contract.name
    link.target = "_blank"
    link.rel = "noopener"
    link.click()
  }

  const resolveContractAttachment = (attachment: ContractMeta["attachments"][number]) => {
    if (!attachment.storageId) {
      toast({
        title: "Documento no disponible",
        description: "El archivo no se encontró en el almacenamiento local.",
        variant: "destructive",
      })
      return null
    }
    const stored = getFileById(attachment.storageId)
    if (!stored) {
      toast({
        title: "Documento no disponible",
        description: "El archivo no se encontró en el almacenamiento local.",
        variant: "destructive",
      })
      return null
    }
    return stored
  }

  const previewContractAttachment = (attachment: ContractMeta["attachments"][number]) => {
    const stored = resolveContractAttachment(attachment)
    if (!stored) return

    if (!canOfferFilePreview(stored)) {
      toast({
        title: "Vista previa no disponible",
        description: "Puedes descargar el documento original desde este mismo registro.",
        variant: "destructive",
      })
      return
    }

    setPreviewContractFile(stored)
  }

  const downloadContractAttachment = (attachment: ContractMeta["attachments"][number]) => {
    const stored = resolveContractAttachment(attachment)
    if (!stored) return

    const link = document.createElement("a")
    link.href = createFileURL(stored.content)
    link.download = stored.name
    link.target = "_blank"
    link.rel = "noopener"
    link.click()
  }

  const statusLabels: Record<ContractMeta["contractStatus"], string> = {
    vigente: "Vigente",
    por_vencer: "Por vencer",
    vencido: "Vencido",
    sin_definir: "Sin definir",
  }

  const statusVariants: Record<ContractMeta["contractStatus"], "default" | "secondary" | "outline" | "destructive"> = {
    vigente: "default",
    por_vencer: "secondary",
    vencido: "destructive",
    sin_definir: "outline",
  }

  const riskVariants: Record<ContractMeta["riskLevel"], "default" | "secondary" | "outline" | "destructive"> = {
    bajo: "secondary",
    medio: "default",
    alto: "destructive",
  }

  const allDocumentResources = useMemo<DocumentResource[]>(() => {
    const libraryResources: DocumentResource[] = defaultUtilityDocuments.map((doc) => ({
      ...doc,
      type: normalizeType(doc.type),
      source: "library" as const,
    }))

    const templateResources: DocumentResource[] = templateFiles.map((file) => {
      const metadata = file.metadata ?? {}
      const tags = parseStoredTags(metadata.tags)
      const category = (metadata.category as string) || "Plantillas personalizadas"
      const description =
        (metadata.description as string) ||
        "Plantilla cargada por tu organización para reutilizarla en futuros contratos."
      const title = (metadata.title as string) || file.name
      const typeLabel = normalizeType(file.type || file.name)

      const fileUrl = createFileURL(file.content)

      return {
        id: file.id,
        title,
        description,
        type: typeLabel,
        category,
        tags,
        content: fileUrl,
        downloadUrl: fileUrl,
        source: "custom" as const,
        uploadedAt: file.uploadDate,
        metadata,
        storageId: file.id,
      }
    })

    return [...templateResources, ...libraryResources]
  }, [templateFiles])

  const documentCategories = useMemo(() => {
    const categories = new Set(allDocumentResources.map((doc) => doc.category))
    return Array.from(categories).sort()
  }, [allDocumentResources])

  const documentTypes = useMemo(() => {
    const types = new Set(allDocumentResources.map((doc) => doc.type))
    return Array.from(types).sort()
  }, [allDocumentResources])

  const filteredDocuments = useMemo(() => {
    const searchValue = documentSearchTerm.trim().toLowerCase()
    return allDocumentResources.filter((doc) => {
      const matchesSearch =
        !searchValue ||
        doc.title.toLowerCase().includes(searchValue) ||
        doc.description.toLowerCase().includes(searchValue) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchValue))
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter
      const matchesType = typeFilter === "all" || doc.type === typeFilter
      return matchesSearch && matchesCategory && matchesType
    })
  }, [allDocumentResources, documentSearchTerm, categoryFilter, typeFilter])

  const combinedClauses = useMemo(() => [...defaultModelClauses, ...userClauses], [userClauses])

  const availableCommunicationTypes = useMemo(() => {
    const types = new Set(contractHistory.map((entry) => entry.communicationType).filter(Boolean))
    return Array.from(types).sort()
  }, [contractHistory])

  const availableStatuses = useMemo(() => {
    const statuses = new Set(contractHistory.map((entry) => entry.contractStatus))
    return (Array.from(statuses) as ContractMeta["contractStatus"][]).sort()
  }, [contractHistory])

  const availableRiskLevels = useMemo(() => {
    const risks = new Set(contractHistory.map((entry) => entry.riskLevel))
    return (Array.from(risks) as ContractMeta["riskLevel"][]).sort()
  }, [contractHistory])

  const filteredContractHistory = useMemo(() => {
    const searchValue = contractSearchTerm.trim().toLowerCase()
    return contractHistory.filter((contract) => {
      const matchesSearch =
        !searchValue ||
        [
          contract.contractTitle ?? "",
          contract.providerIdentity ?? "",
          contract.contractorType ?? "",
          contract.thirdPartyName ?? "",
          contract.contractType ?? "",
          contract.communicationType ?? "",
          contract.treatmentPurpose ?? "",
          contract.clauseRegulation ?? "",
          contract.thirdPartyTypes.join(" "),
          contract.areas.join(" "),
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(searchValue))

      const matchesMode = contractModeFilter === "all" || contract.contractMode === contractModeFilter
      const matchesCommunication =
        communicationFilter === "all" || contract.communicationType === communicationFilter
      const matchesStatus = statusFilter === "all" || contract.contractStatus === statusFilter
      const matchesRisk = riskFilter === "all" || contract.riskLevel === riskFilter

      return matchesSearch && matchesMode && matchesCommunication && matchesStatus && matchesRisk
    })
  }, [
    contractHistory,
    contractSearchTerm,
    contractModeFilter,
    communicationFilter,
    statusFilter,
    riskFilter,
  ])

  const navItems = THIRD_PARTY_CONTRACTS_NAV.map((item) => {
    if (item.href === "/third-party-contracts/registration") {
      return { ...item, badge: contractHistory.length }
    }
    if (item.href === "/third-party-contracts/documents") {
      return { ...item, badge: templateFiles.length + uploadedContracts.length }
    }
    return item
  })

  return (
    <ArcoModuleShell
      moduleLabel={THIRD_PARTY_CONTRACTS_META.moduleLabel}
      moduleTitle={THIRD_PARTY_CONTRACTS_META.moduleTitle}
      moduleDescription={THIRD_PARTY_CONTRACTS_META.moduleDescription}
      pageLabel="Documentos"
      pageTitle="Biblioteca documental y cláusulas"
      pageDescription="Plantillas, cláusulas y contratos relacionados en una sola biblioteca."
      navItems={navItems}
      headerBadges={[
        { label: `${templateFiles.length + uploadedContracts.length} recursos`, tone: "neutral" },
        { label: `${combinedClauses.length} cláusulas`, tone: "primary" },
      ]}
      actions={
        <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Subir plantilla
        </Button>
      }
    >
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-1 gap-2 rounded-2xl bg-[#edf4ff] p-1 sm:grid-cols-3">
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Plantillas</TabsTrigger>
          <TabsTrigger value="clauses" className="text-xs sm:text-sm">Cláusulas</TabsTrigger>
          <TabsTrigger value="uploaded" className="text-xs sm:text-sm">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Biblioteca de referencia y plantillas internas</CardTitle>
              <CardDescription>
                Consulta ejemplos listos para adaptar y sube los formatos oficiales de tu organización para tenerlos siempre a mano.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Estas referencias te ayudarán a estandarizar la elaboración de contratos con terceros. Cada plantilla personalizada que subas quedará disponible para todo tu equipo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repositorio guiado de plantillas oficiales</CardTitle>
              <CardDescription>
                Fichas listas con metadatos auditables, variables parametrizables y recomendaciones para cada tipo de contrato o cláusula.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {templateRepository.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>
                      <div className="flex flex-col gap-1 text-left">
                        <span className="flex items-center gap-2 font-medium">
                          <Layers className="h-4 w-4" />
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-md border border-dashed border-muted-foreground/40 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary">{item.metadata.tipo}</Badge>
                          <Badge variant="outline">Ámbito: {item.metadata.ambito}</Badge>
                          <Badge variant="outline" className="capitalize">
                            Riesgo: {item.metadata.riesgo}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Uso recomendado</p>
                          <p>{item.usage}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Variables disponibles</p>
                          <div className="flex flex-wrap gap-2">
                            {item.placeholders.map((placeholder) => (
                              <code key={placeholder} className="rounded bg-muted px-2 py-1 text-xs">
                                {placeholder}
                              </code>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <div>
                            <p className="font-medium">Categorías de datos</p>
                            <p>{item.metadata.categorias.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Titulares aplicables</p>
                            <p>{item.metadata.titulares.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Base jurídica</p>
                            <p>{item.metadata.baseJuridica.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Garantías</p>
                            <p>{(item.metadata.garantias ?? ["No especificado"]).join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Owner</p>
                            <p>{item.metadata.owner}</p>
                          </div>
                          <div>
                            <p className="font-medium">Aprobadores</p>
                            <p>{item.metadata.aprobadores.join(", ")}</p>
                          </div>
                          <div>
                            <p className="font-medium">Última revisión</p>
                            <p>{item.metadata.ultimaRevision}</p>
                          </div>
                          <div>
                            <p className="font-medium">Próxima revisión</p>
                            <p>{item.metadata.proximaRevision}</p>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">Notas clave</p>
                            <ul className="space-y-1">
                              {item.notes.map((note) => (
                                <li key={note} className="flex items-start gap-2">
                                  <ListChecks className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 border-t border-dashed border-muted-foreground/30 pt-4 text-xs md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.assetId && (
                              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                Ficha {item.assetId}
                              </Badge>
                            )}
                            <Badge variant="outline" className="capitalize">
                              Variables: {item.placeholders.length}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => openTemplateFillDialog(item)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Llenar plantilla
                            </Button>
                            {item.baseTemplate && (
                              <Button size="sm" variant="outline" onClick={() => downloadTemplateBase(item)}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar base
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 md:flex-row md:flex-1 md:items-center">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={documentSearchTerm}
                    onChange={(event) => setDocumentSearchTerm(event.target.value)}
                    placeholder="Buscar por título, descripción o etiqueta"
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {documentCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar por formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los formatos</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir plantilla interna
                </Button>
                <SafeLink href="/third-party-contracts/registration">
                  <Button variant="outline">Ir a Registro de Contratos</Button>
                </SafeLink>
              </div>
            </div>
          </div>

          {filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((resource) => {
                const isCustom = resource.source === "custom"
                return (
                  <Card key={resource.id} className="flex h-full flex-col">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5" />
                            {resource.title}
                          </CardTitle>
                          <CardDescription>{resource.description}</CardDescription>
                        </div>
                        <Badge variant="secondary">{resource.type}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{resource.category}</Badge>
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                        {isCustom && <Badge variant="secondary">Tu plantilla</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {isCustom ? (
                        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm">
                          <p className="font-medium">Archivo disponible para tu organización.</p>
                          <p className="text-xs text-muted-foreground">
                            Subido el {formatDate(resource.uploadedAt ?? "")}
                          </p>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
                          <img
                            src={resource.content || "/placeholder.svg"}
                            alt={resource.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadDocument(resource)}>
                        <Download className="mr-2 h-4 w-4" />
                        {isCustom ? "Ver o descargar" : "Consultar"}
                      </Button>
                      {isCustom && resource.storageId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(resource.storageId!)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
              No encontramos documentos con esos filtros. Ajusta la búsqueda o sube una nueva plantilla.
            </div>
          )}

          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={(open) => {
              setIsUploadDialogOpen(open)
              if (!open) {
                resetTemplateForm()
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Subir plantilla interna</DialogTitle>
                <DialogDescription>
                  Comparte formatos oficiales de tu organización para reutilizarlos en futuros contratos con terceros.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTemplateUpload} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="template-file">Archivo</Label>
                  <Input
                    id="template-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx"
                    required
                    onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-title">Nombre visible</Label>
                  <Input
                    id="template-title"
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.target.value)}
                    placeholder="Ej. Acuerdo de confidencialidad para proveedores"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-description">Descripción</Label>
                  <Textarea
                    id="template-description"
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.target.value)}
                    placeholder="Describe cuándo se debe usar esta plantilla y los puntos clave a revisar."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-category">Categoría</Label>
                  <Input
                    id="template-category"
                    value={templateCategory}
                    onChange={(event) => setTemplateCategory(event.target.value)}
                    placeholder="Ej. Contratos marco, Transferencias internacionales"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="template-tags">Etiquetas (separadas por coma)</Label>
                  <Input
                    id="template-tags"
                    value={templateTags}
                    onChange={(event) => setTemplateTags(event.target.value)}
                    placeholder="seguridad, confidencialidad, DPA"
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetTemplateForm()
                      setIsUploadDialogOpen(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSavingTemplate}>
                    {isSavingTemplate ? "Guardando..." : "Guardar plantilla"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isTemplateFillDialogOpen}
            onOpenChange={(open) => {
              setIsTemplateFillDialogOpen(open)
              if (!open) {
                resetTemplateFill()
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {activeTemplate ? `Personalizar ${activeTemplate.title}` : "Personalizar plantilla"}
                </DialogTitle>
                <DialogDescription>
                  Completa los campos clave para generar un documento listo para compartir con el tercero.
                </DialogDescription>
              </DialogHeader>

              {activeTemplate ? (
                <div className="space-y-6 text-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="font-medium">Uso recomendado</p>
                      <p className="text-muted-foreground">{activeTemplate.usage}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {activeTemplate.assetId && <p>Ficha: {activeTemplate.assetId}</p>}
                      <p>Variables disponibles: {activeTemplatePlaceholders.length}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {activeTemplatePlaceholders.length > 0 ? (
                      activeTemplatePlaceholders.map((placeholder) => {
                        const cleanLabel = placeholder.replace(/[{}]/g, "").replace(/_/g, " ")
                        const inputId = `placeholder-${placeholder.replace(/[{}]/g, "").toLowerCase()}`
                        return (
                          <div key={placeholder} className="space-y-1">
                            <Label htmlFor={inputId}>{cleanLabel}</Label>
                            <Input
                              id={inputId}
                              value={templatePlaceholderValues[placeholder] ?? ""}
                              onChange={(event) => handlePlaceholderInput(placeholder, event.target.value)}
                              placeholder={`Ingresa el valor para ${cleanLabel.toLowerCase()}`}
                            />
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-muted-foreground">
                        Esta plantilla no cuenta con variables. Puedes descargarla directamente desde el repositorio.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Vista previa generada</Label>
                    <Textarea
                      value={filledTemplateText || activeTemplate.baseTemplate || "Completa los campos para ver el resultado."}
                      readOnly
                      rows={12}
                      className="font-mono text-xs"
                    />
                  </div>

                  <DialogFooter className="flex flex-wrap justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetTemplateFill()
                        setIsTemplateFillDialogOpen(false)
                      }}
                    >
                      Cancelar
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => copyToClipboard(filledTemplateText || activeTemplate.baseTemplate || "")}
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copiar texto
                      </Button>
                      <Button type="button" onClick={downloadFilledTemplate}>
                        <Download className="mr-2 h-4 w-4" /> Descargar documento
                      </Button>
                    </div>
                  </DialogFooter>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecciona una plantilla desde el repositorio para comenzar a personalizarla.
                </p>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="clauses" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Cláusulas modelo para contratos con terceros</CardTitle>
                <CardDescription>
                  Inspírate en estas cláusulas y guarda tus versiones personalizadas para reutilizarlas rápidamente en cada contratación.
                </CardDescription>
              </div>
              <Button onClick={() => openClauseDialog()}>
                <FilePlus className="mr-2 h-4 w-4" />
                Agregar cláusula personalizada
              </Button>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {combinedClauses.map((clause) => (
                  <AccordionItem key={clause.id} value={clause.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>{clause.title}</span>
                        <Badge variant="outline" className="ml-2">
                          {clause.category}
                        </Badge>
                        {clause.isCustom && <Badge variant="secondary">Personalizada</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-md bg-muted p-4">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0"
                            onClick={() => copyToClipboard(clause.text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <pre className="whitespace-pre-wrap pr-10 text-sm leading-6">{clause.text}</pre>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-dashed border-muted-foreground/30 pt-3 text-sm md:flex-row md:items-center md:justify-between">
                          <p className="text-xs text-muted-foreground">
                            {clause.isCustom
                              ? "Cláusula creada por tu organización. Puedes editarla o eliminarla en cualquier momento."
                              : "Modelo sugerido listo para que lo adaptes a tus necesidades contractuales."}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {clause.isCustom ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openClauseDialog(clause, "edit")}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClause(clause.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openClauseDialog(clause, "duplicate")}
                              >
                                <FilePlus className="mr-2 h-4 w-4" />
                                Personalizar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Dialog
            open={isClauseDialogOpen}
            onOpenChange={(open) => {
              setIsClauseDialogOpen(open)
              if (!open) {
                resetClauseForm()
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingClauseId ? "Editar cláusula personalizada" : "Nueva cláusula personalizada"}
                </DialogTitle>
                <DialogDescription>
                  Define el texto exacto que deseas reutilizar en tus contratos con terceros.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleClauseSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="clause-title">Título</Label>
                  <Input
                    id="clause-title"
                    value={clauseFormState.title}
                    onChange={(event) => setClauseFormState((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Ej. Cláusula de confidencialidad reforzada"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clause-category">Categoría</Label>
                  <Input
                    id="clause-category"
                    value={clauseFormState.category}
                    onChange={(event) => setClauseFormState((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Confidencialidad, Seguridad, Auditoría..."
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clause-text">Texto de la cláusula</Label>
                  <Textarea
                    id="clause-text"
                    value={clauseFormState.text}
                    onChange={(event) => setClauseFormState((prev) => ({ ...prev, text: event.target.value }))}
                    placeholder="Escribe o pega aquí la redacción completa de la cláusula."
                    rows={8}
                    required
                  />
                </div>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetClauseForm()
                      setIsClauseDialogOpen(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingClauseId ? "Guardar cambios" : "Guardar cláusula"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="uploaded" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Historial de contratos registrados</CardTitle>
                <CardDescription>
                  Visualiza toda la información guardada desde la sección "Registro de Contratos" y consulta el detalle cuando lo necesites.
                </CardDescription>
              </div>
              <SafeLink href="/third-party-contracts/registration">
                <Button variant="outline">Registrar un nuevo contrato</Button>
              </SafeLink>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={contractSearchTerm}
                    onChange={(event) => setContractSearchTerm(event.target.value)}
                    placeholder="Buscar por proveedor, área o tipo de contrato"
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={contractModeFilter} onValueChange={setContractModeFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tipo de registro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los modos</SelectItem>
                      <SelectItem value="especifico">Contratos específicos</SelectItem>
                      <SelectItem value="marco">Contratos marco</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={communicationFilter} onValueChange={setCommunicationFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Tipo de comunicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las comunicaciones</SelectItem>
                      {availableCommunicationTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Estatus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estatus</SelectItem>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Nivel de riesgo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los riesgos</SelectItem>
                      {availableRiskLevels.map((risk) => (
                        <SelectItem key={risk} value={risk} className="capitalize">
                          {risk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredContractHistory.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredContractHistory.map((contract) => (
                    <Card key={contract.id} className="border-muted">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary">{getContractModeLabel(contract.contractMode)}</Badge>
                          <Badge variant="outline">{contract.contractType}</Badge>
                          <Badge variant="outline">{contract.communicationType}</Badge>
                          <Badge variant={statusVariants[contract.contractStatus]}>
                            {statusLabels[contract.contractStatus]}
                          </Badge>
                          <Badge variant={riskVariants[contract.riskLevel]} className="capitalize">
                            Riesgo: {contract.riskLevel}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">
                          {contract.contractTitle || contract.providerIdentity || contract.contractorType || "Contrato registrado"}
                        </CardTitle>
                        <CardDescription>
                          Registrado el {formatDate(contract.created)} · Vigencia {contract.contractValidity}
                          {contract.responsibleName && ` · Responsable: ${contract.responsibleName}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <strong>Tercero:</strong> {contract.providerIdentity || contract.contractorType || contract.thirdPartyName}
                        </p>
                        {contract.thirdPartyTypes.length > 0 && (
                          <p>
                            <strong>Tipo de tercero:</strong> {contract.thirdPartyTypes.join(", ")}
                          </p>
                        )}
                        <p>
                          <strong>Áreas involucradas:</strong> {contract.areas.join(", ")}
                        </p>
                        <p>
                          <strong>Período:</strong> {formatDate(contract.startDate)} a {formatDate(contract.expirationDate)}
                        </p>
                        <p>
                          <strong>Volumen aproximado:</strong> {contract.dataVolume}
                        </p>
                        <p>
                          <strong>Cláusula regulatoria:</strong> {contract.clauseRegulation}
                        </p>
                        {contract.communicationDetails && (
                          <p>
                            <strong>Detalle de comunicación:</strong> {contract.communicationDetails}
                          </p>
                        )}
                        <p>
                          <strong>Recordatorios configurados:</strong> {contract.reminders.join(", ")} días antes del vencimiento
                        </p>
                        <div className="space-y-2">
                          <p className="font-medium">Documentos asociados</p>
                          {contract.attachments.length > 0 ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              {contract.attachments.map((attachment) => (
                                <div
                                  key={`${contract.id}-${attachment.storageId ?? attachment.fileName}`}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-2"
                                >
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-medium">{attachment.fileName}</p>
                                    <p className="text-xs text-muted-foreground">{attachment.definition}</p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => previewContractAttachment(attachment)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => downloadContractAttachment(attachment)}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Descargar
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sin documentos adjuntos en el registro.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
                  Aún no hay contratos registrados. Dirígete a "Registro de Contratos" para crear tu primer registro.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Archivos de contratos cargados</CardTitle>
              <CardDescription>
                Documentos guardados con la categoría "third-party-contract" disponibles para consulta rápida.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedContracts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {uploadedContracts.map((contract) => {
                    const metadata = contract.metadata ?? {}
                    const serviceTypes = Array.isArray(metadata.serviceTypes)
                      ? metadata.serviceTypes
                      : metadata.serviceTypes
                      ? String(metadata.serviceTypes).split(",").map((item: string) => item.trim())
                      : []
                    const reminders = Array.isArray(metadata.reminders)
                      ? metadata.reminders
                      : metadata.reminders
                      ? String(metadata.reminders).split(",").map((item: string) => item.trim())
                      : []

                    return (
                      <Card key={contract.id} className="overflow-hidden">
                        <CardHeader className="space-y-1 p-4">
                          <CardTitle className="text-base">
                            {(metadata.contractTitle as string) || contract.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Subido el {formatDate(contract.uploadDate)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1 p-4 pt-0 text-sm">
                          {metadata.providerIdentity && (
                            <p>
                              <strong>Proveedor:</strong> {metadata.providerIdentity as string}
                            </p>
                          )}
                          {metadata.contractType && (
                            <p>
                              <strong>Tipo de contrato:</strong> {metadata.contractType as string}
                            </p>
                          )}
                          {metadata.relationType && (
                            <p>
                              <strong>Relación jurídica:</strong> {metadata.relationType as string}
                            </p>
                          )}
                          {serviceTypes.length > 0 && (
                            <p>
                              <strong>Servicios:</strong> {serviceTypes.join(", ")}
                            </p>
                          )}
                          {metadata.validityPeriod && (
                            <p>
                              <strong>Vigencia:</strong> {metadata.validityPeriod as string}
                            </p>
                          )}
                          {metadata.riskLevel && (
                            <p>
                              <strong>Riesgo:</strong> {metadata.riskLevel as string}
                            </p>
                          )}
                          {reminders.length > 0 && (
                            <p>
                              <strong>Recordatorios:</strong> {reminders.join(", ")}
                            </p>
                          )}
                        </CardContent>
                        <CardFooter className="flex flex-wrap justify-end gap-2 p-4 pt-0">
                          <Button variant="outline" size="sm" onClick={() => previewStoredContract(contract)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver documento
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => downloadStoredContract(contract)}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
                  No hay archivos de contratos en esta categoría todavía. Registra un contrato e incluye el documento para verlo aquí.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <FilePreviewDialog
        file={previewContractFile}
        open={Boolean(previewContractFile)}
        onOpenChange={(open) => {
          if (!open) setPreviewContractFile(null)
        }}
      />
    </ArcoModuleShell>
  )
}
