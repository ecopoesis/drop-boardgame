// Small presentational helpers shared by UI components.
import type { Effect, ResourceBag } from "../engine";

export const RESOURCE_ICON: Record<keyof ResourceBag, string> = {
  firestone: "🔥",
  food: "🍖",
  eggs: "🥚",
  marks: "🪙",
};

export function describeEffect(e: Effect | undefined): string {
  if (!e) return "—";
  const parts: string[] = [];
  if (e.resources) {
    for (const [k, v] of Object.entries(e.resources)) {
      if (v) parts.push(`${RESOURCE_ICON[k as keyof ResourceBag]}${v > 0 ? "+" : ""}${v}`);
    }
  }
  if (e.fight) parts.push(`⚔️+${e.fight}`);
  if (e.draw) parts.push(`🎴+${e.draw}`);
  if (e.redStar) parts.push(`⭐+${e.redStar}`);
  if (e.vp) parts.push(`🏆+${e.vp}`);
  return parts.length ? parts.join(" ") : "—";
}

export function describeResources(r: ResourceBag): string {
  return (Object.keys(r) as Array<keyof ResourceBag>)
    .map((k) => `${RESOURCE_ICON[k]}${r[k]}`)
    .join("  ");
}
