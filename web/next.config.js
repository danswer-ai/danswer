// Get Danswer Web Version
const { version: package_version } = require("./package.json"); // version from package.json
const env_version = process.env.DANSWER_VERSION; // version from env variable
// Use env version if set & valid, otherwise default to package version
const version = env_version || package_version;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  swcMinify: true,
  rewrites: async () => {
    const eeRedirects =
      process.env.NEXT_PUBLIC_EE_ENABLED === "true"
        ? [
            // user group pages
            {
              source: "/admin/groups",
              destination: "/ee/admin/groups",
            },
            {
              source: "/admin/groups/:path*",
              destination: "/ee/admin/groups/:path*",
            },
            {
              source: "/admin/api-key",
              destination: "/ee/admin/api-key",
            },
            // analytics / audit log pages
            {
              source: "/admin/performance/analytics",
              destination: "/ee/admin/performance/analytics",
            },
            {
              source: "/admin/performance/query-history",
              destination: "/ee/admin/performance/query-history",
            },
            {
              source: "/admin/performance/query-history/:path*",
              destination: "/ee/admin/performance/query-history/:path*",
            },
            // whitelabeling
            {
              source: "/admin/whitelabeling",
              destination: "/ee/admin/whitelabeling",
            },
          ]
        : [];

    // In production, something else (nginx in the one box setup) should take
    // care of this rewrite. TODO (chris): better support setups where
    // web_server and api_server are on different machines.
    if (process.env.NODE_ENV === "production") return eeRedirects;

    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8080/:path*", // Proxy to Backend
      },
    ].concat(eeRedirects);
  },
  redirects: async () => {
    // In production, something else (nginx in the one box setup) should take
    // care of this redirect. TODO (chris): better support setups where
    // web_server and api_server are on different machines.
    const defaultRedirects = [];

    if (process.env.NODE_ENV === "production") return defaultRedirects;

    return defaultRedirects.concat([
      {
        source: "/api/chat/send-message:params*",
        destination: "http://127.0.0.1:8080/chat/send-message:params*", // Proxy to Backend
        permanent: true,
      },
      {
        source: "/api/query/stream-answer-with-quote:params*",
        destination:
          "http://127.0.0.1:8080/query/stream-answer-with-quote:params*", // Proxy to Backend
        permanent: true,
      },
      {
        source: "/api/query/stream-query-validation:params*",
        destination:
          "http://127.0.0.1:8080/query/stream-query-validation:params*", // Proxy to Backend
        permanent: true,
      },
    ]);
  },
  publicRuntimeConfig: {
    version,
  },
};

module.exports = nextConfig;
