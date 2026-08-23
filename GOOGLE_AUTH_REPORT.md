# Google Sign-In — Decision Prompt / הנחיה להחלטה

**Purpose:** a self-contained prompt (in English) you can paste into another
model to get an independent recommendation on whether kay.ai should add
"Sign in with Google" — followed by an analysis in Hebrew, for you.

Everything here was verified against the codebase on 2026-08-18 (branch `main`).
No secrets are included.

**How to read this file:**
- **English section** — for pasting into another model. Copy only what sits
  between the `COPY FROM HERE` / `COPY TO HERE` markers.
- **Hebrew section (`ניתוח הארכיטקטורה`)** — for you. Do not paste it anywhere;
  it contains my own reading and would bias whoever reviews the prompt.

---

## Verified architecture facts (the basis for the prompt)

| Area | Current state | Source |
|---|---|---|
| User store | **No users collection.** Logins are a JSON map in the `ALLOWED_USERS` env var: `{"username":"password"}` | `backend/src/routes/auth.ts:38` |
| Password check | Plaintext compare via `timingSafeEqual`, 10 attempts / 15 min per IP | `backend/src/routes/auth.ts:19,51` |
| Accounts today | Two: the consultant (production data) and a developer account kept empty for isolation tests | `ALLOWED_USERS` |
| Token | HS256 JWT, payload `{username}`, 30-day expiry | `backend/src/routes/auth.ts:55` |
| Tenant key | `req.user.id` **is the username string**; every query is scoped by `userId` | `backend/src/middleware/authMiddleware.ts:90` |
| Revalidation | Every request re-checks the user still exists in `ALLOWED_USERS`; deleting a line revokes access instantly | `backend/src/middleware/authMiddleware.ts:29-40` |
| Second identity key | `UserSettings` (custom knowledge rules) is keyed by `username` with a unique index — a separate key from `userId` | `backend/src/models/UserSettings.ts:19` |
| Guests | `guest_<uuid>` docs in Mongo, 24 h TTL, resumed by a localStorage `deviceId`, max 3 active per IP, quota-capped | `backend/src/routes/guestAuth.ts`, `backend/src/constants/guest.ts` |
| File storage | R2 keys are `uploads/<clientId>/<uuid>.<ext>` — **not** scoped by user | `backend/src/controllers/uploadController.ts:68` |
| Client session | `user_token` / `username` / `is_guest` in localStorage; a 401 fires `auth:logout` | `client/src/auth/AuthContext.tsx` |
| Migration precedent | `npm run migrate:user-ids` already backfilled `userId` on legacy records once | `backend/src/scripts/migrateUserIds.ts` |
| Email capability | **None.** No nodemailer/Resend/SendGrid dependency — magic links or email OTP would require adopting a new vendor | `backend/package.json` |
| Auth libraries | **None** on either side. Only `jsonwebtoken` + `express-rate-limit` | `backend/package.json`, `client/package.json` |
| Domains | Default platform hostnames (`*.workers.dev`, `*.up.railway.app`) — no custom domain | `client/wrangler.toml` |
| CORS | `origin: true` — reflects any origin. Not directly exploitable (Bearer tokens, not cookies), but worth noting | `backend/src/app.ts:23` |

**The load-bearing consequence:** the tenant key is a human username, so identity
and data-ownership are the same string. Any new login method must either produce
that same string or introduce a mapping layer — otherwise existing client
records, documents, and knowledge rules become unreachable.

---

## English prompt

> ───────────────── COPY FROM HERE ─────────────────

You are a senior architect reviewing **kay.ai**, a production AI assistant for a
mortgage consultant in Israel. It stores highly confidential financial data: ID
cards, paystubs, bank statements, and extracted salary figures. It is live, in
daily use, and maintained by one developer.

You are **skeptical of added infrastructure**. Do not recommend something because
it is industry best practice; recommend it only if it solves a problem this
system actually has. "Keep what you have" is a legitimate and often correct
answer here.

### The question

The immediate question is: **should kay.ai implement "Sign in with Google"?**

But answer the real question behind it: **what is the right identity strategy for
this system over the next 12 months?** Google sign-in is one option in a space
that includes at least:

- **A.** Keep the current env-var user map unchanged.
- **B.** Keep the env map but hash the passwords (bcrypt/argon2), no other change.
- **C.** Introduce a real users collection with hashed passwords and a signup flow.
- **D.** Google OAuth (either alongside the current login, or replacing it).
- **E.** A managed identity vendor (Auth0, Clerk, Supabase Auth, Firebase Auth).
- **F.** Passkeys / WebAuthn.
- **G.** Email magic links or OTP — **note:** the project has no email provider
  today, so this means adopting a new vendor and a new failure mode.

