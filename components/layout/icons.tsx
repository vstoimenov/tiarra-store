import type { ReactNode, SVGProps } from 'react'

// Small inline icons for the header and footer. All are decorative (`aria-hidden`); the control
// that holds one carries the accessible name.

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  )
}

type IconProps = SVGProps<SVGSVGElement>

export const SearchIcon = (props: IconProps) => (
  <Icon strokeWidth="2.4" {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </Icon>
)

export const BagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 8h14l1 12.5H4L5 8z" />
    <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon strokeWidth="2.6" {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

/** Three bars, the same 22 x 3 px bars the live burger has. */
export const BurgerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 22 17" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
    <rect width="22" height="3" rx="1" />
    <rect y="7" width="22" height="3" rx="1" />
    <rect y="14" width="22" height="3" rx="1" />
  </svg>
)

export const MailIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
)

export const PhoneIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Icon>
)

export const FacebookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 9h3V6h-3c-2 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l.5-3H14v-2c0-.6.4-1 1-1z" />
  </Icon>
)

export const InstagramIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </Icon>
)

export const TiktokIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4v9.5a3.5 3.5 0 11-3.5-3.5" />
    <path d="M14 6.5c1 1.8 2.6 3 4.5 3.2" />
  </Icon>
)

/** Sliders distinguish product filters from the navigation menu. */
export const FilterIcon = (props: IconProps) => (
  <Icon strokeWidth="1.7" {...props}>
    <path d="M4 7h3m4 0h9M4 17h9m4 0h3" />
    <circle cx="9" cy="7" r="2" />
    <circle cx="15" cy="17" r="2" />
  </Icon>
)
