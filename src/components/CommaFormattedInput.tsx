import { Input, type InputProps } from "@mantine/core";
import type { InputHTMLAttributes } from "react";

type CommaFormattedInputProps =
  Omit<InputProps, "value" | "onChange"> &
  Pick<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "placeholder"> & {
    value: string | number;
    onChange: (value: string) => void;
  };

function formatValue(value: string): string {
  if (!/^-?\d*\.?\d*$/.test(value)) {
    return value;
  }

  const [integer, fraction] = value.split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  const digits = sign ? integer.slice(1) : integer;
  const formattedInteger = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${sign}${formattedInteger}${value.includes(".") ? `.${fraction}` : ""}`;
}

export default function CommaFormattedInput({
  value,
  onChange,
  ...inputProps
}: CommaFormattedInputProps) {
  const rawValue = String(value);

  return (
    <Input
      {...inputProps}
      value={formatValue(rawValue)}
      onChange={(event) => {
        const input = event.currentTarget;
        const cursorPosition = input.selectionStart ?? input.value.length;
        const formattedCursorPosition = formatValue(
          input.value.slice(0, cursorPosition).replace(/,/g, "")
        ).length;

        onChange(input.value.replace(/,/g, ""));

        window.requestAnimationFrame(() => {
          input.setSelectionRange(
            formattedCursorPosition,
            formattedCursorPosition
          );
        });
      }}
    />
  );
}
