// Usage guides shown in the help area, as image carousels.
// To add a guide: put its images (screenshots, or slides exported as PNG/JPG)
// in client/public/guides/<id>/ and add an entry below, images in display
// order. An empty list shows a "coming soon" note instead.

export interface Guide {
  id: string;
  title: string;
  /** Paths under client/public, e.g. "/guides/upload/1.png". */
  images: string[];
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
  // {
  //   id: "upload",
  //   title: "איך מעלים מסמכים לתיק",
  //   images: ["/guides/upload/1.png", "/guides/upload/2.png"],
  // },
];
