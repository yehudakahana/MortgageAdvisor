// Usage guides shown in the help area, as image carousels.
// To add a guide: put its images (screenshots, or slides exported as PNG/JPG)
// in client/public/guides/<id>/ and add an entry below, images in display
// order. An empty list shows a "coming soon" note instead.

export interface Guide {
  id: string;
  title: string;
  /** Paths under client/public, e.g. "/guides/upload/1.png". */
  images: string[];
  /** Text guide: paragraphs shown instead of an image carousel (images: []). */
  body?: string[];
}

export const GUIDES: Guide[] = [
  {
    id: "overview",
    title: "מה kay.ai עושה – סקירה כללית",
    images: ["/guides/overview/1.png"],
  },
  {
    id: "tour",
    title: "סיור במסך הראשי",
    images: [1, 2, 3, 4, 5, 6].map((n) => `/guides/tour/${n}.png`),
  },
  {
    id: "rules",
    title: "כללים מותאמים – צ'אט ובדיקת מסמכים",
    images: [],
    body: [
      "בהגדרות → כללים מותאמים יש שני סוגי כללים, כל אחד בלשונית משלו.",
      "כללי צ'אט: משפיעים על איך קאיה עונה בצ'אט. לדוגמה: \"תמיד לציין את המסלול המומלץ בתחילת התשובה\". נכנסים לתוקף מההודעה הבאה.",
      "כללי בדיקת מסמכים (חדש): דרישות שהמסמכים בתיק צריכים לעמוד בהן. לדוגמה: \"חייב להיות תלוש שכר מ-3 החודשים האחרונים\".",
      "מתי הבדיקה רצה: אוטומטית אחרי העלאת מסמך. המערכת מעלה את המסמך, מחלצת אותו ברקע, ואם הגדרת כללי בדיקה – בודקת אותם ומציגה דוח בסוף. אם אין כללי בדיקה, שום בדיקה לא רצה.",
      "הדוח: לכל כלל מופיע תקין, בעיה, או לא ודאי, עם הראיה מהמסמך שעליה התבססה הבדיקה. \"לא ודאי\" אומר שלא היה מספיק מידע כדי להכריע. זו בדיקת עזר – תמיד כדאי לאמת מול המסמך עצמו.",
    ],
  },
];
