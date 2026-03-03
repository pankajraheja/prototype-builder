# 🔧 Prototype Builder — AgentForge Platform Module

AI-powered chatbot screen builder with surgical edits, **connected to a shared SDLC pipeline** for scaling prototypes to production.

---

## Product Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SHARED POSTGRESQL                              │
│                                                                         │
│  ┌─────────────┐   ┌───────────────────┐   ┌────────────────────────┐  │
│  │  Prototype   │   │  asset_submissions │   │     SDLC Pipeline      │  │
│  │  Builder     │──▶│  (THE BRIDGE)      │──▶│  sdlc_pipeline         │  │
│  │             │   │                     │   │  sdlc_reviews          │  │
│  │  projects    │   │  origin: enum      │   │  sdlc_stage_configs    │  │
│  │  screens     │   │  source_id: FK     │   │                        │  │
│  │  elements    │   │  data_class: enum  │   │  Runs independently    │  │
│  │  versions    │   │  service_group     │   │  Reads submissions     │  │
│  │  chat_msgs   │   │  uses_pii: bool    │   │  Advances stages       │  │
│  └─────────────┘   │  compliance: json   │   └────────────────────────┘  │
│                     └───────────────────┘                                │
│  ┌─────────────┐            ▲               ┌────────────────────────┐  │
│  │  No-Code     │────────────┤               │     audit_trail        │  │
│  │  Builder     │            │               │  (shared, immutable)   │  │
│  └─────────────┘            │               └────────────────────────┘  │
│  ┌─────────────┐            │                                           │
│  │  Future      │────────────┘                                           │
│  │  Intake      │                                                        │
│  └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Bridge Pattern

**`asset_submissions`** is the single table that decouples builders from governance:

- **Any origin module** (prototype builder, no-code, low-code, pro-code, future intake) writes one row here
- **SDLC pipeline** reads from here and runs independently
- **Polymorphic source refs** (`source_id`, `source_screen_id`, `source_version_id`) link back to the originating module without hard coupling
- **Non-functional metadata** (data classification, PII, service group, compliance) is collected once at submission time

This means:
1. Prototype Builder **doesn't know** about SDLC stages
2. SDLC **doesn't know** about screens or elements
3. Future Intake module just writes to the same `asset_submissions` table
4. Each module can run, deploy, and scale independently

---

## Quick Start

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE prototype_builder;"

# 2. Configure
cp .env.example .env
# Edit .env → set DATABASE_URL

# 3. One-command setup
npm run setup    # install → push schema → seed demo data

# 4. Open
# http://localhost:3000
```

---

## Database Schema (12 tables)

### Prototype Builder (6 tables)
| Table | Purpose |
|-------|---------|
| `projects` | Top-level project container |
| `screens` | Pages within a project |
| `elements` | UI blocks with type + props JSON |
| `screen_versions` | Snapshot history |
| `chat_messages` | AI conversation history per screen |
| `element_templates` | Reusable component library |

### Bridge (1 table)
| Table | Purpose |
|-------|---------|
| `asset_submissions` | **The handoff point.** Any module writes here to enter SDLC. |

### SDLC Pipeline (3 tables)
| Table | Purpose |
|-------|---------|
| `sdlc_pipeline` | Stage-by-stage tracking per submission |
| `sdlc_reviews` | Individual review decisions with checklists |
| `sdlc_stage_configs` | Configurable pipeline per service group × country |

### Shared (1 table)
| Table | Purpose |
|-------|---------|
| `audit_trail` | Immutable log across all modules |

### Shared Enums
| Enum | Values |
|------|--------|
| `data_classification` | public, internal, confidential, restricted |
| `service_group` | advisory, tax, audit, consulting |
| `environment` | development, staging, production |
| `sdlc_stage` | draft → submitted → intake_review → peer_review → testing → security_scan → certified → production → retired |
| `asset_origin` | prototype_builder, no_code_builder, low_code_builder, pro_code_builder, external_import, intake |
| `review_decision` | approved, rejected, changes_requested, escalated |

---

## API Routes

### Prototype Builder
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET, POST | List/create projects |
| `/api/screens` | GET, POST | Get screen with elements, save elements, create snapshots |
| `/api/ai/chat` | POST | Process natural language edit commands |

### Bridge
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/submissions` | GET, POST | **Submit an asset to the SDLC pipeline.** Any module calls this. |

### SDLC (ready for independent module)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sdlc/pipeline` | GET, POST | Query pipeline state, advance stages, assign reviewers |
| `/api/sdlc/reviews` | GET, POST | Record review decisions with checklists |
| `/api/sdlc/configs` | GET | Read stage configurations per service group |

---

## Submit to Scale Flow

When a user clicks **🚀 Submit to Scale** in the Prototype Builder:

