import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  buildControlProfile,
  calculateBAALevel,
  getHighestRiskLevel,
  normalizeRisk,
} from "@/lib/security-controls";
import { GRUNENTHAL_CLIENT_NAME } from "@/lib/grunenthal-assets";
import type { Inventory } from "../types";

type PersonalDataItem =
  Inventory["subInventories"][number]["personalData"][number];
type SubInventoryItem = Inventory["subInventories"][number];
type AdditionalTransferItem =
  Inventory["subInventories"][number]["additionalTransfers"][number];
type AdditionalRemissionItem =
  Inventory["subInventories"][number]["additionalRemissions"][number];

type FieldMap = Record<string, unknown>;

const DEFAULT_ACCENT_COLOR = "#40BB6A";
const HEX_COLOR_REGEX = /^#?[0-9A-Fa-f]{6}$/;

type SupportedImageFormat = "PNG" | "JPEG" | "WEBP";
type RGB = { r: number; g: number; b: number };

const normalizeHexColor = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) return null;
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return `#${withoutHash.toUpperCase()}`;
};

const clampColor = (value: number) => Math.max(0, Math.min(255, value));

const lightenColor = (hex: string | undefined, amount = 0.2) => {
  const normalized = normalizeHexColor(hex) || DEFAULT_ACCENT_COLOR;
  const numeric = parseInt(normalized.slice(1), 16);
  const r = clampColor(
    Math.round(((numeric >> 16) & 0xff) + (255 - ((numeric >> 16) & 0xff)) * amount),
  );
  const g = clampColor(
    Math.round(((numeric >> 8) & 0xff) + (255 - ((numeric >> 8) & 0xff)) * amount),
  );
  const b = clampColor(
    Math.round((numeric & 0xff) + (255 - (numeric & 0xff)) * amount),
  );
  const toHex = (component: number) =>
    component.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToRgb = (hex?: string | null): RGB | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const numeric = parseInt(normalized.slice(1), 16);
  return {
    r: (numeric >> 16) & 0xff,
    g: (numeric >> 8) & 0xff,
    b: numeric & 0xff,
  };
};

const getContrastingTextColor = (rgb: RGB): [number, number, number] => {
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 186 ? [0, 0, 0] : [255, 255, 255];
};

const rgbArray = (rgb: RGB): [number, number, number] => [rgb.r, rgb.g, rgb.b];

const resetCharacterSpacing = (doc: jsPDF) => {
  const maybeSetCharSpace = (doc as unknown as { setCharSpace?: (value: number) => void })
    .setCharSpace;
  if (typeof maybeSetCharSpace === "function") {
    maybeSetCharSpace.call(doc, 0);
  }
};

const getImageFormatFromDataUrl = (dataUrl?: string | null): SupportedImageFormat => {
  if (!dataUrl) return "PNG";
  const lower = dataUrl.slice(0, 32).toLowerCase();
  if (lower.includes("image/png")) return "PNG";
  if (lower.includes("image/jpeg") || lower.includes("image/jpg")) return "JPEG";
  if (lower.includes("image/webp")) return "WEBP";
  return "PNG";
};

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bDireccion General\b/gi, "Dirección General"],
  [/\bGrunenthal\b/gi, GRUNENTHAL_CLIENT_NAME],
];

export const normalizeReportText = (value: unknown): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  const collapsed = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  return TEXT_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    collapsed,
  );
};

export const normalizePdfCellText = (value: unknown): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  const normalized = raw
    .normalize("NFC")
    .replace(/[\u00ad\u200b-\u200d\ufeff]/g, "")
    .replace(/\p{M}/gu, "");

  return normalized
    .split(/\r?\n/)
    .map((line) => normalizeReportText(line))
    .join("\n");
};

export const buildInventoryPdfFileName = (databaseName: unknown): string => {
  const safeName = normalizeReportText(databaseName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

  return `inventario_${safeName || "export"}.pdf`;
};

type CoverInfoInventory = Pick<
  Inventory,
  "databaseName" | "responsible" | "createdAt" | "updatedAt"
>;
type CoverInfoRow = { label: string; value: string; lines: string[] };

export const buildCoverInfoRows = (
  doc: Pick<jsPDF, "splitTextToSize">,
  inventory: Partial<CoverInfoInventory>,
  maxWidth: number,
): CoverInfoRow[] => {
  const entries: [string, string][] = [
    ["Nombre de la base de datos", normalizeReportText(inventory.databaseName) || "-"],
    [
      "Fecha de creación",
      inventory.createdAt
        ? new Date(inventory.createdAt).toLocaleDateString()
        : "-",
    ],
    [
      "Fecha de última edición",
      inventory.updatedAt
        ? new Date(inventory.updatedAt).toLocaleDateString()
        : "-",
    ],
    [
      "Responsable",
      normalizeReportText(inventory.responsible) || GRUNENTHAL_CLIENT_NAME,
    ],
  ];

  return entries.map(([label, value]) => {
    const text = `${label}: ${value}`;
    const lines = doc
      .splitTextToSize(text, maxWidth)
      .map((line: string) => normalizeReportText(line));
    return { label, value, lines };
  });
};

const normalizePurposes = (purposes?: string[]) =>
  Array.isArray(purposes)
    ? purposes
        .map((purpose) =>
          typeof purpose === "string"
            ? purpose.trim().replace(/\s+/g, " ")
            : "",
        )
        .filter((purpose): purpose is string => Boolean(purpose))
    : [];

const normalizePurposeKey = (purpose?: string | null) => {
  if (typeof purpose !== "string") return "__EMPTY__";
  const trimmed = purpose.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed.toLocaleLowerCase("es") : "__EMPTY__";
};

const aggregatePurposesToData = (
  data: PersonalDataItem[],
  purposesResolver: (item: PersonalDataItem) => string[] | undefined,
  labelResolver: (item: PersonalDataItem) => string,
) => {
  const aggregates = new Map<
    string,
    { display: string; labels: Set<string> }
  >();

  data.forEach((item) => {
    const label = labelResolver(item);
    const purposes = normalizePurposes(purposesResolver(item));
    if (purposes.length === 0) return;

    purposes.forEach((purpose) => {
      const key = normalizePurposeKey(purpose);
      const display = purpose.length > 0 ? purpose : "Sin descripción";
      const aggregate = aggregates.get(key);
      if (aggregate) {
        if (label.trim()) {
          aggregate.labels.add(label.trim());
        }
        return;
      }

      const labels = new Set<string>();
      if (label.trim()) {
        labels.add(label.trim());
      }
      aggregates.set(key, { display, labels });
    });
  });

  return Array.from(aggregates.values())
    .map((aggregate) => ({
      purpose: aggregate.display,
      dataLabels: Array.from(aggregate.labels).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      ),
    }))
    .sort((a, b) => a.purpose.localeCompare(b.purpose, "es", { sensitivity: "base" }));
};

