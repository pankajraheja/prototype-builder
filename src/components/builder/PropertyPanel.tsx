"use client";

import { useBuilderStore } from "@/lib/store";

export function PropertyPanel() {
  const { elements, selectedId, setElements } = useBuilderStore();
  const selected = elements.find((e) => e.id === selectedId);

  if (!selected) return null;

  const updateProp = (key: string, value: any) => {
    const updated = elements.map((e) =>
      e.id === selectedId ? { ...e, props: { ...e.props, [key]: value } } : e
    );
    setElements(updated, true, `Updated ${key} on ${selected.label}`);
  };

  const updateNestedItem = (key: string, index: number, field: string, value: any) => {
    const items = [...(selected.props[key] || [])];
    items[index] = { ...items[index], [field]: value };
    updateProp(key, items);
  };

  const p = selected.props;

  return (
    <div className="px-3.5 py-3 border-b border-brand-100 bg-brand-50/50 animate-in slide-in-from-top duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded bg-brand-500 text-white font-bold">
            SELECTED
          </span>
          <span className="text-[13px] font-bold text-slate-900">
            {selected.label}
          </span>
        </div>
        <button
          onClick={() => useBuilderStore.getState().setSelectedId(null)}
          className="text-sm text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-white/60"
        >
          ✕
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 flex-wrap mb-3">
        {[
          {
            label: "⬆ Up",
            action: () => {
              const idx = elements.findIndex((e) => e.id === selectedId);
              if (idx > 0) {
                const arr = [...elements];
                [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
                arr.forEach((e, i) => (e.sortOrder = i));
                setElements(arr, true, `Moved ${selected.label} up`);
              }
            },
          },
          {
            label: "⬇ Down",
            action: () => {
              const idx = elements.findIndex((e) => e.id === selectedId);
              if (idx < elements.length - 1) {
                const arr = [...elements];
                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                arr.forEach((e, i) => (e.sortOrder = i));
                setElements(arr, true, `Moved ${selected.label} down`);
              }
            },
          },
          {
            label: "📋 Clone",
            action: () => {
              const idx = elements.findIndex((e) => e.id === selectedId);
              const cloned = {
                ...selected,
                id: `el-${Date.now()}`,
                props: JSON.parse(JSON.stringify(selected.props)),
              };
              const arr = [...elements];
              arr.splice(idx + 1, 0, cloned);
              arr.forEach((e, i) => (e.sortOrder = i));
              setElements(arr, true, `Cloned ${selected.label}`);
            },
          },
          {
            label: "🗑 Delete",
            action: () => {
              setElements(elements.filter((e) => e.id !== selectedId), true, `Deleted ${selected.label}`);
              useBuilderStore.getState().setSelectedId(null);
            },
            danger: true,
          },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all hover:translate-y-[-1px] ${
              (btn as any).danger
                ? "bg-white border border-red-200 text-red-500 hover:bg-red-50"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-brand-50"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Property Editors */}
      <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
        {/* Title */}
        {p.title !== undefined && (
          <FieldInput label="Title" value={p.title} onChange={(v) => updateProp("title", v)} />
        )}
        {/* Subtitle */}
        {p.subtitle !== undefined && (
          <FieldInput label="Subtitle" value={p.subtitle} onChange={(v) => updateProp("subtitle", v)} />
        )}
        {/* Content */}
        {p.content !== undefined && (
          <FieldTextarea label="Content" value={p.content} onChange={(v) => updateProp("content", v)} />
        )}
        {/* Quote */}
        {p.quote !== undefined && (
          <FieldTextarea label="Quote" value={p.quote} onChange={(v) => updateProp("quote", v)} />
        )}
        {/* Author */}
        {p.author !== undefined && (
          <FieldInput label="Author" value={p.author} onChange={(v) => updateProp("author", v)} />
        )}
        {/* Brand */}
        {p.brand !== undefined && (
          <FieldInput label="Brand" value={p.brand} onChange={(v) => updateProp("brand", v)} />
        )}
        {/* Button row */}
        {p.btnText !== undefined && (
          <div className="flex gap-2">
            <div className="flex-1">
              <FieldInput label="Button Text" value={p.btnText} onChange={(v) => updateProp("btnText", v)} />
            </div>
            {p.btnColor !== undefined && (
              <FieldColor label="Btn Color" value={p.btnColor} onChange={(v) => updateProp("btnColor", v)} />
            )}
          </div>
        )}
        {/* Background */}
        {p.bg !== undefined && typeof p.bg === "string" && !p.bg.includes("gradient") && (
          <FieldColor label="Background" value={p.bg} onChange={(v) => updateProp("bg", v)} />
        )}
        {/* Accent */}
        {p.accent !== undefined && (
          <FieldColor label="Accent" value={p.accent} onChange={(v) => updateProp("accent", v)} />
        )}
        {/* Alignment */}
        {p.align !== undefined && (
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Align</label>
            <div className="flex gap-1">
              {["left", "center", "right"].map((a) => (
                <button
                  key={a}
                  onClick={() => updateProp("align", a)}
                  className={`flex-1 text-[10px] py-1 rounded-md font-semibold ${
                    p.align === a
                      ? "bg-brand-500 text-white"
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Columns */}
        {p.columns !== undefined && (
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Columns</label>
            <div className="flex gap-1">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => updateProp("columns", n)}
                  className={`flex-1 text-[10px] py-1 rounded-md font-semibold ${
                    p.columns === n
                      ? "bg-brand-500 text-white"
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Field Components ────────────────────────────────────
function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-semibold block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-lg border-[1.5px] border-slate-200 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-white"
      />
    </div>
  );
}

function FieldTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-semibold block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-2.5 py-1.5 rounded-lg border-[1.5px] border-slate-200 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-y bg-white"
      />
    </div>
  );
}

function FieldColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-[70px]">
      <label className="text-[10px] text-slate-500 font-semibold block mb-1">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[30px] rounded-lg border-[1.5px] border-slate-200 cursor-pointer"
      />
    </div>
  );
}
