# DayPlan Supabase migrations

Real Supabase CLI migration tooling, not hand-run SQL Editor scripts —
every schema change is a versioned file here, applied the same way
locally and in production.

No schema exists yet (Phase 1 only wires up the tooling). Phase 3
introduces the first real migration (`day_profiles`, `day_states`,
`settings`, `devices`).

## One-time setup (after the Supabase project exists)

```
npx supabase login
npx supabase link --project-ref <project-ref-from-dashboard-url>
```

## Workflow for every future schema change

```
npx supabase migration new <short_description>   # creates a new timestamped file here
# edit the generated .sql file
npx supabase db push                              # applies it to the linked project
```

Never edit an already-applied migration file after it's been pushed —
add a new migration instead, the same way you would with any other
migration tool. This file (and this discipline) is the whole point of
switching to the CLI: `supabase/migrations/` is always the source of
truth for what schema exists, so it can never drift out of sync with
the live database the way hand-run SQL Editor scripts can.
