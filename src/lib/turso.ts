import { createClient } from "@libsql/client";

import { defaultSavingsValues, type SavingsValues } from "@/lib/savings";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const tursoClient = databaseUrl && authToken
  ? createClient({
      url: databaseUrl,
      authToken,
    })
  : null;

export async function ensureSavingsTable() {
  if (!tursoClient) {
    return;
  }

  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS savings_data (
      user_id TEXT PRIMARY KEY,
      balance REAL NOT NULL,
      salary REAL NOT NULL,
      rent REAL NOT NULL,
      card REAL NOT NULL,
      friend_club REAL NOT NULL,
      horse_club REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      base_salary REAL NOT NULL DEFAULT 0,
      rent REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS monthly_savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      card REAL NOT NULL DEFAULT 0,
      horse_club REAL NOT NULL DEFAULT 0,
      friend_club REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, year, month)
    )
  `);
}

export async function getSavingsForUser(userId: string) {
  if (!tursoClient) {
    return defaultSavingsValues;
  }

  const result = await tursoClient.execute({
    sql: "SELECT balance, salary, rent, card, friend_club, horse_club FROM savings_data WHERE user_id = ?",
    args: [userId],
  });

  const row = result.rows[0] as unknown as
    | {
        balance: number | string;
        salary: number | string;
        rent: number | string;
        fireInsurance: number | string;
        card: number | string;
        friend_club: number | string;
        horse_club: number | string;
      }
    | undefined;

  if (!row) {
    return defaultSavingsValues;
  }

  return {
    balance: Number(row.balance),
    salary: Number(row.salary),
    rent: Number(row.rent),
    card: Number(row.card),
    fireInsurance: Number(row.fireInsurance),
    horseClub: Number(row.horse_club),
    friendClub: Number(row.friend_club),
  } satisfies SavingsValues;
}

export async function saveSavingsForUser(userId: string, values: SavingsValues) {
  if (!tursoClient) {
    return values;
  }

  await tursoClient.execute({
    sql: `
      INSERT INTO savings_data (user_id, balance, salary, rent, card, friend_club, horse_club, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        balance = excluded.balance,
        salary = excluded.salary,
        rent = excluded.rent,
        card = excluded.card,
        friend_club = excluded.friend_club,
        horse_club = excluded.horse_club,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      userId,
      values.balance,
      values.salary,
      values.rent,
      values.card,
      values.friendClub,
      values.horseClub,
    ],
  });

  return values;
}
