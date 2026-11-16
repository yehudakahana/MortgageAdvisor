import { useEffect, useState } from "react";
import { AuditEntry, getAudit } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_TEXT } from "@/lib/strings";

// Read-only, newest first. Action names are shown as recorded (English codes).
export default function AuditTab() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAudit(page)
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setHasMore(res.hasMore);
      })
      .catch(() => setError(true));
  }, [page]);

  if (error) return <p className="p-5 text-sm text-destructive" role="alert">{ADMIN_TEXT.loadFailed}</p>;
  if (items.length === 0) return <p className="p-5 text-sm text-muted-foreground">{ADMIN_TEXT.auditEmpty}</p>;

  return (
    <div className="space-y-3 p-5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ADMIN_TEXT.auditTime}</TableHead>
            <TableHead>{ADMIN_TEXT.auditActor}</TableHead>
            <TableHead>{ADMIN_TEXT.auditAction}</TableHead>
            <TableHead>{ADMIN_TEXT.auditTarget}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap">{new Date(e.createdAt).toLocaleString("he-IL")}</TableCell>
              <TableCell dir="ltr">{e.actor}</TableCell>
              <TableCell dir="ltr" className="font-mono text-xs">{e.action}</TableCell>
              <TableCell dir="ltr">{e.target ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && (
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>{ADMIN_TEXT.auditMore}</Button>
      )}
    </div>
  );
}
