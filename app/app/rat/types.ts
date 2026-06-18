export type RiskLevel =
  | "REFORZADO"
  | "ALTO"
  | "MEDIO"
  | "BAJO"
  | "reforzado"
  | "alto"
  | "medio"
  | "bajo"

export interface DataTypeRisk {
  type: string
  level: RiskLevel
  description: string
}

export interface PersonalData {
  id: string
  name: string
  category: string
  subsection?: string
  proporcionalidad: boolean
  riesgo: "bajo" | "medio" | "alto" | "reforzado"
  purposesPrimary: string[]
  purposesSecondary: string[]
}

export interface AdditionalAccess {
  id: string
  area: string
  showOtherArea: boolean
  privileges: string[]
  otherPrivilege: string
  role?: string
  otherRole?: string
}

export interface AdditionalTransfer {
  recipient: string
  purposes: string
  consentRequired: boolean
  consentType: string
  tacitDescription: string
  expresoForm: string
  expresoEscritoForm: string
  consentFile?: File
  consentFileId?: string
  consentFileName?: string
  contractFile?: File
  contractFileId?: string
  contractFileName?: string
  exceptions: string[]
  legalInstrument: string[]
  otherLegalInstrument: string
  inAP: boolean
}

export interface AdditionalRemission {
  recipient: string
  purposes: string[]
  otherPurpose: string
  legalInstrument: string[]
  otherLegalInstrument: string
  contractFile?: File
  contractFileId?: string
  contractFileName?: string
}

export interface AdditionalConservation {
  term: string
  showOtherTerm: boolean
  justification: string[]
  legalBasis: string
  otherJustification: string
  detail: string
}

export interface AdditionalBlocking {
  time: string
  showOtherTime: boolean
  prescription: string[]
  otherPrescription: string
  disposition: string
}


export interface SubInventory {
  // --- EXISTENTES ---
  id: string
  databaseName: string
  holderTypes: string[]
  otherHolderType: string
  otherLegalBasis: string
  holdersVolume: string
  accessibility: string
  environment: string
  responsibleArea: string
  showOtherResponsibleArea: boolean
  obtainingMethod: string
  showOtherObtainingMethod: boolean
  obtainingSource: string
  otherConsentException: string
  otherConsentMechanism: string
  otherConsentType: string

  // Archivos subidos
  privacyNoticeFiles?: File[]
  privacyNoticeFileIds?: string[]
  privacyNoticeFileNames?: string[]
  privacyNoticeFile?: File
  privacyNoticeFileId?: string
  privacyNoticeFileName?: string

  consentFile?: File
  consentFileId?: string
  consentFileName?: string

  transferConsentFile?: File
  transferConsentFileId?: string
  transferConsentFileName?: string
  transferContractFile?: File
  transferContractFileId?: string
  transferContractFileName?: string

  consentRequired: boolean
  consentException: string[]
  consentMechanism: string
  consentType: string
  tacitDescription: string

  // Consentimiento para finalidades secundarias
  secondaryConsentType: string
  secondaryConsentMechanism: string
  secondaryTacitDescription: string
  secondaryConsentFile?: File
  secondaryConsentFileId?: string
  secondaryConsentFileName?: string
  secondaryExpresoForm: string
  secondaryExpresoEscritoForm: string

  secondaryPurposesConsent: Record<
    string,
    {
      consentType: string
      consentMechanism: string
      exceptions: string[]
    }
  >;

  processingArea: string[]
  otherProcessingArea: string
  showOtherProcessingArea: boolean        // <-- corregido (antes string)
  processingSystem: string
  processingSystemName: string
  processingDescription: string[]
  accessDescription: string[]
  otherAccessDescription: string
  dataLifecyclePrivileges: string

  // Modelo avanzado por ítems (ya lo tienes)
  additionalAccesses: AdditionalAccess[]

  // --- NUEVOS para compatibilidad con StepRenderer (step 7) ---
  additionalAreas: string[];              // <-- antes: string
  additionalAreasAccess: string[];
  otherAdditionalAreasAccess: string;
  showOtherAdditionalAreasAccess: boolean;
  additionalAreasLegalBasis: string[];
  otherAdditionalAreasLegalBasis: string;
  additionalAreasLegalBasisFile?: File | undefined; // o el tipo que uses
  additionalAreasLegalBasisFileId?: string | undefined;
  additionalAreasLegalBasisFileName?: string | undefined;
  additionalAreasPurposes: string[];
  otherAdditionalAreasPurposes: string;

  // --- EXISTENTES almacenamiento ---
  storageMethod: string
  otherStorageMethod: string
  physicalLocation: string
  backupPeriodicity: string
  isBackedUp: boolean
  backupDescription: string
  backupResponsible: string
  showOtherBackupResponsible: boolean

  // --- EXISTENTES conservación/bloqueo (tu diseño) ---
  conservationTerm: string
  showOtherConservationTerm: boolean
  conservationJustification: string[]
  otherConservationJustification: string
  conservationJustificationDetail: string
  conservationLegalBasis: string
  blockingTime: string
  showOtherBlockingTime: boolean
  legalPrescription: string[]
  otherLegalPrescription: string
  blockingLegalDisposition: string
  additionalConservations: AdditionalConservation[]
  additionalBlockings: AdditionalBlocking[]

  // --- NUEVOS para compatibilidad con StepRenderer (step 9) ---
  showOtherProcessingTime: boolean
  processingTime: string
  postRelationshipProcessing: string
  legalConservation: string[]
  otherLegalConservation: string

  // --- Supresión ---
  deletionMethods: string[]
  otherDeletionMethod: string
  // --- NUEVO para compatibilidad (step 10) ---
  deletionMethod: string

  // --- Transferencia/Remisión (existentes) ---
  dataTransfer: string
  transferRecipient: string
  transferPurposes: string
  transferConsentRequired: boolean
  transferExceptions: string[]
  transferConsentType: string
  transferTacitDescription: string
  transferExpresoForm: string
  transferOtherExpresoForm: string
  transferExpresoEscritoForm: string
  transferOtherExpresoEscritoForm: string
  transferLegalInstrument: string[]
  otherTransferLegalInstrument: string
  transferInAP: boolean
  additionalTransfers: AdditionalTransfer[]

  dataRemission: string
  remissionRecipient: string
  remissionPurposes: string[]
  otherRemissionPurpose: string
  remissionLegalInstrument: string[]
  otherRemissionLegalInstrument: string
  remissionContractFile?: File
  remissionContractFileId?: string
  remissionContractFileName?: string
  additionalRemissions: AdditionalRemission[]

  personalData: PersonalData[]

  riskLevel?: RiskLevel | string
  grunenthalSourcePdfFileId?: string
  grunenthalSourcePdfPath?: string
  grunenthalSourcePdfStatus?: string
  grunenthalValidationStatus?: string
  grunenthalValidationFields?: string[] | readonly string[]
  grunenthalValidationMismatches?: string[] | readonly string[]
}


export interface Inventory {
  id: string
  databaseName: string
  responsible?: string
  companyLogoDataUrl?: string
  companyLogoFileName?: string
  companyLogoPublicPath?: string
  reportAccentColor?: string
  subInventories: SubInventory[]
  riskLevel?: RiskLevel | string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  status?: "pendiente" | "en proceso" | "completado"

  // Campos extra permitidos
  [key: string]: any
}
