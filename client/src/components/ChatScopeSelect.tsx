import { Users, UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Client } from "../types/client";

const ALL = "all";

interface Props {
  clients: Client[];
  value: string; // "" means all clients
  onChange: (clientId: string) => void;
  disabled?: boolean;
}

export default function ChatScopeSelect({ clients, value, onChange, disabled }: Props) {
  const isScoped = value !== "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-3 transition-colors",
        isScoped
          ? "border-indigo-200 bg-gradient-to-l from-indigo-50 to-indigo-100/60"
          : "border-border/60 bg-secondary/40"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors",
          isScoped ? "bg-indigo-600 text-white" : "bg-card text-muted-foreground/70 border border-border/60"
        )}
      >
        {isScoped ? <UserCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
      </div>

      <div className="flex flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          מצב שיחה
        </span>
        <span className={cn("text-xs", isScoped ? "text-indigo-700 font-semibold" : "text-muted-foreground")}>
          {isScoped ? "ממוקד בלקוח אחד" : "כל הלקוחות"}
        </span>
      </div>

      <Select
        value={value || ALL}
        onValueChange={(v) => onChange(v === ALL ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-10 flex-1 text-sm font-medium shadow-sm",
            isScoped
              ? "border-indigo-300 bg-white text-indigo-900 focus:ring-indigo-400"
              : "border-border/70 bg-card"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>כל הלקוחות</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
