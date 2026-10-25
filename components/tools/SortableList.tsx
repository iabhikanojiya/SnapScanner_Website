'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  onReorder: (items: T[]) => void
  /** Renders an item. `handle` is the drag handle to place inside it. */
  renderItem: (item: T, index: number, handle: React.ReactNode) => React.ReactNode
  layout?: 'list' | 'grid'
  className?: string
  /** Accessible name for each item's drag handle, e.g. "Reorder report.pdf". */
  handleLabel: (item: T) => string
}

/**
 * Reorderable list with mouse, touch and keyboard support. Keyboard: focus a
 * handle, press Space to pick up, arrow keys to move, Space to drop.
 */
export default function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  layout = 'list',
  className,
  handleLabel,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((i) => getId(i) === e.active.id)
    const to = items.findIndex((i) => getId(i) === e.over!.id)
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'To reorder, press Space to pick up the item, use the arrow keys to move it, then press Space to drop it, or Escape to cancel.',
        },
      }}
    >
      <SortableContext items={items.map(getId)} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item, index) => (
            <SortableItem key={getId(item)} id={getId(item)} label={handleLabel(item)}>
              {(handle) => renderItem(item, index, handle)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: (handle: React.ReactNode) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink-muted hover:bg-gray-100 hover:text-ink active:cursor-grabbing"
    >
      <GripVertical aria-hidden className="h-5 w-5" />
    </button>
  )
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-90 shadow-lift')}
    >
      {children(handle)}
    </li>
  )
}

/** Moves an item one step; used by the up/down buttons that complement dragging. */
export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta
  if (to < 0 || to >= items.length) return items
  return arrayMove(items, index, to)
}
