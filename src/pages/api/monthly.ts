import type { NextApiRequest, NextApiResponse } from "next";
import {
  PLAN_START_MONTH,
  PLAN_START_YEAR,
  normalizeMonthlyData,
  type MonthlySavings,
} from "@/lib/savings";
import {
  ensureSavingsTable,
  getMonthlySavingsFrom,
  saveMonthlySavingsBatch,
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

    if (req.method === "GET") {
      const fromYear = Number(req.query.fromYear ?? PLAN_START_YEAR);
      const fromMonth = Number(req.query.fromMonth ?? PLAN_START_MONTH);

      const monthlyData = await getMonthlySavingsFrom(
        getUserId(req.query.userId),
        Number.isFinite(fromYear) ? fromYear : PLAN_START_YEAR,
        Number.isFinite(fromMonth) ? fromMonth : PLAN_START_MONTH
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

      const items = rawItems.map((item) =>
        normalizeMonthlyData(
          item,
          Number(item.year ?? PLAN_START_YEAR),
          Number(item.month ?? PLAN_START_MONTH)
        )
      );

      const saved = await saveMonthlySavingsBatch(
        getUserId(body.userId),
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
