import { Loader2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

interface AgentBriefingProps {
  text: string;
  isThinking: boolean;
}

function renderInlineFormatting(line: string) {
  const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    const boldMatch = /^\*\*(.*)\*\*$/.exec(part);

    if (boldMatch) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function renderFormattedBriefing(text: string) {
  const lines = text.split("\n");

  return (
    <div className="space-y-3 text-sm leading-7 text-foreground">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`spacer-${index}`} className="h-2" />;
        }

        if (/^\*\*.*\*\*$/.test(trimmed) && !trimmed.includes(":**")) {
          return (
            <h3
              key={`heading-${index}`}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {renderInlineFormatting(trimmed)}
            </h3>
          );
        }

        const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(trimmed);

        if (numberedMatch) {
          return (
            <div key={`numbered-${index}`} className="flex gap-3 rounded-md bg-secondary/40 px-3 py-2">
              <span className="min-w-5 font-mono text-primary">{numberedMatch[1]}.</span>
              <p className="text-sm leading-6 text-foreground">
                {renderInlineFormatting(numberedMatch[2])}
              </p>
            </div>
          );
        }

        const bulletMatch = /^[-*]\s+(.*)$/.exec(trimmed);

        if (bulletMatch) {
          return (
            <div key={`bullet-${index}`} className="flex gap-3 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <p className="text-sm leading-6 text-foreground">
                {renderInlineFormatting(bulletMatch[1])}
              </p>
            </div>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="text-sm leading-7 text-foreground">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function AgentBriefing({ text, isThinking }: AgentBriefingProps) {
  const [visibleTokenCount, setVisibleTokenCount] = useState(0);
  const tokens = useMemo(() => text.match(/\S+\s*|\n/g) ?? [], [text]);
  const displayedText = useMemo(
    () => tokens.slice(0, visibleTokenCount).join(""),
    [tokens, visibleTokenCount],
  );

  useEffect(() => {
    if (!text) {
      setVisibleTokenCount(0);
      return;
    }

    if (visibleTokenCount < tokens.length) {
      const timeout = setTimeout(() => {
        setVisibleTokenCount((current) => Math.min(current + 6, tokens.length));
      }, 45);
      return () => clearTimeout(timeout);
    }
  }, [text, tokens.length, visibleTokenCount]);

  useEffect(() => {
    setVisibleTokenCount(0);
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
          <div className="font-sans">
            {renderFormattedBriefing(displayedText)}
            {visibleTokenCount < tokens.length && (
              <span className="mt-2 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
