/**
 * اعتبارسنجی رمز عبور — حداقل ۸ کاراکتر، حداقل یک حرف و یک عدد
 */
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

function validatePassword(password) {
    const p = String(password || '');
    if (p.length < MIN_LENGTH) {
        return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters` };
    }
    if (p.length > MAX_LENGTH) {
        return { valid: false, message: `Password must be at most ${MAX_LENGTH} characters` };
    }
    if (!/[a-zA-Z]/.test(p)) {
        return { valid: false, message: 'Password must include at least one letter' };
    }
    if (!/[0-9]/.test(p)) {
        return { valid: false, message: 'Password must include at least one number' };
    }
    return { valid: true };
}

module.exports = { validatePassword, MIN_LENGTH, MAX_LENGTH };
