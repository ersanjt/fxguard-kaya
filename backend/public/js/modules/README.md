# Dashboard Modules

Modular JavaScript for the CRM SPA. Load order: constants → api-client → (i18n) → dashboard.

| File | Purpose |
|------|---------|
| `constants.js` | VALID_PAGES, PAGE_TO_SECTION, PAGE_IDS, PAGE_TITLES — config for routing. |
| `utils.js` | escapeHtml, formatPrice, formatChange — formatting helpers. |
| `api-client.js` | API fetch wrapper, error handling. Init from dashboard after `headers()` exists. |

## Usage

```html
<script src="/js/modules/api-client.js"></script>
<script src="/js/dashboard.js"></script>
```

In dashboard.js, after defining `headers()` and `LANG`:
```js
CRM.Api.init({
    getHeaders: headers,
    getLang: () => LANG,
    on401: function() { /* show login, clear token */ }
});
// Use CRM.Api.fetch(url, opts) and CRM.Api.getError(res)
```
