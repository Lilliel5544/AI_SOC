import { env } from "cloudflare:workers";
import seed from "../../../seed.json";
export const dynamic = "force-dynamic";
const statuses = new Set(["new", "investigating", "resolved", "false_positive"]);
type RecordData = Record<string, unknown>;
function database() { if (!env.DB) throw new Error("Database unavailable"); return env.DB; }
function validLog(v: unknown): v is RecordData { return !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as RecordData).record_id === "string" && typeof (v as RecordData).event_time === "string" && typeof (v as RecordData).signature === "string"; }
async function seedIfEmpty() {
  const db = database();
  const count = await db.prepare("SELECT COUNT(*) AS n FROM alerts").first<{n:number}>();
  if (count?.n) return;
  await db.batch(seed.map((item, i) => db.prepare("INSERT OR IGNORE INTO alerts (id, raw, workflow_status, note, created_at) VALUES (?, ?, 'new', '', ?)").bind(item.record_id, JSON.stringify(item), Date.now() + i)));
}
export async function GET() {
  try {
    await seedIfEmpty();
    const result = await database().prepare("SELECT id, raw, workflow_status, note, created_at FROM alerts ORDER BY created_at DESC").all();
    return Response.json({alerts: result.results.map((row) => ({...JSON.parse(String(row.raw)), workflow_status: row.workflow_status, analyst_note: row.note}))});
  } catch (error) { console.error(error); return Response.json({error:"Không thể tải dữ liệu cảnh báo."},{status:500}); }
}
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 2_000_000) return Response.json({error:"Tệp vượt quá 2 MB."},{status:413});
    const body = await request.json(); const input = Array.isArray(body) ? body : [body];
    if (!input.length || input.length > 500 || input.some(v => !validLog(v))) return Response.json({error:"JSON phải chứa log có record_id, event_time và signature; tối đa 500 bản ghi."},{status:400});
    const db = database();
    const results = await db.batch(input.map((log, i) => db.prepare("INSERT OR IGNORE INTO alerts (id, raw, workflow_status, note, created_at) VALUES (?, ?, 'new', '', ?)").bind(log.record_id, JSON.stringify(log), Date.now() + i)));
    return Response.json({added:results.reduce((n, x) => n + Number(x.meta?.changes || 0), 0)});
  } catch (error) { console.error(error); return Response.json({error:"Không thể nhập JSON. Hãy kiểm tra định dạng tệp."},{status:400}); }
}
export async function PATCH(request: Request) {
  try {
    const {id, status, note} = await request.json() as {id:unknown;status:unknown;note:unknown};
    if (typeof id !== "string" || typeof status !== "string" || !statuses.has(status) || typeof note !== "string" || note.length > 4000) return Response.json({error:"Dữ liệu cập nhật không hợp lệ."},{status:400});
    const result = await database().prepare("UPDATE alerts SET workflow_status = ?, note = ? WHERE id = ?").bind(status, note, id).run();
    if (!result.meta.changes) return Response.json({error:"Không tìm thấy log."},{status:404});
    return Response.json({ok:true});
  } catch (error) { console.error(error); return Response.json({error:"Không thể lưu thay đổi."},{status:500}); }
}
