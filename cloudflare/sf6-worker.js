const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/api/sf6/health" && request.method === "GET") {
      try {
        const result = await env.DB.prepare("SELECT COUNT(*) AS total FROM sf6_players").first();
        return json({ ok: true, total: Number(result?.total || 0) });
      } catch (error) {
        return json({ ok: false, error: "D1 indisponível" }, 500);
      }
    }

    if (url.pathname === "/api/sf6/cfns" && request.method === "GET") {
      try {
        const { results = [] } = await env.DB.prepare(
          "SELECT player_id AS playerId, cfn_id AS cfnId FROM sf6_players ORDER BY updated_at DESC"
        ).all();
        return json(results);
      } catch (error) {
        return json({ error: "Não foi possível consultar CFNs" }, 500);
      }
    }

    if (url.pathname === "/api/sf6/cfn" && request.method === "PUT") {
      try {
        const body = await request.json();
        const playerId = String(body.playerId || "").trim();
        const cfnId = String(body.cfnId || "").trim();
        if (!/^\d{1,30}$/.test(playerId) || !/^\d{1,20}$/.test(cfnId)) {
          return json({ error: "ID do jogador ou CFN inválido" }, 400);
        }
        await env.DB.prepare(
          "INSERT INTO sf6_players (player_id, cfn_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(player_id) DO UPDATE SET cfn_id = excluded.cfn_id, updated_at = CURRENT_TIMESTAMP"
        ).bind(playerId, cfnId).run();
        return json({ ok: true, playerId, cfnId });
      } catch (error) {
        return json({ error: "Não foi possível salvar CFN" }, 500);
      }
    }

    const match = url.pathname.match(/^\/api\/sf6\/cfn\/(\d{1,30})$/);
    if (match && request.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT player_id AS playerId, cfn_id AS cfnId FROM sf6_players WHERE player_id = ?"
      ).bind(match[1]).first();
      return row ? json(row) : json({ error: "CFN não cadastrado" }, 404);
    }
    if (match && request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM sf6_players WHERE player_id = ?").bind(match[1]).run();
      return json({ ok: true });
    }
    return json({ error: "Rota não encontrada" }, 404);
  }
};
