"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useBuilderStore } from "@/lib/store";
import { Toolbar } from "@/components/builder/Toolbar";
import { ComponentLibrary } from "@/components/builder/ComponentLibrary";
import { ElementRenderer } from "@/components/elements/ElementRenderer";
import { PropertyPanel } from "@/components/builder/PropertyPanel";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { SubmitToScaleModal } from "@/components/builder/SubmitModal";
import {
  parseCSV,
  parseJSON,
  parseExcel,
  parsePlainText,
  parseImage,
  summarizeForPrompt,
  previewLabel,
  type ParsedFile,
} from "@/lib/file-parser";

interface BuilderPageProps {
  params: { id: string };
}

const STARTER_CHIPS = [
  "Input form from a file",
  "Dashboard layout",
  "Landing page",
  "Settings screen",
  "Data table view",
  "Onboarding wizard",
];

const ACCEPTED_EXTENSIONS =
  ".csv,.json,.xlsx,.xls,.txt,.md,.pdf,.png,.jpg,.jpeg";

const ACCEPTED_MIME =
  "text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/plain,text/markdown,application/pdf,image/png,image/jpeg";

interface FilePreview {
  fileName: string;
  mimeType: string;
  parsed: ParsedFile;
  /** Structured summary sent as fileContent to the API */
  fileContent: string;
}

