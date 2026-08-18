import type { NextApiRequest, NextApiResponse } from "next";

import { defaultSavingsValues, type SavingsValues } from "@/lib/savings";
import { ensureSavingsTable, getSavingsForUser, saveSavingsForUser, tursoClient } from "@/lib/turso";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureSavingsTable();

  if (req.method === "GET") {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "local-user";
    const values = await getSavingsForUser(userId);
    return res.status(200).json(values);
  }

  if (req.method === "POST") {
    const body = (req.body ?? {}) as Partial<SavingsValues> & { userId?: string };
    const values: SavingsValues = {
      ...defaultSavingsValues,
      ...body,
    };

    const userId = body.userId ?? "local-user";

    if (tursoClient) {
      await saveSavingsForUser(userId, values);
    }

    return res.status(200).json(values);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
