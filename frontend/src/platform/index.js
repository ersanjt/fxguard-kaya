/**
 * لایهٔ «پلتفرم»: اتصال به بک‌اند، سوکت، و در نهایت bridge با legacy (window.*).
 * @param {{ env: string, version: string, services: Record<string, unknown> }} ctx
 */
export function registerPlatform(ctx) {
    if (typeof window !== 'undefined') {
        window.__KAYA_DASHBOARD = {
            ...(window.__KAYA_DASHBOARD || {}),
            version: ctx.version,
            env: ctx.env,
            source: 'vite-esm'
        };
    }
}
