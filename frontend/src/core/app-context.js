/**
 * زمینهٔ مشترک اپ (جایگزین تدریجی برای متغیرهای سراسری پراکنده).
 * @param {{ env: string }} options
 */
export function createAppContext(options) {
    return {
        env: options.env || 'development',
        version: '0.1.0',
        /** بعداً: api، auth، i18n از اینجا تزریق می‌شود */
        services: {}
    };
}
