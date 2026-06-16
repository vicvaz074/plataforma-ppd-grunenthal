"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteFile,
  getFilesByCategory,
  saveFile,
  type StoredFile,
  updateFile,
  updateFileMetadata,
} from "@/lib/fileStorage";
import { Eye, FileCheck2, FilePlus2, Files, ShieldCheck, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import {
  ArcoModuleShell,
  ModuleMetricCard,
} from "@/components/arco-module-shell";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import {
  PRIVACY_NOTICES_META,
  PRIVACY_NOTICES_NAV,
} from "@/components/arco-module-config";

const HOLDER_CATEGORY_OPTIONS = [
  {
    value: "clientes_usuarios_finales",
    label:
      "Clientes / Usuarios finales (personas que adquieren o utilizan productos o servicios)",
  },
  {
    value: "potenciales_clientes",
    label:
      "Potenciales clientes / Prospectos comerciales (personas contactadas con fines de promoción o venta)",
  },
  { value: "empleados", label: "Empleados / Colaboradores actuales" },
  {
    value: "candidatos",
    label: "Candidatos / Aspirantes (en procesos de reclutamiento o selección)",
  },
  { value: "excolaboradores", label: "Excolaboradores / Jubilados" },
  {
    value: "proveedores",
    label: "Proveedores / Contratistas / Prestadores de servicios",
  },
  {
    value: "socios_comerciales",
    label: "Socios comerciales / Aliados estratégicos",
  },
  { value: "accionistas", label: "Accionistas / Inversionistas" },
  {
    value: "visitantes",
    label: "Visitantes / Personas que ingresan a instalaciones",
  },
  {
    value: "usuarios_plataformas",
    label: "Usuarios de plataformas o aplicaciones digitales",
  },
  {
    value: "suscriptores",
    label: "Suscriptores / Personas registradas en newsletters o campañas",
  },
  {
    value: "participantes_eventos",
    label: "Participantes en eventos, sorteos o promociones",
  },
  {
    value: "menores",
    label: "Menores de edad / Padres o tutores",
  },
  {
    value: "pacientes",
    label: "Pacientes / Beneficiarios (sector salud)",
  },
  {
    value: "estudiantes",
    label: "Estudiantes / Padres de familia / Docentes (sector educativo)",
  },
  { value: "consultores", label: "Consultores externos / Auditores" },
  {
    value: "representantes_legales",
    label: "Representantes legales / Contactos de negocio",
  },
  {
    value: "autoridades",
    label:
      "Autoridades o servidores públicos en interacción institucional",
  },
  {
    value: "terceros_referidos",
    label: "Terceros referidos por clientes o empleados",
  },
] as const;

const NOTICE_TYPE_OPTIONS = [
  { value: "integral", label: "Integral" },
  { value: "simplificado", label: "Simplificado" },
  { value: "corto", label: "Corto" },
  { value: "especifico", label: "Específico (por área, sistema o canal)" },
] as const;

const RESPONSIBLE_AREA_OPTIONS = [
  { value: "juridico", label: "Jurídico / Cumplimiento" },
  {
    value: "dpo",
    label: "Protección de Datos Personales / DPO",
  },
  { value: "comunicacion", label: "Comunicación / Marketing" },
  { value: "recursos_humanos", label: "Recursos Humanos" },
  { value: "tecnologia", label: "Tecnología / Sistemas" },
  { value: "direccion_general", label: "Dirección General" },
] as const;

const APPLICABLE_NOTICE_OPTIONS = [
  { value: "integral_general", label: "Aviso integral general" },
  {
    value: "especifico_proceso",
    label: "Aviso específico (por proceso, área o sistema)",
  },
  {
    value: "campanas_formularios",
    label: "Aviso de privacidad para campañas o formularios en línea",
  },
  {
    value: "videovigilancia",
    label: "Aviso para cámaras de videovigilancia",
  },
  {
    value: "reclutamiento_empleo",
    label: "Aviso para reclutamiento y empleo",
  },
] as const;

const DISPOSITION_METHOD_OPTIONS = [
  { value: "sitio_web", label: "En sitio web o plataforma digital" },
  {
    value: "formato_fisico",
    label: "En formato físico (póster, documento o formulario impreso)",
  },
  {
    value: "correo_mensaje",
    label: "Mediante correo electrónico o mensaje automatizado",
  },
  {
    value: "punto_atencion",
    label: "En punto de atención al cliente o mostrador",
  },
  {
    value: "contrato_formulario",
    label: "Dentro de contrato o formulario de registro",
  },
  {
    value: "llamada",
    label: "En llamada telefónica o grabación de voz",
  },
  {
    value: "antes_obtencion",
    label: "Antes de la obtención de los datos",
  },
] as const;

const createLabelMap = (
  options: readonly { value: string; label: string }[],
): Record<string, string> => {
  return options.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});
};

