import { AIEditCommand, ScreenElement } from "@/types";
import { ELEMENT_TEMPLATES } from "./templates";

// ─── Conversation History Type ──────────────────────────
export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Color Map ───────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", purple: "#8b5cf6",
  orange: "#f97316", yellow: "#f59e0b", pink: "#ec4899", indigo: "#6366f1",
  black: "#0f172a", white: "#ffffff", gray: "#64748b", cyan: "#06b6d4",
  teal: "#14b8a6", violet: "#8b5cf6", emerald: "#10b981", rose: "#f43f5e",
  slate: "#475569", amber: "#f59e0b", lime: "#84cc16", sky: "#0ea5e9",
};

const BG_MAP: Record<string, string> = {
  dark: "#0f172a", light: "#f8f9fb", white: "#ffffff", black: "#0f172a",
  transparent: "transparent", ...COLOR_MAP,
};

// ─── Check if any LLM API key is actually configured ────
function isRealKey(val: string | undefined): boolean {
  if (!val) return false;
  return !val.includes("your-") && !val.includes("your_") && val.length > 10;
}

export function hasLLMKey(): boolean {
  return !!(
    (isRealKey(process.env.AZURE_OPENAI_ENDPOINT) && isRealKey(process.env.AZURE_OPENAI_API_KEY)) ||
    isRealKey(process.env.OPENAI_API_KEY) ||
    isRealKey(process.env.ANTHROPIC_API_KEY)
  );
}

// ─── Prop Schema: type → prop definitions ────────────────
const PROP_SCHEMA: Record<string, Record<string, { type: string; desc: string }>> = {
  navbar: {
    brand:  { type: "string", desc: "Brand/logo text" },
    links:  { type: "string[]", desc: "Navigation link labels" },
    btnText:{ type: "string", desc: "CTA button label" },
    bg:     { type: "color", desc: "Background color" },
    color:  { type: "color", desc: "Text color" },
    accent: { type: "color", desc: "Accent/highlight color" },
    sticky: { type: "boolean", desc: "Stick to top on scroll" },
  },
  hero: {
    title:     { type: "string", desc: "Main headline" },
    subtitle:  { type: "string", desc: "Supporting text below headline" },
    btnText:   { type: "string", desc: "CTA button label" },
    btnColor:  { type: "color", desc: "CTA button color" },
    bg:        { type: "color|gradient", desc: "Background color or CSS gradient" },
    textColor: { type: "color", desc: "Text color" },
    align:     { type: "'left'|'center'|'right'", desc: "Content alignment" },
    showImage: { type: "boolean", desc: "Show hero image/emoji" },
    imageEmoji:{ type: "emoji", desc: "Emoji displayed as hero image" },
  },
  stats: {
    items: { type: "Array<{value: string, label: string, color: color}>", desc: "Stat items" },
    bg:    { type: "color", desc: "Background color" },
  },
  cards: {
    columns: { type: "number (1-4)", desc: "Number of grid columns" },
    items:   { type: "Array<{icon: emoji, title: string, desc: string, color: color}>", desc: "Card items" },
  },
  features: {
    title:    { type: "string", desc: "Section headline" },
    subtitle: { type: "string", desc: "Section subheading" },
    items:    { type: "Array<{icon: emoji, title: string, desc: string}>", desc: "Feature items" },
    bg:       { type: "color", desc: "Background color" },
  },
  form: {
    title:    { type: "string", desc: "Form heading" },
    fields:   { type: "Array<{label: string, type: 'text'|'email'|'textarea', placeholder: string}>", desc: "Form fields" },
    btnText:  { type: "string", desc: "Submit button label" },
    btnColor: { type: "color", desc: "Submit button color" },
    bg:       { type: "color", desc: "Background color" },
  },
  cta: {
    title:     { type: "string", desc: "CTA headline" },
    subtitle:  { type: "string", desc: "CTA supporting text" },
    btnText:   { type: "string", desc: "CTA button label" },
    btnColor:  { type: "color", desc: "CTA button color" },
    bg:        { type: "color|gradient", desc: "Background color or CSS gradient" },
    textColor: { type: "color", desc: "Text color" },
  },
  testimonial: {
    quote:  { type: "string", desc: "Testimonial quote text" },
    author: { type: "string", desc: "Author name" },
    role:   { type: "string", desc: "Author title/role" },
    avatar: { type: "string", desc: "Author initials (2 chars)" },
    rating: { type: "number (1-5)", desc: "Star rating" },
    bg:     { type: "color", desc: "Background color" },
  },
  pricing: {
    items: { type: "Array<{name: string, price: string, period: string, desc: string, features: string[], color: color, featured: boolean}>", desc: "Pricing tiers" },
  },
  text: {
    content:  { type: "string", desc: "Paragraph text" },
    size:     { type: "number", desc: "Font size in px" },
    color:    { type: "color", desc: "Text color" },
    align:    { type: "'left'|'center'|'right'", desc: "Text alignment" },
    bg:       { type: "color", desc: "Background color" },
    maxWidth: { type: "number", desc: "Max width in px" },
    padding:  { type: "number", desc: "Padding in px" },
  },
  divider: {
    style:   { type: "'solid'|'dashed'|'dotted'", desc: "Line style" },
    color:   { type: "color", desc: "Line color" },
    spacing: { type: "number", desc: "Vertical spacing in px" },
  },
  image: {
    width:        { type: "string|number", desc: "Image width (e.g. '100%' or 400)" },
    height:       { type: "number", desc: "Image height in px" },
    bg:           { type: "color", desc: "Placeholder background" },
    label:        { type: "string", desc: "Alt text / placeholder label" },
    borderRadius: { type: "number", desc: "Corner radius in px" },
  },
  footer: {
    brand:     { type: "string", desc: "Brand name" },
    tagline:   { type: "string", desc: "Brand tagline" },
    columns:   { type: "Array<{title: string, links: string[]}>", desc: "Footer link columns" },
    copyright: { type: "string", desc: "Copyright notice" },
    bg:        { type: "color", desc: "Background color" },
    color:     { type: "color", desc: "Text color" },
  },
};

// ─── Build human-readable element description ────────────
function describeElement(e: ScreenElement, i: number, total: number): string {
  const pos = i === 0 ? "top" : i === total - 1 ? "bottom" : `#${i}`;
  const p = e.props;
  const highlights: string[] = [];

  if (p.brand) highlights.push(`brand '${p.brand}'`);
  if (p.title) highlights.push(`title '${p.title}'`);
  if (p.quote) highlights.push(`quote '${p.quote.slice(0, 40)}...'`);
  if (p.content) highlights.push(`text '${String(p.content).slice(0, 40)}...'`);
  if (p.btnText) highlights.push(`button '${p.btnText}'`);
  if (p.imageEmoji) highlights.push(`image ${p.imageEmoji}`);
  if (p.accent) highlights.push(`accent ${p.accent}`);
  if (p.btnColor) highlights.push(`btnColor ${p.btnColor}`);
  if (p.bg && p.bg !== "transparent" && p.bg !== "#ffffff") highlights.push(`bg ${p.bg}`);
  if (p.items && Array.isArray(p.items)) highlights.push(`${p.items.length} items`);
  if (p.columns && typeof p.columns === "number") highlights.push(`${p.columns} columns`);

  const desc = highlights.length > 0 ? ` with ${highlights.join(", ")}` : "";
  return `Element ${i} (${pos}): ${e.type} "${e.label}"${desc}`;
}

