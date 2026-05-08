import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const TabsCtx = createContext({})

export function Tabs({ defaultValue, value, onValueChange, children, className }) {
  const [internal, setInternal] = useState(defaultValue)
  const active = value ?? internal
  const setActive = onValueChange ?? setInternal

  return (
    <TabsCtx.Provider value={{ active, setActive }}>
      <div className={cn(className)}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabsList({ children, className }) {
  return (
    <div className={cn('inline-flex h-11 items-center gap-1 rounded-xl bg-muted p-1 w-full sm:w-auto', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }) {
  const { active, setActive } = useContext(TabsCtx)
  const isActive = active === value
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all flex-1 sm:flex-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-white text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }) {
  const { active } = useContext(TabsCtx)
  if (active !== value) return null
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
