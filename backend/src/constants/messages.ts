// Single source of truth for user-facing (Hebrew) API response messages.
// LLM prompt text lives in services/llm/prompts.ts, not here.

import { GUEST_LIMITS } from "./guest";

// Humanised wait: "בעוד דקה" / "בעוד 43 דקות" / "בעוד שעתיים" / "בעוד 23 שעות".
// Hebrew drops the numeral in the singular and has a dedicated dual form for
// two. Quota windows are up to a day, so minutes alone would read as "בעוד
// 1440 דקות".
function inTime(minutes: number): string {
  if (minutes <= 1) return "בעוד דקה";
  if (minutes < 60) return `בעוד ${minutes} דקות`;
  const hours = Math.max(1, Math.round(minutes / 60));
  if (hours === 1) return "בעוד שעה";
  if (hours === 2) return "בעוד שעתיים";
  return `בעוד ${hours} שעות`;
}

export const AUTH_MESSAGES = {
  tooManyAttempts: "יותר מדי ניסיונות התחברות, נסו שוב מאוחר יותר",
  serverConfigError: "תקלה בהגדרות ההזדהות בשרת",
  missingCredentials: "נדרשים שם משתמש וסיסמה",
  badCredentials: "פרטי ההתחברות שגויים",
  missingToken: "חסר אסימון הזדהות",
  invalidToken: "אסימון ההזדהות אינו תקין",
  invalidOrExpiredToken: "אסימון ההזדהות אינו תקין או שפג תוקפו",
};

export const CLIENT_MESSAGES = {
  listFailed: "טעינת הלקוחות נכשלה",
  fetchFailed: "טעינת נתוני הלקוח נכשלה",
  notFound: "הלקוח לא נמצא",
  // Keep wording in sync with CLIENTS_TEXT.requiredFields in client/src/lib/strings.ts.
  requiredFields: "שם וטלפון הם שדות חובה",
  fieldsMustBeStrings: "שדות הלקוח חייבים להיות מחרוזות",
  updateFieldsMustBeStrings: "שדות העדכון חייבים להיות מחרוזות",
  noValidUpdateFields: "אין שדות תקינים לעדכון",
  createFailed: "יצירת הלקוח נכשלה",
  updateFailed: "עדכון הלקוח נכשל",
  deleteFailed: "מחיקת הלקוח נכשלה",
};

export const DOCUMENT_MESSAGES = {
  notFound: "המסמך לא נמצא",
  invalidType: "סוג המסמך אינו תקין",
  deleteFailed: "מחיקת המסמך נכשלה",
  viewLinkFailed: "יצירת קישור הצפייה נכשלה",
  fileNotInStorage: "הקובץ לא נמצא באחסון",
};

export const UPLOAD_MESSAGES = {
  noFile: "לא הועלה קובץ",
  fileTooLarge: "הקובץ גדול מדי (מקסימום 10MB)",
  uploadFailed: "העלאת הקובץ נכשלה",
  unsupportedType: "סוג קובץ לא נתמך",
  validationFailed: "אימות הקובץ נכשל",
  saveFailed: "שמירת המסמך נכשלה",
};

export const SETTINGS_MESSAGES = {
  fetchFailed: "טעינת הכללים נכשלה",
  saveFailed: "שמירת הכלל נכשלה",
  deleteFailed: "מחיקת הכלל נכשלה",
  emptyRule: "לא ניתן לשמור כלל ריק",
  ruleTooLong: "הכלל ארוך מדי (מקסימום 200 תווים)",
  duplicateRule: "כלל זהה כבר קיים",
  ruleLimitReached: "לא ניתן להוסיף יותר מ-25 כללים",
  ruleNotFound: "הכלל לא נמצא",
};

export const GUEST_MESSAGES = {
  creationFailed: "יצירת חשבון אורח נכשלה, נסו שוב",
  // Shown when a limit check itself fails (DB error) — not when a limit is hit.
  limitCheckFailed: "בדיקת מגבלות מצב האורח נכשלה, נסו שוב",
  tooManyGuestAccounts: "נוצרו יותר מדי חשבונות אורח מכתובת זו, נסו שוב מחר",
  clientCapReached: "במצב אורח ניתן ליצור עד 2 לקוחות נוספים",
  uploadCapReached: "במצב אורח ניתן להעלות עד 5 קבצים",
  fileTooLarge: "במצב אורח גודל קובץ מוגבל ל-5MB",
  // Both quota caps tell the guest when the window renews, so "try again
  // later" is never a dead end. No time unit is baked into the wording — the
  // window length is a constant and the wait is formatted from it.
  chatCapReached: (resetInMinutes: number) =>
    `הגעתם למגבלת ${GUEST_LIMITS.chatPerWindow} ההודעות במצב אורח. ` +
    `המגבלה מתחדשת ${inTime(resetInMinutes)}.`,
  promptTooLong: "במצב אורח אורך הודעה מוגבל ל-250 תווים",
  reExtractCapReached: (resetInMinutes: number) =>
    `הגעתם למגבלת ${GUEST_LIMITS.reExtractsPerWindow} ניתוחי המסמכים במצב אורח. ` +
    `ניתן יהיה לנתח שוב ${inTime(resetInMinutes)}.`,
};

export const CHAT_MESSAGES = {
  missingMessage: "חסרה הודעה",
  invalidClientId: "מזהה הלקוח אינו תקין",
  requestFailed: "בקשת הצ'אט נכשלה",
  greetingGlobal: "שלום! אני קאיה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?",
  greetingScoped: (clientName: string) =>
    `שלום! אני קאיה. אני כעת מתמקדת בלקוח ${clientName}. במה אוכל לעזור?`,
};
