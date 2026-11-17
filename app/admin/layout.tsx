import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
export const metadata={robots:{index:false,follow:false},manifest:'/admin.webmanifest',appleWebApp:{capable:true,title:'Tiarra Admin',statusBarStyle:'default' as const},icons:{apple:'/admin-icons/icon-180.png'}}
export default function AdminLayout({children}:{children:ReactNode}){return <AdminShell>{children}</AdminShell>}
