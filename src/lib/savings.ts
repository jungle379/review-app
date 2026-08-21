export const PLAN_START_YEAR = 2026;
export const PLAN_START_MONTH = 8;
export const ANNUAL_SALARY_RAISE = 20000;
export const SALARY_RAISE_MONTH = 11;

export type SavingsValues = {
  balance: number;
  salary: number;
  rent: number;
  fireInsurance: number;
  card: number;
  horseClub: number;
  friendClub: number;
};

export type UserSettings = {
  base_salary: number;
  rent: number;
};

export type MonthlySavings = {
  year: number;
  month: number;
  /** null のときは設定の家賃を使う */
  rent: number | null;
  bonus: number;
  card: number;
  horse_club: number;
  friend_club: number;
  fire_insurance: number;
  balance: number;
};

export type MonthColumn = {
  month: number;
  label: string;
};

export const defaultSavingsValues: SavingsValues = {
  balance: 0,
  salary: 0,
  rent: 0,
  fireInsurance: 0,
  card: 0,
  horseClub: 0,
  friendClub: 0,
};

export const defaultUserSettings: UserSettings = {
  base_salary: 0,
  rent: 0,
};

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

export function toSafeNumber(value: unknown): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function isValidSignedNumericInput(value: string): boolean {
  return value === "" || /^-?\d*\.?\d*$/.test(value);
}

export function parseSignedNumericInput(value: string): number {
  const trimmed = value.trim();

  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return 0;
  }

  return toSafeNumber(trimmed);
}

export function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

export function getCurrentPlanningMonth(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (
    year < PLAN_START_YEAR ||
    (year === PLAN_START_YEAR && month < PLAN_START_MONTH)
  ) {
    return {
      year: PLAN_START_YEAR,
      month: PLAN_START_MONTH,
    };
  }

  return { year, month };
}

export function getMonthsForYear(year: number): MonthColumn[] {
  if (year < PLAN_START_YEAR) {
    return [];
  }

  const startMonth =
    year === PLAN_START_YEAR ? PLAN_START_MONTH : 1;

  return MONTH_LABELS.slice(startMonth - 1).map((label, index) => ({
    month: startMonth + index,
    label,
  }));
}

/**
 * 基本給与に対し、毎年11月から2万円ずつ加算した給与を返す。
 * 例: 2026/8〜10 → 基本給、2026/11〜2027/10 → 基本給+2万、2027/11〜 → 基本給+4万
 */
export function getSalaryForMonth(
  baseSalary: number,
  year: number,
  month: number
): number {
  let raises = 0;

  for (let y = PLAN_START_YEAR; y <= year; y += 1) {
    const raiseApplies =
      y < year || (y === year && month >= SALARY_RAISE_MONTH);

    if (!raiseApplies) {
      continue;
    }

    if (y > PLAN_START_YEAR || PLAN_START_MONTH <= SALARY_RAISE_MONTH) {
      raises += 1;
    }
  }

  return toSafeNumber(baseSalary) + raises * ANNUAL_SALARY_RAISE;
}

export function getEffectiveRent(
  settings: UserSettings,
  data?: Partial<MonthlySavings> | null
): number {
  if (data && data.rent !== undefined && data.rent !== null) {
    return toSafeNumber(data.rent);
  }

  return toSafeNumber(settings.rent);
}

export function calculateMonthNet(
  settings: UserSettings,
  year: number,
  month: number,
  data?: Partial<MonthlySavings> | null
): number {
  const salary = getSalaryForMonth(settings.base_salary, year, month);
  const rent = getEffectiveRent(settings, data);
  const bonus = toSafeNumber(data?.bonus);

  return (
    salary +
    bonus -
    rent -
    toSafeNumber(data?.fire_insurance) -
    toSafeNumber(data?.card) -
    toSafeNumber(data?.horse_club) -
    toSafeNumber(data?.friend_club)
  );
}

export function findMonthlyData(
  list: MonthlySavings[],
  year: number,
  month: number
): MonthlySavings | undefined {
  return list.find(
    (item) => item.year === year && item.month === month
  );
}

/**
 * 開始貯金額から各月末の貯金額を算出する。
 * 未入力月は給与・家賃（設定値）のみで見積もる。
 */
export function calculateMonthEndByMonth(
  startingSavings: number,
  settings: UserSettings,
  monthlyList: MonthlySavings[],
  displayYear: number
): Record<number, number> {
  let runningTotal = toSafeNumber(startingSavings);
  const result: Record<number, number> = {};

  for (let year = PLAN_START_YEAR; year <= displayYear; year += 1) {
    const months = getMonthsForYear(year);

    for (const { month } of months) {
      const data = findMonthlyData(monthlyList, year, month);
      runningTotal += calculateMonthNet(settings, year, month, data);

      if (year === displayYear) {
        result[month] = runningTotal;
      }
    }
  }

  return result;
}

export function calculateMonthEndThrough(
  startingSavings: number,
  settings: UserSettings,
  monthlyList: MonthlySavings[],
  throughYear: number,
  throughMonth: number
): number {
  let runningTotal = toSafeNumber(startingSavings);

  for (let year = PLAN_START_YEAR; year <= throughYear; year += 1) {
    const months = getMonthsForYear(year);

    for (const { month } of months) {
      if (year === throughYear && month > throughMonth) {
        break;
      }

      const data = findMonthlyData(monthlyList, year, month);
      runningTotal += calculateMonthNet(settings, year, month, data);
    }
  }

  return runningTotal;
}

/** 指定年の12月末（計画開始前の年は開始月以降のみ）時点の貯金額 */
export function calculateYearEndSavings(
  startingSavings: number,
  settings: UserSettings,
  monthlyList: MonthlySavings[],
  year: number
): number {
  const months = getMonthsForYear(year);
  const lastMonth = months[months.length - 1]?.month ?? 12;

  return calculateMonthEndThrough(
    startingSavings,
    settings,
    monthlyList,
    year,
    lastMonth
  );
}

export function calculateMonthlyNet(data: SavingsValues) {
  return (
    data.salary -
    data.rent -
    data.fireInsurance -
    data.card -
    data.horseClub -
    data.friendClub
  );
}

export function calculateTotalSavings(data: SavingsValues) {
  return data.balance + calculateMonthlyNet(data);
}

export function normalizeSettings(
  data: Partial<UserSettings> | null | undefined
): UserSettings {
  return {
    base_salary: toSafeNumber(data?.base_salary),
    rent: toSafeNumber(data?.rent),
  };
}

export function normalizeMonthlyData(
  data: Partial<MonthlySavings> & {
    fire_Insurace?: number;
  } | null | undefined,
  year: number,
  month: number
): MonthlySavings {
  return {
    year: toSafeNumber(data?.year ?? year),
    month: toSafeNumber(data?.month ?? month),
    rent:
      data?.rent !== undefined && data?.rent !== null
        ? toSafeNumber(data.rent)
        : null,
    bonus: toSafeNumber(data?.bonus),
    fire_insurance: toSafeNumber(
      data?.fire_insurance ?? data?.fire_Insurace
    ),
    card: toSafeNumber(data?.card),
    horse_club: toSafeNumber(data?.horse_club),
    friend_club: toSafeNumber(data?.friend_club),
    balance: toSafeNumber(data?.balance),
  };
}

export function emptyMonthlyData(
  year: number,
  month: number,
  settings?: UserSettings
): MonthlySavings {
  return {
    year,
    month,
    rent: settings ? toSafeNumber(settings.rent) : null,
    bonus: 0,
    card: 0,
    horse_club: 0,
    friend_club: 0,
    fire_insurance: 0,
    balance: 0,
  };
}
