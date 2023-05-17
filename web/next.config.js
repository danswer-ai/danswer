/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: "standalone",
  redirects: async () => {
    // In production, something else (nginx in the one box setup) should take
    // care of this redirect. Leaving in for now due to issues with dev setup
    // and accessing `process.env.NODE_ENV` + for cases where people don't want
    // to setup nginx and are okay with the frontend proxying the request.
    // TODO (chris): better support non-nginx setups
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.INTERNAL_URL || "http://localhost:8080"
        }/:path*`, // Proxy to Backend
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
