"use client";

import { useState } from "react";
import { useBuilderStore } from "@/lib/store";
import type {
  DataClassification,
  ServiceGroup,
  Environment,
  SubmissionFormData,
} from "@/types";

interface SubmitModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ["Basic Info", "Governance", "Compliance", "Review & Submit"];

const DATA_CLASSIFICATIONS: {
  value: DataClassification;
  label: string;
  icon: string;
  desc: string;
  color: string;
}[] = [
  { value: "public", label: "Public", icon: "🟢", desc: "No restrictions on access or sharing", color: "#22c55e" },
  { value: "internal", label: "Internal", icon: "🔵", desc: "For internal use only, not client-facing", color: "#3b82f6" },
  { value: "confidential", label: "Confidential", icon: "🟠", desc: "Client data, financial info, or strategic content", color: "#f59e0b" },
  { value: "restricted", label: "Restricted", icon: "🔴", desc: "PII, PHI, material non-public information", color: "#ef4444" },
];

const SERVICE_GROUPS: { value: ServiceGroup; label: string; icon: string }[] = [
  { value: "advisory", label: "Advisory", icon: "💼" },
  { value: "tax", label: "Tax & Legal", icon: "📋" },
  { value: "audit", label: "Audit & Assurance", icon: "🔍" },
  { value: "consulting", label: "Consulting", icon: "⚡" },
];

const ENVIRONMENTS: { value: Environment; label: string; icon: string }[] = [
  { value: "development", label: "Development", icon: "🧪" },
  { value: "staging", label: "Staging", icon: "🔄" },
  { value: "production", label: "Production", icon: "🚀" },
];

const COUNTRIES = [
  "GLOBAL", "US", "UK", "DE", "FR", "SG", "AU", "IN", "JP", "BR", "CA",
];

const USER_ESTIMATES = ["< 50", "50–200", "200–1,000", "1,000+"];

