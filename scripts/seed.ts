import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../drizzle/schema";

const ELEMENT_DEFAULTS: Record<string, any> = {
  navbar: { brand: "AgentForge", links: ["Home", "Features", "Pricing", "Docs"], btnText: "Sign In", bg: "#ffffff", color: "#0f172a", accent: "#8b5cf6", sticky: true },
  hero: { title: "Welcome to AgentForge", subtitle: "Build, certify, and deploy AI assets across your organization.", btnText: "Get Started", btnColor: "#8b5cf6", bg: "linear-gradient(135deg, #1e1b4b, #312e81)", textColor: "#ffffff", align: "left", showImage: true, imageEmoji: "🤖" },
  stats: { items: [{ value: "847+", label: "Assets", color: "#8b5cf6" }, { value: "12", label: "Countries", color: "#3b82f6" }, { value: "99.7%", label: "Uptime", color: "#22c55e" }, { value: "5.2K", label: "Users", color: "#f59e0b" }], bg: "#ffffff" },
  cards: { columns: 3, items: [{ icon: "🤖", title: "AI Agents", desc: "Deploy intelligent agents across your org", color: "#a855f7" }, { icon: "📊", title: "Analytics", desc: "Real-time dashboards and cost tracking", color: "#3b82f6" }, { icon: "🔐", title: "Governance", desc: "Enterprise-grade RBAC and compliance", color: "#22c55e" }] },
  cta: { title: "Ready to transform your AI operations?", subtitle: "Join 500+ enterprise teams already using AgentForge.", btnText: "Start Free Trial", btnColor: "#8b5cf6", bg: "linear-gradient(135deg, #4c1d95, #7c3aed)", textColor: "#ffffff" },
  footer: { brand: "AgentForge", tagline: "Building the future of AI operations.", columns: [{ title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] }, { title: "Resources", links: ["Docs", "API Reference", "Templates", "Blog"] }, { title: "Company", links: ["About", "Careers", "Contact", "Legal"] }], copyright: "© 2026 AgentForge. All rights reserved.", bg: "#0f172a", color: "#94a3b8" },
};

// SDLC Stage configurations — same pipeline for all service groups,
// but checklist items and automated checks vary
const SDLC_STAGES = [
  {
    stage: "intake_review" as const,
    label: "Intake Review",
    description: "Initial review of submission completeness and routing",
    sortOrder: 0,
    slaHours: 24,
    requiredApprovers: 1,
    approverRoles: ["asset_concierge", "country_admin"],
    autoAdvance: false,
    checklist: [
      { item: "Submission form is complete", required: true },
      { item: "Data classification is appropriate", required: true },
      { item: "Service group assignment is correct", required: true },
      { item: "PII declaration reviewed", required: true },
      { item: "No obvious compliance red flags", required: true },
    ],
    automatedChecks: [
      { type: "pii_scan" as const, enabled: true, blockOnFailure: false },
    ],
  },
  {
    stage: "peer_review" as const,
    label: "Peer Review",
    description: "Technical and functional review by qualified peer",
    sortOrder: 1,
    slaHours: 72,
    requiredApprovers: 1,
    approverRoles: ["builder", "asset_concierge"],
    autoAdvance: false,
    checklist: [
      { item: "Functionality works as described", required: true },
      { item: "UI/UX meets platform standards", required: true },
      { item: "No hardcoded credentials or secrets", required: true },
      { item: "Error handling is adequate", required: false },
      { item: "Accessibility basics covered", required: false },
    ],
    automatedChecks: [
      { type: "code_quality" as const, enabled: true, blockOnFailure: false },
    ],
  },
  {
    stage: "testing" as const,
    label: "Testing & QA",
    description: "Automated and manual testing",
    sortOrder: 2,
    slaHours: 48,
    requiredApprovers: 1,
    approverRoles: ["builder", "asset_concierge"],
    autoAdvance: true,
    checklist: [
      { item: "Unit tests pass", required: true },
      { item: "Integration tests pass", required: true },
      { item: "Performance within acceptable limits", required: true },
      { item: "Cross-browser/device verified", required: false },
    ],
    automatedChecks: [
      { type: "unit_tests" as const, enabled: true, blockOnFailure: true },
      { type: "integration_tests" as const, enabled: true, blockOnFailure: true },
      { type: "performance" as const, enabled: true, blockOnFailure: false },
    ],
  },
  {
    stage: "security_scan" as const,
    label: "Security Scan",
    description: "Automated security analysis and PII verification",
    sortOrder: 3,
    slaHours: 24,
    requiredApprovers: 1,
    approverRoles: ["security_lead", "global_admin"],
    autoAdvance: true,
    checklist: [
      { item: "No critical vulnerabilities", required: true },
      { item: "No high vulnerabilities", required: true },
      { item: "PII handling matches declaration", required: true },
      { item: "Data encryption at rest and in transit", required: true },
      { item: "Authentication/authorization verified", required: false },
    ],
    automatedChecks: [
      { type: "security_scan" as const, enabled: true, blockOnFailure: true },
      { type: "pii_scan" as const, enabled: true, blockOnFailure: true },
    ],
  },
  {
    stage: "certified" as const,
    label: "Certified",
    description: "Asset has passed all checks and is approved for deployment",
    sortOrder: 4,
    slaHours: null,
    requiredApprovers: 1,
    approverRoles: ["asset_concierge", "country_admin", "global_admin"],
    autoAdvance: false,
    checklist: [
      { item: "All prior stages completed successfully", required: true },
      { item: "Deployment plan reviewed", required: true },
      { item: "Rollback plan documented", required: false },
    ],
    automatedChecks: [],
  },
];

