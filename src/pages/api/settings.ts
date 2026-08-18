import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeSettings, type UserSettings } from "@/lib/savings";
import {
  ensureSavingsTable,
  getUserSettings,
  saveUserSettings,
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
      const settings = await getUserSettings(getUserId(req.query.userId));
      return res.status(200).json(settings);
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as Partial<UserSettings> & {
        userId?: string;
      };

      const saved = await saveUserSettings(
        getUserId(body.userId),
        normalizeSettings(body)
      );

      return res.status(200).json(saved);
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (error) {
    console.error("/api/settings エラー:", error);

    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "サーバーエラーが発生しました",
    });
  }
}
