import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { marked } from "marked";
import markedAlert from "marked-alert";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { everforest } from "../lib/codemirror-theme";
import { authFetch } from "../hooks/useAuth";
import { spellCheckExtension } from "../lib/spellcheck";
import { DictionaryPopup } from "./DictionaryPopup";

interface Essay {
  id?: string;
  title: string;
  content: string;
  status?: "draft" | "published";
}

interface EssayEditorProps {
  essay: Essay | null; // null = new essay
  onClose: () => void;
  onSaved: (message: string) => void;
  readOnly?: boolean;
  startInPreview?: boolean;
}

interface PromptState {
  message: string;
  value: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

interface DictionaryState {
  word: string;
  position: { x: number; y: number };
}

// Configure marked with GitHub-style alerts
marked.use(markedAlert());

export function EssayEditor({ essay, onClose, onSaved, readOnly = false, startInPreview = false }: EssayEditorProps) {
  const [title, setTitle] = useState(essay?.title || "Untitled");
  const [content, setContent] = useState(essay?.content || "");
  const [currentStatus, setCurrentStatus] = useState<"draft" | "published">(essay?.status || "draft");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showPreview, setShowPreview] = useState(startInPreview);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [dictionaryPopup, setDictionaryPopup] = useState<DictionaryState | null>(null);
  
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNew = !essay?.id;

  // Focus management
  useEffect(() => {
    if (prompt && promptInputRef.current) {
      promptInputRef.current.focus();
    } else if (editorRef.current?.view && !readOnly && !showPreview) {
      editorRef.current.view.focus();
    }
  }, [prompt, readOnly, showPreview]);

  // Generate context-aware status message
  const getDefaultStatusMessage = useCallback(() => {
    const shareHint = essay?.id ? " | Ctrl+L share" : "";
    if (readOnly) {
      const previewHint = showPreview ? "Ctrl+P source" : "Ctrl+P preview";
      return `Ctrl+D define | ${previewHint}${shareHint} | Esc close`;
    } else {
      const publishHint = isNew ? "" : (currentStatus === "published" ? " | Ctrl+Enter unpublish" : " | Ctrl+Enter publish");
      const previewHint = showPreview ? "Ctrl+P edit" : "Ctrl+P preview";
      return `Ctrl+S save | Ctrl+E title | ${previewHint}${publishHint}${shareHint} | Esc close`;
    }
  }, [readOnly, isNew, currentStatus, showPreview, essay?.id]);

  // Keep a ref to always have access to the latest getDefaultStatusMessage
  const getDefaultStatusMessageRef = useRef(getDefaultStatusMessage);
  useEffect(() => {
    getDefaultStatusMessageRef.current = getDefaultStatusMessage;
  }, [getDefaultStatusMessage]);

  // Show initial help message and update when state changes (only if no temp message showing)
  useEffect(() => {
    if (!statusTimeoutRef.current) {
      setStatusMessage(getDefaultStatusMessage());
    }
  }, [getDefaultStatusMessage]);

