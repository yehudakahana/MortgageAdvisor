import { Schema, model } from "mongoose";
import { Client, Document } from "../types";

// Embedded document subdocument. It carries its own uuid `id`, so Mongoose's
// per-subdocument `_id` is disabled to avoid a redundant identifier.
const DocumentSchema = new Schema<Document>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["paystub", "bank_statement", "id_card", "other"],
      default: "other",
    },
    filename: { type: String, required: true },
    // R2 object key + resolved MIME. Optional so legacy disk-era subdocuments
    // (which predate R2) still validate on read/save.
    key: { type: String },
    mimetype: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    // Polymorphic: either { structuredFields?, rawText? } on success or
    // { error, raw? } on failure — kept loose as Mixed.
    extractedData: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ClientSchema = new Schema<Client>(
  {
    // The uuid `id` is the public lookup key (not Mongo's _id), keeping the API
    // and frontend contract unchanged.
    id: { type: String, required: true, unique: true, index: true },
    // Tenant key — every route query must scope by it. Indexed because all
    // list/lookup queries filter on it.
    userId: { type: String, required: true, index: true },
    // Present (true) only on the system-owned demo template client.
    isTemplate: { type: Boolean },
    // Present (true) on a guest's clone of that template — excluded from the
    // guest's client-creation quota.
    isSample: { type: Boolean },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    notes: { type: String, default: "" },
    documents: { type: [DocumentSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    // Strip Mongo's internal _id from API responses so the serialized shape
    // matches the original db.json records (id-only).
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { _id?: unknown })._id;
        return ret;
      },
    },
  }
);

export const ClientModel = model<Client>("Client", ClientSchema);