export default function BuilderPage({ params }: BuilderPageProps) {
  const {
    elements, setElements, selectedId, setSelectedId,
    zoom, viewportMode, setProject,
    isChatLoading, setPendingWelcomePrompt,
    screenId: storeScreenId,
    addChatMessage, updateChatMessage, setChatLoading,
  } = useBuilderStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [welcomeInput, setWelcomeInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [fileParsing, setFileParsing] = useState(false);

  // Load screen data
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const screenId = params.id;

    const loadScreen = async () => {
      try {
        const res = await fetch(`/api/screens?screenId=${screenId}`);
        const { data } = await res.json();
        if (data) {
          setProject(data.projectId, data.id, data.name);
          if (data.elements?.length > 0) {
            setElements(data.elements, false);
          } else {
            setElements([], false);
          }
          return;
        }
      } catch {}
      // Fallback: empty canvas
      setProject("local", screenId, "Untitled");
      setElements([], false);
    };

    loadScreen();
  }, [params.id]);

  const viewportWidth =
    viewportMode === "desktop" ? 600 : viewportMode === "tablet" ? 480 : 360;

  const handleWelcomeSend = (message: string) => {
    const msg = message.trim();
    if (!msg || isChatLoading) return;
    setWelcomeInput("");
    setPendingWelcomePrompt(msg);
  };

  const handleWelcomeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFileSend();
    }
  };

  // ── File Processing ──────────────────────────────────

  const getExtension = (name: string) =>
    (name.split(".").pop() || "").toLowerCase();

  const getMimeType = (file: File): string => {
    if (file.type) return file.type;
    const ext = getExtension(file.name);
    const map: Record<string, string> = {
      csv: "text/csv",
      json: "application/json",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      txt: "text/plain",
      md: "text/markdown",
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    return map[ext] || "application/octet-stream";
  };

  const processFile = useCallback(async (file: File) => {
    const ext = getExtension(file.name);
    const mime = getMimeType(file);
    setFileParsing(true);

    try {
      let parsed: ParsedFile;

      if (ext === "csv") {
        const text = await file.text();
        parsed = parseCSV(text);
      } else if (ext === "json") {
        const text = (await file.text()).slice(0, 10240);
        parsed = parseJSON(text);
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        parsed = parseExcel(buffer);
      } else if (ext === "txt" || ext === "md") {
        const text = (await file.text()).slice(0, 10240);
        parsed = parsePlainText(text);
      } else if (ext === "pdf") {
        // PDF parsing happens server-side — send raw base64
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        parsed = parseImage(base64, "application/pdf", file.size);
      } else if (["png", "jpg", "jpeg"].includes(ext)) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        parsed = parseImage(base64, mime, file.size);
      } else {
        // Fallback: treat as text
        const text = (await file.text()).slice(0, 10240);
        parsed = parsePlainText(text);
      }

      const fileContent = summarizeForPrompt(parsed, file.name);

      setFilePreview({
        fileName: file.name,
        mimeType: mime,
        parsed,
        fileContent,
      });
      setWelcomeInput(`Create an input screen from ${file.name}`);
    } catch (err: any) {
      console.warn("File parse error:", err);
      // Fallback: read as raw text
      try {
        const text = (await file.text()).slice(0, 3000);
        const parsed = parsePlainText(text);
        setFilePreview({
          fileName: file.name,
          mimeType: mime,
          parsed,
          fileContent: summarizeForPrompt(parsed, file.name),
        });
        setWelcomeInput(`Create an input screen from ${file.name}`);
      } catch {
        // Total failure — just set the prompt
        setWelcomeInput(`Create an input screen from ${file.name}`);
      }
    } finally {
      setFileParsing(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const clearFilePreview = () => {
    setFilePreview(null);
    setWelcomeInput("");
  };

  // ── Send with file context ───────────────────────────

  const handleFileSend = async () => {
    const msg = welcomeInput.trim();
    if (!msg || isChatLoading) return;

    if (filePreview) {
      // Use /api/ai/generate with file context
      setWelcomeInput("");
      setChatLoading(true);
      addChatMessage({ role: "user", content: msg });
      const placeholderId = addChatMessage({ role: "assistant", content: "" });

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: msg,
            fileContent: filePreview.fileContent,
            fileName: filePreview.fileName,
            mimeType: filePreview.mimeType,
            screenId: storeScreenId || undefined,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          updateChatMessage(placeholderId, {
            content: `Error: ${json.error || "Generation failed"}`,
          });
          return;
        }

        const { elements: newElements, explanation } = json.data;

        updateChatMessage(placeholderId, {
          content: `${explanation}\n\nGenerated ${newElements.length} components`,
          metadata: { action: "generate_screen" },
        });

        if (newElements?.length > 0) {
          setElements(newElements, true, "Generated screen from file");
        }
      } catch (err: any) {
        updateChatMessage(placeholderId, {
          content: `Failed to generate: ${err.message}`,
        });
      } finally {
        setChatLoading(false);
        setFilePreview(null);
      }
    } else {
      // No file — use the existing welcome flow
      handleWelcomeSend(msg);
    }
  };

  const showWelcome = elements.length === 0 && !isChatLoading;
  const showGenerating = elements.length === 0 && isChatLoading;

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <Toolbar onSubmitToScale={() => setShowSubmitModal(true)} />

      <div className="flex-1 flex min-h-0">
        {/* Left: Component Library + Preview Canvas */}
        <div className="flex-1 flex min-h-0">
          <ComponentLibrary />

          <div
            ref={canvasRef}
            onClick={() => setSelectedId(null)}
            className="flex-1 overflow-auto p-6 flex justify-center"
          >
            {showWelcome ? (
              /* ── Welcome State ── */
              <div className="w-full max-w-[560px] flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-2xl text-white mb-6 shadow-lg">
                  ⬡
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  What would you like to build?
                </h1>
                <p className="text-sm text-slate-500 mb-8">
                  Describe your screen and AI will build it for you
                </p>

                {/* Search-style input */}
                <div className="w-full relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                    ✨
                  </div>
                  <input
                    type="text"
                    value={welcomeInput}
                    onChange={(e) => setWelcomeInput(e.target.value)}
                    onKeyDown={handleWelcomeKeyDown}
                    placeholder={
                      filePreview
                        ? `Describe what to build from ${filePreview.fileName}...`
                        : "Describe what you want to build..."
                    }
                    autoFocus
                    className="w-full pl-12 pr-14 py-4 rounded-2xl bg-white border-2 border-slate-200 text-[15px] text-slate-900 placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all shadow-sm"
                  />
                  <button
                    onClick={handleFileSend}
                    disabled={!welcomeInput.trim() || isChatLoading}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm transition-all ${
                      welcomeInput.trim() && !isChatLoading
                        ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-md hover:shadow-lg cursor-pointer"
                        : "bg-slate-200 cursor-default"
                    }`}
                  >
                    ↑
                  </button>
                </div>

                {/* File Preview Banner */}
                {filePreview && (
                  <div className="w-full mb-4 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="text-lg">
                      {filePreview.parsed.type === "image"
                        ? "🖼️"
                        : filePreview.parsed.type === "csv" ||
                            filePreview.parsed.type === "excel"
                          ? "📊"
                          : filePreview.parsed.type === "json"
                            ? "🔧"
                            : "📄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-brand-700 truncate">
                        {filePreview.fileName}
                      </p>
                      <p className="text-[11px] text-brand-500 truncate">
                        {previewLabel(filePreview.parsed, filePreview.fileName)}
                      </p>
                    </div>
                    <button
                      onClick={clearFilePreview}
                      className="text-brand-400 hover:text-brand-600 text-sm flex-shrink-0 px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Parsing indicator */}
                {fileParsing && (
                  <div className="w-full mb-4 text-center text-[12px] text-slate-400 animate-pulse">
                    Parsing file...
                  </div>
                )}

                {/* Starter chips */}
                {!filePreview && (
                  <div className="flex flex-wrap gap-2 justify-center mb-8">
                    {STARTER_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleWelcomeSend(chip)}
                        className="text-[13px] px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm hover:shadow-md"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {/* Drop zone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                    isDragOver
                      ? "border-brand-400 bg-brand-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="text-2xl mb-2">📄</div>
                  <p
                    className={`text-sm ${isDragOver ? "text-brand-600 font-semibold" : "text-slate-400"}`}
                  >
                    {isDragOver
                      ? "Drop to generate a screen"
                      : "Drop a file or click to browse"}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    CSV, JSON, Excel, PDF, TXT, Markdown, Images
                  </p>
                </div>
              </div>
            ) : showGenerating ? (
              /* ── Generating State ── */
              <div className="w-full flex flex-col items-center justify-center py-24 animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-xl text-white mb-5 shadow-lg animate-pulse">
                  ⬡
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">
                  Building your screen...
                </p>
                <p className="text-sm text-slate-400">
                  AI is generating components based on your description
                </p>
                <div className="mt-6 flex gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            ) : (
              /* ── Normal Canvas ── */
              <div
                style={{
                  width: `${viewportWidth}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
                className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
              >
                {elements.map((el) => (
                  <ElementRenderer
                    key={el.id}
                    element={el}
                    selected={selectedId === el.id}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Properties + Chat */}
        <div className="w-[380px] flex flex-col bg-white border-l border-slate-200 min-h-0">
          <PropertyPanel />
          <ChatPanel />
        </div>
      </div>

      {/* Submit to Scale Modal */}
      <SubmitToScaleModal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
      />
    </div>
  );
}
