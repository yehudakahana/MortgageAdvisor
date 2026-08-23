// // One-time (idempotent) multi-tenancy migration:
// //   1. Assigns userId to every legacy client record (all pre-migration data
// //      belongs to the consultant's account).
// //   2. Seeds the system-owned demo template client (fictional data) plus its
// //      shared sample PDF in R2 — the record cloned into every guest account.
// // Safe to run twice: step 1 only touches records missing userId, step 2 skips
// // when a template already exists.
// //
// // Run: npm run migrate:user-ids   (uses MONGO_URI + R2 creds from .env)
// import "dotenv/config";
// import mongoose from "mongoose";
// import { randomUUID } from "crypto";
// import { ClientModel } from "../models/Client";
// import { SAMPLE_KEY_PREFIX, SYSTEM_USER_ID } from "../constants/guest";
// import { uploadObject } from "../services/storageService";
// import { buildSamplePdf } from "./samplePdf";


// const SAMPLE_PDF_KEY = `${SAMPLE_KEY_PREFIX}sample-paystub.pdf`;

// // Entirely fictional, pre-extracted demo data — no LLM call needed for guests.
// function buildTemplateClient() {
//   return {
//     id: randomUUID(),
//     userId: SYSTEM_USER_ID,
//     isTemplate: true,
//     name: "ישראל ישראלי (דוגמה)",
//     phone: "050-0000000",
//     email: "demo@example.com",
//     notes: "לקוח לדוגמה — כל הנתונים פיקטיביים",
//     documents: [
//       {
//         id: randomUUID(),
//         type: "paystub" as const,
//         filename: "תלוש שכר לדוגמה.pdf",
//         key: SAMPLE_PDF_KEY,
//         mimetype: "application/pdf",
//         uploadedAt: new Date(),
//         extractedData: {
//           structuredFields: {
//             employeeName: "ישראל ישראלי",
//             employer: 'חברת הדגמה בע"מ',
//             period: "06/2026",
//             grossSalary: "18,300 ₪",
//             netSalary: "12,450 ₪",
//           },
//           rawText:
//             "תלוש שכר לדוגמה (נתונים פיקטיביים): ישראל ישראלי, חברת הדגמה בע\"מ, " +
//             "תקופה 06/2026. שכר ברוטו 18,300 ₪, שכר נטו 12,450 ₪.",
//           extractedBy: { provider: "system", model: "template-seed" },
//         },
//       },
//     ],
//   };
// }

// async function migrateOwnership(): Promise<void> {
//   const total = await ClientModel.countDocuments({});
//   const missing = await ClientModel.countDocuments({ userId: { $exists: false } });
//   console.log(`[migrate] clients total: ${total}, missing userId: ${missing}`);

//   if (missing === 0) {
//     console.log("[migrate] ownership already migrated - nothing to do");
//     return;
//   }
//   const res = await ClientModel.updateMany(
//     { userId: { $exists: false } },
//     { $set: { userId: CONSULTANT_USER_ID } }
//   );
//   console.log(`[migrate] assigned ${res.modifiedCount} clients to "${CONSULTANT_USER_ID}"`);
// }

// async function seedTemplate(): Promise<void> {
//   const existing = await ClientModel.findOne({ isTemplate: true, userId: SYSTEM_USER_ID });
//   if (existing) {
//     console.log(`[migrate] template client already exists (${existing.id}) - skipping seed`);
//     return;
//   }
//   console.log("[migrate] uploading shared sample PDF to R2...");
//   await uploadObject({
//     key: SAMPLE_PDF_KEY,
//     body: buildSamplePdf(),
//     contentType: "application/pdf",
//     contentDisposition: "inline",
//   });
//   const template = await ClientModel.create(buildTemplateClient());
//   console.log(`[migrate] created template client ${template.id}`);
// }

// async function main(): Promise<void> {
//   const uri = process.env.MONGO_URI;
//   if (!uri) throw new Error("MONGO_URI is not set");
//   await mongoose.connect(uri);
//   console.log("[migrate] connected to MongoDB");

//   await migrateOwnership();
//   await seedTemplate();

//   const byOwner = await ClientModel.aggregate([
//     { $group: { _id: "$userId", count: { $sum: 1 } } },
//   ]);
//   console.log("[migrate] clients by owner:", JSON.stringify(byOwner));

//   await mongoose.disconnect();
//   console.log("[migrate] done");
// }

// main().catch((err) => {
//   console.error("[migrate] failed:", err);
//   process.exit(1);
// });
