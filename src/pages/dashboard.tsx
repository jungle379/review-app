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
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconPigMoney, IconReceipt, IconTrash, IconSettings } from "@tabler/icons-react";
import {
  calculateMonthlyNet,
  calculateTotalSavings,
  defaultSavingsValues,
  type SavingsValues,
} from "@/lib/savings";
import Loader from "@/components/Loader";

const STORAGE_KEY = "saving-planner-values";

interface UserSettings {
  base_salary: number;
  rent: number;
  fire_insurance: number;
}

interface MonthlySavings {
  year: number;
  month: number;
  card: number;
  horse_club: number;
  friend_club: number;
  balance: number;
}

const MONTHS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

function DashboardContent({
  values,
  setValues,
  isSaving,
  setIsSaving,
  message,
  setMessage,
  userName,
  userEmail,
  userId,
}: {
  values: SavingsValues;
  setValues: React.Dispatch<React.SetStateAction<SavingsValues>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  userName: string;
  userEmail: string;
  userId?: string;
}) {
  const monthlyNet = useMemo(() => calculateMonthlyNet(values), [values]);
  const totalSavings = useMemo(() => calculateTotalSavings(values), [values]);

  const [settings, setSettings] = useState<UserSettings>({ base_salary: 0, rent: 0, fire_insurance: 0 });
  const [monthlySavings, setMonthlySavings] = useState<MonthlySavings[]>([]);
  const [currentYear] = useState(new Date().getFullYear());
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    if (!userId) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setValues({ ...defaultSavingsValues, ...JSON.parse(saved) });
      }
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const settingsResponse = await fetch(
          `/api/savings?userId=${encodeURIComponent(userId)}&action=settings`
        );
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (isMounted) {
            setSettings(settingsData);
          }
        }

        const monthlyResponse = await fetch(
          `/api/savings?userId=${encodeURIComponent(userId)}&action=monthly&year=${currentYear}`
        );
        if (monthlyResponse.ok) {
          const monthlyData = await monthlyResponse.json();
          if (isMounted) {
            setMonthlySavings(monthlyData);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
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
  }, [userId, currentYear, setValues]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    }
  }, [values]);

  const handleMonthlyUpdate = (month: number, field: keyof Omit<MonthlySavings, "year" | "month" | "balance">, value: number | undefined) => {
    const existingData = monthlySavings.find((d) => d.month === month);
    const updatedData: MonthlySavings = {
      year: currentYear,
      month,
      card: existingData?.card ?? 0,
      horse_club: existingData?.horse_club ?? 0,
      friend_club: existingData?.friend_club ?? 0,
      balance: existingData?.balance ?? 0,
    };
    updatedData[field] = Number(value ?? 0);
    updatedData.balance = settings.base_salary - settings.rent - settings.fire_insurance - updatedData.card - updatedData.horse_club - updatedData.friend_club;

    setMonthlySavings((prev) => {
      const filtered = prev.filter((d) => d.month !== month);
      return [...filtered, updatedData].sort((a, b) => a.month - b.month);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const resolvedUserId = userId || userName || "local-user";

      // 月別データを保存
      for (const data of monthlySavings) {
        await fetch("/api/savings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: resolvedUserId,
            action: "save-monthly",
            ...data,
          }),
        });
      }

      // 従来の単一値も保存
      const response = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, userId: resolvedUserId }),
      });

      if (!response.ok) {
        throw new Error("保存に失敗しました");
      }

      setMessage("保存しました。Turso に反映されています。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setValues(defaultSavingsValues);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (isLoadingSettings) {
    return <Loader />;
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between">
            <Text fw={600}>今月の貯まり額</Text>
            <IconPigMoney size={20} color="#1c7ed6" />
          </Group>
          <Title order={2} mt="sm">
            ¥{monthlyNet.toLocaleString()}
          </Title>
          <Text c="dimmed" size="sm">
            給与 - 家賃 - カード - 友の会 - 競馬クラブ
          </Text>
        </Card>

        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between">
            <Text fw={600}>総資産</Text>
            <IconReceipt size={20} color="#2f9e44" />
          </Group>
          <Title order={2} mt="sm">
            ¥{totalSavings.toLocaleString()}
          </Title>
          <Text c="dimmed" size="sm">
            残高 + 今月の残額
          </Text>
        </Card>

        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between">
            <Text fw={600}>利用ユーザー</Text>
            <ActionIcon variant="light" color="gray" aria-label="Reset" onClick={handleReset}>
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
        <Group justify="space-between" mb="lg">
          <Title order={3}>月別収支表（{currentYear}年）</Title>
          <Group>
            <Button component={Link} href="/settings" leftSection={<IconSettings size={16} />} variant="light">
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

        {message ? <Alert mb="lg">{message}</Alert> : null}

        <div style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>項目</Table.Th>
                {MONTHS.map((month) => (
                  <Table.Th key={month} style={{ textAlign: "center", minWidth: 100 }}>
                    {month}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>給与</Table.Td>
                {MONTHS.map((_, idx) => (
                  <Table.Td key={`salary-${idx}`} style={{ textAlign: "center" }}>
                    <Text size="sm">¥{settings.base_salary.toLocaleString()}</Text>
                  </Table.Td>
                ))}
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>家賃</Table.Td>
                {MONTHS.map((_, idx) => (
                  <Table.Td key={`rent-${idx}`} style={{ textAlign: "center" }}>
                    <Text size="sm">¥{settings.rent.toLocaleString()}</Text>
                  </Table.Td>
                ))}
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>火災保険</Table.Td>
                {MONTHS.map((_, idx) => (
                  <Table.Td key={`fire-insurance-${idx}`} style={{ textAlign: "center" }}>
                    <Text size="sm">¥{settings.fire_insurance.toLocaleString()}</Text>
                  </Table.Td>
                ))}
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>カード</Table.Td>
                {MONTHS.map((_, idx) => {
                  const data = monthlySavings.find((d) => d.month === idx + 1);
                  return (
                    <Table.Td key={`card-${idx}`}>
                      <NumberInput
                        value={data?.card ?? 0}
                        min={0}
                        size="xs"
                        onChange={(value) => handleMonthlyUpdate(idx + 1, "card", Number(value))}
                        placeholder="0"
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>馬主</Table.Td>
                {MONTHS.map((_, idx) => {
                  const data = monthlySavings.find((d) => d.month === idx + 1);
                  return (
                    <Table.Td key={`horse-${idx}`}>
                      <NumberInput
                        value={data?.horse_club ?? 0}
                        min={0}
                        size="xs"
                        onChange={(value) => handleMonthlyUpdate(idx + 1, "horse_club", Number(value))}
                        placeholder="0"
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>友の会</Table.Td>
                {MONTHS.map((_, idx) => {
                  const data = monthlySavings.find((d) => d.month === idx + 1);
                  return (
                    <Table.Td key={`friend-${idx}`}>
                      <NumberInput
                        value={data?.friend_club ?? 0}
                        min={0}
                        size="xs"
                        onChange={(value) => handleMonthlyUpdate(idx + 1, "friend_club", Number(value))}
                        placeholder="0"
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
              <Table.Tr bg="blue.0">
                <Table.Td fw={700} c="blue">
                  貯金額
                </Table.Td>
                {MONTHS.map((_, idx) => {
                  const data = monthlySavings.find((d) => d.month === idx + 1);
                  const balance = data?.balance ?? settings.base_salary - settings.rent - settings.fire_insurance;
                  return (
                    <Table.Td key={`balance-${idx}`} style={{ textAlign: "center" }}>
                      <Text fw={600} size="sm" c={balance >= 0 ? "green" : "red"}>
                        ¥{balance.toLocaleString()}
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
  const [values, setValues] = useState<SavingsValues>(defaultSavingsValues);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!isLoaded) {
    return (
        <>
        <Loader />
        </>
    )
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
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "未ログイン";
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
              <Title order={1} mt={8}>貯金計算</Title>
            </div>

            <Group>
              <Button component={Link} href="/" leftSection={<IconArrowLeft size={16} />} variant="light">
                ホームに戻る
              </Button>
              <SignOutButton>
                <Button variant="filled" color="red">ログアウト</Button>
              </SignOutButton>
            </Group>
          </Group>

          <Alert>
            認証済みユーザーとして保存内容を管理できます。Clerk のログイン状態でデータが保持されます。
          </Alert>

          <DashboardContent
            values={values}
            setValues={setValues}
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