Evaluate Google against the realistic alternatives, then give a single
recommendation. If the answer is "A — change nothing", say that plainly.

### The decisive unknown — read this carefully

The single fact that most determines the answer is **not** stated below, because
it has not been decided: **whether the user population stays at two known people
or grows toward self-serve signup by other advisors.**

Do not ask for clarification and do not refuse to answer. Instead:

1. State which scenario you are assuming and why you find it more likely, given
   everything else described here.
2. Answer that scenario in full.
3. Give the other scenario in no more than five lines — what changes, and what
   the earliest observable signal would be that it has become the real one.

### Current authentication architecture

- **There is no users collection.** Valid logins are a JSON map held in an
  environment variable, `ALLOWED_USERS={"username":"password"}`. The login route
  parses it per request and compares the password with a constant-time compare.
  Passwords are stored in plaintext in that env var.
- **There are two accounts today:** the consultant, who owns all production data,
  and a developer account deliberately kept empty for isolation testing.
- On success the backend signs an HS256 JWT with payload `{username}` and a
  30-day expiry. Login is rate-limited to 10 attempts per 15 minutes per IP.
- **The tenant key is the username string itself.** Auth middleware sets
  `req.user.id = username`, and every Mongoose query is scoped by
  `userId: req.user.id`. The usernames are Hebrew display names.
- Auth middleware re-validates on **every** request that the username is still
  present in `ALLOWED_USERS`, so removing a line revokes access immediately —
  there is no session store or token blacklist.
- A **second identity key** exists: the `UserSettings` collection (per-user
  custom knowledge rules for the LLM prompt) is keyed by `username` with a unique
  index, separate from the `userId` used on client records.
- **Guest mode** is a separate public flow: `POST /api/auth/guest` creates a
  `guest_<uuid>` document in MongoDB with a 24-hour TTL, resumed across sign-outs
  by a `deviceId` kept in localStorage, capped at 3 active guests per IP, with
  hard quotas on chat messages, uploads, and clients. It clones a system-owned
  demo client so guests never see real data. This is the product's demo funnel.
- **File storage is not user-scoped:** R2 object keys are
  `uploads/<clientId>/<uuid>.<ext>`, so changing the tenant key would not require
  moving any binaries.
- The frontend keeps the token, username, and a guest flag in localStorage; any
  401 dispatches a global logout event.
- A one-time migration script already exists and has been run once to backfill
  `userId` onto legacy records.
- **There is no email capability in the stack** — no nodemailer, Resend, or
  SendGrid dependency. Anything requiring email delivery (verification, magic
  links, OTP, password reset) means adopting a new vendor.
- **There are no auth libraries** on either side — only `jsonwebtoken` and
  `express-rate-limit` on the backend, and nothing auth-related on the client.
- The app runs on **default platform hostnames** (`*.workers.dev`,
  `*.up.railway.app`); there is no custom domain, which affects how an OAuth
  consent screen and redirect URIs would be presented to a user.
- CORS is configured as `origin: true` (reflects any origin). Tokens are Bearer
  headers rather than cookies, so this is not directly exploitable, but note it.

### Constraints

- Stack: Node/TypeScript + Express, MongoDB Atlas via Mongoose, React/Vite +
  Tailwind + shadcn/ui. Backend on Railway, client on Cloudflare.
- Project rules: keep it simple (YAGNI), no file over 150 lines, all user-facing
  text in Hebrew and all code identifiers in English, no hardcoded secrets.
- The team is one developer. Every dependency and moving part has a real cost.
- Guest mode must keep working exactly as it does today.

### Questions you must resolve

1. **The trade-offs — say which one actually dominates, don't just list them:**
   - Plaintext passwords in an env var, in an app holding scanned ID cards and
     bank statements — versus the fact that only two known people can log in at
     all, behind a 10-per-15-minutes rate limit.
   - Operational cost of the env map (a redeploy to add or remove a user) versus
     the standing cost of running a real identity system.
   - Whether ending password custody is worth the added OAuth surface and vendor
     dependency.
   - Onboarding friction for a non-technical consultant who currently types a
     username and password.
2. **What the current design would lose.** Removing a line from `ALLOWED_USERS`
   revokes access on the very next request, with no session store and no token
   blacklist. Any users-collection design has to re-earn that property. Say how,
   and what it costs.
