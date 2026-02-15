/**
 * تست‌های مربوط به API مشتریان و گزارش/یادداشت کارمند
 * اجرا: از پوشه backend با node tests/api-customers-notes.test.js
 * نیاز: سرور نباید در حال اجرا باشد روی همان پورت (یا از درگاه دیگر استفاده کنید)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const assert = require('assert');

async function run() {
    console.log('Loading models...');
    const models = require('../models');
    const { Customer, CustomerNote, User, Conversation, Message } = models;

    assert(Customer, 'Customer model should exist');
    assert(CustomerNote, 'CustomerNote model should exist');
    assert(Customer.associate, 'Customer should have associate');
    assert(CustomerNote.associate, 'CustomerNote should have associate');

    const custFields = Object.keys(Customer.rawAttributes);
    assert(custFields.includes('phone') && custFields.includes('name') && custFields.includes('notes'), 'Customer should have phone, name, notes');

    const noteFields = Object.keys(CustomerNote.rawAttributes);
    assert(noteFields.includes('customerId') && noteFields.includes('userId') && noteFields.includes('content'), 'CustomerNote should have customerId, userId, content');

    console.log('  ✓ Models and attributes OK');

    const { getAccessibleCustomerIds } = require('../lib/customerAccess');
    assert(typeof getAccessibleCustomerIds === 'function', 'getAccessibleCustomerIds should be a function');
    console.log('  ✓ customerAccess.getAccessibleCustomerIds OK');

    require('../routes/customers');
    console.log('  ✓ Customers routes load OK');

    console.log('\nAll checks passed.');
}

run().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
