import type { WeatherData, MenuItem } from '../types'
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
  weather: WeatherData | null
  onOrder: (item: MenuItem) => void
  presetItems: MenuItem[]
  iceOptions: IceCreamOptions | undefined
  iceCopy: IceCopy
  iceCreamCategoryId?: string | null
}

export function IceCreamHub({
  weather,
  onOrder,
  presetItems,
  iceOptions,
  iceCopy,
  iceCreamCategoryId,
}: Props) {
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
      weather={weather}
      onOrder={onOrder}
      presetItems={presetItems}
      iceOptions={iceOptions}
      copy={iceCopy}
      iceCreamCategoryId={iceCreamCategoryId}
    />
  )
}
