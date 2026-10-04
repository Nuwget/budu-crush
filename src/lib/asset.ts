// GitHub Pages can serve the site from a sub-path (/<repo>). Plain <img>, CSS url()
// and metadata do not get the basePath prepended automatically, so every static
// asset goes through this helper.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
