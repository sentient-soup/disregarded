import { useState, useCallback, useEffect } from "react";
import "./index.css";
import { AsciiLogo } from "./components/AsciiLogo";
import { Terminal } from "./components/Terminal";
import { EssayEditor } from "./components/EssayEditor";
import { useAuth, authFetch } from "./hooks/useAuth";
import { useTerminal } from "./hooks/useTerminal.tsx";

interface Essay {
  id?: string;
  title: string;
  content: string;
  status?: "draft" | "published";
}

// Update browser URL without reload
function updateUrl(essayId?: string) {
  const path = essayId ? `/${essayId}` : "/";
  window.history.pushState({}, "", path);
}

// Parse essay ID from URL path (alphanumeric short IDs)
function getEssayIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

export function App() {
  const auth = useAuth();
  const [editingEssay, setEditingEssay] = useState<Essay | null | undefined>(undefined);
  const [viewMode, setViewMode] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const handleEditEssay = useCallback((essay: Essay | null) => {
    setEditingEssay(essay);
    setViewMode(false);
    // Update URL when editing (but not for new essays)
    if (essay?.id) {
      updateUrl(essay.id);
    }
  }, []);

  const handleViewEssay = useCallback((essay: Essay) => {
    setEditingEssay(essay);
    setViewMode(true);
    // Update URL when viewing
    if (essay.id) {
      updateUrl(essay.id);
    }
  }, []);

  const terminal = useTerminal({
    isAuthenticated: auth.isAuthenticated,
    username: auth.user?.username || null,
    onLogin: auth.login,
    onRegister: auth.register,
    onLogout: auth.logout,
    onEditEssay: handleEditEssay,
    onViewEssay: handleViewEssay,
  });

  // Load essay from URL on initial page load
  useEffect(() => {
    if (auth.isLoading || initialLoadDone) return;

    const essayId = getEssayIdFromUrl();
    if (essayId) {
      // Fetch and display the essay (use authFetch to include token if logged in)
      authFetch(`/api/essays/${essayId}`)
        .then(res => res.json())
        .then(data => {
          if (data.essay) {
            setEditingEssay(data.essay);
            // If it's a draft, open in edit mode (user must be owner to see drafts)
            // If published, open in view mode
            setViewMode(data.essay.status !== "draft");
          }
        })
        .catch(() => {
          // Silently fail - essay not found or network error
        })
        .finally(() => {
          setInitialLoadDone(true);
        });
    } else {
      setInitialLoadDone(true);
    }
  }, [auth.isLoading, initialLoadDone]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const essayId = getEssayIdFromUrl();
      if (essayId) {
        authFetch(`/api/essays/${essayId}`)
          .then(res => res.json())
          .then(data => {
            if (data.essay) {
              setEditingEssay(data.essay);
              setViewMode(data.essay.status !== "draft");
            }
          })
          .catch(() => {
            setEditingEssay(undefined);
            setViewMode(false);
          });
      } else {
        setEditingEssay(undefined);
        setViewMode(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleEditorClose = useCallback(() => {
    setEditingEssay(undefined);
    setViewMode(false);
    // Reset URL to root
    updateUrl();
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