// ─── Build the element context for the LLM ──────────────
function buildElementContext(elements: ScreenElement[]): string {
  const descriptions = elements
    .map((e, i) => describeElement(e, i, elements.length))
    .join("\n");

  const detailed = JSON.stringify(
    elements.map((e, i) => ({
      id: e.id,
      index: i,
      type: e.type,
      label: e.label,
      props: e.props,
    })),
    null,
    2
  );

  return `${descriptions}\n\nFull element data:\n${detailed}`;
}

// ─── Condensed screen state summary for context ──────────
function buildScreenStateSummary(elements: ScreenElement[]): string {
  if (elements.length === 0) return "The screen is currently empty.";

  const lines = elements.map((e, i) => {
    const highlights: string[] = [];
    if (e.props.brand) highlights.push(`brand="${e.props.brand}"`);
    if (e.props.title) highlights.push(`title="${e.props.title}"`);
    if (e.props.subtitle) highlights.push(`subtitle="${String(e.props.subtitle).slice(0, 50)}"`);
    if (e.props.btnText) highlights.push(`btn="${e.props.btnText}"`);
    if (e.props.items && Array.isArray(e.props.items)) highlights.push(`${e.props.items.length} items`);
    if (e.props.fields && Array.isArray(e.props.fields)) highlights.push(`${e.props.fields.length} fields`);
    if (e.props.columns && Array.isArray(e.props.columns)) highlights.push(`${e.props.columns.length} columns`);
    const desc = highlights.length > 0 ? ` (${highlights.join(", ")})` : "";
    return `  ${i}. ${e.type} "${e.label}"${desc}`;
  });

  return `Current screen has ${elements.length} elements (top→bottom):\n${lines.join("\n")}`;
}

