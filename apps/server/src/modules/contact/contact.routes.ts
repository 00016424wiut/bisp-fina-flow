import { Router } from "express";
import { Resend } from "resend";
import { env } from "@bisp-final-flow/env/server";

const router = Router();

router.post("/", async (req, res) => {
  const { name, email, phone, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400).json({ error: "Name, email and message are required" });
    return;
  }

  if (!env.RESEND_API_KEY) {
    console.log("Contact form submission (RESEND_API_KEY not set):", { name, email, phone, message });
    res.json({ ok: true });
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "FLOW Contact <onboarding@resend.dev>",
    to: "szaynidinova@students.wiut.uz",
    subject: `FLOW Contact: ${name.trim()}`,
    html: `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${name.trim()}</p>
      <p><strong>Email:</strong> ${email.trim()}</p>
      <p><strong>Phone:</strong> ${phone?.trim() || "Not provided"}</p>
      <hr />
      <p>${message.trim().replace(/\n/g, "<br />")}</p>
    `,
  });

  if (error) {
    console.error("Failed to send contact email:", error);
    res.status(500).json({ error: "Failed to send message" });
    return;
  }

  res.json({ ok: true });
});

export default router;
