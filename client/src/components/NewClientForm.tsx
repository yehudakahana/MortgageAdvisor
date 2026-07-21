import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CLIENTS_TEXT } from "@/lib/strings";

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
            <Label htmlFor="client-name" className="text-sm font-medium">{CLIENTS_TEXT.nameLabel}</Label>
            <Input id="client-name" placeholder={CLIENTS_TEXT.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="h-10 max-md:h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-phone" className="text-sm font-medium">{CLIENTS_TEXT.phoneLabel}</Label>
            <Input id="client-phone" placeholder={CLIENTS_TEXT.phonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 max-md:h-11 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-email" className="text-sm font-medium">{CLIENTS_TEXT.emailLabel}</Label>
            <Input id="client-email" placeholder={CLIENTS_TEXT.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 max-md:h-11 text-base" />
          </div>
          {formError && <p className="text-destructive text-sm">{formError}</p>}
          <Button
            type="submit"
            disabled={saving}
            className="w-full h-10 max-md:h-11 text-base bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 border-0"
          >
            {saving ? CLIENTS_TEXT.saving : CLIENTS_TEXT.addClient}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
