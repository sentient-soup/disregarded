import { TerminalInput } from "./TerminalInput";
import { TerminalOutput, type OutputLine } from "./TerminalOutput";

interface TerminalProps {
  lines: OutputLine[];
  onCommand: (command: string) => void;
  history: string[];
  isProcessing?: boolean;
  isAuthenticated?: boolean;
  username?: string | null;
}

export function Terminal({ 
  lines, 
  onCommand, 
  history, 
  isProcessing = false,
  isAuthenticated = false,
  username = null,
}: TerminalProps) {
  return (
    <div className="input-box">
      {/* Terminal box with output and input */}
      <div className="terminal-box">
        {/* Output area */}
        <div className="terminal-output-area">
          <TerminalOutput lines={lines} />
        </div>
        
        {/* Input */}
        <TerminalInput
          onSubmit={onCommand}
          disabled={isProcessing}
          history={history}
        />
      </div>
      
      {/* Status line */}
      <div className="status-line">
        <span className="status-label">Mode</span>
        <span className="status-value">
          {isAuthenticated ? "Authenticated" : "Guest"}
        </span>
        {isAuthenticated && username && (
          <>
            <span className="status-muted">as</span>
            <span className="status-value">{username}</span>
          </>
        )}
        {isProcessing && (
          <span className="ml-auto">
            <span className="spinner" />
          </span>
        )}
      </div>

      {/* Hints */}
      <div className="hints-bar">
        <div className="hint-item">
          <span className="hint-key">help</span>
          <span className="hint-label">commands</span>
        </div>
        <div className="hint-item">
          <span className="hint-key">new</span>
          <span className="hint-label">essay</span>
        </div>
        <div className="hint-item">
          <span className="hint-key">browse</span>
          <span className="hint-label">public</span>
        </div>
      </div>
    </div>
  );
}
