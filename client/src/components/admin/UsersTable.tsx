import { AdminUser } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ADMIN_TEXT } from "@/lib/strings";

export type UserAction = "edit" | "link" | "disable" | "enable" | "logout" | "delete";

interface UsersTableProps {
  users: AdminUser[];
  currentUsername: string | null;
  onAction: (action: UserAction, user: AdminUser) => void;
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("he-IL") : ADMIN_TEXT.never);

// Highlight only - nothing blocks a user automatically by date.
const isPaidExpired = (u: AdminUser) => !!u.paidUntil && new Date(u.paidUntil).getTime() < Date.now();

export default function UsersTable({ users, currentUsername, onAction }: UsersTableProps) {
  if (users.length === 0) return <p className="p-4 text-sm text-muted-foreground">{ADMIN_TEXT.empty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{ADMIN_TEXT.colUser}</TableHead>
          <TableHead>{ADMIN_TEXT.colStatus}</TableHead>
          <TableHead>{ADMIN_TEXT.colPaidUntil}</TableHead>
          <TableHead>{ADMIN_TEXT.colUsage}</TableHead>
          <TableHead>{ADMIN_TEXT.colLastLogin}</TableHead>
          <TableHead>{ADMIN_TEXT.colActions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => {
          const isSelf = u.username === currentUsername;
          const protectedUser = isSelf || u.role === "superadmin";
          const expired = isPaidExpired(u);
          return (
            <TableRow key={u.id} className={cn(expired && u.status !== "disabled" && "bg-amber-50")}>
              <TableCell>
                <div className="font-medium" dir="ltr">{u.username}</div>
                <div className="text-xs text-muted-foreground">{u.name || u.email}</div>
                {u.role === "superadmin" && <Badge variant="secondary" className="mt-1">{ADMIN_TEXT.superadmin}</Badge>}
              </TableCell>
              <TableCell>
                <Badge variant={u.status === "disabled" ? "destructive" : u.status === "invited" ? "outline" : "default"}>
                  {ADMIN_TEXT.status[u.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {u.paidUntil ? formatDate(u.paidUntil) : "-"}
                {expired && <div className="text-xs font-medium text-amber-700">{ADMIN_TEXT.paidExpired}</div>}
              </TableCell>
              <TableCell>{u.clientCount} / {u.documentCount}</TableCell>
              <TableCell>{formatDate(u.lastLogin)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => onAction("edit", u)}>{ADMIN_TEXT.edit}</Button>
                  {u.status !== "disabled" && (
                    <Button size="sm" variant="outline" onClick={() => onAction("link", u)}>{ADMIN_TEXT.link}</Button>
                  )}
                  {u.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => onAction("logout", u)}>{ADMIN_TEXT.logout}</Button>
                  )}
                  {!protectedUser && u.status !== "disabled" && (
                    <Button size="sm" variant="outline" onClick={() => onAction("disable", u)}>{ADMIN_TEXT.disable}</Button>
                  )}
                  {u.status === "disabled" && (
                    <Button size="sm" variant="outline" onClick={() => onAction("enable", u)}>{ADMIN_TEXT.enable}</Button>
                  )}
                  {!protectedUser && (
                    <Button size="sm" variant="destructive" onClick={() => onAction("delete", u)}>{ADMIN_TEXT.delete}</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
