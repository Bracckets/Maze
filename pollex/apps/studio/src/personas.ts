export interface Persona {
  id: "normal" | "hesitant" | "missed-tap" | "arabic" | "high-friction";
  label: string;
  userId: string;
  traits: Record<string, unknown>;
  summary: string;
}

export const personas: Persona[] = [
  {
    id: "normal",
    label: "Normal/Confident",
    userId: "normal_user",
    traits: {},
    summary: "No strong traits. The UI stays default and fallback=true."
  },
  {
    id: "hesitant",
    label: "Hesitant",
    userId: "hesitant_user",
    traits: { hesitation_score: 0.7, prefers_simple_copy: true, prefers_more_guidance: true },
    summary: "Simpler button text and guidance appear."
  },
  {
    id: "missed-tap",
    label: "Missed-tap",
    userId: "missed_tap_user",
    traits: { misclick_score: 0.85, needs_larger_targets: true },
    summary: "Buttons get larger semantic size classes."
  },
  {
    id: "arabic",
    label: "Arabic-preferred",
    userId: "arabic_user",
    traits: { locale: "ar", prefers_arabic: true },
    summary: "Safe static Arabic labels replace CTA text."
  },
  {
    id: "high-friction",
    label: "High-friction",
    userId: "high_friction_user",
    traits: { frustration_score: 0.75, high_friction: true, hesitation_score: 0.6 },
    summary: "Reassurance tooltips appear on progress actions."
  }
];
