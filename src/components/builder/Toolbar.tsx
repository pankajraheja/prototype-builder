"use client";

import { useBuilderStore } from "@/lib/store";

interface ToolbarProps {
  onSubmitToScale?: () => void;
}

export function Toolbar({ onSubmitToScale }: ToolbarProps) {
  const {
    undo, redo, history, historyIndex,
    zoom, setZoom,
    showLibrary, setShowLibrary,
    viewportMode, setViewportMode,
    isSaving, lastSaved,
    elements, screenId, setSaving,
  } = useBuilderStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undoLabel = canUndo ? history[historyIndex].label : undefined;
  const redoLabel = canRedo ? history[historyIndex + 1].label : undefined;

  const handleSave = async () => {
    if (!screenId) return;
    setSaving(true);
    try {
      await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-elements",
          screenId,
          elements,
        }),
      });
      // Also create a version snapshot
      await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "snapshot",
          screenId,
          snapshot: { elements: elements.map(({ id, ...rest }) => rest) },
        }),
      });
      setSaving(false, new Date().toLocaleTimeString());
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="h-12 bg-white border-b border-slate-200 flex items-center px-3.5 gap-1.5">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-[11px] text-white">
          ⬡
        </div>
        <span className="font-mono text-xs font-bold text-slate-900">
          Prototype Builder
        </span>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Undo / Redo */}
      <ToolBtn onClick={undo} disabled={!canUndo} label="↩ Undo" tooltip={undoLabel ? `Undo: ${undoLabel}` : undefined} />
      <ToolBtn onClick={redo} disabled={!canRedo} label="↪ Redo" tooltip={redoLabel ? `Redo: ${redoLabel}` : undefined} />

      <div className="w-px h-6 bg-slate-200" />

      {/* Add Block */}
      <button
        onClick={() => setShowLibrary(!showLibrary)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
          showLibrary
            ? "bg-brand-50 text-brand-600 border border-brand-200"
            : "bg-slate-50 text-slate-600 border border-transparent hover:bg-brand-50 hover:text-brand-600"
        }`}
      >
        + Add Block
      </button>

      <div className="flex-1" />

      {/* Viewport */}
      <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
        {(
          [
            { mode: "desktop", icon: "🖥️" },
            { mode: "tablet", icon: "📱" },
            { mode: "mobile", icon: "📲" },
          ] as const
        ).map((v) => (
          <button
            key={v.mode}
            onClick={() => setViewportMode(v.mode)}
            className={`px-2 py-1 rounded-md text-[11px] transition-all ${
              viewportMode === v.mode
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400"
            }`}
          >
            {v.icon}
          </button>
        ))}
      </div>

      {/* Zoom */}
      <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
        {[75, 100, 125].map((z) => (
          <button
            key={z}
            onClick={() => setZoom(z)}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
              zoom === z
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400"
            }`}
          >
            {z}%
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Block count */}
      <span className="text-[10px] text-slate-400 font-mono">
        {elements.length} blocks
      </span>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSaving || !screenId}
        className={`ml-2 text-xs font-bold px-4 py-1.5 rounded-lg transition-all ${
          screenId
            ? "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"
            : "bg-slate-100 text-slate-400 cursor-default"
        }`}
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      {/* Submit to Scale */}
      {elements.length > 0 && (
        <button
          onClick={onSubmitToScale}
          className="ml-1.5 text-xs font-bold px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-emerald-500 text-white hover:shadow-lg transition-all"
        >
          🚀 Submit to Scale
        </button>
      )}

      {lastSaved && (
        <span className="text-[9px] text-slate-400 ml-1">
          Saved {lastSaved}
        </span>
      )}
    </div>
  );
}

function ToolBtn({
  onClick,
  disabled,
  label,
  tooltip,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  tooltip?: string;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${
          disabled
            ? "text-slate-300 cursor-default"
            : "text-slate-600 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 hover:translate-y-[-1px]"
        }`}
      >
        {label}
      </button>
      {tooltip && !disabled && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}