const HOLDER_CATEGORY_LABELS = createLabelMap(HOLDER_CATEGORY_OPTIONS);
const NOTICE_TYPE_LABELS = createLabelMap(NOTICE_TYPE_OPTIONS);
const RESPONSIBLE_AREA_LABELS = createLabelMap(RESPONSIBLE_AREA_OPTIONS);
const APPLICABLE_NOTICE_LABELS = createLabelMap(APPLICABLE_NOTICE_OPTIONS);
const DISPOSITION_METHOD_LABELS = createLabelMap(DISPOSITION_METHOD_OPTIONS);

const formSchema = z
  .object({
    noticeName: z
      .string()
      .min(1, "Debe proporcionar un nombre o identificador para el aviso"),
    holderCategories: z.array(z.string()),
    holderCategoryOther: z.string().optional(),
    noticeTypes: z.array(z.string()),
    noticeTypeOther: z.string().optional(),
    hasPolicy: z.enum(["si", "no"]),
    policyFile: z.any().optional(),
    policyLink: z.string().optional(),
    responsibleAreas: z.array(z.string()),
    responsibleAreaOther: z.string().optional(),
    noticeFile: z.any().optional(),
    issueDate: z.string().min(1, "Debe especificar la fecha de emisión"),
    versionCode: z.string().optional(),
    applicableNotices: z.array(z.string()),
    applicableNoticeOther: z.string().optional(),
    dispositionMethods: z.array(z.string()),
    dispositionMethodOther: z.string().optional(),
    evidenceFiles: z.any().optional(),
    evidenceNotes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const ensureSelection = (
      array: string[],
      other: string | undefined,
      path: (string | number)[],
      message: string,
    ) => {
      if (array.length === 0 && !(other && other.trim().length > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message,
        });
      }
    };

    ensureSelection(
      values.holderCategories,
      values.holderCategoryOther,
      ["holderCategories"],
      "Seleccione al menos una categoría de titulares o especifique otra",
    );
    ensureSelection(
      values.noticeTypes,
      values.noticeTypeOther,
      ["noticeTypes"],
      "Seleccione al menos un tipo de aviso o especifique otro",
    );
    ensureSelection(
      values.responsibleAreas,
      values.responsibleAreaOther,
      ["responsibleAreas"],
      "Seleccione al menos un área responsable o especifique otra",
    );
    ensureSelection(
      values.applicableNotices,
      values.applicableNoticeOther,
      ["applicableNotices"],
      "Seleccione el aviso aplicable o especifique otro",
    );
    ensureSelection(
      values.dispositionMethods,
      values.dispositionMethodOther,
      ["dispositionMethods"],
      "Seleccione al menos una forma de puesta a disposición o especifique otra",
    );

    if (
      values.hasPolicy === "si" &&
      !(
        (values.policyFile instanceof FileList && values.policyFile.length > 0) ||
        (values.policyLink && values.policyLink.trim().length > 0)
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["policyFile"],
        message: "Adjunte la política o proporcione un enlace a la misma",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  noticeName: "",
  holderCategories: [],
  holderCategoryOther: "",
  noticeTypes: [],
  noticeTypeOther: "",
  hasPolicy: "no",
  policyFile: undefined,
  policyLink: "",
  responsibleAreas: [],
  responsibleAreaOther: "",
  noticeFile: undefined,
  issueDate: "",
  versionCode: "",
  applicableNotices: [],
  applicableNoticeOther: "",
  dispositionMethods: [],
  dispositionMethodOther: "",
  evidenceFiles: undefined,
  evidenceNotes: "",
};

const formatSelection = (
  values: string[] | undefined,
  labels: Record<string, string>,
  other?: string,
) => {
  const formatted = (values ?? [])
    .map((value) => labels[value] ?? value)
    .filter((value) => value && value.length > 0);

  if (other && other.trim().length > 0) {
    formatted.push(other.trim());
  }

  return formatted.length > 0 ? formatted.join(", ") : "No especificado";
};

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

type PrivacyNoticesContentProps = {
  section: "register" | "list";
};

export function PrivacyNoticesContent({ section }: PrivacyNoticesContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editNoticeId = searchParams.get("notice");
  const hasPrefilled = useRef(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyNotices, setPrivacyNotices] = useState<StoredFile[]>([]);
  const [editingNotice, setEditingNotice] = useState<StoredFile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<StoredFile | null>(null);
  const itemsPerPage = 10;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    const loadPrivacyNotices = () => {
      const notices = getFilesByCategory("privacy-notice");
      setPrivacyNotices(notices);
    };

    loadPrivacyNotices();

    const handleStorageChange = () => {
      loadPrivacyNotices();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (section !== "register" || !editNoticeId || hasPrefilled.current) {
      return;
    }

    const noticeToEdit = privacyNotices.find((notice) => notice.id === editNoticeId);
    if (!noticeToEdit) {
      return;
    }

    applyEditNotice(noticeToEdit);
    hasPrefilled.current = true;
  }, [section, editNoticeId, privacyNotices]);

  const holderCategories = form.watch("holderCategories");
  const noticeTypes = form.watch("noticeTypes");
  const responsibleAreas = form.watch("responsibleAreas");
  const applicableNotices = form.watch("applicableNotices");
  const dispositionMethods = form.watch("dispositionMethods");
  const hasPolicy = form.watch("hasPolicy");

  const toggleSelection = (
    field:
      | "holderCategories"
      | "noticeTypes"
      | "responsibleAreas"
      | "applicableNotices"
      | "dispositionMethods",
    value: string,
  ) => {
    const current = form.getValues(field);
    if (current.includes(value)) {
      form.setValue(
        field,
        current.filter((item) => item !== value),
        { shouldDirty: true, shouldValidate: true },
      );
    } else {
      form.setValue(field, [...current, value], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleViewDocument = (notice: StoredFile) => {
    if (!notice.content) {
      toast({
        title: "Documento no disponible",
        description: "No se adjuntó archivo para este aviso.",
      });
      return;
    }

    setSelectedDocument(notice);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const now = new Date().toISOString();
      const userName = localStorage.getItem("userName") || "Desconocido";

      const trimmed = (text?: string) =>
        text && text.trim().length > 0 ? text.trim() : undefined;

      const metadata = {
        title: values.noticeName,
        noticeName: values.noticeName,
        holderCategories: values.holderCategories,
        holderCategoryOther: trimmed(values.holderCategoryOther),
        category:
          values.holderCategories[0] ||
          (trimmed(values.holderCategoryOther) ? "otro" : ""),
        noticeTypes: values.noticeTypes,
        noticeTypeOther: trimmed(values.noticeTypeOther),
        hasPolicy: values.hasPolicy,
        policyLink:
          values.hasPolicy === "si" ? trimmed(values.policyLink) : undefined,
        responsibleAreas: values.responsibleAreas,
        responsibleAreaOther: trimmed(values.responsibleAreaOther),
        issueDate: values.issueDate,
        versionCode: trimmed(values.versionCode),
        applicableNotices: values.applicableNotices,
        applicableNoticeOther: trimmed(values.applicableNoticeOther),
        dispositionMethods: values.dispositionMethods,
        dispositionMethodOther: trimmed(values.dispositionMethodOther),
        evidenceNotes: trimmed(values.evidenceNotes),
      };

      if (editingNotice) {
        const updatedMetadata = {
          ...metadata,
          lastUpdated: now,
          lastUpdatedBy: userName,
          createdBy: editingNotice.metadata.createdBy || userName,
          createdAt:
            editingNotice.metadata.createdAt || editingNotice.uploadDate,
        };

        if (values.noticeFile instanceof FileList && values.noticeFile.length > 0) {
          await updateFile(editingNotice.id, values.noticeFile[0], updatedMetadata);
        } else {
          updateFileMetadata(editingNotice.id, updatedMetadata);
        }

        toast({
          title: "Éxito",
          description:
            "El aviso de privacidad ha sido actualizado correctamente.",
        });
      } else {
        const noticeFile =
          values.noticeFile instanceof FileList && values.noticeFile.length > 0
            ? values.noticeFile[0]
            : new File([""], `${values.noticeName || "aviso"}.txt`, {
                type: "text/plain",
              });

        await saveFile(
          noticeFile,
          {
            ...metadata,
            createdAt: now,
            createdBy: userName,
            lastUpdated: now,
            lastUpdatedBy: userName,
          },
          "privacy-notice",
        );

        toast({
          title: "Éxito",
          description:
            "El aviso de privacidad ha sido registrado correctamente.",
        });
      }

      if (
        values.hasPolicy === "si" &&
        values.policyFile instanceof FileList &&
        values.policyFile.length > 0
      ) {
        const policyDocument = values.policyFile[0];
        await saveFile(
          policyDocument,
          {
            title: "Política de Avisos de Privacidad",
            relatedNotice: values.noticeName,
            policyLink: trimmed(values.policyLink),
          },
          "privacy-policy",
        );
      }

      if (
        values.evidenceFiles instanceof FileList &&
        values.evidenceFiles.length > 0
      ) {
        const files = Array.from(values.evidenceFiles);
        await Promise.all(
          files.map((file) =>
            saveFile(
              file,
              {
                title: `Evidencia de puesta a disposición - ${values.noticeName}`,
                relatedNotice: values.noticeName,
              },
              "privacy-evidence",
            ),
          ),
        );
      }

      setPrivacyNotices(getFilesByCategory("privacy-notice"));
      window.dispatchEvent(new Event("storage"));

      form.reset(defaultValues);
      setEditingNotice(null);
      if (section === "register") {
        router.push("/privacy-notices/registrados");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({
        title: "Error",
        description: "Hubo un error al guardar la información.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Desea eliminar este aviso de privacidad?")) {
      const success = deleteFile(id);
      if (success) {
        setPrivacyNotices(getFilesByCategory("privacy-notice"));
        toast({
          title: "Eliminado",
          description: "El aviso de privacidad ha sido eliminado.",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el aviso.",
          variant: "destructive",
        });
      }
    }
  };

  const applyEditNotice = (notice: StoredFile) => {
    setEditingNotice(notice);

    const holderCategoriesFromMetadata = Array.isArray(
      notice.metadata.holderCategories,
    )
      ? notice.metadata.holderCategories
      : notice.metadata.category
      ? [notice.metadata.category]
      : [];

    const noticeTypesFromMetadata = Array.isArray(notice.metadata.noticeTypes)
      ? notice.metadata.noticeTypes
      : [];

    const responsibleAreasFromMetadata = Array.isArray(
      notice.metadata.responsibleAreas,
    )
      ? notice.metadata.responsibleAreas
      : [];

    const applicableNoticesFromMetadata = Array.isArray(
      notice.metadata.applicableNotices,
    )
      ? notice.metadata.applicableNotices
      : notice.metadata.applicableNotice
      ? [notice.metadata.applicableNotice]
      : [];

    const dispositionMethodsFromMetadata = Array.isArray(
      notice.metadata.dispositionMethods,
    )
      ? notice.metadata.dispositionMethods
      : notice.metadata.dispositionMethod
      ? [notice.metadata.dispositionMethod]
      : [];

    form.reset({
      noticeName:
        notice.metadata.noticeName || notice.metadata.title || notice.name || "",
      holderCategories: holderCategoriesFromMetadata,
      holderCategoryOther:
        notice.metadata.holderCategoryOther || notice.metadata.otherCategory || "",
      noticeTypes: noticeTypesFromMetadata,
      noticeTypeOther: notice.metadata.noticeTypeOther || "",
      hasPolicy: notice.metadata.hasPolicy || "no",
      policyFile: undefined,
      policyLink: notice.metadata.policyLink || "",
      responsibleAreas: responsibleAreasFromMetadata,
      responsibleAreaOther: notice.metadata.responsibleAreaOther || "",
      noticeFile: undefined,
      issueDate:
        notice.metadata.issueDate ||
        notice.metadata.noticeDate ||
        (notice.uploadDate ? notice.uploadDate.split("T")[0] : ""),
      versionCode: notice.metadata.versionCode || "",
      applicableNotices: applicableNoticesFromMetadata,
      applicableNoticeOther: notice.metadata.applicableNoticeOther || "",
      dispositionMethods: dispositionMethodsFromMetadata,
      dispositionMethodOther: notice.metadata.dispositionMethodOther || "",
      evidenceFiles: undefined,
      evidenceNotes: notice.metadata.evidenceNotes || "",
    });
  };

  const handleEdit = (notice: StoredFile) => {
    if (section === "list") {
      router.push(`/privacy-notices/registro?notice=${encodeURIComponent(notice.id)}`);
      return;
    }

    applyEditNotice(notice);
  };

  const filteredNotices = privacyNotices.filter((notice) => {
    const name = (
      notice.metadata.noticeName ||
      notice.metadata.title ||
      notice.name ||
      ""
    )
      .toString()
      .toLowerCase();
    const matchesName = name.includes(searchTerm.toLowerCase());

    const categories = Array.isArray(notice.metadata.holderCategories)
      ? notice.metadata.holderCategories
      : notice.metadata.category
      ? [notice.metadata.category]
      : [];

    const hasOtherCategory = Boolean(
      (notice.metadata.holderCategoryOther || notice.metadata.otherCategory)?.trim(),
    );

    const matchesCategory =
      categoryFilter === "all"
        ? true
        : categoryFilter === "other"
        ? hasOtherCategory
        : categories.includes(categoryFilter);

    return matchesName && matchesCategory;
  });

  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage) || 1;
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const isRegisterSection = section === "register";
  const isListSection = section === "list";

  const noticesWithEvidence = privacyNotices.filter((notice) => {
    const evidence = notice.metadata.evidenceFiles;
    return (
      (Array.isArray(evidence) && evidence.length > 0) ||
      Boolean(notice.metadata.evidenceNotes)
    );
  }).length;

  const noticesWithVersion = privacyNotices.filter((notice) =>
    Boolean(notice.metadata.versionCode),
  ).length;

  const coveragePercentage =
    privacyNotices.length > 0
      ? Math.round((noticesWithEvidence / privacyNotices.length) * 100)
      : 0;

  const navItems = PRIVACY_NOTICES_NAV.map((item) => {
    if (item.href === "/privacy-notices/registrados") {
      return { ...item, badge: privacyNotices.length };
    }
    return item;
  });

  return (
    <>
    <ArcoModuleShell
      moduleLabel={PRIVACY_NOTICES_META.moduleLabel}
      moduleTitle={PRIVACY_NOTICES_META.moduleTitle}
      moduleDescription={PRIVACY_NOTICES_META.moduleDescription}
      pageLabel={isRegisterSection ? "Registro" : "Consulta"}
      pageTitle={
        isRegisterSection
          ? editingNotice
            ? "Edición de aviso"
            : "Registro de aviso"
          : "Inventario de avisos"
      }
      pageDescription={
        isRegisterSection
          ? "Captura responsables, puesta a disposición y evidencia del aviso."
          : "Consulta y actualiza el inventario con versiones y responsables."
      }
      navItems={navItems}
      headerBadges={[
        { label: `${privacyNotices.length} avisos`, tone: "neutral" },
        {
          label: `${coveragePercentage}% con evidencia`,
          tone: coveragePercentage >= 70 ? "positive" : "warning",
        },
      ]}
      actions={
        isRegisterSection ? (
          <Button
            variant="outline"
            onClick={() => router.push("/privacy-notices/registrados")}
          >
            Inventario
          </Button>
        ) : (
          <Button
            onClick={() => router.push("/privacy-notices/registro")}
          >
            <FilePlus2 className="mr-2 h-4 w-4" />
            Nuevo aviso
          </Button>
        )
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModuleMetricCard
            label="Avisos registrados"
            value={privacyNotices.length}
            helper="Inventario total del módulo disponible para consulta y mantenimiento."
            icon={Files}
          />
          <ModuleMetricCard
            label="Con evidencia"
            value={noticesWithEvidence}
            helper="Registros con evidencia de puesta a disposición o notas de soporte."
            icon={ShieldCheck}
            tone="positive"
          />
          <ModuleMetricCard
            label="Con versión"
            value={noticesWithVersion}
            helper="Avisos identificados con versión o código de control documental."
            icon={FileCheck2}
          />
          <ModuleMetricCard
            label="Pendientes"
            value={Math.max(privacyNotices.length - noticesWithEvidence, 0)}
            helper="Avisos que aún pueden fortalecerse con soporte documental adicional."
            icon={Trash2}
            tone="warning"
          />
        </div>

      {isRegisterSection && (
        <Card>
          <CardHeader>
            <CardTitle>{editingNotice ? "Editar aviso" : "Registrar nuevo aviso"}</CardTitle>
            <CardDescription>
              Registra los elementos obligatorios y guarda la evidencia del aviso correspondiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">Información general</h2>
                    <p className="text-sm text-muted-foreground">
                      Registra los datos básicos del aviso aplicable al proceso,
                      sistema o categoría de titulares.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="noticeName">
                      Nombre o identificador del aviso de privacidad
                    </Label>
                    <Input
                      id="noticeName"
                      placeholder="Ej. Aviso de Privacidad Clientes"
                      {...form.register("noticeName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Categoría de titulares</Label>
                    <p className="text-xs text-muted-foreground">
                      Selecciona el grupo o grupos de personas cuyos datos se
                      tratan con este aviso.
                    </p>
                    <div className="grid gap-2">
                      {HOLDER_CATEGORY_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-start space-x-2"
                        >
                          <Checkbox
                            id={`holder-${option.value}`}
                            checked={holderCategories.includes(option.value)}
                            onCheckedChange={() =>
                              toggleSelection("holderCategories", option.value)
                            }
                          />
                          <span className="text-sm leading-tight">
                            {option.label}
                          </span>
                        </label>
                      ))}
                      <div className="space-y-1">
                        <Label
                          htmlFor="holderCategoryOther"
                          className="text-sm font-normal"
                        >
                          Otro (especifique)
                        </Label>
                        <Input
                          id="holderCategoryOther"
                          placeholder="Describa la categoría"
                          {...form.register("holderCategoryOther")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de aviso de privacidad</Label>
                    <div className="grid gap-2">
                      {NOTICE_TYPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`notice-type-${option.value}`}
                            checked={noticeTypes.includes(option.value)}
                            onCheckedChange={() =>
                              toggleSelection("noticeTypes", option.value)
                            }
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                      <div className="space-y-1">
                        <Label
                          htmlFor="noticeTypeOther"
                          className="text-sm font-normal"
                        >
                          Otro (especifique)
                        </Label>
                        <Input
                          id="noticeTypeOther"
                          placeholder="Describa el tipo de aviso"
                          {...form.register("noticeTypeOther")}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">Política de gestión</h2>
                    <p className="text-sm text-muted-foreground">
                      Identifica los lineamientos internos relacionados con la
                      creación y actualización de avisos de privacidad.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      ¿Existe una política interna que regule la creación,
                      revisión y actualización de los avisos de privacidad?
                    </Label>
                    <RadioGroup
                      onValueChange={(value) =>
                        form.setValue("hasPolicy", value as "si" | "no", {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      value={hasPolicy}
                      className="flex flex-wrap gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="si" id="policy-yes" />
                        <Label htmlFor="policy-yes">Sí</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="policy-no" />
                        <Label htmlFor="policy-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {hasPolicy === "si" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="policyFile">
                          Archivo adjunto de la política interna
                        </Label>
                        <Input
                          id="policyFile"
                          type="file"
                          onChange={(event) =>
                            form.setValue(
                              "policyFile",
                              event.target.files ?? undefined,
                              { shouldDirty: true, shouldValidate: true },
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="policyLink">
                          Enlace o referencia a la política
                        </Label>
                        <Input
                          id="policyLink"
                          placeholder="https://..."
                          {...form.register("policyLink")}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>
                      Área responsable de elaborar y mantener actualizados los
                      avisos
                    </Label>
                    <div className="grid gap-2">
                      {RESPONSIBLE_AREA_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`responsible-${option.value}`}
                            checked={responsibleAreas.includes(option.value)}
                            onCheckedChange={() =>
                              toggleSelection("responsibleAreas", option.value)
                            }
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                      <div className="space-y-1">
                        <Label
                          htmlFor="responsibleAreaOther"
                          className="text-sm font-normal"
                        >
                          Otro (especifique)
                        </Label>
                        <Input
                          id="responsibleAreaOther"
                          placeholder="Describa el área responsable"
                          {...form.register("responsibleAreaOther")}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Aviso aplicable al tratamiento
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Adjunta el aviso vigente y describe la versión utilizada
                      en el tratamiento.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="noticeFile">
                        Aviso de privacidad vigente
                      </Label>
                      <Input
                        id="noticeFile"
                        type="file"
                        onChange={(event) =>
                          form.setValue(
                            "noticeFile",
                            event.target.files ?? undefined,
                            { shouldDirty: true },
                          )
                        }
                      />
                      {editingNotice && (
                        <p className="text-xs text-muted-foreground">
                          Deje el campo vacío si desea mantener el archivo
                          actual.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">
                        Fecha de emisión o última actualización
                      </Label>
                      <Input
                        id="issueDate"
                        type="date"
                        {...form.register("issueDate")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="versionCode">
                        Versión o código de control
                      </Label>
                      <Input
                        id="versionCode"
                        placeholder="Ej. AVISO-RH-2025-v2"
                        {...form.register("versionCode")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      ¿Qué aviso de privacidad resulta aplicable al
                      tratamiento?
                    </Label>
                    <div className="grid gap-2">
                      {APPLICABLE_NOTICE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`applicable-${option.value}`}
                            checked={applicableNotices.includes(option.value)}
                            onCheckedChange={() =>
                              toggleSelection(
                                "applicableNotices",
                                option.value,
                              )
                            }
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                      <div className="space-y-1">
                        <Label
                          htmlFor="applicableNoticeOther"
                          className="text-sm font-normal"
                        >
                          Otro (especifique)
                        </Label>
                        <Input
                          id="applicableNoticeOther"
                          placeholder="Describa el aviso aplicable"
                          {...form.register("applicableNoticeOther")}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Puesta a disposición y prueba de cumplimiento
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Documenta cómo se presentó el aviso y conserva evidencias
                      de ello.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>¿De qué forma se puso a disposición el aviso?</Label>
                    <div className="grid gap-2">
                      {DISPOSITION_METHOD_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`disposition-${option.value}`}
                            checked={dispositionMethods.includes(option.value)}
                            onCheckedChange={() =>
                              toggleSelection(
                                "dispositionMethods",
                                option.value,
                              )
                            }
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                      <div className="space-y-1">
                        <Label
                          htmlFor="dispositionMethodOther"
                          className="text-sm font-normal"
                        >
                          Otro (especifique)
                        </Label>
                        <Input
                          id="dispositionMethodOther"
                          placeholder="Describa la forma de puesta a disposición"
                          {...form.register("dispositionMethodOther")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidenceFiles">
                      Evidencias de puesta a disposición
                    </Label>
                    <Input
                      id="evidenceFiles"
                      type="file"
                      multiple
                      onChange={(event) =>
                        form.setValue(
                          "evidenceFiles",
                          event.target.files ?? undefined,
                          { shouldDirty: true },
                        )
                      }
                    />
                    <Textarea
                      placeholder="Agrega URLs, referencias o notas sobre la evidencia (opcional)"
                      {...form.register("evidenceNotes")}
                    />
                  </div>
                </section>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Guardando..."
                      : editingNotice
                      ? "Actualizar"
                      : "Guardar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
      )}

      {isListSection && (
        <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">
                Avisos de Privacidad Registrados
              </h2>
              <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,360px)]">
                <Input
                  placeholder="Buscar por nombre"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full min-w-0"
                />
                <div className="grid min-w-0 gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                  <Label className="text-sm sm:whitespace-nowrap">
                    Filtrar por titulares
                  </Label>
                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full min-w-0 max-w-full truncate rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">Todas las categorías</option>
                    {HOLDER_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="other">Otro (especificado)</option>
                  </select>
                </div>
              </div>

              {filteredNotices.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No hay avisos de privacidad registrados.
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aviso</TableHead>
                        <TableHead>Categorías de titulares</TableHead>
                        <TableHead>Tipo de aviso</TableHead>
                        <TableHead>Fecha de emisión</TableHead>
                        <TableHead>Versión</TableHead>
                        <TableHead>Creado por</TableHead>
                        <TableHead>Última modificación</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedNotices.map((notice) => (
                        <TableRow key={notice.id}>
                          <TableCell>
                            {notice.metadata.noticeName ||
                              notice.metadata.title ||
                              notice.name}
                          </TableCell>
                          <TableCell>
                            {formatSelection(
                              Array.isArray(notice.metadata.holderCategories)
                                ? notice.metadata.holderCategories
                                : notice.metadata.category
                                ? [notice.metadata.category]
                                : [],
                              HOLDER_CATEGORY_LABELS,
                              notice.metadata.holderCategoryOther ||
                                notice.metadata.otherCategory,
                            )}
                          </TableCell>
                          <TableCell>
                            {formatSelection(
                              Array.isArray(notice.metadata.noticeTypes)
                                ? notice.metadata.noticeTypes
                                : [],
                              NOTICE_TYPE_LABELS,
                              notice.metadata.noticeTypeOther,
                            )}
                          </TableCell>
                          <TableCell>{formatDate(notice.metadata.issueDate)}</TableCell>
                          <TableCell>
                            {notice.metadata.versionCode || "Sin versión"}
                          </TableCell>
                          <TableCell>
                            {notice.metadata.createdBy || "Desconocido"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>
                                {formatDate(
                                  notice.metadata.lastUpdated ||
                                    notice.metadata.createdAt,
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {notice.metadata.lastUpdatedBy ||
                                  notice.metadata.createdBy ||
                                  "Desconocido"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(notice)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver documento
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(notice)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(notice.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-4 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((page) => page - 1)}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm px-2 py-1">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((page) => page + 1)}
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
      )}
      </div>
    </ArcoModuleShell>
    <FilePreviewDialog
      file={selectedDocument}
      open={Boolean(selectedDocument)}
      onOpenChange={(open) => {
        if (!open) setSelectedDocument(null);
      }}
    />
    </>
  );
}