3. **Guest mode.** Should a guest be able to convert into a real account and keep
   the data they created during the 24-hour window? Answer yes or no and say what
   it implies. If your recommendation changes guest mode's behaviour in any way,
   flag it loudly — that flow is the product's demo funnel and is expected to
   keep working exactly as it does today.
4. **The tenant-key migration**, if you recommend anything that introduces a new
   identity. Existing `userId` values are Hebrew usernames; Google returns an
   opaque `sub` and an email. Decide explicitly: switch the tenant key, or keep
   it stable and add an identity→`userId` mapping? What happens to
   `UserSettings`, which is keyed by `username` rather than `userId`? How do you
   avoid orphaning production records — and how do you verify, before cutover,
   that nothing was orphaned?
5. **The cost of doing nothing.** Describe the most realistic way the current
   design actually hurts this project in the next 12 months. If that scenario is
   weak, say so — that is evidence for "change nothing".
6. **The failure modes of your own recommendation.** What breaks if Google is
   down, if the consultant's Google account is lost or suspended, or if the
   single developer is unavailable when it breaks?

### Required output format

Answer in exactly this structure. Keep the whole response under 800 words —
density over completeness.

```
## Verdict
<One of: change nothing / hash passwords only / Google OAuth now / Google OAuth when <trigger> / other>
<Two sentences of justification. No hedging.>

## Assumed scenario
<Which population scenario you assumed, and why.>

## Why not the alternatives
<One line each for the options you rejected, with the reason.>

## What this costs
<Effort in developer-days, new dependencies, new failure modes.>

## Migration plan
<Only if your verdict introduces a new identity. Numbered phases. Otherwise: "N/A".>

## What I would watch for
<The observable signal that should make you revisit this decision.>
```

Be concrete and opinionated. Do not write "it depends" without resolving the
dependency yourself. Do not recommend a phased rollout of something you would
not build at all. If you need a fact that is not stated above, name it as an
explicit assumption rather than asking for it.

> ───────────────── COPY TO HERE ─────────────────

---

## ניתוח הארכיטקטורה — בעברית

> החלק הזה מיועד לך בלבד. הוא אינו חלק מההנחיה ואין להדביק אותו למודל אחר.

### הבהרה לפני הכול

את הארכיטקטורה הזאת לא "תכננתי מאפס" — היא נבנתה בשלבים לאורך העבודה על
הפרויקט, לפי החלטות שהתקבלו בדרך. מה שכתוב כאן הוא **שחזור של ההיגיון מתוך הקוד
עצמו ומההערות שבו**. במקומות שבהם ההערה בקוד מצהירה על הכוונה במפורש — ציינתי
את המקור. במקומות שמדובר בהסקה שלי — כתבתי זאת במפורש.

---

### 1. תמונת המצב בשורה אחת

המערכת בנויה סביב עיקרון אחד: **מחרוזת אחת — שם המשתמש — היא גם הזהות וגם מפתח
הבעלות על המידע.** כל שאר המבנה נגזר מזה.

```
התחברות → JWT עם {username} → req.user.id = username → כל שאילתה: { userId: req.user.id }
```

---

### 2. ההיגיון מאחורי כל החלטה

#### א. למה אין אוסף משתמשים ב‑MongoDB

בפרויקט יש היום **שני חשבונות**: היועץ (כל מידע הייצור) וחשבון מפתח שנשמר ריק
בכוונה, כדי לבדוק שהבידוד בין הדיירים באמת עובד.

עבור שני משתמשים ידועים, אוסף משתמשים הוא מנגנון שדורש תחזוקה — סכימה, ניהול
סיסמאות, איפוס סיסמה, מסך ניהול — ואינו נותן שום יכולת שלא קיימת כבר. מפת
`ALLOWED_USERS` היא היישום המינימלי שעונה על הדרישה, וזה עקבי עם כלל ה‑YAGNI
שמופיע ב‑CLAUDE.md של הפרויקט.

**המחיר המודע:** הוספה או הסרה של משתמש מחייבת שינוי משתנה סביבה ופריסה מחדש.
כל עוד זה קורה פעם בכמה חודשים — זה זול יותר מתחזוקת מערכת זהויות.

#### ב. למה שם המשתמש הוא מפתח הדיירוּת (tenant key)

