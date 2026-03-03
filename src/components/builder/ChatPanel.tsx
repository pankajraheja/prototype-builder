"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useBuilderStore } from "@/lib/store";
import { generateSuggestions } from "@/lib/suggestions";
import {
  parseCSV,
  parseJSON,
  parseExcel,
  parsePlainText,
  summarizeForPrompt,
  previewLabel,
  type ParsedFile,
} from "@/lib/file-parser";

// ── Slash Command Definitions ────────────────────────────

interface SlashCommand {
  name: string;
  args: string;
  desc: string;
  icon: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/generate", args: "[prompt]", desc: "Generate a full screen from scratch", icon: "✨" },
  { name: "/add", args: "[prompt]", desc: "Generate and add a section", icon: "➕" },
  { name: "/upload", args: "", desc: "Upload a file to generate from", icon: "📄" },
  { name: "/template", args: "[name]", desc: "Load a preset template", icon: "📋" },
  { name: "/export", args: "", desc: "Export screen as HTML/React", icon: "📦" },
  { name: "/version", args: "[label]", desc: "Save a named version snapshot", icon: "💾" },
];

const TEMPLATE_NAMES = ["dashboard", "form", "landing", "table", "settings", "onboarding"];

// ── File attachment state type ──
interface FileAttachment {
  fileName: string;
  mimeType: string;
  parsed: ParsedFile;
  fileContent: string; // summarized text for LLM
  previewLabel: string;
}

