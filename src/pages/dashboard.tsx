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
  IconPigMoney,
  IconReceipt,
  IconTrash,
  IconSettings,
} from "@tabler/icons-react";

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
}

interface MonthlySavings {
  year: number;
  month: number;
  card: number;
  horse_club: number;
  friend_club: number;
  fire_Insurace: number;
  balance: number;
}

const MONTHS = [
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

/**
 * 数値を安全にnumberへ変換する
 *
 * undefined / null / 空文字 / NaN などは 0 にする。
 */
function toSafeNumber(value: unknown): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

/**
 * APIから取得した設定を安全な形にする
 */
function normalizeSettings(
  data: Partial<UserSettings> | null | undefined
): UserSettings {
  return {
    base_salary: toSafeNumber(
      data?.base_salary
    ),

    rent: toSafeNumber(
      data?.rent
    ),
  };
}

/**
 * APIから取得した月別データを安全な形にする
 */
function normalizeMonthlyData(
  data: Partial<MonthlySavings> | null | undefined,
  year: number,
  month: number
): MonthlySavings {
  return {
    year: toSafeNumber(
      data?.year ?? year
    ),

    month: toSafeNumber(
      data?.month ?? month
    ),
    fire_Insurace: toSafeNumber(
        data?.fire_Insurace
    ),

    card: toSafeNumber(
      data?.card
    ),

    horse_club: toSafeNumber(
      data?.horse_club
    ),

    friend_club: toSafeNumber(
      data?.friend_club
    ),

    balance: toSafeNumber(
      data?.balance
    ),
  };
}

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
  setValues: React.Dispatch<
    React.SetStateAction<SavingsValues>
  >;
  isSaving: boolean;
  setIsSaving: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  message: string;
  setMessage: React.Dispatch<
    React.SetStateAction<string>
  >;
  userName: string;
  userEmail: string;
  userId?: string;
}) {
  const monthlyNet = useMemo(
    () =>
      calculateMonthlyNet(values),
    [values]
  );

  const totalSavings = useMemo(
    () =>
      calculateTotalSavings(values),
    [values]
  );

  const [settings, setSettings] =
    useState<UserSettings>({
      base_salary: 0,
      rent: 0,
    });

  const [monthlySavings, setMonthlySavings] =
    useState<MonthlySavings[]>([]);

  const [currentYear] = useState(
    new Date().getFullYear()
  );

  const [
    isLoadingSettings,
    setIsLoadingSettings,
  ] = useState(true);

  // =====================================================
  // 設定・月別データ取得
  // =====================================================

  useEffect(() => {
    if (!userId) {
      if (
        typeof window !== "undefined"
      ) {
        const saved =
          window.localStorage.getItem(
            STORAGE_KEY
          );

        if (saved) {
          try {
            const parsed =
              JSON.parse(saved);

            setValues({
              ...defaultSavingsValues,
              ...parsed,
            });
          } catch (error) {
            console.error(
              "localStorageの読み込みに失敗しました:",
              error
            );
          }
        }
      }

      setIsLoadingSettings(false);

      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        // ---------------------------------
        // 設定取得
        // ---------------------------------

        const settingsResponse =
          await fetch(
            `/api/savings?userId=${encodeURIComponent(
              userId
            )}&action=settings`
          );

        if (settingsResponse.ok) {
          const settingsData =
            await settingsResponse.json();

          console.log(
            "取得した設定:",
            settingsData
          );

          if (isMounted) {
            // APIの値を必ず正規化する
            setSettings(
              normalizeSettings(
                settingsData
              )
            );
          }
        }

        // ---------------------------------
        // 月別データ取得
        // ---------------------------------

        const monthlyResponse =
          await fetch(
            `/api/savings?userId=${encodeURIComponent(
              userId
            )}&action=monthly&year=${currentYear}`
          );

        if (monthlyResponse.ok) {
          const monthlyData =
            await monthlyResponse.json();

          console.log(
            "取得した月別データ:",
            monthlyData
          );

          if (
            isMounted &&
            Array.isArray(monthlyData)
          ) {
            const normalizedData =
              monthlyData.map(
                (
                  item: Partial<MonthlySavings>
                ) =>
                  normalizeMonthlyData(
                    item,
                    currentYear,
                    toSafeNumber(
                      item.month
                    )
                  )
              );

            setMonthlySavings(
              normalizedData
            );
          }
        }
      } catch (error) {
        console.error(
          "データ取得エラー:",
          error
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
  }, [
    userId,
    currentYear,
    setValues,
  ]);

  // =====================================================
  // localStorage
  // =====================================================

  useEffect(() => {
    if (
      typeof window !== "undefined"
    ) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(values)
      );
    }
  }, [values]);

  // =====================================================
  // 月別データ更新
  // =====================================================

  const handleMonthlyUpdate = (
    month: number,
    field: keyof Omit<
      MonthlySavings,
      "year" | "month" | "balance"
    >,
    value: number | string
  ) => {
    const numericValue =
      toSafeNumber(value);

    const existingData =
      monthlySavings.find(
        (data) =>
          data.month === month
      );

    const updatedData: MonthlySavings = {
      year: currentYear,
      month,

      fire_Insurace:
        existingData?.fire_Insurace ?? 0,
      card:
        existingData?.card ?? 0,

      horse_club:
        existingData?.horse_club ?? 0,

      friend_club:
        existingData?.friend_club ?? 0,

      balance:
        existingData?.balance ?? 0,
    };

    updatedData[field] =
      numericValue;

    // 火災保険は設定画面の固定値
    updatedData.balance =
      settings.base_salary -
      settings.rent -
      updatedData.fire_Insurace -
      updatedData.card -
      updatedData.horse_club -
      updatedData.friend_club;

    setMonthlySavings(
      (previous) => {
        const filtered =
          previous.filter(
            (data) =>
              data.month !== month
          );

        return [
          ...filtered,
          updatedData,
        ].sort(
          (a, b) =>
            a.month - b.month
        );
      }
    );
  };

  // =====================================================
  // 保存
  // =====================================================

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const resolvedUserId =
        userId ||
        userName ||
        "local-user";

      // ---------------------------------
      // 月別データ保存
      // ---------------------------------

      for (
        const data of monthlySavings
      ) {
        const response =
          await fetch(
            "/api/savings",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                userId:
                  resolvedUserId,

                action:
                  "save-monthly",

                year:
                  data.year,

                month:
                  data.month,

                card:
                  toSafeNumber(
                    data.card
                  ),

                horse_club:
                  toSafeNumber(
                    data.horse_club
                  ),

                friend_club:
                  toSafeNumber(
                    data.friend_club
                  ),

                balance:
                  toSafeNumber(
                    data.balance
                  ),
              }),
            }
          );

        if (!response.ok) {
          const errorData =
            await response
              .json()
              .catch(
                () => null
              );

          throw new Error(
            errorData?.message ??
              "月別データの保存に失敗しました"
          );
        }
      }

      // ---------------------------------
      // 従来の単一値も保存
      // ---------------------------------

      const response =
        await fetch(
          "/api/savings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId:
                resolvedUserId,

              action:
                "save",

              balance:
                toSafeNumber(
                  values.balance
                ),

              salary:
                toSafeNumber(
                  values.salary
                ),

              rent:
                toSafeNumber(
                  values.rent
                ),

              fireInsurance:
                toSafeNumber(
                  values.fireInsurance
                ),

              card:
                toSafeNumber(
                  values.card
                ),

              horseClub:
                toSafeNumber(
                  values.horseClub
                ),

              friendClub:
                toSafeNumber(
                  values.friendClub
                ),
            }),
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.message ??
            "保存に失敗しました"
        );
      }

      setMessage(
        "保存しました。Turso に反映されています。"
      );
    } catch (error) {
      console.error(
        "保存エラー:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "保存に失敗しました"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // リセット
  // =====================================================

  const handleReset = () => {
    setValues(
      defaultSavingsValues
    );

    if (
      typeof window !== "undefined"
    ) {
      window.localStorage.removeItem(
        STORAGE_KEY
      );
    }
  };

  // =====================================================
  // Loading
  // =====================================================

  if (isLoadingSettings) {
    return <Loader />;
  }

  // =====================================================
  // Dashboard
  // =====================================================

  return (
    <>
      <SimpleGrid
        cols={{
          base: 1,
          md: 3,
        }}
        spacing="lg"
      >
        {/* =========================================
            今月の貯まり額
        ========================================= */}

        <Card
          radius="lg"
          p="lg"
          withBorder
        >
          <Group justify="space-between">
            <Text fw={600}>
              今月の貯まり額
            </Text>

            <IconPigMoney
              size={20}
              color="#1c7ed6"
            />
          </Group>

          <Title
            order={2}
            mt="sm"
          >
            ¥
            {toSafeNumber(
              monthlyNet
            ).toLocaleString()}
          </Title>

          <Text
            c="dimmed"
            size="sm"
          >
            給与 - 家賃 - 火災保険 -
            カード - 友の会 - 馬主
          </Text>
        </Card>

        {/* =========================================
            総資産
        ========================================= */}

        <Card
          radius="lg"
          p="lg"
          withBorder
        >
          <Group justify="space-between">
            <Text fw={600}>
              総資産
            </Text>

            <IconReceipt
              size={20}
              color="#2f9e44"
            />
          </Group>

          <Title
            order={2}
            mt="sm"
          >
            ¥
            {toSafeNumber(
              totalSavings
            ).toLocaleString()}
          </Title>

          <Text
            c="dimmed"
            size="sm"
          >
            残高 + 今月の残額
          </Text>
        </Card>

        {/* =========================================
            利用ユーザー
        ========================================= */}

        <Card
          radius="lg"
          p="lg"
          withBorder
        >
          <Group justify="space-between">
            <Text fw={600}>
              利用ユーザー
            </Text>

            <ActionIcon
              variant="light"
              color="gray"
              aria-label="Reset"
              onClick={handleReset}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>

          <Title
            order={2}
            mt="sm"
          >
            {userName}
          </Title>

          <Text
            c="dimmed"
            size="sm"
          >
            {userEmail}
          </Text>
        </Card>
      </SimpleGrid>

      {/* =========================================
          月別収支
      ========================================= */}

      <Paper
        radius="lg"
        p="lg"
        withBorder
        mt="lg"
      >
        <Group
          justify="space-between"
          mb="lg"
        >
          <Title order={3}>
            月別収支表（
            {currentYear}
            年）
          </Title>

          <Group>
            <Button
              component={Link}
              href="/settings"
              leftSection={
                <IconSettings
                  size={16}
                />
              }
              variant="light"
            >
              設定
            </Button>

            <Button
              variant="light"
              color="gray"
              onClick={handleReset}
            >
              リセット
            </Button>

            <Button
              onClick={handleSave}
              loading={isSaving}
            >
              保存
            </Button>
          </Group>
        </Group>

        {message ? (
          <Alert mb="lg">
            {message}
          </Alert>
        ) : null}

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <Table
            striped
            highlightOnHover
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  項目
                </Table.Th>

                {MONTHS.map(
                  (month) => (
                    <Table.Th
                      key={month}
                      style={{
                        textAlign:
                          "center",
                        minWidth: 100,
                      }}
                    >
                      {month}
                    </Table.Th>
                  )
                )}
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {/* =================================
                  給与
              ================================= */}

              <Table.Tr>
                <Table.Td fw={600}>
                  給与
                </Table.Td>

                {MONTHS.map(
                  (_, idx) => (
                    <Table.Td
                      key={`salary-${idx}`}
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      <Text size="sm">
                        ¥
                        {toSafeNumber(
                          settings.base_salary
                        ).toLocaleString()}
                      </Text>
                    </Table.Td>
                  )
                )}
              </Table.Tr>

              {/* =================================
                  家賃
              ================================= */}

              <Table.Tr>
                <Table.Td fw={600}>
                  家賃
                </Table.Td>

                {MONTHS.map(
                  (_, idx) => (
                    <Table.Td
                      key={`rent-${idx}`}
                      style={{
                        textAlign:
                          "center",
                      }}
                    >
                      <Text size="sm">
                        ¥
                        {toSafeNumber(
                          settings.rent
                        ).toLocaleString()}
                      </Text>
                    </Table.Td>
                  )
                )}
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>
                    火災保険
                </Table.Td>

                {MONTHS.map((_, idx) => {
                    const data = monthlySavings.find(
                    (item) => item.month === idx + 1
                    );

                    return (
                    <Table.Td key={`fire-insurance-${idx}`}>
                        <Input
                        value={String(data?.fire_Insurace ?? "")}
                        size="xs"
                        inputMode="numeric"
                        placeholder="0"
                        onChange={(event) =>
                            handleMonthlyUpdate(
                            idx + 1,
                            "fire_Insurace",
                            event.currentTarget.value
                            )
                        }
                        />
                    </Table.Td>
                    );
                })}
                </Table.Tr>

              {/* =================================
                  カード
              ================================= */}

              <Table.Tr>
                <Table.Td fw={600}>
                    カード
                </Table.Td>

                {MONTHS.map((_, idx) => {
                    const data = monthlySavings.find(
                    (item) => item.month === idx + 1
                    );

                    return (
                    <Table.Td key={`card-${idx}`}>
                        <Input
                        value={String(data?.card ?? "")}
                        size="xs"
                        inputMode="numeric"
                        placeholder="0"
                        onChange={(event) =>
                            handleMonthlyUpdate(
                            idx + 1,
                            "card",
                            event.currentTarget.value
                            )
                        }
                        />
                    </Table.Td>
                    );
                })}
                </Table.Tr>

              {/* =================================
                  馬主
              ================================= */}

                <Table.Tr>
                <Table.Td fw={600}>
                    馬主
                </Table.Td>

                {MONTHS.map((_, idx) => {
                    const data = monthlySavings.find(
                    (item) => item.month === idx + 1
                    );

                    return (
                    <Table.Td key={`horse-${idx}`}>
                        <Input
                        value={
                            data?.horse_club === undefined ||
                            data?.horse_club === null
                            ? ""
                            : String(data.horse_club)
                        }
                        size="xs"
                        inputMode="decimal"
                        placeholder="0"
                        onChange={(event) =>
                            handleMonthlyUpdate(
                            idx + 1,
                            "horse_club",
                            event.currentTarget.value
                            )
                        }
                        />
                    </Table.Td>
                    );
                })}
                </Table.Tr>
                
              {/* =================================
                  友の会
              ================================= */}

              <Table.Tr>
                <Table.Td fw={600}>
                    友の会
                </Table.Td>

                {MONTHS.map((_, idx) => {
                    const data = monthlySavings.find(
                    (item) => item.month === idx + 1
                    );

                    return (
                    <Table.Td key={`friend-${idx}`}>
                        <Input
                        value={String(data?.friend_club ?? "")}
                        size="xs"
                        inputMode="numeric"
                        placeholder="0"
                        onChange={(event) =>
                            handleMonthlyUpdate(
                            idx + 1,
                            "friend_club",
                            event.currentTarget.value
                            )
                        }
                        />
                    </Table.Td>
                    );
                })}
                </Table.Tr>

              {/* =================================
                  貯金額
              ================================= */}

              <Table.Tr bg="blue.0">
                <Table.Td
                  fw={700}
                  c="blue"
                >
                  貯金額
                </Table.Td>

                {MONTHS.map(
                  (_, idx) => {
                    const data =
                      monthlySavings.find(
                        (item) =>
                          item.month ===
                          idx + 1
                      );

                    const balance =
                      data?.balance ??
                      (
                        settings.base_salary -
                        settings.rent
                      );

                    const safeBalance =
                      toSafeNumber(
                        balance
                      );

                    return (
                      <Table.Td
                        key={`balance-${idx}`}
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        <Text
                          fw={600}
                          size="sm"
                          c={
                            safeBalance >=
                            0
                              ? "green"
                              : "red"
                          }
                        >
                          ¥
                          {safeBalance.toLocaleString()}
                        </Text>
                      </Table.Td>
                    );
                  }
                )}
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </div>
      </Paper>
    </>
  );
}

// =====================================================
// Dashboard Page
// =====================================================

export default function DashboardPage() {
  const {
    user,
    isLoaded,
    isSignedIn,
  } = useUser();

  const [
    values,
    setValues,
  ] =
    useState<SavingsValues>(
      defaultSavingsValues
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  // ---------------------------------------------
  // Clerk読み込み中
  // ---------------------------------------------

  if (!isLoaded) {
    return <Loader />;
  }

  // ---------------------------------------------
  // 未ログイン
  // ---------------------------------------------

  if (!isSignedIn) {
    return (
      <>
        <Head>
          <title>
            ログインが必要です
          </title>
        </Head>

        <Container
          size="sm"
          py={80}
        >
          <Paper
            radius="lg"
            p="xl"
            withBorder
          >
            <Stack
              align="center"
              gap="md"
            >
              <Title order={2}>
                ログインが必要です
              </Title>

              <Text
                c="dimmed"
                ta="center"
              >
                この画面は認証済みユーザーのみ利用できます。
              </Text>

              <Button
                component={Link}
                href="/login"
                color="blue"
              >
                ログイン画面へ
              </Button>
            </Stack>
          </Paper>
        </Container>
      </>
    );
  }

  const userName =
    user?.fullName ??
    "ゲスト";

  const userEmail =
    user?.primaryEmailAddress
      ?.emailAddress ??
    "未ログイン";

  const userId =
    user?.id ?? undefined;

  return (
    <>
      <Head>
        <title>
          貯金計算ダッシュボード
        </title>
      </Head>

      <Container
        size="xl"
        py={40}
      >
        <Stack gap="lg">
          <Group
            justify="space-between"
            align="center"
          >
            <div>
              <Text
                tt="uppercase"
                c="blue"
                fw={700}
                size="sm"
              >
                Saving dashboard
              </Text>

              <Title
                order={1}
                mt={8}
              >
                貯金計算
              </Title>
            </div>

            <Group>
              <Button
                component={Link}
                href="/"
                leftSection={
                  <IconArrowLeft
                    size={16}
                  />
                }
                variant="light"
              >
                ホームに戻る
              </Button>

              <SignOutButton>
                <Button
                  variant="filled"
                  color="red"
                >
                  ログアウト
                </Button>
              </SignOutButton>
            </Group>
          </Group>

          <Alert>
            認証済みユーザーとして保存内容を管理できます。
            Clerk のログイン状態でデータが保持されます。
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