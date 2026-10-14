import type { MetadataRoute } from "next";
import { asset } from "@/lib/asset";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dudu & Bubu",
    short_name: "Dudu & Bubu",
    description: "A cozy midnight match-3 puzzle.",
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#06051a",
    theme_color: "#06051a",
    icons: [{ src: asset("/icon.svg"), sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
