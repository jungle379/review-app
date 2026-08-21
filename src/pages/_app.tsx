import type { AppProps } from "next/app";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { createTheme, MantineProvider } from "@mantine/core";
import { Toaster } from "sonner";

import "@mantine/core/styles.css";
import "../styles/globals.css";

const theme = createTheme({
  components: {
    Button: {
      defaultProps: {
        size: "md",
      },
    },
    Input: {
      defaultProps: {
        size: "md",
      },
    },
  },
});

export default function MyApp({
  Component,
  pageProps,
}: AppProps) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1c7ed6",
        },
      }}
    >
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Component {...pageProps} />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 3500,
          }}
        />
      </MantineProvider>
    </ClerkProvider>
  );
}
