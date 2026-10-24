import { useRef } from "react";
import VariableProximity from "./bits/VariableProximity";

// The headline thickens and widens under the pointer, as if the type were being inspected.
export default function HeroTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  return (
    <h1 ref={ref} className="display hero-title">
      <VariableProximity
        label={text}
        containerRef={ref}
        fromFontVariationSettings="'wght' 640, 'wdth' 112"
        toFontVariationSettings="'wght' 860, 'wdth' 125"
        radius={150}
        falloff="gaussian"
        smoothing={0.25}
      />
    </h1>
  );
}
