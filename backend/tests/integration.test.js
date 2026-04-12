/**
 * تست یکپارچگی — سرور را بالا می‌آورد و endpointهای اصلی را تست می‌کند
 * اجرا: node tests/integration.test.js
 */
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

const TIMEOUT = 7000;

function getFreePort() {
    return new Promise((resolve, reject) => {
        const s = net.createServer();
        s.listen(0, '127.0.0.1', () => {
            const addr = s.address();
            const p = typeof addr === 'object' && addr ? addr.port : 0;
            s.close(() => resolve(p));
        });
        s.on('error', reject);
    });
}

function httpGet(baseUrl, path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
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

async function waitForServer(baseUrl, maxWait = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        try {
            const r = await httpGet(baseUrl, '/health');
            if (r.status === 200) return true;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

async function run() {
    const port = await getFreePort();
    if (!port) throw new Error('Could not allocate a free TCP port');
    const BASE_URL = 'http://127.0.0.1:' + port;

    const env = {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        USE_SQLITE: 'true',
        SKIP_REDIS: '1',
        DISABLE_RATE_LIMIT: 'true',
        MAIN_ADMIN_EMAIL: process.env.MAIN_ADMIN_EMAIL || 'admin@test.com',
        MAIN_ADMIN_PASSWORD: process.env.MAIN_ADMIN_PASSWORD || 'Test123!',
        JWT_SECRET: process.env.JWT_SECRET || '12345678901234567890123456789012',
        ENCRYPT_SECRET: process.env.ENCRYPT_SECRET || 'test-encrypt-secret-32-chars-min!',
    };

    console.log('Starting server on port ' + port + '...');
    const server = spawn('node', ['server.js'], {
        cwd: __dirname + '/..',
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderrBuf = '';
    server.stderr.on('data', (d) => { stderrBuf += d.toString(); });

    try {
        const ready = await waitForServer(BASE_URL);
        if (!ready) {
            throw new Error('Server did not start in time' + (stderrBuf ? '\n' + stderrBuf.slice(-2000) : ''));
        }
        console.log('  ✓ Server started');

        const tests = [
            ['/health', (r) => r.status === 200 && ['ok', 'degraded'].includes(r.data.status)],
            ['/api/ping', (r) => r.status === 200 && r.data.ok === true],
            ['/api/config', (r) => r.status === 200 && r.data.timezone],
        ];

        for (const [path, check] of tests) {
            const r = await httpGet(BASE_URL, path);
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
