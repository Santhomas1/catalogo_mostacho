import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return <div data-slot="card" className={cn('rounded-lg border border-input bg-background text-foreground', className)} {...props} />
}
export function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn('p-5', className)} {...props} />
}
