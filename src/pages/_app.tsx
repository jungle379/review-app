import type { AppProps } from "next/app";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <MantineProvider defaultColorScheme="light">
      <Component {...pageProps} />
    </MantineProvider>
  );

  if (!publishableKey) {
    return content;
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#1c7ed6",
        },
      }}
      publishableKey={publishableKey}
    >
      {content}
    </ClerkProvider>
  );
}
