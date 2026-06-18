export type AttachmentDefinition =
  | "principal"
  | "modificatorio"
  | "adendum"
  | "anexo"
  | "dpa"
  | "garantias"
  | "formalizacion"
  | "terminacion"
  | "evidencia";

export type AttachmentMeta = {
  fileName: string;
  definition: AttachmentDefinition | string;
  storageId?: string;
  category?: string;
};

export type ContractMeta = {
  id: string;
  created: string;
  contractMode: "marco" | "especifico";
  contractTitle: string;
  internalCode: string;
  contractType: string;
  contractStatus: "vigente" | "por_vencer" | "vencido" | "sin_definir";
  contractorType?: string;
  providerIdentity?: string;
  thirdPartyTypes: string[];
  thirdPartyTypeOther?: string;
  thirdPartyName: string;
  rfc?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  areas: string[];
  internalAreaOther?: string;
  serviceTypes: string[];
  serviceOther?: string;
  treatmentPurpose: string;
  dataCategories: string[];
  dataCategoriesOther?: string;
  dataVolume: string;
  relationType: string;
  instrumentTypes: string[];
  instrumentOther?: string;
  formalized: "si" | "no";
  formalizationReason?: string;
  baseLegal: string[];
  baseLegalOther?: string;
  guarantees: string[];
  guaranteesOther?: string;
  contractValidity: string;
  signatureDate?: string;
  startDate: string;
  expirationDate: string;
  durationType: string;
  reviewFrequency: string;
  terminationClause: boolean;
  terminationNotes?: string;
  communicationType: string;
  communicationDetails?: string;
  clauseRegulation: string;
  clauseType?: string;
  clauseComplianceStatus?: "cumple" | "no_cumple" | "no_aplica" | "requiere_revision";
  clauseComplianceLabel?: string;
  clauseComplianceNotes?: string;
  complianceNeeds?: string;
  evidenceAvailable: string[];
  evidenceNotes?: string;
  responsibleName?: string;
  responsibleRole?: string;
  lastReview?: string;
  nextReview?: string;
  reminders: string[];
  linkedInventories?: string;
  riskLevel: "bajo" | "medio" | "alto";
  riskNotes?: string;
  versioningNotes?: string;
  reviewLog?: string;
  attachments: AttachmentMeta[];
};
