# StreamTip

StreamTip is an independent creator donations, overlay, and payout platform for livestream workflows.

## Important Legal Notice

- StreamTip is not affiliated with, endorsed by, sponsored by, or operated by TikTok or ByteDance.
- References to third-party platforms are descriptive only and do not imply any official partnership.
- This codebase should be treated as proprietary unless you intentionally choose another license later.

## Production Checklist

1. Set all required backend environment variables.
2. Set all required frontend public environment variables.
3. Use production secrets, not sandbox/test credentials.
4. Ensure `Backend/.env` is never committed.
5. Review the Terms and Privacy pages before launch.
6. Verify Monnify webhooks and payout routes in your live environment.
7. Confirm Google and Apple sign-in credentials and redirect URLs.
8. Capture creator BVN or NIN before provisioning live Monnify accounts.
9. Verify legal/business review for payment processing in your region.

## Backend Environment Variables

Create `Backend/.env` from `Backend/.env.example`.

Required values include:

- `MONGODB_URI`
- `MONNIFY_API_KEY`
- `MONNIFY_SECRET_KEY`
- `MONNIFY_CONTRACT_CODE`
- `MONNIFY_BASE_URL`
- `MONNIFY_DISBURSEMENT_SOURCE_ACCOUNT_NUMBER`
- `FRONTEND_ORIGIN`
- `MONNIFY_WEBHOOK_IP_ALLOWLIST`
- `GOOGLE_CLIENT_ID`
- `APPLE_CLIENT_ID`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Frontend Environment Variables

Create `.env.local` from `.env.example`.

Required values include:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_MONNIFY_MODE`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_APPLE_CLIENT_ID`
- `NEXT_PUBLIC_APPLE_REDIRECT_URI`

## Development

Frontend:

```powershell
npm run dev
```

Backend:

```powershell
cd Backend
npm run dev
```

## Deployment Notes

- Use a production MongoDB deployment.
- Use HTTPS for the frontend and backend.
- Use a public HTTPS webhook URL for Monnify.
- Replace sandbox Monnify credentials with live credentials only after account activation.
- Use `https://api.monnify.com` for `MONNIFY_BASE_URL` in live mode.
- Set `NEXT_PUBLIC_MONNIFY_MODE=live` and point `NEXT_PUBLIC_API_BASE_URL` to your deployed backend.
- Set `FRONTEND_ORIGIN` to your deployed frontend domain so CORS and sockets accept production traffic.
- Optionally set `MONNIFY_WEBHOOK_IP_ALLOWLIST` to Monnify's current webhook IPs once your proxy/load balancer forwarding is configured.
- Review payout and disbursement access before enabling live withdrawals.
- Make sure creators have BVN or NIN stored before retrying live virtual-account provisioning.

### streamtips.live Example

If you deploy the frontend on `streamtips.live` and the backend on `api.streamtips.live`, use:

- `NEXT_PUBLIC_SITE_URL=https://streamtips.live`
- `NEXT_PUBLIC_API_BASE_URL=https://api.streamtips.live`
- `NEXT_PUBLIC_MONNIFY_MODE=live`
- `FRONTEND_ORIGIN=https://streamtips.live,https://www.streamtips.live,https://portal.streamtips.live`
- Monnify Transaction Completion webhook: `https://api.streamtips.live/webhook/monnify`

## Anti-Cloning Reality Check

No public website or shipped frontend can be made literally impossible to copy. What you can do is reduce risk and increase deterrence:

- keep sensitive logic and secrets on the server
- use proprietary branding and legal notices
- avoid committing secrets
- enforce access control on backend APIs
- register your business name and marks where appropriate
- use monitoring and rate limits in production

This repository has been prepared with those practical protections in mind, but no codebase can truthfully guarantee that copying is impossible.
