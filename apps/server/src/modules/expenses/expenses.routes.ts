import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { getExpenses, getExpensesSummary, exportExpensesCSV } from "./expenses.service";
import { Role } from "@bisp-final-flow/db/generated/client";

const router = Router();

// GET /api/expenses — список расходов компании
router.get(
  "/",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  async (req, res) => {
    const { category, from, to } = req.query;
    const expenses = await getExpenses(req.user!.companyId ?? "", {
      category: category as string,
      from: from as string,
      to: to as string,
    });
    res.json(expenses);
  }
);

// GET /api/expenses/summary — агрегация по категориям
router.get(
  "/summary",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  async (req, res) => {
    const { from, to } = req.query;
    const summary = await getExpensesSummary(req.user!.companyId ?? "", {
      from: from as string,
      to: to as string,
    });
    res.json(summary);
  }
);

// GET /api/expenses/export — скачать CSV
router.get(
  "/export",
  requireAuth,
  requireRole(Role.MANAGER, Role.ADMIN),
  async (req, res) => {
    const csv = await exportExpensesCSV(req.user!.companyId ?? "");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
    res.send(csv);
  }
);

export default router;
