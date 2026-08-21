import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";

import {
  Box,
  ActionIcon,
  Alert,
  Button,
  Card,
  Container,
  Group,
  Input,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import {
  IconArrowLeft,
  IconCalendarStats,
  IconChevronLeft,
  IconChevronRight,
  IconPigMoney,
  IconWallet,
  IconSettings,
} from "@tabler/icons-react";

import { fetchMonthlySavings, saveMonthlySavings } from "@/api/monthly";
import { fetchStartingSavings, saveStartingSavings } from "@/api/savings";
import { fetchSettings } from "@/api/settings";

import {
  PLAN_START_YEAR,
  calculateMonthEndByMonth,
  calculateMonthEndThrough,
  calculateMonthNet,
  calculateYearEndSavings,
  emptyMonthlyData,
  findMonthlyData,
  getCurrentPlanningMonth,
  getMonthsForYear,
  getSalaryForMonth,
  isValidSignedNumericInput,
  monthKey,
  normalizeMonthlyData,
  normalizeSettings,
  parseSignedNumericInput,
  toSafeNumber,
  type MonthlySavings,
  type UserSettings,
} from "@/lib/savings";

import Loader from "@/components/Loader";
import MonthlySavingsMobile from "@/components/MonthlySavingsMobile";
import ResponsiveButtonGroup from "@/components/ResponsiveButtonGroup";
import { toast } from "sonner";

// ダッシュボードのコンテンツ
function DashboardContent({
  isSaving,
  setIsSaving,
  userName,
  userEmail,
  userId,
}: {
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  userName: string;
  userEmail: string;
  userId?: string;
}) {
  const planningMonth = useMemo(() => getCurrentPlanningMonth(), []);

  const [settings, setSettings] = useState<UserSettings>({
    base_salary: 0,
    rent: 0,
  });

  const [monthlySavings, setMonthlySavings] = useState<MonthlySavings[]>(
    []
  );

  const [startingSavingsInput, setStartingSavingsInput] = useState("");
  const [horseClubInputs, setHorseClubInputs] = useState<
    Record<string, string>
  >({});

  const [displayYear, setDisplayYear] = useState(planningMonth.year);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const visibleMonths = useMemo(
    () => getMonthsForYear(displayYear),
    [displayYear]
  );

  const startingSavings = parseSignedNumericInput(startingSavingsInput);

  const monthEndByMonth = useMemo(
    () =>
      calculateMonthEndByMonth(
        startingSavings,
        settings,
        monthlySavings,
        displayYear
      ),
    [startingSavings, settings, monthlySavings, displayYear]
  );

  const currentMonthNet = useMemo(
    () =>
      calculateMonthNet(
        settings,
        planningMonth.year,
        planningMonth.month,
        findMonthlyData(
          monthlySavings,
          planningMonth.year,
          planningMonth.month
        )
      ),
    [settings, monthlySavings, planningMonth]
  );

  const currentMonthEndSavings = useMemo(
    () =>
      calculateMonthEndThrough(
        startingSavings,
        settings,
        monthlySavings,
        planningMonth.year,
        planningMonth.month
      ),
    [startingSavings, settings, monthlySavings, planningMonth]
  );

  const displayYearEndSavings = useMemo(
    () =>
      calculateYearEndSavings(
        startingSavings,
        settings,
        monthlySavings,
        displayYear
      ),
    [startingSavings, settings, monthlySavings, displayYear]
  );

  useEffect(() => {
    if (!userId) {
      setIsLoadingSettings(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const [settingsData, monthlyData, savingsData] = await Promise.all([
          fetchSettings(userId),
          fetchMonthlySavings(userId),
          fetchStartingSavings(userId),
        ]);

        if (!isMounted) {
          return;
        }

        setSettings(normalizeSettings(settingsData));
        setMonthlySavings(
          monthlyData.map((item) =>
            normalizeMonthlyData(
              item,
              toSafeNumber(item.year),
              toSafeNumber(item.month)
            )
          )
        );
        setStartingSavingsInput(
          savingsData.balance ? String(savingsData.balance) : ""
        );
        setHorseClubInputs({});
      } catch (error) {
        console.error("データ取得エラー:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "データの取得に失敗しました"
        );
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // 月別収支表の更新処理
  const handleMonthlyUpdate = (
    month: number,
    field: keyof Omit<MonthlySavings, "year" | "month" | "balance">,
    value: number | string
  ) => {
    const numericValue = toSafeNumber(value);
    const existingData = findMonthlyData(
      monthlySavings,
      displayYear,
      month
    );
    const updatedData: MonthlySavings = {
      ...(existingData ?? emptyMonthlyData(displayYear, month, settings)),
      year: displayYear,
      month,
      [field]: numericValue,
    };

    updatedData.balance = calculateMonthNet(
      settings,
      displayYear,
      month,
      updatedData
    );

    setMonthlySavings((previous) =>
      [
        ...previous.filter(
          (data) =>
            !(data.year === displayYear && data.month === month)
        ),
        updatedData,
      ].sort((a, b) => a.year - b.year || a.month - b.month)
    );
  };

  const handleHorseClubUpdate = (month: number, rawValue: string) => {
    if (!isValidSignedNumericInput(rawValue)) {
      return;
    }

    setHorseClubInputs((previous) => ({
      ...previous,
      [monthKey(displayYear, month)]: rawValue,
    }));

    handleMonthlyUpdate(
      month,
      "horse_club",
      parseSignedNumericInput(rawValue)
    );
  };

  const handleStartingSavingsChange = (rawValue: string) => {
    if (!isValidSignedNumericInput(rawValue)) {
      return;
    }

    setStartingSavingsInput(rawValue);
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const resolvedUserId = userId || userName || "local-user";

    setIsSaving(true);

    try {
      await saveStartingSavings(resolvedUserId, startingSavings);

      if (monthlySavings.length > 0) {
        await saveMonthlySavings(resolvedUserId, monthlySavings);
      }

      toast.success("保存しました");
    } catch (error) {
      console.error("保存エラー:", error);
      toast.error(
        error instanceof Error ? error.message : "保存に失敗しました"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStartingSavingsInput("");
    setHorseClubInputs({});
    toast.message("入力をリセットしました");
  };

  if (isLoadingSettings) {
    return <Loader />;
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Card radius="lg" p={{ base: "md", md: "lg" }} withBorder>
          <Group justify="space-between">
            <Text fw={600}>今月の収支</Text>
            <IconPigMoney size={20} color="#1c7ed6" />
          </Group>

          <Title order={2} mt="sm" fz={{ base: 24, md: 32 }}>
            ¥{toSafeNumber(currentMonthNet).toLocaleString()}
          </Title>

          <Text c="dimmed" size="sm">
            {planningMonth.year}年{planningMonth.month}月
          </Text>
          <Text c="dimmed" size="xs" visibleFrom="sm">
            給与 + 賞与 - 家賃 - 諸経費
          </Text>
        </Card>

        <Card radius="lg" p={{ base: "md", md: "lg" }} withBorder>
          <Group justify="space-between">
            <Text fw={600}>今月末の貯金額</Text>
            <IconWallet size={20} color="#2f9e44" />
          </Group>

          <Title order={2} mt="sm" fz={{ base: 24, md: 32 }}>
            ¥{toSafeNumber(currentMonthEndSavings).toLocaleString()}
          </Title>

          <Text c="dimmed" size="sm">
            開始残高 + 各月の収支（〜
            {planningMonth.year}年{planningMonth.month}月）
          </Text>
        </Card>

        <Card radius="lg" p={{ base: "md", md: "lg" }} withBorder>
          <Group justify="space-between">
            <Text fw={600}>年末の貯金額</Text>
            <IconCalendarStats size={20} color="#e67700" />
          </Group>

          <Title order={2} mt="sm" fz={{ base: 24, md: 32 }}>
            ¥{toSafeNumber(displayYearEndSavings).toLocaleString()}
          </Title>

          <Text c="dimmed" size="sm">
            {displayYear}年12月末時点の見積もり
          </Text>
        </Card>

        <Card radius="lg" p={{ base: "md", md: "lg" }} withBorder>
          <Group justify="space-between">
            <Text fw={600}>利用ユーザー</Text>
          </Group>

          <Title order={2} mt="sm" fz={{ base: 20, md: 24 }}>
            {userName}
          </Title>

          <Text c="dimmed" size="sm">
            {userEmail}
          </Text>
        </Card>
      </SimpleGrid>

      <Paper radius="lg" p={{ base: "md", md: "lg" }} withBorder mt="lg">
        <Title order={3} fz={{ base: 20, md: 24 }}>
          開始貯金額
        </Title>
        <Text c="dimmed" size="sm" mt="xs" mb="md">
          2026年8月時点の残高です。各月の収支を足したものが月末・年末の貯金額になります。
        </Text>

        <Input
          value={startingSavingsInput}
          inputMode="decimal"
          placeholder="0"
          size="md"
          onChange={(event) =>
            handleStartingSavingsChange(event.currentTarget.value)
          }
        />
      </Paper>

      <Paper radius="lg" p={{ base: "md", md: "lg" }} withBorder mt="lg">
        <Stack gap="md" mb="lg">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                variant="light"
                aria-label="前の年"
                disabled={displayYear <= PLAN_START_YEAR}
                onClick={() => setDisplayYear((year) => year - 1)}
              >
                <IconChevronLeft size={16} />
              </ActionIcon>

              <Title order={3} fz={{ base: 18, md: 24 }}>
                月別収支表（{displayYear}年）
              </Title>

              <ActionIcon
                variant="light"
                aria-label="次の年"
                onClick={() => setDisplayYear((year) => year + 1)}
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          </Group>

          <ResponsiveButtonGroup
            items={[
              {
                key: "settings",
                label: "設定",
                buttonProps: {
                  component: Link,
                  href: "/settings",
                  leftSection: <IconSettings size={16} />,
                  variant: "light",
                },
              },
              {
                key: "reset",
                label: "リセット",
                buttonProps: {
                  variant: "light",
                  color: "gray",
                  onClick: handleReset,
                },
              },
              {
                key: "save",
                label: "保存",
                buttonProps: {
                  onClick: handleSave,
                  loading: isSaving,
                },
              },
            ]}
          />
        </Stack>

        {displayYear === PLAN_START_YEAR ? (
          <Alert mb="lg">
            この計画は2026年8月から開始します。1月から7月は表示しません。
          </Alert>
        ) : null}

        <Box hiddenFrom="md">
          <MonthlySavingsMobile
            displayYear={displayYear}
            visibleMonths={visibleMonths}
            settings={settings}
            monthlySavings={monthlySavings}
            horseClubInputs={horseClubInputs}
            monthEndByMonth={monthEndByMonth}
            onMonthlyUpdate={(month, field, value) =>
              handleMonthlyUpdate(month, field, value)
            }
            onHorseClubUpdate={handleHorseClubUpdate}
          />
        </Box>

        <Box visibleFrom="md">
          <Text size="xs" c="dimmed" mb="xs">
            表は左右にスクロールできます。左端の項目名は固定されます。
          </Text>
          <div className="table-scroll-wrapper">
            <Table striped highlightOnHover className="table-sticky-first">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 88 }}>項目</Table.Th>
                  {visibleMonths.map(({ month, label }) => (
                    <Table.Th
                      key={month}
                      style={{ textAlign: "center", minWidth: 96 }}
                    >
                      {label}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                <Table.Tr>
                  <Table.Td fw={600}>給与</Table.Td>
                  {visibleMonths.map(({ month }) => (
                    <Table.Td
                      key={`salary-${month}`}
                      style={{ textAlign: "center" }}
                    >
                      <Text size="sm">
                        ¥
                        {getSalaryForMonth(
                          settings.base_salary,
                          displayYear,
                          month
                        ).toLocaleString()}
                      </Text>
                    </Table.Td>
                  ))}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>家賃</Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const data = findMonthlyData(
                      monthlySavings,
                      displayYear,
                      month
                    );

                    return (
                      <Table.Td key={`rent-${month}`}>
                        <Input
                          value={
                            data?.rent === null || data?.rent === undefined
                              ? String(settings.rent || "")
                              : String(data.rent)
                          }
                          size="xs"
                          inputMode="numeric"
                          placeholder={String(settings.rent || 0)}
                          onChange={(event) =>
                            handleMonthlyUpdate(
                              month,
                              "rent",
                              event.currentTarget.value
                            )
                          }
                        />
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>賞与</Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const data = findMonthlyData(
                      monthlySavings,
                      displayYear,
                      month
                    );

                    return (
                      <Table.Td key={`bonus-${month}`}>
                        <Input
                          value={String(data?.bonus ?? "")}
                          size="xs"
                          inputMode="numeric"
                          placeholder="0"
                          onChange={(event) =>
                            handleMonthlyUpdate(
                              month,
                              "bonus",
                              event.currentTarget.value
                            )
                          }
                        />
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>火災保険</Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const data = findMonthlyData(
                      monthlySavings,
                      displayYear,
                      month
                    );

                    return (
                      <Table.Td key={`fire-insurance-${month}`}>
                        <Input
                          value={String(data?.fire_insurance ?? "")}
                          size="xs"
                          inputMode="numeric"
                          placeholder="0"
                          onChange={(event) =>
                            handleMonthlyUpdate(
                              month,
                              "fire_insurance",
                              event.currentTarget.value
                            )
                          }
                        />
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>カード</Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const data = findMonthlyData(
                      monthlySavings,
                      displayYear,
                      month
                    );

                    return (
                      <Table.Td key={`card-${month}`}>
                        <Input
                          value={String(data?.card ?? "")}
                          size="xs"
                          inputMode="numeric"
                          placeholder="0"
                          onChange={(event) =>
                            handleMonthlyUpdate(
                              month,
                              "card",
                              event.currentTarget.value
                            )
                          }
                        />
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>馬主</Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const data = findMonthlyData(
                      monthlySavings,
                      displayYear,
                      month
                    );
                    const draftKey = monthKey(displayYear, month);

                    return (
                      <Table.Td key={`horse-${month}`}>
                        <Input
                          value={
                            horseClubInputs[draftKey] ??
                            (data?.horse_club == null
                              ? ""
                              : String(data.horse_club))
                          }
                          size="xs"
                          inputMode="decimal"
                          placeholder="0"
                          onChange={(event) =>
                            handleHorseClubUpdate(
                              month,
                              event.currentTarget.value
                            )
                          }
                        />
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td fw={600}>友の会</Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const data = findMonthlyData(
                      monthlySavings,
                      displayYear,
                      month
                    );

                    return (
                      <Table.Td key={`friend-${month}`}>
                        <Input
                          value={String(data?.friend_club ?? "")}
                          size="xs"
                          inputMode="numeric"
                          placeholder="0"
                          onChange={(event) =>
                            handleMonthlyUpdate(
                              month,
                              "friend_club",
                              event.currentTarget.value
                            )
                          }
                        />
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr bg="blue.0" data-row="net">
                  <Table.Td fw={700} c="blue">
                    今月の収支
                  </Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const net = calculateMonthNet(
                      settings,
                      displayYear,
                      month,
                      findMonthlyData(monthlySavings, displayYear, month)
                    );

                    return (
                      <Table.Td
                        key={`net-${month}`}
                        style={{ textAlign: "center" }}
                      >
                        <Text
                          fw={600}
                          size="sm"
                          c={net >= 0 ? "green" : "red"}
                        >
                          ¥{net.toLocaleString()}
                        </Text>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>

                <Table.Tr bg="green.0" data-row="cumulative">
                  <Table.Td fw={700} c="green.8">
                    月末貯金額
                  </Table.Td>
                  {visibleMonths.map(({ month }) => {
                    const monthEnd = toSafeNumber(monthEndByMonth[month]);

                    return (
                      <Table.Td
                        key={`month-end-${month}`}
                        style={{ textAlign: "center" }}
                      >
                        <Text
                          fw={700}
                          size="sm"
                          c={monthEnd >= 0 ? "green" : "red"}
                        >
                          ¥{monthEnd.toLocaleString()}
                        </Text>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </div>
        </Box>
      </Paper>
    </>
  );
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  if (!isLoaded) {
    return <Loader />;
  }

  if (!isSignedIn) {
    return (
      <>
        <Head>
          <title>ログインが必要です</title>
        </Head>

        <Container size="sm" py={{ base: 40, md: 80 }} px="md">
          <Paper radius="lg" p="xl" withBorder>
            <Stack align="center" gap="md">
              <Title order={2}>ログインが必要です</Title>
              <Text c="dimmed" ta="center">
                この画面は認証済みユーザーのみ利用できます。
              </Text>
              <Button component={Link} href="/login" color="blue" size="md" fullWidth>
                ログイン画面へ
              </Button>
            </Stack>
          </Paper>
        </Container>
      </>
    );
  }

  const userName = user?.fullName ?? "ゲスト";
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? "未ログイン";
  const userId = user?.id ?? undefined;

  return (
    <>
      <Head>
        <title>貯金計算ダッシュボード</title>
      </Head>

      <Container size="xl" py={{ base: 24, md: 40 }} px={{ base: "md", md: "lg" }}>
        <Stack gap="lg">
          <Group
            justify="space-between"
            align="flex-start"
            wrap="wrap"
            gap="md"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text tt="uppercase" c="blue" fw={700} size="sm">
                Saving dashboard
              </Text>
              <Title order={1} mt={8} fz={{ base: 20, md: 34 }}>
                貯金計算
              </Title>
            </div>

            <ResponsiveButtonGroup
              items={[
                {
                  key: "home",
                  label: "ホームに戻る",
                  buttonProps: {
                    component: Link,
                    href: "/",
                    leftSection: <IconArrowLeft size={16} />,
                    variant: "light",
                  },
                },
                {
                  key: "logout",
                  label: "ログアウト",
                  buttonProps: {
                    variant: "filled",
                    color: "red",
                  },
                  wrap: (button) => <SignOutButton>{button}</SignOutButton>,
                },
              ]}
            />
          </Group>

          <Alert>
            2026年8月から毎月の収支・月末貯金額・年末貯金額を見積もれます。
          </Alert>  
          <DashboardContent
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            userName={userName}
            userEmail={userEmail}
            userId={userId}
          />
        </Stack>
      </Container>
    </>
  );
}
