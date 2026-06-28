import { WaitLoungeFabButton } from './WaitLoungeEntry'
import { useWaitLounge } from '../../store/waitLounge'
import { isLoungeTerminal } from '../../store/activeOrder'

interface Props {
  className?: string
}

export function WaitLoungeFab({ className }: Props) {
  const { activeOrder, loungeEnabled, loungeOpen, setLoungeOpen, sessionPoints, loungeCopy } =
    useWaitLounge()

  if (!loungeEnabled || !activeOrder || isLoungeTerminal(activeOrder.status)) return null

  return (
    <WaitLoungeFabButton
      className={className}
      title={loungeCopy.waitLoungeEnter}
      subtitle={loungeCopy.waitLoungePlayTeaser}
      sessionPoints={sessionPoints}
      pointsLabel={loungeCopy.waitLoungePointsLabel}
      active={loungeOpen}
      onClick={() => setLoungeOpen(!loungeOpen)}
    />
  )
}
