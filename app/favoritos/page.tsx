import { TVLayout } from '@/components/tv/tv-layout'

export default function FavoritosPage() {
  return (
    <TVLayout title="Favoritos">
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Seus favoritos aparecerão aqui.</p>
      </div>
    </TVLayout>
  )
}
