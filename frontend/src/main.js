/**
 * نقطه ورود باندل Vite — ساختار صنعتی (ES modules).
 * مهاجرت تدریجی: کدهای جدید اینجا؛ legacy در /js/dashboard.js تا زمان انتقال کامل.
 */
import { createAppContext } from '@core/app-context.js';
import { registerPlatform } from '@platform/index.js';
import { initDevBanner } from '@shared/dev-banner.js';

const ctx = createAppContext({ env: import.meta.env.MODE });
registerPlatform(ctx);
initDevBanner(ctx);

export { ctx };
