"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/locale-provider";

type Props = {
  months: { value: string; label: string }[];
  selected: string;
};

export function MonthSelector({ months, selected }: Props) {
  const { locale } = useI18n();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedMonth = useMemo(
    () => months.find((month) => month.value === selected) ?? months[0],
    [months, selected],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="surface-select" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`surface-select-trigger ${isOpen ? "open" : ""}`}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="surface-select-value">{selectedMonth?.label ?? (locale === "ar" ? "اختر شهراً" : "Select month")}</span>
        <span className="surface-select-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="surface-select-popover" role="menu">
          {months.map((month) => (
            <button
              className={`surface-select-option ${month.value === selected ? "active" : ""}`}
              key={month.value}
              role="menuitemradio"
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(`/usage?month=${month.value}`);
              }}
            >
              <span>{month.label}</span>
              {month.value === selected ? <strong>{locale === "ar" ? "الحالي" : "Current"}</strong> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
