import { useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { CONTACT_LINKS } from "@/lib/contact";
import { CONTACT_TEXT } from "@/lib/strings";

// lucide-react v1 dropped brand icons, so LinkedIn is a small inline SVG.
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C21.6 8.65 22 11.2 22 14.5V21h-4v-5.8c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.52-2.25 3.1V21h-4V9Z" />
    </svg>
  );
}

const actions = [
  { href: CONTACT_LINKS.phone, label: CONTACT_TEXT.call, Icon: Phone, external: false },
  { href: CONTACT_LINKS.whatsapp, label: CONTACT_TEXT.whatsapp, Icon: MessageCircle, external: true },
  { href: `mailto:${CONTACT_LINKS.email}`, label: CONTACT_TEXT.email, Icon: Mail, external: false },
  { href: CONTACT_LINKS.linkedin, label: CONTACT_TEXT.linkedin, Icon: LinkedInIcon, external: true },
];

// Compact contact card: photo (or initials), name, role and icon actions.
export default function ContactCard() {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        {photoFailed ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-lg font-bold text-white">
            {CONTACT_TEXT.initials}
          </div>
        ) : (
          <img
            src={CONTACT_LINKS.photo}
            alt={CONTACT_TEXT.name}
            onError={() => setPhotoFailed(true)}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{CONTACT_TEXT.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{CONTACT_TEXT.role}</p>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
            {CONTACT_LINKS.phoneDisplay} · {CONTACT_LINKS.email}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {actions.map(({ href, label, Icon, external }) => (
          <a
            key={label}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border bg-background text-[11px] text-muted-foreground transition-colors hover:border-indigo-300 hover:text-indigo-900"
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
