import type { NextConfig } from "next";

// GitHub Pages: user site (nuwget.github.io) serves from "/", a project site
// serves from "/<repo>". Set NEXT_PUBLIC_BASE_PATH=/<repo> at build time for the latter.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
