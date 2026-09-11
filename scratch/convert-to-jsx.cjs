const fs = require('fs');

function toJsx(svgContent, componentName, defaultClass) {
  let jsx = svgContent;
  // Replace attributes
  jsx = jsx.replace(/stop-color/g, 'stopColor')
           .replace(/stop-opacity/g, 'stopOpacity')
           .replace(/stroke-width/g, 'strokeWidth')
           .replace(/stroke-opacity/g, 'strokeOpacity')
           .replace(/stroke-linecap/g, 'strokeLinecap')
           .replace(/flood-color/g, 'floodColor')
           .replace(/flood-opacity/g, 'floodOpacity')
           .replace(/class=/g, 'className=')
           .replace(/style="transform-origin: ([^"]+);"/g, 'style={{ transformOrigin: "$1" }}');

  // Insert className prop into <svg>
  jsx = jsx.replace('<svg ', `<svg className={className} `);

  return `
export function ${componentName}({ className = "${defaultClass}" }: { className?: string }) {
  return (
    ${jsx}
  );
}
`;
}

const leftSvg = fs.readFileSync('scratch/garland_left.svg', 'utf8');
const rightSvg = fs.readFileSync('scratch/garland_right.svg', 'utf8');

const leftJsx = toJsx(leftSvg, 'GanpatiGarlandLeft', 'w-full h-auto');
const rightJsx = toJsx(rightSvg, 'GanpatiGarlandRight', 'w-full h-auto');

fs.writeFileSync('scratch/garland_jsx.tsx', leftJsx + '\n' + rightJsx);
console.log('JSX generated successfully!');
