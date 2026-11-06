import { describe, expect, it } from 'vitest'
import { parseHomeDocument } from '../../lib/admin/home-document'
const banner = {id:'campaign',type:'banner',enabled:true,data:{imagePath:'site/hero',title:'Black Friday',text:'Offers',buttonLabel:'Shop',buttonHref:'/store'}}
describe('homepage editing',()=>{
 it('rejects backslashes and control characters in links',()=>{for(const buttonHref of ['/\\evil.test','/\n/evil.test'])expect(()=>parseHomeDocument({sections:[{...banner,data:{...banner.data,buttonHref}}]})).toThrow()})
 it('preserves ordering and hidden sections',()=>{const doc=parseHomeDocument({sections:[banner,{...banner,id:'second',enabled:false}]});expect(doc.sections.map(s=>s.id)).toEqual(['campaign','second']);expect(doc.sections[1].enabled).toBe(false)})
 it('rejects duplicate identifiers',()=>{expect(()=>parseHomeDocument({sections:[banner,banner]})).toThrow()})
 it('rejects unsafe links',()=>{expect(()=>parseHomeDocument({sections:[{...banner,data:{...banner.data,buttonHref:'javascript:alert(1)'}}]})).toThrow()})
 it('sanitizes editable HTML',()=>{const doc=parseHomeDocument({sections:[{id:'about',enabled:true,type:'imageText',data:{imagePath:'site/about',title:'About',bodyHtml:'<p>Hello</p><script>alert(1)</script>'}}]});expect(JSON.stringify(doc)).toContain('<p>Hello</p>');expect(JSON.stringify(doc)).not.toContain('<script>')})
 it('rejects inverted campaign dates',()=>{expect(()=>parseHomeDocument({sections:[{...banner,showFrom:'2026-11-30T00:00:00Z',showUntil:'2026-11-01T00:00:00Z'}]})).toThrow()})
})
