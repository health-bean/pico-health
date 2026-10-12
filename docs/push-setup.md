# Check-in reminders (push) — turning them on

The code is shipped and inert. Each step below is outside the codebase.

1. **Database.** Create the table:
   `psql "$DATABASE_URL" -f lib/db/migrations/add-device-tokens.sql`
   Until this runs, the Settings switch must not be used (it only appears in the native app).

2. **iOS (APNs).** Apple Developer → Certificates, IDs & Profiles → Keys → new key with
   Apple Push Notifications service. Download the `.p8` once. Enable the Push Notifications
   capability on the `com.picohealth.app` App ID. In Vercel (production) set:
   `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (the .p8 contents; `\n` for newlines is fine),
   and `APNS_SANDBOX=1` only while testing with a development build.
   The `ios/` Capacitor project does not exist yet: `npx cap add ios`, then turn on the
   Push Notifications capability in Xcode.

3. **Android (FCM).** Firebase console → new project → add Android app `com.picohealth.app` →
   put `google-services.json` in `android/app/`. Project settings → Service accounts →
   generate a private key; set its JSON (one line) as `FCM_SERVICE_ACCOUNT` in Vercel.

4. **Schedule.** Add to `vercel.json` crons:
   `{ "path": "/api/cron/checkin-reminders", "schedule": "*/15 * * * *" }`
   Every 15 minutes needs a Vercel Pro plan; Hobby allows daily crons only and rejects the
   deploy otherwise. `CRON_SECRET` is already set for the existing purge job.

5. **Check.** In the phone app: Settings → Reminders → Check in after meals. Log a meal, and
   about 90 minutes later (between 8:00 and 21:30 local) the reminder arrives; tapping it opens Log.

How it behaves: `lib/push/checkin-reminder.ts` (who is due, quiet hours, once per meal),
`lib/push/send.ts` (APNs/FCM, no SDKs), `app/api/cron/checkin-reminders/route.ts`.
