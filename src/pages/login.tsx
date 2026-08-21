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

      <Container size="sm" py={{ base: 40, md: 80 }} px="md">
        <Paper radius="lg" p={{ base: "md", md: "xl" }} withBorder>
          <Stack align="stretch" gap="md">
            <Title order={2} ta="center" fz={{ base: 22, md: 28 }}>
              貯金計算アプリにログイン
            </Title>

            {isLoaded && isSignedIn ? (
              <>
                <Text fw={600} ta="center">
                  すでにログイン済みです。
                </Text>
                <Button
                  component={Link}
                  href="/dashboard"
                  color="blue"
                  size="md"
                  fullWidth
                >
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

            <Button
              component={Link}
              href="/"
              variant="light"
              size="md"
              fullWidth
            >
              トップへ戻る
            </Button>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