const formatCategoryName = (category?: string) => {
  if (typeof category !== "string") return "-";
  const trimmed = category.trim();
  if (!trimmed) return "-";
  const cleaned = trimmed
    .replace(/^(?:datos?|dato)?\s*personales?(?:\s+de)?\s*/i, "")
    .trim();
  const finalValue = cleaned.length > 0 ? cleaned : trimmed;
  return finalValue.replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
};

const hasValue = (value: unknown): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => hasValue(item));
  return value !== null && value !== undefined;
};

const FIELD_LABELS: Record<string, string> = {
  databaseName: "Nombre de la base de datos",
  responsibleArea: "Área responsable",
  holderTypes: "Tipo de titulares",
  holdersVolume: "Volumen de titulares",
  accessibility: "Accesibilidad y número de personas que tienen acceso a la base de datos",
  environment: "Entorno de acceso",
  obtainingMethod: "Método de obtención",
  obtainingSource: "Fuente de obtención",
  otherHolderType: "Otro tipo de titular",
  otherLegalBasis: "Otra base legal",
  privacyNoticeFileName: "Aviso de privacidad (archivo)",
  consentRequired: "¿Requiere consentimiento?",
  consentException: "Excepciones de consentimiento",
  otherConsentException: "Otra excepción de consentimiento",
  consentMechanism: "Mecanismo de consentimiento",
  otherConsentMechanism: "Otro mecanismo de consentimiento",
  consentType: "Tipo de consentimiento",
  otherConsentType: "Otro tipo de consentimiento",
  consentFileName: "Consentimiento (archivo)",
  tacitDescription: "Descripción de consentimiento tácito",
  secondaryConsentType: "Tipo de consentimiento secundario",
  secondaryConsentMechanism: "Mecanismo de consentimiento secundario",
  secondaryTacitDescription: "Descripción de consentimiento tácito secundario",
  secondaryConsentFileName: "Consentimiento secundario (archivo)",
  secondaryExpresoForm: "Forma de consentimiento expreso secundario",
  secondaryExpresoEscritoForm: "Formulario expreso escrito secundario",
  processingArea: "Áreas de tratamiento",
  otherProcessingArea: "Otra área de tratamiento",
  processingSystem: "Sistema de tratamiento",
  processingSystemName: "Nombre o descripción del sistema",
  processingDescription: "Ciclo de vida del tratamiento",
  accessDescription: "Privilegios de acceso",
  otherAccessDescription: "Otros privilegios de acceso",
  dataLifecyclePrivileges: "Privilegios adicionales del ciclo de vida",
  additionalAreas: "Áreas adicionales involucradas",
  additionalAreasAccess: "Accesos otorgados a áreas adicionales",
  otherAdditionalAreasAccess: "Otro acceso de áreas adicionales",
  additionalAreasLegalBasis: "Base legal áreas adicionales",
  otherAdditionalAreasLegalBasis: "Otra base legal áreas adicionales",
  additionalAreasLegalBasisFileName: "Áreas adicionales base legal (archivo)",
  additionalAreasPurposes: "Finalidades de áreas adicionales",
  otherAdditionalAreasPurposes: "Otras finalidades de áreas adicionales",
  storageMethod: "Medio de almacenamiento",
  otherStorageMethod: "Otro medio de almacenamiento",
  physicalLocation: "Ubicación física",
  backupPeriodicity: "Periodicidad de respaldo",
  isBackedUp: "¿Se respalda?",
  backupDescription: "Descripción del respaldo",
  backupResponsible: "Responsable del respaldo",
  conservationTerm: "Plazo de conservación",
  conservationJustification: "Justificación de conservación",
  otherConservationJustification: "Otra justificación de conservación",
  conservationJustificationDetail: "Detalle de la justificación",
  conservationLegalBasis: "Base legal de conservación",
  processingTime: "Tiempo de tratamiento",
  postRelationshipProcessing: "Tratamiento posterior a la relación",
  legalConservation: "Disposición legal para conservar",
  otherLegalConservation: "Otra disposición legal de conservación",
  blockingTime: "Tiempo de bloqueo",
  legalPrescription: "Prescripción legal",
  otherLegalPrescription: "Otra prescripción legal",
  blockingLegalDisposition: "Disposición legal de bloqueo",
  deletionMethods: "Métodos de supresión",
  otherDeletionMethod: "Otro método de supresión",
  deletionMethod: "Método de supresión principal",
  dataTransfer: "¿Existe transferencia?",
  transferRecipient: "Tercero receptor",
  transferPurposes: "Finalidades de la transferencia",
  transferConsentRequired: "¿Requiere consentimiento?",
  transferExceptions: "Excepciones de consentimiento",
  transferConsentType: "Tipo de consentimiento",
  transferTacitDescription: "Descripción de consentimiento tácito",
  transferExpresoForm: "Forma de consentimiento expreso",
  transferOtherExpresoForm: "Otra forma de consentimiento expreso",
  transferExpresoEscritoForm: "Formulario expreso escrito",
  transferOtherExpresoEscritoForm: "Otro formulario expreso escrito",
  transferConsentFileName: "Consentimiento (archivo)",
  transferContractFileName: "Contrato o anexo (archivo)",
  transferLegalInstrument: "Instrumentos jurídicos",
  otherTransferLegalInstrument: "Otros instrumentos jurídicos",
  transferInAP: "¿Está en el Aviso de Privacidad?",
  dataRemission: "¿Existe remisión?",
  remissionRecipient: "Denominación social o nombre comercial",
  remissionPurposes: "Finalidades de la remisión",
  otherRemissionPurpose: "Otra finalidad de remisión",
  remissionContractFileName: "Evidencia de remisión (archivo)",
  remissionLegalInstrument: "Instrumentos jurídicos remisión",
  otherRemissionLegalInstrument: "Otros instrumentos jurídicos remisión",
};

type StepSection =
  | { type: "fields"; name: string; fields: string[] }
  | { type: "personalData" }
  | { type: "additionalAccesses" };