`authMiddleware.ts:90` מציב `req.user = { id: username, ... }`, וכל שאילתה
מסננת לפי `userId`. היתרון: אין שכבת תרגום בין "מי אני" ל"מה שלי", ולכן אי‑אפשר
לטעות בה. רואים את זה היטב בקוד — למשל
`ClientModel.findOne({ id: clientId, userId: req.user?.id ?? "" })`: הסינון לפי
דייר הוא חלק מהשאילתה עצמה, ולא בדיקה נפרדת שאפשר לשכוח.

ההערה ב‑`clients.ts:13` אף מסבירה למה יש `?? ""` — ערך ברירת מחדל שלעולם לא יכול
להתאים לרשומה אמיתית, כדי שגם באג לא יחזיר מידע של מישהו אחר.

**זו ההחלטה החזקה ביותר בתכנון, וגם הכובלת ביותר** — ראה סעיף 4.

#### ג. למה יש אימות מחדש בכל בקשה

`authMiddleware.ts:29-40` בודק בכל בקשה שהמשתמש עדיין קיים — משתמש רגיל מול
`ALLOWED_USERS`, ואורח מול MongoDB (כולל בדיקה שהחשבון לא פג).

חתימה תקינה של JWT אומרת רק "הטוקן הזה הונפק על ידינו", ולא "המשתמש עדיין
מורשה". בלי הבדיקה הזאת, טוקן בן 30 יום היה נשאר תקף גם אחרי הסרת המשתמש.

**התוצאה:** מחיקת שורה ממשתנה הסביבה שוללת גישה כבר בבקשה הבאה, בלי מאגר
sessions ובלי רשימת טוקנים חסומים. זו תכונה שמערכות גדולות משקיעות בה מאמץ —
וכאן היא מתקבלת כמעט בחינם, בזכות זה שרשימת המשתמשים קטנה ונטענת מחדש בכל בקשה.

#### ד. למה מצב אורח יושב ב‑MongoDB ולא רק ב‑JWT

זו הנקודה שבה כבר שולם מחיר אמיתי בבאג, ולכן כדאי להבין אותה: אילו מכסת האורח
הייתה נשמרת בטוקן או ב‑localStorage, כל התנתקות והתחברות מחדש הייתה מאפסת אותה.
בדיוק זה קרה, ותוקן.

הפתרון הנוכחי, כפי שההערה ב‑`guestAuth.ts:57-60` מנסחת: `deviceId` יציב שנשמר
ב‑localStorage מזהה את הדפדפן ו**משחזר** את החשבון הקיים — אותו מידע, אותו זמן
שנותר, ואותם מוני שימוש.

ומכיוון שאת `deviceId` אפשר פשוט למחוק מהדפדפן, יש שכבה שנייה: תקרה של **3
אורחים פעילים לכל כתובת IP** (`constants/guest.ts:27`). ההערה שם מנסחת את
ההיגיון — מכיוון שחשבון חי 24 שעות, זו למעשה גם התקרה היומית של מכסות חדשות לכל IP.

זו הגנה בשתי שכבות: `deviceId` מטפל במשתמש התמים שמתנתק, וה‑IP מטפל במי שמנסה
לעקוף בכוונה.

#### ה. למה תוקף הטוקן של האורח מחושב ולא קבוע

`guestAuth.ts:50-53` חותם טוקן שתוקפו הוא בדיוק הזמן שנותר לחשבון, ולא 24 שעות
קבועות. ההערה מצהירה על הכוונה: כך התחברות מחדש לחשבון קיים אינה מאריכה את חייו.
בלי זה, אפשר היה להאריך חשבון אורח לנצח על ידי התחברות מחדש כל 23 שעות.

#### ו. למה מפתחות הקבצים ב‑R2 הם לפי `clientId` ולא לפי משתמש

`uploadController.ts:68` בונה `uploads/<clientId>/<uuid>.<ext>`. הבעלות נאכפת
בשכבת ה‑DB — כדי להגיע למסמך צריך קודם למצוא את הלקוח, והשאילתה מסוננת לפי
`userId` — ולכן אין צורך לשכפל את מפתח הדיירוּת גם בנתיב הקובץ.

**התוצאה המעשית:** אם מפתח הדיירוּת ישתנה מתישהו — אף קובץ בינארי לא יצטרך לזוז.
זה מקטין דרמטית את הסיכון של מיגרציה עתידית. (זו הסקה שלי מהמבנה, לא הערה בקוד.)

#### ז. למה קבצי הדמו מוגנים ממחיקה

