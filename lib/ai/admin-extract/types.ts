/** A citation for one (or several, via a "default" key) property values. */
export interface SourceCitation {
  source: string;
  ref?: string;
}

/** Keyed by property name; a "default" entry may cover several properties. */
export type SourcesInput = Record<string, SourceCitation>;

export interface TriggerUpdates {
  oxalate?: string;
  histamine?: string;
  lectin?: string;
  nightshade?: boolean;
  fodmap?: string;
  salicylate?: string;
  amines?: string;
  glutamates?: string;
  sulfites?: string;
  goitrogens?: string;
  purines?: string;
  phytoestrogens?: string;
  phytates?: string;
  tyramine?: string;
}

export interface SearchFoodsInput {
  query: string;
  limit?: number;
}

export interface GetFoodDetailsInput {
  food_name: string;
}

export interface UpdateFoodTriggersInput {
  food_name: string;
  updates: TriggerUpdates;
  /** Required by the tool contract; the executor rejects updates without citations. */
  sources?: SourcesInput;
}

export interface AddFoodInput {
  name: string;
  subcategory: string;
  is_common: boolean;
  triggers: TriggerUpdates;
  /** Required by the tool contract; the executor rejects trigger values without citations. */
  sources?: SourcesInput;
}

export interface DeleteFoodInput {
  food_name: string;
}

export interface UpdateProtocolRuleInput {
  protocol_name: string;
  rule_type: string;
  property_name?: string;
  property_values: string[];
  status: string;
  notes?: string;
}

export interface ListReferenceDataInput {
  table: "symptoms" | "supplements" | "medications" | "detox_types";
}

export interface AddReferenceItemInput {
  table: "symptoms" | "supplements" | "medications" | "detox_types";
  name: string;
  category: string;
  description?: string;
  common_dosage?: string;
}

export interface DeleteReferenceItemInput {
  table: "symptoms" | "supplements" | "medications" | "detox_types";
  name: string;
}

export interface BulkUpdateCategoryInput {
  category?: string;
  subcategory?: string;
  property: string;
  value: string;
}
