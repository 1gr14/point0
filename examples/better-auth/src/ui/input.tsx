import type { ChangeEvent } from 'react'
import { Field } from '@/ui/field'

type InputProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'search' | 'url'
  placeholder?: string
}

export const Input = ({ label, value, onValueChange, type = 'text', placeholder }: InputProps) => {
  return (
    <Field label={label}>
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onValueChange(e.target.value)
        }}
      />
    </Field>
  )
}
