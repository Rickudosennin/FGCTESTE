const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};
const BASE = "https://www.streetfighter.com/6/buckler";
const LOCALE = "en";
const ALL_CHARACTERS_ID = 253;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Cache-Control": "no-store" } });
}
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function bucklerHeaders(accept = "application/json, text/plain, */*") {
  return {
    Accept: accept,
    "Accept-Language": "en-US,en;q=0.9",
    Referer: `${BASE}/${LOCALE}/`,
    "User-Agent": "Mozilla/5.0 (compatible; FGCHUB-SF6/1.0)",
    Cookie: ""
  };
}
async function getBuildId(cookie) {
  const headers = bucklerHeaders("text/html");
  headers.Cookie = cookie;
  const response = await fetch(`${BASE}/${LOCALE}`, { headers, redirect: "follow" });
  if (!response.ok) throw new Error(`Buckler HTTP ${response.status}`);
  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)<\\/script>/);
  const buildId = match ? JSON.parse(match[1]).buildId : "";
  if (!buildId) throw new Error("Não foi possível obter a versão atual do Buckler");
  return buildId;
}
function mapProfile(cfnId, payload) {
  const pp = payload?.pageProps || {};
  const banner = pp.fighter_banner_info || {};
  const play = pp.play || {};
  const league = banner.favorite_character_league_info || {};
  const modes = (play.base_info?.content_play_time_list || [])
    .map(x => ({ type: num(x.content_type), name: String(x.content_type_name || ""), seconds: num(x.play_time) }))
    .filter(x => x.seconds > 0)
    .sort((a,b) => b.seconds-a.seconds);
  const rates = Array.isArray(play.character_win_rates) ? play.character_win_rates : [];
  const all = rates.find(x => num(x.character_id) === ALL_CHARACTERS_ID);
  const perChar = rates.filter(x => num(x.character_id) !== ALL_CHARACTERS_ID && num(x.battle_count)>0);
  const battles = all ? num(all.battle_count) : perChar.reduce((sum,x)=>sum+num(x.battle_count),0);
  const wins = all ? num(all.win_count) : perChar.reduce((sum,x)=>sum+num(x.win_count),0);
  return {
    cfnId: String(cfnId), updatedAt: new Date().toISOString(),
    main: { id:num(banner.favorite_character_id), name:String(banner.favorite_character_name||""), toolName:String(banner.favorite_character_tool_name||"") },
    league: { points:num(league.league_point), rank:num(league.league_rank), masterRating:num(league.master_rating), masterLeague:num(league.master_league), masterRatingRanking:num(league.master_rating_ranking) },
    playTimeSeconds:modes.reduce((sum,x)=>sum+x.seconds,0), playTimeByMode:modes,
    season:{ id:num(play.current_season_id), battles, wins },
    topCharacters:perChar.sort((a,b)=>num(b.battle_count)-num(a.battle_count)).slice(0,3)
      .map(x=>({id:num(x.character_id),name:String(x.character_name||""),battles:num(x.battle_count),wins:num(x.win_count)}))
  };
}
async function loadFreshProfile(cfnId, cookie) {
  const buildId = await getBuildId(cookie);
  const headers = bucklerHeaders();
  headers.Cookie = cookie;
  const url = `${BASE}/_next/data/${buildId}/${LOCALE}/profile/${encodeURIComponent(cfnId)}/play.json`;
  const response = await fetch(url, { headers, redirect: "manual" });
  if (!response.ok) throw new Error(`Buckler perfil HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.pageProps?.common?.statusCode >= 400 || payload?.pageProps?.__N_REDIRECT) throw new Error("Buckler não autorizou a consulta deste perfil");
  return mapProfile(cfnId, payload);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/api/sf6/health" && request.method === "GET") {
      try {
        const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM sf6_players").first();
        return json({ ok:true, total:Number(row?.total||0) });
      } catch { return json({ ok:false, error:"D1 indisponível" },500); }
    }
    if (url.pathname === "/api/sf6/cfns" && request.method === "GET") {
      try {
        const { results=[] } = await env.DB.prepare("SELECT player_id AS playerId, cfn_id AS cfnId FROM sf6_players ORDER BY updated_at DESC").all();
        return json(results);
      } catch { return json({ error:"Não foi possível consultar CFNs" },500); }
    }
    if (url.pathname === "/api/sf6/cfn" && request.method === "PUT") {
      try {
        const body=await request.json();
        const playerId=String(body.playerId||"").trim(), cfnId=String(body.cfnId||"").trim();
        if (!/^\\d{1,30}$/.test(playerId)||!/^\\d{1,20}$/.test(cfnId)) return json({error:"ID do jogador ou CFN inválido"},400);
        await env.DB.prepare("INSERT INTO sf6_players (player_id,cfn_id,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(player_id) DO UPDATE SET cfn_id=excluded.cfn_id,updated_at=CURRENT_TIMESTAMP").bind(playerId,cfnId).run();
        return json({ok:true,playerId,cfnId});
      } catch { return json({error:"Não foi possível salvar CFN"},500); }
    }
    const match=url.pathname.match(/^\\/api\\/sf6\\/cfn\\/(\\d{1,30})$/);
    if (match && request.method==="GET") {
      const row=await env.DB.prepare("SELECT player_id AS playerId,cfn_id AS cfnId FROM sf6_players WHERE player_id=?").bind(match[1]).first();
      return row?json(row):json({error:"CFN não cadastrado"},404);
    }
    if (match && request.method==="DELETE") {
      await env.DB.prepare("DELETE FROM sf6_players WHERE player_id=?").bind(match[1]).run();
      return json({ok:true});
    }

    const profileMatch=url.pathname.match(/^\\/api\\/sf6\\/profile\\/(\\d{1,30})$/);
    if (profileMatch && request.method==="GET") {
      try {
        if (!env.BUCKLER_COOKIE) return json({error:"Consulta SF6 não configurada"},503);
        const row=await env.DB.prepare("SELECT cfn_id AS cfnId, profile_json AS profileJson FROM sf6_players WHERE player_id=?").bind(profileMatch[1]).first();
        if (!row) return json({error:"CFN não cadastrado"},404);
        const fresh=await loadFreshProfile(String(row.cfnId),env.BUCKLER_COOKIE);
        await env.DB.prepare("UPDATE sf6_players SET profile_json=?,stats_updated_at=CURRENT_TIMESTAMP WHERE player_id=?").bind(JSON.stringify(fresh),profileMatch[1]).run();
        return json(fresh);
      } catch (error) {
        console.error("SF6 profile:",error);
        return json({error:String(error.message||"Falha ao consultar Buckler")},502);
      }
    }
    return json({error:"Rota não encontrada"},404);
  }
};
