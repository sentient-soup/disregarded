import { useState, useCallback } from "react";
import type { OutputLine } from "../components/TerminalOutput";
import { authFetch } from "./useAuth";

interface Essay {
  id: number;
  title: string;
  content: string;
  status: "draft" | "published";
  author?: string;
  created_at: string;
  updated_at: string;
}

interface UseTerminalProps {
  isAuthenticated: boolean;
  username: string | null;
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  onEditEssay: (essay: Essay | null) => void;
  onViewEssay: (essay: Essay) => void;
}

interface InputState {
  mode: "command" | "login_username" | "login_password" | "register_username" | "register_password" | "confirm_delete";
  tempData?: Record<string, string>;
}

export function useTerminal({
  isAuthenticated,
  username,
  onLogin,
  onRegister,
  onLogout,
  onEditEssay,
  onViewEssay,
}: UseTerminalProps) {
  const [lines, setLines] = useState<OutputLine[]>([
    { id: "welcome", content: "Welcome to Disregarded.", type: "info" },
    { id: "hint", content: "Type 'help' for available commands.", type: "muted" },
    { id: "spacer", content: "" },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputState, setInputState] = useState<InputState>({ mode: "command" });

  const addLine = useCallback((content: React.ReactNode, type?: OutputLine["type"]) => {
    const id = `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setLines((prev) => [...prev, { id, content, type }]);
  }, []);

  const addLines = useCallback((newLines: Array<{ content: React.ReactNode; type?: OutputLine["type"] }>) => {
    const timestamp = Date.now();
    setLines((prev) => [
      ...prev,
      ...newLines.map((line, i) => ({
        id: `line-${timestamp}-${i}`,
        content: line.content,
        type: line.type,
      })),
    ]);
  }, []);

  const showHelp = useCallback(() => {
    const commands = [
      { cmd: "help", desc: "Show this help message" },
      { cmd: "clear", desc: "Clear the terminal" },
      ...(isAuthenticated
        ? [
            { cmd: "logout", desc: "Log out" },
            { cmd: "new", desc: "Create a new essay" },
            { cmd: "list", desc: "List your essays" },
            { cmd: "edit <id>", desc: "Edit an essay" },
            { cmd: "view <id>", desc: "View an essay" },
            { cmd: "publish <id>", desc: "Publish an essay" },
            { cmd: "unpublish <id>", desc: "Unpublish an essay" },
            { cmd: "delete <id>", desc: "Delete an essay" },
            { cmd: "browse", desc: "Browse all published essays" },
          ]
        : [
            { cmd: "login", desc: "Log in to your account" },
            { cmd: "register", desc: "Create a new account" },
            { cmd: "browse", desc: "Browse published essays" },
            { cmd: "view <id>", desc: "View a published essay" },
          ]),
    ];

    addLine("Available commands:", "info");
    commands.forEach(({ cmd, desc }) => {
      addLine(
        <span>
          <span className="text-accent">{cmd.padEnd(16)}</span>
          <span className="text-muted">{desc}</span>
        </span>
      );
    });
  }, [isAuthenticated, addLine]);

  const clearTerminal = useCallback(() => {
    setLines([]);
  }, []);

  const listEssays = useCallback(async () => {
    setIsProcessing(true);
    try {
      const res = await authFetch("/api/essays");
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to fetch essays", "error");
        return;
      }

      if (data.essays.length === 0) {
        addLine("No essays found. Use 'new' to create one.", "muted");
        return;
      }

      addLine("Your essays:", "info");
      data.essays.forEach((essay: Essay) => {
        const status = essay.status === "published" ? "[published]" : "[draft]";
        const statusClass = essay.status === "published" ? "text-success" : "text-warning";
        addLine(
          <span>
            <span className="text-muted">#{essay.id.toString().padEnd(4)}</span>
            <span className={statusClass}>{status.padEnd(12)}</span>
            <span className="text-accent">{essay.title}</span>
          </span>
        );
      });
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine]);

  const browseEssays = useCallback(async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/essays/public");
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to fetch essays", "error");
        return;
      }

      if (data.essays.length === 0) {
        addLine("No published essays found.", "muted");
        return;
      }

      addLine("Published essays:", "info");
      data.essays.forEach((essay: Essay) => {
        addLine(
          <span>
            <span className="text-muted">#{essay.id.toString().padEnd(4)}</span>
            <span className="text-special">{(essay.author || "Unknown").padEnd(16)}</span>
            <span className="text-accent">{essay.title}</span>
          </span>
        );
      });
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine]);

  const viewEssay = useCallback(async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/essays/${id}`);
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to fetch essay", "error");
        return;
      }

      const essay = data.essay as Essay;
      // Open in view mode (read-only)
      onViewEssay(essay);
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine, onViewEssay]);

  const editEssay = useCallback(async (id: number) => {
    if (!isAuthenticated) {
      addLine("Please login first", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/essays/${id}`);
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to fetch essay", "error");
        return;
      }

      onEditEssay(data.essay);
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [isAuthenticated, addLine, onEditEssay]);

  const createNewEssay = useCallback(() => {
    if (!isAuthenticated) {
      addLine("Please login first", "error");
      return;
    }
    onEditEssay(null); // null means new essay
  }, [isAuthenticated, addLine, onEditEssay]);

  const publishEssay = useCallback(async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/essays/${id}/publish`, { method: "PUT" });
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to publish", "error");
        return;
      }

      addLine(`Essay #${id} published successfully!`, "success");
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine]);

  const unpublishEssay = useCallback(async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/essays/${id}/unpublish`, { method: "PUT" });
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to unpublish", "error");
        return;
      }

      addLine(`Essay #${id} unpublished (now draft)`, "success");
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine]);

  const deleteEssay = useCallback(async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/essays/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        addLine(data.error || "Failed to delete", "error");
        return;
      }

      addLine(`Essay #${id} deleted`, "success");
    } catch {
      addLine("Network error", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine]);

  const handleCommand = useCallback(async (input: string) => {
    // Handle special input modes (login/register flows)
    if (inputState.mode !== "command") {
      const tempData = inputState.tempData || {};

      switch (inputState.mode) {
        case "login_username":
          addLine(`Username: ${input}`, "muted");
          setInputState({ mode: "login_password", tempData: { username: input } });
          addLine("Password:", "info");
          return;

        case "login_password":
          addLine("Password: ********", "muted");
          setIsProcessing(true);
          const loginResult = await onLogin(tempData.username!, input);
          setIsProcessing(false);
          if (loginResult.success) {
            addLine(`Welcome back, ${tempData.username}!`, "success");
          } else {
            addLine(loginResult.error || "Login failed", "error");
          }
          setInputState({ mode: "command" });
          return;

        case "register_username":
          addLine(`Username: ${input}`, "muted");
          setInputState({ mode: "register_password", tempData: { username: input } });
          addLine("Password:", "info");
          return;

        case "register_password":
          addLine("Password: ********", "muted");
          setIsProcessing(true);
          const registerResult = await onRegister(tempData.username!, input);
          setIsProcessing(false);
          if (registerResult.success) {
            addLine(`Account created! Welcome, ${tempData.username}!`, "success");
          } else {
            addLine(registerResult.error || "Registration failed", "error");
          }
          setInputState({ mode: "command" });
          return;

        case "confirm_delete":
          if (input.toLowerCase() === "yes" || input.toLowerCase() === "y") {
            await deleteEssay(parseInt(tempData.id!));
          } else {
            addLine("Delete cancelled", "muted");
          }
          setInputState({ mode: "command" });
          return;
      }
      return;
    }

    // Add command to history
    setHistory((prev) => [...prev, input]);

    // Echo the command
    addLine(
      <span>
        <span className="text-success">&gt; </span>
        <span>{input}</span>
      </span>
    );

    // Parse command
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
        showHelp();
        break;

      case "clear":
        clearTerminal();
        break;

      case "login":
        if (isAuthenticated) {
          addLine(`Already logged in as ${username}`, "warning");
        } else {
          addLine("Username:", "info");
          setInputState({ mode: "login_username" });
        }
        break;

      case "register":
        if (isAuthenticated) {
          addLine(`Already logged in as ${username}`, "warning");
        } else {
          addLine("Choose a username:", "info");
          setInputState({ mode: "register_username" });
        }
        break;

      case "logout":
        if (!isAuthenticated) {
          addLine("Not logged in", "warning");
        } else {
          onLogout();
          addLine("Logged out", "success");
        }
        break;

      case "new":
        createNewEssay();
        break;

      case "list":
        if (!isAuthenticated) {
          addLine("Please login first", "error");
        } else {
          await listEssays();
        }
        break;

      case "browse":
        await browseEssays();
        break;

      case "view":
        if (!args[0]) {
          addLine("Usage: view <id>", "warning");
        } else {
          const id = parseInt(args[0]);
          if (isNaN(id)) {
            addLine("Invalid ID", "error");
          } else {
            await viewEssay(id);
          }
        }
        break;

      case "edit":
        if (!args[0]) {
          addLine("Usage: edit <id>", "warning");
        } else {
          const id = parseInt(args[0]);
          if (isNaN(id)) {
            addLine("Invalid ID", "error");
          } else {
            await editEssay(id);
          }
        }
        break;

      case "publish":
        if (!isAuthenticated) {
          addLine("Please login first", "error");
        } else if (!args[0]) {
          addLine("Usage: publish <id>", "warning");
        } else {
          const id = parseInt(args[0]);
          if (isNaN(id)) {
            addLine("Invalid ID", "error");
          } else {
            await publishEssay(id);
          }
        }
        break;

      case "unpublish":
        if (!isAuthenticated) {
          addLine("Please login first", "error");
        } else if (!args[0]) {
          addLine("Usage: unpublish <id>", "warning");
        } else {
          const id = parseInt(args[0]);
          if (isNaN(id)) {
            addLine("Invalid ID", "error");
          } else {
            await unpublishEssay(id);
          }
        }
        break;

      case "delete":
        if (!isAuthenticated) {
          addLine("Please login first", "error");
        } else if (!args[0]) {
          addLine("Usage: delete <id>", "warning");
        } else {
          const id = parseInt(args[0]);
          if (isNaN(id)) {
            addLine("Invalid ID", "error");
          } else {
            addLine(`Are you sure you want to delete essay #${id}? (yes/no)`, "warning");
            setInputState({ mode: "confirm_delete", tempData: { id: args[0] } });
          }
        }
        break;

      default:
        addLine(`Unknown command: ${cmd}. Type 'help' for available commands.`, "error");
    }
  }, [
    inputState,
    isAuthenticated,
    username,
    addLine,
    showHelp,
    clearTerminal,
    onLogin,
    onRegister,
    onLogout,
    createNewEssay,
    listEssays,
    browseEssays,
    viewEssay,
    editEssay,
    publishEssay,
    unpublishEssay,
    deleteEssay,
  ]);

  return {
    lines,
    history,
    isProcessing,
    handleCommand,
    addLine,
  };
}
