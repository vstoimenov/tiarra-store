/** Requested storefront container; an explicit admin setting or environment ID overrides it. */
export const DEFAULT_GTM_ID = 'GTM-MXBFWH5L'
export function resolveGoogleTagManagerId(stored?: string | null, configured?: string | null) {
 return [stored, configured, DEFAULT_GTM_ID].find(value => typeof value === 'string' && /^GTM-[A-Z0-9]+$/.test(value.trim()))!.trim()
}
export const GOOGLE_CONSENT_DEFAULT = `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`
export const GOOGLE_CONSENT_GRANTED = `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});`
export function googleTagManagerScript(id: string) {
 if (!/^GTM-[A-Z0-9]+$/.test(id)) throw new Error('Invalid GTM ID')
 return GOOGLE_CONSENT_GRANTED + `(function(w,d,i){if(d.querySelector('script[src="https://www.googletagmanager.com/gtm.js?id='+i+'"]'))return;w.dataLayer=w.dataLayer||[];w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;d.head.appendChild(j);})(window,document,'${id}');`
}
