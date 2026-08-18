import { apiGet, apiPost } from "@/api/client";
import type { UserSettings } from "@/lib/savings";

export function fetchSettings(userId: string) {
  return apiGet<UserSettings>(
    `/api/settings?userId=${encodeURIComponent(userId)}`
  );
}

export function saveSettings(userId: string, settings: UserSettings) {
  return apiPost<UserSettings>("/api/settings", {
    userId,
    ...settings,
  });
}
