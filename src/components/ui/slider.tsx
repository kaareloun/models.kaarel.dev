import * as React from "react";
import { Badge } from "~/components/ui/badge";
import * as SliderPrimitive from "@radix-ui/react-slider";

type SliderProps = {
  min: number;
  max: number;
  step: number;
  value: number[];
  onChange: (value: number[]) => void;
};

export default function Slider(props: SliderProps) {
  return (
    <div className="relative w-full flex flex-col items-center max-w-sm pb-6">
      <SliderPrimitive.Root
        max={props.max}
        step={props.step}
        onValueChange={props.onChange}
        className="relative flex w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>

        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          {/* Sticky label */}
          {props.value[0] > 0 && (
            <Badge className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 -bottom-4 px-1">
              ${props.value[0]}
            </Badge>
          )}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </div>
  );
}
