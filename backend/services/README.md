# Services — Logical Organization

| Folder | Purpose | Files |
|--------|---------|-------|
| **core/** | Database, activity log, seeding | database, activityLog, seed (moved) |
| **config/** | Panel & org configuration | panelSettingsLoader, defaultDepartments |
| **messaging/** | WhatsApp, auto-reply, AI | incomingMessage, autoMessages, aiResponseService, intelligentDepartmentRouter |
| **notifications/** | Email, user notifications | emailService, notificationService |
| **queue/** | Redis, RabbitMQ | redis, rabbitmq |
| **config/** | Panel & org | panelSettingsLoader, defaultDepartments |

All services remain importable via `require('../services/xxx')` for backward compatibility.
