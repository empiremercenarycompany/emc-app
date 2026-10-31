export const STR_COMPONENTS = [
  "overhead_press",
  "carry",
  "horizontal_push",
  "horizontal_pull",
  "leg",
] as const;

export type StrComponent = (typeof STR_COMPONENTS)[number];

export const EQUIPMENT_VERSIONS = ["functional", "full_gym", "at_home"] as const;
export type EquipmentVersion = (typeof EQUIPMENT_VERSIONS)[number];

export const EQUIPMENT_LABELS: Record<EquipmentVersion, string> = {
  functional: "Functional",
  full_gym: "Full gym",
  at_home: "At home",
};

export const COMPONENT_LABELS: Record<StrComponent, string> = {
  overhead_press: "Overhead press",
  carry: "Carry",
  horizontal_push: "Horizontal push",
  horizontal_pull: "Horizontal pull",
  leg: "Leg movement",
};

export function missingStrComponents(components: readonly string[]): StrComponent[] {
  return STR_COMPONENTS.filter((component) => !components.includes(component));
}

export function publishBlockReason(input: {
  attribute: string;
  components: readonly string[];
  equipment: readonly string[];
}): string | null {
  const missingEquipment = EQUIPMENT_VERSIONS.filter((version) => !input.equipment.includes(version));
  if (missingEquipment.length > 0) {
    return "Publishing requires a functional, full gym, and at-home version.";
  }
  if (input.attribute === "str") {
    const missing = missingStrComponents(input.components);
    if (missing.length > 0) {
      return `A STR workout needs ${missing.map((item) => COMPONENT_LABELS[item]).join(", ")}.`;
    }
  }
  return null;
}
