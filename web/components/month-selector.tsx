"use client";

import { useRouter } from "next/navigation";

type Props = {
  months: { value: string; label: string }[];
  selected: string;
};

export function MonthSelector({ months, selected }: Props) {
  const router = useRouter();

  return (
    <select
      className="field"
      value={selected}
      onChange={(e) => router.push(`/usage?month=${e.target.value}`)}
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--r-md)",
        color: "var(--text)",
        padding: "8px 14px",
        fontSize: "0.87rem",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {months.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
