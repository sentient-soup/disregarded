import { useEffect, useRef } from "react";

export interface OutputLine {
  id: string;
  content: React.ReactNode;
  type?: "normal" | "success" | "error" | "warning" | "info" | "muted";
}

interface TerminalOutputProps {
  lines: OutputLine[];
}

export function TerminalOutput({ lines }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [lines]);

  const getTypeClass = (type: OutputLine["type"]) => {
    switch (type) {
      case "success":
        return "text-success";
      case "error":
        return "text-error";
      case "warning":
        return "text-warning";
      case "info":
        return "text-info";
      case "muted":
        return "text-muted";
      default:
        return "";
    }
  };

  return (
    <div ref={containerRef}>
      {lines.map((line) => (
        <div key={line.id} className={`output-line ${getTypeClass(line.type)}`}>
          {line.content}
        </div>
      ))}
    </div>
  );
}
