# Doctor Scheduling System

This is a full-stack starter for doctor scheduling with weekly rotation, leave handling, and Web Push notifications.

## Setup

1. Create a MongoDB database (local or Atlas).
2. Copy `.env.example` to `.env` and fill in values.
3. Install dependencies and run the backend and frontend.

### Backend

```
cd backend
npm install
npm run seed
npm run server
```

### Frontend

```
cd frontend
npm install
npm start
```

## Notes

- Push notifications require VAPID keys. Generate them using `npx web-push generate-vapid-keys` and place them in `.env`.
- Each doctor must subscribe from their own device on the Dashboard page.
- Duties now require a `department` field (matching a doctor's `specialization`).
- Admin overrides can be posted to `/api/schedule/override` with `{ date, duty, doctor }`.
- Department rotation is generated with `POST /api/schedule/generate` and requires `{ department, startDate }` (15-day range).
