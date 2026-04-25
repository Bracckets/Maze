import { useEffect } from "react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

import type { AllowConfig, ConstraintConfig, ContextConfig } from "@pollex/sdk-js";

import { usePollex } from "../usePollex";
import { useTactusDecision } from "../useTactusDecision";

export interface PollexTextProps extends HTMLAttributes<HTMLElement> {
  id: string;
  intent: string;
  allow: AllowConfig;
  constraints?: ConstraintConfig;
  context?: ContextConfig;
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function PollexText({ id, intent, allow, constraints, context, children, as = "span", className, ...props }: PollexTextProps) {
  const Component = as as ElementType;
  const { client, userId, anonymousId } = usePollex();
  const defaultText = typeof children === "string" ? children : undefined;
  const decision = useTactusDecision({
    id,
    type: "text",
    intent,
    defaultProps: { text: defaultText },
    allow,
    constraints,
    context
  });
  const text = decision.isAdapted && typeof decision.adaptations.text === "string" ? decision.adaptations.text : children;

  useEffect(() => {
    void client.track({
      subject_id: userId,
      anonymous_id: anonymousId,
      events: [{ element_key: id, event_type: "element_seen", context: context ?? {} }]
    });
  }, [anonymousId, client, context, id, userId]);

  return (
    <Component {...props} className={className}>
      {text}
    </Component>
  );
}