`storageService.ts:53-55` — `safeDeleteObject` מסרב למחוק כל מפתח שמתחיל
ב‑`samples/`. הסיבה: חשבון אורח מקבל **העתק ברמת הרשומה בלבד** של לקוח הדמו,
כשכל המסמכים עדיין מצביעים על אותם קבצים משותפים. בלי ההגנה הזאת, אורח אחד
שמוחק מסמך היה הורס את הדמו לכל האורחים הבאים.

---

### 3. איפה התכנון הזה חזק

1. **הבידוד בין הדיירים נאכף בשאילתה עצמה**, ולא בבדיקה נפרדת. קשה לשכוח אותו.
2. **שלילת גישה מיידית**, בלי תשתית של sessions.
3. **מצב אורח לא נוגע במידע אמיתי** — הוא משכפל תבנית בבעלות `system`.
4. **אין מסלול לדליפת סודות**: הסיסמאות והמפתחות אינם בקוד, והקבצים ב‑R2 פרטיים.
5. **שטח תלויות קטן** — אין ספריית auth חיצונית שצריך לתחזק ולעדכן.

---

### 4. איפה התכנון שברירי — החוב הטכני האמיתי

1. **סיסמאות בטקסט גלוי במשתנה סביבה.** זו הנקודה הכי לא נוחה, במיוחד באפליקציה
   שמחזיקה סריקות של תעודות זהות ודפי בנק. מה שמרסן את הסיכון הוא ששני אנשים
   ידועים בלבד יכולים בכלל להתחבר, ושיש הגבלת קצב על ההתחברות. זה מספיק היום;
   זה לא ישרוד גידול.
2. **שני מפתחות זהות במקום אחד.** רשומות הלקוחות ממופתחות לפי `userId`, אבל
   `UserSettings` ממופתח לפי `username` עם אינדקס ייחודי
   (`models/UserSettings.ts:19`). כרגע שתי המחרוזות זהות ולכן זה עובד — אבל
   **כל שינוי עתידי בזהות חייב לטפל בשתיהן**, אחרת כללי הידע המותאמים של היועץ
   יתנתקו ממנו בשקט.
3. **מפתח הדיירוּת הוא שם תצוגה בעברית.** נוח לקריאה, אבל המשמעות היא שהזהות
   אינה מזהה יציב ואטום. כל מעבר לספק זהות חיצוני נתקל בזה ראשון.
4. **JWT ל‑30 יום ב‑localStorage.** ארוך, אבל מרוסן על ידי האימות מחדש בכל בקשה —
   הטוקן שווה בדיוק כמו הרשומה שמאחוריו.

---

### 5. מה כל זה אומר לגבי התחברות עם Google — הקריאה שלי

**השאלה המכריעה אינה טכנית, והקוד אינו יכול לענות עליה: האם מספר המשתמשים יישאר שניים?**

- **אם כן** — מפת הסביבה באמת מספיקה, וההמלצה שלי היא לא לממש עכשיו. שים לב
  שהתחברות עם Google דווקא **תיקח ממך** את התכונה הטובה ביותר שיש לך היום:
  שלילת גישה מיידית באמצעות מחיקת שורה. במקומה יידרשו אוסף משתמשים, מסך ניהול
  הרשאות, ולוגיקה של השבתת חשבון.
- **אם התוכנית היא יועצים נוספים, ובמיוחד הרשמה עצמית** — מפת הסביבה מפסיקה
  לעבוד ביום שבו אי‑אפשר לבצע פריסה מחדש עבור כל משתמש חדש. בנקודה הזאת Google
  היא התשובה הנכונה והזולה ביותר, בעיקר מסיבה אחת: **היא מוציאה אותך לחלוטין
  מעסק החזקת הסיסמאות**, באפליקציה שמלאה בתעודות זהות סרוקות.

**העלות האמיתית אינה זרימת ה‑OAuth** — היא כיום עבודה של יום בערך. העלות היא
שחייב להיווצר אוסף משתמשים, ושמפתח הדיירוּת הנוכחי הוא שם בעברית שמשמש גם כזהות.

**ההמלצה המעשית שלי למי שיממש:** להשאיר את `userId` יציב לנצח, ולמפות אליו
זהויות Google (`googleSub → userId`), במקום להחליף את מפתח הדיירוּת פעם שנייה.
כבר בוצעה מיגרציה אחת של `userId` (`migrateUserIds.ts`) — מיגרציה שנייה על מידע
ייצור אמיתי היא סיכון שאין סיבה לקחת, במיוחד כשהקבצים ב‑R2 ממילא אינם תלויים בו.
