import {
  Box,
  Button,
  Group,
  SimpleGrid,
} from "@mantine/core";
import type { ComponentProps, ReactNode } from "react";

export type ResponsiveButtonItem = {
  key: string;
  label: ReactNode;
  buttonProps?: ComponentProps<typeof Button>;
  wrap?: (button: ReactNode) => ReactNode;
};

type ResponsiveButtonGroupProps = {
  items: ResponsiveButtonItem[];
  mobileCols?: 1 | 2;
};

function renderButton(
  item: ResponsiveButtonItem,
  fullWidth: boolean
) {
  const button = (
    <Button
      key={item.key}
      size="md"
      fullWidth={fullWidth}
      {...item.buttonProps}
    >
      {item.label}
    </Button>
  );

  return item.wrap ? item.wrap(button) : button;
}

export default function ResponsiveButtonGroup({
  items,
  mobileCols = 1,
}: ResponsiveButtonGroupProps) {
  return (
    <Box w={{ base: "100%", sm: "auto" }}>
      <Box hiddenFrom="sm" w="100%">
        <SimpleGrid cols={mobileCols} spacing="sm">
          {items.map((item) => (
            <Box key={item.key} w="100%">
              {renderButton(item, true)}
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Group gap="sm" wrap="wrap" visibleFrom="sm">
        {items.map((item) => renderButton(item, false))}
      </Group>
    </Box>
  );
}
