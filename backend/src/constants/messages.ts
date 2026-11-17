// Single source of truth for user-facing (Hebrew) API response messages.
// LLM prompt text lives in services/llm/prompts.ts, not here.

import { GUEST_LIMITS } from "./guest";

export const AUTH_MESSAGES = {
  tooManyAttempts: "יותר מדי ניסיונות התחברות, נסו שוב מאוחר יותר",
  serverConfigError: "תקלה בהגדרות ההזדהות בשרת",
  missingCredentials: "נדרשים שם משתמש וסיסמה",
  badCredentials: "פרטי ההתחברות שגויים",
  missingToken: "חסר אסימון הזדהות",
  invalidToken: "אסימון ההזדהות אינו תקין",
  invalidOrExpiredToken: "אסימון ההזדהות אינו תקין או שפג תוקפו",
  accountDisabled: "החשבון הושבת. לפרטים פנו למנהל המערכת",
  mfaCodeInvalid: "קוד האימות שגוי",
  mfaSessionExpired: "תם הזמן לאימות, התחברו מחדש",
};

export const PASSWORD_MESSAGES = {
  linkInvalid: "הקישור אינו תקף, פג תוקפו או שכבר נעשה בו שימוש",
  passwordTooWeak: "הסיסמה חייבת להכיל לפחות 10 תווים (ועד 72 בתים)",
  setFailed: "שמירת הסיסמה נכשלה, נסו שוב",
  tooManyAttempts: "יותר מדי ניסיונות, נסו שוב מאוחר יותר",
};

export const ADMIN_MESSAGES = {
  forbidden: "אין הרשאה לפעולה זו",
  mfaRequired: "יש להפעיל ולאמת אימות דו-שלבי לפני שימוש בכלי הניהול",
  mfaAlreadyEnabled: "אימות דו-שלבי כבר פעיל בחשבון זה",
  mfaNotStarted: "יש להתחיל את הגדרת האימות הדו-שלבי מחדש",
  tooManyRequests: "יותר מדי בקשות ניהול, נסו שוב מאוחר יותר",
  userNotFound: "המשתמש לא נמצא",
  invalidUsername: "שם משתמש: 3-32 תווים, אותיות אנגליות קטנות, ספרות או . _ -",
  reservedUsername: "שם המשתמש שמור במערכת",
  invalidEmail: "כתובת האימייל אינה תקינה",
  invalidDate: "התאריך אינו תקין",
  invalidFields: "שדות לא תקינים בבקשה",
  usernameTaken: "שם המשתמש כבר קיים",
  emailTaken: "כתובת האימייל כבר משויכת למשתמש אחר",
  cannotTargetSelf: "לא ניתן לבצע פעולה זו על החשבון שלך",
  cannotTargetSuperadmin: "לא ניתן להשבית או למחוק מנהל מערכת",
  userDisabled: "המשתמש מושבת - יש להפעיל אותו לפני יצירת קישור",
  confirmMismatch: "לאישור המחיקה יש להקליד את שם המשתמש במדויק",
  requestFailed: "פעולת הניהול נכשלה",
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
  // The quota window matches the account TTL, so these are the demo's totals,
  // not a countdown: a guest who exhausts them has no renewal to wait for —
  // the account expires first. The exact wait still goes out as Retry-After.
  chatCapReached:
    `הגעתם למגבלת ${GUEST_LIMITS.chatPerWindow} ההודעות של ההדגמה. ` +
    `להמשך שימוש ללא הגבלה יש להתחבר עם חשבון.`,
  promptTooLong: "במצב אורח אורך הודעה מוגבל ל-250 תווים",
  reExtractCapReached:
    `הגעתם למגבלת ${GUEST_LIMITS.reExtractsPerWindow} ניתוחי המסמכים של ההדגמה. ` +
    `להמשך שימוש ללא הגבלה יש להתחבר עם חשבון.`,
};

export const CHAT_MESSAGES = {
  missingMessage: "חסרה הודעה",
  invalidClientId: "מזהה הלקוח אינו תקין",
  requestFailed: "בקשת הצ'אט נכשלה",
  greetingGlobal: "שלום! אני קאיה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?",
  greetingScoped: (clientName: string) =>
    `שלום! אני קאיה. אני כעת מתמקדת בלקוח ${clientName}. במה אוכל לעזור?`,
};

export const VALIDATION_MESSAGES = {
  runFailed: "בדיקת המסמכים נכשלה, נסו שוב מאוחר יותר",
  noVerdict: "לא התקבלה הכרעה עבור כלל זה",
};
