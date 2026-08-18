import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";

import {
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
  IconChevronLeft,
  IconChevronRight,
  IconPigMoney,
  IconReceipt,
  IconTrash,
  IconSettings,
} from "@tabler/icons-react";

import { fetchMonthlySavings, saveMonthlySavings } from "@/api/monthly";
import { fetchStartingSavings, saveStartingSavings } from "@/api/savings";
import { fetchSettings } from "@/api/settings";

import {
  PLAN_START_YEAR,
  calculateCumulativeByMonth,
  calculateCumulativeThrough,
  calculateMonthNet,
  emptyMonthlyData,
  findMonthlyData,
  getCurrentPlanningMonth,
  getMonthsForYear,
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

function DashboardContent({
  isSaving,
  setIsSaving,
  message,
  setMessage,
  userName,
  userEmail,
  userId,
}: {
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
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

  const cumulativeByMonth = useMemo(
    () =>
      calculateCumulativeByMonth(
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
        findMonthlyData(
          monthlySavings,
          planningMonth.year,
          planningMonth.month
        )
      ),
    [settings, monthlySavings, planningMonth]
  );

  const cumulativeSavings = useMemo(
    () =>
      calculateCumulativeThrough(
        startingSavings,
        settings,
        monthlySavings,
        planningMonth.year,
        planningMonth.month
      ),
    [startingSavings, settings, monthlySavings, planningMonth]
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
        setMessage(
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
  }, [userId, setMessage]);

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
      ...(existingData ?? emptyMonthlyData(displayYear, month)),
      year: displayYear,
      month,
      [field]: numericValue,
    };

    updatedData.balance = calculateMonthNet(settings, updatedData);

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
    setMessage("");

    try {
      await saveStartingSavings(resolvedUserId, startingSavings);

      if (monthlySavings.length > 0) {
        await saveMonthlySavings(resolvedUserId, monthlySavings);
      }

      setMessage("保存しました。Turso に反映されています。");
    } catch (error) {
      console.error("保存エラー:", error);
      setMessage(
        error instanceof Error ? error.message : "保存に失敗しました"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStartingSavingsInput("");
    setHorseClubInputs({});
  };

  if (isLoadingSettings) {
    return <Loader />;
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between">
            <Text fw={600}>今月の収支</Text>
            <IconPigMoney size={20} color="#1c7ed6" />
          </Group>

          <Title order={2} mt="sm">
            ¥{toSafeNumber(currentMonthNet).toLocaleString()}
          </Title>

          <Text c="dimmed" size="sm">
            {planningMonth.year}年{planningMonth.month}月 / 給与 - 家賃 -
            火災保険 - カード - 友の会 - 馬主
          </Text>
        </Card>

        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between">
            <Text fw={600}>累計貯金額（見積もり）</Text>
            <IconReceipt size={20} color="#2f9e44" />
          </Group>

          <Title order={2} mt="sm">
            ¥{toSafeNumber(cumulativeSavings).toLocaleString()}
          </Title>

          <Text c="dimmed" size="sm">
            2026年8月の開始額 + 各月の収支
          </Text>
        </Card>

        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between">
            <Text fw={600}>利用ユーザー</Text>
            <ActionIcon
              variant="light"
              color="gray"
              aria-label="Reset"
              onClick={handleReset}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>

          <Title order={2} mt="sm">
            {userName}
          </Title>

          <Text c="dimmed" size="sm">
            {userEmail}
          </Text>
        </Card>
      </SimpleGrid>

      <Paper radius="lg" p="lg" withBorder mt="lg">
        <Title order={3}>開始貯金額</Title>
        <Text c="dimmed" size="sm" mt="xs" mb="md">
          2026年8月から貯金計画を開始します。開始時点の貯金額を入力すると、毎月の収支を足した累計見積もりが計算されます。
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

      <Paper radius="lg" p="lg" withBorder mt="lg">
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ActionIcon
              variant="light"
              aria-label="前の年"
              disabled={displayYear <= PLAN_START_YEAR}
              onClick={() => setDisplayYear((year) => year - 1)}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>

            <Title order={3}>
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

          <Group>
            <Button
              component={Link}
              href="/settings"
              leftSection={<IconSettings size={16} />}
              variant="light"
            >
              設定
            </Button>

            <Button variant="light" color="gray" onClick={handleReset}>
              リセット
            </Button>

            <Button onClick={handleSave} loading={isSaving}>
              保存
            </Button>
          </Group>
        </Group>

        {displayYear === PLAN_START_YEAR ? (
          <Alert mb="lg">
            この計画は2026年8月から開始します。1月から7月は表示しません。
          </Alert>
        ) : null}

        {message ? <Alert mb="lg">{message}</Alert> : null}

        <div style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>項目</Table.Th>
                {visibleMonths.map(({ month, label }) => (
                  <Table.Th
                    key={month}
                    style={{ textAlign: "center", minWidth: 100 }}
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
                      ¥{toSafeNumber(settings.base_salary).toLocaleString()}
                    </Text>
                  </Table.Td>
                ))}
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>家賃</Table.Td>
                {visibleMonths.map(({ month }) => (
                  <Table.Td
                    key={`rent-${month}`}
                    style={{ textAlign: "center" }}
                  >
                    <Text size="sm">
                      ¥{toSafeNumber(settings.rent).toLocaleString()}
                    </Text>
                  </Table.Td>
                ))}
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

              <Table.Tr bg="blue.0">
                <Table.Td fw={700} c="blue">
                  今月の収支
                </Table.Td>
                {visibleMonths.map(({ month }) => {
                  const net = calculateMonthNet(
                    settings,
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

              <Table.Tr bg="green.0">
                <Table.Td fw={700} c="green.8">
                  累計貯金額
                </Table.Td>
                {visibleMonths.map(({ month }) => {
                  const cumulative = toSafeNumber(
                    cumulativeByMonth[month]
                  );

                  return (
                    <Table.Td
                      key={`cumulative-${month}`}
                      style={{ textAlign: "center" }}
                    >
                      <Text
                        fw={700}
                        size="sm"
                        c={cumulative >= 0 ? "green" : "red"}
                      >
                        ¥{cumulative.toLocaleString()}
                      </Text>
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </div>
      </Paper>
    </>
  );
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!isLoaded) {
    return <Loader />;
  }

  if (!isSignedIn) {
    return (
      <>
        <Head>
          <title>ログインが必要です</title>
        </Head>

        <Container size="sm" py={80}>
          <Paper radius="lg" p="xl" withBorder>
            <Stack align="center" gap="md">
              <Title order={2}>ログインが必要です</Title>
              <Text c="dimmed" ta="center">
                この画面は認証済みユーザーのみ利用できます。
              </Text>
              <Button component={Link} href="/login" color="blue">
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

      <Container size="xl" py={40}>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <div>
              <Text tt="uppercase" c="blue" fw={700} size="sm">
                Saving dashboard
              </Text>
              <Title order={1} mt={8}>
                貯金計算
              </Title>
            </div>

            <Group>
              <Button
                component={Link}
                href="/"
                leftSection={<IconArrowLeft size={16} />}
                variant="light"
              >
                ホームに戻る
              </Button>

              <SignOutButton>
                <Button variant="filled" color="red">
                  ログアウト
                </Button>
              </SignOutButton>
            </Group>
          </Group>

          <Alert>
            2026年8月から毎月の収支と累計貯金額を見積もれます。Clerk
            のログイン状態でデータが保持されます。
          </Alert>

          <DashboardContent
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            message={message}
            setMessage={setMessage}
            userName={userName}
            userEmail={userEmail}
            userId={userId}
          />
        </Stack>
      </Container>
    </>
  );
}