```
1. User clicks "Submit to Scale" in toolbar
                    │
2. Modal collects:  ▼
   ┌────────────────────────────┐
   │  Step 1: Basic Info        │  Name, project, type, priority
   │  Step 2: Governance        │  Data classification, service group,
   │                            │  country, PII declaration, client data
   │  Step 3: Compliance        │  Financial data, audit trail, GDPR,
   │                            │  cross-border, regulatory scope
   │  Step 4: Review & Submit   │  Summary → confirm
   └────────────────────────────┘
                    │
3. POST /api/submissions
   ├── Pins current screen version (sourceVersionId)
   ├── Creates asset_submissions row
   ├── Creates first sdlc_pipeline entry (stage: submitted)
   └── Writes audit_trail entry
                    │
4. SDLC Pipeline takes over (independent module)
   submitted → intake_review → peer_review → testing → security_scan → certified → production
```

---

## Submission Modal Fields

| Step | Field | Required | Type |
|------|-------|----------|------|
| **Basic** | Asset Name | ✅ | text |
| | Description | | textarea |
| | Project Name | ✅ | text |
| | Asset Type | | select (template, agent, workflow, api, dashboard) |
| | Priority | | low / medium / high / critical |
| **Governance** | Data Classification | ✅ | public / internal / confidential / restricted |
| | Service Group | ✅ | advisory / tax / audit / consulting |
| | Country | ✅ | GLOBAL + 10 countries |
| | Uses PII? | ✅ | toggle + detail text |
| | Uses Client Data? | | toggle |
| | Target Environment | | dev / staging / production |
| | Estimated Users | | < 50 / 50-200 / 200-1K / 1K+ |
| **Compliance** | Handles Financial Data? | | toggle |
| | Requires Audit Trail? | | toggle |
| | Cross-Border Transfer? | | toggle |
| | GDPR Applicable? | | toggle |
| | Regulatory Scope | | multi-select (SOC2, GDPR, HIPAA, PCAOB, SOX, CCPA, DORA) |
| | Retention Period | | select |

---

## SDLC Stage Configs (seeded)

Each service group gets 5 configurable stages with:
- **SLA hours** (24h for intake, 72h for peer review, etc.)
- **Required approvers** and **approver roles**
- **Checklist templates** (items + required flag)
- **Automated checks** (PII scan, security scan, unit tests, etc.)
- **Auto-advance** flag (skip stage if automated checks pass)

The SDLC module (when built independently) reads these configs from `sdlc_stage_configs` to determine what happens at each stage.

---

## Project Structure

```
prototype-builder/
├── drizzle/
│   └── schema.ts                    # 12 tables + 6 enums (shared foundation)
├── scripts/
│   └── seed.ts                      # Seeds all tables including SDLC configs
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── projects/route.ts    # Project CRUD
│   │   │   ├── screens/route.ts     # Screen + elements + versions
│   │   │   ├── ai/chat/route.ts     # NL command processing
│   │   │   ├── submissions/route.ts # ★ THE BRIDGE — submit to SDLC
│   │   │   └── sdlc/
│   │   │       ├── pipeline/route.ts  # Stage tracking
│   │   │       ├── reviews/route.ts   # Review decisions
│   │   │       └── configs/route.ts   # Stage configurations
│   │   ├── builder/[id]/page.tsx    # Main builder page
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Project dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── builder/
│   │   │   ├── Toolbar.tsx          # ★ Has "Submit to Scale" button
│   │   │   ├── SubmitModal.tsx      # ★ 4-step submission form
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ComponentLibrary.tsx
│   │   │   └── PropertyPanel.tsx
│   │   └── elements/
│   │       └── ElementRenderer.tsx
│   ├── lib/
│   │   ├── db.ts                    # Postgres + cache
│   │   ├── store.ts                 # Zustand state
│   │   ├── ai-engine.ts            # NL parser + LLM
│   │   └── templates.ts            # 13 element templates
│   └── types/
│       └── index.ts                # All types (builder + bridge + SDLC)
├── .env.example
├── drizzle.config.ts
├── package.json (33 files, ~4,900 lines)
└── ...configs
```

---

## Future Module Integration

### SDLC App (next to build)
Reads from the same `asset_submissions` + `sdlc_pipeline` + `sdlc_reviews` tables.
Its own Next.js app with its own UI. No dependency on prototype builder code.

### Intake Module (future)
Writes to `asset_submissions` with `origin: 'intake'`.
Same submission schema, different source.

### Platform Gateway (future)
Reads `asset_submissions` where `current_stage = 'certified'` or `'production'`
to populate the Asset Catalog / Marketplace.

---

## Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server on :3000 |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database (12 tables) |
| `npm run db:seed` | Seed demo data (all modules) |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run setup` | Install + push + seed |