const STEP_SECTIONS: StepSection[] = [
  {
    type: "fields",
    name: "Área responsable y tipos de titulares",
    fields: ["responsibleArea", "holderTypes", "otherHolderType"],
  },
  {
    type: "fields",
    name: "Obtención y aviso de privacidad",
    fields: ["obtainingMethod", "obtainingSource", "privacyNoticeFileName"],
  },
  { type: "personalData" },
  {
    type: "fields",
    name: "Consentimiento para finalidades primarias",
    fields: [
      "consentRequired",
      "consentMechanism",
      "consentType",
      "tacitDescription",
      "consentException",
      "otherConsentException",
      "consentFileName",
    ],
  },
  {
    type: "fields",
    name: "Consentimiento para finalidades secundarias",
    fields: [
      "secondaryConsentType",
      "secondaryConsentMechanism",
      "secondaryTacitDescription",
      "secondaryExpresoForm",
      "secondaryExpresoEscritoForm",
      "secondaryConsentFileName",
    ],
  },
  {
    type: "fields",
    name: "Descripción del tratamiento",
    fields: [
      "processingArea",
      "otherProcessingArea",
      "processingSystem",
      "processingSystemName",
      "processingDescription",
      "accessDescription",
      "otherAccessDescription",
      "dataLifecyclePrivileges",
    ],
  },
  {
    type: "fields",
    name: "Áreas adicionales",
    fields: [
      "additionalAreas",
      "additionalAreasAccess",
      "otherAdditionalAreasAccess",
      "additionalAreasLegalBasis",
      "otherAdditionalAreasLegalBasis",
      "additionalAreasPurposes",
      "otherAdditionalAreasPurposes",
    ],
  },
  { type: "additionalAccesses" },
  {
    type: "fields",
    name: "Almacenamiento y respaldo",
    fields: [
      "storageMethod",
      "otherStorageMethod",
      "physicalLocation",
      "isBackedUp",
      "backupPeriodicity",
      "backupDescription",
      "backupResponsible",
    ],
  },
  {
    type: "fields",
    name: "Conservación y bloqueo",
    fields: [
      "conservationTerm",
      "conservationJustification",
      "otherConservationJustification",
      "conservationJustificationDetail",
      "conservationLegalBasis",
      "processingTime",
      "postRelationshipProcessing",
      "legalConservation",
      "otherLegalConservation",
      "blockingTime",
      "legalPrescription",
      "otherLegalPrescription",
      "blockingLegalDisposition",
    ],
  },
  {
    type: "fields",
    name: "Supresión",
    fields: ["deletionMethods", "otherDeletionMethod", "deletionMethod"],
  },
  {
    type: "fields",
    name: "Transferencias",
    fields: [
      "dataTransfer",
      "transferRecipient",
      "transferPurposes",
      "transferConsentRequired",
      "transferExceptions",
      "transferConsentType",
      "transferTacitDescription",
      "transferExpresoForm",
      "transferOtherExpresoForm",
      "transferExpresoEscritoForm",
      "transferOtherExpresoEscritoForm",
      "transferConsentFileName",
      "transferContractFileName",
      "transferLegalInstrument",
      "otherTransferLegalInstrument",
      "transferInAP",
    ],
  },
  {
    type: "fields",
    name: "Remisiones",
    fields: [
      "dataRemission",
      "remissionRecipient",
      "remissionPurposes",
      "otherRemissionPurpose",
      "remissionContractFileName",
      "remissionLegalInstrument",
      "otherRemissionLegalInstrument",
    ],
  },
];

const TRANSFER_FIELD_KEYS = STEP_SECTIONS.find(
  (section): section is Extract<StepSection, { type: "fields" }> =>
    section.type === "fields" && section.name === "Transferencias",
)?.fields;

const ADDITIONAL_TRANSFER_FIELD_KEYS: readonly string[] = [
  "dataTransfer",
  "transferRecipient",
  "transferPurposes",
  "transferConsentRequired",
  "transferExceptions",
  "transferConsentType",
  "transferTacitDescription",
  "transferContractFileName",
  "transferLegalInstrument",
  "transferInAP",
];

const REMISSION_FIELD_KEYS = STEP_SECTIONS.find(
  (section): section is Extract<StepSection, { type: "fields" }> =>
    section.type === "fields" && section.name === "Remisiones",
)?.fields;

const CONSENT_TYPE_LABELS: Record<string, string> = {
  expreso: "Expreso",
  tacito: "Tácito",
  expreso_escrito: "Expreso y por escrito",
  no_consent: "No se obtiene",
};

const CONSENT_MECHANISM_LABELS: Record<string, string> = {
  verbal: "Verbal",
  escrito: "Escrito",
  medios_electronicos: "Medios electrónicos",
  opticos: "Ópticos",
  signos_inequivocos: "Signos inequívocos",
  otra_tecnologia: "Otra tecnología",
  aviso_de_privacidad: "Puesta a disposición del aviso de privacidad",
  casilla_de_marcado: "Casilla de marcado",
  carta_de_consentimiento: "Carta de consentimiento",
};

const ACCESSIBILITY_LABELS: Record<string, string> = {
  A1: "Menos de 20",
  A2: "20 - 199",
  A3: "200 - 1,999",
  A4: "2,000 o más",
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  E1: "Acceso físico",
  E2: "Red interna",
  E3: "Wi-Fi corporativo",
  E4: "Redes de terceros / VPN externas",
  E5: "Internet público",
};

const prettifyValue = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeList = (list?: string[]) =>
  (list ?? [])
    .map((item) => item?.trim?.() ?? "")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

const listsAreEqual = (a?: string[], b?: string[]) =>
  JSON.stringify(normalizeList(a)) === JSON.stringify(normalizeList(b));

const formatList = (list?: string[]) =>
  list && list.length ? list.map(normalizePdfCellText).join(", ") : "Sin registro";

const formatConsentTypeValue = (value?: string) =>
  value ? CONSENT_TYPE_LABELS[value] ?? prettifyValue(value) : "Sin registro";

const formatConsentMechanismValue = (mechanism?: string, type?: string) => {
  if (!type || type === "no_consent") return "No aplica";
  return mechanism
    ? CONSENT_MECHANISM_LABELS[mechanism] ?? prettifyValue(mechanism)
    : "Sin registro";
};

const sanitizeSingleLine = (value?: string | null) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const sanitizeMultiline = (value?: string | null) => {
  if (typeof value !== "string") return "";
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines.join("\n");
};

const normalizeTransferFieldValue = (key: string, value: unknown) => {
  const singleLineKeys = [
    "transferRecipient",
    "transferOtherExpresoForm",
    "transferOtherExpresoEscritoForm",
    "transferConsentFileName",
    "transferContractFileName",
    "otherTransferLegalInstrument",
  ];

  const multilineKeys = [
    "transferPurposes",
    "transferTacitDescription",
    "transferExpresoForm",
    "transferExpresoEscritoForm",
  ];

  if (singleLineKeys.includes(key)) return sanitizeSingleLine(value as string);
  if (multilineKeys.includes(key)) return sanitizeMultiline(value as string);

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) =>
        typeof item === "string"
          ? item !== ""
          : typeof item !== "undefined" && item !== null,
      );
  }

  return value;
};

