import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { SignInButton, SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import {
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import ResponsiveButtonGroup from "@/components/ResponsiveButtonGroup";

const Home: NextPage = () => {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <>
      <Head>
        <title>貯金計算アプリ</title>
      </Head>

      <Container size="lg" py={{ base: 32, md: 80 }} px={{ base: "md", md: "lg" }}>
        <Paper radius="lg" p={{ base: "md", md: "xl" }} withBorder>
          <Stack gap="lg">
            <Group
              justify="space-between"
              align="flex-start"
              wrap="wrap"
              gap="md"
            >
              <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                <Text c="blue" fw={700} tt="uppercase" size="sm">
                  Saving Planner
                </Text>
                <Title order={1} fz={{ base: 28, sm: 32, md: 36 }} lh={1.3}>
                  毎月の収支を見える化して、貯金計画を作ろう
                </Title>
              </Stack>

              {isLoaded && isSignedIn ? (
                <Group gap="sm" visibleFrom="sm">
                  <UserButton />
                </Group>
              ) : null}
            </Group>

            <Text fz={{ base: 15, md: 18 }} c="dimmed">
              残高、給与、家賃、火災保険、カード、馬主、友の会を一目で確認し、毎月の貯蓄額を計算できます。
            </Text>

            {isLoaded ? (
              isSignedIn ? (
                <ResponsiveButtonGroup
                  items={[
                    {
                      key: "dashboard",
                      label: "ダッシュボードへ",
                      buttonProps: {
                        component: Link,
                        href: "/dashboard",
                        color: "blue",
                      },
                    },
                    {
                      key: "logout",
                      label: "ログアウト",
                      buttonProps: {
                        variant: "light",
                        color: "red",
                      },
                      wrap: (button) => <SignOutButton>{button}</SignOutButton>,
                    },
                  ]}
                />
              ) : (
                <SignInButton forceRedirectUrl="/dashboard">
                  <Button size="md" color="blue" fullWidth>
                    はじめる
                  </Button>
                </SignInButton>
              )
            ) : null}
          </Stack>
        </Paper>
      </Container>
    </>
  );
};

export default Home;
