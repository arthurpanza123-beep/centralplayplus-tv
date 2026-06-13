import { cn } from '@/lib/utils'

interface CategorySidebarProps {
  categories: string[]
  selected: string
  onSelect: (cat: string) => void
}

export function CategorySidebar({ categories, selected, onSelect }: CategorySidebarProps) {
  return (
    <aside className="flex flex-col shrink-0 py-6 gap-1 overflow-y-auto" style={{ width: '200px' }}>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={cn(
            'text-left px-5 py-2.5 text-sm font-medium rounded-lg transition-colors',
            selected === cat
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          {cat}
        </button>
      ))}
    </aside>
  )
}
