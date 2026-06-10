import { Request, Response } from "express";
import { ClientModel } from "../models/Client";
import { deleteObject } from "../services/storageService";

// Delete a single document: remove the R2 object (best-effort, same pattern as
// client deletion) and pull the embedded metadata. Returns the updated client.
export async function deleteDocument(req: Request, res: Response) {
  const { clientId, docId } = req.params;

  let client;
  try {
    client = await ClientModel.findOne({ id: clientId });
  } catch (err) {
    console.error("[delete-doc] lookup failed:", err);
    return res.status(500).json({ error: "טעינת הלקוח נכשלה" });
  }
  if (!client) return res.status(404).json({ error: "הלקוח לא נמצא" });

  const doc = client.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: "המסמך לא נמצא" });

  if (doc.key) await deleteObject(doc.key).catch(() => undefined);

  try {
    const updated = await ClientModel.findOneAndUpdate(
      { id: clientId },
      { $pull: { documents: { id: docId } } },
      { returnDocument: "after" }
    );
    res.json(updated);
  } catch (err) {
    console.error("[delete-doc] failed to remove document:", err);
    res.status(500).json({ error: "מחיקת המסמך נכשלה" });
  }
}
