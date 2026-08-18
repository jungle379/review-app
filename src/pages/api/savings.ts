import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import {
  defaultSavingsValues,
  type SavingsValues,
} from "@/lib/savings";

import {
  ensureSavingsTable,
  getSavingsForUser,
  saveSavingsForUser,
  getUserSettings,
  saveUserSettings,
  getMonthlySavingsForUser,
  saveMonthlySavings,
  type UserSettings,
  type MonthlySavings,
} from "@/lib/turso";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await ensureSavingsTable();

    // ===================================================
    // GET
    // ===================================================

    if (req.method === "GET") {
      const {
        userId,
        action,
        year,
      } = req.query;

      const userIdStr =
        typeof userId === "string" &&
        userId.length > 0
          ? userId
          : "local-user";

      // -----------------------------------------------
      // 設定
      // -----------------------------------------------

      if (action === "settings") {
        const settings =
          await getUserSettings(
            userIdStr
          );

        return res
          .status(200)
          .json(settings);
      }

      // -----------------------------------------------
      // 月別
      // -----------------------------------------------

      if (
        action === "monthly" &&
        typeof year === "string"
      ) {
        const monthlyData =
          await getMonthlySavingsForUser(
            userIdStr,
            Number(year)
          );

        return res
          .status(200)
          .json(monthlyData);
      }

      // -----------------------------------------------
      // 従来データ
      // -----------------------------------------------

      const values =
        await getSavingsForUser(
          userIdStr
        );

      return res
        .status(200)
        .json(values);
    }

    // ===================================================
    // POST
    // ===================================================

    if (req.method === "POST") {
      const body = (req.body ??
        {}) as Partial<SavingsValues> &
        Partial<UserSettings> &
        Partial<MonthlySavings> & {
          userId?: string;
          action?: string;
        };

      const userId =
        typeof body.userId === "string" &&
        body.userId.length > 0
          ? body.userId
          : "local-user";

      // -----------------------------------------------
      // 設定保存
      // -----------------------------------------------

      if (
        body.action ===
        "save-settings"
      ) {
        const settings: UserSettings =
          {
            base_salary: Number(
              body.base_salary ?? 0
            ),

            rent: Number(
              body.rent ?? 0
            ),
          };

        const saved =
          await saveUserSettings(
            userId,
            settings
          );

        console.log(
          "設定保存完了:",
          {
            userId,
            saved,
          }
        );

        return res
          .status(200)
          .json(saved);
      }

      // -----------------------------------------------
      // 月別保存
      // -----------------------------------------------

      if (
        body.action ===
        "save-monthly"
      ) {
        const monthlyData: MonthlySavings =
          {
            year: Number(
              body.year ??
                new Date().getFullYear()
            ),

            month: Number(
              body.month ??
                new Date().getMonth() + 1
            ),

            fire_insurance: Number(
                body.fire_insurance ?? 0
            ),

            card: Number(
              body.card ?? 0
            ),

            horse_club: Number(
              body.horse_club ?? 0
            ),

            friend_club: Number(
              body.friend_club ?? 0
            ),

            balance: Number(
              body.balance ?? 0
            ),
          };

        const saved =
          await saveMonthlySavings(
            userId,
            monthlyData
          );

        return res
          .status(200)
          .json(saved);
      }

      // -----------------------------------------------
      // 従来保存
      // -----------------------------------------------

      const values: SavingsValues =
        {
          balance: Number(
            body.balance ??
              defaultSavingsValues.balance
          ),

          salary: Number(
            body.salary ??
              defaultSavingsValues.salary
          ),

          rent: Number(
            body.rent ??
              defaultSavingsValues.rent
          ),

          fireInsurance: Number(
            body.fireInsurance ??
              defaultSavingsValues.fireInsurance
          ),

          card: Number(
            body.card ??
              defaultSavingsValues.card
          ),

          horseClub: Number(
            body.horseClub ??
              defaultSavingsValues.horseClub
          ),

          friendClub: Number(
            body.friendClub ??
              defaultSavingsValues.friendClub
          ),
        };

      const saved =
        await saveSavingsForUser(
          userId,
          values
        );

      return res
        .status(200)
        .json(saved);
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (error) {
    console.error(
      "POST /api/savings エラー:",
      error
    );

    return res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "サーバーエラーが発生しました",
    });
  }
}