// Get Danswer Web Version
const { version: package_version } = require("./package.json"); // version from package.json
const env_version = process.env.DANSWER_VERSION; // version from env variable
// Use env version if set & valid, otherwise default to package version
const version = env_version || package_version;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  swcMinify: true,
  publicRuntimeConfig: {
    version,
  },
};

const { withSentryConfig } = require("@sentry/nextjs");

// Sentry configuration for error monitoring:
// - Without SENTRY_AUTH_TOKEN and NEXT_PUBLIC_SENTRY_DSN: Sentry is completely disabled
// - With both configured: Only unhandled errors are captured (no performance/session tracking)
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "danswer",
  project: process.env.SENTRY_PROJECT || "data-plane-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: false,
  sourceMaps: {
    skipUpload: !process.env.SENTRY_AUTH_TOKEN,
  },
});
