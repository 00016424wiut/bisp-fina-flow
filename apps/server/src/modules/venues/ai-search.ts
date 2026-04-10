import { Router } from "express";
import { prisma } from "@bisp-final-flow/db";
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
  const text = data.choices?.[0]?.message?.content ?? "[]";

  let ranked: { id: string; score: number; reason: string }[];
  try {
    ranked = JSON.parse(text);
  } catch {
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
