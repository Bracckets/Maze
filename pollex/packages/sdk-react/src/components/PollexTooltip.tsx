import type { HTMLAttributes, ReactNode } from "react";

export interface PollexTooltipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function PollexTooltip({ children, ...props }: PollexTooltipProps) {
  return <span {...props}>{children}</span>;
}
