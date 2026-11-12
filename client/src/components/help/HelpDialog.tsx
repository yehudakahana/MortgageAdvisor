import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { HELP_TEXT } from "@/lib/strings";
import HelpContent from "./HelpContent";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Help & contact modal for the login page, where there is no header to
// host a drawer button.
export default function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogTitle className="text-right">{HELP_TEXT.title}</DialogTitle>
        <DialogDescription className="text-right">{HELP_TEXT.description}</DialogDescription>
        <div className="mt-4 overflow-y-auto">
          <HelpContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
