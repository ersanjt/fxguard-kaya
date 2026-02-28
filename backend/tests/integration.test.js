/**
 * تست یکپارچگی — سرور را بالا می‌آورد و endpointهای اصلی را تست می‌کند
 * اجرا: node tests/integration.test.js
 */
const { spawn } = require('child_process');
const http = require('http');

const BASE_URL = 'http://localhost:3002';
const TIMEOUT = 5000;

function httpGet(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const req = http.get(url.toString(), { timeout: TIMEOUT }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function waitForServer(maxWait = 15000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        try {
            const r = await httpGet('/health');
            if (r.status === 200) return true;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

async function run() {
    const env = {
        ...process.env,
        MAIN_ADMIN_EMAIL: process.env.MAIN_ADMIN_EMAIL || 'admin@test.com',
        MAIN_ADMIN_PASSWORD: process.env.MAIN_ADMIN_PASSWORD || 'Test123!',
        JWT_SECRET: process.env.JWT_SECRET || '12345678901234567890123456789012',
        USE_SQLITE: 'true',
    };

    console.log('Starting server...');
    const server = spawn('node', ['server.js'], {
        cwd: __dirname + '/..',
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let serverReady = false;
    server.stdout.on('data', (d) => {
        if (d.toString().includes('running on port')) serverReady = true;
    });

    try {
        const ready = await waitForServer();
        if (!ready) {
            throw new Error('Server did not start in time');
        }
        console.log('  ✓ Server started');

        const tests = [
            ['/health', (r) => r.status === 200 && r.data.status === 'ok'],
            ['/api/ping', (r) => r.status === 200 && r.data.ok === true],
            ['/api/config', (r) => r.status === 200 && r.data.timezone],
        ];

        for (const [path, check] of tests) {
            const r = await httpGet(path);
            if (check(r)) {
                console.log(`  ✓ GET ${path}`);
            } else {
                throw new Error(`GET ${path} failed: ${JSON.stringify(r)}`);
            }
        }

        console.log('\n✅ All integration tests passed.');
    } finally {
        server.kill('SIGTERM');
    }
}

run().catch((err) => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
