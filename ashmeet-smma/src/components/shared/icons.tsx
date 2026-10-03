import type { ReactNode } from 'react'

// Icon paths copied verbatim from the approved prototypes (24px grid, round caps).
export function Svg({ children, w = 2, fill = 'none', size }: { children: ReactNode; w?: number; fill?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke={fill === 'none' ? 'currentColor' : undefined}
      strokeWidth={fill === 'none' ? w : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const GEAR =
  'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 7.26 19.7l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.25 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.3 7.26l-.06-.06A2 2 0 1 1 7.07 4.37l.06.06A1.65 1.65 0 0 0 10 3.25V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.74 1.21l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.75 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'

type P = { w?: number; size?: number }

export const IconClients = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </Svg>
)
export const IconCalendar = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <rect x="3" y="4" width="18" height="18" rx="4" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
)
export const IconDen = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <rect x="2" y="4" width="20" height="16" rx="4" />
    <path d="m10 9 5 3-5 3V9Z" />
  </Svg>
)
export const IconClock = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)
export const IconPlanner = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M3 9h18M9 9v12" />
  </Svg>
)
export const IconTeam = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M17 5.2a3.6 3.6 0 0 1 0 6.9M18.2 14.4A5.6 5.6 0 0 1 22 20" />
  </Svg>
)
export const IconSettings = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="12" cy="12" r="3.2" />
    <path d={GEAR} />
  </Svg>
)
export const IconTodo = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M9 11.5 11.5 14 20 5.5" />
    <path d="M20 12.5V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h9" />
  </Svg>
)
export const IconRedo = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M3 12a9 9 0 1 1 2.6 6.3" />
    <path d="M3 21v-6h6" />
  </Svg>
)
export const IconLibrary = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </Svg>
)
export const IconUpload = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
)
export const IconPipeline = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </Svg>
)
export const IconPerformance = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M3 17V9M9 17V5M15 17v-6M21 17v-9" />
  </Svg>
)
export const IconSearch = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="11" cy="11" r="7.5" />
    <path d="m21 21-4.2-4.2" />
  </Svg>
)
export const IconSun = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)
export const IconMoon = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Svg>
)
export const IconBell = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
)
export const IconGear = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="12" cy="12" r="3.2" />
    <path d={GEAR} />
  </Svg>
)
export const IconDownload = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M12 3v12M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </Svg>
)
export const IconPlus = ({ w = 2.4, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IconChevronDown = ({ w = 2.2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const IconBriefcase = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <rect x="2" y="7" width="20" height="14" rx="4" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
)
export const IconHourglass = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.5V12l3.5 2" />
  </Svg>
)
export const IconWarning = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4.5M12 17.2h.01" />
  </Svg>
)
export const IconCheck = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)
export const IconReport = ({ w = 1.9, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M3 17V9M9 17V5M15 17v-6M21 17v-9" />
    <path d="M2 21h20" />
  </Svg>
)
export const IconShield = ({ w = 2, size }: P) => (
  <Svg w={w} size={size}>
    <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" />
  </Svg>
)