const mapTransferEntry = (
  data: FieldMap | SubInventoryItem,
  fieldKeys: readonly string[] | undefined = TRANSFER_FIELD_KEYS,
): FieldMap => {
  if (!fieldKeys) return {};

  const source = data as FieldMap;

  return fieldKeys.reduce<FieldMap>((acc, key) => {
    acc[key] = normalizeTransferFieldValue(key, source[key]);
    return acc;
  }, {});
};

const mapAdditionalTransferEntry = (
  transfer: AdditionalTransferItem,
): FieldMap => {
  const legalInstruments = Array.isArray(transfer.legalInstrument)
    ? transfer.legalInstrument
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (typeof transfer.otherLegalInstrument === "string") {
    const trimmed = transfer.otherLegalInstrument.trim();
    if (trimmed) {
      legalInstruments.push(trimmed);
    }
  }

  return mapTransferEntry(
    {
      dataTransfer: true,
      transferRecipient: transfer.recipient,
      transferPurposes: transfer.purposes,
      transferConsentRequired: transfer.consentRequired,
      transferExceptions: transfer.exceptions,
      transferConsentType: transfer.consentType,
      transferTacitDescription: transfer.tacitDescription,
      transferContractFileName: transfer.contractFileName,
      transferLegalInstrument: legalInstruments,
      transferInAP: transfer.inAP,
    },
    ADDITIONAL_TRANSFER_FIELD_KEYS,
  );
};

const mapRemissionEntry = (data: FieldMap | SubInventoryItem): FieldMap => {
  if (!REMISSION_FIELD_KEYS) return {};

  const source = data as FieldMap;

  return REMISSION_FIELD_KEYS.reduce<FieldMap>((acc, key) => {
    acc[key] = source[key];
    return acc;
  }, {});
};

const mapAdditionalRemissionEntry = (
  remission: AdditionalRemissionItem,
): FieldMap =>
  mapRemissionEntry({
    dataRemission: true,
    remissionRecipient: sanitizeSingleLine(remission.recipient),
    remissionPurposes: remission.purposes,
    otherRemissionPurpose: sanitizeSingleLine(remission.otherPurpose),
    remissionLegalInstrument: remission.legalInstrument,
    otherRemissionLegalInstrument: sanitizeSingleLine(
      remission.otherLegalInstrument,
    ),
    remissionContractFileName: sanitizeSingleLine(remission.contractFileName),
  });

const buildSectionRows = (
  entry: FieldMap,
  fieldKeys: readonly string[],
  usedFields: Set<string>,
): [string, string][] =>
  fieldKeys.reduce<[string, string][]>((rows, key) => {
    usedFields.add(key);
    const formatted = getField(entry, key);

    const hasMeaningfulValue =
      formatted !== "No lo completó" &&
      formatted !== "No subió archivo" &&
      formatted.trim() !== "";

    if (!hasMeaningfulValue) return rows;

    rows.push([FIELD_LABELS[key] || humanize(key), formatted]);

    return rows;
  }, []);

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase());

const PROCESSING_DESCRIPTION_MAP: Record<string, string> = {
  O: "Obtención",
  U: "Uso",
  D: "Divulgación",
  A: "Almacenamiento",
  B: "Bloqueo",
  S: "Supresión",
  Obtencion: "Obtención",
  Uso: "Uso",
  Divulgacion: "Divulgación",
  Almacenamiento: "Almacenamiento",
  Bloqueo: "Bloqueo",
  Supresion: "Supresión",
  "Supresión": "Supresión",
};

const formatAccessibilityValue = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "")
    return "No lo completó";

  const label = ACCESSIBILITY_LABELS[value];
  return label ? `${value} - ${label}` : value;
};

const formatEnvironmentValue = (value: unknown): string => {
  if (typeof value !== "string" || value.trim() === "")
    return "No lo completó";

  const label = ENVIRONMENT_LABELS[value];
  return label ? `${value} - ${label}` : value;
};

const formatProcessingAreaValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length === 0) return "No lo completó";

    const looksLikeCharacters = items.every((item) => item.length === 1);
    return looksLikeCharacters ? items.join("") : items.join(", ");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" ? trimmed : "No lo completó";
  }

  return "No lo completó";
};

const formatValue = (key: string, value: any): string => {
  if (key === "accessibility") {
    return formatAccessibilityValue(value);
  }
  if (key === "environment") {
    return formatEnvironmentValue(value);
  }
  if (key === "processingArea") {
    return formatProcessingAreaValue(value);
  }
  if (key === "processingDescription" && Array.isArray(value)) {
    const mapped = value.map((v) => PROCESSING_DESCRIPTION_MAP[v] || v);
    return mapped.length > 0 ? mapped.join(", ") : "No lo completó";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "No lo completó";
    if (value.some((v) => typeof v === "object")) {
      return JSON.stringify(value);
    }
    return value.join(", ");
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value === undefined || value === null || value === "")
    return "No lo completó";
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return keys.length ? JSON.stringify(value) : "No lo completó";
  }
  return String(value);
};

const getField = (obj: any, key: string) => {
  if (key.endsWith("FileName")) {
    return normalizePdfCellText(obj[key] || "No subió archivo");
  }
  return normalizePdfCellText(formatValue(key, obj[key]));
};

const isInternalPdfMetadataField = (key: string) =>
  key.startsWith("grunenthal") ||
  key.endsWith("File") ||
  key.endsWith("Files") ||
  key.endsWith("FileId") ||
  key.endsWith("FileIds") ||
  key.endsWith("FileName") ||
  key.endsWith("FileNames");

const normalizeAggregateValueKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();

const TABLE_VERTICAL_SPACING = 14;
const TITLE_TABLE_GAP = 8;

const getTableStartY = (doc: jsPDF, minY: number) => {
  const lastTable = (doc as any).lastAutoTable;
  if (lastTable && typeof lastTable.finalY === "number") {
    const nextY = lastTable.finalY + TABLE_VERTICAL_SPACING;
    return nextY > minY ? nextY : minY;
  }
  return minY;
};

