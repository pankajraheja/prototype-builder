import { NextRequest, NextResponse } from "next/server";
import { hasLLMKey } from "@/lib/ai-engine";
import { ScreenElement } from "@/types";

function isRealKey(val: string | undefined): boolean {
  if (!val) return false;
  return !val.includes("your-") && !val.includes("your_") && val.length > 10;
}

const SYSTEM_PROMPT = `You are a UI design advisor for a landing page builder. Given the current page elements, suggest exactly 3 short improvement commands the user could type into the chat. Each must be a direct, actionable instruction (e.g. "Make the hero background darker", "Add a testimonial section", "Change the pricing to show annual billing"). Return ONLY a raw JSON array of 3 strings. No markdown, no explanation.`;

async function fetchSuggestions(elementSummary: string): Promise<string[]> {
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
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: elementSummary },
            ],
            temperature: 0.7,
            max_tokens: 300,
          }),
        }
      );
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return parseArray(text);
    } catch (e) {
      console.warn("Azure suggest failed:", e);
    }
  }

  // Try OpenAI
  if (isRealKey(process.env.OPENAI_API_KEY)) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: elementSummary },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return parseArray(text);
    } catch (e) {
      console.warn("OpenAI suggest failed:", e);
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
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: elementSummary }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim();
      if (text) return parseArray(text);
    } catch (e) {
      console.warn("Anthropic suggest failed:", e);
    }
  }

  return [];
}

function parseArray(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string").slice(0, 3);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string").slice(0, 3);
      } catch { /* fall through */ }
    }
  }
  return [];
}

// POST /api/ai/suggest — get 3 AI-powered improvement suggestions
export async function POST(req: NextRequest) {
  try {
    if (!hasLLMKey()) {
      return NextResponse.json({ suggestions: [] });
    }

    const { elements }: { elements: ScreenElement[] } = await req.json();

    if (!elements || elements.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Build a concise summary (types + labels only, no full props)
    const summary = elements
      .map((e, i) => `${i + 1}. ${e.type} — "${e.label}"`)
      .join("\n");

    const suggestions = await fetchSuggestions(
      `Current page elements (top to bottom):\n${summary}`
    );

    return NextResponse.json({ suggestions });
  } catch (e: any) {
    console.warn("Suggest endpoint failed:", e);
    return NextResponse.json({ suggestions: [] });
  }
}
