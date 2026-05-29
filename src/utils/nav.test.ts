import { describe, it, expect } from "vitest";
import { getNavItems } from "./nav";

describe("getNavItems", () => {
  it("returns STAFF, CLIENTS, LOGINS, PROFILE for admin role", () => {
    const items = getNavItems("admin");
    expect(items).toEqual([
      { path: "/staff", label: "STAFF" },
      { path: "/clients", label: "CLIENTS" },
      { path: "/logins", label: "LOGINS" },
      { path: "/profile", label: "PROFILE" },
    ]);
  });

  it("returns DASHBOARD and PROFILE for staff role", () => {
    const items = getNavItems("staff");
    expect(items).toEqual([
      { path: "/home", label: "DASHBOARD" },
      { path: "/profile", label: "PROFILE" },
    ]);
  });

  it("returns STAFF and PROFILE for client role", () => {
    const items = getNavItems("client");
    expect(items).toEqual([
      { path: "/assigned", label: "STAFF" },
      { path: "/profile", label: "PROFILE" },
    ]);
  });

  it("returns empty array for unknown role", () => {
    const items = getNavItems("unknown");
    expect(items).toEqual([]);
  });
});