// ─── System Prompt for LLM ───────────────────────────────
function buildSystemPrompt(elements: ScreenElement[]): string {
  const templateList = Object.entries(ELEMENT_TEMPLATES)
    .map(([key, t]) => {
      const schema = PROP_SCHEMA[key];
      const propsDoc = schema
        ? Object.entries(schema)
            .map(([prop, def]) => `      ${prop} (${def.type}): ${def.desc}`)
            .join("\n")
        : "      (see defaultProps)";
      return `  "${key}" — ${t.description}\n    Props:\n${propsDoc}\n    Defaults: ${JSON.stringify(t.defaultProps)}`;
    })
    .join("\n\n");

  return `You are a screen-builder AI. The user describes changes to a landing page and you return an array of JSON edit commands.

═══ AVAILABLE ELEMENT TEMPLATES & PROP SCHEMAS ═══
${templateList}

═══ CURRENT SCREEN (top → bottom) ═══
${buildElementContext(elements)}

═══ COMMAND SCHEMA ═══
Each command is a JSON object:
{
  "action": "add" | "remove" | "update" | "move" | "duplicate" | "theme" | "regenerate" | "noop",
  "targetId": "<element id>  — required for update/remove/move/duplicate",
  "elementType": "<template key> — required for add",
  "insertAfter": "<element id>  — optional, for add; where to place it",
  "properties": { ... }         — props to set/override (for add: fully populated props)",
  "direction": "up" | "down"    — for move",
  "explanation": "<short human-readable summary of this single change>"
}

Always return a JSON array of commands, e.g. [cmd1, cmd2, ...].
For single changes, return an array of one. For compound requests, return multiple.

═══ RULES ═══

1. RESOLVING TARGETS (selectedId is optional — infer when possible)
   a. By type name: "the navbar" / "the hero" / "the footer" → match element by type.
   b. By description alias:
      - "the header", "navigation", "nav bar", "top bar" → type: navbar
      - "the big text at the top", "hero", "banner", "splash" → type: hero
      - "the numbers section", "metrics", "counters" → type: stats
      - "the grid", "the cards", "card section" → type: cards
      - "the bottom", "footer", "page footer" → type: footer
      - "the form", "contact section", "input section" → type: form
      - "the quote", "review", "testimonial" → type: testimonial
      - "the pricing", "plans", "pricing table" → type: pricing
      - "call to action", "cta banner" → type: cta
      - "features", "feature list" → type: features
   c. By position:
      - "first section", "top section" → index 0 (lowest sortOrder)
      - "last section", "bottom section" → highest index
      - "second section" → index 1, "third section" → index 2, etc.
   d. By visual appearance:
      - "the dark section" → find element with dark bg (#0f172a, #1e1b4b, etc.)
      - "the purple button" → find element with purple btnColor/accent
      - "the section with the robot" → find element whose props contain "🤖"
      - "the blue section" → find element with a blue bg/accent/btnColor
   e. By content:
      - "the section that says 'Welcome'" → find element with title/content matching
      - "the card about Analytics" → find cards element whose items contain that title
   f. Pronoun resolution:
      - "it", "this", "that" with a selectedId provided → use the selected element
      - "it", "this" without selectedId → use the most recently referenced or most obvious element
   g. When no element is selected and the user says "change X" or "update X":
      - Use inference from rules a–f above to find the target
      - Set targetId in the command to the inferred element's id
      - If truly ambiguous (multiple equally likely matches), use "noop" and ask for clarification

2. UPDATING NESTED ARRAYS (items, columns, links, fields)
   You can edit individual items in arrays using EITHER approach:

   a. Dot/bracket notation (preferred for single-item edits):
      - "items[0].icon": "🐦"        → change the first card's icon
      - "items[1].title": "New Title" → change the second item's title
      - "items[2].desc": "Updated"    → change the third item's description
      - "columns[0].title": "Support" → change the first footer column title
      - "items[0].features[1]": "SSO" → change the second feature of the first pricing tier
      - "links[2]": "Documentation"   → change the third navbar link

   b. Full array replacement (for adding/removing items, or changing many items):
      - Return the complete "items": [...] array with the changes applied
      - Use this when adding a new item, removing an item, or reordering

   Index reference:
      - "first" / "1st" = [0], "second" / "2nd" = [1], "third" / "3rd" = [2]
      - "last" = [length-1]
      - By content: "the card about Analytics" → find the index of the item whose title matches

   Examples:
      - "change the first card icon to a bird" → { "items[0].icon": "🐦" }
      - "change the uptime number to 99.9%" → { "items[2].value": "99.9%" }
      - "remove the company field from the form" → return full "fields" array without that item
      - "add SSO to the starter plan" → return full "items" array with updated features for that tier
      - "add a Support link to the Resources column" → return full "columns" array with the link added
      - "change Docs to Documentation in the navbar" → { "links[3]": "Documentation" }

3. COMPOUND COMMANDS
   - "Add a testimonial section after the stats and make the cards 4 columns" → two commands: one add, one update.
   - "Make the hero dark and change its title" → two update commands on the same target.
   - Process them in logical order (adds before updates that reference the new element).

4. COLORS
   - When the user says a color name, convert to hex: ${JSON.stringify(COLOR_MAP)}.
   - "darker" means shift toward #0f172a. "lighter" means shift toward #ffffff. Compute an appropriate hex.
   - When setting a dark background, also set textColor to "#ffffff" if the element has a textColor prop.
   - When setting a light background, also set textColor to a dark color like "#0f172a" if applicable.

5. EMOJI RESOLUTION
   - When the user mentions an icon by name, output the actual Unicode emoji character in the property value.
   - Common mappings: "bird" → "🐦", "rocket" → "🚀", "fire" → "🔥", "star" → "⭐", "heart" → "❤️", "lightning" → "⚡", "shield" → "🛡️", "globe" → "🌐", "lock" → "🔒", "chart" → "📊", "robot" → "🤖", "sparkle" → "✨", "check" → "✅", "warning" → "⚠️", "money" → "💰", "brain" → "🧠", "gear" → "⚙️", "cloud" → "☁️", "sun" → "☀️", "moon" → "🌙", "trophy" → "🏆", "target" → "🎯", "paint" → "🎨", "music" → "🎵", "camera" → "📷", "phone" → "📱", "mail" → "📧", "book" → "📚", "lamp" → "💡", "tree" → "🌳", "wave" → "🌊", "diamond" → "💎", "crown" → "👑", "eye" → "👁️", "hand" → "👋", "thumbs up" → "👍", "clap" → "👏", "party" → "🎉", "gift" → "🎁", "link" → "🔗", "key" → "🔑", "bell" → "🔔", "pin" → "📌", "flag" → "🚩", "tools" → "🛠️", "atom" → "⚛️", "dna" → "🧬", "microscope" → "🔬", "satellite" → "🛰️", "airplane" → "✈️", "car" → "🚗", "house" → "🏠", "hospital" → "🏥", "school" → "🏫", "bank" → "🏦", "factory" → "🏭".
   - For icons not in this list, use your best judgment to pick the right emoji.

6. ADDING ELEMENTS
   - When adding, if the user says "after the stats" or "below the hero", set insertAfter to that element's id.
   - If no position specified and a footer exists, insert before the footer.
   - elementType must be one of the template keys listed above.
   - IMPORTANT: When adding elements, ALWAYS include fully populated "properties" with realistic content.
     Do NOT add blank/default elements. For example:
     - "Add a pricing section with 3 tiers" → include complete properties with 3 tier items, each with name, price, period, features, etc.
     - "Add a testimonial" → include a realistic quote, author name, role, rating — not defaults.
     - "Add a stats section for sales metrics" → include 4 stat items with context-appropriate values and labels.
     - "Add a form for job applications" → include fields like Name, Email, Resume Upload, Cover Letter (textarea), Position (text), etc.
   - Match the content to the context of the existing page when possible (read the navbar brand, hero title, etc. for context).

7. REGENERATION (full screen rebuild)
   - If the user says "start over", "rebuild this as a...", "scrap this and make a...", "redesign as...", "redo this as...", "convert this to...", "change this to a...", or any request that implies replacing the entire screen with a new design, return a single command:
     { "action": "regenerate", "explanation": "Rebuilding screen as ...", "properties": { "prompt": "<the regeneration description>" } }
   - The frontend will save the current version and call the generate endpoint with the new prompt.
   - Only use "regenerate" when the user clearly wants to replace EVERYTHING. Requests like "add a section" or "change the hero" are NOT regeneration.

8. NOOP
   - Use "noop" only when the instruction is truly unintelligible. Include an explanation suggesting what the user can do.

9. CONVERSATION CONTEXT
   - You may receive prior conversation turns. Use them to understand what the user is referring to.
   - "it", "that", "the one I just added" → refer back to elements mentioned in earlier turns.
   - If the user says "actually" or "instead", they are correcting their previous instruction — apply the new instruction to the same target.
   - The screen state summary reflects the CURRENT state (including changes from prior turns, and changes made outside chat like drag-and-drop or property panel edits).

10. OUTPUT FORMAT
   - Return ONLY a raw JSON array. No markdown fences, no explanation text outside the JSON.
   - Every command MUST have an "explanation" field.`;
}

// ─── LLM-based parsing ──────────────────────────────────
async function parseChatWithLLM(
  message: string,
  elements: ScreenElement[],
  selectedId: string | null,
  conversationHistory: ChatHistoryMessage[] = []
): Promise<AIEditCommand[]> {
  const systemPrompt = buildSystemPrompt(elements);
  const userPrompt = `Selected element: ${selectedId || "none"}\nUser instruction: "${message}"`;

  // Build messages: screen state + history + current
  const allMessages: Array<{ role: string; content: string }> = [];
  const screenSummary = buildScreenStateSummary(elements);
  allMessages.push({ role: "user", content: `[Screen state]\n${screenSummary}` });
  allMessages.push({ role: "assistant", content: "Understood. I can see the current screen state. What would you like to change?" });
  for (const turn of conversationHistory) {
    allMessages.push({ role: turn.role, content: turn.content });
  }
  allMessages.push({ role: "user", content: userPrompt });

  // Try Azure OpenAI first
  if (isRealKey(process.env.AZURE_OPENAI_ENDPOINT) && isRealKey(process.env.AZURE_OPENAI_API_KEY)) {
    try {
      const res = await fetch(
        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-01`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": process.env.AZURE_OPENAI_API_KEY!,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              ...allMessages,
            ],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        }
      );
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        const parsed = extractJSON(text);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn("Azure OpenAI failed, trying next provider:", e);
    }
  }

  // Try OpenAI direct
  if (isRealKey(process.env.OPENAI_API_KEY)) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...allMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) {
        const parsed = extractJSON(text);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn("OpenAI failed, trying next provider:", e);
    }
  }

  // Try Anthropic
  if (isRealKey(process.env.ANTHROPIC_API_KEY)) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: systemPrompt,
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim();
      if (text) {
        const parsed = extractJSON(text);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn("Anthropic failed:", e);
    }
  }

  throw new Error("All LLM providers failed");
}

// ─── Extract JSON array from LLM response ───────────────
function extractJSON(text: string): AIEditCommand[] | null {
  try {
    const parsed = JSON.parse(text);
    // Handle { commands: [...] } wrapper from json_object mode
    if (parsed && Array.isArray(parsed.commands)) return parsed.commands;
    if (Array.isArray(parsed)) return parsed;
    // Single object → wrap in array
    if (parsed && typeof parsed === "object" && parsed.action) return [parsed];
    return null;
  } catch {
    // Try to find JSON array or object in the text
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch { /* fall through */ }
    }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        const obj = JSON.parse(objMatch[0]);
        if (obj.action) return [obj];
      } catch { /* fall through */ }
    }
    return null;
  }
}

// ─── Streaming Helpers (per-provider) ────────────────────

function parseSSELines(
  buffer: string,
  onLine: (payload: string) => void
): string {
  const lines = buffer.split("\n");
  const remainder = lines.pop() || "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
      onLine(trimmed.slice(6));
    }
  }
  return remainder;
}

async function streamAzure(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, index: number) => void
): Promise<string> {
  const res = await fetch(
    `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-01`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_OPENAI_API_KEY!,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: true,
      }),
    }
  );
  if (!res.ok) throw new Error(`Azure returned ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let tokenIndex = 0;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = parseSSELines(buffer, (payload) => {
      try {
        const data = JSON.parse(payload);
        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          accumulated += content;
          onToken(content, tokenIndex++);
        }
      } catch { /* ignore malformed */ }
    });
  }
  return accumulated;
}

async function streamOpenAI(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, index: number) => void
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: "json_object" as const },
    stream: true,
  });

  let accumulated = "";
  let tokenIndex = 0;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      accumulated += content;
      onToken(content, tokenIndex++);
    }
  }
  return accumulated;
}

