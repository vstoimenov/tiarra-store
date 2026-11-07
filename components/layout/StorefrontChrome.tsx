'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { StoreTheme } from '@/lib/sections/schema'
export function StorefrontChrome({children,header,footer,analytics,theme}:{children:ReactNode;header:ReactNode;footer:ReactNode;analytics:ReactNode;theme:StoreTheme}){
 const path=usePathname()
 if(path==='/admin'||path.startsWith('/admin/'))return children
 return <div className="storefront-theme" data-store-theme={theme}>{header}<main>{children}</main>{footer}{analytics}</div>
}
