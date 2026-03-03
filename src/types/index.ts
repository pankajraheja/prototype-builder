// ═══════════════════════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════════════════════

export type DataClassification = "public" | "internal" | "confidential" | "restricted";
export type ServiceGroup = "advisory" | "tax" | "audit" | "consulting";
export type Environment = "development" | "staging" | "production";
export type AssetOrigin = "prototype_builder" | "no_code_builder" | "low_code_builder" | "pro_code_builder" | "external_import" | "intake";
export type SDLCStage = "draft" | "submitted" | "intake_review" | "peer_review" | "testing" | "security_scan" | "certified" | "production" | "retired";
export type ReviewDecision = "approved" | "rejected" | "changes_requested" | "escalated";

// ═══════════════════════════════════════════════════════════
// MODULE 1: PROTOTYPE BUILDER
// ═══════════════════════════════════════════════════════════

export interface ElementProps {
  [key: string]: any;
}

export interface ScreenElement {
  id: string;
  type: string;
  label: string;
  sortOrder: number;
  visible: boolean;
  locked: boolean;
  props: ElementProps;
}

export interface ElementTemplate {
  type: string;
  label: string;
  category: string;
  icon: string;
  description: string;
  defaultProps: ElementProps;
}

export interface Screen {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  status: "draft" | "active" | "archived";
  elements: ScreenElement[];
  settings?: {
    width?: number;
    backgroundColor?: string;
    padding?: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  thumbnail?: string;
  status: "draft" | "active" | "archived";
  createdBy?: string;
  settings?: {
    theme?: "light" | "dark";
    primaryColor?: string;
    fontFamily?: string;
    viewport?: "desktop" | "tablet" | "mobile";
  };
  screens: Screen[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    action?: string;
    targetElementId?: string;
    targetElementType?: string;
    changes?: Record<string, any>;
    tokensUsed?: number;
    latencyMs?: number;
  };
  createdAt: string;
}

export interface AIEditCommand {
  action: "add" | "remove" | "update" | "move" | "duplicate" | "theme" | "regenerate" | "noop";
  targetId?: string;
  elementType?: string;
  insertAfter?: string;
  properties?: Record<string, any>;
  direction?: "up" | "down";
  explanation: string;
}

export interface ScreenVersion {
  id: string;
  screenId: string;
  versionNumber: number;
  label?: string;
  snapshot: {
    elements: Omit<ScreenElement, "id">[];
    settings?: Record<string, any>;
  };
  createdBy?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════
// BRIDGE: ASSET SUBMISSIONS
// ═══════════════════════════════════════════════════════════

export interface SubmissionFormData {
  // Basic info
  name: string;
  description?: string;
  assetType: string;
  projectName: string;

  // Governance
  dataClassification: DataClassification;
  serviceGroup: ServiceGroup;
  country: string;
  usesPii: boolean;
  piiDetails?: string;
  usesClientData: boolean;
  estimatedUsers: string;
  targetEnvironment: Environment;
  priority: "low" | "medium" | "high" | "critical";

  // Compliance
  complianceAnswers?: {
    handlesFinancialData?: boolean;
    requiresAuditTrail?: boolean;
    crossBorderDataTransfer?: boolean;
    thirdPartyIntegrations?: string[];
    retentionPeriod?: string;
    gdprApplicable?: boolean;
    regulatoryScope?: string[];
  };

  // External deps
  externalDependencies?: {
    apis?: string[];
    models?: string[];
    dataSources?: string[];
  };

  tags?: string[];
}

export interface AssetSubmission extends SubmissionFormData {
  id: string;
  origin: AssetOrigin;
  sourceId?: string;
  sourceScreenId?: string;
  sourceVersionId?: string;
  sourceUrl?: string;
  submittedBy: string;
  submittedAt: string;
  currentStage: SDLCStage;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════
// MODULE 2: SDLC PIPELINE
// ═══════════════════════════════════════════════════════════

export interface PipelineEntry {
  id: string;
  submissionId: string;
  stage: SDLCStage;
  enteredAt: string;
  exitedAt?: string;
  durationSeconds?: number;
  assignedTo?: string;
  assignedRole?: string;
  outcome?: ReviewDecision;
  notes?: string;
  automatedResults?: {
    testsRun?: number;
    testsPassed?: number;
    testsFailed?: number;
    securityIssues?: Array<{
      severity: "critical" | "high" | "medium" | "low";
      description: string;
      resolved: boolean;
    }>;
    piiScanResult?: "clean" | "flagged";
    codeQualityScore?: number;
  };
}

export interface SDLCReview {
  id: string;
  submissionId: string;
  pipelineEntryId: string;
  reviewerName: string;
  reviewerRole?: string;
  decision: ReviewDecision;
  comments?: string;
  checklist?: Array<{ item: string; checked: boolean; note?: string }>;
  createdAt: string;
}

export interface StageConfig {
  id: string;
  serviceGroup: ServiceGroup;
  country: string;
  stage: SDLCStage;
  label: string;
  description?: string;
  isRequired: boolean;
  autoAdvance: boolean;
  slaHours?: number;
  requiredApprovers: number;
  approverRoles?: string[];
  checklistTemplate?: Array<{ item: string; required: boolean; description?: string }>;
  automatedChecks?: Array<{
    type: string;
    enabled: boolean;
    blockOnFailure: boolean;
  }>;
  sortOrder: number;
  isActive: boolean;
}

// ─── API ─────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
