// Single source of truth for user-facing (Hebrew) API response messages.
// LLM prompt text lives in services/llm/prompts.ts, not here.

import { GUEST_LIMITS } from "./guest";

// "בעוד דקה" / "בעוד 43 דקות" — the singular drops the numeral in Hebrew.
const inMinutes = (minutes: number) =>
  minutes <= 1 ? "בעוד דקה" : `בעוד ${minutes} דקות`;

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
  tooManyGuestAccounts: "נוצרו יותר מדי חשבונות אורח מכתובת זו, נסו שוב מחר",
  clientCapReached: "במצב אורח ניתן ליצור עד 2 לקוחות נוספים",
  uploadCapReached: "במצב אורח ניתן להעלות עד 5 קבצים",
  fileTooLarge: "במצב אורח גודל קובץ מוגבל ל-5MB",
  // Both hourly caps tell the guest exactly when the next window opens, so
  // "try again later" is never a dead end.
  chatCapReached: (resetInMinutes: number) =>
    `הגעתם למגבלת ${GUEST_LIMITS.chatPerHour} ההודעות לשעה במצב אורח. ` +
    `${GUEST_LIMITS.chatPerHour} הודעות חדשות ייפתחו ${inMinutes(resetInMinutes)}.`,
  promptTooLong: "במצב אורח אורך הודעה מוגבל ל-250 תווים",
  reExtractCapReached: (resetInMinutes: number) =>
    `הגעתם למגבלת ${GUEST_LIMITS.reExtractsPerHour} ניתוחי המסמכים לשעה במצב אורח. ` +
    `ניתן יהיה לנתח שוב ${inMinutes(resetInMinutes)}.`,
};

export const CHAT_MESSAGES = {
  missingMessage: "חסרה הודעה",
  invalidClientId: "מזהה הלקוח אינו תקין",
  requestFailed: "בקשת הצ'אט נכשלה",
  greetingGlobal: "שלום! אני קאיה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?",
  greetingScoped: (clientName: string) =>
    `שלום! אני קאיה. אני כעת מתמקדת בלקוח ${clientName}. במה אוכל לעזור?`,
};
