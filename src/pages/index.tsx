import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { SignInButton, SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { Button, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";

const Home: NextPage = () => {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <>
      <Head>
        <title>貯金計算アプリ</title>
      </Head>

      <Container size="lg" py={80}>
        <Paper radius="lg" p="xl" withBorder>
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Text c="blue" fw={700} tt="uppercase" size="sm">
                  Saving Planner
                </Text>
                <Title order={1} size={36}>
                  毎月の収支を見える化して、貯金計画を作ろう
                </Title>
              </div>
              <Group>
              {isLoaded && isSignedIn ? (
                <>
                  <SignOutButton>
                    <Button variant="light" color="red">
                      ログアウト
                    </Button>
                  </SignOutButton>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <SignInButton forceRedirectUrl="/dashboard">
                  <Button size="lg" color="blue">
                    はじめる
                  </Button>
                </SignInButton>
              )}
            </Group>

              {isLoaded && isSignedIn ? (
                <Group gap="sm">
                  <Button component={Link} href="/dashboard" color="blue">
                    ダッシュボードへ
                  </Button>
                </Group>
              ) : (
                <SignInButton forceRedirectUrl="/dashboard">
                  <Button color="blue">ログイン</Button>
                </SignInButton>
              )}
            </Group>

            <Text size="lg" c="dimmed">
              残高、給与、家賃、火災保険、カード、馬主、友の会を一目で確認し、毎月の貯蓄額を計算できます。
            </Text>

          </Stack>
        </Paper>
      </Container>
    </>
  );
};

export default Home;
