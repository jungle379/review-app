import Head from "next/head";
import Link from "next/link";
import { SignIn, useUser } from "@clerk/nextjs";
import { Button, Container, Paper, Stack, Text, Title } from "@mantine/core";

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <>
      <Head>
        <title>ログイン</title>
      </Head>

      <Container size="sm" py={80}>
        <Paper radius="lg" p="xl" withBorder>
          <Stack align="center" gap="md">
            <Title order={2}>貯金計算アプリにログイン</Title>
            <Text c="dimmed" ta="center">
              Clerk 認証でログイン後、ダッシュボードで収支を管理できます。
            </Text>

            {isLoaded && isSignedIn ? (
              <>
                <Text fw={600}>すでにログイン済みです。</Text>
                <Button component={Link} href="/dashboard" color="blue">
                  ダッシュボードへ進む
                </Button>
              </>
            ) : (
              <SignIn
                path="/login"
                routing="path"
                signUpUrl="/login"
                forceRedirectUrl="/dashboard"
              />
            )}

            <Button component={Link} href="/" variant="light">
              トップへ戻る
            </Button>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
