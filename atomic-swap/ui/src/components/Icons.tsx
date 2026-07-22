import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function SwapMark(props: IconProps) {
  return <svg viewBox="0 0 44 44" fill="none" aria-hidden="true" {...props}>
    <path d="M8 14h25m0 0-6-6m6 6-6 6M36 30H11m0 0 6 6m-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function UserIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 13.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM4.75 21c.55-3.2 3.23-5.25 7.25-5.25S18.7 17.8 19.25 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}

export function ChevronDown(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function ArrowSwap(props: IconProps) {
  return <svg viewBox="0 0 28 28" fill="none" aria-hidden="true" {...props}>
    <path d="M8.5 4.5v18m0-18L4 9m4.5-4.5L13 9M19.5 23.5v-18m0 18L15 19m4.5 4.5L24 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function CloseIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}

export function CheckIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <path d="m5 10.5 3.1 3.1L15.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function AssetIcon({ instrument, ...props }: IconProps & { instrument: string }) {
  if (instrument.toUpperCase().includes('USD')) {
    return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <circle cx="16" cy="16" r="15" fill="currentColor" />
      <path d="M19.6 11.3c-.85-.7-1.88-1.05-3.08-1.05-1.72 0-2.9.77-2.9 1.9 0 1.02.76 1.55 2.68 1.98l.9.2c2.98.66 4.35 2 4.35 4.13 0 2.35-1.76 4.05-4.55 4.37V25h-2v-2.15c-1.82-.17-3.4-.87-4.55-2l1.65-2.1c1.18 1.02 2.5 1.52 3.98 1.52 1.62 0 2.62-.62 2.62-1.62 0-.92-.7-1.45-2.45-1.84l-1.03-.23c-3.02-.68-4.42-2.04-4.42-4.25 0-2.35 1.7-4.08 4.2-4.45V6h2v1.83c1.63.14 3.03.67 4.18 1.58l-1.58 1.89Z" fill="white" />
    </svg>
  }
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    <circle cx="16" cy="16" r="15" fill="currentColor" />
    <path d="m16 8 2.15 4.35 4.8.7-3.47 3.38.82 4.77L16 18.95l-4.3 2.25.82-4.77-3.47-3.38 4.8-.7L16 8Z" fill="white" />
  </svg>
}
