'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Trash2, GripVertical, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { GoalSheetCreateInput } from '@/lib/validations'

interface GoalRowProps {
  index: number
  onRemove: () => void
  canRemove: boolean
  isReadOnly?: boolean
}

const UOM_OPTIONS = [
  {
    value: 'NUMERIC_MIN',
    label: 'Numeric (Higher is Better)',
    hint: 'E.g. sales revenue, units sold — score = actual ÷ target',
  },
  {
    value: 'NUMERIC_MAX',
    label: 'Numeric (Lower is Better)',
    hint: 'E.g. TAT, complaints, cost — score = target ÷ actual',
  },
  {
    value: 'TIMELINE',
    label: 'Timeline / Milestone',
    hint: 'E.g. project delivery date — on-time = 100%, early = bonus',
  },
  {
    value: 'ZERO',
    label: 'Zero Incidents',
    hint: 'E.g. safety, data breaches — zero = 100%, any = 0%',
  },
]

export function GoalRow({ index, onRemove, canRemove, isReadOnly }: GoalRowProps) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<GoalSheetCreateInput>()

  const uomType = watch(`goals.${index}.uomType`)
  const goalErrors = errors?.goals?.[index]

  const fieldClass = (hasError: boolean) =>
    cn(
      'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 text-sm',
      hasError && 'border-red-500 focus:border-red-500'
    )

  return (
    <div className="group relative bg-gray-800/50 border border-gray-700 rounded-2xl p-5 transition-all hover:border-gray-600">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <span className="text-xs font-bold text-violet-400">{index + 1}</span>
        </div>
        <span className="text-sm font-semibold text-gray-300">Goal #{index + 1}</span>
        <div className="flex-1" />
        {canRemove && !isReadOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thrust Area */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-xs font-medium">
            Thrust Area <span className="text-red-400">*</span>
          </Label>
          <Input
            {...register(`goals.${index}.thrustArea`)}
            placeholder="e.g. Revenue Growth, Customer Success"
            className={fieldClass(!!goalErrors?.thrustArea)}
            disabled={isReadOnly}
          />
          {goalErrors?.thrustArea && (
            <p className="text-red-400 text-xs">{goalErrors.thrustArea.message}</p>
          )}
        </div>

        {/* UoM Type */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-xs font-medium">
            Measurement Type <span className="text-red-400">*</span>
          </Label>
          <Controller
            name={`goals.${index}.uomType`}
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isReadOnly}
              >
                <SelectTrigger className={cn(fieldClass(!!goalErrors?.uomType), 'h-9')}>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {UOM_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-gray-200 focus:bg-gray-800 focus:text-white"
                    >
                      <div>
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.hint}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {goalErrors?.uomType && (
            <p className="text-red-400 text-xs">{goalErrors.uomType.message}</p>
          )}
        </div>

        {/* Goal Title — full width */}
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-gray-300 text-xs font-medium">
            Goal Title <span className="text-red-400">*</span>
          </Label>
          <Input
            {...register(`goals.${index}.title`)}
            placeholder="e.g. Achieve quarterly sales target of ₹50L"
            className={fieldClass(!!goalErrors?.title)}
            disabled={isReadOnly}
          />
          {goalErrors?.title && (
            <p className="text-red-400 text-xs">{goalErrors.title.message}</p>
          )}
        </div>

        {/* Description — full width */}
        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-gray-300 text-xs font-medium">
            Description <span className="text-gray-600">(optional)</span>
          </Label>
          <Textarea
            {...register(`goals.${index}.description`)}
            placeholder="Additional context, success criteria, or measurement methodology..."
            rows={2}
            className={cn(fieldClass(false), 'resize-none')}
            disabled={isReadOnly}
          />
        </div>

        {/* Target — conditional on UoM type */}
        {(uomType === 'NUMERIC_MIN' || uomType === 'NUMERIC_MAX') && (
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs font-medium">
              Target Value <span className="text-red-400">*</span>
            </Label>
            <Input
              {...register(`goals.${index}.target`, { valueAsNumber: true })}
              type="number"
              step="any"
              placeholder={uomType === 'NUMERIC_MIN' ? 'e.g. 5000000' : 'e.g. 24'}
              className={fieldClass(!!goalErrors?.target)}
              disabled={isReadOnly}
            />
            {goalErrors?.target && (
              <p className="text-red-400 text-xs">{goalErrors.target.message}</p>
            )}
            <p className="text-gray-600 text-xs">
              {uomType === 'NUMERIC_MIN'
                ? 'Score = actual ÷ target'
                : 'Score = target ÷ actual (lower = better)'}
            </p>
          </div>
        )}

        {uomType === 'TIMELINE' && (
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs font-medium">
              Target Date <span className="text-red-400">*</span>
            </Label>
            <Input
              {...register(`goals.${index}.targetDate`)}
              type="date"
              className={fieldClass(!!goalErrors?.targetDate)}
              disabled={isReadOnly}
            />
            {goalErrors?.targetDate && (
              <p className="text-red-400 text-xs">{goalErrors.targetDate.message}</p>
            )}
          </div>
        )}

        {uomType === 'ZERO' && (
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              Zero incident goal: score = 100% if zero incidents, 0% if any occur.
              No target value needed.
            </div>
          </div>
        )}

        {/* Weightage */}
        <div className="space-y-1.5">
          <Label className="text-gray-300 text-xs font-medium">
            Weightage (%) <span className="text-red-400">*</span>
          </Label>
          <div className="relative">
            <Input
              {...register(`goals.${index}.weightage`, { valueAsNumber: true })}
              type="number"
              min={10}
              max={100}
              step={5}
              placeholder="e.g. 25"
              className={cn(fieldClass(!!goalErrors?.weightage), 'pr-8')}
              disabled={isReadOnly}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
          </div>
          {goalErrors?.weightage && (
            <p className="text-red-400 text-xs">{goalErrors.weightage.message}</p>
          )}
          <p className="text-gray-600 text-xs">Min 10% per goal</p>
        </div>
      </div>
    </div>
  )
}