async function streamAnthropic(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  onToken: (token: string, index: number) => void
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic returned ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let tokenIndex = 0;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = parseSSELines(buffer, (payload) => {
      try {
        const data = JSON.parse(payload);
        if (data.type === "content_block_delta") {
          const text = data.delta?.text;
          if (text) {
            accumulated += text;
            onToken(text, tokenIndex++);
          }
        }
      } catch { /* ignore */ }
    });
  }
  return accumulated;
}

// ─── Streaming LLM Orchestrator ──────────────────────────
export async function streamChatWithLLM(
  message: string,
  elements: ScreenElement[],
  selectedId: string | null,
  onToken: (token: string, index: number) => void,
  conversationHistory: ChatHistoryMessage[] = []
): Promise<AIEditCommand[]> {
  const systemPrompt = buildSystemPrompt(elements);

  // Build messages array: screen state summary + conversation history + current message
  const messages: Array<{ role: string; content: string }> = [];

  // Inject condensed screen state as a system-like context message
  const screenSummary = buildScreenStateSummary(elements);
  messages.push({
    role: "user",
    content: `[Screen state]\n${screenSummary}`,
  });
  messages.push({
    role: "assistant",
    content: "Understood. I can see the current screen state. What would you like to change?",
  });

  // Append conversation history (last N turns from DB)
  for (const turn of conversationHistory) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // Append the current user message
  const userPrompt = `Selected element: ${selectedId || "none"}\nUser instruction: "${message}"`;
  messages.push({ role: "user", content: userPrompt });

  let accumulated: string | null = null;

  // Try Azure OpenAI first
  if (isRealKey(process.env.AZURE_OPENAI_ENDPOINT) && isRealKey(process.env.AZURE_OPENAI_API_KEY)) {
    try {
      accumulated = await streamAzure(systemPrompt, messages, onToken);
    } catch (e) {
      console.warn("Azure OpenAI streaming failed, trying next provider:", e);
    }
  }

  // Try OpenAI direct
  if (accumulated === null && isRealKey(process.env.OPENAI_API_KEY)) {
    try {
      accumulated = await streamOpenAI(systemPrompt, messages, onToken);
    } catch (e) {
      console.warn("OpenAI streaming failed, trying next provider:", e);
    }
  }

  // Try Anthropic
  if (accumulated === null && isRealKey(process.env.ANTHROPIC_API_KEY)) {
    try {
      accumulated = await streamAnthropic(systemPrompt, messages, onToken);
    } catch (e) {
      console.warn("Anthropic streaming failed:", e);
    }
  }

  if (accumulated === null) {
    throw new Error("All LLM providers failed");
  }

  const parsed = extractJSON(accumulated.trim());
  if (!parsed) {
    throw new Error("Failed to parse LLM response as JSON");
  }
  return parsed;
}

