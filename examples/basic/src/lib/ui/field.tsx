import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  children: ReactNode
}

export const Field = ({ label, children }: FieldProps) => {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}
