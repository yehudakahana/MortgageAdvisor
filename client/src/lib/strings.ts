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
222
export const GUEST_TEXT = {
  loginButton:"כניסה כאורח",
  loggingIn: "יוצר חשבון אורח...",
  loginFailed: "כניסת האורח נכשלה. נסו שוב.",
  displayName: "אורח",
  badge: "מצב אורח",
  // Keep the total in sync with GUEST_LIMITS.chatPerWindow on the backend.
  badgeQuota: (remaining: number) => `נותרו ${remaining}/20 הודעות`,
  welcomeTitle: "ברוכים הבאים למצב אורח",
  welcomeIntro:
    "זוהי סביבת הדגמה של kay.ai עם לקוח לדוגמה ונתונים פיקטיביים בלבד.",
  welcomeLimitChat: "עד 20 הודעות צ'אט",
  welcomeLimitClients: "עד 2 לקוחות חדשים",
  welcomeLimitUploads: "עד 5 העלאות קבצים (מקסימום 5MB לקובץ)",
  welcomeLimitTtl: "כל הנתונים נמחקים אוטומטית לאחר 24 שעות",
  welcomeConfirm: "הבנתי, בואו נתחיל",
  sessionExpired: "פג תוקף מצב האורח",
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
  // Keep wording in sync with CLIENT_MESSAGES.requiredFields in backend/src/constants/messages.ts.
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
  uploadTitle: "העלאת מסמכים",
  uploading: "מעלה...",
  uploadingProgress: (current: number, total: number) => `מעלה קובץ ${current} מתוך ${total}...`,
  choosePdf: "בחרו קבצי PDF להעלאה...",
  uploadFailed: "העלאה נכשלה. PDF בלבד, מקסימום 10 מגה.",
  networkError: "שגיאת תקשורת — נסו שוב",
  uploadSummaryTitle: "סיכום העלאה",
  uploadSummarySubtitle: (ok: number, total: number) => `${ok} מתוך ${total} קבצים הועלו בהצלחה`,
  uploadSucceededSection: "הועלו בהצלחה",
  uploadFailedSection: "נכשלו",
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

export const SETTINGS_TEXT = {
  openSettings: "הגדרות",
  title: "כללים מותאמים אישית",
  description: "כללים אלו ישפיעו על תשובות קאיה בצ'אט",
  effectHint: "הכללים ייכנסו לתוקף מההודעה הבאה בצ'אט",
  addPlaceholder: "לדוגמה: תמיד לציין את המסלול המומלץ בתחילת התשובה",
  addRule: "הוסף כלל",
  saveRule: "שמירה",
  charCounter: (count: number) => `${count}/200`,
  emptyState: "אין כללים עדיין. הוסיפו כלל ראשון כדי להתאים את תשובות קאיה.",
  limitReached: "הגעתם למקסימום של 25 כללים. מחקו כלל קיים כדי להוסיף חדש.",
  loadFailed: "טעינת הכללים נכשלה.",
  addFailed: "הוספת הכלל נכשלה. נסו שוב.",
  updateFailed: "עדכון הכלל נכשל. נסו שוב.",
  deleteFailed: "מחיקת הכלל נכשלה. נסו שוב.",
  ruleAdded: "הכלל נוסף בהצלחה",
  ruleUpdated: "הכלל עודכן בהצלחה",
  ruleDeleted: "הכלל נמחק",
  confirmDeleteRule: "האם למחוק את הכלל?",
  editRule: "עריכת כלל",
  deleteRule: "מחיקת כלל",
};

export const ERROR_BOUNDARY_TEXT = {
  title: "משהו השתבש.",
  hint: "נסו לרענן את הדף.",
  reload: "רענון הדף",
};