const SERVICE_GROUPS = ["advisory", "tax", "audit", "consulting"] as const;

async function seed() {
  const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/prototype_builder";
  console.log("🔌 Connecting to:", connectionString.replace(/\/\/.*@/, "//***@"));

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("🌱 Seeding database...\n");

  // ══════════════════════════════════════════════
  // 1. PROTOTYPE BUILDER DATA
  // ══════════════════════════════════════════════

  const [project] = await db
    .insert(schema.projects)
    .values({
      name: "AgentForge Landing Page",
      description: "Demo landing page built with the AI screen builder",
      slug: "agentforge-landing",
      status: "active",
      createdBy: "system",
      settings: { theme: "light", primaryColor: "#8b5cf6" },
    })
    .returning();
  console.log("✅ Project:", project.name);

  const [screen] = await db
    .insert(schema.screens)
    .values({
      projectId: project.id,
      name: "Home",
      slug: "home",
      sortOrder: 0,
      status: "active",
      settings: { width: 600, backgroundColor: "#ffffff" },
    })
    .returning();
  console.log("✅ Screen:", screen.name);

  const elementRows = [
    { type: "navbar", label: "Navigation Bar", sortOrder: 0 },
    { type: "hero", label: "Hero Section", sortOrder: 1 },
    { type: "stats", label: "Stats Row", sortOrder: 2 },
    { type: "cards", label: "Card Grid", sortOrder: 3 },
    { type: "cta", label: "Call to Action", sortOrder: 4 },
    { type: "footer", label: "Footer", sortOrder: 5 },
  ];

  for (const el of elementRows) {
    await db.insert(schema.elements).values({
      screenId: screen.id,
      type: el.type,
      label: el.label,
      sortOrder: el.sortOrder,
      visible: true,
      locked: false,
      props: ELEMENT_DEFAULTS[el.type],
    });
  }
  console.log(`✅ Elements: ${elementRows.length} created`);

  // Version snapshot
  await db.insert(schema.screenVersions).values({
    screenId: screen.id,
    versionNumber: 1,
    label: "Initial layout",
    snapshot: {
      elements: elementRows.map((el) => ({
        type: el.type, label: el.label, sortOrder: el.sortOrder,
        props: ELEMENT_DEFAULTS[el.type],
      })),
    },
    createdBy: "system",
  });
  console.log("✅ Version: v1 snapshot");

  // Welcome chat
  await db.insert(schema.chatMessages).values({
    screenId: screen.id,
    role: "assistant",
    content: "Welcome! I've set up a landing page with a navbar, hero, stats, cards, CTA, and footer. Click any section to select it, then tell me what to change.",
    metadata: { action: "add", targetElementType: "initial-layout" },
  });
  console.log("✅ Chat: welcome message");

  // ══════════════════════════════════════════════
  // 2. SDLC STAGE CONFIGS (per service group)
  // ══════════════════════════════════════════════

  let configCount = 0;
  for (const sg of SERVICE_GROUPS) {
    for (const stageDef of SDLC_STAGES) {
      await db.insert(schema.sdlcStageConfigs).values({
        serviceGroup: sg,
        country: "GLOBAL",
        stage: stageDef.stage,
        label: stageDef.label,
        description: stageDef.description,
        isRequired: true,
        autoAdvance: stageDef.autoAdvance,
        slaHours: stageDef.slaHours,
        requiredApprovers: stageDef.requiredApprovers,
        approverRoles: stageDef.approverRoles,
        checklistTemplate: stageDef.checklist,
        automatedChecks: stageDef.automatedChecks,
        sortOrder: stageDef.sortOrder,
        isActive: true,
      });
      configCount++;
    }
  }
  console.log(`✅ SDLC Stage Configs: ${configCount} (${SDLC_STAGES.length} stages × ${SERVICE_GROUPS.length} service groups)`);

  // ══════════════════════════════════════════════
  // 3. SAMPLE SUBMISSION (to demonstrate the bridge)
  // ══════════════════════════════════════════════

  const [submission] = await db
    .insert(schema.assetSubmissions)
    .values({
      name: "AgentForge Landing Page",
      description: "Marketing landing page prototype built in the screen builder",
      assetType: "template",
      origin: "prototype_builder",
      sourceId: project.id,
      sourceScreenId: screen.id,
      sourceUrl: `http://localhost:3000/builder/${screen.id}`,
      projectName: "AgentForge Landing Page",
      dataClassification: "internal",
      serviceGroup: "advisory",
      country: "GLOBAL",
      usesPii: false,
      usesClientData: false,
      estimatedUsers: "200–1,000",
      targetEnvironment: "staging",
      complianceAnswers: {
        handlesFinancialData: false,
        requiresAuditTrail: false,
        crossBorderDataTransfer: false,
        gdprApplicable: false,
        regulatoryScope: [],
      },
      submittedBy: "demo-user",
      currentStage: "intake_review",
      priority: "medium",
      tags: ["landing-page", "marketing", "prototype"],
    })
    .returning();
  console.log("✅ Sample Submission:", submission.name);

  // Pipeline entries — submitted → intake_review
  await db.insert(schema.sdlcPipeline).values({
    submissionId: submission.id,
    stage: "submitted",
    enteredAt: new Date(Date.now() - 3600000), // 1 hour ago
    exitedAt: new Date(Date.now() - 1800000),  // 30 min ago
    durationSeconds: 1800,
    outcome: "approved",
    notes: "Auto-advanced to intake review",
  });

  await db.insert(schema.sdlcPipeline).values({
    submissionId: submission.id,
    stage: "intake_review",
    assignedTo: "Jessica Donovan",
    assignedRole: "asset_concierge",
    assignedAt: new Date(),
  });
  console.log("✅ Pipeline: 2 entries (submitted → intake_review)");

  // Audit trail
  await db.insert(schema.auditTrail).values({
    entityType: "submission",
    entityId: submission.id,
    action: "created",
    actorName: "demo-user",
    actorRole: "builder",
    newValues: {
      name: submission.name,
      origin: "prototype_builder",
      dataClassification: "internal",
    },
  });
  console.log("✅ Audit trail: 1 entry");

  // ══════════════════════════════════════════════
  console.log("\n🎉 Seed complete!");
  console.log(`\n   Builder:    http://localhost:3000/builder/${screen.id}`);
  console.log(`   Dashboard:  http://localhost:3000`);
  console.log(`\n   DB tables seeded:`);
  console.log(`     • projects (1)`);
  console.log(`     • screens (1)`);
  console.log(`     • elements (${elementRows.length})`);
  console.log(`     • screen_versions (1)`);
  console.log(`     • chat_messages (1)`);
  console.log(`     • sdlc_stage_configs (${configCount})`);
  console.log(`     • asset_submissions (1)`);
  console.log(`     • sdlc_pipeline (2)`);
  console.log(`     • audit_trail (1)\n`);

  await client.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
