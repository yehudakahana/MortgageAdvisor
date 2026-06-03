import fs from "fs";
import path from "path";
import { DB, Client, Document, ExtractedData, ExtractionError } from "../types";

const DB_PATH = path.resolve(__dirname, "../../db.json");

function readDB(): DB {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as DB;
}

function writeDB(data: DB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getAllClients(): Client[] {
  return readDB().clients;
}

export function getClientById(id: string): Client | undefined {
  return readDB().clients.find((c) => c.id === id);
}

export function createClient(client: Client): Client {
  const db = readDB();
  db.clients.push(client);
  writeDB(db);
  return client;
}

export function updateClient(id: string, updates: Partial<Client>): Client | null {
  const db = readDB();
  const idx = db.clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  db.clients[idx] = { ...db.clients[idx], ...updates };
  writeDB(db);
  return db.clients[idx];
}

export function addDocumentToClient(clientId: string, doc: Document): Client | null {
  const db = readDB();
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return null;
  client.documents.push(doc);
  writeDB(db);
  return client;
}

export function updateDocumentExtraction(
  clientId: string,
  docId: string,
  extractedData: ExtractedData | ExtractionError
): Client | null {
  const db = readDB();
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return null;
  const doc = client.documents.find((d) => d.id === docId);
  if (!doc) return null;
  doc.extractedData = extractedData;
  writeDB(db);
  return client;
}

export function deleteClient(id: string): boolean {
  const db = readDB();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => c.id !== id);
  writeDB(db);
  return db.clients.length < before;
}
