#!/usr/bin/env node
/**
 * Test runner wrapper — sets env vars then runs suite.test.js
 * اجرا: node tests/run-tests.js
 */
'use strict';

// Set env vars BEFORE requiring anything
process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.DISABLE_RATE_LIMIT = 'true';

// Now run the suite
require('./suite.test.js');
