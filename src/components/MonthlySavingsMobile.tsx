import {
  Card,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  calculateMonthNet,
  findMonthlyData,
  getSalaryForMonth,
  monthKey,
  toSafeNumber,
  type MonthColumn,
  type MonthlySavings,
  type UserSettings,
} from "@/lib/savings";

type MonthlySavingsMobileProps = {
  displayYear: number;
  visibleMonths: MonthColumn[];
  settings: UserSettings;
  monthlySavings: MonthlySavings[];
  horseClubInputs: Record<string, string>;
  monthEndByMonth: Record<number, number>;
  onMonthlyUpdate: (
    month: number,
    field: keyof Omit<MonthlySavings, "year" | "month" | "balance">,
    value: string
  ) => void;
  onHorseClubUpdate: (month: number, rawValue: string) => void;
};

export default function MonthlySavingsMobile({
  displayYear,
  visibleMonths,
  settings,
  monthlySavings,
  horseClubInputs,
  monthEndByMonth,
  onMonthlyUpdate,
  onHorseClubUpdate,
}: MonthlySavingsMobileProps) {
  return (
    <Stack gap="md">
      {visibleMonths.map(({ month, label }) => {
        const data = findMonthlyData(monthlySavings, displayYear, month);
        const net = calculateMonthNet(settings, displayYear, month, data);
        const monthEnd = toSafeNumber(monthEndByMonth[month]);
        const draftKey = monthKey(displayYear, month);
        const salary = getSalaryForMonth(
          settings.base_salary,
          displayYear,
          month
        );

        return (
          <Card key={month} radius="md" p="md" withBorder>
            <Title order={4} mb="sm">
              {displayYear}年{label}
            </Title>

            <Stack gap="xs">
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  給与
                  {month === 11 ? "（11月加算込み）" : ""}
                </Text>
                <Text size="sm" fw={500}>
                  ¥{salary.toLocaleString()}
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  家賃
                </Text>
                <Input
                  value={
                    data?.rent === null || data?.rent === undefined
                      ? String(settings.rent || "")
                      : String(data.rent)
                  }
                  size="sm"
                  inputMode="numeric"
                  placeholder={String(settings.rent || 0)}
                  onChange={(event) =>
                    onMonthlyUpdate(month, "rent", event.currentTarget.value)
                  }
                />
              </div>

              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  賞与
                </Text>
                <Input
                  value={String(data?.bonus ?? "")}
                  size="sm"
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(event) =>
                    onMonthlyUpdate(month, "bonus", event.currentTarget.value)
                  }
                />
              </div>

              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  火災保険
                </Text>
                <Input
                  value={String(data?.fire_insurance ?? "")}
                  size="sm"
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(event) =>
                    onMonthlyUpdate(
                      month,
                      "fire_insurance",
                      event.currentTarget.value
                    )
                  }
                />
              </div>

              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  カード
                </Text>
                <Input
                  value={String(data?.card ?? "")}
                  size="sm"
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(event) =>
                    onMonthlyUpdate(month, "card", event.currentTarget.value)
                  }
                />
              </div>

              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  馬主（マイナス=収入）
                </Text>
                <Input
                  value={
                    horseClubInputs[draftKey] ??
                    (data?.horse_club == null ? "" : String(data.horse_club))
                  }
                  size="sm"
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(event) =>
                    onHorseClubUpdate(month, event.currentTarget.value)
                  }
                />
              </div>

              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  友の会
                </Text>
                <Input
                  value={String(data?.friend_club ?? "")}
                  size="sm"
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(event) =>
                    onMonthlyUpdate(
                      month,
                      "friend_club",
                      event.currentTarget.value
                    )
                  }
                />
              </div>
            </Stack>

            <SimpleGrid cols={2} spacing="xs" mt="md">
              <div>
                <Text size="xs" c="dimmed">
                  今月の収支
                </Text>
                <Text size="sm" fw={700} c={net >= 0 ? "green" : "red"}>
                  ¥{net.toLocaleString()}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  月末貯金額
                </Text>
                <Text
                  size="sm"
                  fw={700}
                  c={monthEnd >= 0 ? "green" : "red"}
                >
                  ¥{monthEnd.toLocaleString()}
                </Text>
              </div>
            </SimpleGrid>
          </Card>
        );
      })}
    </Stack>
  );
}