export function SubmitToScaleModal({ open, onClose }: SubmitModalProps) {
  const { projectId, screenId, screenName, elements } = useBuilderStore();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const [form, setForm] = useState<SubmissionFormData>({
    name: screenName || "",
    description: "",
    assetType: "template",
    projectName: screenName || "",
    dataClassification: "internal",
    serviceGroup: "advisory",
    country: "GLOBAL",
    usesPii: false,
    piiDetails: "",
    usesClientData: false,
    estimatedUsers: "< 50",
    targetEnvironment: "development",
    priority: "medium",
    complianceAnswers: {
      handlesFinancialData: false,
      requiresAuditTrail: false,
      crossBorderDataTransfer: false,
      gdprApplicable: false,
      regulatoryScope: [],
    },
    tags: [],
  });

  const update = (key: string, val: any) =>
    setForm((prev) => ({ ...prev, [key]: val }));
  const updateCompliance = (key: string, val: any) =>
    setForm((prev) => ({
      ...prev,
      complianceAnswers: { ...prev.complianceAnswers, [key]: val },
    }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          origin: "prototype_builder",
          sourceId: projectId,
          sourceScreenId: screenId,
          sourceUrl: typeof window !== "undefined"
            ? `${window.location.origin}/builder/${screenId}`
            : undefined,
          submittedBy: "builder-user", // would come from auth in production
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setSubmissionResult(result.data);
      setSubmitted(true);
    } catch (e: any) {
      alert(`Submission failed: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // ── Success Screen ──
  if (submitted && submissionResult) {
    return (
      <Overlay onClose={onClose}>
        <div className="text-center py-6">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Submitted to SDLC Pipeline
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            <strong>{form.name}</strong> has been submitted and is now in the
            certification queue. An Asset Concierge will review it shortly.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
            <Row label="Submission ID" value={submissionResult.submission?.id?.slice(0, 8) + "..."} />
            <Row label="Stage" value="📥 Submitted" />
            <Row label="Service Group" value={form.serviceGroup} />
            <Row label="Data Classification" value={form.dataClassification} />
            <Row label="PII" value={form.usesPii ? "⚠️ Yes" : "✅ No"} />
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-500 text-white hover:bg-brand-600"
            >
              Back to Builder
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              View in Pipeline →
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            🚀 Submit to Scale
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            This enters the SDLC certification pipeline
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "bg-brand-500" : "bg-slate-200"
              }`}
            />
            <div
              className={`text-[10px] mt-1 font-semibold ${
                i === step ? "text-brand-600" : "text-slate-400"
              }`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 0: Basic Info ── */}
      {step === 0 && (
        <div className="space-y-4">
          <Field label="Asset Name" required>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="inp"
              placeholder="e.g., Client Onboarding Dashboard"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description || ""}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="inp resize-y"
              placeholder="Brief description of what this prototype does..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project Name" required>
              <input
                value={form.projectName}
                onChange={(e) => update("projectName", e.target.value)}
                className="inp"
              />
            </Field>
            <Field label="Asset Type">
              <select
                value={form.assetType}
                onChange={(e) => update("assetType", e.target.value)}
                className="inp"
              >
                <option value="template">UI Template</option>
                <option value="agent">AI Agent</option>
                <option value="workflow">Workflow</option>
                <option value="api">API</option>
                <option value="dashboard">Dashboard</option>
              </select>
            </Field>
          </div>
          <Field label="Priority">
            <div className="flex gap-2">
              {(["low", "medium", "high", "critical"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => update("priority", p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    form.priority === p
                      ? p === "critical"
                        ? "bg-red-500 text-white"
                        : p === "high"
                        ? "bg-orange-500 text-white"
                        : p === "medium"
                        ? "bg-brand-500 text-white"
                        : "bg-slate-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* ── Step 1: Governance ── */}
      {step === 1 && (
        <div className="space-y-4">
          <Field label="Data Classification" required>
            <div className="grid grid-cols-2 gap-2">
              {DATA_CLASSIFICATIONS.map((dc) => (
                <button
                  key={dc.value}
                  onClick={() => update("dataClassification", dc.value)}
                  className={`p-3 rounded-xl text-left transition-all border ${
                    form.dataClassification === dc.value
                      ? "border-brand-400 bg-brand-50 ring-2 ring-brand-200"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{dc.icon}</span>
                    <span className="text-xs font-bold" style={{ color: dc.color }}>
                      {dc.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">{dc.desc}</p>
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service Group" required>
              <select
                value={form.serviceGroup}
                onChange={(e) => update("serviceGroup", e.target.value)}
                className="inp"
              >
                {SERVICE_GROUPS.map((sg) => (
                  <option key={sg.value} value={sg.value}>
                    {sg.icon} {sg.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Country / Region" required>
              <select
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className="inp"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Environment">
              <select
                value={form.targetEnvironment}
                onChange={(e) => update("targetEnvironment", e.target.value)}
                className="inp"
              >
                {ENVIRONMENTS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.icon} {e.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated Users">
              <select
                value={form.estimatedUsers}
                onChange={(e) => update("estimatedUsers", e.target.value)}
                className="inp"
              >
                {USER_ESTIMATES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* PII Question */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Toggle
              label="Will this asset process PII (Personally Identifiable Information)?"
              checked={form.usesPii}
              onChange={(v) => update("usesPii", v)}
            />
            {form.usesPii && (
              <textarea
                value={form.piiDetails || ""}
                onChange={(e) => update("piiDetails", e.target.value)}
                placeholder="Describe the PII: names, emails, SSN, financial records..."
                rows={2}
                className="inp mt-3"
              />
            )}
          </div>
          <Toggle
            label="Will this asset access or process client data?"
            checked={form.usesClientData}
            onChange={(v) => update("usesClientData", v)}
          />
        </div>
      )}

      {/* ── Step 2: Compliance ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            These questions help the SDLC pipeline determine which automated checks
            and approvals are required. Answer to the best of your knowledge.
          </p>
          <Toggle
            label="Does this asset handle financial data (revenue, transactions, billing)?"
            checked={form.complianceAnswers?.handlesFinancialData ?? false}
            onChange={(v) => updateCompliance("handlesFinancialData", v)}
          />
          <Toggle
            label="Does this asset require an audit trail for regulatory compliance?"
            checked={form.complianceAnswers?.requiresAuditTrail ?? false}
            onChange={(v) => updateCompliance("requiresAuditTrail", v)}
          />
          <Toggle
            label="Will data be transferred across country borders?"
            checked={form.complianceAnswers?.crossBorderDataTransfer ?? false}
            onChange={(v) => updateCompliance("crossBorderDataTransfer", v)}
          />
          <Toggle
            label="Is GDPR applicable to this asset's data handling?"
            checked={form.complianceAnswers?.gdprApplicable ?? false}
            onChange={(v) => updateCompliance("gdprApplicable", v)}
          />
          <Field label="Regulatory Scope (select all that apply)">
            <div className="flex flex-wrap gap-2">
              {["SOC 2", "GDPR", "HIPAA", "PCAOB", "SOX", "CCPA", "DORA"].map((reg) => {
                const selected = form.complianceAnswers?.regulatoryScope?.includes(reg);
                return (
                  <button
                    key={reg}
                    onClick={() => {
                      const current = form.complianceAnswers?.regulatoryScope || [];
                      updateCompliance(
                        "regulatoryScope",
                        selected ? current.filter((r) => r !== reg) : [...current, reg]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selected
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {reg}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Data Retention Period">
            <select
              value={form.complianceAnswers?.retentionPeriod || ""}
              onChange={(e) => updateCompliance("retentionPeriod", e.target.value)}
              className="inp"
            >
              <option value="">Not specified</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
              <option value="3y">3 years</option>
              <option value="7y">7 years (regulatory)</option>
              <option value="permanent">Permanent</option>
            </select>
          </Field>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Submission Summary
            </h3>
            <Row label="Name" value={form.name || "—"} />
            <Row label="Project" value={form.projectName || "—"} />
            <Row label="Type" value={form.assetType} />
            <Row label="Priority" value={form.priority} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Governance
            </h3>
            <Row
              label="Data Classification"
              value={
                DATA_CLASSIFICATIONS.find((d) => d.value === form.dataClassification)
                  ?.icon +
                " " +
                form.dataClassification
              }
            />
            <Row
              label="Service Group"
              value={
                SERVICE_GROUPS.find((s) => s.value === form.serviceGroup)?.icon +
                " " +
                form.serviceGroup
              }
            />
            <Row label="Country" value={form.country} />
            <Row
              label="Uses PII"
              value={form.usesPii ? `⚠️ Yes — ${form.piiDetails || "details pending"}` : "✅ No"}
              warn={form.usesPii}
            />
            <Row label="Client Data" value={form.usesClientData ? "⚠️ Yes" : "✅ No"} warn={form.usesClientData} />
            <Row label="Target" value={form.targetEnvironment} />
            <Row label="Est. Users" value={form.estimatedUsers} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Compliance
            </h3>
            <Row label="Financial Data" value={form.complianceAnswers?.handlesFinancialData ? "Yes" : "No"} />
            <Row label="Audit Trail" value={form.complianceAnswers?.requiresAuditTrail ? "Required" : "No"} />
            <Row label="Cross-Border" value={form.complianceAnswers?.crossBorderDataTransfer ? "Yes" : "No"} />
            <Row label="GDPR" value={form.complianceAnswers?.gdprApplicable ? "Applicable" : "No"} />
            <Row
              label="Regulatory"
              value={form.complianceAnswers?.regulatoryScope?.join(", ") || "None"}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            <strong>What happens next:</strong> Your prototype enters the SDLC
            certification pipeline. Based on your answers, it will go through Intake
            Review → Peer Review → Testing → Security Scan → Certification. An
            Asset Concierge for <strong>{form.serviceGroup}</strong> /
            <strong> {form.country}</strong> will be assigned.
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100"
        >
          {step > 0 ? "← Back" : "Cancel"}
        </button>
        <div className="flex gap-2">
          <span className="text-[10px] text-slate-400 self-center mr-2">
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !form.name.trim()}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                step === 0 && !form.name.trim()
                  ? "bg-slate-100 text-slate-400 cursor-default"
                  : "bg-brand-500 text-white hover:bg-brand-600"
              }`}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-brand-500 to-emerald-500 text-white hover:shadow-lg transition-all"
            >
              {submitting ? "Submitting..." : "🚀 Submit to SDLC"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .inp {
          width: 100%;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          font-size: 13px;
          outline: none;
          background: #fff;
          transition: all 0.15s;
        }
        .inp:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
      `}</style>
    </Overlay>
  );
}

// ── Sub-components ───────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[85vh] overflow-y-auto p-6"
        style={{ animation: "popIn 0.2s ease" }}
      >
        {children}
      </div>
      <style jsx>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 cursor-pointer group"
    >
      <div
        className={`w-10 h-[22px] rounded-full transition-all flex items-center px-0.5 ${
          checked ? "bg-brand-500" : "bg-slate-200"
        }`}
      >
        <div
          className={`w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-snug flex-1">
        {label}
      </span>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${warn ? "text-amber-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}
