'use client'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import GlassDashboard from '@/components/ui/adjustable-glass-dashboard'
export function AdminShell({children}:{children:ReactNode}){
 const path=usePathname()
 if(path==='/admin/login')return children
 return <GlassDashboard>{children}</GlassDashboard>
}
