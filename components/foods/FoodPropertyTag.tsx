'use client';

export const PROPERTY_LABELS: Record<string, string> = {
  oxalate: 'Oxalate',
  histamine: 'Histamine',
  lectin: 'Lectin',
  nightshade: 'Nightshade',
  fodmap: 'FODMAP',
  salicylate: 'Salicylate',
  amines: 'Amines',
  glutamates: 'Glutamates',
  sulfites: 'Sulfites',
  goitrogens: 'Goitrogens',
  purines: 'Purines',
  phytoestrogens: 'Phytoestrogens',
  phytates: 'Phytates',
  tyramine: 'Tyramine',
};

interface FoodPropertyTagProps {
  property: string;
  severity?: string;
}

/** Yes/no facts carry no level (stored as "high"); they read as a description. */
const YES_NO_TAGS: Record<string, string> = {
  nightshade: 'Nightshade',
  histamine_liberator: 'May release histamine',
};

/** "Very high oxalate", "Moderate histamine", "High FODMAP", "May release histamine": never a raw key. */
export function propertyTagText(property: string, severity?: string | null): string {
  if (YES_NO_TAGS[property]) return YES_NO_TAGS[property];
  const label = PROPERTY_LABELS[property] ?? property.replace(/_/g, ' ');
  if (!severity) return label.charAt(0).toUpperCase() + label.slice(1);
  const noun = label === label.toUpperCase() ? label : label.toLowerCase();
  const level = severity.replace(/_/g, ' ');
  return `${level.charAt(0).toUpperCase()}${level.slice(1)} ${noun}`;
}

export function FoodPropertyTag({ property, severity }: FoodPropertyTagProps) {
  const display = propertyTagText(property, severity);

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-600 ring-1 ring-inset ring-warm-200/60">
      {display}
    </span>
  );
}
