import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// SHARED ENUMS — used across all modules
// ═══════════════════════════════════════════════════════════

export const dataClassificationEnum = pgEnum("data_classification", [
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export const serviceGroupEnum = pgEnum("service_group", [
  "advisory",
  "tax",
  "audit",
  "consulting",
]);

export const environmentEnum = pgEnum("environment", [
  "development",
  "staging",
  "production",
]);

export const sdlcStageEnum = pgEnum("sdlc_stage", [
  "draft",
  "submitted",
  "intake_review",
  "peer_review",
  "testing",
  "security_scan",
  "certified",
  "production",
  "retired",
]);

export const assetOriginEnum = pgEnum("asset_origin", [
  "prototype_builder",
  "no_code_builder",
  "low_code_builder",
  "pro_code_builder",
  "external_import",
  "intake",
]);

export const reviewDecisionEnum = pgEnum("review_decision", [
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
]);

// ═══════════════════════════════════════════════════════════
// MODULE 1: PROTOTYPE BUILDER
// ═══════════════════════════════════════════════════════════

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    thumbnail: text("thumbnail"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    createdBy: varchar("created_by", { length: 255 }),
    settings: jsonb("settings").$type<{
      theme?: "light" | "dark";
      primaryColor?: string;
      fontFamily?: string;
      viewport?: "desktop" | "tablet" | "mobile";
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("projects_slug_idx").on(table.slug),
    statusIdx: index("projects_status_idx").on(table.status),
  })
);

export const projectsRelations = relations(projects, ({ many }) => ({
  screens: many(screens),
  submissions: many(assetSubmissions),
}));

export const screens = pgTable(
  "screens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    settings: jsonb("settings").$type<{
      width?: number;
      backgroundColor?: string;
      padding?: number;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("screens_project_idx").on(table.projectId),
    sortIdx: index("screens_sort_idx").on(table.projectId, table.sortOrder),
  })
);

export const screensRelations = relations(screens, ({ one, many }) => ({
  project: one(projects, {
    fields: [screens.projectId],
    references: [projects.id],
  }),
  elements: many(elements),
  chatMessages: many(chatMessages),
  versions: many(screenVersions),
}));

export const elements = pgTable(
  "elements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    screenId: uuid("screen_id")
      .references(() => screens.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    locked: boolean("locked").notNull().default(false),
    props: jsonb("props").notNull().$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    screenIdx: index("elements_screen_idx").on(table.screenId),
    sortIdx: index("elements_sort_idx").on(table.screenId, table.sortOrder),
    typeIdx: index("elements_type_idx").on(table.type),
  })
);

export const elementsRelations = relations(elements, ({ one }) => ({
  screen: one(screens, {
    fields: [elements.screenId],
    references: [screens.id],
  }),
}));

export const screenVersions = pgTable(
  "screen_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    screenId: uuid("screen_id")
      .references(() => screens.id, { onDelete: "cascade" })
      .notNull(),
    versionNumber: integer("version_number").notNull(),
    label: varchar("label", { length: 255 }),
    snapshot: jsonb("snapshot").notNull().$type<{
      elements: Array<{
        type: string;
        label: string;
        sortOrder: number;
        props: Record<string, any>;
      }>;
      settings?: Record<string, any>;
    }>(),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    screenVersionIdx: index("versions_screen_idx").on(
      table.screenId,
      table.versionNumber
    ),
  })
);

export const screenVersionsRelations = relations(screenVersions, ({ one }) => ({
  screen: one(screens, {
    fields: [screenVersions.screenId],
    references: [screens.id],
  }),
}));

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    screenId: uuid("screen_id")
      .references(() => screens.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<{
      action?: string;
      targetElementId?: string;
      targetElementType?: string;
      changes?: Record<string, any>;
      tokensUsed?: number;
      latencyMs?: number;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    screenIdx: index("chat_screen_idx").on(table.screenId),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  screen: one(screens, {
    fields: [chatMessages.screenId],
    references: [screens.id],
  }),
}));

