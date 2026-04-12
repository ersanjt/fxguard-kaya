/**
 * راه‌اندازی اپ Vite — زمینه، پلتفرم و ابزارهای توسعه.
 */
import { createAppContext } from '@core/app-context.js';
import { registerPlatform } from '@platform/index.js';
import { initDevBanner } from '@shared/dev-banner.js';

const ctx = createAppContext({ env: import.meta.env.MODE });
registerPlatform(ctx);
initDevBanner(ctx);

export { ctx };
