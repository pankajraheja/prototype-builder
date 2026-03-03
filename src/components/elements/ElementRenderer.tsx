"use client";

import React from "react";
import { ScreenElement } from "@/types";

interface ElementRendererProps {
  element: ScreenElement;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function ElementRenderer({
  element,
  selected,
  onSelect,
}: ElementRendererProps) {
  const p = element.props;
  const selectionStyles = selected
    ? "ring-2 ring-brand-500 ring-offset-2 relative"
    : "hover:ring-1 hover:ring-brand-200 hover:ring-offset-1";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element.id);
  };

  const wrapper = (children: React.ReactNode) => (
    <div
      onClick={handleClick}
      className={`cursor-pointer transition-all duration-150 rounded ${selectionStyles}`}
      style={{ opacity: element.visible === false ? 0.4 : 1 }}
    >
      {selected && (
        <div className="absolute -top-3 left-3 z-10 flex gap-1">
          <span className="text-[9px] px-2 py-0.5 rounded bg-brand-500 text-white font-bold shadow-md">
            {element.label}
          </span>
        </div>
      )}
      {children}
    </div>
  );

  switch (element.type) {
    case "navbar":
      return wrapper(
        <div
          className="flex items-center px-6 py-3"
          style={{
            background: p.bg,
            borderBottom: "1px solid #e8eaef",
          }}
        >
          <span className="font-mono text-sm font-bold" style={{ color: p.color }}>
            {p.brand}
          </span>
          <div className="flex-1 flex gap-5 justify-center">
            {(p.links || []).map((l: string) => (
              <span key={l} className="text-[13px] text-slate-500 cursor-pointer hover:text-slate-700">
                {l}
              </span>
            ))}
          </div>
          <button
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: p.accent }}
          >
            {p.btnText}
          </button>
        </div>
      );

    case "hero":
      return wrapper(
        <div
          className="flex items-center gap-8"
          style={{ padding: "48px 32px", background: p.bg, color: p.textColor }}
        >
          <div className="flex-1" style={{ textAlign: p.align }}>
            <h1 className="text-[28px] font-bold mb-2 leading-tight">{p.title}</h1>
            <p className="text-[15px] opacity-80 mb-5 max-w-[480px] leading-relaxed">
              {p.subtitle}
            </p>
            <button
              className="px-7 py-3 rounded-xl text-sm font-bold text-white shadow-lg"
              style={{ background: p.btnColor }}
            >
              {p.btnText}
            </button>
          </div>
          {p.showImage && (
            <div className="w-[220px] h-[160px] rounded-2xl flex items-center justify-center text-5xl bg-white/5 border border-white/10">
              {p.imageEmoji || "🤖"}
            </div>
          )}
        </div>
      );

    case "stats":
      return wrapper(
        <div
          className="flex justify-center gap-8 py-7 px-6"
          style={{ background: p.bg }}
        >
          {(p.items || []).map((it: any, i: number) => (
            <div key={i} className="text-center">
              <div className="font-mono text-[28px] font-bold" style={{ color: it.color }}>
                {it.value}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{it.label}</div>
            </div>
          ))}
        </div>
      );

    case "cards":
      return wrapper(
        <div
          className="py-7 px-6"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${p.columns || 3}, 1fr)`,
            gap: 14,
          }}
        >
          {(p.items || []).map((c: any, i: number) => (
            <div key={i} className="p-5 rounded-[14px] bg-white border border-slate-100">
              <div
                className="w-10 h-10 rounded-[11px] flex items-center justify-center text-xl mb-3"
                style={{ background: `${c.color}12` }}
              >
                {c.icon}
              </div>
              <h3 className="text-sm font-bold mb-1">{c.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      );

    case "features":
      return wrapper(
        <div className="py-9 px-6" style={{ background: p.bg }}>
          <h2 className="text-[22px] font-bold text-center mb-1">{p.title}</h2>
          <p className="text-sm text-slate-500 text-center mb-6">{p.subtitle}</p>
          <div className="grid grid-cols-2 gap-4 max-w-[600px] mx-auto">
            {(p.items || []).map((f: any, i: number) => (
              <div key={i} className="flex gap-3 p-3">
                <span className="text-[22px] leading-none">{f.icon}</span>
                <div>
                  <h4 className="text-[13px] font-bold mb-0.5">{f.title}</h4>
                  <p className="text-[11.5px] text-slate-500 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "form":
      return wrapper(
        <div className="py-8 px-6" style={{ background: p.bg }}>
          <h2 className="text-xl font-bold mb-4 text-center">{p.title}</h2>
          <div className="max-w-[480px] mx-auto flex flex-col gap-3">
            {(p.fields || []).map((f: any, i: number) => (
              <div key={i}>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <div className="h-[70px] rounded-lg border-[1.5px] border-slate-200 bg-white p-2 text-xs text-slate-400">
                    {f.placeholder}
                  </div>
                ) : (
                  <div className="h-[38px] rounded-lg border-[1.5px] border-slate-200 bg-white px-3 flex items-center text-xs text-slate-400">
                    {f.placeholder}
                  </div>
                )}
              </div>
            ))}
            <button
              className="py-2.5 rounded-lg text-[13px] font-bold text-white mt-1"
              style={{ background: p.btnColor }}
            >
              {p.btnText}
            </button>
          </div>
        </div>
      );

    case "cta":
      return wrapper(
        <div
          className="py-10 px-6 text-center"
          style={{ background: p.bg, color: p.textColor }}
        >
          <h2 className="text-2xl font-bold mb-2">{p.title}</h2>
          <p className="text-sm opacity-80 mb-5">{p.subtitle}</p>
          <button
            className="px-8 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: p.btnColor }}
          >
            {p.btnText}
          </button>
        </div>
      );

    case "testimonial":
      return wrapper(
        <div className="py-8 px-6" style={{ background: p.bg }}>
          <div className="max-w-[540px] mx-auto text-center">
            <div className="flex justify-center gap-0.5 mb-3">
              {Array.from({ length: p.rating || 5 }).map((_, i) => (
                <span key={i} className="text-amber-400 text-base">⭐</span>
              ))}
            </div>
            <p className="text-[15px] text-gray-700 leading-relaxed italic mb-4">
              &ldquo;{p.quote}&rdquo;
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                {p.avatar}
              </div>
              <div className="text-left">
                <div className="text-[13px] font-bold">{p.author}</div>
                <div className="text-[11px] text-slate-400">{p.role}</div>
              </div>
            </div>
          </div>
        </div>
      );

    case "pricing":
      return wrapper(
        <div className="py-9 px-6">
          <div
            className="items-center"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${(p.items || []).length}, 1fr)`,
              gap: 14,
            }}
          >
            {(p.items || []).map((plan: any, i: number) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{
                  padding: plan.featured ? "28px 20px" : "22px 18px",
                  background: plan.featured
                    ? "linear-gradient(135deg, #f5f3ff, #ede9fe)"
                    : "#fff",
                  border: plan.featured ? "2px solid #8b5cf6" : "1.5px solid #f0f1f3",
                  transform: plan.featured ? "scale(1.04)" : "none",
                  boxShadow: plan.featured ? "0 8px 30px rgba(139,92,246,0.1)" : "none",
                }}
              >
                {plan.featured && (
                  <div className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mb-1.5">
                    Most Popular
                  </div>
                )}
                <h3 className="text-base font-bold" style={{ color: plan.color }}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-0.5 my-2">
                  <span className="text-[28px] font-bold font-mono">{plan.price}</span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>
                <p className="text-[11.5px] text-slate-500 mb-3">{plan.desc}</p>
                {(plan.features || []).map((f: string) => (
                  <div key={f} className="text-[11.5px] text-slate-600 py-0.5 flex gap-1.5">
                    <span className="text-emerald-500">✓</span> {f}
                  </div>
                ))}
                <button
                  className="w-full py-2 rounded-lg text-xs font-bold mt-3.5 cursor-pointer"
                  style={{
                    background: plan.featured ? plan.color : "transparent",
                    color: plan.featured ? "#fff" : plan.color,
                    border: plan.featured ? "none" : `1.5px solid ${plan.color}30`,
                  }}
                >
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      );

    case "text":
      return wrapper(
        <div style={{ padding: p.padding, textAlign: p.align, background: p.bg }}>
          <p
            style={{
              fontSize: p.size,
              color: p.color,
              lineHeight: 1.7,
              maxWidth: p.maxWidth,
              margin: "0 auto",
            }}
          >
            {p.content}
          </p>
        </div>
      );

    case "divider":
      return wrapper(
        <div style={{ padding: `${(p.spacing || 32) / 2}px 24px` }}>
          <div style={{ borderBottom: `1px ${p.style || "solid"} ${p.color || "#e2e8f0"}` }} />
        </div>
      );

    case "image":
      return wrapper(
        <div className="px-6 py-4">
          <div
            className="flex items-center justify-center text-sm text-slate-400"
            style={{
              width: p.width,
              height: p.height,
              borderRadius: p.borderRadius,
              background: p.bg,
            }}
          >
            📷 {p.label}
          </div>
        </div>
      );

    case "footer":
      return wrapper(
        <div className="px-6 pt-8 pb-5" style={{ background: p.bg, color: p.color }}>
          <div className="flex gap-10 mb-5">
            <div className="min-w-[120px]">
              <div className="font-mono text-sm font-bold text-white mb-1.5">
                {p.brand}
              </div>
              <div className="text-[11px] leading-relaxed">{p.tagline}</div>
            </div>
            {(p.columns || []).map((col: any) => (
              <div key={col.title}>
                <div className="text-[11px] font-bold text-slate-200 mb-2 uppercase tracking-wider">
                  {col.title}
                </div>
                {(col.links || []).map((l: string) => (
                  <div key={l} className="text-xs mb-1 cursor-pointer hover:text-white">
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-3.5 text-[11px]">{p.copyright}</div>
        </div>
      );

    default:
      return wrapper(
        <div className="p-4 text-slate-400 text-xs">Unknown: {element.type}</div>
      );
  }
}
