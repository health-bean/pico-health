import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, protocols, protocolRules } from "@/lib/db/schema";

export interface UserProtocolInfo {
  protocolName?: string;
  protocolRulesText?: string;
}

/**
 * Load the user's active protocol name and a formatted rules block for
 * inclusion in an AI system prompt. Shared by the chat and capture routes.
 */
export async function loadUserProtocolInfo(
  userId: string
): Promise<UserProtocolInfo> {
  const [user] = await db
    .select({ currentProtocolId: profiles.currentProtocolId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!user?.currentProtocolId) return {};

  const [protocol] = await db
    .select({
      name: protocols.name,
      description: protocols.description,
    })
    .from(protocols)
    .where(eq(protocols.id, user.currentProtocolId))
    .limit(1);

  if (!protocol) return {};

  let protocolRulesText: string | undefined;

  const rules = await db
    .select({
      ruleType: protocolRules.ruleType,
      propertyName: protocolRules.propertyName,
      propertyValues: protocolRules.propertyValues,
      status: protocolRules.status,
      notes: protocolRules.notes,
    })
    .from(protocolRules)
    .where(eq(protocolRules.protocolId, user.currentProtocolId))
    .orderBy(asc(protocolRules.ruleOrder));

  if (rules.length > 0) {
    protocolRulesText = rules
      .map((r) => {
        let line = `- ${r.status.toUpperCase()}: ${r.ruleType}`;
        if (r.propertyName) line += ` (${r.propertyName})`;
        if (r.propertyValues && r.propertyValues.length > 0) {
          line += `: ${r.propertyValues.join(", ")}`;
        }
        if (r.notes) line += ` -- ${r.notes}`;
        return line;
      })
      .join("\n");
  }

  if (protocol.description) {
    protocolRulesText = `${protocol.description}\n\n${protocolRulesText || ""}`;
  }

  return { protocolName: protocol.name, protocolRulesText };
}
