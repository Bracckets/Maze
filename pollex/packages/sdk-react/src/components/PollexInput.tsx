import type { InputHTMLAttributes } from "react";

export type PollexInputProps = InputHTMLAttributes<HTMLInputElement>;

export function PollexInput(props: PollexInputProps) {
  return <input {...props} />;
}
