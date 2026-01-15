import { useState, useCallback } from "react";
import "./index.css";
import { AsciiLogo } from "./components/AsciiLogo";
import { Terminal } from "./components/Terminal";
import { EssayEditor } from "./components/EssayEditor";
import { useAuth } from "./hooks/useAuth";
import { useTerminal } from "./hooks/useTerminal.tsx";

interface Essay {
  id?: number;
  title: string;
  content: string;
  status?: "draft" | "published";
}

export function App() {
  const auth = useAuth();
  const [editingEssay, setEditingEssay] = useState<Essay | null | undefined>(undefined);
  const [viewMode, setViewMode] = useState(false);

  const handleEditEssay = useCallback((essay: Essay | null) => {
    setEditingEssay(essay);
    setViewMode(false);
  }, []);

  const terminal = useTerminal({
    isAuthenticated: auth.isAuthenticated,
    username: auth.user?.username || null,
    onLogin: auth.login,
    onRegister: auth.register,
    onLogout: auth.logout,
    onEditEssay: handleEditEssay,
    onViewEssay: (essay) => {
      setEditingEssay(essay);
      setViewMode(true);
    },
  });

  const handleEditorClose = useCallback(() => {
    setEditingEssay(undefined);
    setViewMode(false);
    // Focus terminal input after editor closes
    setTimeout(() => {
      const terminalInput = document.querySelector('.terminal-input') as HTMLInputElement;
      terminalInput?.focus();
    }, 0);
  }, []);

  const handleEditorSaved = useCallback((message: string) => {
    terminal.addLine(message, "success");
  }, [terminal]);

  // Show loading while auth state is being determined
  if (auth.isLoading) {
    return (
      <div className="app-container">
        <div className="terminal-main">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" style={{ width: 32, height: 32 }} />
            <span className="text-muted">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Main terminal area */}
      <div className="terminal-main">
        <AsciiLogo />
        
        <Terminal
          lines={terminal.lines}
          onCommand={terminal.handleCommand}
          history={terminal.history}
          isProcessing={terminal.isProcessing}
          isAuthenticated={auth.isAuthenticated}
          username={auth.user?.username}
        />

        {/* Tip section */}
        <div className="tip-section">
          <span className="tip-dot" />
          <span className="tip-label">Tip</span>
          <span className="tip-text">
            {auth.isAuthenticated ? (
              <>
                Type <span className="tip-key">new</span> to create an essay or <span className="tip-key">list</span> to see your essays
              </>
            ) : (
              <>
                Type <span className="tip-key">login</span> or <span className="tip-key">register</span> to get started
              </>
            )}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="footer-bar">
        <span>~</span>
        <span>disregarded v0.1.0</span>
      </div>

      {/* Essay editor overlay */}
      {editingEssay !== undefined && (
        <EssayEditor
          essay={editingEssay}
          onClose={handleEditorClose}
          onSaved={handleEditorSaved}
          readOnly={viewMode}
          startInPreview={viewMode}
        />
      )}
    </div>
  );
}

export default App;
