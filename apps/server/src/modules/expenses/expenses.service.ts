import prisma from "@bisp-final-flow/db";

// Список расходов компании с фильтрами
export async function getExpenses(
  companyId: string,
  filters: {
    category?: string;
    from?: string;
    to?: string;
  }
) {
  return prisma.expense.findMany({
    where: {
      companyId,
      ...(filters.category && { category: filters.category as any }),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from && { gte: new Date(filters.from) }),
              ...(filters.to && { lte: new Date(filters.to) }),
            },
          }
        : {}),
    },
    include: { booking: { include: { venue: true } } },
    orderBy: { date: "desc" },
  });
}

// Агрегация по категориям — для дашборда HR
export async function getExpensesSummary(
  companyId: string,
  filters: { from?: string; to?: string }
) {
  const expenses = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      companyId,
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from && { gte: new Date(filters.from) }),
              ...(filters.to && { lte: new Date(filters.to) }),
            },
          }
        : {}),
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  return expenses.map((e) => ({
    category: e.category,
    total: e._sum.amount,
    count: e._count.id,
  }));
}

// Выгрузка в CSV
export async function exportExpensesCSV(
  companyId: string
): Promise<string> {
  const expenses = await getExpenses(companyId, {});

  const header = "Дата,Категория,Описание,Сумма,Площадка\n";
  const rows = expenses
    .map((e) => {
      const date = e.date.toLocaleDateString("ru-RU");
      const venue = e.booking?.venue?.name ?? "—";
      return `${date},${e.category},${e.description ?? "—"},${e.amount},${venue}`;
    })
    .join("\n");

  return header + rows;
}
