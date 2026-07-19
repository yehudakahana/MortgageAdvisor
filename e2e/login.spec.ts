import { expect, test } from "./fixtures";

// Full login flow against the real local backend — auth here is local
// username/password + JWT (no external provider exists to mock). Credentials
// match ALLOWED_USERS in backend/src/test/testEnv.ts; the client list is
// seeded by backend/src/test/e2eServer.ts into the in-memory test database.
test("login reaches the app and shows the seeded client", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("שם משתמש")).toBeVisible();
  await page.getByLabel("שם משתמש").fill("testuser");
  await page.getByLabel("סיסמה").fill("testpass");
  await page.getByRole("button", { name: "התחברות" }).click();

  // Post-login app shell is rendered.
  await expect(page.getByRole("button", { name: "התנתקות" })).toBeVisible();

  // The seeded client (from the throwaway DB, not the real one) is listed.
  await expect(page.getByText("ישראל ישראלי")).toBeVisible();
  await expect(page.getByText("050-1234567")).toBeVisible();
});
