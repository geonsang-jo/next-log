/** @type {import('next').NextConfig} */

const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
});

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

module.exports = withMDX({
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    // Defensive redirects for legacy URLs without a locale prefix.
    // Default to /ko since these URLs were the original Korean blog paths
    // before the URL refactor; existing readers + cached browser redirects
    // landing here are most likely Korean speakers.
    // permanent: false (307) so this can be removed later without lingering
    // browser cache problems.
    return [
      {
        source: "/posts",
        destination: "/ko/posts",
        permanent: true,
      },
      {
        source: "/posts/:slug*",
        destination: "/ko/posts/:slug*",
        permanent: true,
      },
      {
        source: "/resume",
        destination: "/ko/resume",
        permanent: true,
      },
    ];
  },
});
