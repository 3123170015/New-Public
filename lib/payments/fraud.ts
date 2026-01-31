import { prisma } from "@/lib/prisma";

type FraudAlertKind =
  | "MANUAL_CREDIT_LARGE"
  | "TOPUP_RATE_LIMIT"
  | "DUP_TX_HASH"
  | "WEBHOOK_FAIL_SPIKE"
  | "NEEDS_REVIEW_BURST";
type FraudAlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CreateFraudAlertInput = {
  kind: FraudAlertKind;
  dedupeKey: string;
  severity?: FraudAlertSeverity;
  title: string;
  message?: string;
  payload?: any;
  userId?: string | null;
  depositId?: string | null;
};

/**
 * Create (or update) a FraudAlert using the (kind, dedupeKey) unique constraint.
 * - Idempotent for cron scans.
 * - If an alert was RESOLVED, we keep it RESOLVED (do not reopen automatically).
 */
export async function createFraudAlert(input: CreateFraudAlertInput) {
  const payloadJson = input.payload != null ? JSON.stringify(input.payload) : undefined;

  return prisma.fraudAlert.upsert({
    where: { kind_dedupeKey: { kind: input.kind, dedupeKey: input.dedupeKey } },
    create: {
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      severity: input.severity || "MEDIUM",
      title: input.title,
      message: input.message,
      payloadJson,
      userId: input.userId || null,
      depositId: input.depositId || null,
    },
    update: {
      // Do not override status automatically; only enrich context.
      severity: input.severity || undefined,
      title: input.title,
      message: input.message,
      payloadJson,
      userId: input.userId || undefined,
      depositId: input.depositId || undefined,
    },
  });
}
