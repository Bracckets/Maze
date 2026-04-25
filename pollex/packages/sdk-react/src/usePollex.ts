import { useContext } from "react";

import { PollexContext } from "./PollexProvider";

export function usePollex() {
  const value = useContext(PollexContext);
  if (!value) {
    throw new Error("usePollex must be used inside PollexProvider.");
  }
  return value;
}
