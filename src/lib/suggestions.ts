import { ScreenElement } from "@/types";

// ─── Per-type edit suggestions ───────────────────────────
const TYPE_SUGGESTIONS: Record<string, string[]> = {
  navbar: [
    "Add a new nav link",
    "Change the brand name",
    "Make it sticky",
    "Change accent color",
  ],
  hero: [
    "Change the headline",
    "Make it centered",
    "Dark background",
    "Change the CTA text",
    "Change the hero emoji",
  ],
  cards: [
    "Add a fourth card",
    "Make it 2 columns",
    "Change the card icons",
    "Update card colors",
  ],
  stats: [
    "Change the first stat value",
    "Add a new metric",
    "Update stat colors",
  ],
  features: [
    "Change the section title",
    "Add a new feature",
    "Update the feature icons",
  ],
  form: [
    "Add a phone number field",
    "Change button to Submit Request",
    "Change the form title",
    "Remove a field",
  ],
  cta: [
    "Change the headline",
    "Make it darker",
    "Update button text",
    "Change the background gradient",
  ],
  testimonial: [
    "Change the quote",
    "Update the author name",
    "Change the rating to 4 stars",
  ],
  pricing: [
    "Add a feature to the starter plan",
    "Change the professional price",
    "Highlight a different plan",
  ],
  footer: [
    "Add a link to the Resources column",
    "Change the brand name",
    "Update the tagline",
  ],
  text: [
    "Make the text larger",
    "Center the text",
    "Change the text color",
  ],
  divider: [
    "Make it dashed",
    "Change the divider color",
  ],
  image: [
    "Change the height",
    "Round the corners more",
    "Change the background color",
  ],
};

// ─── Elements that make a "complete" landing page ────────
const LANDING_PAGE_PRIORITY: string[] = [
  "testimonial",
  "pricing",
  "cta",
  "stats",
  "form",
  "features",
  "cards",
  "text",
  "image",
  "divider",
];

export function generateSuggestions(
  elements: ScreenElement[],
  selected: ScreenElement | undefined
): string[] {
  // ── No elements at all ──
  if (elements.length === 0) {
    return [
      "Build me a landing page",
      "Create a dashboard layout",
      "Add a hero section",
      "Add a navigation bar",
    ];
  }

  // ── Element is selected ──
  if (selected) {
    const typeSuggestions = TYPE_SUGGESTIONS[selected.type] || [
      "Change the background",
      "Update the content",
    ];
    // Pick up to 3 type-specific suggestions
    const picks = typeSuggestions.slice(0, 3);

    // Add positional actions
    const idx = elements.findIndex((e) => e.id === selected.id);
    if (idx > 0) picks.push("Move up");
    if (idx < elements.length - 1) picks.push("Move down");
    picks.push("Delete this");

    return picks.slice(0, 5);
  }

  // ── Elements exist, nothing selected ──
  const presentTypes = new Set(elements.map((e) => e.type));

  const missing = LANDING_PAGE_PRIORITY.filter((t) => !presentTypes.has(t));

  const suggestions: string[] = [];

  // Suggest adding missing elements (up to 3)
  for (const type of missing.slice(0, 3)) {
    suggestions.push(`Add a ${type} section`);
  }

  // Fill remaining slots with general suggestions
  const general = [
    "Make the page darker",
    "Change the color scheme to blue",
    "Add a divider between sections",
  ];
  for (const g of general) {
    if (suggestions.length >= 5) break;
    suggestions.push(g);
  }

  return suggestions.slice(0, 5);
}
