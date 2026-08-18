import { apiGet, apiPost } from "@/api/client";
import type { SavingsValues } from "@/lib/savings";

export function fetchStartingSavings(userId: string) {
  return apiGet<SavingsValues>(
    `/api/savings?userId=${encodeURIComponent(userId)}`
  );
}

export function saveStartingSavings(userId: string, balance: number) {
  return apiPost<SavingsValues>("/api/savings", {
    userId,
    balance,
  });
}
