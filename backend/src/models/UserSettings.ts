import { Schema, model } from "mongoose";
import { KnowledgeRule, UserSettings } from "../types";

// Embedded rule subdocument. It carries its own uuid `id`, so Mongoose's
// per-subdocument `_id` is disabled to avoid a redundant identifier.
const KnowledgeRuleSchema = new Schema<KnowledgeRule>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const UserSettingsSchema = new Schema<UserSettings>(
  {
    // The JWT username is the public lookup key — one settings doc per user.
    username: { type: String, required: true, unique: true, index: true },
    customKnowledge: { type: [KnowledgeRuleSchema], default: [] },
  },
  {
    versionKey: false,
    // Strip Mongo's internal _id from API responses (username + rules only).
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as { _id?: unknown })._id;
        return ret;
      },
    },
  }
);

export const UserSettingsModel = model<UserSettings>("UserSettings", UserSettingsSchema);
