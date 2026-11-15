import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder: string
}

export function SearchBar({ value, onChange, placeholder }: Props) {
  return (
    <div className="atelier-search relative">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="atelier-search__field ps-10 pe-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute end-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
          onClick={() => onChange('')}
          aria-label="پاک کردن جستجو"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
