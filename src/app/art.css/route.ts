import { artCss } from "@/game/tiles/art";

// The pixel-art pieces are CSS data URIs (about 49 KB). As a file they are cached by the browser and stay out of the
// HTML, where they used to sit twice (inline <style> and the page payload) in front of the first paint.
export const dynamic = "force-static";

export function GET() {
  return new Response(artCss(), { headers: { "Content-Type": "text/css; charset=utf-8" } });
}
