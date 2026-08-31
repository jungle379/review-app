import { apiGet, apiPost } from "@/api/client";
import {
  getCurrentPlanningMonth,
  type MonthlySavings,
} from "@/lib/savings";

export function fetchMonthlySavings(
  userId: string,
  fromYear?: number,
  fromMonth?: number
) {
  const planningMonth = getCurrentPlanningMonth();
  const resolvedYear = fromYear ?? planningMonth.year;
  const resolvedMonth = fromMonth ?? planningMonth.month;
  const params = new URLSearchParams({
    userId,
    fromYear: String(resolvedYear),
    fromMonth: String(resolvedMonth),
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
