import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Accordion({ items, className }) {
  const [open, setOpen] = useState(null)

  return (
    <div className={cn('divide-y divide-border rounded-xl border bg-white overflow-hidden', className)}>
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between px-6 py-5 text-left font-medium hover:bg-slate-50 transition-colors group"
          >
            <span className={cn('text-slate-800 group-hover:text-primary transition-colors', open === i && 'text-primary')}>
              {item.question}
            </span>
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground shrink-0 ml-4 transition-all duration-300',
                open === i && 'rotate-180 text-primary',
              )}
            />
          </button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-in-out',
              open === i ? 'max-h-96' : 'max-h-0',
            )}
          >
            <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
