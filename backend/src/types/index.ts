export interface Document {
  id: string;
  type: "paystub" | "bank_statement" | "id_card" | "other";
  filename: string;
  uploadedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  documents: Document[];
  notes: string;
}

export interface DB {
  clients: Client[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
