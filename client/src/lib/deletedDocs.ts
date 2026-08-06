// Session-level tombstones for deleted documents. The extraction poller and
// list reloads refetch clients asynchronously, so a response that left the
// server BEFORE a deletion can land AFTER it and resurrect the deleted row
// (ghost row with only the AI summary — deleting it again 404s). Any doc id
// recorded here is stripped from every refetched client before it hits state.
const deletedDocIds = new Set<string>();

export function markDocDeleted(docId: string): void {
  deletedDocIds.add(docId);
}

export function isDocDeleted(docId: string): boolean {
  return deletedDocIds.has(docId);
}

export function stripDeletedDocs<T extends { documents: { id: string }[] }>(client: T): T {
  if (!client.documents.some((d) => deletedDocIds.has(d.id))) return client;
  return { ...client, documents: client.documents.filter((d) => !deletedDocIds.has(d.id)) };
}