export const elementTemplates = pgTable(
  "element_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: varchar("type", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull(),
    icon: varchar("icon", { length: 10 }),
    thumbnail: text("thumbnail"),
    defaultProps: jsonb("default_props").notNull().$type<Record<string, any>>(),
    isSystem: boolean("is_system").notNull().default(false),
    createdBy: varchar("created_by", { length: 255 }),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("templates_category_idx").on(table.category),
    typeIdx: index("templates_type_idx").on(table.type),
  })
);

// ═══════════════════════════════════════════════════════════
// BRIDGE: ASSET SUBMISSIONS
// The single handoff table any origin module writes to.
// SDLC reads from here. Future Intake writes here too.
// ═══════════════════════════════════════════════════════════

export const assetSubmissions = pgTable(
  "asset_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // ── What is being submitted ──
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    assetType: varchar("asset_type", { length: 50 }).notNull(),
    origin: assetOriginEnum("origin").notNull(),

    // ── Source reference (polymorphic FK back to origin module) ──
    sourceId: uuid("source_id"),
    sourceScreenId: uuid("source_screen_id"),
    sourceVersionId: uuid("source_version_id"),
    sourceUrl: text("source_url"),

    // ── Non-functional metadata (collected at submission time) ──
    projectName: varchar("project_name", { length: 255 }).notNull(),
    dataClassification: dataClassificationEnum("data_classification").notNull(),
    serviceGroup: serviceGroupEnum("service_group").notNull(),
    country: varchar("country", { length: 10 }).notNull().default("GLOBAL"),
    usesPii: boolean("uses_pii").notNull().default(false),
    piiDetails: text("pii_details"),
    usesClientData: boolean("uses_client_data").notNull().default(false),
    externalDependencies: jsonb("external_dependencies").$type<{
      apis?: string[];
      models?: string[];
      dataSources?: string[];
    }>(),
    estimatedUsers: varchar("estimated_users", { length: 50 }),
    targetEnvironment: environmentEnum("target_environment").notNull().default("development"),

    // ── Compliance questionnaire (extensible) ──
    complianceAnswers: jsonb("compliance_answers").$type<{
      handlesFinancialData?: boolean;
      requiresAuditTrail?: boolean;
      crossBorderDataTransfer?: boolean;
      thirdPartyIntegrations?: string[];
      retentionPeriod?: string;
      gdprApplicable?: boolean;
      regulatoryScope?: string[];
    }>(),

    // ── Submission state ──
    submittedBy: varchar("submitted_by", { length: 255 }).notNull(),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    currentStage: sdlcStageEnum("current_stage").notNull().default("submitted"),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"),
    tags: jsonb("tags").$type<string[]>().default([]),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    stageIdx: index("submissions_stage_idx").on(table.currentStage),
    originIdx: index("submissions_origin_idx").on(table.origin),
    serviceIdx: index("submissions_service_idx").on(table.serviceGroup),
    countryIdx: index("submissions_country_idx").on(table.country),
    submitterIdx: index("submissions_submitter_idx").on(table.submittedBy),
    sourceIdx: index("submissions_source_idx").on(table.sourceId),
    classificationIdx: index("submissions_classification_idx").on(table.dataClassification),
  })
);

export const assetSubmissionsRelations = relations(assetSubmissions, ({ one, many }) => ({
  sourceProject: one(projects, {
    fields: [assetSubmissions.sourceId],
    references: [projects.id],
  }),
  pipelineEntries: many(sdlcPipeline),
  reviews: many(sdlcReviews),
}));

// ═══════════════════════════════════════════════════════════
// MODULE 2: SDLC PIPELINE
// Runs independently — reads from asset_submissions
// ═══════════════════════════════════════════════════════════

