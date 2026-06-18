import type { StoredFile } from "@/lib/fileStorage"
import { secureRandomId } from "@/lib/secure-random"

export type DpoYesNoNa = "si" | "no" | "na"

export type DpoQuestionResponse = {
  answer: DpoYesNoNa | ""
  notes: string
}

export type DpoOption<T extends string = string> = {
  value: T
  label: string
}

export const DPO_STORAGE_KEYS = {
  snapshot: "dpo-compliance",
  accreditationHistory: "dpo-accreditation-history",
  functionalHistory: "dpo-functional-history",
  projectReviews: "dpo-project-reviews",
} as const

export const DPO_ROLE_OPTIONS = [
  { value: "oficial", label: "Miembros del Departamento de Datos Personales" },
  { value: "cumplimiento", label: "Responsable de Cumplimiento" },
  { value: "seguridad", label: "Encargado de Seguridad de la Información" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly DpoOption[]

export type DpoRoleValue = (typeof DPO_ROLE_OPTIONS)[number]["value"]

export const DPO_AREA_OPTIONS = [
  { value: "juridico", label: "Jurídico / Cumplimiento" },
  { value: "seguridad", label: "Seguridad de la Información / TI" },
  { value: "rh", label: "Recursos Humanos" },
  { value: "direccion", label: "Dirección General" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly DpoOption[]

export type DpoAreaValue = (typeof DPO_AREA_OPTIONS)[number]["value"]

export const PROJECT_CATEGORY_OPTIONS = [
  { value: "producto-digital", label: "Nuevo producto o servicio digital" },
  { value: "implementacion-tecnologica", label: "Implementación tecnológica" },
  { value: "rrhh", label: "Nuevo tratamiento de RRHH" },
  { value: "marketing", label: "Campaña de marketing digital" },
  { value: "encargado", label: "Nuevo encargado o proveedor de datos" },
  { value: "transferencia-internacional", label: "Transferencia internacional de datos" },
  { value: "aviso", label: "Cambio en aviso de privacidad" },
  { value: "incidente", label: "Respuesta a incidente de seguridad" },
  { value: "otro", label: "Otro" },
] as const satisfies readonly DpoOption[]

export type DpoProjectCategoryValue = (typeof PROJECT_CATEGORY_OPTIONS)[number]["value"]

export const PROJECT_PHASE_OPTIONS = [
  { value: "conceptual", label: "Conceptual" },
  { value: "diseno", label: "En diseño" },
  { value: "desarrollo", label: "En desarrollo" },
  { value: "pruebas", label: "En pruebas" },
  { value: "operativo", label: "Operativo" },
] as const satisfies readonly DpoOption[]

export type DpoProjectPhaseValue = (typeof PROJECT_PHASE_OPTIONS)[number]["value"]

export const PROJECT_DICTAMEN_OPTIONS = [
  { value: "aprobado", label: "Aprobado" },
  { value: "condiciones", label: "Aprobado con condiciones" },
  { value: "requiere-eipd", label: "Requiere EIPD completa" },
  { value: "no-aprobado", label: "No aprobado — requiere rediseño" },
] as const satisfies readonly DpoOption[]

export type DpoProjectDictamenValue = (typeof PROJECT_DICTAMEN_OPTIONS)[number]["value"]

export type DpoEvidenceScope = "accreditation" | "functional" | "project" | "legacy"

export const DPO_EVIDENCE_SCOPE_LABELS: Record<DpoEvidenceScope, string> = {
  accreditation: "Acreditación",
  functional: "Evaluación funcional",
  project: "Proyecto",
  legacy: "Legado",
}

export const DPO_EVIDENCE_TYPE_LABELS: Record<string, string> = {
  designation: "Documento de designación",
  training: "Formación o certificación del Departamento de Datos Personales",
  "accreditation-support": "Soporte de acreditación",
  "functional-support": "Evidencia funcional",
  "activity-log": "Bitácora del Departamento de Datos Personales",
  report: "Informe remitido",
  "management-ack": "Acuse Alta Dirección",
  "project-brief": "Documento del proyecto",
  "project-dictamen": "Dictamen del Departamento de Datos Personales",
  policy: "Política o marco documental",
  procedures: "Procedimientos documentados",
}

type QuestionDefinition = {
  id: string
  prompt: string
  helper?: string
}

type AccreditationSectionDefinition = {
  id: "A" | "B" | "C" | "D"
  title: string
  description: string
  weight: number
  minimumRatio: number
  questions: readonly QuestionDefinition[]
}

type FunctionalSectionDefinition = {
  id: "F1" | "F2" | "F3" | "F4" | "F5"
  title: string
  description: string
  weight: number
  minimumRatio: number
  questions: readonly QuestionDefinition[]
}

export const ACCREDITATION_SECTIONS: readonly AccreditationSectionDefinition[] = [
  {
    id: "A",
    title: "Bloque A — Formalización del acto de designación",
    description:
      "Este bloque verifica que la designación de los Miembros del Departamento de Datos Personales se formalizó a través de un acto jurídico o administrativo válido, con evidencia documental suficiente.",
    weight: 25,
    minimumRatio: 6 / 8,
    questions: [
      {
        id: "A-01",
        prompt:
          "¿Existe un documento formal de designación de los Miembros del Departamento de Datos Personales (acta, resolución, nombramiento u orden de servicio)?",
        helper: "El documento debe identificar al titular, la fecha de inicio y el alcance del rol.",
      },
      {
        id: "A-02",
        prompt:
          "¿El documento de designación ha sido firmado por el representante legal o la Alta Dirección de la organización?",
        helper: "La firma de Alta Dirección es indispensable para acreditar el respaldo institucional.",
      },
      {
        id: "A-03",
        prompt: "¿La designación de los Miembros del Departamento de Datos Personales está registrada en el expediente del SGDP de la organización?",
      },
      {
        id: "A-04",
        prompt:
          "¿Se ha notificado formalmente a los Miembros del Departamento de Datos Personales sobre sus funciones, responsabilidades y recursos asignados?",
        helper: "Se recomienda un acuse de recibo o firma de aceptación del cargo.",
      },
      {
        id: "A-05",
        prompt: "¿Existe un procedimiento para la sustitución de los Miembros del Departamento de Datos Personales ante ausencia temporal o definitiva?",
        helper: "El protocolo de sustitución debe estar documentado y aprobado.",
      },
      {
        id: "A-06",
        prompt:
          "¿La vigencia del nombramiento está definida o se ha establecido un ciclo de revisión del cargo?",
        helper: "Se recomienda revisión anual o ante cambios organizacionales relevantes.",
      },
      {
        id: "A-07",
        prompt: "¿Se ha comunicado la identidad y datos de contacto de los Miembros del Departamento de Datos Personales a toda la organización?",
        helper: "El personal debe saber a quién acudir en materia de datos personales.",
      },
      {
        id: "A-08",
        prompt: "¿La designación de los Miembros del Departamento de Datos Personales ha sido incorporada al organigrama o estructura organizacional formal?",
      },
    ],
  },
  {
    id: "B",
    title: "Bloque B — Idoneidad del perfil y competencias",
    description:
      "Este bloque evalúa si los Miembros del Departamento de Datos Personales tienen el perfil, las competencias y la experiencia requeridos para ejercer el cargo de manera efectiva, conforme a los estándares internacionales.",
    weight: 30,
    minimumRatio: 6 / 8,
    questions: [
      {
        id: "B-01",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen formación específica en protección de datos personales, privacidad o derecho digital?",
        helper: "Se acredita mediante título, diplomado, certificación o cursos formales documentados.",
      },
      {
        id: "B-02",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales cuentan con conocimiento suficiente de la LFPDPPP, su Reglamento y los lineamientos del INAI?",
        helper: "Puede evaluarse mediante un examen de conocimientos o certificación reconocida.",
      },
      {
        id: "B-03",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales conocen el modelo de negocio, los procesos y las operaciones de la organización que involucran datos personales?",
        helper: "El conocimiento del contexto organizacional es esencial para identificar riesgos reales.",
      },
      {
        id: "B-04",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen conocimientos básicos de seguridad de la información relevantes para su cargo?",
        helper:
          "No requiere ser experto técnico, pero sí entender los principios de seguridad aplicados a datos personales.",
      },
      {
        id: "B-05",
        prompt: "¿Los Miembros del Departamento de Datos Personales han completado un programa de actualización en protección de datos en los últimos 12 meses?",
        helper: "La normativa evoluciona; la formación continua es un requisito de efectividad.",
      },
      {
        id: "B-06",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen experiencia previa en funciones de cumplimiento, legal, auditoría o seguridad?",
        helper: "Se acredita con curriculum vitae y referencias profesionales.",
      },
      {
        id: "B-07",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales poseen habilidades de comunicación suficientes para interactuar con la Alta Dirección, el personal y los titulares de datos?",
      },
      {
        id: "B-08",
        prompt: "¿Existe un plan de desarrollo profesional de los Miembros del Departamento de Datos Personales vinculado al SGDP de la organización?",
        helper: "Se recomienda un plan anual de formación y actualización.",
      },
    ],
  },
  {
    id: "C",
    title: "Bloque C — Independencia y posición en la organización",
    description:
      "La independencia de los Miembros del Departamento de Datos Personales es un requisito central de los estándares internacionales (ISO 27701, GDPR Art. 38). Este bloque evalúa si pueden ejercer su cargo sin conflictos de interés ni presiones indebidas.",
    weight: 25,
    minimumRatio: 5 / 7,
    questions: [
      {
        id: "C-01",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales reportan directamente a la Alta Dirección o al órgano de gobierno de la organización?",
        helper: "El reporte directo a la Dirección es el estándar internacional para garantizar independencia.",
      },
      {
        id: "C-02",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales pueden comunicarse directamente con la Alta Dirección sin intermediarios que puedan filtrar o bloquear sus reportes?",
      },
      {
        id: "C-03",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales están libres de conflictos de interés que puedan comprometer su independencia de criterio?",
        helper:
          "No debe tener funciones operativas que impliquen la toma de decisiones sobre tratamiento de datos.",
      },
      {
        id: "C-04",
        prompt:
          "¿Existe una política o procedimiento que proteja a los Miembros del Departamento de Datos Personales de represalias por sus recomendaciones o reportes?",
        helper: "La protección contra represalias es un principio del GDPR y de buenas prácticas internacionales.",
      },
      {
        id: "C-05",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen acceso directo a todas las áreas, sistemas e información necesaria para ejercer sus funciones?",
      },
      {
        id: "C-06",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales pueden contratar asesoría externa especializada cuando sea necesario, con cargo a un presupuesto asignado?",
      },
      {
        id: "C-07",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen autoridad para emitir recomendaciones vinculantes o, al menos, que requieran respuesta formal por parte de la Dirección?",
      },
    ],
  },
  {
    id: "D",
    title: "Bloque D — Recursos y condiciones de ejercicio",
    description: "Este bloque revisa si los Miembros del Departamento de Datos Personales tienen recursos, tiempo, apoyo y condiciones documentadas para desempeñar el cargo.",
    weight: 20,
    minimumRatio: 5 / 6,
    questions: [
      {
        id: "D-01",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales disponen de los recursos tecnológicos necesarios para ejercer sus funciones (plataforma, herramientas, acceso a sistemas)?",
        helper: "La plataforma Davara Governance debe estar disponible y configurada para el Departamento de Datos Personales.",
      },
      {
        id: "D-02",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen tiempo dedicado suficiente para el ejercicio de su cargo (dedicación parcial o completa documentada)?",
        helper: "Se debe definir el porcentaje de tiempo dedicado y que sea suficiente para la carga de trabajo.",
      },
      {
        id: "D-03",
        prompt: "¿Existe un presupuesto asignado al SGDP y a las actividades del Departamento de Datos Personales?",
      },
      {
        id: "D-04",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales tienen acceso al inventario de datos personales, políticas, contratos con encargados y documentación del SGDP?",
      },
      {
        id: "D-05",
        prompt:
          "¿Los Miembros del Departamento de Datos Personales cuentan con apoyo de equipo propio o de otras áreas (Legal, Compliance, TI) para ejercer sus funciones?",
      },
      {
        id: "D-06",
        prompt:
          "¿Las condiciones de ejercicio del cargo están documentadas en la descripción del puesto o en un mandato formal?",
      },
    ],
  },
] as const

export const FUNCTIONAL_SECTIONS: readonly FunctionalSectionDefinition[] = [
  {
    id: "F1",
    title: "Función 1 — Supervisión del cumplimiento normativo",
    description:
      "Evalúa si los Miembros del Departamento de Datos Personales monitorean activamente el cumplimiento de la LFPDPPP y políticas internas del SGDP en toda la organización.",
    weight: 25,
    minimumRatio: 7 / 10,
    questions: [
      {
        id: "F1-01",
        prompt: "¿Los Miembros del Departamento de Datos Personales han revisado y aprobado las políticas del SGDP en los últimos 12 meses?",
        helper: "Se acredita con registros de aprobación en el módulo de Políticas de Davara Governance.",
      },
      { id: "F1-02", prompt: "¿Los Miembros del Departamento de Datos Personales han identificado y documentado los gaps de cumplimiento normativo actuales de la organización?", helper: "Se acredita con un registro de gaps y planes de acción vigentes." },
      { id: "F1-03", prompt: "¿Los Miembros del Departamento de Datos Personales han realizado al menos una revisión formal del inventario de datos personales en los últimos 6 meses?" },
      { id: "F1-04", prompt: "¿Los Miembros del Departamento de Datos Personales supervisan activamente el proceso de atención de Derechos ARCO y verifican el cumplimiento de plazos?" },
      { id: "F1-05", prompt: "¿Los Miembros del Departamento de Datos Personales han verificado que los avisos de privacidad vigentes cumplen con los requisitos de la LFPDPPP?" },
      { id: "F1-06", prompt: "¿Los Miembros del Departamento de Datos Personales dan seguimiento a las obligaciones legales derivadas de contratos con encargados de tratamiento?" },
      { id: "F1-07", prompt: "¿Los Miembros del Departamento de Datos Personales coordinan con el área de TI para verificar medidas técnicas de seguridad de datos personales?" },
      { id: "F1-08", prompt: "¿Los Miembros del Departamento de Datos Personales llevan un registro actualizado de los cambios normativos que impactan a la organización?", helper: "Se acredita con un log de cambios normativos y acciones tomadas." },
      { id: "F1-09", prompt: "¿Los Miembros del Departamento de Datos Personales verifican que las nuevas iniciativas de negocio incluyan una evaluación de impacto en privacidad (EIPD) cuando corresponde?" },
      { id: "F1-10", prompt: "¿Los Miembros del Departamento de Datos Personales han completado o supervisado al menos una auditoría interna del SGDP en el periodo evaluado?" },
    ],
  },
  {
    id: "F2",
    title: "Función 2 — Asesoría y orientación interna",
    description:
      "Evalúa si los Miembros del Departamento de Datos Personales actúan efectivamente como consultores internos en materia de privacidad para todas las áreas de la organización.",
    weight: 20,
    minimumRatio: 6 / 8,
    questions: [
      { id: "F2-01", prompt: "¿Los Miembros del Departamento de Datos Personales tienen un canal habilitado para que las áreas consulten dudas sobre protección de datos (correo, ticket, formulario)?" },
      { id: "F2-02", prompt: "¿Los Miembros del Departamento de Datos Personales responden consultas internas dentro de un plazo razonable documentado (ej. 5 días hábiles)?", helper: "Se acredita con registro de consultas y tiempos de respuesta." },
      { id: "F2-03", prompt: "¿Los Miembros del Departamento de Datos Personales participan en los comités de aprobación de nuevos proyectos que involucran datos personales?" },
      { id: "F2-04", prompt: "¿Los Miembros del Departamento de Datos Personales emiten dictámenes o recomendaciones formales cuando se les consulta sobre tratamientos de alto riesgo?", helper: "Se acredita con registros de dictámenes en el módulo de Proyectos." },
      { id: "F2-05", prompt: "¿Los Miembros del Departamento de Datos Personales han asesorado al área de Recursos Humanos sobre el tratamiento de datos personales de empleados en el periodo evaluado?" },
      { id: "F2-06", prompt: "¿Los Miembros del Departamento de Datos Personales han revisado contratos con proveedores que involucran tratamiento de datos personales antes de su firma?" },
      { id: "F2-07", prompt: "¿Los Miembros del Departamento de Datos Personales proporcionan orientación al área de Marketing sobre el uso lícito de datos personales en campañas y plataformas digitales?" },
      { id: "F2-08", prompt: "¿Los Miembros del Departamento de Datos Personales han emitido al menos un dictamen o recomendación formal en el periodo de evaluación?" },
    ],
  },
  {
    id: "F3",
    title: "Función 3 — Capacitación y cultura de privacidad",
    description:
      "Evalúa si los Miembros del Departamento de Datos Personales lideran activamente el programa de capacitación y sensibilización en protección de datos.",
    weight: 20,
    minimumRatio: 5 / 7,
    questions: [
      { id: "F3-01", prompt: "¿Los Miembros del Departamento de Datos Personales han diseñado o coordinado al menos un programa de capacitación en protección de datos en el periodo?", helper: "Se acredita con temario, asistencia y evaluación de la capacitación." },
      { id: "F3-02", prompt: "¿Existe un plan anual de capacitación en privacidad aprobado y supervisado por los Miembros del Departamento de Datos Personales?" },
      { id: "F3-03", prompt: "¿Los Miembros del Departamento de Datos Personales verifican que el personal de nuevo ingreso recibe capacitación en protección de datos dentro de los primeros 30 días?" },
      { id: "F3-04", prompt: "¿Los Miembros del Departamento de Datos Personales coordinan capacitaciones diferenciadas por perfil de riesgo (ej. áreas que tratan datos sensibles)?" },
      { id: "F3-05", prompt: "¿Los Miembros del Departamento de Datos Personales llevan un registro actualizado del personal capacitado y los pendientes de capacitación?", helper: "Se acredita con evidencias de capacitación en el módulo de Evidencias de Davara Governance." },
      { id: "F3-06", prompt: "¿Los Miembros del Departamento de Datos Personales miden la efectividad de las capacitaciones mediante evaluaciones o indicadores de conocimiento?" },
      { id: "F3-07", prompt: "¿Los Miembros del Departamento de Datos Personales generan y distribuyen comunicaciones internas (boletines, alertas, circulares) sobre privacidad de forma periódica?" },
    ],
  },
  {
    id: "F4",
    title: "Función 4 — Punto de contacto con titulares y autoridades",
    description:
      "Evalúa si los Miembros del Departamento de Datos Personales gestionan eficazmente la relación con los titulares de datos y con el INAI u otras autoridades competentes.",
    weight: 20,
    minimumRatio: 5 / 7,
    questions: [
      { id: "F4-01", prompt: "¿Los Miembros del Departamento de Datos Personales supervisan el proceso de atención de solicitudes de Derechos ARCO y verifican el cumplimiento de los plazos legales?", helper: "Plazo legal: 20 días hábiles para Access/Rectificación/Cancelación; 15 días para Oposición." },
      { id: "F4-02", prompt: "¿Los Miembros del Departamento de Datos Personales registran y dan seguimiento a las quejas de titulares relacionadas con el tratamiento de sus datos personales?" },
      { id: "F4-03", prompt: "¿Los Miembros del Departamento de Datos Personales supervisan la atención de requerimientos del INAI dentro de los plazos establecidos?" },
      { id: "F4-04", prompt: "¿Los Miembros del Departamento de Datos Personales coordinan la respuesta de la organización ante procedimientos de verificación o visitas del INAI?" },
      { id: "F4-05", prompt: "¿Los Miembros del Departamento de Datos Personales mantienen un registro de las interacciones con el INAI (requerimientos, respuestas, resoluciones)?" },
      { id: "F4-06", prompt: "¿Los Miembros del Departamento de Datos Personales verifican que el aviso de privacidad incluye los datos de contacto actualizados para el ejercicio de Derechos ARCO?" },
      { id: "F4-07", prompt: "¿Los Miembros del Departamento de Datos Personales gestionan o supervisan la notificación de vulneraciones de seguridad a los titulares afectados en los plazos requeridos?", helper: "Conforme al Art. 20 LFPDPPP, la notificación debe hacerse en tiempo y forma." },
    ],
  },
  {
    id: "F5",
    title: "Función 5 — Gestión de riesgos e incidentes de privacidad",
    description:
      "Evalúa si los Miembros del Departamento de Datos Personales participan activamente en la gestión de riesgos, incidentes y evaluaciones de impacto del SGDP.",
    weight: 15,
    minimumRatio: 5 / 7,
    questions: [
      { id: "F5-01", prompt: "¿Los Miembros del Departamento de Datos Personales supervisan la realización de Evaluaciones de Impacto en la Protección de Datos (EIPD) para tratamientos de alto riesgo?" },
      { id: "F5-02", prompt: "¿Los Miembros del Departamento de Datos Personales participan en la gestión de vulneraciones de seguridad que afectan datos personales desde la detección hasta el cierre?" },
      { id: "F5-03", prompt: "¿Los Miembros del Departamento de Datos Personales revisan y validan el mapa de riesgos del SGDP al menos una vez al año?" },
      { id: "F5-04", prompt: "¿Los Miembros del Departamento de Datos Personales verifican que los planes de acción correctiva derivados de auditorías e incidentes se implementan en los plazos acordados?" },
      { id: "F5-05", prompt: "¿Los Miembros del Departamento de Datos Personales monitorean indicadores de riesgo de privacidad (ej. solicitudes ARCO pendientes, políticas vencidas, encargados sin contrato)?" },
      { id: "F5-06", prompt: "¿Los Miembros del Departamento de Datos Personales han reportado a la Alta Dirección al menos una vez en el periodo sobre el estado de los riesgos de privacidad?" },
      { id: "F5-07", prompt: "¿Los Miembros del Departamento de Datos Personales coordinan con el CISO o responsable de seguridad de la información la atención de vulneraciones técnicas?" },
    ],
  },
] as const

export const PROJECT_REVIEW_QUESTIONS = [
  { id: "P-01", prompt: "¿El proyecto involucra el tratamiento de datos personales de cualquier tipo?", helper: "Si la respuesta es No, el proyecto no requiere análisis adicional del Departamento de Datos Personales." },
  { id: "P-02", prompt: "¿Se tratarán datos personales sensibles (salud, biometría, genética, origen étnico, religión, preferencia sexual)?", helper: "Si es Sí, se requiere EIPD completa y consentimiento expreso por escrito." },
  { id: "P-03", prompt: "¿El proyecto implica tratamiento de datos personales a gran escala o de manera sistemática?" },
  { id: "P-04", prompt: "¿Se utilizarán tecnologías de perfilamiento, puntuación, predicción o decisiones automatizadas sobre los titulares?" },
  { id: "P-05", prompt: "¿El proyecto involucra monitoreo sistemático de personas (videovigilancia, geolocalización, seguimiento en línea)?" },
  { id: "P-06", prompt: "¿Se transferirán datos personales a terceros (encargados o responsables independientes)?" },
  { id: "P-07", prompt: "¿Se transferirán datos personales fuera del territorio nacional?", helper: "Requiere verificación del nivel de protección equivalente conforme al Art. 37 LFPDPPP." },
  { id: "P-08", prompt: "¿El aviso de privacidad vigente cubre las nuevas finalidades del proyecto?", helper: "Si es No, se requiere actualizar el aviso antes de iniciar el tratamiento." },
  { id: "P-09", prompt: "¿Se han considerado mecanismos de seguridad técnica y administrativa adecuados para los datos que se tratarán?" },
  { id: "P-10", prompt: "¿Se han analizado los derechos de los titulares en el contexto de este proyecto (ARCO, portabilidad, oposición)?" },
  { id: "P-11", prompt: "¿El proyecto fue sometido a una revisión de seguridad de la información por el área de TI o el CISO?" },
  { id: "P-12", prompt: "¿Existe un mecanismo para eliminar o anonimizar los datos al final del ciclo de vida del proyecto?" },
] as const satisfies readonly QuestionDefinition[]

export type DpoSectionScore = {
  id: string
  title: string
  weight: number
  yes: number
  no: number
  na: number
  applicable: number
  total: number
  ratio: number
  weightedScore: number
  passes: boolean
}

export type DpoAccreditationAnalysis = {
  score: number
  level: string
  qualifies: boolean
  criticalInvalidation: boolean
  blockScores: DpoSectionScore[]
  criticalFindings: string[]
  observations: string[]
  actions: string[]
}

export type DpoFunctionalAnalysis = {
  score: number
  level: string
  qualifies: boolean
  functionScores: DpoSectionScore[]
  observations: string[]
  actions: string[]
}

export type DpoProjectEipdStatus = "obligatoria" | "recomendada" | "no-requerida"

export type DpoProjectAnalysis = {
  eipdStatus: DpoProjectEipdStatus
  eipdReasons: string[]
  pendingDictamen: boolean
  riskLevel: "Alto" | "Medio" | "Bajo"
  yesFindings: string[]
  missingSafeguards: string[]
}

export type DpoAccreditationDraft = {
  dpoName: string
  dpoRole: DpoRoleValue | ""
  dpoRoleOther: string
  dpoArea: DpoAreaValue | ""
  dpoAreaOther: string
  designationDate: string
  plannedNextReview: string
  notes: string
  responses: Record<string, DpoQuestionResponse>
}

export type DpoFunctionalDraft = {
  dpoName: string
  evaluationDate: string
  periodLabel: string
  plannedNextReview: string
  notes: string
  responses: Record<string, DpoQuestionResponse>
}

export type DpoProjectReviewDraft = {
  projectName: string
  projectSummary: string
  projectCategory: DpoProjectCategoryValue | ""
  projectCategoryOther: string
  promotingArea: string
  projectOwner: string
  requestDate: string
  reviewDeadline: string
  projectPhase: DpoProjectPhaseValue | ""
  estimatedBudget: string
  estimatedSubjects: number | ""
  combinesMultipleSources: boolean
  hasAutomatedDecisionsWithSignificantEffect: boolean
  crossBorderTransferDetails: string
  notes: string
  responses: Record<string, DpoQuestionResponse>
  dictamenResult: DpoProjectDictamenValue | ""
  dictamenFoundation: string
  dictamenConditions: string
  risksIdentified: string
  recommendations: string
  implementationDeadline: string
  followUpRequired: string
}

export type DpoAccreditationRecord = {
  id: string
  createdAt: string
  updatedAt: string
  source: "manual" | "migration"
  dpoName: string
  dpoRole: DpoRoleValue | ""
  dpoRoleOther: string
  dpoArea: DpoAreaValue | ""
  dpoAreaOther: string
  designationDate: string
  plannedNextReview: string
  notes: string
  responses: Record<string, DpoQuestionResponse>
  analysis: DpoAccreditationAnalysis
}

export type DpoFunctionalRecord = {
  id: string
  createdAt: string
  updatedAt: string
  source: "manual" | "migration"
  dpoName: string
  evaluationDate: string
  periodLabel: string
  plannedNextReview: string
  notes: string
  responses: Record<string, DpoQuestionResponse>
  analysis: DpoFunctionalAnalysis
}

export type DpoProjectReviewRecord = {
  id: string
  createdAt: string
  updatedAt: string
  projectCode: string
  projectName: string
  projectSummary: string
  projectCategory: DpoProjectCategoryValue | ""
  projectCategoryOther: string
  promotingArea: string
  projectOwner: string
  requestDate: string
  reviewDeadline: string
  projectPhase: DpoProjectPhaseValue | ""
  estimatedBudget: string
  estimatedSubjects: number | ""
  combinesMultipleSources: boolean
  hasAutomatedDecisionsWithSignificantEffect: boolean
  crossBorderTransferDetails: string
  notes: string
  responses: Record<string, DpoQuestionResponse>
  dictamenResult: DpoProjectDictamenValue | ""
  dictamenFoundation: string
  dictamenConditions: string
  risksIdentified: string
  recommendations: string
  implementationDeadline: string
  followUpRequired: string
  analysis: DpoProjectAnalysis
}

export type DpoComplianceSnapshot = {
  hasDPO: "si" | "no"
  dpoName: string
  plannedNextReview: string
  latestAccreditation?: {
    id: string
    score: number
    level: string
    criticalInvalidation: boolean
    updatedAt: string
  }
  latestFunctional?: {
    id: string
    score: number
    level: string
    updatedAt: string
  }
  projectStats: {
    total: number
    pendingDictamen: number
    eipdRequired: number
    eipdRecommended: number
  }
  evidenceCount: number
  updatedAt: string
}

export function formatDateLabel(value?: string) {
  if (!value) return "Sin fecha"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function getOptionLabel(options: readonly DpoOption[], value?: string) {
  if (!value) return ""
  return options.find((option) => option.value === value)?.label || value
}

function getAllQuestionDefinitions(definitions: readonly QuestionDefinition[]) {
  return definitions.reduce<Record<string, DpoQuestionResponse>>((acc, question) => {
    acc[question.id] = { answer: "", notes: "" }
    return acc
  }, {})
}

export function createAccreditationDraft(
  seed?: Partial<DpoAccreditationDraft> & { responses?: Record<string, DpoQuestionResponse> },
): DpoAccreditationDraft {
  const responses = ACCREDITATION_SECTIONS.flatMap((section) => section.questions)
  return {
    dpoName: seed?.dpoName || "",
    dpoRole: seed?.dpoRole || "",
    dpoRoleOther: seed?.dpoRoleOther || "",
    dpoArea: seed?.dpoArea || "",
    dpoAreaOther: seed?.dpoAreaOther || "",
    designationDate: seed?.designationDate || "",
    plannedNextReview: seed?.plannedNextReview || "",
    notes: seed?.notes || "",
    responses: {
      ...getAllQuestionDefinitions(responses),
      ...(seed?.responses || {}),
    },
  }
}

export function createFunctionalDraft(
  seed?: Partial<DpoFunctionalDraft> & { responses?: Record<string, DpoQuestionResponse> },
): DpoFunctionalDraft {
  const responses = FUNCTIONAL_SECTIONS.flatMap((section) => section.questions)
  return {
    dpoName: seed?.dpoName || "",
    evaluationDate: seed?.evaluationDate || new Date().toISOString().slice(0, 10),
    periodLabel: seed?.periodLabel || "",
    plannedNextReview: seed?.plannedNextReview || "",
    notes: seed?.notes || "",
    responses: {
      ...getAllQuestionDefinitions(responses),
      ...(seed?.responses || {}),
    },
  }
}

export function createProjectReviewDraft(
  seed?: Partial<DpoProjectReviewDraft> & { responses?: Record<string, DpoQuestionResponse> },
): DpoProjectReviewDraft {
  return {
    projectName: seed?.projectName || "",
    projectSummary: seed?.projectSummary || "",
    projectCategory: seed?.projectCategory || "",
    projectCategoryOther: seed?.projectCategoryOther || "",
    promotingArea: seed?.promotingArea || "",
    projectOwner: seed?.projectOwner || "",
    requestDate: seed?.requestDate || new Date().toISOString().slice(0, 10),
    reviewDeadline: seed?.reviewDeadline || "",
    projectPhase: seed?.projectPhase || "",
    estimatedBudget: seed?.estimatedBudget || "",
    estimatedSubjects: seed?.estimatedSubjects ?? "",
    combinesMultipleSources: seed?.combinesMultipleSources || false,
    hasAutomatedDecisionsWithSignificantEffect: seed?.hasAutomatedDecisionsWithSignificantEffect || false,
    crossBorderTransferDetails: seed?.crossBorderTransferDetails || "",
    notes: seed?.notes || "",
    responses: {
      ...getAllQuestionDefinitions(PROJECT_REVIEW_QUESTIONS),
      ...(seed?.responses || {}),
    },
    dictamenResult: seed?.dictamenResult || "",
    dictamenFoundation: seed?.dictamenFoundation || "",
    dictamenConditions: seed?.dictamenConditions || "",
    risksIdentified: seed?.risksIdentified || "",
    recommendations: seed?.recommendations || "",
    implementationDeadline: seed?.implementationDeadline || "",
    followUpRequired: seed?.followUpRequired || "",
  }
}

function levelFromScore(score: number) {
  if (score >= 90) return "Óptimo"
  if (score >= 70) return "Satisfactorio"
  if (score >= 50) return "En desarrollo"
  return "Crítico — acción inmediata"
}

function scoreQuestionSet(
  title: string,
  id: string,
  weight: number,
  minimumRatio: number,
  questions: readonly QuestionDefinition[],
  responses: Record<string, DpoQuestionResponse>,
): DpoSectionScore {
  let yes = 0
  let no = 0
  let na = 0

  questions.forEach((question) => {
    const answer = responses[question.id]?.answer
    if (answer === "si") yes += 1
    if (answer === "no") no += 1
    if (answer === "na") na += 1
  })

  const applicable = yes + no
  const ratio = applicable > 0 ? yes / applicable : 0

  return {
    id,
    title,
    weight,
    yes,
    no,
    na,
    applicable,
    total: questions.length,
    ratio,
    weightedScore: Math.round(ratio * weight * 100) / 100,
    passes: ratio >= minimumRatio,
  }
}

function buildObservationList(
  questions: readonly QuestionDefinition[],
  responses: Record<string, DpoQuestionResponse>,
  onlyNo = true,
) {
  return questions.flatMap((question) => {
    const response = responses[question.id]
    if (!response) return []
    if (onlyNo && response.answer !== "no") return []
    if (!onlyNo && response.answer === "") return []
    return [`${question.id} · ${question.prompt}${response.notes ? ` — ${response.notes}` : ""}`]
  })
}

export function analyzeAccreditation(draft: Pick<DpoAccreditationRecord, "responses">): DpoAccreditationAnalysis {
  const blockScores = ACCREDITATION_SECTIONS.map((section) =>
    scoreQuestionSet(section.title, section.id, section.weight, section.minimumRatio, section.questions, draft.responses),
  )
  const score = Math.round(blockScores.reduce((sum, section) => sum + section.weightedScore, 0))
  const criticalFindings = buildObservationList(ACCREDITATION_SECTIONS[0].questions, draft.responses)
  const observations = ACCREDITATION_SECTIONS.slice(1).flatMap((section) =>
    buildObservationList(section.questions, draft.responses),
  )
  const actions = [
    ...ACCREDITATION_SECTIONS.filter((section) => !blockScores.find((scoreItem) => scoreItem.id === section.id)?.passes).map(
      (section) => `Revisar y cerrar observaciones del ${section.title}.`,
    ),
  ]

  return {
    score,
    level: levelFromScore(score),
    qualifies: score >= 80 && criticalFindings.length === 0,
    criticalInvalidation: criticalFindings.length > 0,
    blockScores,
    criticalFindings,
    observations,
    actions,
  }
}

export function analyzeFunctional(draft: Pick<DpoFunctionalRecord, "responses">): DpoFunctionalAnalysis {
  const functionScores = FUNCTIONAL_SECTIONS.map((section) =>
    scoreQuestionSet(section.title, section.id, section.weight, section.minimumRatio, section.questions, draft.responses),
  )
  const score = Math.round(functionScores.reduce((sum, section) => sum + section.weightedScore, 0))
  const observations = FUNCTIONAL_SECTIONS.flatMap((section) =>
    buildObservationList(section.questions, draft.responses),
  )
  const actions = FUNCTIONAL_SECTIONS.filter(
    (section) => !functionScores.find((scoreItem) => scoreItem.id === section.id)?.passes,
  ).map((section) => `Fortalecer ${section.title} y documentar evidencia de cumplimiento.`)

  return {
    score,
    level: levelFromScore(score),
    qualifies: score >= 75,
    functionScores,
    observations,
    actions,
  }
}

export function analyzeProjectReview(draft: Pick<DpoProjectReviewDraft, "responses" | "estimatedSubjects" | "combinesMultipleSources" | "hasAutomatedDecisionsWithSignificantEffect" | "crossBorderTransferDetails" | "dictamenResult">): DpoProjectAnalysis {
  const getAnswer = (id: string) => draft.responses[id]?.answer === "si"
  const eipdReasons: string[] = []

  if (getAnswer("P-02")) {
    eipdReasons.push("Tratamiento de datos personales sensibles.")
  }
  if (getAnswer("P-05")) {
    eipdReasons.push("Monitoreo sistemático de personas.")
  }
  if (draft.hasAutomatedDecisionsWithSignificantEffect || getAnswer("P-04")) {
    eipdReasons.push("Decisiones automatizadas con impacto significativo.")
  }
  if (getAnswer("P-07") && getAnswer("P-02")) {
    eipdReasons.push("Transferencia internacional de datos sensibles.")
  }

  let eipdStatus: DpoProjectEipdStatus = "no-requerida"
  if (eipdReasons.length > 0) {
    eipdStatus = "obligatoria"
  } else if (
    draft.combinesMultipleSources ||
    (typeof draft.estimatedSubjects === "number" && draft.estimatedSubjects > 10000) ||
    getAnswer("P-03")
  ) {
    eipdStatus = "recomendada"
    if (draft.combinesMultipleSources) eipdReasons.push("Combinación de bases de datos de múltiples fuentes.")
    if (typeof draft.estimatedSubjects === "number" && draft.estimatedSubjects > 10000) {
      eipdReasons.push("Proyecto con más de 10,000 titulares afectados.")
    }
    if (getAnswer("P-03")) eipdReasons.push("Tratamiento a gran escala o sistemático.")
  }

  const yesFindings = PROJECT_REVIEW_QUESTIONS.filter((question) => draft.responses[question.id]?.answer === "si").map(
    (question) => `${question.id} · ${question.prompt}`,
  )

  const missingSafeguards = ["P-08", "P-09", "P-10", "P-11", "P-12"]
    .filter((id) => draft.responses[id]?.answer === "no")
    .map((id) => {
      const question = PROJECT_REVIEW_QUESTIONS.find((item) => item.id === id)
      return `${id} · ${question?.prompt || id}`
    })

  const riskLevel: DpoProjectAnalysis["riskLevel"] =
    eipdStatus === "obligatoria" || missingSafeguards.length >= 3
      ? "Alto"
      : eipdStatus === "recomendada" || missingSafeguards.length > 0
        ? "Medio"
        : "Bajo"

  return {
    eipdStatus,
    eipdReasons,
    pendingDictamen: !draft.dictamenResult,
    riskLevel,
    yesFindings,
    missingSafeguards,
  }
}

export function createAccreditationRecord(
  draft: DpoAccreditationDraft,
  source: "manual" | "migration" = "manual",
  createdAt?: string,
): DpoAccreditationRecord {
  const timestamp = createdAt || new Date().toISOString()
  return {
    id: secureRandomId("dpo-accreditation"),
    createdAt: timestamp,
    updatedAt: new Date().toISOString(),
    source,
    dpoName: draft.dpoName.trim(),
    dpoRole: draft.dpoRole,
    dpoRoleOther: draft.dpoRoleOther.trim(),
    dpoArea: draft.dpoArea,
    dpoAreaOther: draft.dpoAreaOther.trim(),
    designationDate: draft.designationDate,
    plannedNextReview: draft.plannedNextReview,
    notes: draft.notes.trim(),
    responses: draft.responses,
    analysis: analyzeAccreditation({ responses: draft.responses }),
  }
}

export function createFunctionalRecord(
  draft: DpoFunctionalDraft,
  source: "manual" | "migration" = "manual",
  createdAt?: string,
): DpoFunctionalRecord {
  const timestamp = createdAt || new Date().toISOString()
  return {
    id: secureRandomId("dpo-functional"),
    createdAt: timestamp,
    updatedAt: new Date().toISOString(),
    source,
    dpoName: draft.dpoName.trim(),
    evaluationDate: draft.evaluationDate,
    periodLabel: draft.periodLabel.trim(),
    plannedNextReview: draft.plannedNextReview,
    notes: draft.notes.trim(),
    responses: draft.responses,
    analysis: analyzeFunctional({ responses: draft.responses }),
  }
}

function buildProjectCode() {
  const year = new Date().getFullYear()
  return `PRY-DDP-${year}-${secureRandomId("pry").slice(-6).toUpperCase()}`
}

export function createProjectReviewRecord(draft: DpoProjectReviewDraft): DpoProjectReviewRecord {
  const analysis = analyzeProjectReview(draft)
  return {
    id: secureRandomId("dpo-project"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectCode: buildProjectCode(),
    projectName: draft.projectName.trim(),
    projectSummary: draft.projectSummary.trim(),
    projectCategory: draft.projectCategory,
    projectCategoryOther: draft.projectCategoryOther.trim(),
    promotingArea: draft.promotingArea.trim(),
    projectOwner: draft.projectOwner.trim(),
    requestDate: draft.requestDate,
    reviewDeadline: draft.reviewDeadline,
    projectPhase: draft.projectPhase,
    estimatedBudget: draft.estimatedBudget.trim(),
    estimatedSubjects: draft.estimatedSubjects,
    combinesMultipleSources: draft.combinesMultipleSources,
    hasAutomatedDecisionsWithSignificantEffect: draft.hasAutomatedDecisionsWithSignificantEffect,
    crossBorderTransferDetails: draft.crossBorderTransferDetails.trim(),
    notes: draft.notes.trim(),
    responses: draft.responses,
    dictamenResult: draft.dictamenResult,
    dictamenFoundation: draft.dictamenFoundation.trim(),
    dictamenConditions: draft.dictamenConditions.trim(),
    risksIdentified: draft.risksIdentified.trim(),
    recommendations: draft.recommendations.trim(),
    implementationDeadline: draft.implementationDeadline,
    followUpRequired: draft.followUpRequired.trim(),
    analysis,
  }
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

export function notifyDpoStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"))
  }
}

export function loadAccreditationHistory() {
  return safeRead<DpoAccreditationRecord[]>(DPO_STORAGE_KEYS.accreditationHistory, []).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export function saveAccreditationHistory(history: DpoAccreditationRecord[]) {
  safeWrite(DPO_STORAGE_KEYS.accreditationHistory, history)
}

export function loadFunctionalHistory() {
  return safeRead<DpoFunctionalRecord[]>(DPO_STORAGE_KEYS.functionalHistory, []).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export function saveFunctionalHistory(history: DpoFunctionalRecord[]) {
  safeWrite(DPO_STORAGE_KEYS.functionalHistory, history)
}

export function loadProjectReviews() {
  return safeRead<DpoProjectReviewRecord[]>(DPO_STORAGE_KEYS.projectReviews, []).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export function saveProjectReviews(history: DpoProjectReviewRecord[]) {
  safeWrite(DPO_STORAGE_KEYS.projectReviews, history)
}

export function buildDpoSnapshot(
  accreditationHistory: DpoAccreditationRecord[],
  functionalHistory: DpoFunctionalRecord[],
  projectReviews: DpoProjectReviewRecord[],
  evidenceFiles: StoredFile[],
): DpoComplianceSnapshot {
  const latestAccreditation = accreditationHistory[0]
  const latestFunctional = functionalHistory[0]

  return {
    hasDPO: latestAccreditation?.dpoName ? "si" : "no",
    dpoName: latestAccreditation?.dpoName || latestFunctional?.dpoName || "",
    plannedNextReview:
      latestAccreditation?.plannedNextReview || latestFunctional?.plannedNextReview || "",
    latestAccreditation: latestAccreditation
      ? {
          id: latestAccreditation.id,
          score: latestAccreditation.analysis.score,
          level: latestAccreditation.analysis.level,
          criticalInvalidation: latestAccreditation.analysis.criticalInvalidation,
          updatedAt: latestAccreditation.updatedAt,
        }
      : undefined,
    latestFunctional: latestFunctional
      ? {
          id: latestFunctional.id,
          score: latestFunctional.analysis.score,
          level: latestFunctional.analysis.level,
          updatedAt: latestFunctional.updatedAt,
        }
      : undefined,
    projectStats: {
      total: projectReviews.length,
      pendingDictamen: projectReviews.filter((review) => review.analysis.pendingDictamen).length,
      eipdRequired: projectReviews.filter((review) => review.analysis.eipdStatus === "obligatoria").length,
      eipdRecommended: projectReviews.filter((review) => review.analysis.eipdStatus === "recomendada").length,
    },
    evidenceCount: evidenceFiles.length,
    updatedAt: new Date().toISOString(),
  }
}

export function persistDpoSnapshot(snapshot: DpoComplianceSnapshot) {
  safeWrite(DPO_STORAGE_KEYS.snapshot, snapshot)
}

export function loadDpoSnapshot() {
  return safeRead<DpoComplianceSnapshot | null>(DPO_STORAGE_KEYS.snapshot, null)
}

export function getEvidenceScope(file: StoredFile): DpoEvidenceScope {
  const scope = file.metadata?.scope
  if (scope === "accreditation" || scope === "functional" || scope === "project") return scope
  const type = file.metadata?.documentType
  if (type === "designation" || type === "training" || type === "accreditation-support") return "accreditation"
  if (
    type === "functional-support" ||
    type === "activity-log" ||
    type === "report" ||
    type === "management-ack" ||
    type === "policy" ||
    type === "procedures"
  ) {
    return "functional"
  }
  if (type === "project-brief" || type === "project-dictamen") return "project"
  return "legacy"
}

export function validateResponses(
  questions: readonly QuestionDefinition[],
  responses: Record<string, DpoQuestionResponse>,
) {
  return questions.filter((question) => !responses[question.id] || responses[question.id].answer === "")
}

export function validateSectionCollection(
  sections: readonly { questions: readonly QuestionDefinition[] }[],
  responses: Record<string, DpoQuestionResponse>,
) {
  return sections.flatMap((section) => validateResponses(section.questions, responses))
}

export function cloneAccreditationRecordToDraft(record: DpoAccreditationRecord) {
  return createAccreditationDraft(record)
}

export function cloneFunctionalRecordToDraft(record: DpoFunctionalRecord) {
  return createFunctionalDraft(record)
}

export function cloneProjectRecordToDraft(record: DpoProjectReviewRecord) {
  return createProjectReviewDraft(record)
}

function inferLegacyAnswer(condition: boolean | undefined): DpoYesNoNa {
  if (condition === true) return "si"
  if (condition === false) return "no"
  return "na"
}

type DpoLegacySnapshot = {
  hasDPO?: string
  dpoName?: string
  dpoRole?: DpoRoleValue | ""
  dpoRoleOther?: string
  dpoArea?: DpoAreaValue | ""
  dpoAreaOther?: string
  designationDate?: string
  plannedNextReview?: string
  dpoTerm?: string
  dpoTermNotes?: string
  hasDesignationEvidence?: boolean
  designationDocuments?: unknown[]
  dpoCompetencies?: unknown[]
  hasTrainingEvidence?: boolean
  updatedAt?: string
  observations?: string
  hasPolicy?: string
  activities?: string[]
  reportsToManagement?: string
  documentedProcedures?: string[]
}

export function migrateLegacyDpoSnapshot(evidenceFiles: StoredFile[]) {
  if (typeof window === "undefined") return

  const accreditationHistory = loadAccreditationHistory()
  const functionalHistory = loadFunctionalHistory()
  const projectReviews = loadProjectReviews()

  if (accreditationHistory.length > 0 || functionalHistory.length > 0 || projectReviews.length > 0) {
    return
  }

  const legacy = safeRead<DpoLegacySnapshot | null>(DPO_STORAGE_KEYS.snapshot, null)
  if (!legacy || (!legacy.hasDPO && !legacy.dpoName)) {
    return
  }

  const accreditationDraft = createAccreditationDraft({
    dpoName: typeof legacy.dpoName === "string" ? legacy.dpoName : "",
    dpoRole: legacy.dpoRole || "",
    dpoRoleOther: legacy.dpoRoleOther || "",
    dpoArea: legacy.dpoArea || "",
    dpoAreaOther: legacy.dpoAreaOther || "",
    designationDate: legacy.designationDate || "",
    plannedNextReview: legacy.plannedNextReview || "",
    notes: "Registro migrado desde el cuestionario legado del Departamento de Datos Personales.",
  })

  accreditationDraft.responses["A-01"] = {
    answer: inferLegacyAnswer(Boolean(legacy.hasDesignationEvidence || legacy.designationDocuments?.length)),
    notes: "",
  }
  accreditationDraft.responses["A-03"] = {
    answer: inferLegacyAnswer(legacy.hasDPO === "si"),
    notes: "",
  }
  accreditationDraft.responses["A-06"] = {
    answer: inferLegacyAnswer(Boolean(legacy.plannedNextReview || legacy.dpoTerm)),
    notes: legacy.dpoTermNotes || "",
  }
  accreditationDraft.responses["B-01"] = {
    answer: inferLegacyAnswer(Boolean((legacy.dpoCompetencies || []).length || legacy.hasTrainingEvidence)),
    notes: "",
  }
  accreditationDraft.responses["B-05"] = {
    answer: inferLegacyAnswer(Boolean(legacy.hasTrainingEvidence)),
    notes: "",
  }
  accreditationDraft.responses["C-01"] = {
    answer: inferLegacyAnswer(Boolean(legacy.dpoArea)),
    notes: "",
  }
  accreditationDraft.responses["D-01"] = {
    answer: inferLegacyAnswer(Boolean(evidenceFiles.length)),
    notes: "",
  }

  const functionalDraft = createFunctionalDraft({
    dpoName: accreditationDraft.dpoName,
    evaluationDate: legacy.updatedAt?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
    periodLabel: "Migración histórica",
    plannedNextReview: legacy.plannedNextReview || "",
    notes: legacy.observations || "Registro migrado desde la evaluación legada del Departamento de Datos Personales.",
  })

  functionalDraft.responses["F1-01"] = {
    answer: inferLegacyAnswer(legacy.hasPolicy === "si"),
    notes: "",
  }
  functionalDraft.responses["F1-10"] = {
    answer: inferLegacyAnswer((legacy.activities || []).includes("auditorias")),
    notes: "",
  }
  functionalDraft.responses["F2-04"] = {
    answer: inferLegacyAnswer(legacy.reportsToManagement === "si"),
    notes: "",
  }
  functionalDraft.responses["F3-01"] = {
    answer: inferLegacyAnswer((legacy.activities || []).includes("capacitacion")),
    notes: "",
  }
  functionalDraft.responses["F4-01"] = {
    answer: inferLegacyAnswer((legacy.documentedProcedures || []).includes("arco")),
    notes: "",
  }
  functionalDraft.responses["F5-01"] = {
    answer: inferLegacyAnswer((legacy.documentedProcedures || []).includes("impacto")),
    notes: "",
  }
  functionalDraft.responses["F5-06"] = {
    answer: inferLegacyAnswer(legacy.reportsToManagement === "si"),
    notes: "",
  }

  const createdAt = legacy.updatedAt || new Date().toISOString()
  const nextAccreditationHistory = [createAccreditationRecord(accreditationDraft, "migration", createdAt)]
  const nextFunctionalHistory = [createFunctionalRecord(functionalDraft, "migration", createdAt)]

  saveAccreditationHistory(nextAccreditationHistory)
  saveFunctionalHistory(nextFunctionalHistory)
  persistDpoSnapshot(buildDpoSnapshot(nextAccreditationHistory, nextFunctionalHistory, [], evidenceFiles))
  notifyDpoStorageChange()
}
