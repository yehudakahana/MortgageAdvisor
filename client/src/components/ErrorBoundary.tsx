import { Component, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Top-level error boundary: catches render errors anywhere in the tree and
// shows a Hebrew fallback with a reload action instead of a blank page.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">משהו השתבש.</h1>
        <p className="text-sm text-muted-foreground">נסו לרענן את הדף.</p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          רענון הדף
        </Button>
      </div>
    );
  }
}
