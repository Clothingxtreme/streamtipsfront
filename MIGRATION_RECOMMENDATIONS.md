# NestJS Migration - Missing Features Analysis

## Summary
Comparison between original Node.js backend (`Backend/server.js`) and NestJS backend (`NewBackend/src`) shows that **55 routes are missing** from the NestJS implementation out of 89 total routes in the original.

## Critical Missing Functionality

### 1. Authentication & Social Login (2 routes)
- `POST /auth/oauth/google`
- `POST /auth/oauth/apple`

### 2. User Virtual Accounts (2 routes)
- `POST /users/:id/virtual-account`
- `POST /users/:id/virtual-account/requery`

### 3. Testing & Development (1 route)
- `POST /monnify/test-donation`

### 4. Overlay & Media (6 routes)
- `GET /overlay-state`
- `GET /uploads/gift-sounds/:soundId`
- `POST /overlay-sound-upload`
- `POST /overlay-sound-upload-json`
- `PUT /overlay-state`
- `GET /public/overlay/:creatorId`

### 5. KYC Upgrade Related (1 route)
- `GET /kyc/upgrade-submissions`

### 6. Admin Dashboard & Analytics (24 routes)
- Portal compliance inflows: 6 routes
- Portal donations: 5 routes
- Portal settlements: 8 routes
- Portal users: 3 routes
- Portal payout profiles: 2 routes
- Portal KYC upgrades: already partially implemented

### 7. Admin User Management (8 routes)
- User CRUD operations
- Virtual account management
- Identity verification
- Migration tools

### 8. Admin Financial Operations (2 routes)
- Platform withdrawals (GET/POST)

### 9. Static File Serving (1 route)
- `USE /uploads` - serve uploaded files

## Implemented Routes (37 total)
Currently working:
- Health, auth, basic user, payouts, banks, webhooks
- Some portal/KYC admin endpoints

## Recommended Implementation Plan

### Phase 1: Core User Features (High Priority)
1. **User Virtual Accounts Controller**
   - Create `src/users/virtual-accounts.controller.ts`
   - Implement virtual account creation and requery endpoints
   - Use existing Paystack service integration

2. **Social Authentication Controller**
   - Add OAuth handlers to `auth.controller.ts`
   - Implement Google and Apple OAuth flows

3. **Testing Endpoints**
   - Add test-donation endpoint to existing donations or payouts controller

### Phase 2: Media & Overlay Features (Medium Priority)
1. **Overlay Controller**
   - Create `src/overlay/overlay.controller.ts`
   - Implement overlay state management and gift sounds
   - Add file upload handling for overlay sounds

2. **Static File Serving**
   - Configure NestJS to serve `/uploads` static files
   - Use `serveStatic` module or custom middleware

### Phase 3: Admin Portal Features (High Priority)
1. **Portal Admin Controllers** (create new)
   - Admin finance controller (expanded)
   - Admin compliance inflows controller
   - Admin donations controller
   - Admin settlements controller
   - Admin users controller (expanded)
   - Admin portal payout profiles controller

### Phase 4: Utilities & Services
1. **Create missing services** based on original Backend/services/
   - Enhance existing Paystack/Monnify services
   - Add utility services for file handling, notifications, etc.

2. **Implement guards/middleware**
   - SessionUserGuard and AdminSessionGuard equivalents
   - Database readiness middleware

## Files to Create/Modify

### New Controllers Needed:
```
src/
├── users/
│   └── virtual-accounts.controller.ts
├── overlay/
│   └── overlay.controller.ts
├── portal/
│   ├── admin-finance.controller.ts (expand)
│   ├── admin-compliance-inflows.controller.ts
│   ├── admin-donations.controller.ts
│   ├── admin-settlements.controller.ts
│   ├── admin-users.controller.ts (expand)
│   └── admin-payout-profiles.controller.ts
├── donations/
│   └── donations.controller.ts
└── integrations/
    └── oauth.controller.ts (for social login)
```

### Services to Enhance/Create:
```
src/
├── shared/services/
│   ├── file-upload.service.ts
│   ├── notification.service.ts
│   └── overlay.service.ts
├── integrations/
│   ├── paystack.service.ts (enhance from backend/services/paystack.js)
│   └── monnify.service.ts (enhance from backend/services/monnify.js)
```

## Next Steps
Would you like me to start implementing any specific missing controller or service? I recommend beginning with:
1. User virtual accounts (critical for payouts)
2. Social OAuth login (authentication)
3. Overlay controller (media features)

Let me know which area you'd like to prioritize.