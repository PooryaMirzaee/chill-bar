import type { IceCreamOption, IceCreamBuild } from '../data/iceCreamBuilder'
import { BASES } from '../data/iceCreamBuilder'
import { IceCreamBarRenderer } from './IceCreamBarRenderer'

interface Props {
  option: IceCreamOption
  type: 'base' | 'coating' | 'filling'
  selectedBuild: Partial<IceCreamBuild>
}

export function MiniIceSwatch({ option, type, selectedBuild }: Props) {
  const build: Partial<IceCreamBuild> = {
    base: type === 'base' ? option : selectedBuild.base || null,
    coating: type === 'coating' ? option : (type === 'filling' ? selectedBuild.coating : null),
    filling: type === 'filling' ? option : null,
  }

  const vanilla = BASES.find((b) => b.id === 'vanilla')!
  if (type === 'coating' && !selectedBuild.base) build.base = vanilla
  if (type === 'filling' && !selectedBuild.base) build.base = vanilla
  if (type === 'filling' && !selectedBuild.coating) build.coating = null

  const mode = type === 'base' ? 'base-only' : type === 'coating' ? 'coating-only' : 'filling-only'

  return (
    <div className="mini-ice-swatch-wrap">
      <IceCreamBarRenderer build={build} mode={mode} size="xs" />
    </div>
  )
}
