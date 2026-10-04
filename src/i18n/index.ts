import type { Dict } from "./en.ts";
import { en } from "./en.ts";
import { pt } from "./pt.ts";

export type Lang = "pt" | "en";
export const DICTS: Record<Lang, Dict> = { en: en as Dict, pt };
