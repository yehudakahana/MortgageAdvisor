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

// Tab labels for the two rule categories in the settings sheet.
export const RULES_TABS = {
  chat: "כללי צ'אט",
  validation: "בדיקת מסמכים",
};

// Copy for the document-validation rules tab (the chat tab reuses SETTINGS_TEXT).
export const VALIDATION_RULES_TEXT = {
  description: "כללים אלו ייבדקו מול המסמכים שהמשתמשת מעלה לתיק",
  effectHint: "הבדיקה רצה על המסמכים המחולצים של הלקוח, לפי בקשה",
  addPlaceholder: "לדוגמה: חייב להיות תלוש שכר מ-3 החודשים האחרונים",
  emptyState: "אין כללי בדיקה עדיין. הוסיפו כלל כדי לבדוק מסמכים.",
};

// The document-validation report panel, shown under a client's documents.
export const VALIDATION_TEXT = {
  run: "בדיקת מסמכים מול הכללים",
  running: "בודק...",
  skipped: "לא הוגדרו כללי בדיקת מסמכים. הוסיפו כלל בהגדרות כדי להפעיל בדיקה.",
  empty: "אין תוצאות.",
  failed: "בדיקת המסמכים נכשלה. נסו שוב.",
  disclaimer: "בדיקת עזר — יש לאמת מול המסמכים עצמם.",
  evidenceLabel: "נמצא:",
  statusPass: "תקין",
  statusFail: "בעיה",
  statusUncertain: "לא ודאי",
};

// The automatic post-upload flow: inline staged indicator + final report dialog.
export const UPLOAD_FLOW_TEXT = {
  stepUpload: "המסמכים עלו בהצלחה",
  stepExtract: "מתבצע חילוץ ברקע",
  stepValidate: "מתבצעת בדיקה של הכללים המוגדרים",
  doneTitle: "הכל הסתיים בהצלחה",
  uploadsFailedTitle: "חלק מהמסמכים נכשלו בהעלאה",
  reportHeading: "דוח בדיקת מסמכים",
  noRules: "לא הוגדרו כללי בדיקת מסמכים.",
  validationError: "בדיקת הכללים נכשלה. אפשר להריץ שוב מההגדרות.",
};

export const ERROR_BOUNDARY_TEXT = {
  title: "משהו השתבש.",
  hint: "נסו לרענן את הדף.",
  reload: "רענון הדף",
};

export const HELP_TEXT = {
  open: "עזרה ויצירת קשר",
  title: "עזרה ויצירת קשר",
  description: "מדריכים קצרים לשימוש במערכת, ודרכים ליצור קשר.",
  guidesHeading: "מדריכי שימוש",
  noGuides: "המדריכים יעלו בקרוב.",
  contactHeading: "יצירת קשר",
  back: "חזרה למדריכים",
  prev: "התמונה הקודמת",
  next: "התמונה הבאה",
  counter: (current: number, total: number) => `${current} מתוך ${total}`,
  imageAlt: (title: string, n: number) => `${title}, שלב ${n}`,
  stepsCount: (n: number) => `${n} שלבים`,
  loginHowItWorks: "איך זה עובד?",
  loginContact: "יצירת קשר",
};

export const CONTACT_TEXT = {
  name: "יהודה כהנא",
  role: "פיתוח ותמיכה · kay.ai",
  initials: "יכ",
  call: "התקשרות",
  whatsapp: "וואטסאפ",
  email: "מייל",
  linkedin: "לינקדאין",
};

export const LOGIN_MFA_TEXT = {
  title: "אימות דו-שלבי",
  hint: "הזינו את הקוד בן 6 הספרות מאפליקציית האימות, או קוד שחזור.",
  codeLabel: "קוד אימות",
  submit: "אימות",
  submitting: "מאמת...",
  back: "חזרה להתחברות",
  failed: "קוד האימות שגוי או שפג הזמן. נסו שוב.",
};

export const SETUP_TEXT = {
  inviteTitle: "בחירת סיסמה",
  resetTitle: "איפוס סיסמה",
  checking: "בודק את הקישור...",
  forUser: (username: string) => `עבור המשתמש: ${username}`,
  invalidLink: "הקישור אינו תקף, פג תוקפו או שכבר נעשה בו שימוש. בקשו קישור חדש ממנהל המערכת.",
  passwordLabel: "סיסמה חדשה",
  confirmLabel: "אימות סיסמה",
  hint: "לפחות 10 תווים.",
  tooShort: "הסיסמה חייבת להכיל לפחות 10 תווים.",
  mismatch: "הסיסמאות אינן תואמות.",
  submit: "שמירת סיסמה",
  submitting: "שומר...",
  failed: "שמירת הסיסמה נכשלה. נסו שוב.",
  done: "הסיסמה נשמרה. אפשר להתחבר עם שם המשתמש והסיסמה החדשה.",
  toLogin: "למסך ההתחברות",
};

