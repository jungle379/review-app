import { createClient } from "@libsql/client";
import {
  defaultSavingsValues,
  defaultUserSettings,
  type MonthlySavings,
  type SavingsValues,
  type UserSettings,
} from "@/lib/savings";

export type { MonthlySavings, UserSettings };

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const tursoClient =
  databaseUrl && authToken
    ? createClient({
        url: databaseUrl,
        authToken,
      })
    : null;

/**
 * DBテーブルを準備する
 */
export async function ensureSavingsTable() {
  if (!tursoClient) {
    return;
  }

  // 従来の貯金データ
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS savings_data (
      user_id TEXT PRIMARY KEY,
      balance REAL NOT NULL DEFAULT 0,
      salary REAL NOT NULL DEFAULT 0,
      rent REAL NOT NULL DEFAULT 0,
      card REAL NOT NULL DEFAULT 0,
      friend_club REAL NOT NULL DEFAULT 0,
      horse_club REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 固定設定
  // 火災保険はここには入れない
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      base_salary REAL NOT NULL DEFAULT 0,
      rent REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 月別データ
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS monthly_savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      card REAL NOT NULL DEFAULT 0,
      horse_club REAL NOT NULL DEFAULT 0,
      friend_club REAL NOT NULL DEFAULT 0,
      fire_insurance REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, year, month)
    )
  `);

  // 既に monthly_savings が存在している場合、
  // CREATE TABLE IF NOT EXISTS では fire_insurance が追加されないため、
  // カラムの存在を確認して必要なら追加する。
  try {
    await tursoClient.execute(`
      ALTER TABLE monthly_savings
      ADD COLUMN fire_insurance REAL NOT NULL DEFAULT 0
    `);
  } catch (error) {
    // 既に存在している場合は無視
    const message =
      error instanceof Error ? error.message : String(error);

    if (
      !message.includes("duplicate column") &&
      !message.includes("duplicate column name")
    ) {
      console.error(
        "monthly_savings.fire_insurance の確認中にエラー:",
        error
      );
    }
  }
}

/**
 * 従来のSavingsデータ取得
 */
export async function getSavingsForUser(
  userId: string
): Promise<SavingsValues> {
  if (!tursoClient) {
    return defaultSavingsValues;
  }

  const result = await tursoClient.execute({
    sql: `
      SELECT
        balance,
        salary,
        rent,
        card,
        friend_club,
        horse_club
      FROM savings_data
      WHERE user_id = ?
    `,
    args: [userId],
  });

const row = result.rows[0] as unknown as
  | {
      balance: number | string;
      salary: number | string;
      rent: number | string;
      card: number | string;
      friend_club: number | string;
      horse_club: number | string;
    }
  | undefined;

  if (!row) {
    return defaultSavingsValues;
  }

  return {
    balance: Number(row.balance ?? 0),
    salary: Number(row.salary ?? 0),
    rent: Number(row.rent ?? 0),
    fireInsurance: 0,
    card: Number(row.card ?? 0),
    horseClub: Number(row.horse_club ?? 0),
    friendClub: Number(row.friend_club ?? 0),
  };
}

/**
 * 従来のSavingsデータ保存
 */
export async function saveSavingsForUser(
  userId: string,
  values: SavingsValues
): Promise<SavingsValues> {
  if (!tursoClient) {
    return values;
  }

  await tursoClient.execute({
    sql: `
      INSERT INTO savings_data (
        user_id,
        balance,
        salary,
        rent,
        card,
        friend_club,
        horse_club,
        updated_at
      )
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
      Number(values.balance ?? 0),
      Number(values.salary ?? 0),
      Number(values.rent ?? 0),
      Number(values.card ?? 0),
      Number(values.friendClub ?? 0),
      Number(values.horseClub ?? 0),
    ],
  });

  return values;
}

/**
 * 固定設定取得
 */
