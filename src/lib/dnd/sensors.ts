// lib/dnd/sensors.ts
import { useSensor, useSensors, PointerSensor, TouchSensor } from "@dnd-kit/core";

export function useDefaultSensors() {
  return useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
}