import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_TEXT } from "@/lib/strings";

export interface UserFormValues {
  username: string;
  email: string;
  name: string;
  phone: string;
  paidUntil: string; // yyyy-mm-dd or ""
  notes: string;
}

export const EMPTY_USER_FORM: UserFormValues = { username: "", email: "", name: "", phone: "", paidUntil: "", notes: "" };

interface UserFormFieldsProps {
  values: UserFormValues;
  onChange: (values: UserFormValues) => void;
  showUsername: boolean;
  idPrefix: string;
}

// Shared fields of the create and edit forms.
export default function UserFormFields({ values, onChange, showUsername, idPrefix }: UserFormFieldsProps) {
  const field = (key: keyof UserFormValues) => ({
    id: `${idPrefix}-${key}`,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...values, [key]: e.target.value }),
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showUsername && (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-username`}>{ADMIN_TEXT.usernameLabel}</Label>
          <Input {...field("username")} dir="ltr" autoComplete="off" required pattern="[a-z0-9._\-]{3,32}" />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-email`}>{ADMIN_TEXT.emailLabel}</Label>
        <Input {...field("email")} type="email" dir="ltr" required={showUsername} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-name`}>{ADMIN_TEXT.nameLabel}</Label>
        <Input {...field("name")} maxLength={100} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-phone`}>{ADMIN_TEXT.phoneLabel}</Label>
        <Input {...field("phone")} type="tel" dir="ltr" maxLength={30} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-paidUntil`}>{ADMIN_TEXT.paidUntilLabel}</Label>
        <Input {...field("paidUntil")} type="date" dir="ltr" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>{ADMIN_TEXT.notesLabel}</Label>
        <Textarea {...field("notes")} rows={2} maxLength={1000} />
      </div>
    </div>
  );
}
