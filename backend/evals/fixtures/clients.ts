// In-memory client fixtures for the chat evals. Entirely fictional data — no
// real names, no real figures, and nothing here ever reaches Mongo. Each key is
// a chat scope: a single client mirrors the scoped chat, several clients mirror
// the global chat.

import { Client, Document } from "../../src/types";

const AT = new Date("2026-06-20T09:00:00.000Z");

function doc(partial: Omit<Document, "uploadedAt">): Document {
  return { ...partial, uploadedAt: AT };
}

const paystub = doc({
  id: "doc-paystub-1",
  type: "paystub",
  filename: "תלוש שכר 06-2026.pdf",
  extractedData: {
    structuredFields: {
      employeeName: "אבי כהן",
      employer: 'טכנולוגיות דמו בע"מ',
      period: "06/2026",
      grossSalary: 18300,
      netSalary: 12450,
      seniorityYears: 4,
    },
    rawText: [
      "תלוש שכר — נתוני הדגמה בלבד",
      "עובד: אבי כהן",
      'מעסיק: טכנולוגיות דמו בע"מ',
      "תקופה: 06/2026",
      "שכר ברוטו: 18,300 ש\"ח",
      "שכר נטו: 12,450 ש\"ח",
      "ותק: 4 שנים",
    ].join("\n"),
  },
});

const mortgageOffer = doc({
  id: "doc-offer-1",
  type: "other",
  filename: "הצעת משכנתא.pdf",
  extractedData: {
    structuredFields: {
      borrowerName: "אבי כהן",
      bankName: "בנק דמו",
      totalLoanAmount: 850000,
      offerDate: "15/06/2026",
      expiryDate: "15/07/2026",
      tracks: [
        { trackType: "פריים", amount: 400000, interestRate: 5.25, termMonths: 240 },
        { trackType: "קבועה לא צמודה", amount: 450000, interestRate: 4.9, termMonths: 300 },
      ],
    },
    rawText: [
      "הצעת משכנתא — נתוני הדגמה בלבד",
      "בנק: בנק דמו",
      "לווה: אבי כהן",
      "תאריך הצעה: 15/06/2026",
      "בתוקף עד: 15/07/2026",
      "סכום הלוואה כולל: 850,000 ש\"ח",
      "מסלול 1: פריים — 400,000 ש\"ח, ריבית 5.25%, 240 חודשים",
      "מסלול 2: קבועה לא צמודה — 450,000 ש\"ח, ריבית 4.9%, 300 חודשים",
    ].join("\n"),
  },
});

// Same document, but the extraction failed. buildClientData skips these, so
// anything that lived only in this document becomes unanswerable.
const failedOffer = doc({
  id: "doc-offer-1",
  type: "other",
  filename: "הצעת משכנתא.pdf",
  extractedData: { error: "parse_failed", raw: "<<malformed>>" },
});

const bankStatement = doc({
  id: "doc-bank-1",
  type: "bank_statement",
  filename: "דף חשבון 05-2026.pdf",
  extractedData: {
    structuredFields: {
      accountHolder: "נועה לוי",
      bankName: "בנק דמו",
      period: "05/2026",
      averageBalance: 23800,
      overdraftDays: 0,
    },
    rawText: [
      "דף חשבון — נתוני הדגמה בלבד",
      "בעל חשבון: נועה לוי",
      "בנק: בנק דמו",
      "תקופה: 05/2026",
      "יתרה ממוצעת: 23,800 ש\"ח",
      "ימי חריגה: 0",
    ].join("\n"),
  },
});

function client(id: string, name: string, documents: Document[], notes: string): Client {
  return {
    id,
    userId: "eval-user",
    name,
    phone: "050-0000000",
    email: `${id}@example.invalid`,
    createdAt: AT,
    documents,
    notes,
  };
}

const avi = client("eval-client-avi", "אבי כהן", [paystub, mortgageOffer], "לקוח בתהליך מיחזור משכנתא.");
const aviPartial = client("eval-client-avi", "אבי כהן", [paystub, failedOffer], "לקוח בתהליך מיחזור משכנתא.");
const noa = client("eval-client-noa", "נועה לוי", [bankStatement], "לקוחה חדשה.");
const dana = client("eval-client-dana", "דנה שפירא", [], "טרם הועלו מסמכים.");

// Keys referenced by the `fixture` field of every chat case.
export const FIXTURES: Record<string, Client[]> = {
  // Scoped chat on a client with complete documents.
  avi: [avi],
  // Same client, mortgage offer extraction failed.
  aviPartial: [aviPartial],
  // Global chat across two clients.
  all: [avi, noa],
  // A client with no documents at all.
  empty: [dana],
};

export function resolveFixture(key: string): Client[] {
  const fixture = FIXTURES[key];
  if (!fixture) throw new Error(`[eval] unknown fixture: ${key}`);
  return fixture;
}
