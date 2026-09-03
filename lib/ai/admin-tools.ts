import Anthropic from "@anthropic-ai/sdk";

export const adminTools: Anthropic.Tool[] = [
  {
    name: "search_foods",
    description:
      "Search foods by name. Returns matching foods with their category, subcategory, and trigger properties.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term to match against food names",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_food_details",
    description:
      "Get a specific food with all of its trigger properties and which protocols it affects.",
    input_schema: {
      type: "object" as const,
      properties: {
        food_name: {
          type: "string",
          description: "The exact display name of the food to look up",
        },
      },
      required: ["food_name"],
    },
  },
  {
    name: "update_food_triggers",
    description:
      "Update one or more trigger properties for an existing food. Only the properties included in `updates` will be changed; others are left untouched. Every call MUST include `sources` citing the framework used for each updated property (e.g. SIGHI, RPAH/FAILSAFE, Harvard/TLO oxalate lists, published FODMAP lists, botanical/compositional classification). Never invent a citation. Updates are stored as review_status 'ai_proposed' pending practitioner review.",
    input_schema: {
      type: "object" as const,
      properties: {
        food_name: {
          type: "string",
          description: "The display name of the food to update",
        },
        updates: {
          type: "object",
          description: "Trigger properties to update",
          properties: {
            oxalate: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            histamine: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            lectin: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            nightshade: { type: "boolean" },
            fodmap: {
              type: "string",
              enum: ["low", "moderate", "high", "unknown"],
            },
            salicylate: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            amines: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            glutamates: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            sulfites: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            goitrogens: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            purines: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            phytoestrogens: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            phytates: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            tyramine: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
          },
        },
        sources: {
          type: "object",
          description:
            "REQUIRED citations for the property values being set. Keys are property names from `updates` (e.g. 'histamine'); a 'default' key may cover any property without its own entry. Each value is { source, ref? } naming the framework actually consulted (e.g. SIGHI, RPAH/FAILSAFE, Harvard or Trying Low Oxalates lists, published FODMAP lists, botanical/compositional classification). Never invent a citation.",
          additionalProperties: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "Framework or reference used (e.g. 'SIGHI')",
              },
              ref: {
                type: "string",
                description: "Specific list, edition, URL, or entry (optional)",
              },
            },
            required: ["source"],
          },
        },
      },
      required: ["food_name", "updates", "sources"],
    },
  },
  {
    name: "add_food",
    description:
      "Add a new food to the database with its subcategory and trigger properties. Every call MUST include `sources` citing the framework used for each trigger property you set (a 'default' entry may cover several). Never invent a citation. New trigger rows are stored as review_status 'ai_proposed' pending practitioner review.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Display name for the food",
        },
        subcategory: {
          type: "string",
          description:
            "Name of the subcategory this food belongs to (e.g. 'Leafy Greens', 'Citrus Fruits')",
        },
        is_common: {
          type: "boolean",
          description: "Whether this is a commonly consumed food",
        },
        triggers: {
          type: "object",
          description: "Trigger properties for the food",
          properties: {
            oxalate: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            histamine: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            lectin: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            nightshade: { type: "boolean" },
            fodmap: {
              type: "string",
              enum: ["low", "moderate", "high", "unknown"],
            },
            salicylate: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            amines: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            glutamates: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            sulfites: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            goitrogens: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            purines: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            phytoestrogens: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            phytates: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
            tyramine: {
              type: "string",
              enum: ["low", "moderate", "high", "very_high", "unknown"],
            },
          },
        },
        sources: {
          type: "object",
          description:
            "REQUIRED citations for the trigger values being set. Keys are property names from `triggers`; a 'default' key may cover any property without its own entry. Each value is { source, ref? } naming the framework actually consulted. Never invent a citation.",
          additionalProperties: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "Framework or reference used (e.g. 'SIGHI')",
              },
              ref: {
                type: "string",
                description: "Specific list, edition, URL, or entry (optional)",
              },
            },
            required: ["source"],
          },
        },
      },
      required: ["name", "subcategory", "is_common", "triggers", "sources"],
    },
  },
  {
    name: "delete_food",
    description:
      "Delete a food from the database. This also removes its trigger properties (cascade).",
    input_schema: {
      type: "object" as const,
      properties: {
        food_name: {
          type: "string",
          description: "The display name of the food to delete",
        },
      },
      required: ["food_name"],
    },
  },
  {
    name: "list_protocols",
    description:
      "List all dietary protocols with their rules, ordered by rule order.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "update_protocol_rule",
    description:
      "Add or update a rule within a dietary protocol. If a matching rule already exists (same rule_type + property_name), it will be updated; otherwise a new rule is created.",
    input_schema: {
      type: "object" as const,
      properties: {
        protocol_name: {
          type: "string",
          description: "The name of the protocol to modify",
        },
        rule_type: {
          type: "string",
          description:
            "Type of rule (e.g. 'trigger_level', 'food_category', 'food_property', 'nightshade')",
        },
        property_name: {
          type: "string",
          description:
            "The property this rule targets (e.g. 'oxalate', 'histamine', 'lectin'). Optional for some rule types.",
        },
        property_values: {
          type: "array",
          items: { type: "string" },
          description:
            "The values that trigger this rule (e.g. ['high', 'very_high'])",
        },
        status: {
          type: "string",
          description:
            "What status to assign foods matching this rule (e.g. 'avoid', 'moderation', 'allowed')",
        },
        notes: {
          type: "string",
          description: "Optional notes explaining the rule",
        },
      },
      required: ["protocol_name", "rule_type", "property_values", "status"],
    },
  },
  {
    name: "list_reference_data",
    description:
      "List all items in a reference data table (symptoms, supplements, medications, or detox types).",
    input_schema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          enum: ["symptoms", "supplements", "medications", "detox_types"],
          description: "Which reference table to list",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "add_reference_item",
    description:
      "Add a new item to a reference data table (symptoms, supplements, medications, or detox types).",
    input_schema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          enum: ["symptoms", "supplements", "medications", "detox_types"],
          description: "Which reference table to add to",
        },
        name: {
          type: "string",
          description: "Name of the item",
        },
        category: {
          type: "string",
          description: "Category for the item",
        },
        description: {
          type: "string",
          description: "Optional description",
        },
        common_dosage: {
          type: "string",
          description:
            "Common dosage (only applicable to supplements table)",
        },
      },
      required: ["table", "name", "category"],
    },
  },
  {
    name: "delete_reference_item",
    description:
      "Delete an item from a reference data table by name.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          enum: ["symptoms", "supplements", "medications", "detox_types"],
          description: "Which reference table to delete from",
        },
        name: {
          type: "string",
          description: "Name of the item to delete",
        },
      },
      required: ["table", "name"],
    },
  },
  {
    name: "bulk_update_category",
    description:
      "Update a specific trigger property for all foods in a given category or subcategory. Useful for batch operations like 'set all nightshades to nightshade: true'.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description:
            "The food category name to target (e.g. 'Vegetables'). Optional if subcategory is provided.",
        },
        subcategory: {
          type: "string",
          description:
            "The food subcategory name to target (e.g. 'Nightshades'). Optional if category is provided.",
        },
        property: {
          type: "string",
          description:
            "The trigger property to update (e.g. 'oxalate', 'nightshade', 'histamine')",
        },
        value: {
          type: "string",
          description:
            "The value to set. For boolean properties like nightshade, use 'true' or 'false'.",
        },
      },
      required: ["property", "value"],
    },
  },
];
