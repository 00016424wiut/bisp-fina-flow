import { auth } from "@bisp-final-flow/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";

// Проверяет сессию Better-Auth и кладёт user в req.user
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = session.user as Express.Request["user"];
  next();
}
