import { prisma } from './prisma'

interface CreateAuditLogParams {
  goalSheetId: string
  userId: string
  action: string
  fieldChanged?: string
  oldValue?: unknown
  newValue?: unknown
  reason?: string
}

/**
 * Creates an immutable audit log entry.
 * Call this BEFORE making the actual change so logs survive on error.
 */
export async function createAuditLog({
  goalSheetId,
  userId,
  action,
  fieldChanged,
  oldValue,
  newValue,
  reason,
}: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      goalSheetId,
      userId,
      action,
      fieldChanged: fieldChanged ?? null,
      oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
      reason: reason ?? null,
    },
  })
}

/** Alias used by some routes — same function */
export const logAudit = createAuditLog

/** Audit action constants — use these everywhere, never raw strings */
export const AuditActions = {
  // Goal sheet lifecycle
  GOAL_SUBMITTED: 'GOAL_SUBMITTED',
  GOAL_APPROVED: 'GOAL_APPROVED',
  GOAL_RETURNED: 'GOAL_RETURNED',
  GOAL_UNLOCKED: 'GOAL_UNLOCKED',
  GOAL_RELOCKED: 'GOAL_RELOCKED',

  // Manager inline edits
  TARGET_CHANGED: 'TARGET_CHANGED',
  WEIGHTAGE_CHANGED: 'WEIGHTAGE_CHANGED',
  DESCRIPTION_CHANGED: 'DESCRIPTION_CHANGED',

  // Achievement logging
  ACHIEVEMENT_LOGGED: 'ACHIEVEMENT_LOGGED',
  ACHIEVEMENT_UPDATED: 'ACHIEVEMENT_UPDATED',

  // Shared goals
  SHARED_GOAL_PUSHED: 'SHARED_GOAL_PUSHED',

  // Check-ins
  CHECKIN_ADDED: 'CHECKIN_ADDED',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]
