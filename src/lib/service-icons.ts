/**
 * The line icons a service can carry on its card tile. They're painted
 * through CSS masks, which need same-origin SVGs, so services pick from this
 * built-in set rather than uploading their own.
 */
export const SERVICE_ICONS = [
  { value: "/icons/physio-departments/manual-therapy.svg", label: "Manual therapy" },
  { value: "/icons/physio-departments/exercise-therapy.svg", label: "Exercise therapy" },
  { value: "/icons/physio-departments/sports-injury.svg", label: "Sports injury" },
  { value: "/icons/physio-departments/knee-pain.svg", label: "Knee & joints" },
  { value: "/icons/physio-departments/back-neck.svg", label: "Back & neck" },
  { value: "/icons/physio-departments/foot-ankle.svg", label: "Foot & ankle" },
] as const;

export const DEFAULT_SERVICE_ICON = SERVICE_ICONS[0].value;

export function isServiceIcon(value: string): boolean {
  return SERVICE_ICONS.some((icon) => icon.value === value);
}
