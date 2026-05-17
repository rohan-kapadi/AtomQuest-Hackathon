import { z } from 'zod'

// ─── UoM / Enum Literals ──────────────────────────────────────────────────────

export const UoMTypeSchema = z.enum(['NUMERIC_MIN', 'NUMERIC_MAX', 'TIMELINE', 'ZERO'])
export const QuarterSchema = z.enum(['Q1', 'Q2', 'Q3', 'Q4'])
export const AchievementStatusSchema = z.enum(['NOT_STARTED', 'ON_TRACK', 'COMPLETED'])
export const GoalStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'LOCKED'])

// ─── Goal Row Schema ──────────────────────────────────────────────────────────

export const GoalSchema = z
  .object({
    thrustArea: z.string().min(1, 'Thrust area is required'),
    title: z.string().min(1, 'Goal title is required'),
    description: z.string().optional(),
    uomType: UoMTypeSchema,
    // Safely coerce: empty string, undefined, or NaN → null
    target: z.preprocess(
      (v) => {
        if (v === '' || v === undefined || v === null) return null
        const n = Number(v)
        return isNaN(n) ? null : n
      },
      z.number().nullable().optional()
    ),
    // Safely coerce: empty string or undefined → null, valid date string → Date
    targetDate: z.preprocess(
      (v) => {
        if (!v || v === '') return null
        if (v instanceof Date) return v
        const d = new Date(v as string)
        return isNaN(d.getTime()) ? null : d
      },
      z.date().nullable().optional()
    ),
    weightage: z.preprocess(
      (v) => {
        if (v === '' || v === undefined || v === null) return 0
        const n = Number(v)
        return isNaN(n) ? 0 : n
      },
      z.number().min(10, 'Minimum weightage is 10%').max(100, 'Maximum weightage is 100%')
    ),
  })
  .superRefine((data, ctx) => {
    // Numeric types need a target
    if (
      (data.uomType === 'NUMERIC_MIN' || data.uomType === 'NUMERIC_MAX') &&
      (data.target === null || data.target === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target value is required for numeric goals',
        path: ['target'],
      })
    }

    // Timeline type needs a target date
    if (data.uomType === 'TIMELINE' && !data.targetDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target date is required for timeline goals',
        path: ['targetDate'],
      })
    }
  })

// ─── Goal Sheet Submission Schema ─────────────────────────────────────────────

export const GoalSheetCreateSchema = z.object({
  cycleId: z.string().min(1, 'Cycle is required'),
  goals: z
    .array(GoalSchema)
    .min(1, 'At least one goal is required')
    .max(8, 'Maximum 8 goals per sheet'),
})

export const GoalSheetSubmitSchema = GoalSheetCreateSchema.superRefine((data, ctx) => {
  const total = data.goals.reduce((sum, g) => sum + g.weightage, 0)
  if (Math.abs(total - 100) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Total weightage must equal 100% (currently ${total.toFixed(1)}%)`,
      path: ['goals'],
    })
  }
})

// ─── Achievement Log Schema ───────────────────────────────────────────────────

export const AchievementSchema = z
  .object({
    quarter: QuarterSchema,
    status: AchievementStatusSchema,
    actualValue: z.coerce.number().optional().nullable(),
    actualDate: z.coerce.date().optional().nullable(),
    isZeroAchieved: z.boolean().optional().nullable(),
    notes: z.string().optional(),
  })

// ─── Manager Return Schema ────────────────────────────────────────────────────

export const ReturnGoalSchema = z.object({
  comment: z.string().min(10, 'Please provide a meaningful return reason (min 10 characters)'),
})

// ─── Admin Unlock Schema ──────────────────────────────────────────────────────

export const UnlockGoalSchema = z.object({
  reason: z.string().min(10, 'Unlock reason is required (min 10 characters)'),
})

// ─── Shared Goal Push Schema ──────────────────────────────────────────────────

export const SharedGoalPushSchema = z.object({
  employeeIds: z.array(z.string()).min(1, 'Select at least one employee'),
  goal: GoalSchema,
})

// ─── Check-in Schema ──────────────────────────────────────────────────────────

export const CheckinSchema = z.object({
  goalSheetId: z.string(),
  quarter: QuarterSchema,
  comment: z.string().min(10, 'Please provide meaningful check-in comments (min 10 characters)'),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type GoalInput = z.infer<typeof GoalSchema>
export type GoalSheetCreateInput = z.infer<typeof GoalSheetCreateSchema>
export type AchievementInput = z.infer<typeof AchievementSchema>
export type ReturnGoalInput = z.infer<typeof ReturnGoalSchema>
export type UnlockGoalInput = z.infer<typeof UnlockGoalSchema>
export type SharedGoalPushInput = z.infer<typeof SharedGoalPushSchema>
export type CheckinInput = z.infer<typeof CheckinSchema>
