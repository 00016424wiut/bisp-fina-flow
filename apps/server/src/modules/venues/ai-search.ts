import { Router } from "express";
import prisma from "@bisp-final-flow/db";
import { env } from "@bisp-final-flow/env/server";

const SYSTEM_PROMPT = `You are a venue matching assistant for a party booking platform.
Given venues and a user query, return ONLY a JSON array of top matches (up to 10):
[{ "id": "...", "score": 0-100, "reason": "one sentence" }]
Consider: name, description, category, tags, amenities, capacity, price, location.
Interpret broadly — match on vibe, atmosphere, activity type, practical needs.
No venues match? Return []. Sort by score descending.`;

const router = Router();

router.post("/", async (req, res) => {
  const query =
    typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query || query.length > 500) {
    res.status(400).json({ error: "Query must be 1-500 characters" });
    return;
  }

  if (!env.GITHUB_MODELS_TOKEN) {
    res.status(503).json({ error: "AI search is not configured" });
    return;
  }

  const venues = await prisma.venue.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
      amenities: true,
      capacity: true,
      minGuests: true,
      maxGuests: true,
      rating: true,
      pricePerHour: true,
      address: true,
      hours: true,
      averageCheck: true,
    },
  });

  if (venues.length === 0) {
    res.json({ results: [] });
    return;
  }

  const venueSummaries = JSON.stringify(venues);

  const response = await fetch(
    "https://models.github.ai/inference/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GITHUB_MODELS_TOKEN}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User query: "${query}"\n\nAvailable venues:\n${venueSummaries}`,
          },
        ],
        temperature: 0,
        max_tokens: 1024,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown error");
    console.error(`[ai-search] GitHub Models API error: ${response.status}`, errText);
    res.status(502).json({ error: "AI service unavailable" });
    return;
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "[]";

  // GPT-4o frequently wraps JSON in ```json ... ``` despite the system prompt.
  // Strip any fences and grab the first [...] block before parsing.
  const stripped = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const arrayMatch = stripped.match(/\[[\s\S]*\]/);
  const jsonText = arrayMatch ? arrayMatch[0] : stripped;

  let ranked: { id: string; score: number; reason: string }[];
  try {
    ranked = JSON.parse(jsonText);
  } catch {
    console.error("[ai-search] Failed to parse model output:", raw);
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }
  if (!Array.isArray(ranked)) {
    console.error("[ai-search] Model returned non-array:", raw);
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const venueMap = new Map(venues.map((v) => [v.id, v]));
  const results = ranked
    .filter((r) => venueMap.has(r.id))
    .map((r) => {
      const v = venueMap.get(r.id)!;
      return {
        id: v.id,
        name: v.name,
        score: r.score,
        reason: r.reason,
        category: v.category,
        pricePerHour: v.pricePerHour.toString(),
        capacity: v.capacity,
        rating: v.rating,
      };
    });

  res.json({ results });
});

export default router;
