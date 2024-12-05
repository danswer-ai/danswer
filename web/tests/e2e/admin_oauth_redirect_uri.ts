import { test, expect } from "@chromatic-com/playwright";

test(
  "Admin - OAuth Redirect - Missing Code",
  {
    tag: "@admin",
  },
  async ({ page }, testInfo) => {
    await page.goto(
      "http://localhost:3000/admin/connectors/slack/oauth/callback?state=xyz"
    );
  }
);

test(
  "Admin - OAuth Redirect - Missing State",
  {
    tag: "@admin",
  },
  async ({ page }, testInfo) => {
    await page.goto(
      "http://localhost:3000/admin/connectors/slack/oauth/callback?code=123"
    );
  }
);

test(
  "Admin - OAuth Redirect - Invalid Connector",
  {
    tag: "@admin",
  },
  async ({ page }, testInfo) => {
    await page.goto(
      "http://localhost:3000/admin/connectors/invalid-connector/oauth/callback?code=123&state=xyz"
    );
  }
);

test(
  "Admin - OAuth Redirect - No Session",
  {
    tag: "@admin",
  },
  async ({ page }, testInfo) => {
    await page.goto(
      "http://localhost:3000/admin/connectors/slack/oauth/callback?code=123&state=xyz"
    );
  }
);
