# Meta App Review pack — FXGuard / Kaya CRM (paste-ready)

**Owner:** Ersan Jahed Tabrizi  
**Product:** Kaya CRM (multi-tenant WhatsApp CRM) — `https://app.fxguard.io` / `https://fxguard.io`  
**Plan:** [META-TECH-PROVIDER-PLAN-FA.md](./META-TECH-PROVIDER-PLAN-FA.md)

Use **English** in the Meta App Review form. Record videos with English UI or English subtitles.

---

## 1) App description (short)

> Kaya CRM is a multi-tenant business CRM. Business customers sign up on our platform, connect their own WhatsApp Business account through Meta Embedded Signup, and use our staff panel to send and receive customer WhatsApp messages, manage templates, and run support workflows. We do not message consumers on our own behalf through customer WABAs; each business customer owns their WhatsApp assets.

---

## 2) Permission: `whatsapp_business_messaging`

### Written explanation (paste)

> We request whatsapp_business_messaging so that after a business customer completes Embedded Signup inside Kaya CRM, our server can send and receive WhatsApp messages on that customer’s Cloud API phone number. Staff users in the customer’s tenant use our dashboard to reply to inbound conversations and send allowed outbound messages (session messages and approved templates). Tokens are stored per tenant and used only to provide messaging for that onboarded business.

### Video script (2–4 minutes)

1. Open `https://app.fxguard.io` (or staging) signed in as a user with a role on the Meta app.
2. Go to **WhatsApp** (`#whatsapp`).
3. Click **Connect with Meta** / show Embedded Signup window.
4. Complete (or simulate with sandbox) until the panel shows Phone Number ID connected.
5. Open Conversations, send a test message from the CRM.
6. Show the message arriving in WhatsApp (phone or Web).
7. Optionally show an inbound reply appearing in the CRM.

**Say on camera (or subtitle):** “This permission is used only after the business customer connects their WhatsApp account via Embedded Signup, to send and receive their customer messages inside Kaya CRM.”

---

## 3) Permission: `whatsapp_business_management`

### Written explanation (paste)

> We request whatsapp_business_management so that after Embedded Signup, Kaya CRM can read and manage the onboarded customer’s WhatsApp Business account settings needed to operate the CRM: phone number connection status, webhook subscription to the customer’s messaging account, and message template information used for compliant outbound / bulk messaging. We do not use this permission for advertising or for accessing unrelated Meta products.

### Video script (2–4 minutes) — separate clip

1. Start from the WhatsApp settings page after a successful connect.
2. Show Phone Number ID / connection status / **Test Meta connection**.
3. Show template fields used for bulk/outbound (template name + language) or WhatsApp Manager templates linked to the same WABA.
4. Explain that management APIs are used to keep the CRM in sync with the customer’s WhatsApp Business assets.

**Say on camera:** “This permission lets Kaya CRM manage WhatsApp Business account settings and templates for businesses that connected through Embedded Signup.”

---

## 4) Allowed usage notes (common Meta questions)

| Question | Answer |
|----------|--------|
| Who owns WABA / phone? | The business customer |
| Do you message end consumers for yourselves? | No — only on behalf of onboarded businesses |
| Tech Provider vs Solution Partner? | Tech Provider (customers add their own payment method) |
| Data deletion | Staff account deletion + org admin controls; see `/privacy` and `/account-deletion` |
| Privacy policy URL | `https://fxguard.io/privacy` or `https://kaya.fxguard.io/privacy` (also served on app host) |
| Terms URL | `https://fxguard.io/terms` or `https://kaya.fxguard.io/terms` |

---

## 5) Test user instructions for reviewers

Provide a reviewer login (tester role on the app + CRM account):

1. URL: `https://app.fxguard.io/login` (or temporary staging URL)
2. Email / password: *(fill before submit)*
3. After login → open **WhatsApp** in the sidebar
4. Use **Connect with Meta** (tester must be added as Developer/Tester on the Meta app)
5. Sandbox: App Dashboard → WhatsApp → Partner Tools → Claim sandbox account

---

## 6) Checklist before Submit

- [ ] Business Verification complete
- [ ] Privacy + Terms publicly reachable over HTTPS
- [ ] Only request the two WhatsApp permissions (no extra ads/leads perms)
- [ ] Two **separate** videos uploaded
- [ ] Embedded Signup Configuration created (even if Advanced Access pending for live customers)
- [ ] Webhook callback works: `GET/POST …/api/webhook/whatsapp-cloud`
- [ ] `META_APP_ID` / `META_APP_SECRET` / `META_EMBEDDED_SIGNUP_CONFIG_ID` ready for production app host after approval

---

## 7) Persian note for the team

متن‌های بالا را عیناً در فرم Meta کپی کنید. فیلم‌ها را جداگانه بگیرید؛ یک فیلم برای هر دو permission نگذارید. بعد از Approve، Configuration ID را در env سرور app بگذارید تا دکمهٔ Connect برای مشتریان واقعی ظاهر شود.
