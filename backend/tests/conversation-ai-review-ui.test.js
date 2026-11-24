/**
 * Kaya CRM — employee approval and stale-result UI regression tests
 * @file backend/tests/conversation-ai-review-ui.test.js
 * @layer frontend/dashboard
 * @owner Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see docs/CODEBASE-MAP.md
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class Element {
    constructor(tag) {
        this.tag = tag;
        this.children = [];
        this.hidden = false;
        this.listeners = {};
        this.value = '';
    }
    append(...children) {
        this.children.push(...children);
    }
    appendChild(child) {
        this.append(child);
    }
    replaceChildren(...children) {
        this.children = children;
    }
    setAttribute(key, value) {
        this[key] = value;
    }
    addEventListener(event, fn) {
        this.listeners[event] = fn;
    }
    click() {
        if (!this.disabled && this.listeners.click) this.listeners.click();
    }
}
function all(el) {
    return [el].concat(el.children.flatMap(all));
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function main() {
    const panel = new Element('section');
    const root = {
        document: { getElementById: () => panel, createElement: (tag) => new Element(tag) },
    };
    const context = vm.createContext({ window: root });
    for (const lang of ['fa', 'en', 'tr']) {
        vm.runInContext(
            fs.readFileSync(path.join(__dirname, '../public/js/i18n-' + lang + '.js'), 'utf8'),
            context
        );
    }
    vm.runInContext(
        fs.readFileSync(
            path.join(__dirname, '../public/js/modules/conversation-ai-review.js'),
            'utf8'
        ),
        context
    );
    const ui = root.CRMConversationAI;
    const calls = [];
    const inserts = [];
    const response = {
        ok: true,
        data: { text: '<img src=x onerror=alert(1)> Draft', conversationId: 'a' },
    };
    const request = async (url, options) => {
        calls.push({ url, options });
        return options ? response : { ok: true, data: { enabled: true, configured: true } };
    };
    const open = (extra = {}) =>
        ui.open({
            id: 'a',
            language: 'en',
            request,
            insertDraft: (text) => inserts.push(text),
            ...extra,
        });
    const button = (text) =>
        all(panel).find((el) => el.tag === 'button' && el.textContent === text);

    await open();
    button('Draft reply').click();
    await flush();
    assert.strictEqual(inserts.length, 0, 'generation must not populate or send the composer');
    const textarea = all(panel).find((el) => el.tag === 'textarea');
    assert.strictEqual(textarea.value, response.data.text);
    assert.ok(!all(panel).some((el) => el.tag === 'img'), 'model HTML must remain textarea text');
    textarea.value = 'Edited by employee';
    button('Approve and place in composer').click();
    assert.deepStrictEqual(inserts, ['Edited by employee']);
    assert.ok(
        calls.every((call) => !call.url.endsWith('/send')),
        'review module must never invoke outbound send'
    );
    console.log('  ✓ draft requires a separate employee action and renders model HTML as text');

    await open();
    button('Internal summary').click();
    await flush();
    assert.strictEqual(
        button('Approve and place in composer'),
        undefined,
        'summary must not be insertable as a customer reply'
    );
    assert.strictEqual(inserts.length, 1);
    console.log('  ✓ internal summary never appears in the outgoing composer');

    let finish;
    await open({
        request: (url, options) =>
            options
                ? new Promise((resolve) => {
                      finish = resolve;
                  })
                : request(url),
    });
    button('Draft reply').click();
    await flush();
    await open({ id: 'b' });
    finish(response);
    await flush();
    assert.ok(
        !all(panel).some((el) => el.tag === 'textarea'),
        'late result from conversation A must not render in B'
    );
    console.log('  ✓ conversation switch discards late provider results');

    await open({ request: async () => ({ ok: true, data: { enabled: true, configured: false } }) });
    assert.strictEqual(button('Draft reply').disabled, true);
    assert.strictEqual(button('Internal summary').disabled, true);
    ui.reset();
    assert.strictEqual(panel.hidden, true);
    assert.strictEqual(panel.children.length, 0);
    console.log('  ✓ missing key disables generation; session reset removes outputs');

    for (const lang of ['fa', 'tr']) {
        await open({ language: lang });
        const copy = root['__I18N_' + lang.toUpperCase()].ai_review_copy;
        assert.ok(button(copy[1]));
        assert.ok(button(copy[2]));
    }
    console.log('  ✓ Persian, English and Turkish review copy loads from translation packs');
    console.log('\n5 AI review UI regression tests passed.');
}
main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
