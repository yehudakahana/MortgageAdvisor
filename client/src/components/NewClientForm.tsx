import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  saving: boolean;
  formError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export default function NewClientForm({ name, setName, phone, setPhone, email, setEmail, saving, formError, onSubmit }: Props) {
  return (
    <Card className="m-3 shadow-sm border-border/60 bg-slate-50/70">
      <CardContent className="pt-4 pb-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="client-name" className="text-xs font-medium">שם מלא *</Label>
            <Input id="client-name" placeholder="ישראל ישראלי" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-phone" className="text-xs font-medium">טלפון *</Label>
            <Input id="client-phone" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-email" className="text-xs font-medium">אימייל</Label>
            <Input id="client-email" placeholder="mail@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
          </div>
          {formError && <p className="text-destructive text-xs">{formError}</p>}
          <Button
            type="submit"
            disabled={saving}
            className="w-full h-9 text-sm bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 border-0"
          >
            {saving ? "שומר..." : "הוסף לקוח"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
