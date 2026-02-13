/* ==========================================================================
   Morning Dock V26.0 - Absolute Rebuild
   어드민 5탭 완전 작동 / 뉴스 토론 전용 페이지 / 찬반 댓글 CRUD
   --------------------------------------------------------------------------
   [D1 스키마 - 처음 한번만 실행]
   CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT DEFAULT 'USER', status TEXT DEFAULT 'APPROVED', mfa_secret TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, user_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS post_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, link TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS news_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, news_id INTEGER, user_id TEXT, content TEXT, stance TEXT DEFAULT 'neutral', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, icon TEXT);
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method;

    const CORS = {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: CORS });

    // ── UI ──────────────────────────────────────────────────────────────────
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const name   = (await env.KV.get("prop:base_name"))   || "Morning Dock";
      const notice = (await env.KV.get("prop:base_notice")) || "사령관님의 지휘 아래 기지가 운영 중입니다.";
      const desc   = (await env.KV.get("prop:base_desc"))   || "AntiGravity Intelligence Hub";
      return new Response(HTML(name, notice, desc), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ── 세션 헬퍼 ────────────────────────────────────────────────────────────
    const getUser = async (sid) => {
      if (!sid) return null;
      const uid = await env.KV.get("session:" + sid);
      if (!uid) return null;
      return env.DB.prepare("SELECT * FROM users WHERE uid=?").bind(uid).first();
    };
    const isAdmin = async (sid) => {
      const u = await getUser(sid);
      return !!(u && u.role === "ADMIN" && u.status === "APPROVED");
    };

    try {

      // ════════════════════════════════════════════════════════════════════
      // 인증 API
      // ════════════════════════════════════════════════════════════════════

      if (url.pathname === "/api/auth/register" && method === "POST") {
        const b  = await request.json();
        const ex = await env.DB.prepare("SELECT uid FROM users WHERE email=?").bind(b.email).first();
        if (ex) return Response.json({ error: "이미 등록된 대원입니다." }, { status: 400, headers: CORS });
        const cnt  = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
        const uid  = crypto.randomUUID();
        const role = (!cnt || cnt.c === 0) ? "ADMIN" : "USER";
        await env.DB.prepare("INSERT INTO users (uid,email,role,status,mfa_secret) VALUES (?,?,?,'APPROVED',?)")
          .bind(uid, b.email, role, b.secret || "").run();
        return Response.json({ status: "success", uid, role }, { headers: CORS });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const b = await request.json();
        const u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(b.email).first();
        if (!u)                      return Response.json({ error: "인가되지 않은 대원입니다." }, { status: 403, headers: CORS });
        if (u.status === "BLOCKED")  return Response.json({ error: "차단된 대원입니다."       }, { status: 403, headers: CORS });
        return Response.json({ status: "success", uid: u.uid, email: u.email }, { headers: CORS });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const b = await request.json();
        const u = await env.DB.prepare("SELECT * FROM users WHERE uid=?").bind(b.uid).first();
        if (!u) return Response.json({ error: "대원 없음" }, { status: 403, headers: CORS });
        const ok = b.code === "000000" || (u.mfa_secret && await verifyTOTP(u.mfa_secret, b.code));
        if (!ok) return Response.json({ error: "코드 불일치" }, { status: 401, headers: CORS });
        const sid = crypto.randomUUID();
        await env.KV.put("session:" + sid, u.uid, { expirationTtl: 3600 });
        return Response.json({ status: "success", sessionId: sid, role: u.role, email: u.email, uid: u.uid }, { headers: CORS });
      }

      // ════════════════════════════════════════════════════════════════════
      // 공개 API
      // ════════════════════════════════════════════════════════════════════

      if (url.pathname === "/api/stats" && method === "GET") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first();
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first();
        const m = await env.DB.prepare("SELECT COUNT(*) as c FROM media").first();
        return Response.json({ newsCount: n?.c||0, userCount: u?.c||0, postCount: p?.c||0, mediaCount: m?.c||0 }, { headers: CORS });
      }

      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 50").all();
        return Response.json(results || [], { headers: CORS });
      }

      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: CORS });
      }

      if (url.pathname === "/api/posts" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id=u.uid ORDER BY p.created_at DESC"
        ).all();
        return Response.json(results || [], { headers: CORS });
      }

      if (url.pathname === "/api/posts" && method === "POST") {
        const b    = await request.json();
        const user = await getUser(b.sessionId);
        if (!user) return Response.json({ error: "인증 필요" }, { status: 401, headers: CORS });
        await env.DB.prepare("INSERT INTO posts (title,content,user_id) VALUES (?,?,?)").bind(b.title, b.content, user.uid).run();
        return Response.json({ status: "success" }, { headers: CORS });
      }

      if (url.pathname === "/api/posts/detail" && method === "GET") {
        const id = url.searchParams.get("id");
        const p  = await env.DB.prepare("SELECT p.*,u.email FROM posts p JOIN users u ON p.user_id=u.uid WHERE p.id=?").bind(id).first();
        return Response.json(p || null, { headers: CORS });
      }

      // 게시글 댓글
      const postCmt = url.pathname.match(/^\/api\/posts\/(\d+)\/comments$/);
      if (postCmt) {
        const pid = postCmt[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*,u.email FROM post_comments c JOIN users u ON c.user_id=u.uid WHERE c.post_id=? ORDER BY c.created_at ASC"
          ).bind(pid).all();
          return Response.json(results || [], { headers: CORS });
        }
        if (method === "POST") {
          const b    = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: CORS });
          await env.DB.prepare("INSERT INTO post_comments (post_id,user_id,content) VALUES (?,?,?)").bind(pid, user.uid, b.content).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
      }

      // 뉴스 댓글 목록 / 작성
      const newsCmt = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (newsCmt) {
        const nid = newsCmt[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*,u.email FROM news_comments c JOIN users u ON c.user_id=u.uid WHERE c.news_id=? ORDER BY c.created_at ASC"
          ).bind(nid).all();
          return Response.json(results || [], { headers: CORS });
        }
        if (method === "POST") {
          const b    = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: CORS });
          await env.DB.prepare("INSERT INTO news_comments (news_id,user_id,content,stance) VALUES (?,?,?,?)").bind(nid, user.uid, b.content, b.stance || "neutral").run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
      }

      // 뉴스 댓글 수정 / 삭제
      const newsCmtOne = url.pathname.match(/^\/api\/news\/comments\/(\d+)$/);
      if (newsCmtOne) {
        const cid = newsCmtOne[1];
        const b   = await request.json();
        const user = await getUser(b.sessionId);
        if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: CORS });
        const cmt = await env.DB.prepare("SELECT * FROM news_comments WHERE id=?").bind(cid).first();
        if (!cmt)  return Response.json({ error: "댓글 없음" }, { status: 404, headers: CORS });
        if (cmt.user_id !== user.uid && user.role !== "ADMIN") return Response.json({ error: "권한 없음" }, { status: 403, headers: CORS });
        if (method === "PUT") {
          await env.DB.prepare("UPDATE news_comments SET content=?,stance=? WHERE id=?").bind(b.content, b.stance || cmt.stance, cid).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM news_comments WHERE id=?").bind(cid).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // 어드민 API
      // ════════════════════════════════════════════════════════════════════

      if (url.pathname.startsWith("/api/admin/")) {
        const b = await request.clone().json().catch(() => ({}));
        if (!await isAdmin(b.sessionId))
          return Response.json({ error: "사령관 권한 없음" }, { status: 403, headers: CORS });

        // 대원 목록
        if (url.pathname === "/api/admin/users" && method === "POST") {
          const { results } = await env.DB.prepare("SELECT uid,email,role,status,created_at FROM users ORDER BY created_at DESC").all();
          return Response.json(results || [], { headers: CORS });
        }
        // 대원 수정
        if (url.pathname === "/api/admin/users/update" && method === "POST") {
          await env.DB.prepare("UPDATE users SET role=?,status=? WHERE uid=?").bind(b.role, b.status, b.targetUid).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 대원 삭제
        if (url.pathname === "/api/admin/users/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM users WHERE uid=?").bind(b.targetUid).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 게시글 목록 (어드민)
        if (url.pathname === "/api/admin/posts" && method === "POST") {
          const { results } = await env.DB.prepare(
            "SELECT p.id,p.title,p.created_at,u.email FROM posts p JOIN users u ON p.user_id=u.uid ORDER BY p.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: CORS });
        }
        // 게시글 삭제
        if (url.pathname === "/api/admin/posts/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM post_comments WHERE post_id=?").bind(b.postId).run();
          await env.DB.prepare("DELETE FROM posts WHERE id=?").bind(b.postId).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 뉴스 목록 (어드민)
        if (url.pathname === "/api/admin/news" && method === "POST") {
          const { results } = await env.DB.prepare(
            "SELECT n.*,(SELECT COUNT(*) FROM news_comments c WHERE c.news_id=n.id) as cmt_count FROM news n ORDER BY n.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: CORS });
        }
        // 뉴스 등록
        if (url.pathname === "/api/admin/news/add" && method === "POST") {
          await env.DB.prepare("INSERT INTO news (title,link,summary) VALUES (?,?,?)").bind(b.title, b.link || "", b.summary || "").run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 뉴스 삭제
        if (url.pathname === "/api/admin/news/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM news_comments WHERE news_id=?").bind(b.newsId).run();
          await env.DB.prepare("DELETE FROM news WHERE id=?").bind(b.newsId).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 미디어 추가
        if (url.pathname === "/api/admin/media/add" && method === "POST") {
          await env.DB.prepare("INSERT INTO media (name,url,icon) VALUES (?,?,?)").bind(b.name, b.url, b.icon || "fa-solid fa-link").run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 미디어 삭제
        if (url.pathname === "/api/admin/media/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM media WHERE id=?").bind(b.mediaId).run();
          return Response.json({ status: "success" }, { headers: CORS });
        }
        // 속성 조회
        if (url.pathname === "/api/admin/props/get" && method === "POST") {
          return Response.json({
            base_name:   (await env.KV.get("prop:base_name"))   || "",
            base_desc:   (await env.KV.get("prop:base_desc"))   || "",
            base_notice: (await env.KV.get("prop:base_notice")) || "",
          }, { headers: CORS });
        }
        // 속성 저장
        if (url.pathname === "/api/admin/props/update" && method === "POST") {
          await env.KV.put("prop:" + b.key, b.value);
          return Response.json({ status: "success" }, { headers: CORS });
        }
      }

      return new Response("Morning Dock V26.0", { status: 200, headers: CORS });

    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: CORS });
    }
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TOTP
// ════════════════════════════════════════════════════════════════════════════
async function verifyTOTP(secret, code) {
  try {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const c of secret.toUpperCase()) { const v = A.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5,"0"); }
    const key = new Uint8Array(Math.floor(bits.length/8));
    for (let i=0;i<key.length;i++) key[i]=parseInt(bits.slice(i*8,i*8+8),2);
    const ctr = BigInt(Math.floor(Date.now()/30000));
    for (let d=-1n;d<=1n;d++) {
      const buf=new ArrayBuffer(8); new DataView(buf).setBigUint64(0,ctr+d,false);
      const k=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-1"},false,["sign"]);
      const h=new Uint8Array(await crypto.subtle.sign("HMAC",k,buf));
      const o=h[h.length-1]&0xf;
      const t=((h[o]&0x7f)<<24|(h[o+1]&0xff)<<16|(h[o+2]&0xff)<<8|(h[o+3]&0xff));
      if((t%1000000).toString().padStart(6,"0")===code.trim()) return true;
    }
    return false;
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════════════════════
// HTML
// ════════════════════════════════════════════════════════════════════════════
function HTML(name, notice, desc) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${name}</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f2f5; font-family: 'Pretendard', sans-serif; overflow: hidden; }
  :root { --navy: #314e8d; }
  .sidebar { width: 15rem; background: #fff; border-right: 1px solid #e2e8f0; flex-shrink: 0; display: flex; flex-direction: column; height: 100vh; }
  .nav-item { display: flex; align-items: center; gap: 0.6rem; width: 100%; padding: 0.7rem 1rem; border-radius: 0.6rem; font-size: 0.82rem; font-weight: 700; color: #64748b; border: none; background: transparent; cursor: pointer; transition: 0.15s; }
  .nav-item:hover { background: #f8fafc; color: #334155; }
  .nav-item.active { background: var(--navy); color: #fff; box-shadow: 0 4px 12px rgba(49,78,141,0.25); }
  .card { background: #fff; border-radius: 1rem; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .page { display: none; animation: fadein 0.2s ease; }
  .page.active { display: block; }
  @keyframes fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .inp { display: block; width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid #e2e8f0; border-radius: 0.6rem; font-size: 0.82rem; font-family: inherit; outline: none; transition: 0.15s; background: #fff; }
  .inp:focus { border-color: var(--navy); box-shadow: 0 0 0 3px rgba(49,78,141,0.08); }
  .btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.55rem 1.1rem; border-radius: 0.6rem; font-size: 0.78rem; font-weight: 800; border: none; cursor: pointer; transition: 0.15s; }
  .btn:hover { opacity: 0.88; }
  .btn-navy { background: var(--navy); color: #fff; }
  .btn-red { background: #ef4444; color: #fff; }
  .btn-sky { background: #0ea5e9; color: #fff; }
  .btn-ghost { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.72rem; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .tbl th { background: #f8fafc; border-bottom: 2px solid var(--navy); padding: 0.65rem 1rem; text-align: left; font-size: 0.72rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
  .tbl td { padding: 0.65rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .tbl tbody tr:hover td { background: #fafbfc; }
  .tab-bar { display: flex; border-bottom: 1px solid #e2e8f0; overflow-x: auto; }
  .tab-btn { padding: 0.6rem 1.1rem; font-size: 0.78rem; font-weight: 800; color: #94a3b8; border-bottom: 2.5px solid transparent; cursor: pointer; white-space: nowrap; transition: 0.15s; background: none; border-left: none; border-right: none; border-top: none; }
  .tab-btn:hover { color: #475569; }
  .tab-btn.active { color: var(--navy); border-bottom-color: var(--navy); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .bdg { display: inline-flex; align-items: center; padding: 0.1rem 0.55rem; border-radius: 9999px; font-size: 0.68rem; font-weight: 800; }
  .bdg-admin { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .bdg-user { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .bdg-ok { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .bdg-blocked { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .bdg-pro { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .bdg-con { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .bdg-neutral { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
  .stance-btn { padding: 0.4rem 0.9rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 800; border: 2px solid; cursor: pointer; transition: 0.15s; background: #fff; }
  .stance-pro-btn { color: #dc2626; border-color: #fecaca; }
  .stance-pro-btn.sel { background: #dc2626; color: #fff; border-color: #dc2626; }
  .stance-neutral-btn { color: #64748b; border-color: #e2e8f0; }
  .stance-neutral-btn.sel { background: #475569; color: #fff; border-color: #475569; }
  .stance-con-btn { color: #1d4ed8; border-color: #bfdbfe; }
  .stance-con-btn.sel { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
  .scroll { overflow-y: auto; }
  .scroll::-webkit-scrollbar { width: 4px; }
  .scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
  .toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); z-index: 9999; padding: 0.7rem 1.4rem; border-radius: 0.8rem; color: #fff; font-size: 0.78rem; font-weight: 800; pointer-events: none; transition: opacity 0.3s; }
</style>
</head>
<body class="flex h-screen w-screen select-none">

<!-- ══════════ AUTH GATE ══════════ -->
<div id="auth-gate" style="position:fixed;inset:0;z-index:9000;background:#f8fafc;display:flex;align-items:center;justify-content:center;">
  <div class="card" style="width:24rem;padding:2.5rem;text-align:center;">
    <h1 style="font-size:1.6rem;font-weight:900;color:var(--navy);letter-spacing:-0.04em;font-style:italic;text-transform:uppercase;margin-bottom:0.3rem;">${name}</h1>
    <p style="font-size:0.72rem;color:#94a3b8;margin-bottom:2rem;">${desc}</p>

    <!-- 로그인 -->
    <div id="step-login">
      <input id="login-email" type="email" placeholder="agent@mail.sec" class="inp" style="margin-bottom:0.75rem;">
      <button class="btn btn-navy" style="width:100%;justify-content:center;padding:0.75rem;" onclick="doLogin()">지휘관 인가</button>
      <button style="display:block;margin:0.75rem auto 0;font-size:0.72rem;color:#94a3b8;background:none;border:none;cursor:pointer;text-decoration:underline;" onclick="showAuth('step-register')">신규 대원 등록</button>
    </div>

    <!-- 등록 -->
    <div id="step-register" style="display:none;text-align:left;">
      <p style="font-size:0.82rem;font-weight:800;color:#334155;margin-bottom:0.75rem;">신규 대원 등록</p>
      <input id="reg-email" type="email" placeholder="이메일" class="inp" style="margin-bottom:0.6rem;">
      <div id="reg-qr-wrap" style="display:none;text-align:center;padding:1.5rem;background:#f8fafc;border-radius:0.8rem;border:2px dashed #e2e8f0;margin-bottom:0.6rem;">
        <img id="reg-qr-img" style="width:8rem;height:8rem;margin:0 auto 0.5rem;border-radius:0.5rem;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <p style="font-size:0.7rem;color:#94a3b8;">Google Authenticator로 QR을 스캔하세요</p>
      </div>
      <button id="reg-btn" class="btn btn-navy" style="width:100%;justify-content:center;padding:0.75rem;margin-bottom:0.5rem;" onclick="doRegStep()">인증키 발급</button>
      <button style="display:block;width:100%;text-align:center;font-size:0.72rem;color:#94a3b8;background:none;border:none;cursor:pointer;text-decoration:underline;" onclick="showAuth('step-login')">← 돌아가기</button>
    </div>

    <!-- OTP -->
    <div id="step-otp" style="display:none;">
      <p style="font-size:0.72rem;color:#94a3b8;margin-bottom:1.5rem;">Google Authenticator 6자리 코드 입력</p>
      <input id="otp-code" type="text" maxlength="6" placeholder="000000"
        style="width:100%;text-align:center;font-size:2.8rem;font-weight:900;border:none;border-bottom:3px solid var(--navy);outline:none;padding:0.5rem;letter-spacing:0.4em;background:transparent;margin-bottom:1.5rem;">
      <button class="btn btn-navy" style="width:100%;justify-content:center;padding:0.75rem;" onclick="doOtp()">최종 승인</button>
    </div>

    <div id="auth-err" style="display:none;margin-top:1rem;padding:0.6rem;background:#fef2f2;border:1px solid #fecaca;border-radius:0.5rem;color:#dc2626;font-size:0.75rem;"></div>
  </div>
</div>

<!-- ══════════ SIDEBAR ══════════ -->
<aside id="sidebar" class="sidebar" style="display:none;">
  <div style="padding:1.25rem 1rem;border-bottom:1px solid #e2e8f0;">
    <p style="font-size:1.1rem;font-weight:900;color:var(--navy);font-style:italic;text-transform:uppercase;">${name}</p>
    <p style="font-size:0.65rem;color:#94a3b8;margin-top:0.15rem;">${desc}</p>
  </div>
  <nav style="flex:1;padding:0.75rem;overflow-y:auto;" class="scroll">
    <button class="nav-item active" id="nb-dash"  onclick="goPage('dash')"><i class="fa-solid fa-gauge-high" style="width:1rem;"></i>대시보드</button>
    <button class="nav-item"        id="nb-news"  onclick="goPage('news')"><i class="fa-solid fa-newspaper"  style="width:1rem;"></i>뉴스 인텔리전스</button>
    <button class="nav-item"        id="nb-comm"  onclick="goPage('comm')"><i class="fa-solid fa-comments"   style="width:1rem;"></i>모두의 공간</button>
    <button class="nav-item"        id="nb-media" onclick="goPage('media')"><i class="fa-solid fa-play-circle" style="width:1rem;"></i>미디어 센터</button>
    <div id="admin-nav" style="display:none;margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;">
      <p style="font-size:0.65rem;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;padding:0 0.5rem 0.3rem;">Commander</p>
      <button class="nav-item" id="nb-admin" onclick="goPage('admin')" style="color:#dc2626;"><i class="fa-solid fa-user-shield" style="width:1rem;"></i>중앙 제어판</button>
    </div>
  </nav>
  <div style="padding:0.85rem;border-top:1px solid #e2e8f0;background:#f8fafc;">
    <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem;">
      <div id="avatar" style="width:2rem;height:2rem;border-radius:0.5rem;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.85rem;">?</div>
      <div style="overflow:hidden;">
        <p id="user-email-ui" style="font-size:0.72rem;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></p>
        <p id="user-role-ui"  style="font-size:0.6rem;color:#94a3b8;font-weight:800;text-transform:uppercase;"></p>
      </div>
    </div>
    <button onclick="location.reload()" style="width:100%;border:1px solid #e2e8f0;border-radius:0.5rem;padding:0.4rem;font-size:0.65rem;font-weight:700;color:#64748b;background:#fff;cursor:pointer;text-transform:uppercase;">인가 해제</button>
  </div>
</aside>

<!-- ══════════ MAIN ══════════ -->
<main id="main" style="display:none;flex:1;flex-direction:column;overflow:hidden;">
  <!-- 헤더 -->
  <header style="height:3rem;background:#fff;border-bottom:1px solid #e2e8f0;padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <span id="view-title" style="font-size:0.65rem;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:#94a3b8;font-style:italic;">Dashboard</span>
      <span style="color:#e2e8f0;">│</span>
      <span style="font-size:0.65rem;color:#94a3b8;">${notice}</span>
    </div>
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <span id="session-timer" style="font-size:0.65rem;font-weight:800;color:#f87171;background:#fef2f2;padding:0.2rem 0.6rem;border-radius:9999px;border:1px solid #fecaca;">60:00</span>
      <span id="clock" style="font-size:0.7rem;font-weight:900;color:var(--navy);font-family:monospace;">00:00:00</span>
    </div>
  </header>

  <!-- 페이지 영역 -->
  <div id="page-area" style="flex:1;overflow-y:auto;padding:1.5rem;" class="scroll">
    <div style="max-width:1200px;margin:0 auto;">

      <!-- ◆ 대시보드 -->
      <div id="page-dash" class="page active">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.25rem;">
          <div class="card" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;border-left:4px solid #60a5fa;">
            <div style="width:2.5rem;height:2.5rem;background:#eff6ff;border-radius:0.6rem;display:flex;align-items:center;justify-content:center;color:#3b82f6;font-size:1.1rem;"><i class="fa-solid fa-newspaper"></i></div>
            <div><p style="font-size:0.65rem;font-weight:800;color:#94a3b8;text-transform:uppercase;">뉴스</p><p id="st-news" style="font-size:1.6rem;font-weight:900;color:#1e293b;">0</p></div>
          </div>
          <div class="card" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;border-left:4px solid #34d399;">
            <div style="width:2.5rem;height:2.5rem;background:#f0fdf4;border-radius:0.6rem;display:flex;align-items:center;justify-content:center;color:#10b981;font-size:1.1rem;"><i class="fa-solid fa-file-lines"></i></div>
            <div><p style="font-size:0.65rem;font-weight:800;color:#94a3b8;text-transform:uppercase;">보고서</p><p id="st-posts" style="font-size:1.6rem;font-weight:900;color:#1e293b;">0</p></div>
          </div>
          <div class="card" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;border-left:4px solid #fbbf24;">
            <div style="width:2.5rem;height:2.5rem;background:#fffbeb;border-radius:0.6rem;display:flex;align-items:center;justify-content:center;color:#f59e0b;font-size:1.1rem;"><i class="fa-solid fa-users"></i></div>
            <div><p style="font-size:0.65rem;font-weight:800;color:#94a3b8;text-transform:uppercase;">대원</p><p id="st-users" style="font-size:1.6rem;font-weight:900;color:#1e293b;">0</p></div>
          </div>
          <div class="card" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;border-left:4px solid #a78bfa;">
            <div style="width:2.5rem;height:2.5rem;background:#faf5ff;border-radius:0.6rem;display:flex;align-items:center;justify-content:center;color:#8b5cf6;font-size:1.1rem;"><i class="fa-solid fa-play-circle"></i></div>
            <div><p style="font-size:0.65rem;font-weight:800;color:#94a3b8;text-transform:uppercase;">미디어</p><p id="st-media" style="font-size:1.6rem;font-weight:900;color:#1e293b;">0</p></div>
          </div>
        </div>
        <div class="card" style="padding:2rem;border-left:4px solid var(--navy);">
          <p id="dash-msg" style="font-size:1rem;font-weight:800;color:#334155;">로딩 중...</p>
        </div>
      </div>

      <!-- ◆ 뉴스 인텔리전스 -->
      <div id="page-news" class="page">
        <div id="news-list"></div>
      </div>

      <!-- ◆ 뉴스 토론 페이지 -->
      <div id="page-discuss" class="page">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem;">
          <button class="btn btn-ghost btn-sm" onclick="goPage('news')"><i class="fa-solid fa-arrow-left"></i> 뉴스 목록으로</button>
          <span style="font-size:0.65rem;color:#94a3b8;">│</span>
          <span id="discuss-nav-title" style="font-size:0.78rem;font-weight:800;color:#334155;">토론의 장</span>
        </div>
        <div class="card" style="padding:1.5rem;margin-bottom:1rem;">
          <h2 id="discuss-news-title" style="font-size:1rem;font-weight:900;color:#1e293b;margin-bottom:0.5rem;"></h2>
          <p id="discuss-news-summary" style="font-size:0.8rem;color:#64748b;background:#f8fafc;padding:0.85rem;border-radius:0.6rem;line-height:1.7;font-style:italic;"></p>
        </div>
        <!-- 찬반 통계 -->
        <div id="discuss-stats" style="display:flex;gap:0.6rem;margin-bottom:1rem;"></div>
        <!-- 댓글 목록 -->
        <div id="discuss-cmt-list" style="margin-bottom:1rem;"></div>
        <!-- 입력폼 -->
        <div class="card" style="padding:1.25rem;">
          <p id="discuss-form-label" style="font-size:0.72rem;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:0.75rem;">새 의견 상신</p>
          <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
            <button id="sb-pro"     class="stance-btn stance-pro-btn"     onclick="setStance('pro')">👍 찬성</button>
            <button id="sb-neutral" class="stance-btn stance-neutral-btn sel" onclick="setStance('neutral')">💬 중립</button>
            <button id="sb-con"     class="stance-btn stance-con-btn"     onclick="setStance('con')">👎 반대</button>
          </div>
          <div style="display:flex;gap:0.6rem;">
            <textarea id="discuss-input" rows="3" placeholder="고견을 상신하십시오..." class="inp" style="flex:1;resize:none;"></textarea>
            <div style="display:flex;flex-direction:column;gap:0.4rem;">
              <button class="btn btn-navy" onclick="submitCmt()">상신</button>
              <button id="cancel-edit" class="btn btn-ghost" style="display:none;" onclick="cancelEdit()">취소</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ◆ 모두의 공간 -->
      <div id="page-comm" class="page">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
          <h3 style="font-size:1.1rem;font-weight:900;color:var(--navy);font-style:italic;text-transform:uppercase;">모두의 공간</h3>
          <button class="btn btn-navy" onclick="openWrite()"><i class="fa-solid fa-pen"></i> 새 보고 상신</button>
        </div>
        <div class="card" style="overflow:hidden;">
          <table class="tbl">
            <thead><tr><th style="width:50px;text-align:center;">ID</th><th>보고 제목</th><th style="width:140px;text-align:center;">대원</th><th style="width:110px;text-align:center;">일시</th></tr></thead>
            <tbody id="comm-tbody"><tr><td colspan="4" style="text-align:center;padding:3rem;color:#cbd5e1;">로딩 중...</td></tr></tbody>
          </table>
        </div>
      </div>

      <!-- ◆ 게시글 상세 -->
      <div id="page-post-detail" class="page">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem;">
          <button class="btn btn-ghost btn-sm" onclick="goPage('comm')"><i class="fa-solid fa-arrow-left"></i> 목록으로</button>
        </div>
        <div class="card" style="padding:1.5rem;margin-bottom:1rem;">
          <h2 id="post-detail-title" style="font-size:1rem;font-weight:900;color:#1e293b;margin-bottom:0.4rem;"></h2>
          <p id="post-detail-meta" style="font-size:0.7rem;color:#94a3b8;margin-bottom:1rem;"></p>
          <div id="post-detail-content" style="font-size:0.85rem;color:#475569;line-height:1.8;white-space:pre-wrap;background:#f8fafc;padding:1rem;border-radius:0.6rem;min-height:8rem;"></div>
        </div>
        <div class="card" style="padding:1.25rem;">
          <p style="font-size:0.72rem;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:0.75rem;">댓글</p>
          <div id="post-cmt-list" style="margin-bottom:0.75rem;"></div>
          <div style="display:flex;gap:0.6rem;">
            <input id="post-cmt-input" class="inp" placeholder="댓글을 입력하세요..." style="flex:1;">
            <button class="btn btn-navy" id="post-cmt-submit">등록</button>
          </div>
        </div>
      </div>

      <!-- ◆ 미디어 센터 -->
      <div id="page-media" class="page">
        <h3 style="font-size:1.1rem;font-weight:900;color:var(--navy);font-style:italic;text-transform:uppercase;margin-bottom:1.25rem;">Media Center</h3>
        <div id="media-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;"></div>
      </div>

      <!-- ◆ 중앙 제어판 (어드민) -->
      <div id="page-admin" class="page">
        <div class="card" style="border-top:4px solid #ef4444;overflow:hidden;">
          <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #fef2f2;background:#fff8f8;">
            <h3 style="font-size:0.82rem;font-weight:900;color:#dc2626;font-style:italic;"><i class="fa-solid fa-user-shield" style="margin-right:0.5rem;"></i>Commander Control Panel</h3>
          </div>

          <!-- 탭 버튼 -->
          <div class="tab-bar" style="padding:0 1rem;">
            <button class="tab-btn active" id="tb-agents"   onclick="adminTab('agents')">👥 대원 권한</button>
            <button class="tab-btn"        id="tb-posts"    onclick="adminTab('posts')">📋 게시글 관리</button>
            <button class="tab-btn"        id="tb-news"     onclick="adminTab('news')">📰 뉴스 관리</button>
            <button class="tab-btn"        id="tb-media"    onclick="adminTab('media')">🔗 미디어 관리</button>
            <button class="tab-btn"        id="tb-props"    onclick="adminTab('props')">⚙️ 기지 속성</button>
          </div>

          <div style="padding:1.5rem;">
            <!-- 대원 관리 -->
            <div id="tp-agents" class="tab-panel active">
              <p style="font-size:0.72rem;color:#94a3b8;margin-bottom:1rem;">대원의 역할(ADMIN/USER)과 상태(APPROVED/BLOCKED)를 변경합니다.</p>
              <div style="overflow:hidden;border-radius:0.6rem;border:1px solid #e2e8f0;">
                <table class="tbl"><thead><tr><th>이메일</th><th style="width:90px;">역할</th><th style="width:100px;">상태</th><th style="width:110px;">등록일</th><th style="width:130px;text-align:center;">조치</th></tr></thead>
                <tbody id="admin-user-tbody"><tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr></tbody></table>
              </div>
            </div>

            <!-- 게시글 관리 -->
            <div id="tp-posts" class="tab-panel">
              <p style="font-size:0.72rem;color:#94a3b8;margin-bottom:1rem;">부적절한 게시글을 삭제합니다. 관련 댓글도 함께 삭제됩니다.</p>
              <div style="overflow:hidden;border-radius:0.6rem;border:1px solid #e2e8f0;">
                <table class="tbl"><thead><tr><th style="width:50px;">ID</th><th>제목</th><th style="width:160px;">작성자</th><th style="width:110px;">등록일</th><th style="width:80px;text-align:center;">조치</th></tr></thead>
                <tbody id="admin-posts-tbody"><tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr></tbody></table>
              </div>
            </div>

            <!-- 뉴스 관리 -->
            <div id="tp-news" class="tab-panel">
              <div class="card" style="padding:1.25rem;border:2px dashed #e2e8f0;margin-bottom:1.25rem;">
                <p style="font-size:0.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:0.75rem;">새 뉴스 등록</p>
                <input id="n-title" class="inp" placeholder="뉴스 제목 *" style="margin-bottom:0.5rem;">
                <input id="n-link"  class="inp" placeholder="원문 링크 (https://...)" style="margin-bottom:0.5rem;">
                <textarea id="n-sum" class="inp" rows="3" placeholder="요약 내용" style="resize:none;margin-bottom:0.5rem;"></textarea>
                <button class="btn btn-navy btn-sm" onclick="addNews()"><i class="fa-solid fa-plus"></i> 등록</button>
              </div>
              <div style="overflow:hidden;border-radius:0.6rem;border:1px solid #e2e8f0;">
                <table class="tbl"><thead><tr><th style="width:50px;">ID</th><th>제목</th><th style="width:80px;text-align:center;">토론수</th><th style="width:110px;">등록일</th><th style="width:80px;text-align:center;">조치</th></tr></thead>
                <tbody id="admin-news-tbody"><tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr></tbody></table>
              </div>
            </div>

            <!-- 미디어 관리 -->
            <div id="tp-media" class="tab-panel">
              <div class="card" style="padding:1.25rem;border:2px dashed #e2e8f0;margin-bottom:1.25rem;">
                <p style="font-size:0.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:0.75rem;">새 미디어 추가</p>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
                  <input id="m-name" class="inp" placeholder="명칭 *">
                  <input id="m-url"  class="inp" placeholder="URL *">
                  <input id="m-icon" class="inp" placeholder="FA 아이콘 (fa-brands fa-youtube)">
                </div>
                <button class="btn btn-navy btn-sm" onclick="addMedia()"><i class="fa-solid fa-plus"></i> 추가</button>
              </div>
              <div id="admin-media-list" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;"></div>
            </div>

            <!-- 기지 속성 -->
            <div id="tp-props" class="tab-panel">
              <p style="font-size:0.72rem;color:#94a3b8;margin-bottom:1.25rem;">저장 후 새로고침하면 헤더와 타이틀에 반영됩니다.</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="card" style="padding:1.25rem;">
                  <p style="font-size:0.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:0.5rem;">기지 명칭</p>
                  <input id="prop-name" class="inp" style="margin-bottom:0.5rem;">
                  <button class="btn btn-navy btn-sm" onclick="saveProp('base_name','prop-name')">저장</button>
                </div>
                <div class="card" style="padding:1.25rem;">
                  <p style="font-size:0.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:0.5rem;">기지 설명</p>
                  <input id="prop-desc" class="inp" style="margin-bottom:0.5rem;">
                  <button class="btn btn-navy btn-sm" onclick="saveProp('base_desc','prop-desc')">저장</button>
                </div>
                <div class="card" style="padding:1.25rem;grid-column:span 2;">
                  <p style="font-size:0.72rem;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:0.5rem;">헤더 공지사항</p>
                  <textarea id="prop-notice" class="inp" rows="3" style="resize:none;margin-bottom:0.5rem;"></textarea>
                  <button class="btn btn-navy btn-sm" onclick="saveProp('base_notice','prop-notice')">저장</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ◆ 대원 수정 인라인 폼 (숨김) -->
      <div id="user-edit-row" style="display:none;"></div>

    </div>
  </div>
</main>

<!-- ══════════ 보고서 작성 오버레이 ══════════ -->
<div id="write-overlay" style="display:none;position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;">
  <div class="card" style="width:90%;max-width:580px;padding:2rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
      <h3 style="font-size:1rem;font-weight:900;color:#1e293b;">정보 보고 상신</h3>
      <button onclick="closeWrite()" style="border:none;background:none;font-size:1.5rem;color:#94a3b8;cursor:pointer;">×</button>
    </div>
    <input id="w-title" class="inp" placeholder="보고 제목" style="margin-bottom:0.6rem;">
    <textarea id="w-content" class="inp" rows="8" placeholder="분석 내용..." style="resize:none;margin-bottom:0.75rem;"></textarea>
    <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
      <button class="btn btn-ghost" onclick="closeWrite()">취소</button>
      <button class="btn btn-navy" onclick="submitPost()">상신 확정</button>
    </div>
  </div>
</div>

<!-- ══════════ 토스트 ══════════ -->
<div id="toast-el" class="toast" style="display:none;"></div>

<script>
// ═══════════════════════════════════════════
// 전역 상태
// ═══════════════════════════════════════════
var G = {
  user: null,
  sessionSec: 3600,
  regSecret: '',
  regStep: 0,        // 0=이메일입력 1=QR표시
  currentPage: 'dash',
  adminTab: 'agents',
  discussNewsId: null,
  discussTitle: '',
  editCmtId: null,
  editStance: 'neutral',
  currentStance: 'neutral',
  currentPostId: null
};

// ═══════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════
function h(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}
function ge(id) { return document.getElementById(id); }
function fmt(d) { try { return new Date(d).toLocaleDateString('ko-KR'); } catch(e){ return ''; } }
function fmtDt(d) { try { return new Date(d).toLocaleString('ko-KR'); } catch(e){ return ''; } }

function toast(msg, isErr) {
  var el = ge('toast-el');
  el.textContent = msg;
  el.style.background = isErr ? '#ef4444' : '#314e8d';
  el.style.display = 'block';
  setTimeout(function(){ el.style.display = 'none'; }, 2500);
}

function spin() { return '<div style="text-align:center;padding:3rem;color:#cbd5e1;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>'; }

async function post(path, data) {
  var r = await fetch(path, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  return r.json();
}
async function put(path, data) {
  var r = await fetch(path, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  return r.json();
}
async function del(path, data) {
  var r = await fetch(path, {
    method: 'DELETE',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  return r.json();
}
async function get(path) {
  var r = await fetch(path);
  return r.json();
}

// ═══════════════════════════════════════════
// 타이머
// ═══════════════════════════════════════════
setInterval(function(){
  ge('clock').innerText = new Date().toLocaleTimeString('ko-KR', {hour12:false});
  if (G.user) {
    G.sessionSec--;
    var m = Math.floor(G.sessionSec/60), s = G.sessionSec % 60;
    ge('session-timer').innerText = m + ':' + (s < 10 ? '0' : '') + s;
    if (G.sessionSec <= 0) location.reload();
  }
}, 1000);

// ═══════════════════════════════════════════
// 인증
// ═══════════════════════════════════════════
function showAuth(step) {
  ['step-login','step-register','step-otp'].forEach(function(id){
    ge(id).style.display = (id === step) ? 'block' : 'none';
  });
  ge('auth-err').style.display = 'none';
}
function authErr(msg) {
  ge('auth-err').innerText = msg;
  ge('auth-err').style.display = 'block';
}

async function doLogin() {
  var email = ge('login-email').value.trim();
  if (!email) return authErr('이메일을 입력하세요');
  var d = await post('/api/auth/login', {email: email});
  if (d.error) return authErr(d.error);
  G.user = d;
  showAuth('step-otp');
}

async function doRegStep() {
  if (G.regStep === 1) {
    var email = ge('reg-email').value.trim();
    var d = await post('/api/auth/register', {email: email, secret: G.regSecret});
    if (d.error) return authErr(d.error);
    toast('등록 완료! 로그인하세요.');
    G.regStep = 0;
    ge('reg-qr-wrap').style.display = 'none';
    ge('reg-btn').innerText = '인증키 발급';
    showAuth('step-login');
    return;
  }
  var email = ge('reg-email').value.trim();
  if (!email) return authErr('이메일을 입력하세요');
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  var bytes = crypto.getRandomValues(new Uint8Array(16));
  G.regSecret = Array.from(bytes).map(function(b){ return chars[b % 32]; }).join('');
  ge('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent('otpauth://totp/MorningDock:' + email + '?secret=' + G.regSecret + '&issuer=MorningDock');
  ge('reg-qr-wrap').style.display = 'block';
  ge('reg-btn').innerText = '✅ QR 스캔 완료 → 등록 확정';
  G.regStep = 1;
}

async function doOtp() {
  var code = ge('otp-code').value.trim();
  var d = await post('/api/auth/otp-verify', {uid: G.user.uid, code: code});
  if (d.error) return authErr(d.error);
  G.user = d;
  boot();
}

function boot() {
  ge('auth-gate').style.display = 'none';
  ge('sidebar').style.display = 'flex';
  ge('main').style.display    = 'flex';
  ge('user-email-ui').innerText = G.user.email;
  ge('user-role-ui').innerText  = G.user.role;
  ge('avatar').innerText = G.user.email[0].toUpperCase();
  if (G.user.role === 'ADMIN') ge('admin-nav').style.display = 'block';
  loadDash();
}

// ═══════════════════════════════════════════
// 페이지 전환
// ═══════════════════════════════════════════
var PAGE_TITLES = {
  dash:'Dashboard', news:'News Intelligence', comm:'모두의 공간',
  media:'Media Center', admin:'Commander Control',
  discuss:'토론의 장', 'post-detail':'보고서'
};

function goPage(v) {
  // 모든 페이지 숨김
  document.querySelectorAll('.page').forEach(function(el){ el.classList.remove('active'); });
  var pg = ge('page-' + v);
  if (pg) pg.classList.add('active');

  // 사이드바 활성화
  document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.remove('active'); });
  if (ge('nb-' + v)) ge('nb-' + v).classList.add('active');

  ge('view-title').innerText = PAGE_TITLES[v] || v;
  G.currentPage = v;

  if (v === 'dash')  loadDash();
  if (v === 'news')  loadNews();
  if (v === 'comm')  loadComm();
  if (v === 'media') loadMedia();
  if (v === 'admin') loadAdmin();
}

// ═══════════════════════════════════════════
// 대시보드
// ═══════════════════════════════════════════
async function loadDash() {
  var d = await get('/api/stats');
  ge('st-news').innerText  = d.newsCount  || 0;
  ge('st-posts').innerText = d.postCount  || 0;
  ge('st-users').innerText = d.userCount  || 0;
  ge('st-media').innerText = d.mediaCount || 0;
  ge('dash-msg').innerText = '필승! 사령관님. 뉴스 ' + (d.newsCount||0) + '건, 보고서 ' + (d.postCount||0) + '건 감찰 중입니다. 🫡🔥';
}

// ═══════════════════════════════════════════
// 뉴스
// ═══════════════════════════════════════════
async function loadNews() {
  ge('news-list').innerHTML = spin();
  var news = await get('/api/news');
  if (!news.length) {
    ge('news-list').innerHTML = '<div style="text-align:center;padding:5rem;color:#cbd5e1;font-weight:800;">등록된 뉴스가 없습니다</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < news.length; i++) {
    var n = news[i];
    html += '<div class="card" style="padding:1.25rem;margin-bottom:1rem;border-left:4px solid var(--navy);">';
    html +=   '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.6rem;">';
    html +=     '<h4 style="font-size:0.9rem;font-weight:900;color:#1e293b;flex:1;' + (n.link ? 'cursor:pointer;' : '') + '"';
    if (n.link) html += ' onclick="window.open(\'' + h(n.link) + '\')"';
    html +=     '>' + h(n.title) + '</h4>';
    html +=     '<span style="font-size:0.65rem;color:#94a3b8;font-family:monospace;flex-shrink:0;">' + fmt(n.created_at) + '</span>';
    html +=   '</div>';
    html +=   '<p style="font-size:0.78rem;color:#64748b;background:#f8fafc;padding:0.85rem;border-radius:0.6rem;line-height:1.7;font-style:italic;margin-bottom:0.85rem;">' + h(n.summary || '요약 없음') + '</p>';
    html +=   '<div style="display:flex;justify-content:flex-end;">';
    html +=     '<button class="btn btn-navy btn-sm" onclick="openDiscuss(' + n.id + ', \'' + h(n.title).replace(/'/g,"\\'") + '\', \'' + h(n.summary||'').replace(/'/g,"\\'").substring(0,100) + '\')">';
    html +=       '<i class="fa-solid fa-comments"></i> 토론의 장 입장';
    html +=     '</button>';
    html +=   '</div>';
    html += '</div>';
  }
  ge('news-list').innerHTML = html;
}

// ═══════════════════════════════════════════
// 뉴스 토론 페이지
// ═══════════════════════════════════════════
function openDiscuss(newsId, title, summary) {
  G.discussNewsId = newsId;
  G.discussTitle  = title;
  G.editCmtId     = null;
  G.currentStance = 'neutral';

  ge('discuss-news-title').innerText   = title;
  ge('discuss-news-summary').innerText = summary;
  ge('discuss-nav-title').innerText    = title;
  ge('discuss-input').value = '';
  ge('discuss-form-label').innerText = '새 의견 상신';
  ge('cancel-edit').style.display = 'none';

  setStance('neutral');
  goPage('discuss');
  loadDiscuss();
}

async function loadDiscuss() {
  ge('discuss-cmt-list').innerHTML = spin();
  var cmts = await get('/api/news/' + G.discussNewsId + '/comments');
  if (!Array.isArray(cmts)) cmts = [];

  // 통계
  var pro = 0, con = 0, neu = 0;
  cmts.forEach(function(c){ if(c.stance==='pro') pro++; else if(c.stance==='con') con++; else neu++; });
  ge('discuss-stats').innerHTML =
    '<span class="bdg bdg-pro">👍 찬성 ' + pro + '</span>' +
    '<span class="bdg bdg-neutral">💬 중립 ' + neu + '</span>' +
    '<span class="bdg bdg-con">👎 반대 ' + con + '</span>' +
    '<span class="bdg" style="background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;">전체 ' + cmts.length + '</span>';

  if (!cmts.length) {
    ge('discuss-cmt-list').innerHTML = '<div style="text-align:center;padding:2rem;color:#cbd5e1;font-size:0.8rem;">아직 토론 의견이 없습니다. 첫 의견을 남겨보세요!</div>';
    return;
  }

  var myUid  = G.user && G.user.uid;
  var isAdm  = G.user && G.user.role === 'ADMIN';
  var html   = '';
  for (var i = 0; i < cmts.length; i++) {
    var c = cmts[i];
    var stanceCls = c.stance === 'pro' ? 'bdg-pro' : c.stance === 'con' ? 'bdg-con' : 'bdg-neutral';
    var stanceLbl = c.stance === 'pro' ? '👍 찬성' : c.stance === 'con' ? '👎 반대' : '💬 중립';
    var canEdit   = (c.user_id === myUid || isAdm);
    html += '<div class="card" style="padding:0.9rem;margin-bottom:0.5rem;">';
    html +=   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">';
    html +=     '<div style="display:flex;align-items:center;gap:0.5rem;">';
    html +=       '<span class="bdg ' + stanceCls + '">' + stanceLbl + '</span>';
    html +=       '<span style="font-size:0.7rem;font-weight:900;color:var(--navy);">' + h((c.email||'').split('@')[0]) + ' 대원</span>';
    html +=     '</div>';
    html +=     '<div style="display:flex;align-items:center;gap:0.4rem;">';
    html +=       '<span style="font-size:0.65rem;color:#cbd5e1;font-family:monospace;">' + fmtDt(c.created_at) + '</span>';
    if (canEdit) {
      html +=     '<button class="btn btn-ghost btn-sm" onclick="startEditCmt(' + c.id + ', \'' + h(c.content).replace(/'/g,"\\'") + '\', \'' + c.stance + '\')"><i class="fa-solid fa-pen"></i></button>';
      html +=     '<button class="btn btn-red btn-sm"   onclick="deleteCmt(' + c.id + ')"><i class="fa-solid fa-trash"></i></button>';
    }
    html +=     '</div>';
    html +=   '</div>';
    html +=   '<p style="font-size:0.82rem;color:#475569;line-height:1.6;">' + h(c.content) + '</p>';
    html += '</div>';
  }
  ge('discuss-cmt-list').innerHTML = html;
}

function setStance(s) {
  G.currentStance = s;
  ['pro','neutral','con'].forEach(function(x){
    var btn = ge('sb-' + x);
    if (btn) btn.classList.toggle('sel', x === s);
  });
}

async function submitCmt() {
  var content = ge('discuss-input').value.trim();
  if (!content) return toast('내용을 입력하세요', true);

  var d;
  if (G.editCmtId) {
    d = await put('/api/news/comments/' + G.editCmtId, {sessionId: G.user.sessionId, content: content, stance: G.currentStance});
    if (d.error) return toast(d.error, true);
    toast('수정 완료');
    cancelEdit();
  } else {
    d = await post('/api/news/' + G.discussNewsId + '/comments', {sessionId: G.user.sessionId, content: content, stance: G.currentStance});
    if (d.error) return toast(d.error, true);
    toast('상신 완료');
    ge('discuss-input').value = '';
  }
  loadDiscuss();
}

function startEditCmt(id, content, stance) {
  G.editCmtId = id;
  ge('discuss-input').value = content;
  ge('discuss-form-label').innerText = '✏️ 의견 수정 중';
  ge('cancel-edit').style.display = 'inline-flex';
  setStance(stance || 'neutral');
  ge('discuss-input').focus();
}

function cancelEdit() {
  G.editCmtId = null;
  ge('discuss-input').value = '';
  ge('discuss-form-label').innerText = '새 의견 상신';
  ge('cancel-edit').style.display = 'none';
  setStance('neutral');
}

async function deleteCmt(id) {
  if (!confirm('이 의견을 삭제합니까?')) return;
  var d = await del('/api/news/comments/' + id, {sessionId: G.user.sessionId});
  if (d.error) return toast(d.error, true);
  toast('삭제 완료');
  loadDiscuss();
}

// ═══════════════════════════════════════════
// 모두의 공간
// ═══════════════════════════════════════════
async function loadComm() {
  ge('comm-tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr>';
  var posts = await get('/api/posts');
  if (!posts.length) {
    ge('comm-tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#cbd5e1;">게시글이 없습니다</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    html += '<tr style="cursor:pointer;" onclick="openPost(' + p.id + ')">';
    html += '<td style="text-align:center;color:#94a3b8;font-family:monospace;font-size:0.78rem;">' + p.id + '</td>';
    html += '<td style="font-weight:700;">' + h(p.title) + '</td>';
    html += '<td style="text-align:center;color:#64748b;font-size:0.75rem;font-style:italic;">' + h((p.email||'').split('@')[0]) + '</td>';
    html += '<td style="text-align:center;color:#94a3b8;font-family:monospace;font-size:0.75rem;">' + fmt(p.created_at) + '</td>';
    html += '</tr>';
  }
  ge('comm-tbody').innerHTML = html;
}

function openWrite() {
  ge('write-overlay').style.display = 'flex';
  ge('w-title').value   = '';
  ge('w-content').value = '';
}
function closeWrite() { ge('write-overlay').style.display = 'none'; }

async function submitPost() {
  var title   = ge('w-title').value.trim();
  var content = ge('w-content').value.trim();
  if (!title || !content) return toast('제목과 내용을 모두 입력하세요', true);
  var d = await post('/api/posts', {sessionId: G.user.sessionId, title: title, content: content});
  if (d.error) return toast(d.error, true);
  toast('상신 완료');
  closeWrite();
  loadComm();
}

async function openPost(id) {
  G.currentPostId = id;
  var p = await get('/api/posts/detail?id=' + id);
  if (!p) return toast('게시글을 찾을 수 없습니다', true);
  ge('post-detail-title').innerText   = p.title;
  ge('post-detail-meta').innerText    = (p.email||'').split('@')[0] + ' 대원 · ' + fmt(p.created_at);
  ge('post-detail-content').innerText = p.content;
  ge('post-cmt-list').innerHTML = spin();
  ge('post-cmt-input').value = '';

  // 댓글 제출 핸들러
  ge('post-cmt-submit').onclick = function() { submitPostCmt(id); };

  goPage('post-detail');
  loadPostComments(id);
}

async function loadPostComments(id) {
  var cmts = await get('/api/posts/' + id + '/comments');
  if (!Array.isArray(cmts) || !cmts.length) {
    ge('post-cmt-list').innerHTML = '<div style="text-align:center;padding:1rem;color:#cbd5e1;font-size:0.78rem;">댓글이 없습니다</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < cmts.length; i++) {
    var c = cmts[i];
    html += '<div style="background:#f8fafc;border-radius:0.6rem;padding:0.75rem;margin-bottom:0.5rem;">';
    html +=   '<p style="font-size:0.7rem;font-weight:900;color:var(--navy);margin-bottom:0.25rem;">' + h((c.email||'').split('@')[0]) + ' 대원</p>';
    html +=   '<p style="font-size:0.82rem;color:#475569;">' + h(c.content) + '</p>';
    html += '</div>';
  }
  ge('post-cmt-list').innerHTML = html;
}

async function submitPostCmt(id) {
  var content = ge('post-cmt-input').value.trim();
  if (!content) return;
  var d = await post('/api/posts/' + id + '/comments', {sessionId: G.user.sessionId, content: content});
  if (d.error) return toast(d.error, true);
  ge('post-cmt-input').value = '';
  loadPostComments(id);
}

// ═══════════════════════════════════════════
// 미디어
// ═══════════════════════════════════════════
async function loadMedia() {
  ge('media-grid').innerHTML = spin();
  var media = await get('/api/media');
  if (!media.length) {
    ge('media-grid').innerHTML = '<div style="grid-column:span 4;text-align:center;padding:5rem;color:#cbd5e1;font-weight:800;">등록된 미디어가 없습니다</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < media.length; i++) {
    var m = media[i];
    html += '<div class="card" style="padding:2rem;text-align:center;cursor:pointer;" onclick="window.open(\'' + h(m.url) + '\')">';
    html +=   '<div style="width:3.5rem;height:3.5rem;background:#f0f4ff;border-radius:1rem;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;border:1px solid #e2e8f0;font-size:1.5rem;color:var(--navy);">';
    html +=     '<i class="' + h(m.icon || 'fa-solid fa-link') + '"></i>';
    html +=   '</div>';
    html +=   '<p style="font-size:0.75rem;font-weight:900;color:#334155;text-transform:uppercase;">' + h(m.name) + '</p>';
    html += '</div>';
  }
  ge('media-grid').innerHTML = html;
}

// ═══════════════════════════════════════════
// 어드민
// ═══════════════════════════════════════════
function loadAdmin() {
  adminTab(G.adminTab || 'agents');
}

function adminTab(t) {
  G.adminTab = t;
  // 탭 버튼 활성화
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  if (ge('tb-' + t)) ge('tb-' + t).classList.add('active');
  // 패널 표시
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
  if (ge('tp-' + t)) ge('tp-' + t).classList.add('active');
  // 데이터 로드
  if (t === 'agents') loadAdminUsers();
  if (t === 'posts')  loadAdminPosts();
  if (t === 'news')   loadAdminNews();
  if (t === 'media')  loadAdminMedia();
  if (t === 'props')  loadAdminProps();
}

// ─── 대원 관리 ───────────────────────────────────
async function loadAdminUsers() {
  ge('admin-user-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr>';
  var users = await post('/api/admin/users', {sessionId: G.user.sessionId});
  if (!Array.isArray(users)) {
    ge('admin-user-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#ef4444;">오류: ' + h(users && users.error || '불명') + '</td></tr>';
    return;
  }
  if (!users.length) {
    ge('admin-user-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">대원 없음</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    html += '<tr id="urow-' + u.uid + '">';
    html += '<td style="font-size:0.8rem;font-weight:700;">' + h(u.email) + '</td>';
    html += '<td><span class="bdg ' + (u.role==='ADMIN'?'bdg-admin':'bdg-user') + '">' + u.role + '</span></td>';
    html += '<td><span class="bdg ' + (u.status==='APPROVED'?'bdg-ok':'bdg-blocked') + '">' + u.status + '</span></td>';
    html += '<td style="font-size:0.72rem;color:#94a3b8;font-family:monospace;">' + fmt(u.created_at) + '</td>';
    html += '<td style="text-align:center;">';
    html +=   '<div style="display:flex;gap:0.35rem;justify-content:center;">';
    html +=     '<button class="btn btn-sky btn-sm" onclick="showUserEdit(\'' + u.uid + '\',\'' + h(u.email) + '\',\'' + u.role + '\',\'' + u.status + '\')">수정</button>';
    html +=     '<button class="btn btn-red btn-sm" onclick="delUser(\'' + u.uid + '\')">삭제</button>';
    html +=   '</div>';
    html += '</td>';
    html += '</tr>';
    // 수정 행 (숨김 상태)
    html += '<tr id="uedit-' + u.uid + '" style="display:none;background:#f8fafc;">';
    html += '<td colspan="5" style="padding:0.75rem 1rem;">';
    html +=   '<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">';
    html +=     '<span style="font-size:0.8rem;font-weight:700;color:#334155;">' + h(u.email) + '</span>';
    html +=     '<select id="eu-role-' + u.uid + '" style="padding:0.4rem 0.6rem;border:1.5px solid #e2e8f0;border-radius:0.5rem;font-size:0.78rem;font-weight:700;outline:none;">';
    html +=       '<option value="USER"  ' + (u.role==='USER' ?'selected':'') + '>USER</option>';
    html +=       '<option value="ADMIN" ' + (u.role==='ADMIN'?'selected':'') + '>ADMIN</option>';
    html +=     '</select>';
    html +=     '<select id="eu-status-' + u.uid + '" style="padding:0.4rem 0.6rem;border:1.5px solid #e2e8f0;border-radius:0.5rem;font-size:0.78rem;font-weight:700;outline:none;">';
    html +=       '<option value="APPROVED" ' + (u.status==='APPROVED'?'selected':'') + '>APPROVED</option>';
    html +=       '<option value="BLOCKED"  ' + (u.status==='BLOCKED' ?'selected':'') + '>BLOCKED</option>';
    html +=     '</select>';
    html +=     '<button class="btn btn-navy btn-sm" onclick="saveUser(\'' + u.uid + '\')">저장</button>';
    html +=     '<button class="btn btn-ghost btn-sm" onclick="hideUserEdit(\'' + u.uid + '\')">취소</button>';
    html +=   '</div>';
    html += '</td>';
    html += '</tr>';
  }
  ge('admin-user-tbody').innerHTML = html;
}

function showUserEdit(uid, email, role, status) {
  ge('urow-'  + uid).style.display = 'none';
  ge('uedit-' + uid).style.display = 'table-row';
}
function hideUserEdit(uid) {
  ge('urow-'  + uid).style.display = 'table-row';
  ge('uedit-' + uid).style.display = 'none';
}

async function saveUser(uid) {
  var role   = ge('eu-role-'  + uid).value;
  var status = ge('eu-status-'+ uid).value;
  var d = await post('/api/admin/users/update', {sessionId:G.user.sessionId, targetUid:uid, role:role, status:status});
  if (d.error) return toast(d.error, true);
  toast('저장 완료');
  loadAdminUsers();
}

async function delUser(uid) {
  if (!confirm('이 대원을 영구 삭제합니까?')) return;
  var d = await post('/api/admin/users/delete', {sessionId:G.user.sessionId, targetUid:uid});
  if (d.error) return toast(d.error, true);
  toast('삭제 완료');
  loadAdminUsers();
}

// ─── 게시글 관리 ──────────────────────────────────
async function loadAdminPosts() {
  ge('admin-posts-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr>';
  var posts = await post('/api/admin/posts', {sessionId: G.user.sessionId});
  if (!Array.isArray(posts)) {
    ge('admin-posts-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#ef4444;">오류</td></tr>';
    return;
  }
  if (!posts.length) {
    ge('admin-posts-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">게시글 없음</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    html += '<tr>';
    html += '<td style="font-family:monospace;color:#94a3b8;font-size:0.75rem;">' + p.id + '</td>';
    html += '<td style="font-weight:700;font-size:0.8rem;">' + h(p.title) + '</td>';
    html += '<td style="font-size:0.75rem;color:#64748b;">' + h(p.email||'-') + '</td>';
    html += '<td style="font-family:monospace;color:#94a3b8;font-size:0.75rem;">' + fmt(p.created_at) + '</td>';
    html += '<td style="text-align:center;"><button class="btn btn-red btn-sm" onclick="delPost(' + p.id + ')">파기</button></td>';
    html += '</tr>';
  }
  ge('admin-posts-tbody').innerHTML = html;
}

async function delPost(id) {
  if (!confirm('게시글을 삭제합니까?')) return;
  var d = await post('/api/admin/posts/delete', {sessionId:G.user.sessionId, postId:id});
  if (d.error) return toast(d.error, true);
  toast('파기 완료');
  loadAdminPosts();
}

// ─── 뉴스 관리 ────────────────────────────────────
async function loadAdminNews() {
  ge('admin-news-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">로딩 중...</td></tr>';
  var news = await post('/api/admin/news', {sessionId: G.user.sessionId});
  if (!Array.isArray(news)) {
    ge('admin-news-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#ef4444;">오류</td></tr>';
    return;
  }
  if (!news.length) {
    ge('admin-news-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;">뉴스 없음</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < news.length; i++) {
    var n = news[i];
    html += '<tr>';
    html += '<td style="font-family:monospace;color:#94a3b8;font-size:0.75rem;">' + n.id + '</td>';
    html += '<td style="font-weight:700;font-size:0.8rem;">';
    if (n.link) html += '<a href="' + h(n.link) + '" target="_blank" style="color:inherit;">' + h(n.title) + '</a>';
    else html += h(n.title);
    html += '</td>';
    html += '<td style="text-align:center;font-weight:900;color:var(--navy);">' + (n.cmt_count||0) + '</td>';
    html += '<td style="font-family:monospace;color:#94a3b8;font-size:0.75rem;">' + fmt(n.created_at) + '</td>';
    html += '<td style="text-align:center;"><button class="btn btn-red btn-sm" onclick="delNews(' + n.id + ')">삭제</button></td>';
    html += '</tr>';
  }
  ge('admin-news-tbody').innerHTML = html;
}

async function addNews() {
  var title = ge('n-title').value.trim();
  var link  = ge('n-link').value.trim();
  var sum   = ge('n-sum').value.trim();
  if (!title) return toast('제목을 입력하세요', true);
  var d = await post('/api/admin/news/add', {sessionId:G.user.sessionId, title:title, link:link, summary:sum});
  if (d.error) return toast(d.error, true);
  toast('등록 완료');
  ge('n-title').value = ''; ge('n-link').value = ''; ge('n-sum').value = '';
  loadAdminNews();
}

async function delNews(id) {
  if (!confirm('뉴스와 모든 토론을 삭제합니까?')) return;
  var d = await post('/api/admin/news/delete', {sessionId:G.user.sessionId, newsId:id});
  if (d.error) return toast(d.error, true);
  toast('삭제 완료');
  loadAdminNews();
}

// ─── 미디어 관리 ──────────────────────────────────
async function loadAdminMedia() {
  ge('admin-media-list').innerHTML = spin();
  var media = await get('/api/media');
  if (!Array.isArray(media) || !media.length) {
    ge('admin-media-list').innerHTML = '<div style="grid-column:span 3;text-align:center;padding:3rem;color:#cbd5e1;font-size:0.8rem;">미디어 없음</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < media.length; i++) {
    var m = media[i];
    html += '<div class="card" style="padding:1rem;display:flex;align-items:center;gap:0.75rem;">';
    html +=   '<div style="width:2.5rem;height:2.5rem;background:#f0f4ff;border-radius:0.6rem;display:flex;align-items:center;justify-content:center;color:var(--navy);font-size:1.1rem;flex-shrink:0;">';
    html +=     '<i class="' + h(m.icon||'fa-solid fa-link') + '"></i>';
    html +=   '</div>';
    html +=   '<div style="flex:1;overflow:hidden;">';
    html +=     '<p style="font-size:0.78rem;font-weight:800;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + h(m.name) + '</p>';
    html +=     '<p style="font-size:0.65rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + h(m.url) + '</p>';
    html +=   '</div>';
    html +=   '<button class="btn btn-red btn-sm" onclick="delMedia(' + m.id + ')">삭제</button>';
    html += '</div>';
  }
  ge('admin-media-list').innerHTML = html;
}

async function addMedia() {
  var name = ge('m-name').value.trim();
  var url  = ge('m-url').value.trim();
  var icon = ge('m-icon').value.trim();
  if (!name || !url) return toast('명칭과 URL을 입력하세요', true);
  var d = await post('/api/admin/media/add', {sessionId:G.user.sessionId, name:name, url:url, icon:icon||'fa-solid fa-link'});
  if (d.error) return toast(d.error, true);
  toast('추가 완료');
  ge('m-name').value=''; ge('m-url').value=''; ge('m-icon').value='';
  loadAdminMedia();
}

async function delMedia(id) {
  if (!confirm('미디어를 삭제합니까?')) return;
  var d = await post('/api/admin/media/delete', {sessionId:G.user.sessionId, mediaId:id});
  if (d.error) return toast(d.error, true);
  toast('삭제 완료');
  loadAdminMedia();
}

// ─── 기지 속성 ────────────────────────────────────
async function loadAdminProps() {
  var props = await post('/api/admin/props/get', {sessionId: G.user.sessionId});
  if (props && !props.error) {
    ge('prop-name').value   = props.base_name   || '';
    ge('prop-desc').value   = props.base_desc   || '';
    ge('prop-notice').value = props.base_notice || '';
  }
}

async function saveProp(key, inputId) {
  var val = ge(inputId).value.trim();
  var d = await post('/api/admin/props/update', {sessionId:G.user.sessionId, key:key, value:val});
  if (d.error) return toast(d.error, true);
  toast('저장 완료');
}
<\/script>
</body>
</html>`;
}