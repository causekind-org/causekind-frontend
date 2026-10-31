import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { DiwaliLogo } from "./DiwaliLogo";

describe("DiwaliLogo", () => {
  it("keeps the name as real text and carries no media to key or fetch", () => {
    const { container } = render(<DiwaliLogo />);

    expect(container.textContent).toBe("CauseKind");
    expect(container.querySelector("video, img")).toBeNull();
  });

  it("draws a diya flame and three firecrackers", () => {
    const { container } = render(<DiwaliLogo />);

    expect(container.querySelector(".ck-dlogo-flame")).not.toBeNull();
    expect(container.querySelectorAll(".ck-dlogo-burst")).toHaveLength(3);
  });

  it("is decorative and lets clicks through the fireworks", () => {
    const { container } = render(<DiwaliLogo />);

    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    for (const burst of container.querySelectorAll(".ck-dlogo-burst")) {
      expect(burst.getAttribute("class")).toMatch(/pointer-events-none/);
    }
  });

  it("gives each instance its own gradients, since the mobile header's copy is display:none on desktop", () => {
    const { container } = render(<><DiwaliLogo /><DiwaliLogo /></>);
    const ids = [...container.querySelectorAll("linearGradient")].map((el) => el.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