// ─── Local Rule-Based Parser (fallback when no LLM) ─────
export function parseChatLocally(
  message: string,
  elements: ScreenElement[],
  selectedId: string | null
): AIEditCommand[] {
  const lower = message.toLowerCase().trim();
  const selected = elements.find((e) => e.id === selectedId);

  // ── REGENERATE (full rebuild) ──
  const regenMatch = lower.match(
    /(?:start over|rebuild|scrap|redesign|redo|convert this|change this to)\s*(?:as|to|into|with)?\s*(?:a\s+)?(.+)?/
  );
  if (regenMatch && elements.length > 0) {
    const regenPrompt = regenMatch[1]?.trim() || message;
    return [{
      action: "regenerate",
      explanation: `Rebuilding screen: ${regenPrompt}`,
      properties: { prompt: regenPrompt },
    }];
  }

  // ── ADD ELEMENT ──
  const addMatch = lower.match(
    /(?:add|insert|create|put|place)\s+(?:a\s+)?(?:new\s+)?(\w+)/
  );
  if (addMatch) {
    const key = addMatch[1].replace(/s$/, "").replace(/section$/, "");
    const templateKey = Object.keys(ELEMENT_TEMPLATES).find(
      (k) => k.includes(key) || key.includes(k)
    );
    if (templateKey) {
      return [{
        action: "add",
        elementType: templateKey,
        insertAfter: selectedId || undefined,
        explanation: `Added a ${ELEMENT_TEMPLATES[templateKey].label} section`,
      }];
    }
    return [{
      action: "noop",
      explanation: `I don't have a "${addMatch[1]}" template. Available: ${Object.keys(ELEMENT_TEMPLATES).join(", ")}`,
    }];
  }

  // ── REMOVE / DELETE ──
  if ((lower.includes("remove") || lower.includes("delete")) && selectedId) {
    return [{
      action: "remove",
      targetId: selectedId,
      explanation: `Removed the ${selected?.label || "selected"} section`,
    }];
  }

  // ── MOVE ──
  if (lower.includes("move up") && selectedId) {
    return [{ action: "move", targetId: selectedId, direction: "up", explanation: `Moved ${selected?.label} up` }];
  }
  if (lower.includes("move down") && selectedId) {
    return [{ action: "move", targetId: selectedId, direction: "down", explanation: `Moved ${selected?.label} down` }];
  }

  // ── DUPLICATE ──
  if ((lower.includes("duplicate") || lower.includes("clone") || lower.includes("copy")) && selectedId) {
    return [{ action: "duplicate", targetId: selectedId, explanation: `Duplicated ${selected?.label}` }];
  }

  // ── PROPERTY UPDATES (requires selection) ──
  if (selectedId && selected) {
    const props: Record<string, any> = {};
    let desc = "";

    // Title
    const titleMatch = message.match(
      /(?:change|set|update|make)\s+(?:the\s+)?(?:title|heading|headline)\s+(?:to\s+)?["']?(.+?)["']?$/i
    );
    if (titleMatch && selected.props.title !== undefined) {
      props.title = titleMatch[1];
      desc = `Updated title to "${titleMatch[1]}"`;
    }

    // Subtitle
    const subMatch = message.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:subtitle|description|subheading|tagline)\s+(?:to\s+)?["']?(.+?)["']?$/i
    );
    if (subMatch && !desc) {
      if (selected.props.subtitle !== undefined) {
        props.subtitle = subMatch[1];
        desc = `Updated subtitle`;
      } else if (selected.props.desc !== undefined) {
        props.desc = subMatch[1];
        desc = `Updated description`;
      }
    }

    // Button text
    const btnMatch = message.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:button|btn|cta)\s+(?:text\s+)?(?:to\s+)?["']?(.+?)["']?$/i
    );
    if (btnMatch && selected.props.btnText !== undefined && !desc) {
      props.btnText = btnMatch[1];
      desc = `Button text → "${btnMatch[1]}"`;
    }

    // Button / accent color
    const colorMatch = lower.match(
      /(?:make|change|set)\s+(?:the\s+)?(?:button|btn|cta|accent)\s+(?:color\s+)?(?:to\s+)?([\w#]+)/
    );
    if (colorMatch && !desc) {
      const c = COLOR_MAP[colorMatch[1]] || (colorMatch[1].startsWith("#") ? colorMatch[1] : null);
      if (c) {
        if (selected.props.btnColor !== undefined) props.btnColor = c;
        else if (selected.props.accent !== undefined) props.accent = c;
        else if (selected.props.color !== undefined) props.color = c;
        desc = `Color → ${colorMatch[1]}`;
      }
    }

    // Background
    const bgMatch = lower.match(
      /(?:make|change|set)\s+(?:the\s+)?(?:background|bg)\s+(?:to\s+)?([\w#]+)/
    );
    if (bgMatch && !desc) {
      const c = BG_MAP[bgMatch[1]] || (bgMatch[1].startsWith("#") ? bgMatch[1] : null);
      if (c) {
        props.bg = c;
        if ((c === "#0f172a" || bgMatch[1] === "dark" || bgMatch[1] === "black") && selected.props.textColor !== undefined) {
          props.textColor = "#ffffff";
        }
        desc = `Background → ${bgMatch[1]}`;
      }
    }

    // Text / content / quote
    const textMatch = message.match(
      /(?:change|set|update)\s+(?:the\s+)?(?:text|content|quote|message|copy)\s+(?:to\s+)?["']?(.+?)["']?$/i
    );
    if (textMatch && !desc) {
      if (selected.props.content !== undefined) { props.content = textMatch[1]; desc = "Updated text content"; }
      else if (selected.props.quote !== undefined) { props.quote = textMatch[1]; desc = "Updated quote"; }
    }

    // Alignment
    const alignMatch = lower.match(/(?:align|make it)\s+(center|left|right)/);
    if (alignMatch && selected.props.align !== undefined && !desc) {
      props.align = alignMatch[1];
      desc = `Alignment → ${alignMatch[1]}`;
    }

    // Columns
    const colMatch = lower.match(/(?:set|change|make)\s+(?:to\s+)?(\d)\s*columns?/);
    if (colMatch && selected.props.columns !== undefined && !desc) {
      props.columns = parseInt(colMatch[1]);
      desc = `Columns → ${colMatch[1]}`;
    }

    if (Object.keys(props).length > 0) {
      return [{ action: "update", targetId: selectedId, properties: props, explanation: desc }];
    }

    return [{
      action: "noop",
      explanation: `I have **${selected.label}** selected but no LLM is configured for complex edits. I can handle simple edits like:\n• "Change the title to ..."\n• "Make the button green"\n• "Set background to dark"\n\nConfigure an API key (OpenAI, Azure OpenAI, or Anthropic) in .env for smarter AI editing.`,
    }];
  }

  // Nothing selected, not an add command
  return [{
    action: "noop",
    explanation: `Click a section on the preview to select it, then tell me what to change. Or say:\n• "Add a pricing section"\n• "Add a testimonial"\n• "Add features"`,
  }];
}

// ─── Main Parse Function ─────────────────────────────────
export async function parseChat(
  message: string,
  elements: ScreenElement[],
  selectedId: string | null
): Promise<AIEditCommand[]> {
  // LLM is the primary path — only fall back to local when no key is configured
  if (hasLLMKey()) {
    try {
      const commands = await parseChatWithLLM(message, elements, selectedId);
      if (commands.length > 0) return commands;
    } catch (e) {
      console.warn("LLM parsing failed, falling back to local parser:", e);
    }
  }

  return parseChatLocally(message, elements, selectedId);
}

// ─── Deep Update Props (supports dot/bracket notation) ───
function deepUpdateProps(
  currentProps: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  const result = { ...currentProps };

  for (const [key, value] of Object.entries(updates)) {
    // Check for bracket/dot notation like "items[0].icon" or "columns[1].title"
    const pathMatch = key.match(/^(\w+)\[(\d+)\](?:\.(.+))?$/);

    if (pathMatch) {
      const [, arrayProp, indexStr, nestedKey] = pathMatch;
      const index = parseInt(indexStr, 10);

      // Ensure we have a copy of the array
      const arr = Array.isArray(result[arrayProp])
        ? [...result[arrayProp].map((item: any) =>
            typeof item === "object" && item !== null ? { ...item } : item
          )]
        : [];

      if (index >= 0 && index < arr.length) {
        if (nestedKey) {
          // Deep path: "items[0].icon" → update arr[0].icon
          // Handle multi-level like "items[0].features[1]" (one more level)
          const subPathMatch = nestedKey.match(/^(\w+)\[(\d+)\]$/);
          if (subPathMatch && Array.isArray(arr[index][subPathMatch[1]])) {
            const subArr = [...arr[index][subPathMatch[1]]];
            subArr[parseInt(subPathMatch[2], 10)] = value;
            arr[index] = { ...arr[index], [subPathMatch[1]]: subArr };
          } else {
            arr[index] = { ...arr[index], [nestedKey]: value };
          }
        } else {
          // Replace entire item: "items[0]" → replace arr[0]
          arr[index] = value;
        }
      }

      result[arrayProp] = arr;
    } else {
      // Simple top-level update or full array replacement
      result[key] = value;
    }
  }

  return result;
}

// ─── Apply Commands to Elements Array ────────────────────
export function applyCommand(
  commands: AIEditCommand | AIEditCommand[],
  elements: ScreenElement[]
): ScreenElement[] {
  const commandList = Array.isArray(commands) ? commands : [commands];
  let result = [...elements];

  for (const command of commandList) {
    result = applySingleCommand(command, result);
  }

  return result;
}

// ─── Generate Unique Element ID ──────────────────────────
function generateElementId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ═══════════════════════════════════════════════════════════
// FULL SCREEN GENERATION
// ═══════════════════════════════════════════════════════════

function buildGenerateScreenPrompt(
  fileContext?: { fileName: string; content: string; mimeType: string }
): string {
  const templateList = Object.entries(ELEMENT_TEMPLATES)
    .map(([key, t]) => {
      const schema = PROP_SCHEMA[key];
      const propsDoc = schema
        ? Object.entries(schema)
            .map(([prop, def]) => `    ${prop} (${def.type}): ${def.desc}`)
            .join("\n")
        : "    (see defaults)";
      return `"${key}" — ${t.description}\n  Props:\n${propsDoc}\n  Defaults: ${JSON.stringify(t.defaultProps)}`;
    })
    .join("\n\n");

  let fileInstructions = "";
  if (fileContext) {
    const mime = fileContext.mimeType || "";
    const isCSV = mime.includes("csv") || fileContext.fileName.endsWith(".csv");
    const isExcel =
      mime.includes("spreadsheet") ||
      mime.includes("ms-excel") ||
      /\.xlsx?$/.test(fileContext.fileName);
    const isJSON =
      mime.includes("json") || fileContext.fileName.endsWith(".json");
    const isText =
      mime.includes("text/plain") ||
      mime.includes("markdown") ||
      /\.(txt|md)$/.test(fileContext.fileName);
    const isImage =
      mime.startsWith("image/") || /\.(png|jpe?g)$/.test(fileContext.fileName);
    const isPDF =
      mime.includes("pdf") || fileContext.fileName.endsWith(".pdf");

    let typeSpecificInstructions: string;

    if (isCSV || isExcel) {
      typeSpecificInstructions = `The user uploaded a data file with these columns and sample rows (shown above).
Generate a screen with:
- A navbar with the file name "${fileContext.fileName}" as the brand text
- A hero section with a title describing the data's purpose (infer from column names)
- A form section with ONE input field per column. Map column types intelligently:
  - Columns with "email" in the name → type: "email"
  - Columns with "date" in the name → type: "date"
  - Columns with "phone" or "tel" in the name → type: "tel"
  - Columns with "description", "notes", or "comments" → type: "textarea"
  - Columns with "amount", "price", "cost", or "salary" → type: "number" with "$" in the placeholder
  - Boolean-looking columns (values like yes/no, true/false, 0/1) → type: "checkbox"
  - Everything else → type: "text"
- Set field labels to cleaned-up column names: convert snake_case or camelCase to Title Case (e.g. "first_name" → "First Name", "emailAddress" → "Email Address")
- Set placeholders based on actual sample data values from the first row
- A submit button with contextual text (e.g. "Submit Entry", "Save Record", "Add Row")
- A footer`;
    } else if (isJSON) {
      typeSpecificInstructions = `The user uploaded a JSON structure (schema and sample shown above).
Generate a form that lets the user input data matching this structure:
- For top-level primitive fields: one form input per field, using appropriate types (string → text, number → number, boolean → checkbox)
- For nested objects: create separate form sections, each with its own title matching the object key (Title Case). Place a divider between each group.
- For arrays: show a cards section previewing the array items, then a form for adding a new item matching the array item schema
- Set placeholders from the sample data values
- Include a navbar with the file name as brand and a footer`;
    } else if (isText || isPDF) {
      typeSpecificInstructions = `The user uploaded a document (content preview shown above).
Organize the content into appropriate screen sections:
- Use a hero section for the document title or first heading
- Use text blocks for body paragraphs
- If the document contains listed items or bullet points, convert them to a cards section with one card per item
- If any numbers or statistics are mentioned, extract them into a stats section
- If there are distinct topics or chapters, use dividers to separate them
- Use a features section if the document describes capabilities or features
- Include a navbar with the file name as brand and a footer`;
    } else if (isImage) {
      typeSpecificInstructions = `The user uploaded a screenshot or mockup image.
Analyze the layout visible in the image and recreate it as closely as possible using the available element types:
- Identify navigation bars, headers, content sections, forms, cards, footers, etc.
- Match the visual hierarchy: headings, subheadings, body text
- Reproduce the color scheme using hex colors
- Map UI patterns to the closest available element type (e.g. a grid of cards → "cards", a sign-up form → "form", metric boxes → "stats")
- If you cannot determine the image content, generate a sensible default layout and explain what you assumed`;
    } else {
      typeSpecificInstructions = `Analyze the file content shown above and generate the most appropriate screen layout based on its structure.`;
    }

    fileInstructions = `
═══ FILE CONTEXT ═══
File: "${fileContext.fileName}" (${fileContext.mimeType})
Content:
${fileContext.content.slice(0, 4000)}

═══ FILE-SPECIFIC INSTRUCTIONS ═══
${typeSpecificInstructions}
`;
  }

  return `You are a screen builder AI. Given a user's description, generate a complete screen layout as a JSON object.

═══ AVAILABLE ELEMENT TYPES & PROP SCHEMAS ═══
${templateList}

${fileInstructions}
═══ OUTPUT FORMAT ═══
Return a JSON object with this structure:
{
  "elements": [
    {
      "type": "<template key, e.g. 'navbar'>",
      "label": "<human-readable label, e.g. 'Navigation Bar'>",
      "props": { <fully populated props matching the schema above> }
    },
    ...
  ],
  "explanation": "<1-2 sentence summary of what was built>"
}

═══ RULES ═══
1. CONTENT: Generate realistic, contextual content — never use Lorem Ipsum or generic placeholders.
   - For "dashboard for use case reporting": use actual metric labels like "Active Cases", "Resolution Rate", real chart descriptions, filter labels relevant to use case reporting.
   - For "landing page for a SaaS product": use compelling headlines, real-sounding feature descriptions, professional pricing tiers.
   - For "settings screen": use actual setting labels like "Notification Preferences", "Account Security", real option descriptions.
   - Match the content to the user's domain/industry when specified.

2. ORDERING: Always use logical element ordering:
   - navbar first (if included)
   - hero or main header section near the top
   - Content sections in logical flow (stats → features → details → social proof → CTA)
   - footer last (if included)

3. LIMITS: Generate between 4 and 15 elements. Choose the right number based on the complexity of the requested screen.

4. PROPS: Fully populate every element's props. Do not leave props empty or use the word "placeholder". Every text field should have meaningful content.

5. COLORS: Use a cohesive color scheme. Pick 1-2 accent colors and use them consistently across elements. Use hex colors.

6. EMOJIS: Use relevant Unicode emoji characters for icons — not text descriptions.

7. ELEMENT TYPES: Only use the template keys listed above: navbar, hero, stats, cards, features, form, cta, testimonial, pricing, text, divider, image, footer.

8. Return ONLY a raw JSON object. No markdown fences, no explanation text outside the JSON.`;
}

async function generateScreenWithLLM(
  prompt: string,
  fileContext?: { fileName: string; content: string; mimeType: string }
): Promise<{ elements: ScreenElement[]; explanation: string }> {
  const systemPrompt = buildGenerateScreenPrompt(fileContext);
  const userPrompt = fileContext
    ? `Generate a screen from the provided file. Additional context: "${prompt}"`
    : `Generate a screen: "${prompt}"`;

  let responseText: string | null = null;

  // Try Azure OpenAI
  if (isRealKey(process.env.AZURE_OPENAI_ENDPOINT) && isRealKey(process.env.AZURE_OPENAI_API_KEY)) {
    try {
      const res = await fetch(
        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-01`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": process.env.AZURE_OPENAI_API_KEY!,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 4000,
          }),
        }
      );
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
      console.warn("Azure generateScreen failed:", e);
    }
  }

  // Try OpenAI
  if (!responseText && isRealKey(process.env.OPENAI_API_KEY)) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });
      responseText = completion.choices[0]?.message?.content?.trim() || null;
    } catch (e) {
      console.warn("OpenAI generateScreen failed:", e);
    }
  }

  // Try Anthropic
  if (!responseText && isRealKey(process.env.ANTHROPIC_API_KEY)) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      responseText = data.content?.[0]?.text?.trim() || null;
    } catch (e) {
      console.warn("Anthropic generateScreen failed:", e);
    }
  }

  if (!responseText) throw new Error("All LLM providers failed");

  return parseGenerateScreenResponse(responseText);
}

function parseGenerateScreenResponse(text: string): { elements: ScreenElement[]; explanation: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
    }
  }

  if (!parsed || !Array.isArray(parsed.elements)) {
    throw new Error("Failed to parse screen generation response");
  }

  const elements: ScreenElement[] = parsed.elements
    .slice(0, 15)
    .map((raw: any, i: number) => {
      const templateKey = raw.type;
      const template = ELEMENT_TEMPLATES[templateKey];
      if (!template) return null;

      return {
        id: generateElementId(),
        type: template.type,
        label: raw.label || template.label,
        sortOrder: i,
        visible: true,
        locked: false,
        props: { ...template.defaultProps, ...(raw.props || {}) },
      } satisfies ScreenElement;
    })
    .filter(Boolean) as ScreenElement[];

  return {
    elements,
    explanation: parsed.explanation || `Built a screen with ${elements.length} components`,
  };
}

// ─── Local Screen Generation Fallback ────────────────────
function generateScreenLocally(prompt: string): { elements: ScreenElement[]; explanation: string } {
  const lower = prompt.toLowerCase();
  const ts = () => generateElementId();

  const makeEl = (type: string, propsOverride?: Record<string, any>): ScreenElement => {
    const template = ELEMENT_TEMPLATES[type];
    return {
      id: ts(),
      type: template.type,
      label: template.label,
      sortOrder: 0,
      visible: true,
      locked: false,
      props: { ...template.defaultProps, ...(propsOverride || {}) },
    };
  };

  let elements: ScreenElement[];
  let explanation: string;

  if (lower.includes("dashboard") || lower.includes("analytics") || lower.includes("report")) {
    elements = [
      makeEl("navbar", { brand: "Dashboard", links: ["Overview", "Reports", "Analytics", "Settings"], btnText: "Export" }),
      makeEl("stats", {
        items: [
          { value: "1,247", label: "Total Cases", color: "#8b5cf6" },
          { value: "89%", label: "Resolution Rate", color: "#22c55e" },
          { value: "3.2h", label: "Avg Response", color: "#3b82f6" },
          { value: "42", label: "Active Now", color: "#f59e0b" },
        ],
      }),
      makeEl("cards", {
        columns: 3,
        items: [
          { icon: "📊", title: "Case Volume", desc: "Track incoming and resolved cases over time", color: "#8b5cf6" },
          { icon: "⚡", title: "Performance", desc: "Monitor team response and resolution metrics", color: "#3b82f6" },
          { icon: "🎯", title: "SLA Compliance", desc: "Real-time SLA adherence tracking by category", color: "#22c55e" },
        ],
      }),
      makeEl("cards", {
        columns: 2,
        items: [
          { icon: "📈", title: "Trending Topics", desc: "Most frequently reported issues this week", color: "#f59e0b" },
          { icon: "👥", title: "Team Workload", desc: "Active case distribution across team members", color: "#ec4899" },
        ],
      }),
      makeEl("footer", { brand: "Dashboard", tagline: "Powered by your data." }),
    ];
    explanation = "Built a dashboard layout with key metrics, performance cards, and workload overview.";
  } else if (lower.includes("form") || lower.includes("input") || lower.includes("contact")) {
    elements = [
      makeEl("navbar", { brand: "FormBuilder", links: ["Home", "Forms", "Submissions", "Help"], btnText: "Account" }),
      makeEl("hero", {
        title: "Submit Your Information",
        subtitle: "Fill out the form below and we'll get back to you within 24 hours.",
        btnText: "",
        bg: "#f8f9fb",
        textColor: "#0f172a",
        align: "center",
        showImage: false,
      }),
      makeEl("form", {
        title: "Contact Form",
        fields: [
          { label: "Full Name", type: "text", placeholder: "Jane Smith" },
          { label: "Email Address", type: "email", placeholder: "jane@company.com" },
          { label: "Phone Number", type: "text", placeholder: "+1 (555) 123-4567" },
          { label: "Subject", type: "text", placeholder: "What is this regarding?" },
          { label: "Message", type: "textarea", placeholder: "Tell us more about your request..." },
        ],
        btnText: "Submit Request",
        btnColor: "#8b5cf6",
      }),
      makeEl("footer", { brand: "FormBuilder", tagline: "Simplifying data collection." }),
    ];
    explanation = "Built a form screen with a slim hero header and a multi-field contact form.";
  } else if (lower.includes("landing") || lower.includes("marketing") || lower.includes("homepage")) {
    elements = [
      makeEl("navbar"),
      makeEl("hero"),
      makeEl("stats"),
      makeEl("features"),
      makeEl("testimonial"),
      makeEl("cta"),
      makeEl("footer"),
    ];
    explanation = "Built a complete landing page with hero, stats, features, testimonial, CTA, and footer.";
  } else if (lower.includes("table") || lower.includes("data") || lower.includes("list")) {
    elements = [
      makeEl("navbar", { brand: "DataView", links: ["All Records", "Filters", "Export", "Settings"], btnText: "New Entry" }),
      makeEl("stats", {
        items: [
          { value: "2,841", label: "Total Records", color: "#3b82f6" },
          { value: "156", label: "Added Today", color: "#22c55e" },
          { value: "23", label: "Pending Review", color: "#f59e0b" },
          { value: "99.2%", label: "Data Quality", color: "#8b5cf6" },
        ],
      }),
      makeEl("cards", {
        columns: 1,
        items: [
          { icon: "📋", title: "Recent Records", desc: "Showing the latest entries — use filters to refine your view", color: "#3b82f6" },
          { icon: "🔍", title: "Search & Filter", desc: "Search by name, date, status, or any field in the dataset", color: "#64748b" },
          { icon: "📊", title: "Data Summary", desc: "Aggregated insights from your records with trend analysis", color: "#8b5cf6" },
        ],
      }),
      makeEl("footer", { brand: "DataView", tagline: "Your data, organized." }),
    ];
    explanation = "Built a data table view with record metrics, list layout, and search overview.";
  } else if (lower.includes("setting") || lower.includes("profile") || lower.includes("preference") || lower.includes("account")) {
    elements = [
      makeEl("navbar", { brand: "Settings", links: ["Profile", "Security", "Notifications", "Billing"], btnText: "Back" }),
      makeEl("form", {
        title: "Profile Settings",
        fields: [
          { label: "Display Name", type: "text", placeholder: "Your name" },
          { label: "Email", type: "email", placeholder: "you@company.com" },
          { label: "Bio", type: "textarea", placeholder: "Tell us about yourself..." },
        ],
        btnText: "Save Profile",
        btnColor: "#8b5cf6",
      }),
      makeEl("divider"),
      makeEl("form", {
        title: "Notification Preferences",
        fields: [
          { label: "Email Notifications", type: "text", placeholder: "Enabled" },
          { label: "Weekly Digest", type: "text", placeholder: "Every Monday" },
          { label: "Alert Threshold", type: "text", placeholder: "High priority only" },
        ],
        btnText: "Update Preferences",
        btnColor: "#22c55e",
        bg: "#ffffff",
      }),
      makeEl("footer", { brand: "Settings", tagline: "Manage your account." }),
    ];
    explanation = "Built a settings screen with profile form, divider, and notification preferences.";
  } else if (lower.includes("onboarding") || lower.includes("wizard") || lower.includes("welcome") || lower.includes("getting started")) {
    elements = [
      makeEl("navbar", { brand: "Welcome", links: ["Step 1", "Step 2", "Step 3"], btnText: "Skip" }),
      makeEl("hero", {
        title: "Welcome! Let's get you set up",
        subtitle: "Complete these 3 quick steps to personalize your experience.",
        btnText: "Start Setup",
        align: "center",
      }),
      makeEl("cards", {
        columns: 3,
        items: [
          { icon: "👤", title: "1. Create Profile", desc: "Set up your name, avatar, and preferences", color: "#8b5cf6" },
          { icon: "🔗", title: "2. Connect Tools", desc: "Link your existing tools and data sources", color: "#3b82f6" },
          { icon: "🚀", title: "3. Launch", desc: "You're ready to go — explore your dashboard", color: "#22c55e" },
        ],
      }),
      makeEl("form", {
        title: "Quick Setup",
        fields: [
          { label: "Your Name", type: "text", placeholder: "Jane Smith" },
          { label: "Role", type: "text", placeholder: "e.g. Product Manager" },
          { label: "Team Size", type: "text", placeholder: "e.g. 5-10 people" },
        ],
        btnText: "Continue",
        btnColor: "#8b5cf6",
      }),
      makeEl("footer", { brand: "Onboarding", tagline: "You're almost there!" }),
    ];
    explanation = "Built an onboarding wizard with welcome hero, step cards, and quick setup form.";
  } else {
    // Default: simple page
    elements = [
      makeEl("navbar"),
      makeEl("hero", {
        title: "Your New Screen",
        subtitle: "This screen was generated from your description. Edit any section using the chat or property panel.",
        align: "center",
      }),
      makeEl("text", {
        content: "Start customizing this page by clicking on any section and describing what you'd like to change in the chat panel.",
        align: "center",
      }),
      makeEl("footer"),
    ];
    explanation = "Built a basic screen with navigation, hero, text block, and footer. Customize it using the chat!";
  }

  // Assign sortOrder
  elements.forEach((el, i) => (el.sortOrder = i));

  return { elements, explanation };
}

// ─── Exported generateScreen ─────────────────────────────
export async function generateScreen(
  prompt: string,
  fileContext?: { fileName: string; content: string; mimeType: string }
): Promise<{ elements: ScreenElement[]; explanation: string }> {
  if (hasLLMKey()) {
    try {
      return await generateScreenWithLLM(prompt, fileContext);
    } catch (e) {
      console.warn("LLM screen generation failed, using local fallback:", e);
    }
  }
  return generateScreenLocally(prompt);
}

function applySingleCommand(
  command: AIEditCommand,
  elements: ScreenElement[]
): ScreenElement[] {
  const newElements = [...elements];

  switch (command.action) {
    case "add": {
      const template = ELEMENT_TEMPLATES[command.elementType || ""];
      if (!template) return elements;
      const newEl: ScreenElement = {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: template.type,
        label: template.label,
        sortOrder: 0,
        visible: true,
        locked: false,
        props: { ...template.defaultProps, ...command.properties },
      };
      if (command.insertAfter) {
        const idx = newElements.findIndex((e) => e.id === command.insertAfter);
        newElements.splice(idx + 1, 0, newEl);
      } else {
        // Insert before footer if present, else append
        const footerIdx = newElements.findIndex((e) => e.type === "footer");
        if (footerIdx >= 0) newElements.splice(footerIdx, 0, newEl);
        else newElements.push(newEl);
      }
      newElements.forEach((e, i) => (e.sortOrder = i));
      return newElements;
    }
    case "remove": {
      return newElements
        .filter((e) => e.id !== command.targetId)
        .map((e, i) => ({ ...e, sortOrder: i }));
    }
    case "update": {
      return newElements.map((e) =>
        e.id === command.targetId
          ? { ...e, props: deepUpdateProps(e.props, command.properties || {}) }
          : e
      );
    }
    case "move": {
      const idx = newElements.findIndex((e) => e.id === command.targetId);
      if (idx < 0) return elements;
      const dir = command.direction === "up" ? -1 : 1;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= newElements.length) return elements;
      [newElements[idx], newElements[newIdx]] = [newElements[newIdx], newElements[idx]];
      newElements.forEach((e, i) => (e.sortOrder = i));
      return newElements;
    }
    case "duplicate": {
      const idx = newElements.findIndex((e) => e.id === command.targetId);
      if (idx < 0) return elements;
      const cloned: ScreenElement = {
        ...newElements[idx],
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        props: JSON.parse(JSON.stringify(newElements[idx].props)),
      };
      newElements.splice(idx + 1, 0, cloned);
      newElements.forEach((e, i) => (e.sortOrder = i));
      return newElements;
    }
    default:
      return elements;
  }
}
