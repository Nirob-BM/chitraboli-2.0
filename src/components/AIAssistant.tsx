import { Suspense, lazy, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// The chat panel carries the language-model streaming logic, voice input and the
// TTS stack. It lives in its own chunk and is only fetched when the user clicks
// the widget, so it never touches the initial page load.
const AIAssistantPanel = lazy(() =>
  import("./AIAssistantPanel").then((m) => ({ default: m.AIAssistantPanel }))
);

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Once loaded, keep the panel mounted so chat history survives close/open.
  const [hasLoaded, setHasLoaded] = useState(false);

  const toggle = () => {
    setHasLoaded(true);
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Toggle Button - floating on the right side of every device */}
      <button
        onClick={toggle}
        className={cn(
          "flex items-center justify-center gap-2 rounded-full",
          "h-11 w-11 sm:h-auto sm:w-auto sm:px-4 sm:py-2",
          "bg-gradient-to-br from-purple-accent to-purple-accent/80",
          "shadow-[0_0_20px_rgba(139,92,246,0.4)]",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          "text-white text-sm font-medium"
        )}
        aria-label="Toggle AI Assistant"
        aria-expanded={isOpen}
      >
        <Sparkles className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline">AI Assistant</span>
        {!isOpen && (
          <span className="absolute top-0 right-0 sm:static w-2 h-2 bg-gold rounded-full animate-pulse" />
        )}
      </button>


      {hasLoaded && (
        <Suspense fallback={null}>
          <AIAssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </div>
  );
};
