import { createElement } from "react";
import {
  BookOpen,
  ChefHat,
  Cpu,
  CookingPot,
  Dumbbell,
  Gem,
  House,
  Package,
  Plug,
  Refrigerator,
  Shirt,
  Sofa,
  Sparkles,
  SprayCan,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import { glyphNameFor } from "@/components/illustration/glyph-name";

/**
 * The one icon for a category or collection, from the storefront's single
 * icon set. Categories store a lucide-style name in the admin (`icon`); a
 * collection has none, so its name is read for a keyword instead.
 */
const ICONS: Record<string, LucideIcon> = {
  plug: Plug,
  cpu: Cpu,
  shirt: Shirt,
  sofa: Sofa,
  "chef-hat": ChefHat,
  sparkles: Sparkles,
  gem: Gem,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  package: Package,
  appliance: WashingMachine,
  "washing-machine": WashingMachine,
  washer: WashingMachine,
  refrigerator: Refrigerator,
  microwave: Refrigerator,
  kettle: CookingPot,
  coffee: CookingPot,
  "cooking-pot": CookingPot,
  utensils: CookingPot,
  blender: CookingPot,
  spray: SprayCan,
  "spray-can": SprayCan,
  brush: SprayCan,
  broom: SprayCan,
  home: House,
  house: House,
};

export function categoryIconFor(icon: string | undefined, name = ""): LucideIcon {
  return (
    (icon && ICONS[icon]) ||
    ICONS[glyphNameFor(name) ?? ""] ||
    Package
  );
}

export function CategoryIcon({
  icon,
  name,
  size = 18,
  className,
}: {
  icon?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  return createElement(categoryIconFor(icon, name), { size, className, "aria-hidden": true });
}