export const generateInventoryPDF = (
  inventory: Inventory,
  _options: { currentUserName?: string } = {},
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const accentHex =
    normalizeHexColor(inventory.reportAccentColor) || DEFAULT_ACCENT_COLOR;
  const defaultAccentRgb: RGB = { r: 64, g: 187, b: 106 };
  const accentRgb = hexToRgb(accentHex) || defaultAccentRgb;
  const accentLightHex = lightenColor(accentHex, 0.35);
  const accentLightRgb = hexToRgb(accentLightHex) || accentRgb;
  const accentTextColor = getContrastingTextColor(accentRgb);
  const accentLightTextColor = getContrastingTextColor(accentLightRgb);

  const renderTableTitle = (
    title: string,
    options: { minY?: number } = {},
  ) => {
    const minY = options.minY ?? 28;
    let startY = getTableStartY(doc, minY);
    let titleY = startY - TITLE_TABLE_GAP;

    if (titleY < 20) {
      doc.addPage();
      (doc as any).lastAutoTable = undefined;
      startY = getTableStartY(doc, minY);
      titleY = startY - TITLE_TABLE_GAP;
    }

    doc.setFontSize(12);
    doc.setTextColor(...rgbArray(accentRgb));
    doc.text(title, 16, titleY);
    doc.setTextColor(0, 0, 0);

    return startY;
  };

  const aggregateSubInventoryField = (key: keyof SubInventoryItem & string) => {
    const formattedValues = inventory.subInventories
      .map((sub) => getField(sub as any, key))
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim() !== "" &&
          value !== "No lo completó",
      )
      .map((value) => value.replace(/\s+/g, " ").trim());

    if (formattedValues.length === 0) {
      return "-";
    }

    const uniqueValues = formattedValues.reduce((acc, value) => {
      const keyValue = normalizeAggregateValueKey(value);
      if (!acc.has(keyValue)) {
        acc.set(keyValue, value);
      }
      return acc;
    }, new Map<string, string>());

    return Array.from(uniqueValues.values()).join("\n");
  };

  const allPersonalData = inventory.subInventories.flatMap(
    (sub) => sub.personalData || [],
  );
  const highestRisk = normalizeRisk(getHighestRiskLevel(allPersonalData));
  const riskLabel = highestRisk ? highestRisk.toUpperCase() : "-";

  const profiles = inventory.subInventories.map((sub) =>
    buildControlProfile(sub),
  );
  const baaLevels = profiles
    .map((profile) => profile.baaLevel)
    .filter((level): level is number =>
      typeof level === "number" && !Number.isNaN(level),
    );
  const maxBaaLevel =
    baaLevels.length > 0 ? Math.max(...baaLevels) : null;
  const listTitles = Array.from(
    new Set(
      profiles.flatMap((profile) =>
        profile.lists.map((list) => list.title),
      ),
    ),
  );

  const subInventoryNames = inventory.subInventories
    .map((sub) => sub.databaseName?.trim())
    .filter((name): name is string => Boolean(name && name.length > 0));
  const formattedSubInventoryNames = subInventoryNames.map(
    (name, index) => `Subinventario ${index + 1}: ${name}`,
  );

  let headerBaseline = 28;
  if (inventory.companyLogoDataUrl) {
    try {
      doc.addImage(
        inventory.companyLogoDataUrl,
        getImageFormatFromDataUrl(inventory.companyLogoDataUrl),
        16,
        12,
        32,
        20,
        undefined,
        "FAST",
      );
      headerBaseline = 40;
    } catch (error) {
      console.error("No se pudo añadir el logo del inventario", error);
    }
  }

  const titleText = "Inventario de Datos personales";
  const titleFontSize = 22;
  const infoLineHeight = 6;
  const infoRowGap = 1.5;
  const titleInfoSpacing = 16;
  const coverInfoMaxWidth = Math.min(pageWidth - 60, 128);

  doc.setFontSize(titleFontSize);
  const titleHeight = doc.getTextDimensions(titleText).h;

  doc.setFontSize(12);
  const coverInfoRows = buildCoverInfoRows(doc, inventory, coverInfoMaxWidth);

  const infoHeight = coverInfoRows.reduce(
    (total, row) => total + row.lines.length * infoLineHeight + infoRowGap,
    0,
  );

  const contentBlockHeight = titleHeight + titleInfoSpacing + infoHeight;
  const topOffset = Math.max(
    headerBaseline,
    (pageHeight - contentBlockHeight) / 2,
  );
  const titleY = topOffset + titleHeight;

  doc.setFontSize(titleFontSize);
  doc.setTextColor(...rgbArray(accentRgb));
  resetCharacterSpacing(doc);
  doc.text(titleText, pageWidth / 2, titleY, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  let currentY = titleY + titleInfoSpacing;

  coverInfoRows.forEach((row) => {
    row.lines.forEach((line) => {
      resetCharacterSpacing(doc);
      doc.text(line, pageWidth / 2, currentY, {
        align: "center",
        charSpace: 0,
      });
      currentY += infoLineHeight;
    });
    currentY += infoRowGap;
  });

  doc.addPage();
  (doc as any).lastAutoTable = undefined;

  const tablesPageStartY = 28;

  const generalSummaryRows: [string, string][] = [
    ["Nombre de la base de datos", normalizeReportText(inventory.databaseName) || "-"],
    ["Volumen de titulares", aggregateSubInventoryField("holdersVolume")],
    [
      "Accesibilidad y número de personas que tienen acceso a la base de datos",
      aggregateSubInventoryField("accessibility"),
    ],
    ["Entorno de acceso", aggregateSubInventoryField("environment")],
  ];

  const generalSummaryStartY = renderTableTitle(
    "Datos iniciales del inventario",
    { minY: tablesPageStartY },
  );

  autoTable(doc, {
    startY: generalSummaryStartY,
    head: [["Campo", "Detalle"]],
    body: generalSummaryRows,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: {
      fillColor: rgbArray(accentRgb),
      textColor: accentTextColor,
      fontSize: 11,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 108 },
    },
    margin: { left: 16, right: 14 },
  });

  const riskSummaryRows: [string, string][] = [
    ["Nivel de riesgo más alto identificado", riskLabel],
    [
      "Nivel BAA máximo identificado",
      maxBaaLevel !== null ? String(maxBaaLevel) : "N/A",
    ],
    [
      "Listas aplicables",
      listTitles.length > 0 ? listTitles.join(", ") : "N/A",
    ],
  ];

  const riskSummaryStartY = renderTableTitle(
    "Resultados del análisis de riesgo",
  );

  autoTable(doc, {
    startY: riskSummaryStartY,
    head: [["Descripción", "Resultado"]],
    body: riskSummaryRows,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: {
      fillColor: rgbArray(accentLightRgb),
      textColor: accentLightTextColor,
      fontSize: 11,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 108 },
    },
    margin: { left: 16, right: 14 },
  });

  let postTableY =
    ((doc as any).lastAutoTable?.finalY ?? riskSummaryStartY) + TABLE_VERTICAL_SPACING;

  if (postTableY > pageHeight - 30) {
    doc.addPage();
    (doc as any).lastAutoTable = undefined;
    postTableY = 40;
  }

  doc.setDrawColor(...rgbArray(accentRgb));
  doc.setLineWidth(0.7);
  doc.line(25, postTableY, pageWidth - 25, postTableY);

  const introY = postTableY + 10;
  doc.setFontSize(10);
  const introLines = doc.splitTextToSize(
    "Este reporte incluye todas las respuestas capturadas en el inventario y sus subinventarios.",
    pageWidth - 60,
  );
  doc.text(introLines, 30, introY);

  doc.addPage();
  (doc as any).lastAutoTable = undefined;

  inventory.subInventories.forEach((sub, idx) => {
    doc.setFontSize(14);
    doc.setTextColor(...rgbArray(accentRgb));
    doc.text(
      `Subinventario ${idx + 1}: ${normalizeReportText(sub.databaseName) || "-"}`,
      18,
      20,
    );
    doc.setTextColor(0, 0, 0);

    const subHighestRisk = normalizeRisk(
      getHighestRiskLevel(sub.personalData),
    );
    const baaLevelValue = calculateBAALevel(
      subHighestRisk,
      sub.holdersVolume || "",
    );
    const controlProfile = buildControlProfile(sub);
    const baaLevelText = Number.isFinite(baaLevelValue)
      ? baaLevelValue.toString()
      : "N/A";
    const requiredControls = controlProfile.lists.reduce(
      (total, list) => total + list.required.length,
      0,
    );
    const optionalControls = controlProfile.lists.reduce(
      (total, list) => total + list.optional.length,
      0,
    );
    const totalControls = requiredControls + optionalControls;
    const coverageText =
      totalControls > 0
        ? `${requiredControls} requeridas · ${optionalControls} opcionales · ${totalControls} totales`
        : "N/A";

    const qaCriticalFields: Array<[string, unknown]> = [
      ["Área responsable", sub.responsibleArea],
      ["Volumen de titulares", sub.holdersVolume],
      ["Entorno", sub.environment],
      ["Accesibilidad", sub.accessibility],
      ["Método de obtención", sub.obtainingMethod],
      ["Fuente de obtención", sub.obtainingSource],
      ["Sistema de tratamiento", sub.processingSystemName || sub.processingSystem],
      ["Medio de almacenamiento", sub.storageMethod],
      ["Plazo de conservación", sub.conservationTerm || sub.processingTime],
      ["Método de supresión", sub.deletionMethod || sub.deletionMethods],
    ];

    const completedCriticalFields = qaCriticalFields.filter(([, value]) =>
      hasValue(value),
    );
    const missingCriticalFields = qaCriticalFields
      .filter(([, value]) => !hasValue(value))
      .map(([label]) => label);
    const qaScore = Math.round(
      (completedCriticalFields.length / qaCriticalFields.length) * 100,
    );
    const qaScoreText = `${qaScore}% (${completedCriticalFields.length}/${qaCriticalFields.length} campos críticos completos)`;

    const personalDataCount = Array.isArray(sub.personalData) ? sub.personalData.length : 0;
    const primaryPurposesCount = new Set(
      (sub.personalData || []).flatMap((item) => normalizePurposes(item.purposesPrimary)),
    ).size;
    const secondaryPurposesCount = new Set(
      (sub.personalData || []).flatMap((item) => normalizePurposes(item.purposesSecondary)),
    ).size;
    const qaAlerts = [
      personalDataCount === 0 ? "Sin tipos de datos personales documentados" : "",
      primaryPurposesCount === 0 ? "Sin finalidades primarias documentadas" : "",
      sub.consentRequired && !hasValue(sub.consentType)
        ? "Consentimiento requerido sin tipo definido"
        : "",
      !sub.isBackedUp ? "Sin respaldo activo documentado" : "",
    ].filter(Boolean);

    const listSummary =
      controlProfile.lists.length > 0
        ? Array.from(
            new Set(controlProfile.lists.map((list) => list.title)),
          ).join(", ")
        : "N/A";

    const subSummaryStartY = renderTableTitle(
      "Resumen general del subinventario",
      { minY: 44 },
    );

    autoTable(doc, {
      startY: subSummaryStartY,
      head: [["Resumen de seguridad", "Detalle"]],
      body: [
        [
          "Nivel de riesgo más alto",
          subHighestRisk ? subHighestRisk.toUpperCase() : "N/A",
        ],
        ["Análisis BAA - Nivel", baaLevelText],
        ["Entorno", formatEnvironmentValue(sub.environment)],
        ["Accesibilidad", formatAccessibilityValue(sub.accessibility)],
        ["Cobertura de controles", coverageText],
        ["Calidad de captura (QA)", qaScoreText],
        [
          "Datos y finalidades documentadas",
          `${personalDataCount} tipos de datos · ${primaryPurposesCount} finalidades primarias · ${secondaryPurposesCount} finalidades secundarias`,
        ],
        [
          "Alertas prioritarias",
          qaAlerts.length > 0
            ? qaAlerts.map((alert) => `• ${alert}`).join("\n")
            : "Sin alertas críticas detectadas",
        ],
        [
          "Campos críticos por completar",
          missingCriticalFields.length > 0
            ? missingCriticalFields.map((field) => `• ${field}`).join("\n")
            : "Captura crítica completa",
        ],
        ["Listas aplicables", listSummary],
      ],
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: {
        fillColor: rgbArray(accentRgb),
        textColor: accentTextColor,
        fontSize: 11,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 116 },
      },
      margin: { left: 16, right: 14 },
    });

    const securityMeasureRows = controlProfile.lists
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }))
      .flatMap((list) => {
        const requiredItems = list.required
          .slice()
          .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));
        const optionalItems = list.optional
          .slice()
          .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));

        const rows: [string, string, string][] = [];

        if (requiredItems.length > 0) {
          rows.push([
            list.title,
            requiredItems.length > 1 ? "Requeridas" : "Requerida",
            requiredItems.map((item) => `• ${item.title}`).join("\n"),
          ]);
        }

        if (optionalItems.length > 0) {
          rows.push([
            requiredItems.length > 0 ? "" : list.title,
            optionalItems.length > 1 ? "Opcionales" : "Opcional",
            optionalItems.map((item) => `• ${item.title}`).join("\n"),
          ]);
        }

        return rows;
      });

    if (securityMeasureRows.length > 0) {
      const measuresStartY = renderTableTitle(
        "Medidas de seguridad aplicables",
      );
      autoTable(doc, {
        startY: measuresStartY,
        head: [["Lista", "Tipo", "Medida"]],
        body: securityMeasureRows,
        styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
        headStyles: {
          fillColor: rgbArray(accentLightRgb),
          textColor: accentLightTextColor,
          fontSize: 10,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 36 },
          2: { cellWidth: 88 },
        },
        margin: { left: 16, right: 14 },
      });
    }

    const usedFields = new Set<string>();

    const validAccesses = Array.isArray(sub.additionalAccesses)
      ? sub.additionalAccesses.filter(
          (acc) =>
            acc &&
            (acc.area?.trim() || (acc.privileges && acc.privileges.length > 0)),
        )
      : [];

    const additionalTransfers = Array.isArray(sub.additionalTransfers)
      ? sub.additionalTransfers.filter(
          (transfer): transfer is AdditionalTransferItem =>
            Boolean(transfer && typeof transfer === "object"),
        )
      : [];

    const additionalRemissions = Array.isArray(sub.additionalRemissions)
      ? sub.additionalRemissions.filter(
          (remission): remission is AdditionalRemissionItem =>
            Boolean(remission && typeof remission === "object"),
        )
      : [];

    const personalData: PersonalDataItem[] = Array.isArray(sub.personalData)
      ? sub.personalData.filter(
          (d): d is PersonalDataItem =>
            Boolean(
              d &&
                (d.name?.trim() ||
                  d.category?.trim() ||
                  (d.purposesPrimary && d.purposesPrimary.length > 0) ||
                  (d.purposesSecondary && d.purposesSecondary.length > 0)),
            ),
        )
      : [];

    const activeSecondaryPurposeKeys = new Set<string>();
    personalData.forEach((item) => {
      normalizePurposes(item.purposesSecondary).forEach((purpose) => {
        activeSecondaryPurposeKeys.add(normalizePurposeKey(purpose));
      });
    });

    const secondaryConsentEntries = Object.entries(
      sub.secondaryPurposesConsent ?? {},
    )
      .filter(([, value]) => {
        if (!value) return false;
        return (
          Boolean(value.consentType) ||
          Boolean(value.consentMechanism) ||
          (Array.isArray(value.exceptions) && value.exceptions.length > 0)
        );
      })
      .filter(([purpose]) =>
        activeSecondaryPurposeKeys.has(normalizePurposeKey(purpose ?? "")),
      );

    STEP_SECTIONS.forEach((section) => {
      if (section.type === "fields") {
        const sectionData: [string, string][] = [];
        if (section.name === "Transferencias" && TRANSFER_FIELD_KEYS) {
          let transferNumber = 1;

          const transferTables: { label: string; rows: [string, string][] }[] = [];

          const baseTransferRows = buildSectionRows(
            mapTransferEntry(sub),
            TRANSFER_FIELD_KEYS,
            usedFields,
          );

          if (baseTransferRows.length > 0) {
            transferTables.push({
              label: `Transferencia ${transferNumber}`,
              rows: baseTransferRows,
            });
            transferNumber += 1;
          }

          additionalTransfers.forEach((transfer) => {
            const additionalRows = buildSectionRows(
              mapAdditionalTransferEntry(transfer),
              ADDITIONAL_TRANSFER_FIELD_KEYS,
              usedFields,
            );

            if (additionalRows.length > 0) {
              usedFields.add("additionalTransfers");
              transferTables.push({
                label: `Transferencia ${transferNumber}`,
                rows: additionalRows,
              });
              transferNumber += 1;
            }
          });

          transferTables.forEach((table) => {
            const startY = renderTableTitle(table.label);
            autoTable(doc, {
              startY,
              head: [[table.label, "Respuesta"]],
              body: table.rows,
              styles: { fontSize: 10, cellPadding: 2 },
              headStyles: {
                fillColor: rgbArray(accentRgb),
                textColor: accentTextColor,
                fontSize: 11,
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 62 },
                1: { cellWidth: 116 },
              },
              margin: { left: 16, right: 14 },
            });
          });

          return;
        } else if (section.name === "Remisiones" && REMISSION_FIELD_KEYS) {
          const remissionTables: { label: string; rows: [string, string][] }[] = [];
          let remissionNumber = 1;

          const baseRemissionRows = buildSectionRows(
            mapRemissionEntry(sub),
            REMISSION_FIELD_KEYS,
            usedFields,
          );

          if (baseRemissionRows.length > 0) {
            remissionTables.push({
              label: `Remisión ${remissionNumber}`,
              rows: baseRemissionRows,
            });
            remissionNumber += 1;
          }

          additionalRemissions.forEach((remission) => {
            const additionalRows = buildSectionRows(
              mapAdditionalRemissionEntry(remission),
              REMISSION_FIELD_KEYS,
              usedFields,
            );

            if (additionalRows.length > 0) {
              usedFields.add("additionalRemissions");
              remissionTables.push({
                label: `Remisión ${remissionNumber}`,
                rows: additionalRows,
              });
              remissionNumber += 1;
            }
          });

          remissionTables.forEach((table) => {
            const startY = renderTableTitle(table.label);
            autoTable(doc, {
              startY,
              head: [[table.label, "Respuesta"]],
              body: table.rows,
              styles: { fontSize: 10, cellPadding: 2 },
              headStyles: {
                fillColor: rgbArray(accentRgb),
                textColor: accentTextColor,
                fontSize: 11,
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 62 },
                1: { cellWidth: 116 },
              },
              margin: { left: 16, right: 14 },
            });
          });

          return;
        } else {
          section.fields.forEach((key) => {
            if (typeof (sub as any)[key] !== "undefined") {
              usedFields.add(key);
              const formatted = getField(sub as any, key);
              if (formatted !== "No lo completó") {
                sectionData.push([
                  FIELD_LABELS[key] || humanize(key),
                  formatted,
                ]);
              }
            }
          });
        }
        if (sectionData.length > 0) {
          const tableStartY = renderTableTitle(section.name);
          autoTable(doc, {
            startY: tableStartY,
            head: [[section.name, "Respuesta"]],
            body: sectionData,
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: {
              fillColor: rgbArray(accentRgb),
              textColor: accentTextColor,
              fontSize: 11,
              fontStyle: "bold",
            },
            columnStyles: {
              0: { cellWidth: 62 },
              1: { cellWidth: 116 },
            },
            margin: { left: 16, right: 14 },
          });
        }
        return;
      }

      if (section.type === "personalData") {
        if (personalData.length > 0) {
          const firstData = personalData[0];
          const allPrimariesSame = personalData.every((d) =>
            listsAreEqual(d.purposesPrimary, firstData.purposesPrimary),
          );
          const allSecondariesSame = personalData.every((d) =>
            listsAreEqual(d.purposesSecondary, firstData.purposesSecondary),
          );
          const primaryCommon = firstData?.purposesPrimary ?? [];
          const secondaryCommon = firstData?.purposesSecondary ?? [];

          const getPersonalDataLabel = (data: typeof personalData[number]) => {
            if (data.name?.trim()) return data.name.trim();
            if (data.category?.trim()) return formatCategoryName(data.category);
            return "Dato sin nombre";
          };

          const personalDataTableStartY = renderTableTitle(
            "Datos personales registrados",
          );
          autoTable(doc, {
            startY: personalDataTableStartY,
            head: [["Nombre", "Categoría", "Riesgo", "Proporcionalidad"]],
            body: personalData.map((d) => [
              d.name || "-",
              formatCategoryName(d.category),
              d.riesgo?.toString().toUpperCase() || "-",
              d.proporcionalidad ? "Sí" : "No",
            ]),
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: {
              fillColor: rgbArray(accentLightRgb),
              textColor: accentLightTextColor,
              fontSize: 10,
              fontStyle: "bold",
            },
            columnStyles: {
              0: { cellWidth: 52 },
              1: { cellWidth: 56 },
              2: { cellWidth: 30 },
              3: { cellWidth: 40 },
            },
            margin: { left: 16, right: 14 },
          });

          const primaryAggregates = aggregatePurposesToData(
            personalData,
            (d) => (allPrimariesSame ? primaryCommon : d.purposesPrimary),
            getPersonalDataLabel,
          );

          if (primaryAggregates.length > 0) {
            const primaryAggregatesStartY = renderTableTitle(
              "Finalidades primarias registradas",
            );
            autoTable(doc, {
              startY: primaryAggregatesStartY,
              head: [["Finalidades primarias"]],
              body: primaryAggregates.map((aggregate) => [
                aggregate.purpose,
              ]),
              styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
              headStyles: {
                fillColor: rgbArray(accentLightRgb),
                textColor: accentLightTextColor,
                fontSize: 10,
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 178 },
              },
              margin: { left: 16, right: 14 },
            });
          }

          type SecondaryConsentEntry =
            (typeof secondaryConsentEntries)[number][1];
          type SecondaryAggregate = {
            display: string;
            dataLabels: Set<string>;
            consent?: SecondaryConsentEntry;
          };

          const secondaryAggregates = new Map<string, SecondaryAggregate>();

          const getSecondaryAggregate = (
            purpose: string | null | undefined,
          ): SecondaryAggregate => {
            const normalized = normalizePurposeKey(purpose);
            const trimmed = typeof purpose === "string" ? purpose.trim() : "";
            const existing = secondaryAggregates.get(normalized);
            if (existing) return existing;
            const aggregate: SecondaryAggregate = {
              display: trimmed.length > 0 ? trimmed : "Sin descripción",
              dataLabels: new Set<string>(),
            };
            secondaryAggregates.set(normalized, aggregate);
            return aggregate;
          };

          personalData.forEach((dataItem) => {
            const purposes = normalizePurposes(
              allSecondariesSame ? secondaryCommon : dataItem.purposesSecondary,
            );
            if (purposes.length === 0) return;
            const label = getPersonalDataLabel(dataItem);
            purposes.forEach((purpose) => {
              const aggregate = getSecondaryAggregate(purpose);
              if (label.trim()) {
                aggregate.dataLabels.add(label.trim());
              }
            });
          });

          secondaryConsentEntries.forEach(([purpose, consent]) => {
            const aggregate = getSecondaryAggregate(purpose || "");
            aggregate.consent = consent;
          });

          const secondaryRows = Array.from(secondaryAggregates.values())
            .sort((a, b) => a.display.localeCompare(b.display))
            .map((aggregate) => {
              const consent = aggregate.consent;
              return [
                aggregate.display,
                formatConsentTypeValue(consent?.consentType),
                formatConsentMechanismValue(
                  consent?.consentMechanism,
                  consent?.consentType,
                ),
              ];
            });

          if (secondaryRows.length > 0) {
            if (secondaryConsentEntries.length > 0) {
              usedFields.add("secondaryPurposesConsent");
            }

            const secondaryCombinedStartY = renderTableTitle(
              "Finalidades secundarias y consentimiento asociado",
            );
            autoTable(doc, {
              startY: secondaryCombinedStartY,
              head: [[
                "Finalidad secundaria",
                "Tipo de consentimiento",
                "Mecanismo",
              ]],
              body: secondaryRows,
              styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
              headStyles: {
                fillColor: rgbArray(accentLightRgb),
                textColor: accentLightTextColor,
                fontSize: 10,
                fontStyle: "bold",
              },
              columnStyles: {
                0: { cellWidth: 74 },
                1: { cellWidth: 42 },
                2: { cellWidth: 72 },
              },
              margin: { left: 16, right: 14 },
            });
          }

        } else {
          const fallbackY = (doc as any).lastAutoTable
            ? (doc as any).lastAutoTable.finalY + 12
            : 90;
          doc.setFontSize(9);
          if (fallbackY > pageHeight - 20) {
            doc.addPage();
            (doc as any).lastAutoTable = undefined;
            doc.text("No hay datos personales registrados.", 20, 20);
          } else {
            doc.text("No hay datos personales registrados.", 20, fallbackY);
          }
        }
        return;
      }

      if (section.type === "additionalAccesses") {
        if (validAccesses.length > 0) {
          usedFields.add("additionalAccesses");
          const accessesTableStartY = renderTableTitle(
            "Accesos adicionales registrados",
          );
          autoTable(doc, {
            startY: accessesTableStartY,
            head: [["Área adicional", "Privilegios"]],
            body: validAccesses.map((acc) => {
              const privilegesText =
                acc.privileges && acc.privileges.length
                  ? acc.privileges
                      .map((privilege) =>
                        privilege === "Otros" && acc.otherPrivilege?.trim()
                          ? `${privilege} (${acc.otherPrivilege.trim()})`
                          : privilege,
                      )
                      .join(", ")
                  : "No especificó";
              return [acc.area || "No especificó", privilegesText];
            }),
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: {
              fillColor: rgbArray(accentRgb),
              textColor: accentTextColor,
              fontSize: 11,
              fontStyle: "bold",
            },
            margin: { left: 16, right: 14 },
          });
        }
      }
    });

    const remaining = Object.keys(sub).filter(
      (k) =>
        k !== "personalData" &&
        k !== "id" &&
        k !== "secondaryPurposesConsent" &&
        k !== "additionalAccesses" &&
        k !== "additionalTransfers" &&
        !usedFields.has(k) &&
        !k.startsWith("showOther") &&
        !isInternalPdfMetadataField(k),
    );
    const otherData: [string, string][] = [];
    remaining.forEach((key) => {
      const formatted = getField(sub as any, key);
      if (formatted !== "No lo completó") {
        otherData.push([FIELD_LABELS[key] || humanize(key), formatted]);
      }
    });
    if (otherData.length > 0) {
      const otherDataStartY = renderTableTitle("Otros datos capturados");
      autoTable(doc, {
        startY: otherDataStartY,
        head: [["Otros datos capturados", "Respuesta"]],
        body: otherData,
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: {
          fillColor: rgbArray(accentRgb),
          textColor: accentTextColor,
          fontSize: 11,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 62 },
          1: { cellWidth: 116 },
        },
        margin: { left: 16, right: 14 },
      });
    }

    if (idx < inventory.subInventories.length - 1) {
      doc.addPage();
      (doc as any).lastAutoTable = undefined;
    }
  });

  doc.save(buildInventoryPdfFileName(inventory.databaseName));
};
