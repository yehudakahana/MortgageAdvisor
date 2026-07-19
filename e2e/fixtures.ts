import { test as base, expect } from "@playwright/test";

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Global network guard: every page request to a non-localhost origin is
// aborted on the spot (breaking whatever flow depended on it) and recorded so
// the test also fails with an explicit list of the offending URLs.
export const test = base.extend({
  page: async ({ page }, use) => {
    const externalRequests: string[] = [];
    await page.route("**/*", (route) => {
      const { hostname, href } = new URL(route.request().url());
      if (ALLOWED_HOSTS.has(hostname)) return route.continue();
      externalRequests.push(href);
      return route.abort("blockedbyclient");
    });

    await use(page);

    expect(
      externalRequests,
      `Blocked external requests during test: ${externalRequests.join(", ")}`
    ).toEqual([]);
  },
});

export { expect };
