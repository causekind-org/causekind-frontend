import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
// @ts-expect-error — StaggeredMenu is the JS/CSS React Bits variant (no types shipped)
import StaggeredMenu from "./StaggeredMenu";

describe("StaggeredMenu Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockItems = [
    { label: "Home", link: "/", active: true },
    {
      label: "My Drives",
      active: false,
      children: [
        { label: "Start a Drive", link: "/ngo/drives/new", isLocked: false },
        { label: "Live Drives", isLocked: true, onClick: vi.fn() },
        { label: "Handovers & Photos", isLocked: true, onClick: vi.fn() },
      ],
    },
    { label: "Blog", link: "/blog", active: false },
    { label: "About Us", link: "/about", active: false },
  ];

  it("renders top-level items with parent button for expandable items", () => {
    render(
      <StaggeredMenu
        open={true}
        onClose={vi.fn()}
        items={mockItems}
      />
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("My Drives")).toBeInTheDocument();
    expect(screen.getByText("Blog")).toBeInTheDocument();
    expect(screen.getByText("About Us")).toBeInTheDocument();

    const parentButton = screen.getByRole("button", { name: "My Drives" });
    expect(parentButton).toHaveAttribute("aria-expanded", "false");
    expect(parentButton).toHaveAttribute("aria-controls", "sm-submenu-my-drives");
  });

  it("expands and collapses submenu on click / tap (touch accordion behavior)", () => {
    render(
      <StaggeredMenu
        open={true}
        onClose={vi.fn()}
        items={mockItems}
      />
    );

    const parentButton = screen.getByRole("button", { name: "My Drives" });
    expect(parentButton).toHaveAttribute("aria-expanded", "false");

    // Click/tap to open
    fireEvent.click(parentButton);
    expect(parentButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Start a Drive")).toBeInTheDocument();
    expect(screen.getByText("Live Drives")).toBeInTheDocument();
    expect(screen.getByText("Handovers & Photos")).toBeInTheDocument();

    // Click/tap to close
    fireEvent.click(parentButton);
    expect(parentButton).toHaveAttribute("aria-expanded", "false");
  });

  it("closes submenu on Escape key", () => {
    render(
      <StaggeredMenu
        open={true}
        onClose={vi.fn()}
        items={mockItems}
      />
    );

    const parentButton = screen.getByRole("button", { name: "My Drives" });
    fireEvent.click(parentButton);
    expect(parentButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(parentButton, { key: "Escape" });
    expect(parentButton).toHaveAttribute("aria-expanded", "false");
  });

  it("invokes onClick for locked submenu items without navigating", () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();

    render(
      <StaggeredMenu
        open={true}
        onClose={onClose}
        onNavigate={onNavigate}
        items={mockItems}
      />
    );

    const parentButton = screen.getByRole("button", { name: "My Drives" });
    fireEvent.click(parentButton);

    const liveDrivesItem = screen.getByText("Live Drives");
    fireEvent.click(liveDrivesItem);

    expect(mockItems[1]?.children?.[1]?.onClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("invokes onNavigate for unlocked submenu items", () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();

    render(
      <StaggeredMenu
        open={true}
        onClose={onClose}
        onNavigate={onNavigate}
        items={mockItems}
      />
    );

    const parentButton = screen.getByRole("button", { name: "My Drives" });
    fireEvent.click(parentButton);

    const startDriveItem = screen.getByText("Start a Drive");
    fireEvent.click(startDriveItem);

    expect(onNavigate).toHaveBeenCalledWith("/ngo/drives/new");
    expect(onClose).toHaveBeenCalled();
  });
});
