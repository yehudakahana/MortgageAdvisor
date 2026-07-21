// Single source of truth for user-facing UI text (Hebrew only, per project
// rules). Document-type labels stay in types/client.ts (DOC_TYPE_LABELS) and
// extraction-field labels in lib/documentFields.ts. The real chat greetings
// come from the backend (/api/chat/reset) — only the offline fallback is here.

export const COMMON_TEXT = {
  close: "סגור",
  cancel: "ביטול",
  delete: "מחיקה",
  retry: "נסו שוב",
};

export const APP_TEXT = {
  title: "kay.ai",
  tagline: "עוזרת יועץ משכנתאות",
  initial: "ק",
  logout: "התנתקות",
  openClientsPanel: "פתח רשימת לקוחות",
};

export const LOGIN_TEXT = {
  tagline: "עוזרת יועץ משכנתאות · התחברות",
  usernameLabel: "שם משתמש",
  passwordLabel: "סיסמה",
  submit: "התחברות",
  submitting: "מתחבר...",
  missingFields: "יש להזין שם משתמש וסיסמה.",
  badCredentials: "שם משתמש או סיסמה שגויים.",
};

export const CHAT_TEXT = {
  assistantName: "קאיה",
  assistantInitial: "ק",
  userName: "אתה",
  userInitial: "א",
  scopeTip: "טיפ: אפשר לשנות את מצב השיחה בכל שלב בבורר שלמעלה — לקוח ממוקד או כלל הלקוחות.",
  newConversation: "שיחה חדשה",
  inputPlaceholder: "שאל את קאיה משהו...",
  fallbackGreeting: "שלום! במה אוכל לעזור?",
  networkError: "בעיה בחיבור לשרת. בדקו את החיבור ונסו שוב.",
  replyError: "קאיה לא הצליחה לענות כרגע. נסו שוב בעוד רגע.",
  scopeLabel: "מצב שיחה",
  scopeFocused: "ממוקד בלקוח אחד",
  scopeAll: "כלל הלקוחות",
  fallbackModelNote: "(מודל גיבוי)",
};

export const CLIENTS_TEXT = {
  title: "לקוחות",
  newClient: "לקוח חדש",
  searchPlaceholder: "חיפוש לקוח...",
  loading: "טוען לקוחות...",
  loadFailed: "טעינת הלקוחות נכשלה. נסו לרענן.",
  emptyList: "אין לקוחות עדיין.",
  emptyListHint: 'לחץ "לקוח חדש" להוספת הלקוח הראשון.',
  noSearchResults: "לא נמצאו לקוחות.",
  deleteClient: "מחק לקוח",
  nameLabel: "שם מלא *",
  namePlaceholder: "ישראל ישראלי",
  phoneLabel: "טלפון *",
  phonePlaceholder: "050-0000000",
  emailLabel: "אימייל",
  emailPlaceholder: "mail@example.com",
  saving: "שומר...",
  addClient: "הוסף לקוח",
  requiredFields: "שם וטלפון הם שדות חובה.",
  createFailed: "יצירת לקוח נכשלה.",
  deleteClientFailed: "מחיקת הלקוח נכשלה. נסו שוב.",
  deleteDocumentFailed: "מחיקת המסמך נכשלה. נסו שוב.",
  confirmDeleteClient: "למחוק את הלקוח וכל המסמכים שלו? פעולה זו אינה הפיכה.",
  confirmDeleteDocument: "למחוק את המסמך? פעולה זו אינה הפיכה.",
};

export const DOCUMENTS_TEXT = {
  title: "מסמכים",
  empty: "לא הועלו מסמכים עדיין.",
  uploadTitle: "העלאת מסמך",
  uploading: "מעלה...",
  choosePdf: "בחר קובץ PDF להעלאה...",
  uploadFailed: "העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.",
  view: "צפייה בקובץ",
  download: "הורדת קובץ",
  aiSummary: "סיכום AI",
  deleteDocument: "מחק מסמך",
  retryExtraction: "נסה שוב",
  extracting: "מחלץ נתונים מהמסמך...",
  extractionStillRunning: "חילוץ המסמך עדיין רץ — אפשר לנסות שוב עם כפתור החילוץ מחדש.",
  extractionSucceeded: "המסמך חולץ בהצלחה",
  extractionFailed: "חילוץ המסמך נכשל",
  showErrorMessage: "הצג את הודעת השגיאה",
  popupBlocked: "הדפדפן חסם את פתיחת הקובץ. אפשרו חלונות קופצים ונסו שוב.",
  openFailed: "לא ניתן לפתוח את הקובץ. ייתכן שהוא לא נשמר במערכת.",
  downloadStarted: "ההורדה החלה — בדקו את הורדות הדפדפן.",
  downloadFailed: "לא ניתן להוריד את הקובץ. ייתכן שהוא לא נשמר במערכת.",
  noExtractedData: "אין נתונים שחולצו מהמסמך.",
  detailsSection: "פרטי המסמך",
  hideRawText: "הסתר את הטקסט המלא",
  showRawText: "הצג את הטקסט המלא מהמסמך",
  extractedBy: "חולץ על ידי",
};

export const ERROR_BOUNDARY_TEXT = {
  title: "משהו השתבש.",
  hint: "נסו לרענן את הדף.",
  reload: "רענון הדף",
};
