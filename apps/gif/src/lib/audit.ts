import "server-only";
import type { Db } from "./db";
import { q } from "./db";

export async function audit(actor: string, action: string, entity: string, entityId: string | null, data: Record<string, unknown> = {}, ip: string | null = null, db?: Db) {
  const sql = "insert into gif.audit_log (actor, action, entity, entity_id, data, ip) values ($1, $2, $3, $4, $5, $6)";
  const params = [actor, action, entity, entityId, JSON.stringify(data), ip];
  if (db) await db.query(sql, params); else await q(sql, params);
}
