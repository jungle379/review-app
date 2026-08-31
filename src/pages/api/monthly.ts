import type { NextApiRequest, NextApiResponse } from "next";
import {
  normalizeMonthlyData,
  getCurrentPlanningMonth,
  type MonthlySavings,
} from "@/lib/savings";
import {
  ensureSavingsTable,
  getMonthlySavingsFrom,
  saveMonthlySavingsBatch,
  deleteMonthlySavingsBefore,
} from "@/lib/turso";

function getUserId(value: unknown): string {
  return typeof value === "string" && value.length > 0
    ? value
    : "local-user";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await ensureSavingsTable();

    const userId = getUserId(req.query.userId);

    const currentPlanningMonth = getCurrentPlanningMonth();

    await deleteMonthlySavingsBefore(
      userId,
      currentPlanningMonth.year,
      currentPlanningMonth.month
    );

    if (req.method === "GET") {
      const fromYear = Number(req.query.fromYear);
      const fromMonth = Number(req.query.fromMonth);

      const monthlyData = await getMonthlySavingsFrom(
        userId,
        Number.isFinite(fromYear)
          ? fromYear
          : currentPlanningMonth.year,
        Number.isFinite(fromMonth)
          ? fromMonth
          : currentPlanningMonth.month
      );

      return res.status(200).json(monthlyData);
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as {
        userId?: string;
        items?: Partial<MonthlySavings>[];
      } & Partial<MonthlySavings>;

      const rawItems = Array.isArray(body.items)
        ? body.items
        : [body];

      const items = rawItems
        .map((item) =>
          normalizeMonthlyData(
            item,
            Number(item.year ?? currentPlanningMonth.year),
            Number(item.month ?? currentPlanningMonth.month)
          )
        )
        .filter(
          (item) =>
            item.year > currentPlanningMonth.year ||
            (item.year === currentPlanningMonth.year &&
              item.month >= currentPlanningMonth.month)
        );

      const saved = await saveMonthlySavingsBatch(
        getUserId(body.userId ?? userId),
        items
      );

      return res.status(200).json(saved);
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (error) {
    console.error("/api/monthly エラー:", error);

    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "サーバーエラーが発生しました",
    });
  }
}
