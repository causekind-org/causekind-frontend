import { describe, it, expect, beforeEach } from "vitest";
import { themeForRole, roleColors, ROLE_THEMES, ROLE_THEME_ATTR, ROLE_THEME_BOOT_SCRIPT } from "./roleTheme";

describe("roleTheme Suite", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(ROLE_THEME_ATTR);
    document.documentElement.removeAttribute("data-theme-role");
    localStorage.clear();
  });

  describe("themeForRole", () => {
    it("maps NGO and NGO_PARTNER to 'ngo'", () => {
      expect(themeForRole("NGO_PARTNER")).toBe("ngo");
      expect(themeForRole("ngo")).toBe("ngo");
      expect(themeForRole("NGO_PARTNER")).toBe("ngo");
      expect(themeForRole("ngo_partner")).toBe("ngo");
    });

    it("maps DONOR and DONEE correctly", () => {
      expect(themeForRole("DONOR")).toBe("donor");
      expect(themeForRole("donor")).toBe("donor");
      expect(themeForRole("DONEE")).toBe("donee");
      expect(themeForRole("donee")).toBe("donee");
    });

    it("returns null for ADMIN, SUPER_ADMIN, guests, and unknown roles", () => {
      expect(themeForRole("ADMIN")).toBeNull();
      expect(themeForRole("SUPER_ADMIN")).toBeNull();
      expect(themeForRole(null)).toBeNull();
      expect(themeForRole(undefined)).toBeNull();
      expect(themeForRole("")).toBeNull();
      expect(themeForRole("UNKNOWN")).toBeNull();
    });
  });

  describe("roleColors", () => {
    it("returns NGO forest green palette in light mode", () => {
      const colors = roleColors("ngo", false);
      expect(colors.accent).toBe("#1E6B4F");
      expect(colors.hover).toBe("#248A63");
      expect(colors.secondary).toBe("#34A578");
      expect(colors.highlight).toBe("#86CFAE");
      expect(colors.deep).toBe("#123D2E");
    });

    it("returns NGO palette in dark mode", () => {
      const colors = roleColors("ngo", true);
      expect(colors.accent).toBe("#86CFAE");
      expect(colors.hover).toBe("#A7DEC5");
      expect(colors.secondary).toBe("#34A578");
      expect(colors.highlight).toBe("#A7DEC5");
      expect(colors.deep).toBe("#185740");
      expect(colors.onAccent).toBe("#0B2E22");
    });

    it("preserves Donor terracotta and Donee blue palettes", () => {
      const donor = roleColors("donor", false);
      expect(donor.accent).toBe("#b04a15");

      const donee = roleColors("donee", false);
      expect(donee.accent).toBe("#1e3a60");
    });
  });

  describe("ROLE_THEME_BOOT_SCRIPT", () => {
    it("sets data-ck-role-theme and data-theme-role to 'ngo' before first paint for NGO user", () => {
      localStorage.setItem("ck_user", JSON.stringify({ email: "contact@ngo.org", role: "NGO_PARTNER" }));
      // Execute the script
      eval(ROLE_THEME_BOOT_SCRIPT);

      expect(document.documentElement.getAttribute("data-ck-role-theme")).toBe("ngo");
      expect(document.documentElement.getAttribute("data-theme-role")).toBe("ngo");
    });

    it("sets attributes to 'ngo' for NGO_PARTNER", () => {
      localStorage.setItem("ck_user", JSON.stringify({ email: "partner@ngo.org", role: "NGO_PARTNER" }));
      eval(ROLE_THEME_BOOT_SCRIPT);

      expect(document.documentElement.getAttribute("data-ck-role-theme")).toBe("ngo");
      expect(document.documentElement.getAttribute("data-theme-role")).toBe("ngo");
    });

    it("sets attributes to 'donor' for DONOR without affecting non-NGO roles", () => {
      localStorage.setItem("ck_user", JSON.stringify({ email: "donor@example.com", role: "DONOR" }));
      eval(ROLE_THEME_BOOT_SCRIPT);

      expect(document.documentElement.getAttribute("data-ck-role-theme")).toBe("donor");
      expect(document.documentElement.getAttribute("data-theme-role")).toBe("donor");
    });

    it("does not set attributes for unauthenticated users", () => {
      localStorage.removeItem("ck_user");
      eval(ROLE_THEME_BOOT_SCRIPT);

      expect(document.documentElement.getAttribute("data-ck-role-theme")).toBeNull();
      expect(document.documentElement.getAttribute("data-theme-role")).toBeNull();
    });
  });
});
