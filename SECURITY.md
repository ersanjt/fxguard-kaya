# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Report security-sensitive findings privately to the repository owner through GitHub. Include the affected component, reproduction steps, and expected impact.

## Credentials and secrets

Never commit production credentials, API tokens, session data, customer data, database files, or private keys.

Example configuration must use placeholders only. Production deployments should use environment-specific secret storage and unique administrator credentials.

If a credential is ever committed publicly, treat it as compromised: revoke or rotate it, then remove it from the repository and relevant history where appropriate.

## Supported code

Security fixes target the current `main` branch.
