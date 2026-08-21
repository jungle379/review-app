import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";
import {
  Alert,
  Button,
  Container,
  Group,
  Input,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { fetchSettings, saveSettings } from "@/api/settings";
import MantineLoader from "@/components/Loader";
import ResponsiveButtonGroup from "@/components/ResponsiveButtonGroup";
import { toast } from "sonner";

interface UserSettings {
  base_salary: string;
  rent: string;
}

export default function SettingsPage() {
  const { user, isLoaded, isSignedIn } = useUser();

  const [settings, setSettings] = useState<UserSettings>({
    base_salary: "",
    rent: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ========================================
  // 設定取得
  // ========================================
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      return;
    }

    const loadSettings = async () => {
      try {
        setIsLoading(true);

        const data = await fetchSettings(user.id);

        setSettings({
          base_salary:
            data.base_salary !== null &&
            data.base_salary !== undefined
              ? String(data.base_salary)
              : "",

          rent:
            data.rent !== null &&
            data.rent !== undefined
              ? String(data.rent)
              : "",
        });
      } catch (error) {
        console.error(
          "設定取得エラー:",
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "設定の取得に失敗しました"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isLoaded, isSignedIn, user?.id]);

  // ========================================
  // ローディング
  // ========================================
  if (!isLoaded) {
    return <MantineLoader />;
  }

  // ========================================
  // 未ログイン
  // ========================================
  if (!isSignedIn) {
    return (
      <>
        <Head>
          <title>ログインが必要です</title>
        </Head>

        <Container size="sm" py={{ base: 40, md: 80 }} px="md">
          <Paper radius="lg" p={{ base: "md", md: "xl" }} withBorder>
            <Stack
              align="center"
              gap="md"
            >
              <Title order={2}>
                ログインが必要です
              </Title>

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

  // ========================================
  // 基本給与変更
  // ========================================
  const handleBaseSalaryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.currentTarget.value;

    setSettings((prev) => ({
      ...prev,
      base_salary: value,
    }));
  };

  // ========================================
  // 家賃変更
  // ========================================
  const handleRentChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.currentTarget.value;

    setSettings((prev) => ({
      ...prev,
      rent: value,
    }));
  };

  // ========================================
  // 設定保存
  // ========================================
  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!user?.id) {
      toast.error("ユーザー情報を取得できませんでした");
      return;
    }

    setIsSaving(true);

    try {
      const data = await saveSettings(user.id, {
        base_salary: Number(settings.base_salary || 0),
        rent: Number(settings.rent || 0),
      });

      setSettings({
        base_salary:
          data.base_salary !== null &&
          data.base_salary !== undefined
            ? String(data.base_salary)
            : "",
        rent:
          data.rent !== null && data.rent !== undefined
            ? String(data.rent)
            : "",
      });

      toast.success("設定を保存しました");
    } catch (error) {
      console.error(
        "設定保存エラー:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "設定の保存に失敗しました"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================
  // 画面
  // ========================================
  return (
    <>
      <Head>
        <title>設定</title>
      </Head>

      <Container size="sm" py={{ base: 24, md: 40 }} px="md">
        <Stack gap="lg">
          <Group
            justify="space-between"
            align="flex-start"
            wrap="wrap"
            gap="md"
          >
            <Title order={1} fz={{ base: 28, md: 34 }}>
              設定
            </Title>

            <ResponsiveButtonGroup
              items={[
                {
                  key: "back",
                  label: "ダッシュボードに戻る",
                  buttonProps: {
                    component: Link,
                    href: "/dashboard",
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

          {/* ================================
              説明
          ================================= */}
          <Alert>
            毎月の固定値（基本給与・家賃の初期値）を設定します。
            家賃・賞与など変動する項目はダッシュボードで月ごとに入力・訂正できます。
            給与は毎年11月から2万円加算されます。
          </Alert>

          {/* ================================
              設定フォーム
          ================================= */}
          <Paper radius="lg" p={{ base: "md", md: "lg" }} withBorder>
            <Stack gap="lg">

              {/* ============================
                  基本給与
              ============================= */}
              <div>
                <Text
                  fw={600}
                  mb="xs"
                >
                  基本給与（月額）
                </Text>

                <Text
                  c="dimmed"
                  size="sm"
                  mb="md"
                >
                  毎月の基本給与です。ダッシュボードでは毎年11月から2万円加算して計算されます。
                </Text>

                <Input
                  value={settings.base_salary}
                  placeholder="280000"
                  onChange={
                    handleBaseSalaryChange
                  }
                />
              </div>

              {/* ============================
                  家賃
              ============================= */}
              <div>
                <Text
                  fw={600}
                  mb="xs"
                >
                  家賃（固定）
                </Text>

                <Text
                  c="dimmed"
                  size="sm"
                  mb="md"
                >
                  家賃の初期値です。ダッシュボードで月ごとに訂正できます。
                </Text>

                <Input
                  value={settings.rent}
                  placeholder="76000"
                  onChange={
                    handleRentChange
                  }
                />
              </div>

              {/* ============================
                  ボタン
              ============================= */}
              <ResponsiveButtonGroup
                mobileCols={2}
                items={[
                  {
                    key: "cancel",
                    label: "キャンセル",
                    buttonProps: {
                      variant: "light",
                      component: Link,
                      href: "/dashboard",
                    },
                  },
                  {
                    key: "save",
                    label: "保存",
                    buttonProps: {
                      onClick: handleSave,
                      loading: isSaving,
                      disabled: isLoading,
                    },
                  },
                ]}
              />

            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}