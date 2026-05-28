# INC-DB-001 — Silent Schema Mismatch: 32 Products Invisible for 12 Hours

> **Date:** 2026 | **Severity:** 🔴 Critical | **Duration:** 12 hours invisible products
> **Category:** Data Integrity

---

## What Happened

A seed script was written to populate a product catalog. The script used a literal object `{ is_active: true }` as a field. The actual database column was named `active` (no `is_` prefix).

PostgREST (Supabase's REST layer) silently ignores unknown columns — it does not throw an error, it simply writes the known fields and discards the unknown ones. The result: 32 products were inserted with `active = null` (default false), making them invisible to the public storefront.

The bug was not discovered for 12 hours — until the client called to say their entire catalog was empty.

## Root Cause

Three contributing factors:

1. **No schema validation at write time** — the script used a plain object literal instead of a typed schema
2. **PostgREST silent discard** — unknown fields are silently ignored (no error, no warning)
3. **No smoke test after seed** — there was no verification step that confirmed rows were actually visible via the anon key

## Rules Created

**R-DB-001 Schema-First:** Every Supabase write must use a typed schema or Zod object. No plain `{ field: value }` literals.

```typescript
// BAD
await supabase.from("products").insert({ is_active: true, name: "Widget" })

// GOOD — using generated types
import type { Database } from "@/types/supabase"
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"]
const product: ProductInsert = { active: true, name: "Widget" }
await supabase.from("products").insert(product)
```

**R-DB-002 Smoke ANON After Write:** Every seed or migration must end with a `SELECT count(*)` using the ANON key, asserting ≥ expected rows are visible.

```typescript
// At end of every seed script
const { count } = await supabaseAnon
  .from("products")
  .select("*", { count: "exact", head: true })
  .eq("active", true)

if (!count || count < expectedMinimum) {
  throw new Error(`Smoke failed: expected ≥${expectedMinimum} active products, got ${count}`)
}
console.log(`✅ Smoke: ${count} active products visible via anon key`)
```

**R-DB-003 RLS Anon Explicit:** Any migration for a table used by a public-facing interface must include an explicit `CREATE POLICY ... TO anon, authenticated USING (active = true)`.

## Result

Zero silent-discard incidents since typed schemas + smoke tests became mandatory. The smoke test catches both schema mismatches and RLS policy gaps in the same check.

---

*This rule is encoded in: `AGENTS.md §R8`, `docs/governance/DB_DISCIPLINE.md`*
