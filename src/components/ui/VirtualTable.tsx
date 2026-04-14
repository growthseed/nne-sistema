import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import { memo, type ReactNode } from 'react'

/** Threshold: lists with more rows than this will be virtualized. */
export const VIRTUAL_THRESHOLD = 50

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = any

interface VRowData {
  items: AnyItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: VColumn<any>[]
  gridTemplateColumns: string
  rowHeight: number
}

/**
 * Stable row renderer defined OUTSIDE VirtualTable so react-window
 * doesn't unmount/remount rows on every parent render.
 */
const VRow = memo(({ index, style, data }: ListChildComponentProps<VRowData>) => {
  const { items, columns, gridTemplateColumns } = data
  const item = items[index]

  return (
    <div
      role="row"
      style={{ ...style, display: 'grid', gridTemplateColumns }}
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
    >
      {columns.map(col => (
        <div
          key={col.key}
          role="cell"
          className={`px-4 flex items-center text-sm overflow-hidden ${col.cellClass ?? ''}`}
        >
          {col.render(item)}
        </div>
      ))}
    </div>
  )
})
VRow.displayName = 'VRow'

export interface VColumn<T> {
  key: string
  /** Text shown in the header cell */
  header: ReactNode
  /**
   * CSS grid track value, e.g. `'1fr'` | `'120px'` | `'2fr'`.
   * Defaults to `'1fr'`.
   */
  width?: string
  /** Extra Tailwind classes applied to the header cell */
  headerClass?: string
  /** Extra Tailwind classes applied to each body cell */
  cellClass?: string
  render: (item: T) => ReactNode
}

interface VirtualTableProps<T> {
  items: T[]
  columns: VColumn<T>[]
  getKey: (item: T) => string
  /** Height of each row in pixels. Default: 52 */
  rowHeight?: number
  /** Maximum height for the scrollable list. Default: 480 */
  maxHeight?: number
  emptyMessage?: string
}

/**
 * VirtualTable — a div-grid-based table that switches to react-window
 * windowing when `items.length > VIRTUAL_THRESHOLD` (50).
 *
 * Replaces heavy HTML `<table>` sections in desktop views.
 * Mobile card layouts are managed separately in each page.
 */
export function VirtualTable<T>({
  items,
  columns,
  getKey,
  rowHeight = 52,
  maxHeight = 480,
  emptyMessage = 'Nenhum item encontrado',
}: VirtualTableProps<T>) {
  const gridTemplateColumns = columns.map(c => c.width ?? '1fr').join(' ')

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        {emptyMessage}
      </p>
    )
  }

  const shouldVirtualize = items.length > VIRTUAL_THRESHOLD
  const listHeight = Math.min(maxHeight, items.length * rowHeight)

  const itemData: VRowData = {
    items: items as AnyItem[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: columns as VColumn<any>[],
    gridTemplateColumns,
    rowHeight,
  }

  return (
    <div role="table" className="w-full">
      {/* ── Header ── */}
      <div
        role="rowgroup"
        style={{ display: 'grid', gridTemplateColumns }}
        className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800"
      >
        {columns.map(col => (
          <div
            key={col.key}
            role="columnheader"
            className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.headerClass ?? ''}`}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      {shouldVirtualize ? (
        <FixedSizeList<VRowData>
          height={listHeight}
          itemCount={items.length}
          itemSize={rowHeight}
          width="100%"
          itemData={itemData}
        >
          {VRow}
        </FixedSizeList>
      ) : (
        <div role="rowgroup">
          {items.map(item => (
            <div
              key={getKey(item)}
              role="row"
              style={{ display: 'grid', gridTemplateColumns }}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
            >
              {columns.map(col => (
                <div
                  key={col.key}
                  role="cell"
                  className={`px-4 py-3 flex items-center text-sm overflow-hidden ${col.cellClass ?? ''}`}
                >
                  {col.render(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
