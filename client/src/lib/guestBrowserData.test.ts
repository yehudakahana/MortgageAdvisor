import { beforeEach, describe, expect, it } from "vitest";
import { clearGuestBrowserData, isTokenExpired } from "./guestBrowserData";

const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp }))}.s`;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("guest_welcome_seen", "x|1");
  localStorage.setItem("guest_remaining_messages", "x|5");
  localStorage.setItem("guest_device_id", "dev");
});

describe("clearGuestBrowserData", () => {
  it("keeps the device id on manual sign-out", () => {
    clearGuestBrowserData({ includeDeviceId: false });
    expect(localStorage.getItem("guest_welcome_seen")).toBeNull();
    expect(localStorage.getItem("guest_remaining_messages")).toBeNull();
    expect(localStorage.getItem("guest_device_id")).toBe("dev");
  });
  it("removes everything once the account is expired", () => {
    clearGuestBrowserData({ includeDeviceId: true });
    expect(localStorage.getItem("guest_device_id")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("detects past, future and malformed tokens", () => {
    const now = Date.now();
    expect(isTokenExpired(jwt(Math.floor(now / 1000) - 5), now)).toBe(true);
    expect(isTokenExpired(jwt(Math.floor(now / 1000) + 500), now)).toBe(false);
    expect(isTokenExpired("garbage", now)).toBe(true);
  });
});
