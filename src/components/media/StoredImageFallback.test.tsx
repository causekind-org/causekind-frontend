import { describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { StoredImageFallback, STORED_IMAGE_PLACEHOLDER, isStoredFileUrl } from "./StoredImageFallback";

describe("StoredImageFallback", () => {
  it("swaps a failed stored image for the placeholder and leaves other images alone", () => {
    const { container } = render(
      <div>
        <StoredImageFallback />
        <img alt="a" src="https://causekind-staging-images.s3.ap-southeast-1.amazonaws.com/ngo-photos/a.webp" />
        <img alt="b" src="https://images.example.org/b.jpg" />
      </div>,
    );
    const [stored, other] = Array.from(container.querySelectorAll("img"));
    fireEvent.error(stored);
    fireEvent.error(other);
    expect(stored.getAttribute("src")).toBe(STORED_IMAGE_PLACEHOLDER);
    expect(other.getAttribute("src")).toBe("https://images.example.org/b.jpg");
    expect(isStoredFileUrl("http://localhost:8080/local-uploads/x.jpg")).toBe(true);
  });
});
