import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AgentBriefingProps {
  text: string;
  isThinking: boolean;
}

export function AgentBriefing({ text, isThinking }: AgentBriefingProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }
    // Animate new characters as text grows (streaming)
    if (text.length > displayedText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 2));
      }, 15);
      return () => clearTimeout(timeout);
    }
  }, [text, displayedText]);

  // Reset when text resets
  useEffect(() => {
    if (!text) setDisplayedText("");
  }, [text]);

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 border-b border-border">
        Agent Briefing
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {isThinking && !text && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Thinking…
          </div>
        )}
        {displayedText && (
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans">
            {displayedText}
            {displayedText.length < text.length && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
