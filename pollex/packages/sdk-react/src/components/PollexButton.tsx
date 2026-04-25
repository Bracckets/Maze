import { useRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

import type { AllowConfig, ConstraintConfig, ContextConfig } from "@pollex/sdk-js";

import { usePollex } from "../usePollex";
import { useTactusDecision } from "../useTactusDecision";

export interface PollexButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "id"> {
  id: string;
  intent: string;
  allow: AllowConfig;
  constraints?: ConstraintConfig;
  context?: ContextConfig;
  children: ReactNode;
}

export function PollexButton({
  id,
  intent,
  allow,
  constraints,
  context,
  children,
  onClick,
  className,
  ...buttonProps
}: PollexButtonProps) {
  const { client, userId, anonymousId } = usePollex();
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimes = useRef<number[]>([]);
  const defaultText = typeof children === "string" ? children : undefined;
  const decision = useTactusDecision({
    id,
    type: "button",
    intent,
    defaultProps: { text: defaultText },
    allow,
    constraints,
    context
  });
  const adaptedText = decision.isAdapted && typeof decision.adaptations.text === "string" ? decision.adaptations.text : children;
  const sizeClass = decision.isAdapted && typeof decision.adaptations.size === "string" ? `pollex-size-${decision.adaptations.size}` : "";
  const mergedClassName = [className, sizeClass].filter(Boolean).join(" ") || undefined;
  const title = decision.isAdapted && typeof decision.adaptations.tooltip === "string" ? decision.adaptations.tooltip : buttonProps.title;

  function track(event_type: string, event_value: Record<string, unknown> = {}) {
    void client.track({
      subject_id: userId,
      anonymous_id: anonymousId,
      events: [
        {
          element_key: id,
          event_type,
          event_value,
          context: context ?? {}
        }
      ]
    });
  }

  function clearDwell() {
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }

  function handlePointerEnter() {
    clearDwell();
    dwellTimer.current = setTimeout(() => {
      track("hesitation");
      dwellTimer.current = null;
    }, 1_500);
  }

  function handlePointerLeave() {
    clearDwell();
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    clearDwell();
    if (isWithinMissedTapRange(event)) {
      track("missed_tap");
    } else {
      track("click");
    }

    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((time) => now - time < 500), now];
    if (clickTimes.current.length >= 3) {
      track("rage_tap", { clicks: clickTimes.current.length });
      clickTimes.current = [];
    }
    onClick?.(event);
  }

  return (
    <button
      {...buttonProps}
      className={mergedClassName}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      title={title}
    >
      {adaptedText}
    </button>
  );
}

function isWithinMissedTapRange(event: MouseEvent<HTMLButtonElement>): boolean {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  if (inside) {
    return false;
  }
  const nearX = x >= rect.left - 20 && x <= rect.right + 20;
  const nearY = y >= rect.top - 20 && y <= rect.bottom + 20;
  return nearX && nearY;
}
