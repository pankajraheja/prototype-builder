"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const router = useRouter();

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const { data } = await res.json();
      setProjects(data || []);
    } catch {
      // DB not connected — allow local-only mode
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const { data } = await res.json();
      if (data?.screens?.[0]) {
        router.push(`/builder/${data.screens[0].id}`);
      }
    } catch {
      // Fallback: open local builder
      router.push(`/builder/local-${Date.now()}`);
    } finally {
      setCreating(false);
      setNewName("");
    }
  };

  const openLocalBuilder = () => {
    router.push(`/builder/local-${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center text-base text-white">
              ⬡
            </div>
            <div>
              <h1 className="font-mono text-base font-bold text-slate-900">
                Prototype Builder
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase">
                AgentForge Module
              </p>
            </div>
          </div>
          <button
            onClick={openLocalBuilder}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md hover:shadow-lg transition-all hover:translate-y-[-1px]"
          >
            + Quick Start
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-10 bg-gradient-to-br from-slate-900 to-brand-900 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute right-[-40px] top-[-40px] w-[200px] h-[200px] rounded-full bg-brand-500/10 blur-[80px]" />
          <h2 className="text-2xl font-bold mb-2 relative">
            AI-Powered Screen Builder
          </h2>
          <p className="text-brand-200 max-w-md leading-relaxed relative">
            Build UI prototypes with natural language. Click to select, chat to
            edit. Every change is persisted and versioned.
          </p>
          <div className="flex gap-3 mt-5 relative">
            <button
              onClick={openLocalBuilder}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-brand-700 hover:bg-brand-50 transition-all"
            >
              Start Building →
            </button>
            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-all">
              View Templates
            </button>
          </div>
        </div>

        {/* Create New */}
        <div className="mb-8 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Create New Project
          </h3>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProject()}
              placeholder="Project name (e.g., Marketing Site, Dashboard...)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={createProject}
              disabled={creating || !newName.trim()}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                newName.trim()
                  ? "bg-brand-500 text-white hover:bg-brand-600 shadow-sm"
                  : "bg-slate-100 text-slate-400 cursor-default"
              }`}
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>

        {/* Project List */}
        <h3 className="text-sm font-bold text-slate-900 mb-3">Your Projects</h3>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin text-2xl mb-2">⟳</div>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="text-4xl mb-3">📱</div>
            <p className="text-slate-500 text-sm mb-1">No projects yet</p>
            <p className="text-slate-400 text-xs mb-4">
              Create a project above or click Quick Start for a local session.
            </p>
            <button
              onClick={openLocalBuilder}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-brand-500 text-white hover:bg-brand-600 transition-all"
            >
              Quick Start →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const router = useRouter();
  const [screens, setScreens] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/screens?projectId=${project.id}`)
      .then((r) => r.json())
      .then(({ data }) => setScreens(data || []))
      .catch(() => {});
  }, [project.id]);

  const openScreen = () => {
    if (screens.length > 0) {
      router.push(`/builder/${screens[0].id}`);
    }
  };

  return (
    <div
      onClick={openScreen}
      className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:translate-y-[-2px] transition-all group"
    >
      {/* Preview placeholder */}
      <div className="h-32 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 mb-4 flex items-center justify-center text-3xl group-hover:from-brand-50 group-hover:to-brand-100 transition-colors">
        📱
      </div>
      <h4 className="text-sm font-bold text-slate-900 mb-1">{project.name}</h4>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            project.status === "active"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {project.status}
        </span>
        <span>{screens.length} screen{screens.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
