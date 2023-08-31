/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: "standalone",
  rewrites: async () => {
    // In production, something else (nginx in the one box setup) should take
    // care of this rewrite. TODO (chris): better support setups where
    // web_server and api_server are on different machines.
    if (process.env.NODE_ENV === "production") return [];

    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8080/:path*", // Proxy to Backend
      },
    ];
  },
  redirects: async () => {
    // In production, something else (nginx in the one box setup) should take
    // care of this redirect. TODO (chris): better support setups where
    // web_server and api_server are on different machines.
    if (process.env.NODE_ENV === "production") return [];

    return [
      {
        source: "/api/stream-direct-qa:params*",
        destination: "http://127.0.0.1:8080/stream-direct-qa:params*", // Proxy to Backend
        permanent: true,
      },
      {
        source: "/api/stream-query-validation:params*",
        destination: "http://127.0.0.1:8080/stream-query-validation:params*", // Proxy to Backend
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
