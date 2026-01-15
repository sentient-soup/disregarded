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
  id?: number;
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
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showPreview, setShowPreview] = useState(startInPreview);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [dictionaryPopup, setDictionaryPopup] = useState<DictionaryState | null>(null);
  
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const isNew = !essay?.id;

  // Focus management
  useEffect(() => {
    if (prompt && promptInputRef.current) {
      promptInputRef.current.focus();
    } else if (editorRef.current?.view && !readOnly && !showPreview) {
      editorRef.current.view.focus();
    }
  }, [prompt, readOnly, showPreview]);

  // Show initial help message
  useEffect(() => {
    if (readOnly) {
      setStatusMessage("Ctrl+D define | Ctrl+P preview | Ctrl+Q close");
    } else {
      setStatusMessage("Ctrl+S save | Ctrl+T title | Ctrl+D define | Ctrl+Q close");
    }
  }, [readOnly]);

  const showStatus = useCallback((msg: string, duration = 3000) => {
    setStatusMessage(msg);
    if (duration > 0) {
      setTimeout(() => {
        setStatusMessage(readOnly 
          ? "Ctrl+D define | Ctrl+P preview | Ctrl+Q close"
          : "Ctrl+S save | Ctrl+T title | Ctrl+D define | Ctrl+Q close"
        );
      }, duration);
    }
  }, [readOnly]);

  const handleSave = useCallback(async () => {
    if (readOnly || isSaving) return;
    if (!title.trim() || title === "Untitled") {
      showStatus("Error: Please set a title first (Ctrl+T)", 3000);
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

      showStatus("Published!", 2000);
      onSaved("Essay published!");
      onClose();
    } catch {
      showStatus("Error: Network error", 3000);
    } finally {
      setIsSaving(false);
    }
  }, [readOnly, isNew, isSaving, essay, onSaved, onClose, showStatus]);

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
          case "q":
            e.preventDefault();
            onClose();
            break;
          case "p":
            e.preventDefault();
            setShowPreview((prev) => {
              showStatus(prev ? "Preview hidden" : "Preview shown", 2000);
              return !prev;
            });
            break;
          case "t":
            e.preventDefault();
            if (!readOnly) openTitlePrompt();
            break;
          case "enter":
            e.preventDefault();
            if (!readOnly && !isNew) handlePublish();
            break;
          case "d":
            e.preventDefault();
            handleDictionaryLookup();
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
  }, [prompt, readOnly, isNew, handleSave, handlePublish, onClose, openTitlePrompt, showStatus, handleDictionaryLookup]);

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
              placeholder={readOnly ? "" : "Start writing..."}
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
              {essay?.status && (
                <span className={`editor-status-badge ${essay.status === "published" ? "published" : "draft"}`}>
                  [{essay.status}]
                </span>
              )}
              {readOnly && <span className="editor-mode-indicator">[VIEW]</span>}
            </div>
            <div className="editor-status-right">
              <span className="editor-status-message">{statusMessage}</span>
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
