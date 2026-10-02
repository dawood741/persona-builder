/**
 * Persona storage API — a Vercel Function backed by Neon Postgres.
 *
 *   GET    /api/personas            list saved personas (newest first)
 *   GET    /api/personas?id=<uuid>  one persona, with its form values
 *   POST   /api/personas            create   { values, persona }
 *   PUT    /api/personas?id=<uuid>  update   { values, persona }
 *   DELETE /api/personas?id=<uuid>  delete
 *
 * The API is open to anyone who can reach the site. To restrict access, turn on
 * Vercel Deployment Protection for the project.
 *
 * Environment: DATABASE_URL (added by the Neon integration).
 */
import { neon } from '@neondatabase/serverless';

const MAX_BODY_BYTES = 256 * 1024;
const LIST_LIMIT = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let sql = null;
let tableReady = null;

function db() {
  if (!process.env.DATABASE_URL) throw new HttpError(503, 'The database is not configured.');
  sql ??= neon(process.env.DATABASE_URL);
  return sql;
}

/** Creates the table on first use; a failed attempt is retried on the next request. */
function ensureTable() {
  tableReady ??= (async () => {
    const q = db();
    await q`CREATE TABLE IF NOT EXISTS personas (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title         text NOT NULL,
      customer_name text,
      difficulty    text,
      form_values   jsonb NOT NULL,
      persona       jsonb,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    )`;
    await q`CREATE INDEX IF NOT EXISTS personas_updated_at_idx ON personas (updated_at DESC)`;
  })().catch(error => { tableReady = null; throw error; });
  return tableReady;
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function idFrom(request, required) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    if (required) throw new HttpError(400, 'A persona id is required.');
    return null;
  }
  if (!UUID.test(id)) throw new HttpError(400, 'That persona id is not valid.');
  return id;
}

const text = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

async function readPersona(request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new HttpError(413, 'This persona is too large to save.');
  let body;
  try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'The request body must be JSON.'); }
  if (!isObject(body) || !isObject(body.values)) throw new HttpError(400, 'The request must include the form values.');
  if (body.persona !== undefined && body.persona !== null && !isObject(body.persona)) {
    throw new HttpError(400, 'The persona must be an object.');
  }
  const values = body.values;
  return {
    title: text(values.title, 200) || 'Untitled persona',
    customerName: text(values.name, 200),
    difficulty: text(values.difficulty, 40),
    values: JSON.stringify(values),
    persona: body.persona ? JSON.stringify(body.persona) : null,
  };
}

function handle(work) {
  return async request => {
    try {
      await ensureTable();
      return await work(request, db());
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message });
      console.error('personas api error', error);
      return json(500, { error: 'Something went wrong while talking to the database.' });
    }
  };
}

export const GET = handle(async (request, q) => {
  const id = idFrom(request, false);
  if (!id) {
    const rows = await q`
      SELECT id, title, customer_name, difficulty, created_at, updated_at
      FROM personas ORDER BY updated_at DESC LIMIT ${LIST_LIMIT}`;
    return json(200, { personas: rows });
  }
  const [row] = await q`
    SELECT id, title, customer_name, difficulty, form_values, persona, created_at, updated_at
    FROM personas WHERE id = ${id}`;
  if (!row) throw new HttpError(404, 'That persona no longer exists.');
  return json(200, { persona: row });
});

export const POST = handle(async (request, q) => {
  const p = await readPersona(request);
  const [row] = await q`
    INSERT INTO personas (title, customer_name, difficulty, form_values, persona)
    VALUES (${p.title}, ${p.customerName}, ${p.difficulty}, ${p.values}::jsonb, ${p.persona}::jsonb)
    RETURNING id, title, customer_name, difficulty, created_at, updated_at`;
  return json(201, { persona: row });
});

export const PUT = handle(async (request, q) => {
  const id = idFrom(request, true);
  const p = await readPersona(request);
  const [row] = await q`
    UPDATE personas
    SET title = ${p.title}, customer_name = ${p.customerName}, difficulty = ${p.difficulty},
        form_values = ${p.values}::jsonb, persona = ${p.persona}::jsonb, updated_at = now()
    WHERE id = ${id}
    RETURNING id, title, customer_name, difficulty, created_at, updated_at`;
  if (!row) throw new HttpError(404, 'That persona no longer exists.');
  return json(200, { persona: row });
});

export const DELETE = handle(async (request, q) => {
  const id = idFrom(request, true);
  const rows = await q`DELETE FROM personas WHERE id = ${id} RETURNING id`;
  if (!rows.length) throw new HttpError(404, 'That persona no longer exists.');
  return json(200, { deleted: id });
});
