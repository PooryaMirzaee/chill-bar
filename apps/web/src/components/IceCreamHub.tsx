import type { MenuItem } from '../types'
import type { IceCreamOptions, StoreCopy } from '@chill-bar/shared'
import { IceCreamBuilder } from './IceCreamBuilder'

type IceCopy = Pick<
  StoreCopy,
  | 'iceStep1Label'
  | 'iceStep1Title'
  | 'iceStep2Label'
  | 'iceStep2Title'
  | 'iceStep3Label'
  | 'iceStep3Title'
  | 'iceCustomName'
  | 'currencySuffix'
>

interface Props {
  onOrder: (item: MenuItem) => void
  iceOptions: IceCreamOptions | undefined
  iceCopy: IceCopy
  iceCreamCategoryId?: string | null
}

export function IceCreamHub({ onOrder, iceOptions, iceCopy, iceCreamCategoryId }: Props) {
  if (!iceOptions?.enabled) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        بستنی سفارشی موقتاً غیرفعال است.
      </div>
    )
  }

  if (
    !iceOptions?.bases.length ||
    !iceOptions.coatings.length ||
    !iceOptions.fillings.length
  ) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        گزینه‌های بستنی هنوز تنظیم نشده — از پنل ادمین اضافه کنید.
      </div>
    )
  }

  return (
    <IceCreamBuilder
      onOrder={onOrder}
      iceOptions={iceOptions}
      copy={iceCopy}
      iceCreamCategoryId={iceCreamCategoryId}
    />
  )
}
