import { apiGet, apiPost } from "@/api/client";
import {
  PLAN_START_MONTH,
  PLAN_START_YEAR,
  type MonthlySavings,
} from "@/lib/savings";

export function fetchMonthlySavings(
  userId: string,
  fromYear = PLAN_START_YEAR,
  fromMonth = PLAN_START_MONTH
) {
  const params = new URLSearchParams({
    userId,
    fromYear: String(fromYear),
    fromMonth: String(fromMonth),
  });

  return apiGet<MonthlySavings[]>(`/api/monthly?${params.toString()}`);
}

export function saveMonthlySavings(
  userId: string,
  items: MonthlySavings[]
) {
  return apiPost<MonthlySavings[]>("/api/monthly", {
    userId,
    items,
  });
}
