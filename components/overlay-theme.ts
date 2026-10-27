import type { OverlayGradientConfig } from "@/lib/overlay-customization"

/*
 * Fixed visual theme shared by every on-stream overlay (leaderboard, goal, account card, donation total).
 * Overlays intentionally ignore any legacy colour / gradient / opacity values saved in a creator's
 * customization so every stream looks consistent and legible. Saved values are left untouched.
 */

export const overlayPanelClass =
  "rounded-2xl border border-white/10 bg-[#0B0B0E] text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]"

export const overlayLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400"

export const overlayMutedTextClass = "text-zinc-400"

/** Progress fill / icon accent used on the goal bar. Neutral, high-contrast on near-black. */
export const OVERLAY_ACCENT_COLOR = "#E4E4E7"

/**
 * Empty stops make DonationAlert fall back to each gift pack's own built-in accents instead of
 * any legacy custom alert gradient.
 */
export const OVERLAY_NEUTRAL_ALERT_GRADIENT: OverlayGradientConfig = {
  start: "",
  middle: "",
  end: "",
}
