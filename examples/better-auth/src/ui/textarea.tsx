import type { ChangeEvent } from 'react'
import { Field } from '@/ui/field'

type TextareaProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  rows?: number
  placeholder?: string
}

export const Textarea = ({ label, value, onValueChange, rows = 4, placeholder }: TextareaProps) => {
  return (
    <Field label={label}>
      <textarea
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
          onValueChange(e.target.value)
        }}
      />
    </Field>
  )
}
