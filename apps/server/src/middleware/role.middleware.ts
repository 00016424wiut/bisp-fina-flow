import { Role } from "@bisp-final-flow/db/generated/client";
import type { Request, Response, NextFunction } from "express";

// Проверяет роль пользователя — используй после requireAuth
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
