"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, FileDown, FileText, Plus, Search, Trash2 } from "lucide-react";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { ArcoModuleShell } from "@/components/arco-module-shell";
import {
  THIRD_PARTY_CONTRACTS_META,
  THIRD_PARTY_CONTRACTS_NAV,
} from "@/components/arco-module-config";
import { secureRandomId } from "@/lib/secure-random";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// @ts-ignore
import jsPDF from "jspdf";
import { createFileURL, getFileById, saveFile, type StoredFile } from "@/lib/fileStorage";
import { canOfferFilePreview } from "@/lib/file-preview";
import type { AttachmentDefinition, AttachmentMeta, ContractMeta } from "../types";

const INTERNAL_AREAS_BASE = [
  "Jurídico / Cumplimiento",
  "Compras / Suministros",
  "Recursos Humanos",
  "Tecnología / Sistemas",
  "Dirección General",
  "Operaciones",
  "Finanzas",
];

const CONTRACT_TYPES_BASE = [
  "Contrato de remisión",
  "Contrato de transferencia",
  "Acuerdo de corresponsabilidad",
  "Contrato marco",
  "Servicios recurrentes",
];

const THIRD_PARTY_TYPES = [
  "Proveedor / Encargado",
  "Responsable receptor (transferencia)",
  "Corresponsable",
  "Consultor / Asesor externo",
  "Otro",
];

const SERVICE_TYPES = [
  "Nómina o gestión de personal",
  "Soporte técnico o mantenimiento",
  "Marketing o CRM",
  "Servicios en la nube / hosting",
  "Seguridad física o videovigilancia",
  "Auditoría o consultoría",
  "Transporte / logística",
  "Salud / seguros / bienestar",
  "Otro",
];

const DATA_CATEGORIES = [
  "Identificativos",
  "Laborales",
  "Académicos",
  "Financieros / bancarios",
  "De salud",
  "De geolocalización",
  "Biométricos",
  "Otros",
];

const VOLUME_OPTIONS = ["1–100", "101–1,000", "1,001–10,000", "Más de 10,000"];

const RELATION_TYPES = [
  "Remisión (encargado del tratamiento)",
  "Transferencia nacional",
  "Transferencia internacional",
  "Corresponsabilidad",
  "Otro",
];

const INSTRUMENT_TYPES = [
  "Contrato de prestación de servicios",
  "Contrato de remisión",
  "Contrato de transferencia",
  "Acuerdo de corresponsabilidad",
  "Cláusulas tipo / modelo",
  "DPA (Data Processing Agreement)",
  "Otro",
];

const BASE_LEGAL_OPTIONS = [
  "Consentimiento del titular",
  "Relación contractual",
  "Mandato legal o judicial",
  "Interés legítimo",
  "Otro",
];

const GUARANTEE_OPTIONS = [
  "Cláusulas contractuales tipo (SCCs)",
  "Normas corporativas vinculantes (BCRs)",
  "Consentimiento expreso e informado",
  "Acuerdo internacional o autoridad competente",
  "Otro",
];

const REVIEW_FREQUENCIES = ["Anual", "Semestral", "Trimestral", "Por evento"];

const REMINDER_OPTIONS = ["90", "60", "30"];

const RISK_LEVELS: Array<ContractMeta["riskLevel"]> = ["bajo", "medio", "alto"];

const EVIDENCE_OPTIONS = [
  "Contrato firmado",
  "Anexo de confidencialidad",
  "Anexo técnico de medidas de seguridad",
  "Políticas de privacidad del tercero",
  "Certificaciones (ISO 27001, SOC 2, etc.)",
  "Auditorías o revisiones",
  "Bitácora de cumplimiento",
];

const DOCUMENT_DEFINITIONS: { value: AttachmentDefinition; label: string }[] = [
  { value: "principal", label: "Contrato principal" },
  { value: "modificatorio", label: "Modificatorio" },
  { value: "adendum", label: "Adendum" },
  { value: "anexo", label: "Anexo" },
  { value: "dpa", label: "DPA / Acuerdo de tratamiento" },
  { value: "garantias", label: "Garantías / certificaciones" },
  { value: "evidencia", label: "Evidencias de cumplimiento" },
];

type DocumentItem = {
  id: string;
  file: File;
  definition: AttachmentDefinition;
};

type ArrayField =
  | "areas"
  | "thirdPartyTypes"
  | "serviceTypes"
  | "dataCategories"
  | "instrumentTypes"
  | "baseLegal"
  | "guarantees"
  | "evidenceAvailable"
  | "reminders";

type HistoryMetrics = {
  total: number;
  statusCounts: Record<ContractMeta["contractStatus"], number>;
  expiringIn30: number;
  expiringIn90: number;
  remisionCoverage: number;
  transferenciasGarantizadas: number;
  transferenciasSinGarantia: number;
  remisionSinDpa: number;
  averageSignatureLead: number | null;
  reviewsVigentes: number;
};

const baseSchema = z.object({
    contractTitle: z.string().min(1, "El título del contrato es obligatorio"),
    internalCode: z.string().min(1, "Capture el código interno"),
    contractType: z.string().min(1, "Seleccione el tipo de contrato"),
    thirdPartyTypes: z.array(z.string()).min(1, "Seleccione al menos un tipo de tercero"),
    thirdPartyTypeOther: z.string().optional(),
    thirdPartyName: z.string().min(1, "Capture la razón social del tercero"),
    rfc: z.string().optional(),
    address: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email("Ingrese un correo válido").optional().or(z.literal("")),
    areas: z.array(z.string()).min(1, "Seleccione al menos un área interna"),
    internalAreaOther: z.string().optional(),
    serviceTypes: z.array(z.string()).min(1, "Seleccione al menos un servicio"),
    serviceOther: z.string().optional(),
    treatmentPurpose: z.string().min(1, "Describa la finalidad del tratamiento"),
    dataCategories: z.array(z.string()).min(1, "Seleccione al menos una categoría"),
    dataCategoriesOther: z.string().optional(),
    dataVolume: z.string().min(1, "Seleccione el volumen aproximado"),
    relationType: z.string().min(1, "Seleccione el tipo de relación jurídica"),
    instrumentTypes: z.array(z.string()).min(1, "Seleccione los instrumentos aplicables"),
    instrumentOther: z.string().optional(),
    formalized: z.enum(["si", "no"]),
    formalizationReason: z.string().optional(),
    baseLegal: z.array(z.string()).min(1, "Seleccione la base legal"),
    baseLegalOther: z.string().optional(),
    guarantees: z.array(z.string()),
    guaranteesOther: z.string().optional(),
    contractValidity: z.string().min(1, "Capture la vigencia"),
    signatureDate: z.string().optional(),
    startDate: z.string().min(1, "Seleccione la fecha de inicio"),
    expirationDate: z.string().min(1, "Seleccione la fecha de vencimiento"),
    durationType: z.string().min(1, "Seleccione la duración"),
    reviewFrequency: z.string().min(1, "Seleccione la periodicidad"),
    terminationClause: z.boolean(),
    terminationNotes: z.string().optional(),
    reminders: z.array(z.string()),
    linkedInventories: z.string().optional(),
    riskLevel: z.enum(["bajo", "medio", "alto"]),
    riskNotes: z.string().optional(),
    versioningNotes: z.string().optional(),
    reviewLog: z.string().optional(),
    communicationType: z.string().min(1, "Seleccione el tipo de comunicación"),
    communicationDetails: z.string().optional(),
    clauseRegulation: z.string().min(1, "Capture la cláusula regulatoria"),
    complianceNeeds: z.string().optional(),
    evidenceAvailable: z.array(z.string()),
    evidenceNotes: z.string().optional(),
    responsibleName: z.string().optional(),
    responsibleRole: z.string().optional(),
    lastReview: z.string().optional(),
    nextReview: z.string().optional(),
    legalInstruments: z
      .array(
        z.object({
          file: z.any(),
          definition: z.string(),
        }),
      )
      .optional(),
  });

