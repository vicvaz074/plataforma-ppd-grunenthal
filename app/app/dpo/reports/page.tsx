"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArcoModuleShell } from "@/components/arco-module-shell"
import { DPO_META, DPO_NAV } from "@/components/arco-module-config"
import {
  ArrowLeft,
  Download,
  FileText,
  Copy,
  FileDown,
  Save,
  LayoutTemplateIcon as Template,
  Trash2,
  Edit,
  Eye,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import jsPDF from "jspdf"
import "jspdf-autotable"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
import { Badge } from "@/components/ui/badge"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  Table as DocxTable,
  WidthType,
  AlignmentType,
  HeadingLevel,
  UnderlineType,
} from "docx"

// Tipos para los informes
interface Report {
  id: string
  title: string
  type: string
  date: string
  content: string
  recommendations: string[]
  status: "draft" | "final"
}

// Tipo para el acta de informe
interface ActaInforme {
  id: string
  title: string
  fecha: string
  lugar: string
  horaInicio: string
  horaFin: string
  asistentes: string[]
  orden: string[]
  desarrollo: string
  conclusiones: string[]
  acciones: {
    descripcion: string
    responsable: string
    fecha: string
  }[]
  anexos: string[]
  createdAt: string
  updatedAt: string
}

// Plantillas predefinidas
const PLANTILLAS_ACTAS: Omit<ActaInforme, "id" | "title" | "createdAt" | "updatedAt">[] = [
  {
    fecha: new Date().toISOString().split("T")[0],
    lugar: "Oficinas centrales",
    horaInicio: "10:00",
    horaFin: "11:30",
    asistentes: ["Miembros del Departamento de Datos Personales", "Director General", "Responsable de Seguridad"],
    orden: [
      "Revisión de actividades de tratamiento",
      "Evaluación de medidas de seguridad",
      "Análisis de brechas de seguridad",
      "Planificación de formaciones",
    ],
    desarrollo:
      "Durante la reunión se revisaron las actividades de tratamiento actuales y se identificaron áreas de mejora en las medidas de seguridad implementadas. Se discutieron las brechas de seguridad reportadas en el último trimestre y se planificaron las próximas sesiones de formación para el personal.",
    conclusiones: [
      "Es necesario actualizar la política de privacidad",
      "Se requiere reforzar las medidas de seguridad en los sistemas de información",
      "El personal necesita formación adicional en materia de protección de datos",
    ],
    acciones: [
      {
        descripcion: "Actualizar la política de privacidad",
        responsable: "Departamento Legal",
        fecha: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Implementar nuevas medidas de seguridad",
        responsable: "Departamento IT",
        fecha: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Organizar sesiones de formación",
        responsable: "Recursos Humanos",
        fecha: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
    anexos: [
      "Registro de Actividades de Tratamiento",
      "Informe de Evaluación de Impacto",
      "Registro de Brechas de Seguridad",
    ],
  },
  {
    fecha: new Date().toISOString().split("T")[0],
    lugar: "Videoconferencia",
    horaInicio: "09:00",
    horaFin: "10:00",
    asistentes: ["Miembros del Departamento de Datos Personales", "Comité de Privacidad"],
    orden: ["Revisión de consultas recibidas", "Actualización de normativa", "Seguimiento de acciones pendientes"],
    desarrollo:
      "Se revisaron las consultas recibidas durante el último mes y se discutieron las implicaciones de las últimas actualizaciones normativas. Se realizó un seguimiento de las acciones pendientes identificadas en reuniones anteriores.",
    conclusiones: [
      "Es necesario actualizar los procedimientos internos",
      "Se debe mejorar el canal de consultas",
      "Es necesario realizar una auditoría interna",
    ],
    acciones: [
      {
        descripcion: "Actualizar procedimientos internos",
        responsable: "Departamento de Datos Personales",
        fecha: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Mejorar canal de consultas",
        responsable: "Departamento IT",
        fecha: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
    anexos: ["Listado de consultas recibidas", "Resumen de actualizaciones normativas"],
  },
  {
    fecha: new Date().toISOString().split("T")[0],
    lugar: "Sala de reuniones principal",
    horaInicio: "15:00",
    horaFin: "17:00",
    asistentes: ["Miembros del Departamento de Datos Personales", "Dirección", "Responsables de Departamento"],
    orden: ["Presentación del informe anual", "Revisión de objetivos", "Planificación del próximo año"],
    desarrollo:
      "Se presentó el informe anual de protección de datos, destacando los logros y desafíos del año. Se revisaron los objetivos establecidos y se discutió la planificación para el próximo año, incluyendo nuevas iniciativas y proyectos.",
    conclusiones: [
      "Se han cumplido la mayoría de los objetivos establecidos",
      "Es necesario aumentar los recursos dedicados a protección de datos",
      "Se deben establecer objetivos más ambiciosos para el próximo año",
    ],
    acciones: [
      {
        descripcion: "Elaborar propuesta de recursos adicionales",
        responsable: "Departamento de Datos Personales",
        fecha: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Definir objetivos para el próximo año",
        responsable: "Comité de Dirección",
        fecha: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Preparar plan de formación anual",
        responsable: "Recursos Humanos",
        fecha: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
    anexos: [
      "Informe anual de protección de datos",
      "Presentación de objetivos",
      "Borrador de plan para el próximo año",
    ],
  },
]

export default function DPOReportsPage() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [actas, setActas] = useState<ActaInforme[]>([])
  const [selectedActa, setSelectedActa] = useState<ActaInforme | null>(null)
  const [isViewMode, setIsViewMode] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const actaTemplateRef = useRef<HTMLDivElement>(null)
  const [newReport, setNewReport] = useState<Omit<Report, "id">>({
    title: "",
    type: "periodic",
    date: new Date().toISOString().split("T")[0],
    content: "",
    recommendations: [""],
    status: "draft",
  })

  // Estado para el acta de informe
  const [actaInforme, setActaInforme] = useState<Omit<ActaInforme, "id" | "createdAt" | "updatedAt">>({
    title: "Acta de reunión - " + format(new Date(), "dd/MM/yyyy"),
    fecha: new Date().toISOString().split("T")[0],
    lugar: "Oficinas centrales",
    horaInicio: "10:00",
    horaFin: "11:30",
    asistentes: ["Miembros del Departamento de Datos Personales", "Director General", "Responsable de Seguridad"],
    orden: [
      "Revisión de actividades de tratamiento",
      "Evaluación de medidas de seguridad",
      "Análisis de brechas de seguridad",
    ],
    desarrollo:
      "Durante la reunión se revisaron las actividades de tratamiento actuales y se identificaron áreas de mejora en las medidas de seguridad implementadas. Se discutieron las brechas de seguridad reportadas en el último trimestre y se planificaron las próximas sesiones de formación para el personal.",
    conclusiones: [
      "Es necesario actualizar la política de privacidad",
      "Se requiere reforzar las medidas de seguridad en los sistemas de información",
      "El personal necesita formación adicional en materia de protección de datos",
    ],
    acciones: [
      {
        descripcion: "Actualizar la política de privacidad",
        responsable: "Departamento Legal",
        fecha: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Implementar nuevas medidas de seguridad",
        responsable: "Departamento IT",
        fecha: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      {
        descripcion: "Organizar sesiones de formación",
        responsable: "Recursos Humanos",
        fecha: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    ],
    anexos: [
      "Registro de Actividades de Tratamiento",
      "Informe de Evaluación de Impacto",
      "Registro de Brechas de Seguridad",
    ],
  })

  // Cargar informes y actas guardadas
  useEffect(() => {
    const savedReports = localStorage.getItem("dpo-reports")
    if (savedReports) {
      setReports(JSON.parse(savedReports))
    }

    const savedActas = localStorage.getItem("dpo-actas")
    if (savedActas) {
      setActas(JSON.parse(savedActas))
    }
  }, [])

  // Manejar cambios en las recomendaciones
  const handleRecommendationChange = (index: number, value: string) => {
    const updatedRecommendations = [...newReport.recommendations]
    updatedRecommendations[index] = value
    setNewReport({ ...newReport, recommendations: updatedRecommendations })
  }

  // Añadir nueva recomendación
  const addRecommendation = () => {
    setNewReport({
      ...newReport,
      recommendations: [...newReport.recommendations, ""],
    })
  }

  // Eliminar recomendación
  const removeRecommendation = (index: number) => {
    const updatedRecommendations = [...newReport.recommendations]
    updatedRecommendations.splice(index, 1)
    setNewReport({ ...newReport, recommendations: updatedRecommendations })
  }

  // Guardar informe
  const saveReport = async (status: "draft" | "final" = "draft") => {
    try {
      setIsSubmitting(true)

      // Validar campos requeridos
      if (!newReport.title || !newReport.content) {
        toast({
          title: "Error",
          description: "Por favor complete el título y el contenido del informe.",
          variant: "destructive",
        })
        return
      }

      // Crear nuevo informe
      const reportToSave: Report = {
        ...newReport,
        id: `report-${Date.now()}`,
        status,
        recommendations: newReport.recommendations.filter((r) => r.trim() !== ""),
      }

      // Guardar en localStorage
      const updatedReports = [...reports, reportToSave]
      localStorage.setItem("dpo-reports", JSON.stringify(updatedReports))
      setReports(updatedReports)

      // Si es informe final, generar PDF
      if (status === "final") {
        generatePDF(reportToSave)
      }

      toast({
        title: "Éxito",
        description: `El informe ha sido ${status === "draft" ? "guardado como borrador" : "finalizado y generado"}.`,
      })

      // Limpiar formulario
      setNewReport({
        title: "",
        type: "periodic",
        date: new Date().toISOString().split("T")[0],
        content: "",
        recommendations: [""],
        status: "draft",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Hubo un error al guardar el informe.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generar PDF
  const generatePDF = (report: Report) => {
    try {
      const doc = new jsPDF()

      // Título
      doc.setFontSize(18)
      doc.text("Informe del Departamento de Datos Personales", 14, 20)

      // Metadatos
      doc.setFontSize(12)
      doc.text(`Título: ${report.title}`, 14, 30)
      doc.text(`Tipo: ${getReportTypeName(report.type)}`, 14, 37)
      doc.text(`Fecha: ${format(new Date(report.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 14, 44)

      // Contenido
      doc.text("Contenido:", 14, 55)
      const splitContent = doc.splitTextToSize(report.content, 180)
      doc.text(splitContent, 14, 62)

      // Calcular posición Y después del contenido
      let yPos = 62 + splitContent.length * 7

      // Recomendaciones
      if (report.recommendations.length > 0) {
        doc.text("Recomendaciones:", 14, yPos + 10)
        yPos += 17

        report.recommendations.forEach((rec, index) => {
          const recText = `${index + 1}. ${rec}`
          const splitRec = doc.splitTextToSize(recText, 180)
          doc.text(splitRec, 14, yPos)
          yPos += splitRec.length * 7
        })
      }

      // Guardar PDF
      doc.save(`informe-dpd-${report.id}.pdf`)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        title: "Error",
        description: "Hubo un error al generar el PDF.",
        variant: "destructive",
      })
    }
  }

  // Obtener nombre del tipo de informe
  const getReportTypeName = (type: string) => {
    switch (type) {
      case "periodic":
        return "Informe Periódico"
      case "activity":
        return "Reporte de Actividades"
      case "consultation":
        return "Consultas Atendidas"
      case "recommendation":
        return "Recomendaciones"
      default:
        return type
    }
  }

  // Manejar cambios en el acta
  const handleActaChange = (field: keyof typeof actaInforme, value: any) => {
    setActaInforme((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Manejar cambios en los asistentes
  const handleAsistenteChange = (index: number, value: string) => {
    const updatedAsistentes = [...actaInforme.asistentes]
    updatedAsistentes[index] = value
    handleActaChange("asistentes", updatedAsistentes)
  }

  // Añadir asistente
  const addAsistente = () => {
    handleActaChange("asistentes", [...actaInforme.asistentes, ""])
  }

  // Eliminar asistente
  const removeAsistente = (index: number) => {
    const updatedAsistentes = [...actaInforme.asistentes]
    updatedAsistentes.splice(index, 1)
    handleActaChange("asistentes", updatedAsistentes)
  }

  // Manejar cambios en el orden del día
  const handleOrdenChange = (index: number, value: string) => {
    const updatedOrden = [...actaInforme.orden]
    updatedOrden[index] = value
    handleActaChange("orden", updatedOrden)
  }

  // Añadir punto al orden del día
  const addOrden = () => {
    handleActaChange("orden", [...actaInforme.orden, ""])
  }

  // Eliminar punto del orden del día
  const removeOrden = (index: number) => {
    const updatedOrden = [...actaInforme.orden]
    updatedOrden.splice(index, 1)
    handleActaChange("orden", updatedOrden)
  }

  // Manejar cambios en las conclusiones
  const handleConclusionChange = (index: number, value: string) => {
    const updatedConclusiones = [...actaInforme.conclusiones]
    updatedConclusiones[index] = value
    handleActaChange("conclusiones", updatedConclusiones)
  }

  // Añadir conclusión
  const addConclusion = () => {
    handleActaChange("conclusiones", [...actaInforme.conclusiones, ""])
  }

  // Eliminar conclusión
  const removeConclusion = (index: number) => {
    const updatedConclusiones = [...actaInforme.conclusiones]
    updatedConclusiones.splice(index, 1)
    handleActaChange("conclusiones", updatedConclusiones)
  }

  // Manejar cambios en las acciones
  const handleAccionChange = (index: number, field: keyof ActaInforme["acciones"][0], value: string) => {
    const updatedAcciones = [...actaInforme.acciones]
    updatedAcciones[index] = {
      ...updatedAcciones[index],
      [field]: value,
    }
    handleActaChange("acciones", updatedAcciones)
  }

  // Añadir acción
  const addAccion = () => {
    handleActaChange("acciones", [
      ...actaInforme.acciones,
      {
        descripcion: "",
        responsable: "",
        fecha: new Date().toISOString().split("T")[0],
      },
    ])
  }

  // Eliminar acción
  const removeAccion = (index: number) => {
    const updatedAcciones = [...actaInforme.acciones]
    updatedAcciones.splice(index, 1)
    handleActaChange("acciones", updatedAcciones)
  }

  // Manejar cambios en los anexos
  const handleAnexoChange = (index: number, value: string) => {
    const updatedAnexos = [...actaInforme.anexos]
    updatedAnexos[index] = value
    handleActaChange("anexos", updatedAnexos)
  }

  // Añadir anexo
  const addAnexo = () => {
    handleActaChange("anexos", [...actaInforme.anexos, ""])
  }

  // Eliminar anexo
  const removeAnexo = (index: number) => {
    const updatedAnexos = [...actaInforme.anexos]
    updatedAnexos.splice(index, 1)
    handleActaChange("anexos", updatedAnexos)
  }

  // Guardar acta
  const saveActa = () => {
    try {
      // Validar campos requeridos
      if (!actaInforme.title || !actaInforme.fecha || !actaInforme.lugar) {
        toast({
          title: "Error",
          description: "Por favor complete al menos el título, fecha y lugar de la reunión.",
          variant: "destructive",
        })
        return
      }

      const now = new Date().toISOString()

      // Si estamos editando un acta existente
      if (selectedActa) {
        const updatedActa: ActaInforme = {
          ...actaInforme,
          id: selectedActa.id,
          createdAt: selectedActa.createdAt,
          updatedAt: now,
        }

        const updatedActas = actas.map((acta) => (acta.id === selectedActa.id ? updatedActa : acta))

        localStorage.setItem("dpo-actas", JSON.stringify(updatedActas))
        setActas(updatedActas)

        toast({
          title: "Éxito",
          description: "El acta ha sido actualizada correctamente.",
        })

        // Resetear selección
        setSelectedActa(null)
      } else {
        // Crear nueva acta
        const newActa: ActaInforme = {
          ...actaInforme,
          id: `acta-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        }

        const updatedActas = [...actas, newActa]
        localStorage.setItem("dpo-actas", JSON.stringify(updatedActas))
        setActas(updatedActas)

        toast({
          title: "Éxito",
          description: "El acta ha sido guardada correctamente.",
        })
      }

      // Limpiar formulario si no estamos en modo vista
      if (!isViewMode) {
        resetActaForm()
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Hubo un error al guardar el acta.",
        variant: "destructive",
      })
    }
  }

  // Resetear formulario de acta
  const resetActaForm = () => {
    setActaInforme({
      title: "Acta de reunión - " + format(new Date(), "dd/MM/yyyy"),
      fecha: new Date().toISOString().split("T")[0],
      lugar: "Oficinas centrales",
      horaInicio: "10:00",
      horaFin: "11:30",
      asistentes: ["Miembros del Departamento de Datos Personales", "Director General", "Responsable de Seguridad"],
      orden: [
        "Revisión de actividades de tratamiento",
        "Evaluación de medidas de seguridad",
        "Planificación de formaciones",
      ],
      desarrollo:
        "Durante la reunión se revisaron las actividades de tratamiento actuales y se identificaron áreas de mejora en las medidas de seguridad implementadas. Se discutieron las brechas de seguridad reportadas en el último trimestre y se planificaron las próximas sesiones de formación para el personal.",
      conclusiones: [
        "Es necesario actualizar la política de privacidad",
        "Se requiere reforzar las medidas de seguridad en los sistemas de información",
        "El personal necesita formación adicional en materia de protección de datos",
      ],
      acciones: [
        {
          descripcion: "Actualizar la política de privacidad",
          responsable: "Departamento Legal",
          fecha: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        {
          descripcion: "Implementar nuevas medidas de seguridad",
          responsable: "Departamento IT",
          fecha: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        {
          descripcion: "Organizar sesiones de formación",
          responsable: "Recursos Humanos",
          fecha: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
      ],
      anexos: [
        "Registro de Actividades de Tratamiento",
        "Informe de Evaluación de Impacto",
        "Registro de Brechas de Seguridad",
      ],
    })
    setSelectedActa(null)
    setIsViewMode(false)
  }

  // Editar acta existente
  const editActa = (acta: ActaInforme) => {
    setActaInforme({
      title: acta.title,
      fecha: acta.fecha,
      lugar: acta.lugar,
      horaInicio: acta.horaInicio,
      horaFin: acta.horaFin,
      asistentes: [...acta.asistentes],
      orden: [...acta.orden],
      desarrollo: acta.desarrollo,
      conclusiones: [...acta.conclusiones],
      acciones: acta.acciones.map((accion) => ({ ...accion })),
      anexos: [...acta.anexos],
    })
    setSelectedActa(acta)
    setIsViewMode(false)
  }

  // Ver acta existente
  const viewActa = (acta: ActaInforme) => {
    setActaInforme({
      title: acta.title,
      fecha: acta.fecha,
      lugar: acta.lugar,
      horaInicio: acta.horaInicio,
      horaFin: acta.horaFin,
      asistentes: [...acta.asistentes],
      orden: [...acta.orden],
      desarrollo: acta.desarrollo,
      conclusiones: [...acta.conclusiones],
      acciones: acta.acciones.map((accion) => ({ ...accion })),
      anexos: [...acta.anexos],
    })
    setSelectedActa(acta)
    setIsViewMode(true)
  }

  // Eliminar acta
  const deleteActa = (id: string) => {
    const updatedActas = actas.filter((acta) => acta.id !== id)
    localStorage.setItem("dpo-actas", JSON.stringify(updatedActas))
    setActas(updatedActas)

    // Si estamos viendo o editando el acta que se elimina, resetear el formulario
    if (selectedActa && selectedActa.id === id) {
      resetActaForm()
    }

    toast({
      title: "Éxito",
      description: "El acta ha sido eliminada correctamente.",
    })
  }

  // Aplicar plantilla
  const applyTemplate = (template: Omit<ActaInforme, "id" | "title" | "createdAt" | "updatedAt">) => {
    setActaInforme({
      ...template,
      title: actaInforme.title, // Mantener el título actual
    })
    setShowTemplateDialog(false)

    toast({
      title: "Plantilla aplicada",
      description: "La plantilla ha sido aplicada correctamente. Puede editar los campos según sea necesario.",
    })
  }

  // Generar documento Word
  const generateWord = async () => {
    try {
      setIsSubmitting(true)

      // Crear documento Word usando docx.js
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "ACTA DE REUNIÓN - DELEGADO DE PROTECCIÓN DE DATOS",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: {
                  after: 200,
                  before: 200,
                },
              }),

              // Información general
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Fecha: ",
                    bold: true,
                  }),
                  new TextRun(format(new Date(actaInforme.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Lugar: ",
                    bold: true,
                  }),
                  new TextRun(actaInforme.lugar),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Hora de inicio: ",
                    bold: true,
                  }),
                  new TextRun(actaInforme.horaInicio),
                ],
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Hora de finalización: ",
                    bold: true,
                  }),
                  new TextRun(actaInforme.horaFin),
                ],
                spacing: { after: 200 },
              }),

              // Asistentes
              new Paragraph({
                text: "ASISTENTES",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 100 },
              }),
              ...actaInforme.asistentes.map(
                (asistente) =>
                  new Paragraph({
                    text: `• ${asistente}`,
                    spacing: { after: 100 },
                  }),
              ),
              new Paragraph({ spacing: { after: 200 } }),

              // Orden del día
              new Paragraph({
                text: "ORDEN DEL DÍA",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 100 },
              }),
              ...actaInforme.orden.map(
                (punto, index) =>
                  new Paragraph({
                    text: `• ${punto}`,
                    spacing: { after: 100 },
                  }),
              ),
              new Paragraph({ spacing: { after: 200 } }),

              // Desarrollo
              new Paragraph({
                text: "DESARROLLO DE LA REUNIÓN",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: actaInforme.desarrollo,
                spacing: { after: 200 },
              }),

              // Conclusiones
              new Paragraph({
                text: "CONCLUSIONES",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 100 },
              }),
              ...actaInforme.conclusiones.map(
                (conclusion) =>
                  new Paragraph({
                    text: `• ${conclusion}`,
                    spacing: { after: 100 },
                  }),
              ),
              new Paragraph({ spacing: { after: 200 } }),

              // Acciones
              new Paragraph({
                text: "ACCIONES A REALIZAR",
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 100 },
              }),
              new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new DocxTableRow({
                    children: [
                      new DocxTableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "Acción", bold: true })],
                          }),
                        ],
                        
                        width: { size: 40, type: WidthType.PERCENTAGE },
                      }),
                      new DocxTableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "Responsable", bold: true })],
                          }),
                        ],
                        
                        width: { size: 30, type: WidthType.PERCENTAGE },
                      }),
                      new DocxTableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: "Fecha Límite", bold: true })],
                          }),
                        ],
                        
                        width: { size: 30, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  }),
                  ...actaInforme.acciones.map(
                    (accion) =>
                      new DocxTableRow({
                        children: [
                          new DocxTableCell({
                            children: [new Paragraph(accion.descripcion)],
                            width: { size: 40, type: WidthType.PERCENTAGE },
                          }),
                          new DocxTableCell({
                            children: [new Paragraph(accion.responsable)],
                            width: { size: 30, type: WidthType.PERCENTAGE },
                          }),
                          new DocxTableCell({
                            children: [new Paragraph(format(new Date(accion.fecha), "dd/MM/yyyy"))],
                            width: { size: 30, type: WidthType.PERCENTAGE },
                          }),
                        ],
                      }),
                  ),
                ],
              }),
              new Paragraph({ spacing: { after: 200 } }),

              // Anexos
              ...(actaInforme.anexos.length > 0
                ? [
                    new Paragraph({
                      text: "ANEXOS",
                      heading: HeadingLevel.HEADING_2,
                      spacing: { after: 100 },
                    }),
                    ...actaInforme.anexos.map(
                      (anexo) =>
                        new Paragraph({
                          text: `• ${anexo}`,
                          spacing: { after: 100 },
                        }),
                    ),
                    new Paragraph({ spacing: { after: 200 } }),
                  ]
                : []),

              // Firmas
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Firma del Departamento de Datos Personales",
                    underline: {
                      type: UnderlineType.SINGLE,
                    },
                  }),
                ],
                spacing: { after: 100, before: 400 },
                alignment: AlignmentType.LEFT,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Firma del Responsable del Tratamiento",
                    underline: {
                      type: UnderlineType.SINGLE,
                    },
                  }),
                ],
                spacing: { after: 100, before: 400 },
                alignment: AlignmentType.RIGHT,
              }),
            ],
          },
        ],
      })

      // Generar archivo
      const buffer = await Packer.toBuffer(doc)
      const blob = new Blob([Uint8Array.from(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
      const url = URL.createObjectURL(blob)

      // Descargar archivo
      const a = document.createElement("a")
      a.href = url
      a.download = `acta-reunion-dpd-${format(new Date(), "yyyy-MM-dd")}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Éxito",
        description: "El acta ha sido descargada en formato Word.",
      })
    } catch (error) {
      console.error("Error al generar Word:", error)
      toast({
        title: "Error",
        description: "Hubo un error al generar el documento Word.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Descargar acta como HTML
  const downloadActaAsHTML = () => {
    try {
      if (!actaTemplateRef.current) return

      const htmlContent = actaTemplateRef.current.innerHTML
      const blob = new Blob(
        [
          `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${actaInforme.title}</title>
          <style>
            @import url("https://fonts.cdnfonts.com/css/futura-std-4");
            body { 
              font-family: "Futura Std", Arial, sans-serif; 
              margin: 40px; 
              line-height: 1.6;
              color: #333;
              font-weight: 400;
            }
            h1 { 
              color: #222; 
              text-align: center; 
              font-weight: 400;
              margin-bottom: 1.5rem;
            }
            h2 { 
              color: #1e293b; 
              margin-top: 20px;
              font-weight: 400;
              margin-bottom: 0.75rem;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
              border-radius: 4px;
              overflow: hidden;
            }
            table, th, td { border: 1px solid #e2e8f0; }
            th { 
              background-color: #f8fafc;
              font-weight: 400;
            }
            th, td { padding: 12px 16px; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .header-info { margin-bottom: 30px; }
            .header-info p { margin: 5px 0; }
            ol, ul { margin-left: 20px; }
            .footer { 
              margin-top: 50px; 
              text-align: center; 
              font-style: italic; 
              color: #64748b;
              font-size: 0.875rem;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 3rem;
              padding-top: 2rem;
              border-top: 1px solid #e2e8f0;
            }
            .signature {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-bottom: 1px dashed #94a3b8;
              width: 80%;
              margin: 0 auto 8px;
            }
            .signature-label {
              font-size: 0.875rem;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="document">
            <h1>ACTA DE REUNIÓN - DELEGADO DE PROTECCIÓN DE DATOS</h1>
            <div class="document-title" style="text-align: center; font-size: 1.25rem; margin-bottom: 2rem;">
              ${actaInforme.title}
            </div>
            ${htmlContent}
          </div>
          <div class="footer">
            <p>Documento generado por Davaraboard - Sistema de Gestión de Protección de Datos</p>
          </div>
        </body>
      </html>
    `,
        ],
        { type: "text/html" },
      )

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `acta-reunion-dpd-${format(new Date(), "yyyy-MM-dd")}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Éxito",
        description: "El acta ha sido descargada en formato HTML.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Hubo un error al descargar el acta.",
        variant: "destructive",
      })
    }
  }

  // Copiar acta al portapapeles
  const copyActaToClipboard = () => {
    try {
      if (!actaTemplateRef.current) return

      const range = document.createRange()
      range.selectNode(actaTemplateRef.current)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
      document.execCommand("copy")
      window.getSelection()?.removeAllRanges()

      toast({
        title: "Éxito",
        description: "El contenido del acta ha sido copiado al portapapeles.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Hubo un error al copiar el acta al portapapeles.",
        variant: "destructive",
      })
    }
  }

  const navItems = DPO_NAV.map((item) => {
    if (item.href === "/dpo/reports") {
      return { ...item, badge: reports.length + actas.length }
    }
    return item
  })

  const finalReports = reports.filter((report) => report.status === "final").length

  return (
    <ArcoModuleShell
      moduleLabel={DPO_META.moduleLabel}
      moduleTitle={DPO_META.moduleTitle}
      moduleDescription={DPO_META.moduleDescription}
      pageLabel="Informes"
      pageTitle="Actas e informes del Departamento de Datos Personales"
      pageDescription="Actas e informes con trazabilidad documental."
      navItems={navItems}
      headerBadges={[
        { label: `${actas.length} actas`, tone: "neutral" },
        { label: `${reports.length} informes`, tone: "primary" },
        { label: `${finalReports} finales`, tone: finalReports > 0 ? "positive" : "neutral" },
      ]}
      contentClassName="space-y-6"
    >
      <Tabs defaultValue="acta" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-[#edf4ff] p-1 lg:grid-cols-4">
          <TabsTrigger value="acta" className="text-xs sm:text-sm">Acta</TabsTrigger>
          <TabsTrigger value="actas-list" className="text-xs sm:text-sm">Actas</TabsTrigger>
          <TabsTrigger value="create" className="text-xs sm:text-sm">Informe</TabsTrigger>
          <TabsTrigger value="view" className="text-xs sm:text-sm">Informes</TabsTrigger>
        </TabsList>

        <TabsContent value="acta">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-muted/50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {isViewMode ? "Vista de Acta" : selectedActa ? "Editar Acta" : "Nueva Acta de Reunión"}
                    </CardTitle>
                    <CardDescription>
                      {isViewMode
                        ? "Visualización del acta seleccionada."
                        : selectedActa
                          ? "Modifique los campos del acta seleccionada."
                          : "Complete los campos del acta de reunión."}
                    </CardDescription>
                  </div>
                  {!isViewMode && (
                    <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
                      <Template className="h-4 w-4 mr-2" />
                      Usar Plantilla
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isViewMode && (
                  <div>
                    <Label htmlFor="title">Título del Acta</Label>
                    <Input
                      id="title"
                      value={actaInforme.title}
                      onChange={(e) => handleActaChange("title", e.target.value)}
                      className="mt-2"
                      disabled={isViewMode}
                    />
                  </div>
                )}

                <Accordion type="single" collapsible defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Información General</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fecha">Fecha de la Reunión</Label>
                          <Input
                            id="fecha"
                            type="date"
                            value={actaInforme.fecha}
                            onChange={(e) => handleActaChange("fecha", e.target.value)}
                            className="mt-2"
                            disabled={isViewMode}
                          />
                        </div>

                        <div>
                          <Label htmlFor="lugar">Lugar</Label>
                          <Input
                            id="lugar"
                            value={actaInforme.lugar}
                            onChange={(e) => handleActaChange("lugar", e.target.value)}
                            className="mt-2"
                            disabled={isViewMode}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="horaInicio">Hora de Inicio</Label>
                            <Input
                              id="horaInicio"
                              type="time"
                              value={actaInforme.horaInicio}
                              onChange={(e) => handleActaChange("horaInicio", e.target.value)}
                              className="mt-2"
                              disabled={isViewMode}
                            />
                          </div>

                          <div>
                            <Label htmlFor="horaFin">Hora de Finalización</Label>
                            <Input
                              id="horaFin"
                              type="time"
                              value={actaInforme.horaFin}
                              onChange={(e) => handleActaChange("horaFin", e.target.value)}
                              className="mt-2"
                              disabled={isViewMode}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Asistentes</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {actaInforme.asistentes.map((asistente, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={asistente}
                              onChange={(e) => handleAsistenteChange(index, e.target.value)}
                              placeholder="Nombre y cargo del asistente"
                              className="flex-1"
                              disabled={isViewMode}
                            />
                            {!isViewMode && actaInforme.asistentes.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeAsistente(index)}
                              >
                                &times;
                              </Button>
                            )}
                          </div>
                        ))}

                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" onClick={addAsistente} className="mt-2">
                            Añadir Asistente
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>Orden del Día</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {actaInforme.orden.map((punto, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={punto}
                              onChange={(e) => handleOrdenChange(index, e.target.value)}
                              placeholder="Punto del orden del día"
                              className="flex-1"
                              disabled={isViewMode}
                            />
                            {!isViewMode && actaInforme.orden.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeOrden(index)}
                              >
                                &times;
                              </Button>
                            )}
                          </div>
                        ))}

                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" onClick={addOrden} className="mt-2">
                            Añadir Punto
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>Desarrollo de la Reunión</AccordionTrigger>
                    <AccordionContent>
                      <div>
                        <Label htmlFor="desarrollo">Desarrollo</Label>
                        <Textarea
                          id="desarrollo"
                          value={actaInforme.desarrollo}
                          onChange={(e) => handleActaChange("desarrollo", e.target.value)}
                          className="mt-2 min-h-[150px]"
                          placeholder="Describa el desarrollo de la reunión..."
                          disabled={isViewMode}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>Conclusiones</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {actaInforme.conclusiones.map((conclusion, index) => (
                          <div key={index} className="flex gap-2">
                            <Textarea
                              value={conclusion}
                              onChange={(e) => handleConclusionChange(index, e.target.value)}
                              placeholder="Conclusión"
                              className="flex-1"
                              disabled={isViewMode}
                            />
                            {!isViewMode && actaInforme.conclusiones.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeConclusion(index)}
                              >
                                &times;
                              </Button>
                            )}
                          </div>
                        ))}

                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" onClick={addConclusion} className="mt-2">
                            Añadir Conclusión
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger>Acciones a Realizar</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {actaInforme.acciones.map((accion, index) => (
                          <div key={index} className="space-y-2 border p-3 rounded-md">
                            <div className="flex justify-between">
                              <Label>Acción {index + 1}</Label>
                              {!isViewMode && actaInforme.acciones.length > 1 && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeAccion(index)}
                                >
                                  Eliminar
                                </Button>
                              )}
                            </div>

                            <div>
                              <Label>Descripción</Label>
                              <Textarea
                                value={accion.descripcion}
                                onChange={(e) => handleAccionChange(index, "descripcion", e.target.value)}
                                placeholder="Descripción de la acción"
                                className="mt-1"
                                disabled={isViewMode}
                              />
                            </div>

                            <div>
                              <Label>Responsable</Label>
                              <Input
                                value={accion.responsable}
                                onChange={(e) => handleAccionChange(index, "responsable", e.target.value)}
                                placeholder="Responsable de la acción"
                                className="mt-1"
                                disabled={isViewMode}
                              />
                            </div>

                            <div>
                              <Label>Fecha Límite</Label>
                              <Input
                                type="date"
                                value={accion.fecha}
                                onChange={(e) => handleAccionChange(index, "fecha", e.target.value)}
                                className="mt-1"
                                disabled={isViewMode}
                              />
                            </div>
                          </div>
                        ))}

                        {!isViewMode && (
                          <Button type="button" variant="outline" onClick={addAccion}>
                            Añadir Acción
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-7">
                    <AccordionTrigger>Anexos</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {actaInforme.anexos.map((anexo, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={anexo}
                              onChange={(e) => handleAnexoChange(index, e.target.value)}
                              placeholder="Descripción del anexo"
                              className="flex-1"
                              disabled={isViewMode}
                            />
                            {!isViewMode && actaInforme.anexos.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeAnexo(index)}
                              >
                                &times;
                              </Button>
                            )}
                          </div>
                        ))}

                        {!isViewMode && (
                          <Button type="button" variant="outline" size="sm" onClick={addAnexo} className="mt-2">
                            Añadir Anexo
                          </Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex flex-wrap gap-4 pt-4">
                  {isViewMode ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsViewMode(false)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button type="button" variant="outline" onClick={resetActaForm}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" onClick={saveActa} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {selectedActa ? "Actualizar" : "Guardar"}
                      </Button>
                      {selectedActa && (
                        <Button type="button" variant="outline" onClick={resetActaForm}>
                          Cancelar
                        </Button>
                      )}
                    </>
                  )}
                  <Button type="button" variant="outline" onClick={generateWord} disabled={isSubmitting}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar como Word
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadActaAsHTML}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar como HTML
                  </Button>
                  <Button type="button" variant="outline" onClick={copyActaToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar al Portapapeles
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vista Previa</CardTitle>
                    <CardDescription>Esta es una vista previa de cómo se verá el acta de reunión</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={copyActaToClipboard} className="text-xs">
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copiar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={downloadActaAsHTML} className="text-xs">
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      HTML
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-primary/5 px-6 py-3 border-b">
                    <h3 className="font-normal">Vista previa del documento</h3>
                  </div>
                  <div
                    ref={actaTemplateRef}
                    className="p-8 max-h-[800px] overflow-y-auto bg-card dark:bg-card print:bg-white"
                    style={{
                      fontFamily: '"Futura Std", sans-serif',
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    <div className="max-w-[800px] mx-auto">
                      <div className="text-center mb-8">
                        <h1 className="text-2xl mb-6 text-primary">
                          ACTA DE REUNIÓN - DELEGADO DE PROTECCIÓN DE DATOS
                        </h1>
                        <div className="text-lg">{actaInforme.title}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8 border-b pb-6">
                        <div>
                          <p className="mb-2">
                            <span className="text-muted-foreground">Fecha:</span>{" "}
                            <span className="font-normal">
                              {format(new Date(actaInforme.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </span>
                          </p>
                          <p className="mb-2">
                            <span className="text-muted-foreground">Lugar:</span>{" "}
                            <span className="font-normal">{actaInforme.lugar}</span>
                          </p>
                        </div>
                        <div>
                          <p className="mb-2">
                            <span className="text-muted-foreground">Hora de inicio:</span>{" "}
                            <span className="font-normal">{actaInforme.horaInicio}</span>
                          </p>
                          <p className="mb-2">
                            <span className="text-muted-foreground">Hora de finalización:</span>{" "}
                            <span className="font-normal">{actaInforme.horaFin}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-xl mb-3 text-primary">ASISTENTES</h2>
                        <ul className="list-disc pl-6 space-y-1">
                          {actaInforme.asistentes.map((asistente, index) => (
                            <li key={index}>{asistente}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-xl mb-3 text-primary">ORDEN DEL DÍA</h2>
                        <ul className="list-disc pl-6 space-y-1">
                          {actaInforme.orden.map((punto, index) => (
                            <li key={index}>{punto}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-xl mb-3 text-primary">DESARROLLO DE LA REUNIÓN</h2>
                        <p className="whitespace-pre-line">{actaInforme.desarrollo}</p>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-xl mb-3 text-primary">CONCLUSIONES</h2>
                        <ul className="list-disc pl-6 space-y-1">
                          {actaInforme.conclusiones.map((conclusion, index) => (
                            <li key={index}>{conclusion}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-8">
                        <h2 className="text-xl mb-3 text-primary">ACCIONES A REALIZAR</h2>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-primary/5">
                              <tr>
                                <th className="text-left p-3 border-b">Acción</th>
                                <th className="text-left p-3 border-b">Responsable</th>
                                <th className="text-left p-3 border-b">Fecha límite</th>
                              </tr>
                            </thead>
                            <tbody>
                              {actaInforme.acciones.map((accion, index) => (
                                <tr key={index} className={index % 2 === 0 ? "bg-primary/[0.02]" : ""}>
                                  <td className="p-3 border-b">{accion.descripcion}</td>
                                  <td className="p-3 border-b">{accion.responsable}</td>
                                  <td className="p-3 border-b">{format(new Date(accion.fecha), "dd/MM/yyyy")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {actaInforme.anexos.length > 0 && (
                        <div className="mb-8">
                          <h2 className="text-xl mb-3 text-primary">ANEXOS</h2>
                          <ul className="list-disc pl-6 space-y-1">
                            {actaInforme.anexos.map((anexo, index) => (
                              <li key={index}>{anexo}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-12 border-t pt-8 grid grid-cols-2 gap-8">
                        <div className="flex flex-col items-center">
                          <div className="w-48 border-b border-dashed border-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Departamento de Datos Personales</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-48 border-b border-dashed border-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Responsable del Tratamiento</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actas-list">
          <Card>
            <CardHeader>
              <CardTitle>Actas Guardadas</CardTitle>
              <CardDescription>Listado de todas las actas de reunión guardadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {actas.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay actas guardadas. Cree una nueva acta en la pestaña "Acta de Reunión".
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Última actualización</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actas.map((acta) => (
                      <TableRow key={acta.id}>
                        <TableCell>{acta.title}</TableCell>
                        <TableCell>{format(new Date(acta.fecha), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{acta.lugar}</TableCell>
                        <TableCell>{format(new Date(acta.updatedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => viewActa(acta)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => editActa(acta)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Eliminar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el acta.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteActa(acta.id)}
                                    className="bg-red-500 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Informe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Título del Informe</Label>
                  <Input
                    id="title"
                    value={newReport.title}
                    onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Informe</Label>
                  <Select value={newReport.type} onValueChange={(value) => setNewReport({ ...newReport, type: value })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Seleccione un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="periodic">Informe Periódico</SelectItem>
                      <SelectItem value="activity">Reporte de Actividades</SelectItem>
                      <SelectItem value="consultation">Consultas Atendidas</SelectItem>
                      <SelectItem value="recommendation">Recomendaciones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="date">Fecha del Informe</Label>
                <Input
                  id="date"
                  type="date"
                  value={newReport.date}
                  onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="content">Contenido del Informe</Label>
                <Textarea
                  id="content"
                  value={newReport.content}
                  onChange={(e) => setNewReport({ ...newReport, content: e.target.value })}
                  className="mt-2 min-h-[200px]"
                  placeholder="Describa el contenido del informe..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Recomendaciones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRecommendation}>
                    Añadir Recomendación
                  </Button>
                </div>

                {newReport.recommendations.map((rec, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Textarea
                      value={rec}
                      onChange={(e) => handleRecommendationChange(index, e.target.value)}
                      placeholder="Escriba una recomendación..."
                      className="flex-1"
                    />
                    {newReport.recommendations.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeRecommendation(index)}
                      >
                        &times;
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button type="button" onClick={() => saveReport("draft")} disabled={isSubmitting} variant="outline">
                  Guardar como Borrador
                </Button>
                <Button type="button" onClick={() => saveReport("final")} disabled={isSubmitting}>
                  Finalizar y Generar Informe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Informes Generados</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay informes guardados. Cree un nuevo informe en la pestaña "Crear Informe".
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.title}</TableCell>
                        <TableCell>{getReportTypeName(report.type)}</TableCell>
                        <TableCell>{format(new Date(report.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={report.status === "draft" ? "outline" : "default"}>
                            {report.status === "draft" ? "Borrador" : "Finalizado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {report.status === "final" && (
                              <Button variant="outline" size="sm" onClick={() => generatePDF(report)}>
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Ver detalles (podría implementarse un modal)
                                toast({
                                  title: "Detalles del informe",
                                  description: `${report.title} - ${report.content.substring(0, 50)}...`,
                                })
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de plantillas */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Seleccionar Plantilla</DialogTitle>
            <DialogDescription>Elija una plantilla predefinida para el acta de reunión.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {PLANTILLAS_ACTAS.map((plantilla, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow border-primary/10 hover:border-primary/30"
                onClick={() => applyTemplate(plantilla)}
              >
                <CardHeader className="pb-2 bg-muted/30">
                  <CardTitle className="text-base">Plantilla {index + 1}</CardTitle>
                  <CardDescription className="text-xs">
                    {plantilla.lugar} - {format(new Date(plantilla.fecha), "dd/MM/yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs p-4">
                  <p className="line-clamp-2 mb-2">
                    <span className="text-muted-foreground">Orden del día:</span> {plantilla.orden.join(", ")}
                  </p>
                  <p className="line-clamp-2">
                    <span className="text-muted-foreground">Asistentes:</span> {plantilla.asistentes.join(", ")}
                  </p>
                </CardContent>
                <CardFooter className="bg-muted/10 pt-3">
                  <Button size="sm" className="w-full" variant="outline">
                    Usar esta plantilla
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ArcoModuleShell>
  )
}
