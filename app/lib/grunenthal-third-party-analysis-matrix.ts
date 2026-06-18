export type GrunenthalThirdPartyAnalysisMatrixRow = {
  id: string
  sourceRow: number
  area: string
  thirdParty: string
  contract: string
  communication: string
  communicationType: "remision" | "transferencia" | "mixta" | "sin-comunicacion" | "no-aplica" | "otro"
}

export const GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX_SOURCE = {
  title: "Contratos analizados por Davara Abogado",
  sourceDocument: "Análisis de Relaciones Grünenthal",
  sourceTable: "Tabla resumen de contratos analizados",
  lastUpdated: "21 de octubre de 2025",
} as const

export const GRUNENTHAL_THIRD_PARTY_ANALYSIS_MATRIX: GrunenthalThirdPartyAnalysisMatrixRow[] = [
  {
    "id": "grt-analysis-matrix-001-cid-centro-integrador-de-datos-s-a-de-c-v-knobloch",
    "sourceRow": 4,
    "area": "COMEX",
    "thirdParty": "CID CENTRO INTEGRADOR DE DATOS, S.A. DE C.V. (Knobloch)",
    "contract": "Contrato de prestación de servicios para la entrega de base de datos electrónica",
    "communication": "Transferencia (GRT como Responsable Receptor)",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-002-negocios-de-innovacion-farmaceutica-s-c",
    "sourceRow": 5,
    "area": "COMEX",
    "thirdParty": "NEGOCIOS DE INNOVACIÓN FARMACÉUTICA, S.C.",
    "contract": "Contrato de prestación de servicios especializados consistentes en prestar servicios legales, de consultoría, mercadotecnia, asesoría, marcas, inteligencia competitiva, capacitación, tramitación ante autoridades administrativas.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-003-instituto-de-investigacion-e-innovacion-farmaceutica-a",
    "sourceRow": 6,
    "area": "COMEX",
    "thirdParty": "INSTITUTO DE INVESTIGACIÓN E INNOVACIÓN FARMACÉUTICA, A.C. (INEFAM)",
    "contract": "Contrato de Prestación de Servicios en donde GRT se suscribe a la entrega por parte de INEFAM de reportes de varios tipos",
    "communication": "Transferencia (GRT como Responsable Receptor)",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-004-d-ms-drugs-and-marketshare-s-c",
    "sourceRow": 7,
    "area": "COMEX",
    "thirdParty": "D&MS DRUGS AND MARKETSHARE, S.C",
    "contract": "Contrato de prestación de servicios para la generación de un sistema de incentivos.",
    "communication": "No hay comunicación de datos personales.",
    "communicationType": "sin-comunicacion"
  },
  {
    "id": "grt-analysis-matrix-005-veeva-systems-inc",
    "sourceRow": 8,
    "area": "COMEX",
    "thirdParty": "VEEVA SYSTEMS INC",
    "contract": "Formato de Orden de servicios.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-006-corad-meeting-planner-s-a-de-c-v",
    "sourceRow": 10,
    "area": "COMPRAS",
    "thirdParty": "CORAD MEETING PLANNER, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios de operación de grupos, organización y administración de Congresos y Convenciones, transportadora ejecutiva, casa productora, agencia de viajes y otros",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-007-oro-labs-inc",
    "sourceRow": 11,
    "area": "COMPRAS",
    "thirdParty": "ORO LABS, INC.",
    "contract": "Convenio de Nube",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-008-central-media-s-c",
    "sourceRow": 13,
    "area": "DIGITAL",
    "thirdParty": "CENTRAL MEDIA, S.C.",
    "contract": "Contrato de servicios de creación de contenido para Grünenthal",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-009-bespoke-advertising-s-a-de-c-v",
    "sourceRow": 14,
    "area": "DIGITAL",
    "thirdParty": "BESPOKE ADVERTISING, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios de marketing y publicidad.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-010-sinergis-s-a-de-c-v",
    "sourceRow": 15,
    "area": "DIGITAL",
    "thirdParty": "SINERGIS, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios de marketing, publicidad y administración de la plataforma beyond.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-011-leaseplan-de-mexico-s-a-de-c-v",
    "sourceRow": 17,
    "area": "FLOTILLA",
    "thirdParty": "LEASEPLAN DE MÉXICO, S.A. DE C.V.",
    "contract": "Contrato maestro de arrendamiento puro y servicios de gestión de flota.",
    "communication": "(1) Remisión (por la prestación de servicios de gestión de flotilla.) (2) Transferencia (si el Conductor /Empleado ejerce su derecho de adquisición de auto. )",
    "communicationType": "mixta"
  },
  {
    "id": "grt-analysis-matrix-012-bacher-zoppi-s-a-de-c-v",
    "sourceRow": 19,
    "area": "HUMAN RESOURCES",
    "thirdParty": "BACHER ZOPPI, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios especializados relacionados a recursos humanos.",
    "communication": "Remisión (respecto a la prestación de servicio del proveedor) Transferencia (respecto a la información de los trabajadores del prestador de servicio que son comunicados a GRT)",
    "communicationType": "mixta"
  },
  {
    "id": "grt-analysis-matrix-013-hays-ag",
    "sourceRow": 20,
    "area": "HUMAN RESOURCES",
    "thirdParty": "HAYS - AG",
    "contract": "Contrato de Prestación de Servicios de reclutamiento del personal.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-014-gointegro-mexico-s-a-de-c-v",
    "sourceRow": 21,
    "area": "HUMAN RESOURCES",
    "thirdParty": "GOINTEGRO MÉXICO, S.A. DE C.V.",
    "contract": "Contrato de suscripción de plataforma Grunetemex",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-015-fuo-servicios-s-a-de-c-v",
    "sourceRow": 22,
    "area": "HUMAN RESOURCES",
    "thirdParty": "FUO SERVICIOS, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios especializados de seguridad resguardo y vigilancia",
    "communication": "Remisión (respecto a la prestación de servicio del proveedor) Transferencia (respecto a la información de los trabajadores del prestador de servicio que son comunicados a GRT)",
    "communicationType": "mixta"
  },
  {
    "id": "grt-analysis-matrix-016-si-vale-mexico-s-a-de-c-v",
    "sourceRow": 23,
    "area": "HUMAN RESOURCES",
    "thirdParty": "SÍ VALE MÉXICO, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios relacionados a la emisión y gestión de monederos para trabajadores.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-017-beterfly-mexico-s-a-de-c-v",
    "sourceRow": 24,
    "area": "HUMAN RESOURCES",
    "thirdParty": "BETERFLY MÉXICO, S.A. DE C.V.",
    "contract": "Contrato de suscripción a plataforma de beneficios de bienestar para trabajadores.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-018-alphaplus-s-a-de-c-v",
    "sourceRow": 25,
    "area": "HUMAN RESOURCES",
    "thirdParty": "ALPHAPLUS, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios en materia de nómina y recursos humanos.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-019-toka-internacional-s-a-p-i-de-c-v",
    "sourceRow": 26,
    "area": "HUMAN RESOURCES",
    "thirdParty": "TOKA INTERNACIONAL, S.A.P.I. DE C.V",
    "contract": "Contrato de prestación de servicios de dispersión a través de la carga y recarga de recursos económicos.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-020-mp-executive-hunt-sa-de-cv",
    "sourceRow": 27,
    "area": "HUMAN RESOURCES",
    "thirdParty": "MP EXECUTIVE HUNT SA DE CV",
    "contract": "Contrato de Compra de Producto (Búsqueda de Representante CDMX/EM)",
    "communication": "Transferencias",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-021-sura-investment-management-mexico-s-a-de-c-v",
    "sourceRow": 28,
    "area": "HUMAN RESOURCES",
    "thirdParty": "SURA INVESTMENT MANAGEMENT MEXICO, S.A. DE C.V.",
    "contract": "Contrato de Comisión Mercantil y Prestación de Servicios.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-022-dhl-express-mexico-sa-de-cv",
    "sourceRow": 29,
    "area": "HUMAN RESOURCES",
    "thirdParty": "DHL EXPRESS MEXICO SA DE CV",
    "contract": "Contrato de General de Compra de productos. (Mensajería nacional)",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-023-cuesta-y-llaca-sc",
    "sourceRow": 30,
    "area": "HUMAN RESOURCES",
    "thirdParty": "CUESTA Y LLACA SC",
    "contract": "Contrato de General de Compra de productos. (Trámite migratorio)",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-024-safe-data-resources-s-a-de-c-v",
    "sourceRow": 31,
    "area": "HUMAN RESOURCES",
    "thirdParty": "SAFE DATA RESOURCES, S.A. DE C.V.",
    "contract": "Contrato de Depósito",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-025-empleado-tiempo-determinado",
    "sourceRow": 32,
    "area": "HUMAN RESOURCES",
    "thirdParty": "(Empleado tiempo determinado)",
    "contract": "Contrato Individual por tiempo determinado.",
    "communication": "N/A",
    "communicationType": "no-aplica"
  },
  {
    "id": "grt-analysis-matrix-026-empleado-tiempo-indeterminado",
    "sourceRow": 33,
    "area": "HUMAN RESOURCES",
    "thirdParty": "(Empleado tiempo indeterminado)",
    "contract": "Contrato Individual por tiempo indeterminado.",
    "communication": "N/A",
    "communicationType": "no-aplica"
  },
  {
    "id": "grt-analysis-matrix-027-sinefarma-s-a-de-c-v",
    "sourceRow": 35,
    "area": "INVESTIGACIÓN DE MERCADOS",
    "thirdParty": "SINEFARMA, S.A. DE C.V.",
    "contract": "Contrato de prestación de servicios de marketing.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-028-agencias-asociaciones-instituciones-de-salud",
    "sourceRow": 37,
    "area": "PRIMARY CARE",
    "thirdParty": "(Agencias/ Asociaciones / Instituciones de Salud. )",
    "contract": "Contrato de Patricinio",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-029-ups-scs-mexico-s-a-de-c-v",
    "sourceRow": 39,
    "area": "SUPPLY",
    "thirdParty": "UPS SCS (MÉXICO), S.A. DE C.V",
    "contract": "Contrato de prestación de servicios de almacenamiento, embalaje, surtido y empaque, preparación de pedidos y órdenes de entrega.",
    "communication": "Transferencia",
    "communicationType": "transferencia"
  },
  {
    "id": "grt-analysis-matrix-030-concur-technologies-inc",
    "sourceRow": 41,
    "area": "GLOBALES",
    "thirdParty": "CONCUR TECHNOLOGIES, INC",
    "contract": "Contrato de prestación de servicios de nube.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-031-microsoft-corporation",
    "sourceRow": 42,
    "area": "GLOBALES",
    "thirdParty": "MICROSOFT CORPORATION",
    "contract": "Contrato de licencia para uso de software y servicios en línea.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-032-sap-se",
    "sourceRow": 43,
    "area": "GLOBALES",
    "thirdParty": "SAP SE,",
    "contract": "Contrato de prestación de servicios de nube.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-033-salesforce-inc",
    "sourceRow": 44,
    "area": "GLOBALES",
    "thirdParty": "SALESFORCE, INC.",
    "contract": "Contrato de prestación de servicios de software.",
    "communication": "Remisión",
    "communicationType": "remision"
  },
  {
    "id": "grt-analysis-matrix-034-eversana-ireland-limited",
    "sourceRow": 45,
    "area": "GLOBALES",
    "thirdParty": "EVERSANA, IRELAND, LIMITED",
    "contract": "Contrato de prestación de servicios de",
    "communication": "Remisión",
    "communicationType": "remision"
  }
]
