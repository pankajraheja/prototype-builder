"use client";

import { useBuilderStore } from "@/lib/store";
import { ELEMENT_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import { ScreenElement } from "@/types";

export function ComponentLibrary() {
  const { showLibrary, setShowLibrary, elements, selectedId, setElements, setSelectedId } =
    useBuilderStore();

  if (!showLibrary) return null;

  const addElement = (templateKey: string) => {
    const template = ELEMENT_TEMPLATES[templateKey];
    if (!template) return;

    const newEl: ScreenElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: template.type,
      label: template.label,
      sortOrder: 0,
      visible: true,
      locked: false,
      props: JSON.parse(JSON.stringify(template.defaultProps)),
    };

    const newElements = [...elements];
    if (selectedId) {
      const idx = newElements.findIndex((e) => e.id === selectedId);
      newElements.splice(idx + 1, 0, newEl);
    } else {
      const footerIdx = newElements.findIndex((e) => e.type === "footer");
      if (footerIdx >= 0) newElements.splice(footerIdx, 0, newEl);
      else newElements.push(newEl);
    }
    newElements.forEach((e, i) => (e.sortOrder = i));

    setElements(newElements, true, `Added ${template.label}`);
    setSelectedId(newEl.id);
    setShowLibrary(false);
  };

  const grouped = TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    templates: Object.entries(ELEMENT_TEMPLATES).filter(
      ([, t]) => t.category === cat.id
    ),
  }));

  return (
    <div className="w-[210px] bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0 animate-in slide-in-from-left duration-200">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900">Components</span>
        <button
          onClick={() => setShowLibrary(false)}
          className="text-slate-400 hover:text-slate-600 text-sm"
        >
          ✕
        </button>
      </div>

      {grouped.map((cat) => (
        <div key={cat.id}>
          <div className="px-3 pt-3 pb-1 text-[9px] font-bold text-slate-400 uppercase tracking-[1.5px] font-mono">
            {cat.icon} {cat.label}
          </div>
          {cat.templates.map(([key, tpl]) => (
            <div
              key={key}
              onClick={() => addElement(key)}
              className="mx-2 mb-0.5 px-2.5 py-2 rounded-lg flex items-center gap-2.5 cursor-pointer hover:bg-brand-50 transition-all group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-brand-100 flex items-center justify-center text-sm transition-colors">
                {tpl.icon}
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700 group-hover:text-brand-700">
                  {tpl.label}
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                  {tpl.description.slice(0, 40)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
