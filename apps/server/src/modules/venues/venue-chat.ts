import { Router } from "express";
import prisma from "@bisp-final-flow/db";
import { env } from "@bisp-final-flow/env/server";

const SYSTEM_PROMPT = `You are a helpful venue assistant for FLOW, a party booking platform.
You answer questions about a specific venue based on the venue data provided.
Keep answers short (2-3 sentences max), friendly, and helpful.
If you don't have the information to answer, say so honestly.
Answer in the same language as the question.`;

const router = Router();

// POST /api/venues/:id/chat
router.post("/:id/chat", async (req, res) => {
  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question || question.length > 500) {
    res.status(400).json({ error: "Question must be 1-500 characters" });
    return;
  }

  if (!env.GITHUB_MODELS_TOKEN) {
    res.status(503).json({ error: "Chat is not configured" });
    return;
  }

  const venue = await prisma.venue.findUnique({
    where: { id: req.params.id },
    select: {
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
      duration: true,
    },
  });

  if (!venue) {
    res.status(404).json({ error: "Venue not found" });
    return;
  }

  try {
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
              content: `Venue data:\n${JSON.stringify(venue)}\n\nCustomer question: "${question}"`,
            },
          ],
          temperature: 0.7,
          max_tokens: 256,
        }),
      },
    );

    if (!response.ok) {
      console.error(`[venue-chat] API error: ${response.status}`);
      res.status(502).json({ error: "AI service unavailable" });
      return;
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const answer = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate an answer.";

    res.json({ answer });
  } catch (err) {
    console.error("[venue-chat] Error:", err);
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

export default router;