export function ChatPanel() {
  const {
    chatMessages,
    addChatMessage,
    updateChatMessage,
    isChatLoading,
    setChatLoading,
    elements,
    selectedId,
    setElements,
    setSelectedId,
    screenId,
    pendingWelcomePrompt,
    setPendingWelcomePrompt,
  } = useBuilderStore();

  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File attachment state ──
  const [fileAttachment, setFileAttachment] = useState<FileAttachment | null>(null);

  // ── Slash command state ──
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // ── Handle welcome prompt from canvas ──
  useEffect(() => {
    if (pendingWelcomePrompt && !isChatLoading) {
      const prompt = pendingWelcomePrompt;
      setPendingWelcomePrompt(null);
      handleSend(prompt, "generate_screen");
    }
  }, [pendingWelcomePrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slash menu filtering ──
  useEffect(() => {
    if (input.startsWith("/")) {
      const typed = input.split(" ")[0].toLowerCase();
      const matches = SLASH_COMMANDS.filter((c) =>
        c.name.startsWith(typed)
      );
      setFilteredCommands(matches);
      setSlashMenuOpen(matches.length > 0);
      setSlashSelectedIndex(0);
    } else {
      setSlashMenuOpen(false);
      setFilteredCommands([]);
    }
  }, [input]);

  const selected = elements.find((e) => e.id === selectedId);

  // ── Slash Command Execution ────────────────────────────

  const executeSlashCommand = async (rawInput: string) => {
    const parts = rawInput.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ").trim();

    switch (cmd) {
      case "/generate":
        await handleGenerate(args || "a landing page");
        return true;

      case "/add":
        await handleAddSection(args || "a new section");
        return true;

      case "/upload":
        fileInputRef.current?.click();
        return true;

      case "/template":
        await handleTemplate(args);
        return true;

      case "/export":
        handleExport();
        return true;

      case "/version":
        await handleVersion(args || `Snapshot ${new Date().toLocaleString()}`);
        return true;

      default:
        return false;
    }
  };

  const handleGenerate = async (prompt: string) => {
    // Capture and clear any file attachment
    const currentAttachment = fileAttachment;
    setFileAttachment(null);
    setInput("");
    addChatMessage({
      role: "user",
      content: currentAttachment
        ? `/generate ${prompt}\n\n📎 ${currentAttachment.previewLabel}`
        : `/generate ${prompt}`,
    });
    setChatLoading(true);
    const placeholderId = addChatMessage({ role: "assistant", content: "" });
    const startTime = Date.now();

    // Save current version if elements exist
    if (screenId && elements.length > 0) {
      fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "snapshot",
          screenId,
          label: "Before /generate",
          snapshot: { elements },
          createdBy: "slash-command",
        }),
      }).catch(() => {});
    }

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          screenId: screenId || undefined,
          ...(currentAttachment
            ? {
                fileContent: currentAttachment.fileContent,
                fileName: currentAttachment.fileName,
                mimeType: currentAttachment.mimeType,
              }
            : {}),
        }),
      });
      const json = await res.json();

      if (res.ok && json.data?.elements?.length > 0) {
        setElements(json.data.elements, true, `Generated: ${prompt}`);
        setSelectedId(null);
        updateChatMessage(placeholderId, {
          content: `${json.data.explanation}\n\nGenerated ${json.data.elements.length} components.${elements.length > 0 ? " Previous version saved — undo to restore." : ""}`,
          metadata: { action: "generate_screen", latencyMs: Date.now() - startTime },
        });
      } else {
        updateChatMessage(placeholderId, {
          content: `Failed to generate: ${json.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      updateChatMessage(placeholderId, {
        content: `Failed to generate: ${err.message}`,
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddSection = async (prompt: string) => {
    setInput("");
    addChatMessage({ role: "user", content: `/add ${prompt}` });
    setChatLoading(true);
    const placeholderId = addChatMessage({ role: "assistant", content: "" });
    const startTime = Date.now();

    try {
      // Generate a mini-screen with just the requested section
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate ONLY the following section (no navbar, no footer): ${prompt}`,
        }),
      });
      const json = await res.json();

      if (res.ok && json.data?.elements?.length > 0) {
        // Filter out navbar/footer from generated elements — we only want the content
        const newSections = json.data.elements.filter(
          (el: any) => el.type !== "navbar" && el.type !== "footer"
        );

        if (newSections.length > 0) {
          // Insert before footer if one exists, otherwise append
          const currentElements = [...elements];
          const footerIdx = currentElements.findIndex((e) => e.type === "footer");
          const insertIdx = footerIdx >= 0 ? footerIdx : currentElements.length;

          const merged = [
            ...currentElements.slice(0, insertIdx),
            ...newSections,
            ...currentElements.slice(insertIdx),
          ].map((el, i) => ({ ...el, sortOrder: i }));

          setElements(merged, true, `Added: ${prompt}`);
          setSelectedId(newSections[0].id);
          updateChatMessage(placeholderId, {
            content: `${json.data.explanation}\n\nAdded ${newSections.length} section${newSections.length > 1 ? "s" : ""}.`,
            metadata: { action: "add", latencyMs: Date.now() - startTime },
          });
        } else {
          updateChatMessage(placeholderId, {
            content: "Generated content was empty after filtering. Try a more specific prompt.",
          });
        }
      } else {
        updateChatMessage(placeholderId, {
          content: `Failed to add section: ${json.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      updateChatMessage(placeholderId, {
        content: `Failed to add section: ${err.message}`,
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleTemplate = async (name: string) => {
    const templateName = name.toLowerCase().trim();
    const matched = TEMPLATE_NAMES.find((t) => t.startsWith(templateName));

    if (!matched && templateName) {
      addChatMessage({ role: "user", content: `/template ${name}` });
      addChatMessage({
        role: "assistant",
        content: `Unknown template "${name}". Available: ${TEMPLATE_NAMES.join(", ")}`,
      });
      setInput("");
      return;
    }

    const finalTemplate = matched || "landing";
    setInput("");
    addChatMessage({ role: "user", content: `/template ${finalTemplate}` });
    setChatLoading(true);
    const placeholderId = addChatMessage({ role: "assistant", content: "" });

    // Save snapshot if elements exist
    if (screenId && elements.length > 0) {
      fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "snapshot",
          screenId,
          label: `Before /template ${finalTemplate}`,
          snapshot: { elements },
          createdBy: "slash-command",
        }),
      }).catch(() => {});
    }

    try {
      // Use the generate endpoint which falls back to local templates
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${finalTemplate} layout`,
          screenId: screenId || undefined,
        }),
      });
      const json = await res.json();

      if (res.ok && json.data?.elements?.length > 0) {
        setElements(json.data.elements, true, `Template: ${finalTemplate}`);
        setSelectedId(null);
        updateChatMessage(placeholderId, {
          content: `Loaded **${finalTemplate}** template with ${json.data.elements.length} components.${elements.length > 0 ? " Previous version saved — undo to restore." : ""}`,
        });
      } else {
        updateChatMessage(placeholderId, {
          content: `Failed to load template: ${json.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      updateChatMessage(placeholderId, {
        content: `Failed to load template: ${err.message}`,
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleExport = () => {
    setInput("");
    addChatMessage({ role: "user", content: "/export" });
    addChatMessage({
      role: "assistant",
      content:
        "Export is coming soon! This will let you export your screen as HTML or React components.",
    });
  };

  const handleVersion = async (label: string) => {
    setInput("");
    addChatMessage({ role: "user", content: `/version ${label}` });

    if (!screenId) {
      addChatMessage({
        role: "assistant",
        content: "Cannot save version — no screen ID. Save the screen first.",
      });
      return;
    }
    if (elements.length === 0) {
      addChatMessage({
        role: "assistant",
        content: "Nothing to snapshot — the screen is empty.",
      });
      return;
    }

    try {
      const res = await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "snapshot",
          screenId,
          label,
          snapshot: { elements },
          createdBy: "slash-command",
        }),
      });
      const json = await res.json();

      if (res.ok) {
        addChatMessage({
          role: "assistant",
          content: `Saved version **"${label}"** (v${json.data?.versionNumber || "?"}).`,
        });
      } else {
        addChatMessage({
          role: "assistant",
          content: `Failed to save version: ${json.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      addChatMessage({
        role: "assistant",
        content: `Failed to save version: ${err.message}`,
      });
    }
  };

  // ── File processing: parse a File and set as attachment ──
  const processFile = async (file: File) => {
    try {
      const mime = file.type || "";
      const name = file.name;
      let parsed: ParsedFile;

      if (mime.includes("csv") || name.endsWith(".csv")) {
        const text = await file.text();
        parsed = parseCSV(text);
      } else if (mime.includes("json") || name.endsWith(".json")) {
        const text = await file.text();
        parsed = parseJSON(text);
      } else if (
        mime.includes("spreadsheet") ||
        mime.includes("ms-excel") ||
        /\.xlsx?$/.test(name)
      ) {
        const buffer = await file.arrayBuffer();
        parsed = parseExcel(buffer);
      } else if (
        mime.includes("text/plain") ||
        mime.includes("markdown") ||
        /\.(txt|md)$/.test(name)
      ) {
        const text = await file.text();
        parsed = parsePlainText(text);
      } else if (mime.startsWith("image/")) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), "")
        );
        parsed = { type: "image", base64, mimeType: mime, sizeKB: Math.round(file.size / 1024) };
      } else {
        // Fallback: treat as text
        const text = await file.text();
        parsed = parsePlainText(text);
      }

      const summary = summarizeForPrompt(parsed, name);
      const label = previewLabel(parsed, name);

      setFileAttachment({
        fileName: name,
        mimeType: mime || "application/octet-stream",
        parsed,
        fileContent: summary,
        previewLabel: label,
      });

      // Pre-fill input if empty
      if (!input.trim()) {
        setInput(`Create an input screen from ${name}`);
      }
      inputRef.current?.focus();
    } catch (err) {
      console.warn("Failed to parse file:", err);
      addChatMessage({
        role: "assistant",
        content: `Failed to parse "${file.name}". Supported formats: CSV, JSON, XLSX/XLS, TXT, MD, PNG, JPG.`,
      });
    }
  };

  // ── File upload handler ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await processFile(file);
  };

  // ── Paste handler: detect tabular data (tab-separated from Excel/Sheets) ──
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      // Detect tab-separated data (at least 2 columns, at least 2 rows)
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;

      const firstLineTabs = (lines[0].match(/\t/g) || []).length;
      const secondLineTabs = (lines[1].match(/\t/g) || []).length;

      if (firstLineTabs >= 1 && secondLineTabs >= 1) {
        // Looks like tabular data — convert to CSV and attach
        e.preventDefault();
        const csvText = lines.map((line) => line.split("\t").join(",")).join("\n");
        const parsed = parseCSV(csvText);
        const label = previewLabel(parsed, "pasted-data.csv");
        const summary = summarizeForPrompt(parsed, "pasted-data.csv");

        setFileAttachment({
          fileName: "pasted-data.csv",
          mimeType: "text/csv",
          parsed,
          fileContent: summary,
          previewLabel: label,
        });

        if (!input.trim()) {
          setInput("Create an input screen from this data");
        }
        inputRef.current?.focus();
      }
      // Otherwise let the paste go through normally into the textarea
    },
    [input] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Main send handler ──────────────────────────────────

  const handleSend = async (overrideMessage?: string, mode?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || isChatLoading) return;
    const startTime = Date.now();

    // Check for slash commands
    if (msg.startsWith("/")) {
      setSlashMenuOpen(false);
      const handled = await executeSlashCommand(msg);
      if (handled) return;
    }

    // Capture and clear file attachment before async work
    const currentAttachment = fileAttachment;
    if (!overrideMessage) setInput("");
    setFileAttachment(null);

    // If file is attached and screen is empty or message implies generation, use /generate
    const isGenerationRequest =
      currentAttachment &&
      (elements.length === 0 ||
        /^(create|generate|build|make)\b/i.test(msg));

    if (isGenerationRequest) {
      addChatMessage({
        role: "user",
        content: `${msg}\n\n📎 ${currentAttachment.previewLabel}`,
      });
      setChatLoading(true);
      const placeholderId = addChatMessage({ role: "assistant", content: "" });

      // Save snapshot if elements exist
      if (screenId && elements.length > 0) {
        fetch("/api/screens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "snapshot",
            screenId,
            label: "Before file generation",
            snapshot: { elements },
            createdBy: "file-upload",
          }),
        }).catch(() => {});
      }

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: msg,
            fileContent: currentAttachment.fileContent,
            fileName: currentAttachment.fileName,
            mimeType: currentAttachment.mimeType,
            screenId: screenId || undefined,
          }),
        });
        const json = await res.json();

        if (res.ok && json.data?.elements?.length > 0) {
          setElements(json.data.elements, true, `Generated from ${currentAttachment.fileName}`);
          setSelectedId(null);
          updateChatMessage(placeholderId, {
            content: `${json.data.explanation}\n\nGenerated ${json.data.elements.length} components from **${currentAttachment.fileName}**.${elements.length > 0 ? " Previous version saved — undo to restore." : ""}`,
            metadata: { action: "generate_screen", latencyMs: Date.now() - startTime },
          });
        } else {
          updateChatMessage(placeholderId, {
            content: `Failed to generate: ${json.error || "Unknown error"}`,
          });
        }
      } catch (err: any) {
        updateChatMessage(placeholderId, {
          content: `Failed to generate: ${err.message}`,
        });
      } finally {
        setChatLoading(false);
      }
      return;
    }

    addChatMessage({
      role: "user",
      content: currentAttachment
        ? `${msg}\n\n📎 ${currentAttachment.previewLabel}`
        : msg,
    });
    setChatLoading(true);

    // Create placeholder assistant message (empty = shows typing dots)
    const placeholderId = addChatMessage({
      role: "assistant",
      content: "",
    });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          elements,
          selectedId,
          screenId: screenId || undefined,
          ...(mode ? { mode } : {}),
          // Include file context for edit commands that reference file data
          ...(currentAttachment
            ? {
                fileContent: currentAttachment.fileContent,
                fileName: currentAttachment.fileName,
                mimeType: currentAttachment.mimeType,
              }
            : {}),
        }),
      });

      const contentType = res.headers.get("Content-Type") || "";

      // Non-streaming error response (400, 500)
      if (contentType.includes("application/json")) {
        const { error } = await res.json();
        updateChatMessage(placeholderId, {
          content: `Error: ${error}`,
        });
        return;
      }

      // SSE streaming response
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7);
            continue;
          }

          if (!trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            switch (currentEvent) {
              case "token":
                break;

              case "delta":
                accumulatedText += data.text;
                updateChatMessage(placeholderId, {
                  content: accumulatedText,
                });
                break;

              case "done": {
                const { commands, elements: newElements, latencyMs } = data;

                // ── Check for regenerate command ──
                const regenCmd = commands.find(
                  (c: any) => c.action === "regenerate"
                );
                if (regenCmd) {
                  const regenPrompt =
                    regenCmd.properties?.prompt || msg;

                  updateChatMessage(placeholderId, {
                    content:
                      accumulatedText || regenCmd.explanation || "Regenerating...",
                  });

                  // Save current version as snapshot (fire-and-forget)
                  if (screenId) {
                    fetch("/api/screens", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "snapshot",
                        screenId,
                        label: "Before regeneration",
                        snapshot: { elements },
                        createdBy: "ai-chat",
                      }),
                    }).catch(() => {});
                  }

                  // Call generate endpoint
                  try {
                    const genRes = await fetch("/api/ai/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: regenPrompt,
                        screenId: screenId || undefined,
                      }),
                    });
                    const genJson = await genRes.json();

                    if (genRes.ok && genJson.data?.elements?.length > 0) {
                      setElements(
                        genJson.data.elements,
                        true,
                        `Regenerated: ${regenPrompt}`
                      );
                      setSelectedId(null);
                      updateChatMessage(placeholderId, {
                        content: `${genJson.data.explanation}\n\nRegenerated the screen with ${genJson.data.elements.length} components. Your previous version was saved — you can undo to get it back.`,
                        metadata: {
                          action: "regenerate",
                          latencyMs: Date.now() - startTime,
                        },
                      });
                    } else {
                      updateChatMessage(placeholderId, {
                        content: `Failed to regenerate: ${genJson.error || "Unknown error"}`,
                      });
                    }
                  } catch (genErr: any) {
                    updateChatMessage(placeholderId, {
                      content: `Failed to regenerate: ${genErr.message}`,
                    });
                  }
                  break;
                }

                // ── Standard command handling ──
                updateChatMessage(placeholderId, {
                  content: accumulatedText,
                  metadata: {
                    action: commands[0]?.action,
                    targetElementId: commands[0]?.targetId,
                    targetElementType: commands[0]?.elementType,
                    changes: commands[0]?.properties,
                    latencyMs,
                  },
                });

                const hasActions = commands.some(
                  (c: any) => c.action !== "noop"
                );
                if (hasActions && newElements) {
                  const historyLabel = commands
                    .filter((c: any) => c.action !== "noop")
                    .map((c: any) => c.explanation)
                    .join("; ");
                  setElements(newElements, true, historyLabel);
                  if (commands.some((c: any) => c.action === "add")) {
                    const newEl = newElements.find(
                      (e: any) => !elements.some((ex) => ex.id === e.id)
                    );
                    if (newEl) setSelectedId(newEl.id);
                  }
                  if (commands.some((c: any) => c.action === "remove")) {
                    setSelectedId(null);
                  }
                }
                break;
              }

              case "error":
                updateChatMessage(placeholderId, {
                  content: `Error: ${data.message}`,
                });
                break;
            }
          } catch {
            // Malformed SSE data, skip
          }
        }
      }
    } catch (e: any) {
      updateChatMessage(placeholderId, {
        content: `Failed to process: ${e.message}`,
      });
    } finally {
      setChatLoading(false);
    }
  };

  // ── Keyboard handling ──────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slashMenuOpen && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashSelectedIndex((i) =>
          i < filteredCommands.length - 1 ? i + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashSelectedIndex((i) =>
          i > 0 ? i - 1 : filteredCommands.length - 1
        );
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const cmd = filteredCommands[slashSelectedIndex];
        if (cmd) {
          setInput(cmd.name + " ");
          setSlashMenuOpen(false);
        }
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // If the input is just a bare command name with no args, autocomplete it
        const typed = input.split(" ")[0];
        const exact = filteredCommands.find((c) => c.name === typed);
        if (exact && !exact.args && input.trim() === exact.name) {
          // No-arg command — execute immediately
          handleSend();
        } else if (exact && input.trim().length > exact.name.length) {
          // Has args — execute
          handleSend();
        } else {
          // Autocomplete the selected command
          const cmd = filteredCommands[slashSelectedIndex];
          if (cmd) {
            setInput(cmd.name + " ");
            setSlashMenuOpen(false);
          }
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashMenuOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectSlashCommand = (cmd: SlashCommand) => {
    if (!cmd.args) {
      // No-arg command — execute immediately
      setInput(cmd.name);
      setTimeout(() => handleSend(cmd.name), 0);
    } else {
      setInput(cmd.name + " ");
      setSlashMenuOpen(false);
      inputRef.current?.focus();
    }
  };

  const suggestions = generateSuggestions(elements, selected);

  // ── AI-powered "magic wand" suggestions ──
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const prevElementCountRef = useRef(elements.length);

  const fetchAiSuggestions = useCallback(async () => {
    if (elements.length === 0) {
      setAiSuggestions([]);
      return;
    }
    setAiSuggestionsLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elements }),
      });
      const { suggestions: ai } = await res.json();
      if (Array.isArray(ai)) setAiSuggestions(ai);
    } catch {
      // Non-critical
    } finally {
      setAiSuggestionsLoading(false);
    }
  }, [elements]);

  useEffect(() => {
    if (elements.length === 0) {
      setAiSuggestions([]);
      return;
    }
    const countChanged = prevElementCountRef.current !== elements.length;
    prevElementCountRef.current = elements.length;

    if (aiSuggestions.length === 0 || countChanged) {
      const timer = setTimeout(fetchAiSuggestions, countChanged ? 2000 : 500);
      return () => clearTimeout(timer);
    }
  }, [elements.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-3 animate-in slide-in-from-bottom-2 duration-200 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-[11px] text-white mr-2 mt-0.5 flex-shrink-0">
                ⬡
              </div>
            )}
            <div
              className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-2xl rounded-br-sm"
                  : "bg-slate-100 text-slate-700 rounded-2xl rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" &&
              msg.content === "" &&
              isChatLoading ? (
                <div className="flex gap-1 py-0.5">
                  <div
                    className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              ) : (
                <>
                  {msg.content.split("\n").map((line, i) => (
                    <div key={i} className={line === "" ? "h-1.5" : ""}>
                      {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                        part.startsWith("**") ? (
                          <strong key={j} className="font-bold">
                            {part.replace(/\*\*/g, "")}
                          </strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </div>
                  ))}
                  {msg.metadata?.latencyMs && (
                    <div className="text-[9px] opacity-50 mt-1 font-mono">
                      {msg.metadata.latencyMs}ms
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="px-3.5 py-3 border-t border-slate-100 bg-white">
        {selected && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 font-bold border border-brand-100">
              Editing: {selected.label}
            </span>
            <button
              onClick={() => setSelectedId(null)}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              clear
            </button>
          </div>
        )}

        {/* Slash Command Menu */}
        <div className="relative">
          {slashMenuOpen && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-150">
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.name}
                  onClick={() => selectSlashCommand(cmd)}
                  onMouseEnter={() => setSlashSelectedIndex(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    i === slashSelectedIndex
                      ? "bg-brand-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm w-5 text-center flex-shrink-0">
                    {cmd.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] font-semibold text-slate-800 font-mono">
                        {cmd.name}
                      </span>
                      {cmd.args && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cmd.args}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {cmd.desc}
                    </p>
                  </div>
                  {i === slashSelectedIndex && (
                    <span className="text-[9px] text-slate-300 font-mono flex-shrink-0">
                      Tab
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* File attachment chip */}
          {fileAttachment && (
            <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-[11px] text-brand-700 animate-in slide-in-from-bottom-1 duration-150">
              <span>📎</span>
              <span className="truncate flex-1 min-w-0 font-medium">
                {fileAttachment.previewLabel}
              </span>
              <button
                onClick={() => setFileAttachment(null)}
                className="text-brand-400 hover:text-brand-600 flex-shrink-0 ml-1 text-sm leading-none"
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 px-3 py-2 rounded-2xl bg-slate-50 border-[1.5px] border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            {/* Paperclip button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isChatLoading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 flex-shrink-0 transition-all"
              title="Attach file"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                selected
                  ? `Edit ${selected.label}...`
                  : 'Type / for commands, or describe changes...'
              }
              rows={1}
              className="flex-1 border-none outline-none bg-transparent text-[13px] text-slate-900 resize-none leading-snug max-h-[80px]"
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !fileAttachment) || isChatLoading}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0 transition-all ${
                (input.trim() || fileAttachment) && !isChatLoading
                  ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-md hover:shadow-lg cursor-pointer"
                  : "bg-slate-200 cursor-default"
              }`}
            >
              ↑
            </button>
          </div>
        </div>

        {/* Hidden file input for /upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls,.txt,.md,.pdf,.png,.jpg,.jpeg"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* AI Suggestion Chips (magic wand) */}
        {aiSuggestions.length > 0 && !selected && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {aiSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-[10px] px-2 py-1 rounded-md bg-gradient-to-r from-brand-50 to-emerald-50 text-brand-600 border border-brand-200 hover:from-brand-100 hover:to-emerald-100 hover:border-brand-300 transition-all"
              >
                ✨ {s}
              </button>
            ))}
          </div>
        )}
        {aiSuggestionsLoading && !selected && elements.length > 0 && (
          <div className="mt-2 text-[10px] text-slate-400 animate-pulse">
            ✨ Generating suggestions...
          </div>
        )}

        {/* Context-Aware Suggestion Chips */}
        <div className={`flex gap-1 ${aiSuggestions.length > 0 && !selected ? "mt-1" : "mt-2"} flex-wrap`}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-[10px] px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
