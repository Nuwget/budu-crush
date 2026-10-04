"use client";

import { DICTS } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { useSaved } from "@/state/store";

/** The active dictionary. Portuguese until the player picks a language. */
export function useT(): Dict {
  const { lang } = useSaved();
  return DICTS[lang ?? "pt"];
}
