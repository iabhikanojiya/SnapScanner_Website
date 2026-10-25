import {
  BookOpen,
  Code,
  Combine,
  Crop,
  EyeOff,
  FileArchive,
  FileCode2,
  FileImage,
  FileInput,
  FileMinus,
  FileOutput,
  FileType,
  FormInput,
  GitCompareArrows,
  Highlighter,
  FilePenLine,
  QrCode,
  ScrollText,
  ImageUp,
  IdCard,
  Contact,
  Award,
  ReceiptText,
  ImageDown,
  ImagePlus,
  Images,
  Info,
  KeyRound,
  LayoutGrid,
  LayoutTemplate,
  LetterText,
  ListOrdered,
  Lock,
  PartyPopper,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scaling,
  ScanLine,
  ScanText,
  Scissors,
  Signature,
  Stamp,
  Wand2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ToolCategoryId, ToolId } from '@/lib/tools'
import { TOOLS } from '@/lib/tools'
import { cn } from '@/lib/utils'

export const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  'merge-pdf': Combine,
  'split-pdf': Scissors,
  'remove-pages': FileMinus,
  'extract-pages': FileOutput,
  'organize-pdf': LayoutGrid,
  'rotate-pdf': RotateCw,
  'compress-pdf': FileArchive,
  'repair-pdf': Wrench,
  'ocr-pdf': ScanText,
  'scan-pdf': ScanLine,
  'image-to-pdf': ImagePlus,
  'jpg-to-pdf': FileImage,
  'png-to-pdf': FileImage,
  'webp-to-pdf': FileImage,
  'html-to-pdf': Code,
  'word-to-pdf': FileInput,
  'pdf-to-jpg': ImageDown,
  'pdf-to-png': Images,
  'pdf-to-text': FileType,
  'pdf-to-markdown': FileCode2,
  'pdf-to-word': LetterText,
  'pdf-reader': BookOpen,
  'sign-pdf': Signature,
  'edit-pdf': FilePenLine,
  'annotate-pdf': Highlighter,
  'add-page-numbers': ListOrdered,
  'add-watermark': Stamp,
  'crop-pdf': Crop,
  'fill-pdf-form': FormInput,
  'compare-pdf': GitCompareArrows,
  'lock-pdf': Lock,
  'unlock-pdf': KeyRound,
  'redact-pdf': EyeOff,
  'pdf-metadata': Info,
  'resize-image': Scaling,
  'crop-image': Crop,
  'rotate-image': RotateCcw,
  'filter-image': Wand2,
  'convert-image': RefreshCw,
  'image-to-webp': ImageUp,
  'qr-code-generator': QrCode,
  'resume-builder': LayoutTemplate,
  'id-card-maker': IdCard,
  'invoice-maker': ReceiptText,
  'business-card-maker': Contact,
  'certificate-maker': Award,
  'photo-collage-maker': LayoutGrid,
  'letterhead-maker': ScrollText,
  'festival-greeting-maker': PartyPopper,
}

/** Tile colours per category keep the directory scannable; all pass 4.5:1 for the icon. */
const TILE: Record<ToolCategoryId, string> = {
  organize: 'bg-violet-50 text-violet-700',
  optimize: 'bg-emerald-50 text-emerald-700',
  'convert-to': 'bg-amber-50 text-amber-800',
  'convert-from': 'bg-sky-50 text-sky-700',
  edit: 'bg-indigo-50 text-indigo-700',
  security: 'bg-gray-100 text-gray-800',
  image: 'bg-orange-50 text-orange-800',
  create: 'bg-rose-50 text-rose-700',
}

export default function ToolIcon({ id, size = 'md', className }: { id: ToolId; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = TOOL_ICONS[id]
  const category = TOOLS.find((t) => t.id === id)!.category
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        TILE[category],
        size === 'sm' && 'h-8 w-8 rounded-lg',
        size === 'md' && 'h-11 w-11 rounded-xl',
        size === 'lg' && 'h-14 w-14 rounded-2xl',
        className
      )}
    >
      <Icon aria-hidden className={cn(size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7')} />
    </span>
  )
}
