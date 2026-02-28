/**
 * اعتبارسنجی رمز عبور — حداقل ۸ کاراکتر، حداقل یک حرف و یک عدد
 */
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

function validatePassword(password) {
    const p = String(password || '').trim();
    if (p.length < MIN_LENGTH) {
        return { valid: false, message: `رمز عبور حداقل ${MIN_LENGTH} کاراکتر باشد` };
    }
    if (p.length > MAX_LENGTH) {
        return { valid: false, message: `رمز عبور حداکثر ${MAX_LENGTH} کاراکتر باشد` };
    }
    if (!/[a-zA-Z]/.test(p)) {
        return { valid: false, message: 'رمز عبور باید حداقل یک حرف داشته باشد' };
    }
    if (!/[0-9]/.test(p)) {
        return { valid: false, message: 'رمز عبور باید حداقل یک عدد داشته باشد' };
    }
    return { valid: true };
}

module.exports = { validatePassword, MIN_LENGTH, MAX_LENGTH };
