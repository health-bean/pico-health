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

export function FoodPropertyTag({ property, severity }: FoodPropertyTagProps) {
  const label = PROPERTY_LABELS[property] ?? property;
  const severityLabel = severity && severity !== 'high' ? `${severity} ` : '';
  const display = severity === 'high' || !severity ? label : `${severityLabel}${label.toLowerCase()}`;

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-warm-100 text-warm-600 ring-1 ring-inset ring-warm-200/60">
      {display}
    </span>
  );
}