export const ADMIN_TEXT = {
  open: "ניהול משתמשים",
  title: "ניהול משתמשים",
  description: "יצירת חשבונות, קישורי הזמנה ואיפוס, השבתה ויומן פעולות",
  loading: "טוען...",
  loadFailed: "הטעינה נכשלה",
  tabUsers: "משתמשים",
  tabAudit: "יומן פעולות",
  // 2FA
  mfaTitle: "הפעלת אימות דו-שלבי",
  mfaIntro: "כלי הניהול זמינים רק אחרי אימות דו-שלבי. הוסיפו את המפתח לאפליקציית אימות (Google Authenticator, Authy וכדומה) והזינו את הקוד שמופיע בה.",
  mfaStart: "התחלת הגדרה",
  mfaKeyLabel: "מפתח להזנה ידנית",
  mfaCodeLabel: "קוד מהאפליקציה",
  mfaConfirm: "אישור והפעלה",
  mfaRecoveryTitle: "קודי שחזור - שמרו אותם במקום בטוח",
  mfaRecoveryHint: "כל קוד עובד פעם אחת, אם אין גישה לאפליקציה. הם לא יוצגו שוב.",
  mfaRecoveryDone: "שמרתי, המשך",
  mfaReloginNeeded: "אימות דו-שלבי פעיל. התנתקו והתחברו מחדש עם קוד אימות כדי להשתמש בכלי הניהול.",
  // Users table
  colUser: "משתמש",
  colStatus: "סטטוס",
  colPaidUntil: "שולם עד",
  colUsage: "לקוחות / מסמכים",
  colLastLogin: "כניסה אחרונה",
  colActions: "פעולות",
  never: "אף פעם",
  status: { invited: "הוזמן", active: "פעיל", disabled: "מושבת" } as Record<string, string>,
  superadmin: "מנהל",
  paidExpired: "פג תוקף התשלום",
  empty: "אין משתמשים עדיין.",
  // Actions
  edit: "עריכה",
  link: "קישור",
  disable: "השבתה",
  enable: "הפעלה",
  logout: "ניתוק",
  delete: "מחיקה",
  confirmDisable: (u: string) => `להשבית את ${u}? המשתמש ינותק מיד ולא יוכל להתחבר.`,
  confirmLogout: (u: string) => `לנתק את ${u} מכל המכשירים?`,
  confirmAction: "אישור",
  actionDone: "הפעולה בוצעה",
  actionFailed: "הפעולה נכשלה",
  // Create / edit
  newUser: "משתמש חדש",
  create: "יצירה וקבלת קישור",
  creating: "יוצר...",
  save: "שמירה",
  usernameLabel: "שם משתמש (באנגלית)",
  emailLabel: "אימייל",
  nameLabel: "שם",
  phoneLabel: "טלפון",
  paidUntilLabel: "שולם עד",
  notesLabel: "הערות (גלויות רק לך)",
  editTitle: (u: string) => `עריכת ${u}`,
  // Link dialog
  inviteLinkTitle: "קישור הזמנה (בתוקף 7 ימים)",
  resetLinkTitle: "קישור איפוס סיסמה (בתוקף 24 שעות)",
  linkHint: "הקישור מוצג פעם אחת בלבד. שלחו אותו למשתמש - הוא יבחר סיסמה בעצמו. קישור חדש מבטל את הקודם.",
  copy: "העתקה",
  copied: "הקישור הועתק",
  // Delete
  deleteTitle: (u: string) => `מחיקת ${u}`,
  deleteWarning: "פעולה בלתי הפיכה: נמחקים כל הלקוחות, המסמכים והכללים של המשתמש.",
  deleteTypeToConfirm: (u: string) => `להקליד "${u}" לאישור`,
  // Audit
  auditTime: "מתי",
  auditActor: "מי",
  auditAction: "פעולה",
  auditTarget: "על מי",
  auditEmpty: "אין רשומות.",
  auditMore: "טעינת רשומות נוספות",
};
