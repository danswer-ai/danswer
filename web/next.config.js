/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: "standalone",
  redirects: async () => {
    // In production, something else (nginx in the one box setup) takes care
    // of this redirect
    // NOTE: this may get adjusted later if we want to support hosting of the
    // API server on a different domain without requring some kind of proxy
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:8080/:path*", // Proxy to Backend
          permanent: true,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
