import { icons, Tag, type LucideProps } from "lucide-react";

/**
 * Categories store a kebab-case Lucide icon name (`chef-hat`). Lucide exports
 * PascalCase components, so resolve at render time and fall back to a tag.
 * Server-safe: the full icon map only ever lands in the server bundle.
 */
export function toPascalIcon(name: string) {
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (icons as Record<string, React.ComponentType<LucideProps>>)[toPascalIcon(name)] ?? Tag;
  return <Icon {...props} />;
}
