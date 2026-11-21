/**
 * تبدیل وب‌هوک Coexistence (echo / history / contacts) به فرمت داخلی CRM
 */
'use strict';

const assert = require('assert');
const {
    transformCloudWebhookEntry,
    transformCloudWebhookToInternal,
} = require('../lib/whatsappCloudApi');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log('  ✓', name);
        passed++;
    } catch (err) {
        console.error('  ✗', name);
        console.error('    →', err.message);
        failed++;
    }
}

function entryWithChange(field, value) {
    return {
        id: '102290129340398',
        changes: [{ field, value }],
    };
}

async function main() {
    console.log('whatsapp cloud coexistence transform tests\n');

    await test('regular messages stay inbound fromMe=false', async () => {
        const msgs = transformCloudWebhookToInternal(
            entryWithChange('messages', {
                messaging_product: 'whatsapp',
                metadata: {
                    display_phone_number: '905339478008',
                    phone_number_id: '111222',
                },
                contacts: [{ wa_id: '905551112233', profile: { name: 'Ali' } }],
                messages: [
                    {
                        from: '905551112233',
                        id: 'wamid.in1',
                        timestamp: '1700000001',
                        type: 'text',
                        text: { body: 'سلام' },
                    },
                ],
            })
        );
        assert.strictEqual(msgs.length, 1);
        assert.strictEqual(msgs[0].fromMe, false);
        assert.strictEqual(msgs[0].contact.number, '905551112233');
        assert.strictEqual(msgs[0].body, 'سلام');
        assert.strictEqual(msgs[0].phoneNumberId, '111222');
    });

    await test('smb_message_echoes map to fromMe outbound', async () => {
        const { messages } = transformCloudWebhookEntry(
            entryWithChange('smb_message_echoes', {
                messaging_product: 'whatsapp',
                metadata: {
                    display_phone_number: '905339478008',
                    phone_number_id: '111222',
                },
                message_echoes: [
                    {
                        from: '905339478008',
                        to: '905551112233',
                        id: 'wamid.echo1',
                        timestamp: '1700000002',
                        type: 'text',
                        text: { body: 'پاسخ از موبایل' },
                    },
                ],
            })
        );
        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0].fromMe, true);
        assert.strictEqual(messages[0].contact.number, '905551112233');
        assert.strictEqual(messages[0].body, 'پاسخ از موبایل');
        assert.strictEqual(messages[0]._cloudSource, 'smb_message_echoes');
    });

    await test('history threads mark business vs customer correctly', async () => {
        const { messages, events } = transformCloudWebhookEntry(
            entryWithChange('history', {
                messaging_product: 'whatsapp',
                metadata: {
                    display_phone_number: '15550783881',
                    phone_number_id: '106540352242922',
                },
                history: [
                    {
                        metadata: { phase: 0, chunk_order: 1, progress: 100 },
                        threads: [
                            {
                                id: '16505551234',
                                messages: [
                                    {
                                        from: '15550783881',
                                        id: 'wamid.h1',
                                        timestamp: '1739230955',
                                        type: 'text',
                                        text: { body: 'from biz' },
                                    },
                                    {
                                        from: '16505551234',
                                        id: 'wamid.h2',
                                        timestamp: '1739230970',
                                        type: 'text',
                                        text: { body: 'from user' },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            })
        );
        assert.strictEqual(messages.length, 2);
        assert.strictEqual(messages[0].fromMe, true);
        assert.strictEqual(messages[0].contact.number, '16505551234');
        assert.strictEqual(messages[1].fromMe, false);
        assert.strictEqual(messages[1].body, 'from user');
        assert.ok(events.some((e) => e.type === 'history_progress' && e.progress === 100));
    });

    await test('smb_app_state_sync extracts contact upserts', async () => {
        const { contacts, messages } = transformCloudWebhookEntry(
            entryWithChange('smb_app_state_sync', {
                messaging_product: 'whatsapp',
                metadata: {
                    display_phone_number: '905339478008',
                    phone_number_id: '111222',
                },
                state_sync: [
                    {
                        type: 'contact',
                        action: 'add',
                        contact: {
                            full_name: 'Pablo Morales',
                            first_name: 'Pablo',
                            phone_number: '16505551234',
                        },
                        metadata: { timestamp: '1738346006' },
                    },
                    {
                        type: 'contact',
                        action: 'remove',
                        contact: { phone_number: '16505550000' },
                        metadata: { timestamp: '1738346007' },
                    },
                ],
            })
        );
        assert.strictEqual(messages.length, 0);
        assert.strictEqual(contacts.length, 2);
        assert.strictEqual(contacts[0].fullName, 'Pablo Morales');
        assert.strictEqual(contacts[0].action, 'add');
        assert.strictEqual(contacts[1].action, 'remove');
    });

    await test('history decline errors become events without crashing', async () => {
        const { messages, events } = transformCloudWebhookEntry(
            entryWithChange('history', {
                messaging_product: 'whatsapp',
                metadata: {
                    display_phone_number: '905339478008',
                    phone_number_id: '111222',
                },
                history: [
                    {
                        errors: [{ code: 2593109, message: 'History sharing declined' }],
                    },
                ],
            })
        );
        assert.strictEqual(messages.length, 0);
        assert.strictEqual(events[0].type, 'history_error');
        assert.strictEqual(events[0].errors[0].code, 2593109);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
