# Play Console — Data safety answers for Kaya Staff (io.fxguard.kaya.staff)

Does the app collect or share user data? **Yes** (needed for login and work content).

## Collected (not shared with third parties for advertising)

| Data type | Collected | Shared | Required | Purpose |
|-----------|-----------|--------|----------|---------|
| Personal info → Name | Yes (staff display name from API) | No | Yes for app function | App functionality |
| Personal info → Email | Yes (typed at login / from profile) | No | Yes | App functionality |
| Personal info → User IDs | Yes (staff username / id) | No | Yes | App functionality |
| Photos and videos | No (attach control is disabled) | — | — | — |
| Audio | No (voice control is disabled) | — | — | — |
| Messages | Yes (WhatsApp / CRM content the staff user is allowed to see) | No (stays on org server) | Yes | App functionality |
| App activity | No analytics SDK | — | — | — |
| App info and performance | No | — | — | — |
| Device or other IDs | Yes (FCM registration token for push) | Shared with Google FCM only to deliver staff notifications | Yes for notifications | App functionality |
| Location | No | — | — | — |
| Financial | No (staff portal; not a payments app) | — | — | — |

Security practices
- Data is encrypted in transit (HTTPS).
- Users can request deletion: https://kaya.fxguard.io/account-deletion
- Committed to Play Families Policy: **No** (not for children)
- Independent security review: No

Privacy policy URL: https://kaya.fxguard.io/privacy