export const sdlcPipeline = pgTable(
  "sdlc_pipeline",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .references(() => assetSubmissions.id, { onDelete: "cascade" })
      .notNull(),
    stage: sdlcStageEnum("stage").notNull(),
    enteredAt: timestamp("entered_at").defaultNow().notNull(),
    exitedAt: timestamp("exited_at"),
    durationSeconds: integer("duration_seconds"),
    assignedTo: varchar("assigned_to", { length: 255 }),
    assignedRole: varchar("assigned_role", { length: 50 }),
    assignedAt: timestamp("assigned_at"),
    outcome: reviewDecisionEnum("outcome"),
    notes: text("notes"),
    automatedResults: jsonb("automated_results").$type<{
      testsRun?: number;
      testsPassed?: number;
      testsFailed?: number;
      securityIssues?: Array<{
        severity: "critical" | "high" | "medium" | "low";
        description: string;
        resolved: boolean;
      }>;
      piiScanResult?: "clean" | "flagged";
      piiFindings?: string[];
      performanceMetrics?: Record<string, number>;
      codeQualityScore?: number;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    submissionIdx: index("pipeline_submission_idx").on(table.submissionId),
    stageIdx: index("pipeline_stage_idx").on(table.stage),
    assigneeIdx: index("pipeline_assignee_idx").on(table.assignedTo),
    activeIdx: index("pipeline_active_idx").on(table.submissionId, table.exitedAt),
  })
);

export const sdlcPipelineRelations = relations(sdlcPipeline, ({ one }) => ({
  submission: one(assetSubmissions, {
    fields: [sdlcPipeline.submissionId],
    references: [assetSubmissions.id],
  }),
}));

export const sdlcReviews = pgTable(
  "sdlc_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .references(() => assetSubmissions.id, { onDelete: "cascade" })
      .notNull(),
    pipelineEntryId: uuid("pipeline_entry_id")
      .references(() => sdlcPipeline.id)
      .notNull(),
    reviewerName: varchar("reviewer_name", { length: 255 }).notNull(),
    reviewerRole: varchar("reviewer_role", { length: 100 }),
    decision: reviewDecisionEnum("decision").notNull(),
    comments: text("comments"),
    checklist: jsonb("checklist").$type<
      Array<{ item: string; checked: boolean; note?: string }>
    >(),
    attachments: jsonb("attachments").$type<
      Array<{ name: string; url: string; type: string }>
    >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    submissionIdx: index("reviews_submission_idx").on(table.submissionId),
    reviewerIdx: index("reviews_reviewer_idx").on(table.reviewerName),
    decisionIdx: index("reviews_decision_idx").on(table.decision),
  })
);

export const sdlcReviewsRelations = relations(sdlcReviews, ({ one }) => ({
  submission: one(assetSubmissions, {
    fields: [sdlcReviews.submissionId],
    references: [assetSubmissions.id],
  }),
  pipelineEntry: one(sdlcPipeline, {
    fields: [sdlcReviews.pipelineEntryId],
    references: [sdlcPipeline.id],
  }),
}));

export const sdlcStageConfigs = pgTable(
  "sdlc_stage_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceGroup: serviceGroupEnum("service_group").notNull(),
    country: varchar("country", { length: 10 }).notNull().default("GLOBAL"),
    stage: sdlcStageEnum("stage").notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    description: text("description"),
    isRequired: boolean("is_required").notNull().default(true),
    autoAdvance: boolean("auto_advance").notNull().default(false),
    slaHours: integer("sla_hours"),
    requiredApprovers: integer("required_approvers").notNull().default(1),
    approverRoles: jsonb("approver_roles").$type<string[]>(),
    checklistTemplate: jsonb("checklist_template").$type<
      Array<{ item: string; required: boolean; description?: string }>
    >(),
    automatedChecks: jsonb("automated_checks").$type<
      Array<{
        type: "pii_scan" | "security_scan" | "unit_tests" | "integration_tests" | "code_quality" | "performance";
        enabled: boolean;
        blockOnFailure: boolean;
      }>
    >(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    configIdx: uniqueIndex("stage_config_idx").on(
      table.serviceGroup,
      table.country,
      table.stage
    ),
  })
);

// ─── AUDIT TRAIL (immutable, shared across all modules) ──
export const auditTrail = pgTable(
  "audit_trail",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    actorName: varchar("actor_name", { length: 255 }).notNull(),
    actorRole: varchar("actor_role", { length: 100 }),
    actorIp: varchar("actor_ip", { length: 45 }),
    previousValues: jsonb("previous_values").$type<Record<string, any>>(),
    newValues: jsonb("new_values").$type<Record<string, any>>(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_actor_idx").on(table.actorName),
    actionIdx: index("audit_action_idx").on(table.action),
    timeIdx: index("audit_time_idx").on(table.createdAt),
  })
);
