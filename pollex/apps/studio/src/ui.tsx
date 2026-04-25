import type { ReactNode } from "react";
import { forwardRef } from "react";

export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          {title ? <h2 className="text-sm font-semibold text-gray-900">{title}</h2> : <span />}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="text-xs font-medium uppercase tracking-normal text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-950">{value}</div>
    </div>
  );
}

export function ModeBadge({ mode }: { mode?: string }) {
  const classes =
    mode === "autopilot"
      ? "border border-gray-200 bg-green-100 text-green-800"
      : mode === "suggest"
        ? "border border-gray-200 bg-yellow-100 text-yellow-800"
        : "border border-gray-200 bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes}`}>{mode ?? "observe"}</span>;
}

export function TraitTag({ trait }: { trait: string }) {
  return <span className="rounded-full border border-gray-200 bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">{trait}</span>;
}

export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-xl border border-gray-200 bg-gray-950 p-4 font-mono text-xs leading-5 text-gray-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function EmptyState({ title }: { title: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">{title}</div>;
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(props, ref) {
  return <input {...props} ref={ref} className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${props.className ?? ""}`} />;
});

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const variant = props.variant ?? "primary";
  const className =
    variant === "secondary"
      ? "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      : "border border-white bg-indigo-600 text-white hover:bg-indigo-700";
  return (
    <button
      {...props}
      className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className} ${props.className ?? ""}`}
    />
  );
}
