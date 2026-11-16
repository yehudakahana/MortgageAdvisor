import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LinkType } from "@/api/admin";
import { toast } from "@/lib/toast";
import { ADMIN_TEXT, COMMON_TEXT } from "@/lib/strings";

interface LinkDialogProps {
  link: { type: LinkType; url: string } | null;
  onClose: () => void;
}

// Shows a freshly issued invite / reset link once. It is held only in memory
// and dropped when the dialog closes.
export default function LinkDialog({ link, onClose }: LinkDialogProps) {
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast(ADMIN_TEXT.copied, "success");
    } catch {
      // Clipboard blocked: the link is selectable in the box.
    }
  }

  return (
    <Dialog open={!!link} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogTitle className="text-right">
          {link?.type === "reset" ? ADMIN_TEXT.resetLinkTitle : ADMIN_TEXT.inviteLinkTitle}
        </DialogTitle>
        <DialogDescription className="text-right">{ADMIN_TEXT.linkHint}</DialogDescription>
        <code dir="ltr" className="block select-all break-all rounded-md bg-muted p-3 text-xs">{link?.url}</code>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{COMMON_TEXT.close}</Button>
          <Button onClick={copy}>{ADMIN_TEXT.copy}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
