# Controllers

Business logic layer — separates route definitions from handler logic.

| File | Routes |
|------|--------|
| `branches.controller.js` | GET/POST/PUT /api/branches |
| `departments.controller.js` | GET/POST/PUT /api/departments |
| `analytics.controller.js` | GET /api/analytics/dashboard |
| `users.controller.js` | GET/POST/PUT/PATCH /api/users, /me, delete-with-transfer, permanent-delete |

**Pattern:** Route → Controller → Model/Service