const applyBaseRefinements = (data: z.infer<typeof baseSchema>, ctx: z.RefinementCtx) => {
  if (data.thirdPartyTypes.includes("Otro") && !data.thirdPartyTypeOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["thirdPartyTypeOther"],
      message: "Especifique el tipo de tercero",
    });
  }
  if (data.serviceTypes.includes("Otro") && !data.serviceOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["serviceOther"],
      message: "Describa el servicio contratado",
    });
  }
  if (data.dataCategories.includes("Otros") && !data.dataCategoriesOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataCategoriesOther"],
      message: "Especifique la categoría",
    });
  }
  if (data.instrumentTypes.includes("Otro") && !data.instrumentOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["instrumentOther"],
      message: "Describe el instrumento aplicable",
    });
  }
  if (data.baseLegal.includes("Otro") && !data.baseLegalOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["baseLegalOther"],
      message: "Capture la base legal",
    });
  }
  if (data.formalized === "no" && !data.formalizationReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["formalizationReason"],
      message: "Indique el motivo",
    });
  }
  if (data.relationType === "Transferencia internacional" && data.guarantees.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["guarantees"],
      message: "Seleccione las garantías aplicables",
    });
  }
};

const specificSchema = baseSchema
  .extend({
    contractMode: z.literal("especifico"),
    providerIdentity: z.string().min(1, "Capture la identidad del proveedor"),
  })
  .superRefine(applyBaseRefinements);

const marcoSchema = baseSchema
  .extend({
    contractMode: z.literal("marco"),
    contractorType: z.string().min(1, "Capture el tipo de contratante"),
  })
  .superRefine(applyBaseRefinements);

const contractSchema = z.discriminatedUnion("contractMode", [specificSchema, marcoSchema]);

type FormValues = z.infer<typeof contractSchema>;

const buildDefaultValues = (mode: "marco" | "especifico"): FormValues => {
  const common = {
    contractTitle: "",
    internalCode: "",
    contractType: CONTRACT_TYPES_BASE[0],
    thirdPartyTypes: [] as string[],
    thirdPartyTypeOther: "",
    thirdPartyName: "",
    rfc: "",
    address: "",
    contactName: "",
    contactEmail: "",
    areas: [] as string[],
    internalAreaOther: "",
    serviceTypes: [] as string[],
    serviceOther: "",
    treatmentPurpose: "",
    dataCategories: [] as string[],
    dataCategoriesOther: "",
    dataVolume: "",
    relationType: "",
    instrumentTypes: [] as string[],
    instrumentOther: "",
    formalized: "si" as const,
    formalizationReason: "",
    baseLegal: [] as string[],
    baseLegalOther: "",
    guarantees: [] as string[],
    guaranteesOther: "",
    contractValidity: "",
    signatureDate: "",
    startDate: "",
    expirationDate: "",
    durationType: "",
    reviewFrequency: REVIEW_FREQUENCIES[0],
    terminationClause: true,
    terminationNotes: "",
    reminders: [...REMINDER_OPTIONS],
    linkedInventories: "",
    riskLevel: "medio" as const,
    riskNotes: "",
    versioningNotes: "",
    reviewLog: "",
    communicationType: "",
    communicationDetails: "",
    clauseRegulation: "",
    complianceNeeds: "",
    evidenceAvailable: [] as string[],
    evidenceNotes: "",
    responsibleName: "",
    responsibleRole: "",
    lastReview: "",
    nextReview: "",
    legalInstruments: [],
  } satisfies Omit<FormValues, "contractMode" | "providerIdentity" | "contractorType">;

  if (mode === "marco") {
    return {
      contractMode: "marco",
      contractorType: "",
      ...common,
    } as FormValues;
  }

  return {
    contractMode: "especifico",
    providerIdentity: "",
    ...common,
  } as FormValues;
};

const formatDate = (value: string) => {
  if (!value) return "No definido";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

const determineStatus = (expirationDate: string): ContractMeta["contractStatus"] => {
  if (!expirationDate) return "sin_definir";
  const today = new Date();
  const exp = new Date(expirationDate);
  if (Number.isNaN(exp.getTime())) return "sin_definir";
  const diff = exp.getTime() - today.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "vencido";
  if (days <= 90) return "por_vencer";
  return "vigente";
};

const buildFileMetadata = (values: FormValues, contractId: string, extra: Record<string, unknown> = {}) => {
  const baseMetadata: Record<string, unknown> = {
    contractId,
    contractTitle: values.contractTitle,
    internalCode: values.internalCode,
    contractType: values.contractType,
    contractMode: values.contractMode,
    providerIdentity: values.contractMode === "especifico" ? values.providerIdentity : undefined,
    contractorType: values.contractMode === "marco" ? values.contractorType : undefined,
    thirdPartyName: values.thirdPartyName,
    serviceTypes: values.serviceTypes,
    relationType: values.relationType,
    instrumentTypes: values.instrumentTypes,
    validityPeriod: `${values.startDate} - ${values.expirationDate}`,
    riskLevel: values.riskLevel,
    reminders: values.reminders,
  };

  return Object.fromEntries(
    Object.entries({ ...baseMetadata, ...extra }).filter(([, value]) =>
      value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0),
    ),
  );
};