  const showStatus = useCallback((msg: string, duration = 3000) => {
    // Clear any existing timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }

    setStatusMessage(msg);

    if (duration > 0) {
      statusTimeoutRef.current = setTimeout(() => {
        statusTimeoutRef.current = null;
        // Use ref to get the LATEST default message
        setStatusMessage(getDefaultStatusMessageRef.current());
      }, duration);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (readOnly || isSaving) return;
    if (!title.trim() || title === "Untitled") {
      showStatus("Error: Please set a title first (Ctrl+E)", 3000);
      return;
    }

    setIsSaving(true);
    showStatus("Saving...", 0);
    
    try {
      const url = isNew ? "/api/essays" : `/api/essays/${essay!.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({ title: title.trim(), content }),
      });

      const data = await res.json();

      if (!res.ok) {
        showStatus(`Error: ${data.error || "Failed to save"}`, 3000);
        return;
      }

      showStatus("Saved!", 2000);
      onSaved(isNew ? `Essay created with ID #${data.essay.id}` : "Essay saved");
      
      if (isNew) {
        onClose();
      }
    } catch {
      showStatus("Error: Network error", 3000);
    } finally {
      setIsSaving(false);
    }
  }, [readOnly, isSaving, isNew, essay, title, content, onSaved, onClose, showStatus]);

  const handlePublish = useCallback(async () => {
    if (readOnly || isNew || isSaving) return;

    setIsSaving(true);
    showStatus("Publishing...", 0);

    try {
      const res = await authFetch(`/api/essays/${essay!.id}/publish`, { method: "PUT" });
      const data = await res.json();

      if (!res.ok) {
        showStatus(`Error: ${data.error || "Failed to publish"}`, 3000);
        return;
      }

      setCurrentStatus("published");
      showStatus("Published!", 2000);
      onSaved("Essay published!");
    } catch {
      showStatus("Error: Network error", 3000);
    } finally {
      setIsSaving(false);
    }
  }, [readOnly, isNew, isSaving, essay, onSaved, showStatus]);

  const handleUnpublish = useCallback(async () => {
    if (readOnly || isNew || isSaving) return;

    setIsSaving(true);
    showStatus("Unpublishing...", 0);

    try {
      const res = await authFetch(`/api/essays/${essay!.id}/unpublish`, { method: "PUT" });
      const data = await res.json();

      if (!res.ok) {
        showStatus(`Error: ${data.error || "Failed to unpublish"}`, 3000);
        return;
      }

      setCurrentStatus("draft");
      showStatus("Unpublished (now draft)", 2000);
      onSaved("Essay unpublished");
    } catch {
      showStatus("Error: Network error", 3000);
    } finally {
      setIsSaving(false);
    }
  }, [readOnly, isNew, isSaving, essay, onSaved, showStatus]);

  const handleTogglePublish = useCallback(() => {
    if (currentStatus === "published") {
      handleUnpublish();
    } else {
      handlePublish();
    }
  }, [currentStatus, handlePublish, handleUnpublish]);

  const openTitlePrompt = useCallback(() => {
    setPrompt({
      message: "Title: ",
      value: title === "Untitled" ? "" : title,
      onSubmit: (value) => {
        setTitle(value || "Untitled");
        showStatus(`Title set to "${value || "Untitled"}"`, 2000);
        setPrompt(null);
        editorRef.current?.view?.focus();
      },
      onCancel: () => {
        setPrompt(null);
        editorRef.current?.view?.focus();
      },
    });
  }, [title, showStatus]);

  // Handle Ctrl+L to copy share link
  const handleShareLink = useCallback(() => {
    if (!essay?.id) {
      showStatus("Save essay first to get a shareable link", 2000);
      return;
    }

    const url = `${window.location.origin}/${essay.id}`;
    navigator.clipboard.writeText(url).then(() => {
      showStatus("Link copied to clipboard!", 2000);
    }).catch(() => {
      showStatus("Failed to copy link", 2000);
    });
  }, [essay?.id, showStatus]);

  // Handle Ctrl+D to show dictionary popup for selected word
  const handleDictionaryLookup = useCallback(() => {
    const view = editorRef.current?.view;
    if (!view) return;

    const selection = view.state.selection.main;
    if (selection.empty) {
      showStatus("Select a word first", 2000);
      return;
    }

    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    
    // Check if it's a single word (letters only, possibly with apostrophe)
    const wordMatch = selectedText.match(/^[a-zA-Z]+(?:'[a-zA-Z]+)?$/);
    if (!wordMatch) {
      showStatus("Select a single word to look up", 2000);
      return;
    }

    // Get position for popup
    const coords = view.coordsAtPos(selection.from);
    if (!coords) return;

    setDictionaryPopup({
      word: selectedText,
      position: {
        x: coords.left,
        y: coords.bottom + 8,
      },
    });
  }, [showStatus]);

  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle prompt mode
      if (prompt) {
        if (e.key === "Escape") {
          e.preventDefault();
          prompt.onCancel();
        } else if (e.key === "Enter") {
          e.preventDefault();
          prompt.onSubmit(prompt.value);
        }
        return;
      }

      // Ctrl/Cmd + key commands
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            if (!readOnly) handleSave();
            break;
          case "p":
            e.preventDefault();
            setShowPreview((prev) => {
              showStatus(prev ? "Preview hidden" : "Preview shown", 2000);
              return !prev;
            });
            break;
          case "e":
            e.preventDefault();
            if (!readOnly) openTitlePrompt();
            break;
          case "enter":
            e.preventDefault();
            if (!readOnly && !isNew) handleTogglePublish();
            break;
          case "d":
            e.preventDefault();
            handleDictionaryLookup();
            break;
          case "l":
            e.preventDefault();
            handleShareLink();
            break;
        }
        return;
      }

      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prompt, readOnly, isNew, handleSave, handleTogglePublish, onClose, openTitlePrompt, showStatus, handleDictionaryLookup, handleShareLink]);

  // Calculate line count
  const lineCount = content.split("\n").length;

  // Render markdown preview
  const renderedContent = marked(content) as string;

  // CodeMirror extensions - memoized to prevent recreating on every render
  const extensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    spellCheckExtension,
  ], []);

  return (
    <div className="editor-container">
      {/* Dictionary popup */}
      {dictionaryPopup && (
        <DictionaryPopup
          word={dictionaryPopup.word}
          position={dictionaryPopup.position}
          onClose={() => setDictionaryPopup(null)}
        />
      )}
      
      {/* Main editor area */}
      <div className="editor-main">
        {showPreview ? (
          // Preview mode
          <div className="editor-preview-full">
            <div className="editor-preview-content markdown-preview">
              <h1>{title}</h1>
              <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
            </div>
          </div>
        ) : (
          // Edit mode with CodeMirror
          <div className="editor-codemirror-wrapper">
            <CodeMirror
              ref={editorRef}
              value={content}
              height="100%"
              onChange={(value) => setContent(value)}
              extensions={extensions}
              theme={everforest}
              editable={!readOnly}
              autoFocus={!readOnly && !showPreview}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: false,
                foldGutter: false,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                rectangularSelection: true,
                crosshairCursor: false,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                searchKeymap: false,
                foldKeymap: false,
                completionKeymap: false,
                lintKeymap: false,
              }}
              placeholder={readOnly ? "" : `# Heading

Write your essay here. Markdown is supported:

**bold** and *italic* text
- bullet points
1. numbered lists

> blockquotes for emphasis

> [!NOTE]
> Alerts: NOTE, TIP, IMPORTANT, WARNING, CAUTION

\`inline code\` or code blocks:

\`\`\`
code block
\`\`\`

[links](https://example.com) and ![images](url)`}
            />
          </div>
        )}
      </div>

      {/* Footer status bar */}
      <div className="editor-footer">
        {prompt ? (
          // Prompt input
          <div className="editor-prompt-line">
            <span className="editor-prompt-message">{prompt.message}</span>
            <input
              ref={promptInputRef}
              type="text"
              value={prompt.value}
              onChange={(e) => setPrompt({ ...prompt, value: e.target.value })}
              className="editor-prompt-input"
              autoFocus
            />
          </div>
        ) : (
          // Status line
          <div className="editor-status-line">
            <div className="editor-status-left">
              <span className="editor-title-display">{title}</span>
              {!isNew && (
                <span className={`editor-status-badge ${currentStatus === "published" ? "published" : "draft"}`}>
                  [{currentStatus}]
                </span>
              )}
              {readOnly && <span className="editor-mode-indicator">[VIEW]</span>}
            </div>
            <div className="editor-status-right">
              <span className="editor-status-message">{statusMessage}</span>
              {/* Touch action buttons - shown only on touch devices via CSS */}
              <div className="editor-touch-actions">
                {!readOnly && (
                  <button
                    className="editor-touch-btn primary"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    save
                  </button>
                )}
                {!readOnly && (
                  <button
                    className="editor-touch-btn"
                    onClick={openTitlePrompt}
                  >
                    title
                  </button>
                )}
                <button
                  className="editor-touch-btn"
                  onClick={() => setShowPreview(prev => !prev)}
                >
                  {showPreview ? "edit" : "preview"}
                </button>
                {!readOnly && !isNew && (
                  <button
                    className={`editor-touch-btn ${currentStatus === "published" ? "warning" : "success"}`}
                    onClick={handleTogglePublish}
                    disabled={isSaving}
                  >
                    {currentStatus === "published" ? "unpub" : "pub"}
                  </button>
                )}
                <button
                  className="editor-touch-btn danger"
                  onClick={onClose}
                >
                  close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Info bar */}
        <div className="editor-info-bar">
          <span>{isNew ? "[New]" : `#${essay?.id}`}</span>
          <span>{lineCount}L, {content.length}C</span>
        </div>
      </div>
    </div>
  );
}
