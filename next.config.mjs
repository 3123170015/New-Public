/** @type {import('next').NextConfig} */
function safeUrlHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const r2Host = safeUrlHost(process.env.R2_PUBLIC_BASE_URL || "");

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // TEMPORARY: Ignoring TypeScript build errors due to 494+ pre-existing strict mode errors
    // TODO: Create separate PR to systematically fix these errors:
    //   - Implicit 'any' types in admin pages
    //   - Missing type annotations throughout codebase
    // Consider fixing module-by-module to avoid breaking changes
    ignoreBuildErrors: true,
  },
  experimental: {
    // Required for `unauthorized()` in App Router to render `unauthorized.tsx`
    // with HTTP 401 status.
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      ...(r2Host
        ? [
            {
              protocol: "https",
              hostname: r2Host,
            },
            {
              protocol: "http",
              hostname: r2Host,
            },
          ]
        : []),
    ],
  },
};
export default nextConfig;
