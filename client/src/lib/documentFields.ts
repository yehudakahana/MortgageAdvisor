// Presentation layer for the AI-extracted fields. The backend stores whatever
// key/value blob the model returned (keys are English, values are strings), so
// this module is the single place that turns those raw keys into Hebrew labels
// and decides what is worth showing the user.

// Hebrew labels for the keys we know. Anything missing falls back to a
// humanized version of the key itself, so a new field never disappears.
const FIELD_LABELS: Record<string, string> = {
  // Employer
  companyName: "שם המעסיק",
  employerName: "שם המעסיק",
  taxDeductionFileNumber: "תיק ניכויים",
  companyAddressStreet: "רחוב המעסיק",
  companyAddressCity: "יישוב המעסיק",
  // Employee
  employeeName: "שם העובד",
  employeeIdentityNumber: "תעודת זהות",
  employeeId: "מספר עובד",
  employeeAddressStreet: "רחוב",
  employeeAddressCity: "יישוב",
  department: "מחלקה",
  employmentType: "סוג משרה",
  taxCalculationType: "אופן חישוב המס",
  kibbutzMember: "חבר קיבוץ",
  // Document meta
  taxYear: "שנת מס",
  printDate: "תאריך הדפסה",
  accountantSignatureName: "חתימת מנהל החשבונות",
  // Income
  totalSalaryAndPayments: 'סה"כ שכר ותשלומים',
  regularTaxableSalaryAndPayments: "משכורת חייבת בשיעורי מס רגילים",
  grossSalary: "שכר ברוטו",
  netSalary: "שכר נטו",
  paymentsBreakdown: "פירוט תשלומים",
  paymentsForExpenseCoverage: "תשלומים לכיסוי הוצאות",
  overtimeSpecialEffortOrEventSalary: "שעות נוספות / מאמץ מיוחד",
  carUsageValue: "שווי שימוש ברכב",
  salarySubjectToNationalInsurance: "שכר חייב בביטוח לאומי",
  // Pension & study fund
  pensionAndStudyFundDetails: "שכר לגמל וקרנות השתלמות",
  insuredIncome: "הכנסה מבוטחת",
  salaryForStudyFund: "שכר לקרן השתלמות",
  employerComponentContribution: "מרכיב תגמולי מעסיק",
  employerPensionContributions: "הפקדות מעסיק לקצבה",
  employerContributions: "הפקדות מעסיק לקופות",
  fundType: "קופה",
  contributionType: "סוג הפקדה",
  salaryBasis: "שכר בסיס",
  averagePercentage: "% ממוצע",
  amount: "סכום",
  // Deductions & credits
  deductions: "ניכויים",
  type: "סוג",
  code: "קוד",
  creditsExemptionsAndDeductions: "זיכויים, פטורים וניכויים",
  regularCreditPointsCount: "נקודות זיכוי",
  regularCreditPointsAmount: "סכום נקודות הזיכוי",
  severance: "פיצויים",
  taxedPercentage: "אחוז שחויב במס",
  salaryBasisForTax: "שכר בסיס למס",
};

// Internal bookkeeping and boilerplate the consultant never needs to read.
const HIDDEN_FIELDS = new Set([
  "pageNumber",
  "unlabeledCompanyCode",
  "declarationClause",
]);

// Shown as prominent tiles at the top, in this order, when present.
const HIGHLIGHT_FIELDS = [
  "totalSalaryAndPayments",
  "grossSalary",
  "netSalary",
  "regularTaxableSalaryAndPayments",
  "salarySubjectToNationalInsurance",
];

// "employerPensionContributions" -> "Employer Pension Contributions".
function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Some keys carry a year suffix (workingMonths2025). Strip it so one label
// entry covers every year.
export function fieldLabel(key: string): string {
  const base = key.replace(/\d{4}$/, "");
  if (base === "workingMonths") return "חודשי עבודה";
  return FIELD_LABELS[key] ?? FIELD_LABELS[base] ?? humanizeKey(key);
}

// A label that came from the dictionary is Hebrew (RTL); a humanized fallback
// is English and must be rendered LTR so it doesn't read backwards.
export function isTranslatedLabel(key: string): boolean {
  const base = key.replace(/\d{4}$/, "");
  return Boolean(FIELD_LABELS[key] ?? FIELD_LABELS[base]) || base === "workingMonths";
}

export function isHidden(key: string): boolean {
  return HIDDEN_FIELDS.has(key);
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value).every(isEmpty);
  return false;
}

// "239,773" / "7.50" — rendered LTR with tabular figures so columns line up.
export function isNumericValue(value: string): boolean {
  return /^[\d,.\-+%₪ ]+$/.test(value.trim());
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

// An object whose every value is a tick mark is really a set: return its keys
// (sorted, so months read 01..12), or null if it isn't that shape.
function tickedKeys(obj: Record<string, unknown>): string[] | null {
  const values = Object.values(obj);
  if (values.length === 0) return null;
  if (!values.every((v) => typeof v === "string" && /^[√vV✓xX]$/.test(v.trim()))) return null;
  return Object.keys(obj).sort();
}

// Split a flat object into the parts that render differently: simple key/value
// pairs, nested objects (their own card), and arrays of objects (a table).
export interface FieldGroups {
  scalars: [string, string][];
  objects: [string, Record<string, unknown>][];
  tables: [string, Record<string, unknown>[]][];
  highlights: [string, string][];
}

export function groupFields(fields: unknown): FieldGroups {
  const empty: FieldGroups = { scalars: [], objects: [], tables: [], highlights: [] };
  if (!fields || typeof fields !== "object") return empty;

  const groups: FieldGroups = { scalars: [], objects: [], tables: [], highlights: [] };

  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (isHidden(key) || isEmpty(value)) continue;

    if (Array.isArray(value)) {
      const rows = value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
      // An array of plain strings has no columns to build a table from — join it.
      if (rows.length === value.length && rows.length > 0) groups.tables.push([key, rows]);
      else groups.scalars.push([key, value.map(formatValue).join(", ")]);
    } else if (typeof value === "object") {
      // The model returns "months worked" as a tick map ({"01":"√", ...}); a
      // two-column table of ticks is noise, so collapse it to the month list.
      const ticked = tickedKeys(value as Record<string, unknown>);
      if (ticked) groups.scalars.push([key, ticked.join(", ")]);
      else groups.objects.push([key, value as Record<string, unknown>]);
    } else if (HIGHLIGHT_FIELDS.includes(key)) {
      groups.highlights.push([key, formatValue(value)]);
    } else {
      groups.scalars.push([key, formatValue(value)]);
    }
  }

  groups.highlights.sort(
    (a, b) => HIGHLIGHT_FIELDS.indexOf(a[0]) - HIGHLIGHT_FIELDS.indexOf(b[0])
  );
  return groups;
}

// Union of the keys across all rows — the model omits null columns on some rows.
export function tableColumns(rows: Record<string, unknown>[]): string[] {
  const cols: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!cols.includes(key) && !isHidden(key) && rows.some((r) => !isEmpty(r[key]))) cols.push(key);
    }
  }
  return cols;
}
