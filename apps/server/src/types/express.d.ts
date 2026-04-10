import type { User } from "@bisp-final-flow/db/generated/client";

// Расширяем тип Request — теперь req.user доступен везде
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