export async function getUserSettings(
  userId: string
): Promise<UserSettings> {
  if (!tursoClient) {
    return defaultUserSettings;
  }

  const result = await tursoClient.execute({
    sql: `
      SELECT
        base_salary,
        rent
      FROM user_settings
      WHERE user_id = ?
    `,
    args: [userId],
  });

const row = result.rows[0] as unknown as
  | {
      base_salary: number | string;
      rent: number | string;
    }
  | undefined;

  if (!row) {
    return defaultUserSettings;
  }

  return {
    base_salary: Number(row.base_salary ?? 0),
    rent: Number(row.rent ?? 0),
  };
}

/**
 * 固定設定保存
 */
export async function saveUserSettings(
  userId: string,
  settings: UserSettings
): Promise<UserSettings> {
  if (!tursoClient) {
    return settings;
  }

  await tursoClient.execute({
    sql: `
      INSERT INTO user_settings (
        user_id,
        base_salary,
        rent,
        updated_at
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(user_id) DO UPDATE SET
        base_salary = excluded.base_salary,
        rent = excluded.rent,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      userId,
      Number(settings.base_salary ?? 0),
      Number(settings.rent ?? 0),
    ],
  });

  return settings;
}

function mapMonthlyRow(row: unknown): MonthlySavings {
  const r = row as {
    year: number | string;
    month: number | string;
    card: number | string;
    horse_club: number | string;
    friend_club: number | string;
    fire_insurance: number | string;
    balance: number | string;
  };

  return {
    year: Number(r.year ?? 0),
    month: Number(r.month ?? 0),
    card: Number(r.card ?? 0),
    horse_club: Number(r.horse_club ?? 0),
    friend_club: Number(r.friend_club ?? 0),
    fire_insurance: Number(r.fire_insurance ?? 0),
    balance: Number(r.balance ?? 0),
  };
}

/**
 * 指定年の月別データ取得
 */
export async function getMonthlySavingsForUser(
  userId: string,
  year: number
): Promise<MonthlySavings[]> {
  if (!tursoClient) {
    return [];
  }

  const result = await tursoClient.execute({
    sql: `
      SELECT
        year,
        month,
        card,
        horse_club,
        friend_club,
        fire_insurance,
        balance
      FROM monthly_savings
      WHERE user_id = ?
        AND year = ?
      ORDER BY month ASC
    `,
    args: [userId, year],
  });

  return result.rows.map(mapMonthlyRow);
}

/**
 * 開始年月以降の月別データ取得
 */
export async function getMonthlySavingsFrom(
  userId: string,
  fromYear: number,
  fromMonth: number
): Promise<MonthlySavings[]> {
  if (!tursoClient) {
    return [];
  }

  const result = await tursoClient.execute({
    sql: `
      SELECT
        year,
        month,
        card,
        horse_club,
        friend_club,
        fire_insurance,
        balance
      FROM monthly_savings
      WHERE user_id = ?
        AND (year > ? OR (year = ? AND month >= ?))
      ORDER BY year ASC, month ASC
    `,
    args: [userId, fromYear, fromYear, fromMonth],
  });

  return result.rows.map(mapMonthlyRow);
}

/**
 * 月別データ保存
 */
export async function saveMonthlySavings(
  userId: string,
  data: MonthlySavings
): Promise<MonthlySavings> {
  if (!tursoClient) {
    return data;
  }

  await tursoClient.execute({
    sql: `
      INSERT INTO monthly_savings (
        user_id,
        year,
        month,
        card,
        horse_club,
        friend_club,
        fire_insurance,
        balance,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(user_id, year, month) DO UPDATE SET
        card = excluded.card,
        horse_club = excluded.horse_club,
        friend_club = excluded.friend_club,
        fire_insurance = excluded.fire_insurance,
        balance = excluded.balance,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      userId,
      Number(data.year),
      Number(data.month),
      Number(data.card ?? 0),
      Number(data.horse_club ?? 0),
      Number(data.friend_club ?? 0),
      Number(data.fire_insurance ?? 0),
      Number(data.balance ?? 0),
    ],
  });

  return data;
}

export async function saveMonthlySavingsBatch(
  userId: string,
  items: MonthlySavings[]
): Promise<MonthlySavings[]> {
  const saved: MonthlySavings[] = [];

  for (const item of items) {
    saved.push(await saveMonthlySavings(userId, item));
  }

  return saved;
}