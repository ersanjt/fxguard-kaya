<?php
/**
 * Country hint for the language prompt. Does not redirect.
 * Uses the edge/country header when the host provides one (Cloudflare or mod_geoip).
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, max-age=1800');
header('X-Robots-Tag: noindex');

$country = '';
$keys = ['HTTP_CF_IPCOUNTRY', 'GEOIP_COUNTRY_CODE', 'HTTP_X_COUNTRY_CODE'];
foreach ($keys as $key) {
    if (!empty($_SERVER[$key]) && preg_match('/^[A-Za-z]{2}$/', $_SERVER[$key])) {
        $country = strtoupper($_SERVER[$key]);
        break;
    }
}

echo json_encode(['country' => $country], JSON_UNESCAPED_UNICODE);
