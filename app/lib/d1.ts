import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
}

// This function will be used to get the D1 database instance.
// In a Cloudflare Workers environment, env.DB is automatically populated.
// For local development, you might need to set up `wrangler dev` with a local D1 binding.
export function getDB(env: Env | { binding: D1Database }): D1Database {
  if ('DB' in env) {
    return env.DB;
  }
  // This case is for when the binding is passed directly, useful for some testing or alternative setups.
  if ('binding' in env && env.binding) {
    return env.binding;
  }
  throw new Error('D1 Database binding (DB) not found in environment.');
}

// Example of how you might execute a query (can be expanded later)
// For now, the main goal is to set up the getDB function.
// We will add specific query functions as needed or call `prepare` and `run`/`all`/`first` directly.
/*
export async function exampleQuery(db: D1Database) {
  const { results } = await db.prepare("SELECT * FROM user").all();
  return results;
}
*/
