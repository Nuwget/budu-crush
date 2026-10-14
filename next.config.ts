import type { NextConfig } from "next";

// GitHub Pages: user site (nuwget.github.io) serves from "/", a project site
// serves from "/<repo>". Set NEXT_PUBLIC_BASE_PATH=/<repo> at build time for the latter.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  // `next dev` blocks other devices by default: without this a phone on the same Wi-Fi gets the page but no JavaScript
  // (you see only the background, no menu). Private-network addresses only; it has no effect on the exported site.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  images: { unoptimized: true },
  // always defined, so a normal build folds the QA hook (GameScreen) away; NEXT_PUBLIC_QA=1 keeps it for scripts/qa-cascade.mjs
  env: { NEXT_PUBLIC_QA: process.env.NEXT_PUBLIC_QA ?? "" },
};

export default nextConfig;
