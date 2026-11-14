import type { LicenceType } from "@/config/compliance";

export type PurposeCode =
  | "LEISURE"
  | "BUSINESS"
  | "EDUCATION"
  | "EMPLOYMENT"
  | "MEDICAL"
  | "EMIGRATION"
  | "VISITING_RELATIVES"
  | "PILGRIMAGE";

export type Purpose = {
  code: PurposeCode;
  label: string;
  /** A1: FFMC covers private/business travel; wider purposes are AD Cat-II scope (verify). */
  requiresLicence: LicenceType;
  enabled: boolean;
  extraDocuments?: string[];
  extraFields?: string[];
};

export const PURPOSES: Purpose[] = [
  { code: "LEISURE", label: "Leisure / Holiday Travel", requiresLicence: "FFMC", enabled: true },
  { code: "BUSINESS", label: "Business Travel", requiresLicence: "FFMC", enabled: true, extraDocuments: ["BUSINESS_LETTER"] },
  { code: "EDUCATION", label: "Overseas Education", requiresLicence: "AD2", enabled: true, extraDocuments: ["ADMISSION_LETTER"], extraFields: ["funded_by_education_loan"] },
  { code: "EMPLOYMENT", label: "Employment Abroad", requiresLicence: "AD2", enabled: true, extraDocuments: ["EMPLOYMENT_LETTER"] },
  { code: "MEDICAL", label: "Medical Visit", requiresLicence: "AD2", enabled: true, extraDocuments: ["MEDICAL_LETTER"] },
  { code: "EMIGRATION", label: "Emigration", requiresLicence: "AD2", enabled: true },
  { code: "VISITING_RELATIVES", label: "Visiting Friends / Relatives", requiresLicence: "FFMC", enabled: true },
  { code: "PILGRIMAGE", label: "Haj / Umrah / Pilgrimage", requiresLicence: "FFMC", enabled: true },
];

export const PURPOSE_CODES = PURPOSES.map((p) => p.code) as [PurposeCode, ...PurposeCode[]];

export const enabledPurposes = () => PURPOSES.filter((p) => p.enabled);
export const purposeLabel = (code: string) => PURPOSES.find((p) => p.code === code)?.label ?? code;
export const getPurpose = (code: string) => PURPOSES.find((p) => p.code === code);