export default function ContractRegistrationPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areas, setAreas] = useState<string[]>(INTERNAL_AREAS_BASE);
  const [customArea, setCustomArea] = useState("");
  const [contractTypes, setContractTypes] = useState<string[]>(CONTRACT_TYPES_BASE);
  const [customContractType, setCustomContractType] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [formalizationFile, setFormalizationFile] = useState<File | null>(null);
  const [suppressionEvidenceFile, setSuppressionEvidenceFile] = useState<File | null>(null);
  const [contractsHistory, setContractsHistory] = useState<ContractMeta[]>([]);
  const [showPDF, setShowPDF] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContract, setSelectedContract] = useState<ContractMeta | null>(null);
  const [previewAttachmentFile, setPreviewAttachmentFile] = useState<StoredFile | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const persistContractsHistory = (history: ContractMeta[]) => {
    localStorage.setItem("contractsHistory", JSON.stringify(history));
    window.dispatchEvent(new Event("contractsHistoryUpdated"));
  };

  const pdfViewerRef = useRef<HTMLIFrameElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: buildDefaultValues("especifico"),
  });

  const watchMode = form.watch("contractMode");
  const selectedAreas = form.watch("areas") ?? [];
  const selectedThirdPartyTypes = form.watch("thirdPartyTypes") ?? [];
  const selectedServiceTypes = form.watch("serviceTypes") ?? [];
  const selectedDataCategories = form.watch("dataCategories") ?? [];
  const selectedInstrumentTypes = form.watch("instrumentTypes") ?? [];
  const selectedBaseLegal = form.watch("baseLegal") ?? [];
  const selectedGuarantees = form.watch("guarantees") ?? [];
  const selectedEvidence = form.watch("evidenceAvailable") ?? [];
  const selectedReminders = form.watch("reminders") ?? [];

  const toggleArrayField = (field: ArrayField, value: string) => {
    const currentValues = (form.getValues(field) as string[]) ?? [];
    const exists = currentValues.includes(value);
    const updated = exists
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    form.setValue(field, updated as any, { shouldDirty: true, shouldValidate: true });
  };

  const isArrayValueSelected = (field: ArrayField, value: string) => {
    const list = (form.watch(field) as string[]) ?? [];
    return list.includes(value);
  };

  useEffect(() => {
    const arrRaw = localStorage.getItem("contractsHistory");
    if (arrRaw) {
      try {
        const parsed = JSON.parse(arrRaw) as ContractMeta[];
        setContractsHistory(parsed);
      } catch {
        setContractsHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    persistContractsHistory(contractsHistory);
  }, [contractsHistory]);

  useEffect(() => {
    form.setValue(
      "legalInstruments",
      documents.map((doc) => ({
        file: doc.file,
        definition: doc.definition,
      })) as any,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const files = Array.from(event.target.files).map((file) => ({
      id: secureRandomId(file.name),
      file,
      definition: "principal" as AttachmentDefinition,
    }));
    setDocuments((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const handleAnnexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const files = Array.from(event.target.files).map((file) => ({
      id: secureRandomId(file.name),
      file,
      definition: "anexo" as AttachmentDefinition,
    }));
    setDocuments((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const setDefinition = (id: string, value: AttachmentDefinition) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, definition: value } : doc)),
    );
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleAddArea = () => {
    if (customArea && !areas.includes(customArea)) {
      setAreas([...areas, customArea]);
      setCustomArea("");
    }
  };

  const handleAddContractType = () => {
    if (customContractType && !contractTypes.includes(customContractType)) {
      setContractTypes([...contractTypes, customContractType]);
      form.setValue("contractType", customContractType);
      setCustomContractType("");
    }
  };

  const removeContract = (idToRemove: string) => {
    const updatedHistory = contractsHistory.filter((meta) => meta.id !== idToRemove);
    setContractsHistory(updatedHistory);
  };

  const openContractDetail = (meta: ContractMeta) => {
    setSelectedContract(meta);
    setIsHistoryDialogOpen(true);
  };

  const resolveAttachmentFile = (attachment: AttachmentMeta) => {
    if (!attachment.storageId) {
      toast({
        title: "Archivo no disponible",
        description: "Este contrato no tiene un archivo asociado para consultar.",
        variant: "destructive",
      });
      return null;
    }
    const stored = getFileById(attachment.storageId);
    if (!stored) {
      toast({
        title: "Archivo no disponible",
        description: "No pudimos encontrar el documento en tu almacenamiento local.",
        variant: "destructive",
      });
      return null;
    }

    return stored;
  };

  const previewContractAttachment = (attachment: AttachmentMeta) => {
    const stored = resolveAttachmentFile(attachment);
    if (!stored) return;

    if (!canOfferFilePreview(stored)) {
      toast({
        title: "Vista previa no disponible",
        description: "Puedes descargar el documento original desde este mismo registro.",
        variant: "destructive",
      });
      return;
    }

    setPreviewAttachmentFile(stored);
  };

  const downloadContractAttachment = (attachment: AttachmentMeta) => {
    const stored = resolveAttachmentFile(attachment);
    if (!stored) return;

    const url = createFileURL(stored.content);
    const link = document.createElement("a");
    link.href = url;
    link.download = stored.name;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const contractId = secureRandomId(values.contractMode);

      const attachments: AttachmentMeta[] = [];

      for (const doc of documents) {
        const stored = await saveFile(
          doc.file,
          buildFileMetadata(values, contractId, { definition: doc.definition }),
          "third-party-contract",
        );
        attachments.push({
          fileName: stored.name,
          definition: doc.definition,
          storageId: stored.id,
          category: doc.definition,
        });
      }

      if (values.formalized === "si" && !formalizationFile && attachments.length === 0) {
        toast({
          title: "Adjunta el instrumento",
          description: "Incluye al menos el contrato o acuerdo firmado para conservar la evidencia.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (values.formalized === "si" && formalizationFile) {
        const stored = await saveFile(
          formalizationFile,
          buildFileMetadata(values, contractId, { definition: "formalizacion" }),
          "third-party-contract",
        );
        attachments.push({
          fileName: stored.name,
          definition: "formalizacion",
          storageId: stored.id,
          category: "formalizacion",
        });
      }

      if (suppressionEvidenceFile) {
        const stored = await saveFile(
          suppressionEvidenceFile,
          buildFileMetadata(values, contractId, { definition: "terminacion" }),
          "third-party-contract",
        );
        attachments.push({
          fileName: stored.name,
          definition: "terminacion",
          storageId: stored.id,
          category: "terminacion",
        });
      }

      const payload: ContractMeta = {
        id: contractId,
        created: new Date().toISOString(),
        contractMode: values.contractMode,
        contractTitle: values.contractTitle,
        internalCode: values.internalCode,
        contractType: values.contractType,
        contractStatus: determineStatus(values.expirationDate),
        contractorType: values.contractMode === "marco" ? values.contractorType : undefined,
        providerIdentity: values.contractMode === "especifico" ? values.providerIdentity : undefined,
        thirdPartyTypes: values.thirdPartyTypes,
        thirdPartyTypeOther: values.thirdPartyTypeOther,
        thirdPartyName: values.thirdPartyName,
        rfc: values.rfc,
        address: values.address,
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        areas: values.areas,
        internalAreaOther: values.internalAreaOther,
        serviceTypes: values.serviceTypes,
        serviceOther: values.serviceOther,
        treatmentPurpose: values.treatmentPurpose,
        dataCategories: values.dataCategories,
        dataCategoriesOther: values.dataCategoriesOther,
        dataVolume: values.dataVolume,
        relationType: values.relationType,
        instrumentTypes: values.instrumentTypes,
        instrumentOther: values.instrumentOther,
        formalized: values.formalized,
        formalizationReason: values.formalizationReason,
        baseLegal: values.baseLegal,
        baseLegalOther: values.baseLegalOther,
        guarantees: values.guarantees,
        guaranteesOther: values.guaranteesOther,
        contractValidity: values.contractValidity,
        signatureDate: values.signatureDate,
        startDate: values.startDate,
        expirationDate: values.expirationDate,
        durationType: values.durationType,
        reviewFrequency: values.reviewFrequency,
        terminationClause: values.terminationClause,
        terminationNotes: values.terminationNotes,
        communicationType: values.communicationType,
        communicationDetails: values.communicationDetails,
        clauseRegulation: values.clauseRegulation,
        complianceNeeds: values.complianceNeeds,
        evidenceAvailable: values.evidenceAvailable,
        evidenceNotes: values.evidenceNotes,
        responsibleName: values.responsibleName,
        responsibleRole: values.responsibleRole,
        lastReview: values.lastReview,
        nextReview: values.nextReview,
        reminders: values.reminders,
        linkedInventories: values.linkedInventories,
        riskLevel: values.riskLevel,
        riskNotes: values.riskNotes,
        versioningNotes: values.versioningNotes,
        reviewLog: values.reviewLog,
        attachments,
      };

      const updatedHistory = [payload, ...contractsHistory];
      setContractsHistory(updatedHistory);

      toast({
        title: "Contrato registrado",
        description: "El contrato se guardó en tu dispositivo para seguimiento.",
      });

      setDocuments([]);
      setFormalizationFile(null);
      setSuppressionEvidenceFile(null);
      form.reset(buildDefaultValues(values.contractMode));
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Hubo un problema al guardar la información del contrato.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToPDF = (meta: ContractMeta) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Resumen de contrato con terceros", 20, 20);
    doc.setFontSize(11);
    let y = 32;

    const addLine = (label: string, value?: string) => {
      if (!value) return;
      const text = `${label}: ${value}`;
      const split = doc.splitTextToSize(text, 170) as string[];
      split.forEach((line: string) => {
        doc.text(line, 20, y);
        y += 7;
      });
    };

    addLine("Fecha de registro", new Date(meta.created).toLocaleString());
    addLine("Título", meta.contractTitle);
    addLine("Código interno", meta.internalCode);
    addLine("Tipo de registro", meta.contractMode === "marco" ? "Contrato marco" : "Contrato específico");
    addLine("Tipo de contrato", meta.contractType);
    addLine("Estatus", meta.contractStatus);
    addLine("Tercero", meta.providerIdentity ?? meta.contractorType ?? meta.thirdPartyName);
    addLine("Tipos de tercero", meta.thirdPartyTypes.join(", "));
    addLine("Servicios", meta.serviceTypes.join(", "));
    addLine("Finalidad", meta.treatmentPurpose);
    addLine("Categorías de datos", meta.dataCategories.join(", "));
    addLine("Volumen", meta.dataVolume);
    addLine("Relación jurídica", meta.relationType);
    addLine("Instrumentos", meta.instrumentTypes.join(", "));
    addLine("Base legal", meta.baseLegal.join(", "));
    addLine("Vigencia declarada", meta.contractValidity);
    addLine("Periodo", `${formatDate(meta.startDate)} - ${formatDate(meta.expirationDate)}`);
    addLine("Periodicidad de revisión", meta.reviewFrequency);
    addLine("Recordatorios", meta.reminders.join(", "));
    addLine("Nivel de riesgo", meta.riskLevel);
    addLine("Tipo de comunicación", meta.communicationType);
    addLine("Cláusula regulatoria", meta.clauseRegulation);
    addLine("Responsable interno", meta.responsibleName);
    addLine("Próxima revisión", formatDate(meta.nextReview ?? ""));

    if (meta.attachments.length > 0) {
      const { fontName, fontStyle } = doc.getFont();
      doc.setFont(fontName, "bold");
      doc.text("Documentos adjuntos:", 20, y);
      doc.setFont(fontName, fontStyle);
      y += 7;
      meta.attachments.forEach((item) => {
        addLine("-", `${item.fileName} (${item.definition})`);
      });
    }

    doc.save("resumen-contrato.pdf");
  };

  const exportToWord = (meta: ContractMeta) => {
    let text = `Resumen de contrato con terceros\n\n`;
    const push = (label: string, value?: string) => {
      if (!value) return;
      text += `${label}: ${value}\n`;
    };

    push("Registrado", new Date(meta.created).toLocaleString());
    push("Título", meta.contractTitle);
    push("Código interno", meta.internalCode);
    push("Tipo", meta.contractMode === "marco" ? "Contrato marco" : "Contrato específico");
    push("Tipo de contrato", meta.contractType);
    push("Estatus", meta.contractStatus);
    push("Tercero", meta.providerIdentity ?? meta.contractorType ?? meta.thirdPartyName);
    push("Tipos de tercero", meta.thirdPartyTypes.join(", "));
    push("Servicios", meta.serviceTypes.join(", "));
    push("Finalidad", meta.treatmentPurpose);
    push("Categorías de datos", meta.dataCategories.join(", "));
    push("Volumen", meta.dataVolume);
    push("Relación jurídica", meta.relationType);
    push("Instrumentos", meta.instrumentTypes.join(", "));
    push("Base legal", meta.baseLegal.join(", "));
    push("Garantías", meta.guarantees.join(", "));
    push("Vigencia", meta.contractValidity);
    push("Fechas", `${formatDate(meta.startDate)} - ${formatDate(meta.expirationDate)}`);
    push("Periodicidad de revisión", meta.reviewFrequency);
    push("Recordatorios", meta.reminders.join(", "));
    push("Nivel de riesgo", meta.riskLevel);
    push("Comunicación", meta.communicationType);
    push("Cláusula", meta.clauseRegulation);
    push("Responsable", meta.responsibleName);

    if (meta.attachments.length > 0) {
      text += "\nDocumentos adjuntos:\n";
      meta.attachments.forEach((item) => {
        text += ` - ${item.fileName} (${item.definition})\n`;
      });
    }

    const blob = new Blob([text], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumen-contrato.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewPDF = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setShowPDF(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const ITEMS_PER_PAGE = 5;

  const historyMetrics = useMemo<HistoryMetrics>(() => {
    if (contractsHistory.length === 0) {
      return {
        total: 0,
        statusCounts: { vigente: 0, por_vencer: 0, vencido: 0, sin_definir: 0 } as Record<
          ContractMeta["contractStatus"],
          number
        >,
        expiringIn30: 0,
        expiringIn90: 0,
        remisionCoverage: 0,
        transferenciasGarantizadas: 0,
        transferenciasSinGarantia: 0,
        remisionSinDpa: 0,
        averageSignatureLead: null as number | null,
        reviewsVigentes: 0,
      };
    }

    const now = new Date();
    const statusCounts: Record<ContractMeta["contractStatus"], number> = {
      vigente: 0,
      por_vencer: 0,
      vencido: 0,
      sin_definir: 0,
    };

    let expiringIn30 = 0;
    let expiringIn90 = 0;
    let remisionTotal = 0;
    let remisionVigentes = 0;
    let transferenciasTotal = 0;
    let transferenciasGarantia = 0;
    let transferenciasSinGarantia = 0;
    let signatureLeadAccumulator = 0;
    let signatureLeadSamples = 0;
    let reviewsVigentes = 0;
    let remisionSinDpa = 0;

    contractsHistory.forEach((contract) => {
      statusCounts[contract.contractStatus] += 1;

      const relation = contract.relationType.toLowerCase();
      if (relation.includes("remisión")) {
        remisionTotal += 1;
        if (contract.contractStatus === "vigente") {
          remisionVigentes += 1;
        }
        const hasDpa = contract.instrumentTypes.some((instrument) => instrument.toLowerCase().includes("dpa"));
        if (!hasDpa) {
          remisionSinDpa += 1;
        }
      }

      if (relation.includes("transferencia")) {
        transferenciasTotal += 1;
        if (contract.guarantees.length > 0) {
          transferenciasGarantia += 1;
        } else {
          transferenciasSinGarantia += 1;
        }
      }

      const expiration = contract.expirationDate ? new Date(contract.expirationDate) : null;
      if (expiration && !Number.isNaN(expiration.getTime())) {
        const diff = Math.round((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 30) {
          expiringIn30 += 1;
        }
        if (diff >= 0 && diff <= 90) {
          expiringIn90 += 1;
        }
      }

      if (contract.signatureDate && contract.startDate) {
        const signature = new Date(contract.signatureDate);
        const start = new Date(contract.startDate);
        if (!Number.isNaN(signature.getTime()) && !Number.isNaN(start.getTime())) {
          const diff = Math.abs(Math.round((start.getTime() - signature.getTime()) / (1000 * 60 * 60 * 24)));
          signatureLeadAccumulator += diff;
          signatureLeadSamples += 1;
        }
      }

      if (contract.nextReview) {
        const nextReview = new Date(contract.nextReview);
        if (!Number.isNaN(nextReview.getTime()) && nextReview.getTime() >= now.getTime()) {
          reviewsVigentes += 1;
        }
      }
    });

    const remisionCoverage = remisionTotal > 0 ? Math.round((remisionVigentes / remisionTotal) * 100) : 0;
    const transferenciasGarantizadas =
      transferenciasTotal > 0 ? Math.round((transferenciasGarantia / transferenciasTotal) * 100) : 0;
    const averageSignatureLead =
      signatureLeadSamples > 0 ? Math.round(signatureLeadAccumulator / signatureLeadSamples) : null;

    return {
      total: contractsHistory.length,
      statusCounts,
      expiringIn30,
      expiringIn90,
      remisionCoverage,
      transferenciasGarantizadas,
      transferenciasSinGarantia,
      remisionSinDpa,
      averageSignatureLead,
      reviewsVigentes,
    };
  }, [contractsHistory]);

  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return contractsHistory.filter((meta) => {
      const name = meta.providerIdentity ?? meta.contractorType ?? meta.thirdPartyName;
      const matchesName =
        !term ||
        [name, meta.contractTitle, meta.contractType, meta.thirdPartyName, meta.treatmentPurpose]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term));
      const matchesArea = areaFilter === "all" || meta.areas.includes(areaFilter);
      const matchesType = typeFilter === "all" || meta.contractType === typeFilter;
      const matchesStatus = statusFilter === "all" || meta.contractStatus === statusFilter;
      const matchesRisk = riskFilter === "all" || meta.riskLevel === riskFilter;
      return matchesName && matchesArea && matchesType && matchesStatus && matchesRisk;
    });
  }, [contractsHistory, searchTerm, areaFilter, typeFilter, statusFilter, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, areaFilter, typeFilter, statusFilter, riskFilter]);

  const statusBadges: Record<ContractMeta["contractStatus"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    vigente: { label: "Vigente", variant: "default" },
    por_vencer: { label: "Por vencer", variant: "secondary" },
    vencido: { label: "Vencido", variant: "destructive" },
    sin_definir: { label: "Sin definir", variant: "outline" },
  };
  const clauseComplianceBadges: Record<
    NonNullable<ContractMeta["clauseComplianceStatus"]>,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
  > = {
    cumple: { label: "Cláusula cumple", variant: "secondary" },
    no_cumple: { label: "Cláusula no cumple", variant: "destructive" },
    no_aplica: { label: "Cláusula N/A", variant: "outline" },
    requiere_revision: { label: "Cláusula en revisión", variant: "outline" },
  };
  const getClauseComplianceBadge = (contract: ContractMeta) => {
    const status = contract.clauseComplianceStatus;
    if (status && clauseComplianceBadges[status]) return clauseComplianceBadges[status];
    return null;
  };
  const navItems = THIRD_PARTY_CONTRACTS_NAV.map((item) => {
    if (item.href === "/third-party-contracts/registration") {
      return { ...item, badge: contractsHistory.length };
    }
    return item;
  });
  return (
    <ArcoModuleShell
      moduleLabel={THIRD_PARTY_CONTRACTS_META.moduleLabel}
      moduleTitle={THIRD_PARTY_CONTRACTS_META.moduleTitle}
      moduleDescription={THIRD_PARTY_CONTRACTS_META.moduleDescription}
      pageLabel="Registro"
      pageTitle="Registro contractual integral"
      pageDescription="Captura contrato, evidencias y trazabilidad del expediente."
      navItems={navItems}
      headerBadges={[
        { label: `${contractsHistory.length} contratos`, tone: "neutral" },
        {
          label: `${historyMetrics.expiringIn30} por vencer`,
          tone: historyMetrics.expiringIn30 > 0 ? "warning" : "neutral",
        },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/third-party-contracts/documents">Documentos</Link>
        </Button>
      }
    >

      <Card>
        <CardHeader>
          <CardTitle>Nuevo contrato con terceros</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <section className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label>Tipo de registro</Label>
                <Select
                  value={watchMode}
                  onValueChange={(value) => form.setValue("contractMode", value as "marco" | "especifico")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marco">Contrato modelo / marco</SelectItem>
                    <SelectItem value="especifico">Contrato específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contractTitle">Título del contrato</Label>
                  <Input id="contractTitle" placeholder="Ej. Servicio de nómina 2025" {...form.register("contractTitle")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalCode">Número o código interno</Label>
                  <Input id="internalCode" placeholder="Ej. CTR-DATOS-2025-001" {...form.register("internalCode")} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de contrato</Label>
                  <Select onValueChange={(value) => form.setValue("contractType", value)} value={form.watch("contractType")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input
                      value={customContractType}
                      onChange={(event) => setCustomContractType(event.target.value)}
                      placeholder="Agregar otro tipo"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleAddContractType}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre o razón social del tercero</Label>
                  <Input placeholder="Razón social" {...form.register("thirdPartyName")} />
                </div>
                <div className="space-y-2">
                  <Label>RFC</Label>
                  <Input placeholder="RFC del tercero" {...form.register("rfc")} />
                </div>
                <div className="space-y-2">
                  <Label>Domicilio o sede principal</Label>
                  <Input placeholder="Dirección completa" {...form.register("address")} />
                </div>
                <div className="space-y-2">
                  <Label>Persona de contacto</Label>
                  <Input placeholder="Nombre" {...form.register("contactName")} />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico del contacto</Label>
                  <Input type="email" placeholder="correo@proveedor.com" {...form.register("contactEmail")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de tercero</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {THIRD_PARTY_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={isArrayValueSelected("thirdPartyTypes", type)}
                        onChange={() => toggleArrayField("thirdPartyTypes", type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
                {selectedThirdPartyTypes.includes("Otro") && (
                  <Input placeholder="Especifique" {...form.register("thirdPartyTypeOther")} className="mt-2" />
                )}
              </div>

              {watchMode === "marco" && (
                <div className="space-y-2">
                  <Label>Tipo de contratante</Label>
                  <Input placeholder="Ej. Holding, empresa del grupo" {...form.register("contractorType")} />
                </div>
              )}

              {watchMode === "especifico" && (
                <div className="space-y-2">
                  <Label>Identidad del proveedor</Label>
                  <Input placeholder="Proveedor que ejecuta el servicio" {...form.register("providerIdentity")} />
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Áreas internas responsables</h2>
                <p className="text-sm text-muted-foreground">
                  Seleccione las áreas que gestionan o supervisan el contrato.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {areas.map((area) => (
                  <label key={area} className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selectedAreas.includes(area)}
                      onChange={() => toggleArrayField("areas", area)}
                    />
                    {area}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input value={customArea} onChange={(event) => setCustomArea(event.target.value)} placeholder="Agregar área" />
                <Button type="button" variant="outline" size="icon" onClick={handleAddArea}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Detalles del tratamiento y servicios</h2>
                <p className="text-sm text-muted-foreground">
                  Documenta la naturaleza del servicio, los datos tratados y sus finalidades.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de servicio contratado</Label>
                  <div className="grid gap-2">
                    {SERVICE_TYPES.map((service) => (
                      <label key={service} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedServiceTypes.includes(service)}
                          onChange={() => toggleArrayField("serviceTypes", service)}
                        />
                        {service}
                      </label>
                    ))}
                  </div>
                  {selectedServiceTypes.includes("Otro") && (
                    <Input placeholder="Describe el servicio" {...form.register("serviceOther")} className="mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Finalidad del tratamiento</Label>
                  <Textarea rows={6} placeholder="Describe las finalidades autorizadas" {...form.register("treatmentPurpose")} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categorías de datos personales tratados</Label>
                  <div className="grid gap-2">
                    {DATA_CATEGORIES.map((category) => (
                      <label key={category} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedDataCategories.includes(category)}
                          onChange={() => toggleArrayField("dataCategories", category)}
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                  {selectedDataCategories.includes("Otros") && (
                    <Input placeholder="Especifique" {...form.register("dataCategoriesOther")} className="mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Volumen aproximado de titulares</Label>
                  <Select value={form.watch("dataVolume")} onValueChange={(value) => form.setValue("dataVolume", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el volumen" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOLUME_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Instrumento jurídico y comunicación de datos</h2>
                <p className="text-sm text-muted-foreground">
                  Determina el tipo de relación jurídica, los instrumentos aplicables y las bases legales del tratamiento.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de relación jurídica</Label>
                  <Select value={form.watch("relationType")} onValueChange={(value) => form.setValue("relationType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la relación" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de comunicación</Label>
                  <Select value={form.watch("communicationType")} onValueChange={(value) => form.setValue("communicationType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de comunicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remisión">Remisión</SelectItem>
                      <SelectItem value="Transferencia nacional">Transferencia nacional</SelectItem>
                      <SelectItem value="Transferencia internacional">Transferencia internacional</SelectItem>
                      <SelectItem value="Corresponsabilidad">Corresponsabilidad</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Instrumento jurídico aplicable</Label>
                  <div className="grid gap-2">
                    {INSTRUMENT_TYPES.map((instrument) => (
                      <label key={instrument} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedInstrumentTypes.includes(instrument)}
                          onChange={() => toggleArrayField("instrumentTypes", instrument)}
                        />
                        {instrument}
                      </label>
                    ))}
                  </div>
                  {selectedInstrumentTypes.includes("Otro") && (
                    <Input placeholder="Describe el instrumento" {...form.register("instrumentOther")} className="mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Base legal del tratamiento</Label>
                  <div className="grid gap-2">
                    {BASE_LEGAL_OPTIONS.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedBaseLegal.includes(option)}
                          onChange={() => toggleArrayField("baseLegal", option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  {selectedBaseLegal.includes("Otro") && (
                    <Input placeholder="Especifique la base legal" {...form.register("baseLegalOther")} className="mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>¿Se formalizó por escrito o medio electrónico?</Label>
                  <Select value={form.watch("formalized")} onValueChange={(value) => form.setValue("formalized", value as "si" | "no")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.watch("formalized") === "no" && (
                    <Textarea rows={3} placeholder="Describe el motivo" {...form.register("formalizationReason")} className="mt-2" />
                  )}
                  {form.watch("formalized") === "si" && (
                    <div className="space-y-2">
                      <Label>Archivo adjunto del contrato</Label>
                      <Input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setFormalizationFile(event.target.files?.[0] ?? null)} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Garantías adecuadas (si hay transferencia internacional)</Label>
                  <div className="grid gap-2">
                    {GUARANTEE_OPTIONS.map((guarantee) => (
                      <label key={guarantee} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedGuarantees.includes(guarantee)}
                          onChange={() => toggleArrayField("guarantees", guarantee)}
                        />
                        {guarantee}
                      </label>
                    ))}
                  </div>
                  {selectedGuarantees.includes("Otro") && (
                    <Input placeholder="Describe la garantía" {...form.register("guaranteesOther")} className="mt-2" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Detalle adicional sobre la comunicación</Label>
                <Textarea rows={3} placeholder="Describe condiciones o restricciones" {...form.register("communicationDetails")} />
              </div>

              <div className="space-y-2">
                <Label>Cláusula regulatoria relevante</Label>
                <Textarea rows={2} placeholder="Ej. Cláusula segunda, obligaciones del encargado" {...form.register("clauseRegulation")} />
              </div>

              <div className="space-y-2">
                <Label>Acciones necesarias para cumplimiento</Label>
                <Textarea rows={2} placeholder="Describe ajustes o tareas pendientes" {...form.register("complianceNeeds")} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Vigencia, vencimiento y seguimiento</h2>
                <p className="text-sm text-muted-foreground">Controla fechas clave y evidencias de terminación.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fecha de firma</Label>
                  <Input type="date" {...form.register("signatureDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de inicio de vigencia</Label>
                  <Input type="date" {...form.register("startDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de vencimiento</Label>
                  <Input type="date" {...form.register("expirationDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Duración del contrato</Label>
                  <Select value={form.watch("durationType")} onValueChange={(value) => form.setValue("durationType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la duración" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Determinada">Determinada</SelectItem>
                      <SelectItem value="Indeterminada">Indeterminada</SelectItem>
                      <SelectItem value="Renovación automática">Renovación automática</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vigencia declarada</Label>
                  <Input placeholder="Ej. 12 meses" {...form.register("contractValidity")} />
                </div>
                <div className="space-y-2">
                  <Label>Periodicidad de revisión</Label>
                  <Select value={form.watch("reviewFrequency")} onValueChange={(value) => form.setValue("reviewFrequency", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la periodicidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {REVIEW_FREQUENCIES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recordatorios automáticos</Label>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_OPTIONS.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedReminders.includes(option)}
                          onChange={() => toggleArrayField("reminders", option)}
                        />
                        {option} días antes
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.watch("terminationClause")}
                    onChange={(event) => form.setValue("terminationClause", event.target.checked)}
                  />
                  ¿Incluye cláusula de terminación y devolución / supresión de datos?
                </label>
                <Textarea rows={2} placeholder="Observaciones sobre la cláusula" {...form.register("terminationNotes")} />
              </div>

              <div className="space-y-2">
                <Label>Evidencia de supresión / devolución de datos</Label>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setSuppressionEvidenceFile(event.target.files?.[0] ?? null)} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Evidencias y trazabilidad</h2>
                <p className="text-sm text-muted-foreground">
                  Documenta los soportes disponibles, responsables internos y bitácoras de seguimiento.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Evidencias disponibles</Label>
                  <div className="grid gap-2">
                    {EVIDENCE_OPTIONS.map((evidence) => (
                      <label key={evidence} className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedEvidence.includes(evidence)}
                          onChange={() => toggleArrayField("evidenceAvailable", evidence)}
                        />
                        {evidence}
                      </label>
                    ))}
                  </div>
                  <Textarea rows={2} placeholder="Notas sobre evidencias" {...form.register("evidenceNotes")} className="mt-2" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Responsable interno del seguimiento</Label>
                    <Input placeholder="Nombre" {...form.register("responsibleName")} />
                    <Input placeholder="Cargo o rol" {...form.register("responsibleRole")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Última revisión de cumplimiento</Label>
                    <Input type="date" {...form.register("lastReview")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Próxima revisión programada</Label>
                    <Input type="date" {...form.register("nextReview")} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nivel de riesgo contractual</Label>
                  <Select value={form.watch("riskLevel")} onValueChange={(value) => form.setValue("riskLevel", value as ContractMeta["riskLevel"]) }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el nivel de riesgo" />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_LEVELS.map((risk) => (
                        <SelectItem key={risk} value={risk} className="capitalize">
                          {risk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea rows={2} placeholder="Notas sobre la evaluación de riesgo" {...form.register("riskNotes")} className="mt-2" />
                </div>
                <div className="space-y-2">
                  <Label>Integraciones y bitácora</Label>
                  <Textarea rows={3} placeholder="Vincula con inventario, avisos o registros relacionados" {...form.register("linkedInventories")} />
                  <Textarea rows={3} placeholder="Bitácora de versiones o revisiones internas" {...form.register("versioningNotes")} className="mt-2" />
                  <Textarea rows={3} placeholder="Notas de aprobación interna" {...form.register("reviewLog")} className="mt-2" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Evidencias y archivos adjuntos</h2>
                <p className="text-sm text-muted-foreground">Agrega contratos, anexos, DPAs o certificaciones.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Adjuntar documentos principales</Label>
                  <Input type="file" multiple accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                </div>
                <div className="space-y-2">
                  <Label>Añadir anexos o evidencias</Label>
                  <Input type="file" multiple accept=".pdf,.doc,.docx" onChange={handleAnnexChange} />
                </div>
              </div>
              <div className="space-y-2">
                {documents.length === 0 && <p className="text-sm text-muted-foreground">No se han subido documentos.</p>}
                {documents.map((doc) => (
                  <div key={doc.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center">
                    <span className="flex-1 truncate font-medium">{doc.file.name}</span>
                    <Select value={doc.definition} onValueChange={(value) => setDefinition(doc.id, value as AttachmentDefinition)}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_DEFINITIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {doc.file.type === "application/pdf" && (
                      <Button variant="ghost" size="icon" type="button" onClick={() => previewPDF(doc.file)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => {
                        const url = URL.createObjectURL(doc.file);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = doc.file.name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" type="button" onClick={() => removeDocument(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar contrato"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white">
            <Button variant="destructive" className="absolute right-4 top-4" onClick={() => setShowPDF(null)}>
              Cerrar visor
            </Button>
            <iframe ref={pdfViewerRef} src={showPDF} title="PDF Viewer" className="mt-16 h-full w-full rounded-b-lg" />
          </div>
        </div>
      )}

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Historial de contratos registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {contractsHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay registros previos.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Contratos registrados</p>
                  <p className="text-2xl font-semibold">{historyMetrics.total}</p>
                  <p className="text-xs text-muted-foreground">
                    Vigentes: {historyMetrics.statusCounts.vigente} · Vencidos: {historyMetrics.statusCounts.vencido}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Alertas de vigencia</p>
                  <p className="text-2xl font-semibold">{historyMetrics.expiringIn30}</p>
                  <p className="text-xs text-muted-foreground">
                    Por vencer en ≤90 días: {historyMetrics.expiringIn90}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Remisión con DPA vigente</p>
                  <p className="text-2xl font-semibold">{historyMetrics.remisionCoverage}%</p>
                  <p className="text-xs text-muted-foreground">
                    Encargados sin DPA: {historyMetrics.remisionSinDpa}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Transferencias con garantías</p>
                  <p className="text-2xl font-semibold">{historyMetrics.transferenciasGarantizadas}%</p>
                  <p className="text-xs text-muted-foreground">
                    Sin garantías: {historyMetrics.transferenciasSinGarantia}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Tiempo medio firma-inicio</p>
                  <p className="text-2xl font-semibold">
                    {historyMetrics.averageSignatureLead !== null
                      ? `${historyMetrics.averageSignatureLead} días`
                      : "N/D"}
                  </p>
                  <p className="text-xs text-muted-foreground">Promedio de preparación contractual</p>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Revisiones programadas vigentes</p>
                  <p className="text-2xl font-semibold">{historyMetrics.reviewsVigentes}</p>
                  <p className="text-xs text-muted-foreground">Con próxima revisión futura registrada</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
                  <Label>Buscar</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Busca por título, proveedor o servicio"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de contrato</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {contractTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estatus</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="vigente">Vigentes</SelectItem>
                      <SelectItem value="por_vencer">Por vencer</SelectItem>
                      <SelectItem value="vencido">Vencidos</SelectItem>
                      <SelectItem value="sin_definir">Sin definir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Riesgo</Label>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {RISK_LEVELS.map((risk) => (
                        <SelectItem key={risk} value={risk} className="capitalize">
                          {risk}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2">Fecha</th>
                      <th className="border p-2">Título</th>
                      <th className="border p-2">Tipo</th>
                      <th className="border p-2">Estatus</th>
                      <th className="border p-2">Tercero</th>
                      <th className="border p-2">Áreas</th>
                      <th className="border p-2">Fechas</th>
                      <th className="border p-2">Comunicación</th>
                      <th className="border p-2">Riesgo</th>
                      <th className="border p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.map((meta) => (
                      <tr key={meta.id}>
                        <td className="border p-2">{new Date(meta.created).toLocaleString()}</td>
                        <td className="border p-2 font-medium">{meta.contractTitle}</td>
                        <td className="border p-2">{meta.contractType}</td>
                        <td className="border p-2">
                          <Badge variant={statusBadges[meta.contractStatus].variant}>
                            {statusBadges[meta.contractStatus].label}
                          </Badge>
                        </td>
                        <td className="border p-2">{meta.providerIdentity ?? meta.contractorType ?? meta.thirdPartyName}</td>
                        <td className="border p-2">{meta.areas.join(", ")}</td>
                        <td className="border p-2">{formatDate(meta.startDate)} – {formatDate(meta.expirationDate)}</td>
                        <td className="border p-2">{meta.communicationType}</td>
                        <td className="border p-2 capitalize">{meta.riskLevel}</td>
                        <td className="border p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="icon" variant="outline" onClick={() => exportToPDF(meta)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => exportToWord(meta)}>
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => openContractDetail(meta)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => removeContract(meta.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 text-sm">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center">{currentPage} / {totalPages}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isHistoryDialogOpen}
        onOpenChange={(open) => {
          setIsHistoryDialogOpen(open);
          if (!open) {
            setSelectedContract(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del contrato</DialogTitle>
            <DialogDescription>
              Consulta la trazabilidad completa y accede a los documentos asociados.
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 text-sm">
              <div>
                {(() => {
                  const clauseBadge = getClauseComplianceBadge(selectedContract);

                  return clauseBadge ? (
                    <div className="mb-2">
                      <Badge variant={clauseBadge.variant}>{clauseBadge.label}</Badge>
                    </div>
                  ) : null;
                })()}
                <p className="font-semibold">{selectedContract.contractTitle}</p>
                <p className="text-muted-foreground">Código interno: {selectedContract.internalCode}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedContract.contractType}</Badge>
                  <Badge variant={statusBadges[selectedContract.contractStatus].variant}>
                    {statusBadges[selectedContract.contractStatus].label}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    Riesgo: {selectedContract.riskLevel}
                  </Badge>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3">
                <p className="font-medium">Análisis de cláusula</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Resultado fuente</p>
                    <p>{selectedContract.clauseComplianceLabel || selectedContract.clauseRegulation}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Cláusula revisada</p>
                    <p>{selectedContract.clauseType || "No especificada"}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs uppercase text-muted-foreground">Criterio regulatorio</p>
                  <p>{selectedContract.clauseRegulation}</p>
                </div>
                {selectedContract.complianceNeeds && (
                  <div className="mt-2">
                    <p className="text-xs uppercase text-muted-foreground">Recomendación</p>
                    <p>{selectedContract.complianceNeeds}</p>
                  </div>
                )}
                {selectedContract.clauseComplianceNotes && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    {selectedContract.clauseComplianceNotes}
                  </p>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="font-medium">Tercero</p>
                  <p>{selectedContract.providerIdentity ?? selectedContract.contractorType ?? selectedContract.thirdPartyName}</p>
                </div>
                <div>
                  <p className="font-medium">Servicios</p>
                  <p>{selectedContract.serviceTypes.join(", ")}</p>
                </div>
                <div>
                  <p className="font-medium">Finalidad</p>
                  <p>{selectedContract.treatmentPurpose}</p>
                </div>
                <div>
                  <p className="font-medium">Categorías de datos</p>
                  <p>{selectedContract.dataCategories.join(", ")}</p>
                </div>
                <div>
                  <p className="font-medium">Relación jurídica</p>
                  <p>{selectedContract.relationType}</p>
                </div>
                <div>
                  <p className="font-medium">Base legal</p>
                  <p>{selectedContract.baseLegal.join(", ")}</p>
                </div>
                <div>
                  <p className="font-medium">Periodicidad</p>
                  <p>{selectedContract.reviewFrequency}</p>
                </div>
                <div>
                  <p className="font-medium">Recordatorios</p>
                  <p>{selectedContract.reminders.join(", ")}</p>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="font-medium">Inicio</p>
                  <p>{formatDate(selectedContract.startDate)}</p>
                </div>
                <div>
                  <p className="font-medium">Vencimiento</p>
                  <p>{formatDate(selectedContract.expirationDate)}</p>
                </div>
                <div>
                  <p className="font-medium">Responsable</p>
                  <p>{selectedContract.responsibleName || "No definido"}</p>
                </div>
                <div>
                  <p className="font-medium">Próxima revisión</p>
                  <p>{formatDate(selectedContract.nextReview ?? "")}</p>
                </div>
              </div>

              {selectedContract.complianceNeeds && (
                <div>
                  <p className="font-medium">Acciones pendientes</p>
                  <p>{selectedContract.complianceNeeds}</p>
                </div>
              )}

              {selectedContract.reviewLog && (
                <div>
                  <p className="font-medium">Bitácora de aprobaciones</p>
                  <p>{selectedContract.reviewLog}</p>
                </div>
              )}

              {selectedContract.attachments.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium">Documentos asociados</p>
                  <ul className="space-y-2">
                    {selectedContract.attachments.map((attachment, index) => (
                      <li
                        key={`${attachment.storageId ?? attachment.fileName}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-2"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-medium">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">{attachment.definition}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => previewContractAttachment(attachment)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadContractAttachment(attachment)}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay documentos almacenados para este contrato.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FilePreviewDialog
        file={previewAttachmentFile}
        open={Boolean(previewAttachmentFile)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachmentFile(null);
        }}
      />
    </ArcoModuleShell>
  );
}
