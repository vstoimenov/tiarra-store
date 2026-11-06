'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
export function StorefrontChrome({children,header,footer,analytics}:{children:ReactNode;header:ReactNode;footer:ReactNode;analytics:ReactNode}){
 const path=usePathname()
 if(path==='/admin'||path.startsWith('/admin/'))return children
 return <>{header}<main>{children}</main>{footer}{analytics}</>
}
