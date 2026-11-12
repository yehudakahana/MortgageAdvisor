import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { HELP_TEXT } from "@/lib/strings";
import HelpContent from "./HelpContent";

interface HelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Help & contact drawer in the main app. Mirrors SettingsSheet's side and
// width so both header drawers feel the same.
export default function HelpSheet({ open, onOpenChange }: HelpSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-96 max-w-[90vw] p-0">
        <div className="flex h-full flex-col">
          <div className="border-b px-5 pb-3 pt-5">
            <SheetTitle>{HELP_TEXT.title}</SheetTitle>
            <SheetDescription className="mt-1">{HELP_TEXT.description}</SheetDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <HelpContent />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
