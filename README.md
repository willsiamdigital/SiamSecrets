# Siam Secrets

Bangkok directory built with React + Vite on a Supabase backend (Postgres, Auth, Storage).

## What the backend does

| Feature | How it works |
| --- | --- |
| **Directory** | `listings` table; `search_listings(query, area)` RPC returns approved listings only. |
| **Accounts** | Supabase Auth, email + password. |
| **Favourites** | `favourites` table, each user can only see/modify their own rows (RLS). |
| **Listing submission** | Signed-in users upload a photo to the `listing-photos` bucket (own folder only) and submit a listing. Age must be ≥ 18 (DB constraint) and the submitter must confirm the adult/consent/photo-rights declaration. New listings are always `pending`. |
| **Moderation** | Admins (rows in `admins`) approve/reject from the in-app Admin panel and choose `featured` or `directory` tier. A trigger stops non-admins from setting status/tier themselves, and editing the name, age, area, bio or photo of a live listing sends it back to review. |
| **Spotlight auction** | Three `auction_slots`. `place_bid()` locks the slot row, checks the bidder owns an approved listing, enforces €50 start / €5 increments / whole euros / round end time, writes to the `bids` ledger and updates the leader. Clients cannot write bids directly. |
| **Reports** | Anyone (including signed-out visitors) can report a listing. Reports of a possible minor or coercion suspend the listing immediately until an admin reviews it. A listing that stops being approved releases its auction slot. |

All access control lives in Postgres row-level security, so the public anon key is safe to ship in the browser.

**Not built yet:** payment collection for winning bids, and automatic round rollover. Rounds end at `auction_slots.round_ends_at`; an admin sets a new end time and clears `current_bid_cents` to open the next round.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Install the CLI and link the project:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push            # applies supabase/migrations
   ```
3. Optional demo content: run `supabase/seed.sql` in the SQL editor. The 20 demo profiles are marked `is_demo` and use Unsplash placeholder photos. Replace them before launch.
4. Make yourself an admin: sign up in the app, then in the SQL editor run
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
5. In **Authentication → URL Configuration**, set the Site URL to your deployed domain.

### 2. Front end

```bash
cp .env.example .env.local   # fill in the project URL and anon key (Project Settings → API)
npm install
npm run dev
```

### Local Supabase (optional, needs Docker)

```bash
npx supabase start     # runs migrations + seed.sql; prints the local URL and anon key
npm run dev
```

## Tests

`supabase/tests/policies.sql` checks the RLS policies, moderation guard, auction rules and report handling against a plain Postgres, using stand-ins for Supabase's roles and `auth`/`storage` schemas:

```bash
PGHOST=localhost PGUSER=postgres npm run test:db
```

## Content rules

Only list adults (18+) who advertise voluntarily. Only use photos you own or have licensed.
