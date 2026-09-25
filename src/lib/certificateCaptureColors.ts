/** html2canvas 1.x cannot parse modern CSS colours. Normalize only its clone. */
export function normalizeCertificateColors(document: Document, certificate: HTMLElement) {
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const view = document.defaultView;
  if (!context || !view) throw new Error("Your browser could not prepare the certificate download.");
  const properties = [
    "color", "background-color", "background-image", "border-top-color", "border-right-color",
    "border-bottom-color", "border-left-color", "outline-color", "text-decoration-color",
    // html2canvas parses stroke colour even when the stroke width is zero.
    "-webkit-text-stroke-color", "-webkit-text-fill-color",
    "box-shadow", "text-shadow", "list-style-image", "fill", "stroke",
  ];
  function compatible(value: string): string {
    const pattern = /\b(?:oklab|oklch|lab|lch|color|color-mix|light-dark)\(/g;
    let match: RegExpExecArray | null;
    let result = "", last = 0;
    while ((match = pattern.exec(value))) {
      let end = pattern.lastIndex, depth = 1;
      while (end < value.length && depth) {
        if (value[end] === "(") depth++;
        if (value[end] === ")") depth--;
        end++;
      }
      const colour = value.slice(match.index, end);
      context!.clearRect(0, 0, 1, 1);
      context!.fillStyle = colour;
      context!.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context!.getImageData(0, 0, 1, 1).data;
      result += value.slice(last, match.index) + `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      last = end;
      pattern.lastIndex = end;
    }
    return result + value.slice(last);
  }
  const elements = new Set<HTMLElement | SVGElement>([
    document.documentElement, document.body, certificate,
    ...certificate.querySelectorAll<HTMLElement | SVGElement>("*"),
  ]);
  // Freeze inherited colours along the entire path, not only html/body.
  for (let ancestor = certificate.parentElement; ancestor; ancestor = ancestor.parentElement) {
    elements.add(ancestor);
  }
  // Snapshot first so changing inherited colours cannot affect later reads.
  const snapshots = [...elements].map(element => {
    const computed = view.getComputedStyle(element);
    return { element, values: properties.map(property => [property, compatible(computed.getPropertyValue(property))] as const) };
  });
  for (const { element, values } of snapshots) {
    for (const [property, value] of values) if (value) element.style.setProperty(property, value, "important");
  }
}
