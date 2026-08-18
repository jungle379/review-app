import { Box, Loader as MantineLoader } from "@mantine/core";

export default function Loader() {
  return (
    <Box
      style={{
        minHeight: 200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <MantineLoader />
    </Box>
  );
}