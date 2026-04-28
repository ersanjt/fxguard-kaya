/**
 * @param {{ env: string, version: string }} ctx
 */
export function initDevBanner(ctx) {
    if (import.meta.env.DEV) {
        console.info(
            `[Kaya Dashboard] ESM shell OK — env=${ctx.env} v=${ctx.version}`
        );
    }
}
