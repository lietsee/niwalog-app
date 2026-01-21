/**
 * Database schema helper
 * Allows switching between 'public' and 'niwalog' schemas via environment variable
 */

const DB_SCHEMA = import.meta.env.VITE_DB_SCHEMA || 'public'

/**
 * Returns the database options for Supabase client
 * When using 'public' schema, returns empty object (default behavior)
 * When using custom schema (e.g., 'niwalog'), returns schema configuration
 */
export function getDbOptions(): { db?: { schema: string } } {
  return DB_SCHEMA === 'public' ? {} : { db: { schema: DB_SCHEMA } }
}

/**
 * Returns the current schema name for debugging/logging
 */
export function getSchemaName(): string {
  return DB_SCHEMA
}
