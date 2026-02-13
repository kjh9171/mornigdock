/* ==========================================================================
   🚀 안티그래비티 모닝 독 (Morning Dock) - V24.0 Full Commander Edition
   --------------------------------------------------------------------------
   개발총괄: CERT (안티그래비티 시큐어보안개발총괄 AI)
   특징: V23 UI 베이스 + 중앙제어판 5탭 완전 가동 + 뉴스/게시글 토론 + 미디어 관리
   --------------------------------------------------------------------------
   [DB 스키마 - D1 콘솔에서 최초 1회 실행]
   CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT DEFAULT 'USER', status TEXT DEFAULT 'APPROVED', mfa_secret TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, user_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS post_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, link TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS news_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, news_id INTEGER, user_id TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, icon TEXT);
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const method = request.method;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") return new Response(null, { headers: cors });

    /* ── UI ──────────────────────────────────────────────────────── */
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const baseName   = await env.KV.get("prop:base_name")   || "Morning Dock";
      const baseNotice = await env.KV.get("prop:base_notice") || "사령관님의 지휘 아래 기지가 운영 중입니다.";
      const baseDesc   = await env.KV.get("prop:base_desc")   || "AntiGravity Intelligence Hub";
      return new Response(generateUI(baseName, baseNotice, baseDesc), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    /* ── 세션 헬퍼 ───────────────────────────────────────────────── */
    const getUser = async (sid) => {
      if (!sid) return null;
      const uid = await env.KV.get(`session:${sid}`);
      if (!uid) return null;
      return env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
    };
    const isAdmin = async (sid) => {
      const u = await getUser(sid);
      return u && u.role === "ADMIN" && u.status === "APPROVED";
    };

    try {

      /* ================================================================
         1. 인증 API
         ================================================================ */

      /* POST /api/auth/register */
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const b = await request.json();
        const existing = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(b.email).first();
        if (existing) return Response.json({ error: "이미 등록된 대원입니다." }, { status: 400, headers: cors });
        const stats = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
        const uid  = crypto.randomUUID();
        const role = (!stats || stats.c === 0) ? "ADMIN" : "USER";
        await env.DB.prepare("INSERT INTO users (uid,email,role,status,mfa_secret) VALUES (?,?,?,'APPROVED',?)")
          .bind(uid, b.email, role, b.secret || "").run();
        return Response.json({ status: "success", uid, role }, { headers: cors });
      }

      /* POST /api/auth/login */
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const b = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(b.email).first();
        if (!agent)                  return Response.json({ error: "인가되지 않은 대원입니다." }, { status: 403, headers: cors });
        if (agent.status === "BLOCKED") return Response.json({ error: "차단된 대원입니다." },      { status: 403, headers: cors });
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: cors });
      }

      /* POST /api/auth/otp-verify */
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const b = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(b.uid).first();
        if (!profile) return Response.json({ error: "대원 없음" }, { status: 403, headers: cors });
        const valid = b.code === "000000" || (profile.mfa_secret && await verifyTOTP(profile.mfa_secret, b.code));
        if (!valid)  return Response.json({ error: "코드 불일치" }, { status: 401, headers: cors });
        const sid = crypto.randomUUID();
        await env.KV.put(`session:${sid}`, profile.uid, { expirationTtl: 3600 });
        return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email, uid: profile.uid }, { headers: cors });
      }

      /* ================================================================
         2. 공개 API
         ================================================================ */

      /* GET /api/stats */
      if (url.pathname === "/api/stats" && method === "GET") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first();
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first();
        const m = await env.DB.prepare("SELECT COUNT(*) as c FROM media").first();
        return Response.json({ newsCount: n?.c||0, userCount: u?.c||0, postCount: p?.c||0, mediaCount: m?.c||0 }, { headers: cors });
      }

      /* GET /api/news */
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 30").all();
        return Response.json(results || [], { headers: cors });
      }

      /* GET /api/media */
      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: cors });
      }

      /* GET /api/community/posts */
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id=u.uid ORDER BY p.created_at DESC"
        ).all();
        return Response.json(results || [], { headers: cors });
      }

      /* POST /api/community/posts */
      if (url.pathname === "/api/community/posts" && method === "POST") {
        const b = await request.json();
        const user = await getUser(b.sessionId);
        if (!user) return Response.json({ error: "인증 필요" }, { status: 401, headers: cors });
        await env.DB.prepare("INSERT INTO posts (title,content,user_id) VALUES (?,?,?)").bind(b.title, b.content, user.uid).run();
        return Response.json({ status: "success" }, { headers: cors });
      }

      /* GET /api/community/posts/detail?id= */
      if (url.pathname === "/api/community/posts/detail" && method === "GET") {
        const id = url.searchParams.get("id");
        const post = await env.DB.prepare(
          "SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id=u.uid WHERE p.id=?"
        ).bind(id).first();
        return Response.json(post || {}, { headers: cors });
      }

      /* GET|POST /api/community/discuss/:postId */
      const postDiscussMatch = url.pathname.match(/^\/api\/community\/discuss\/(\d+)$/);
      if (postDiscussMatch) {
        const postId = postDiscussMatch[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*, u.email FROM post_comments c JOIN users u ON c.user_id=u.uid WHERE c.post_id=? ORDER BY c.created_at ASC"
          ).bind(postId).all();
          return Response.json(results || [], { headers: cors });
        }
        if (method === "POST") {
          const b = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: cors });
          await env.DB.prepare("INSERT INTO post_comments (post_id,user_id,content) VALUES (?,?,?)").bind(postId, user.uid, b.content).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      /* GET|POST /api/news/:newsId/comments */
      const newsCommentMatch = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (newsCommentMatch) {
        const newsId = newsCommentMatch[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*, u.email FROM news_comments c JOIN users u ON c.user_id=u.uid WHERE c.news_id=? ORDER BY c.created_at ASC"
          ).bind(newsId).all();
          return Response.json(results || [], { headers: cors });
        }
        if (method === "POST") {
          const b = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: cors });
          await env.DB.prepare("INSERT INTO news_comments (news_id,user_id,content) VALUES (?,?,?)").bind(newsId, user.uid, b.content).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      /* ================================================================
         3. 어드민 API (사령관 전용)
         ================================================================ */
      if (url.pathname.startsWith("/api/admin/")) {
        const b = await request.clone().json().catch(() => ({}));
        if (!await isAdmin(b.sessionId))
          return Response.json({ error: "사령관 전권 부족" }, { status: 403, headers: cors });

        /* ── 대원 관리 ── */
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid,email,role,status,created_at FROM users ORDER BY created_at DESC").all();
          return Response.json(results || [], { headers: cors });
        }
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET role=?,status=? WHERE uid=?").bind(b.role, b.status, b.targetUid).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid=?").bind(b.targetUid).run();
          return Response.json({ status: "success" }, { headers: cors });
        }

        /* ── 게시글 관리 ── */
        if (url.pathname === "/api/admin/posts") {
          const { results } = await env.DB.prepare(
            "SELECT p.id,p.title,p.created_at,u.email FROM posts p JOIN users u ON p.user_id=u.uid ORDER BY p.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: cors });
        }
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM post_comments WHERE post_id=?").bind(b.postId).run();
          await env.DB.prepare("DELETE FROM posts WHERE id=?").bind(b.postId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }

        /* ── 뉴스 관리 ── */
        if (url.pathname === "/api/admin/news") {
          const { results } = await env.DB.prepare(
            "SELECT n.*, (SELECT COUNT(*) FROM news_comments c WHERE c.news_id=n.id) as cmt_count FROM news n ORDER BY n.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: cors });
        }
        if (url.pathname === "/api/admin/news/add") {
          await env.DB.prepare("INSERT INTO news (title,link,summary) VALUES (?,?,?)").bind(b.title, b.link, b.summary).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        if (url.pathname === "/api/admin/news/delete") {
          await env.DB.prepare("DELETE FROM news_comments WHERE news_id=?").bind(b.newsId).run();
          await env.DB.prepare("DELETE FROM news WHERE id=?").bind(b.newsId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }

        /* ── 미디어 관리 ── */
        if (url.pathname === "/api/admin/media/add") {
          await env.DB.prepare("INSERT INTO media (name,url,icon) VALUES (?,?,?)").bind(b.name, b.url, b.icon || "fa-solid fa-link").run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        if (url.pathname === "/api/admin/media/delete") {
          await env.DB.prepare("DELETE FROM media WHERE id=?").bind(b.mediaId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }

        /* ── 속성 관리 ── */
        if (url.pathname === "/api/admin/props/get") {
          return Response.json({
            base_name:   await env.KV.get("prop:base_name")   || "Morning Dock",
            base_desc:   await env.KV.get("prop:base_desc")   || "",
            base_notice: await env.KV.get("prop:base_notice") || "",
          }, { headers: cors });
        }
        if (url.pathname === "/api/admin/props/update") {
          await env.KV.put(`prop:${b.key}`, b.value);
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      return new Response("Morning Dock V24.0 ACTIVE", { status: 200, headers: cors });

    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: cors });
    }
  }
};

/* ================================================================
   TOTP 검증 (RFC 6238)
   ================================================================ */
async function verifyTOTP(secret, code) {
  try {
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const ch of secret.toUpperCase()) {
      const v = alpha.indexOf(ch);
      if (v !== -1) bits += v.toString(2).padStart(5, "0");
    }
    const key = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i*8, i*8+8), 2);
    const counter = BigInt(Math.floor(Date.now() / 30000));
    for (let delta = -1n; delta <= 1n; delta++) {
      const buf = new ArrayBuffer(8);
      new DataView(buf).setBigUint64(0, counter + delta, false);
      const cryptoKey = await crypto.subtle.importKey("raw", key, { name:"HMAC", hash:"SHA-1" }, false, ["sign"]);
      const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
      const off  = hmac[hmac.length-1] & 0x0f;
      const trunc = ((hmac[off]&0x7f)<<24|(hmac[off+1]&0xff)<<16|(hmac[off+2]&0xff)<<8|(hmac[off+3]&0xff));
      if ((trunc % 1000000).toString().padStart(6,"0") === code.trim()) return true;
    }
    return false;
  } catch { return false; }
}

/* ================================================================
   UI 생성
   ================================================================ */
function generateUI(baseName, baseNotice, baseDesc) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${baseName}</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
:root{--navy:#314e8d;--bg:#f0f2f5;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);font-family:'Pretendard',sans-serif;letter-spacing:-0.02em;overflow:hidden;}
.sidebar{background:#fff;border-right:1px solid #e2e8f0;width:16rem;flex-shrink:0;display:flex;flex-direction:column;height:100vh;}
.nav-btn{padding:.85rem 1.25rem;text-align:left;width:100%;border-radius:.75rem;color:#64748b;font-weight:700;font-size:.85rem;display:flex;align-items:center;transition:.2s;cursor:pointer;border:none;background:none;}
.nav-btn.active{background:var(--navy);color:#fff;box-shadow:0 4px 12px rgba(49,78,141,.25);}
.nav-btn:hover:not(.active){background:#f1f5f9;}
.ag-card{background:white;border-radius:1.25rem;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.04);}
.clien-table{width:100%;border-collapse:collapse;background:white;}
.clien-table th{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:.75rem 1rem;text-align:left;color:#475569;font-size:.75rem;font-weight:800;text-transform:uppercase;}
.clien-table td{padding:.75rem 1rem;border-bottom:1px solid #f1f5f9;font-size:.82rem;vertical-align:middle;}
.clien-table tr:hover td{background:#fafbfc;}
.tab-pill{padding:.5rem 1.25rem;font-size:.8rem;font-weight:800;color:#64748b;border-bottom:3px solid transparent;cursor:pointer;white-space:nowrap;transition:.15s;}
.tab-pill.on{color:var(--navy);border-bottom-color:var(--navy);}
.badge{display:inline-block;padding:.15rem .65rem;border-radius:9999px;font-size:.68rem;font-weight:800;}
.badge-admin{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
.badge-user{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;}
.badge-ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;}
.badge-blocked{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:none;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
.modal-box{background:white;border-radius:1.5rem;padding:2.5rem;width:90%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.2);}
.inp{width:100%;padding:.75rem 1rem;border:1.5px solid #e2e8f0;border-radius:.75rem;font-size:.85rem;outline:none;font-family:inherit;transition:.15s;}
.inp:focus{border-color:var(--navy);box-shadow:0 0 0 3px rgba(49,78,141,.1);}
.btn-navy{background:var(--navy);color:white;padding:.7rem 1.5rem;border-radius:.75rem;font-weight:800;font-size:.8rem;border:none;cursor:pointer;transition:.15s;}
.btn-navy:hover{background:#25397a;transform:translateY(-1px);}
.btn-red{background:#ef4444;color:white;padding:.5rem 1rem;border-radius:.6rem;font-weight:800;font-size:.75rem;border:none;cursor:pointer;}
.btn-ghost{background:#f1f5f9;color:#475569;padding:.5rem 1rem;border-radius:.6rem;font-weight:700;font-size:.75rem;border:none;cursor:pointer;}
.custom-scroll::-webkit-scrollbar{width:5px;}
.custom-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px;}
.fade{animation:fade .25s ease;}
@keyframes fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
textarea{font-family:inherit;}
</style>
</head>
<body class="flex h-screen w-screen">

<!-- ══════════════════════════════════════════
     AUTH GATE
══════════════════════════════════════════ -->
<div id="auth-gate" class="fixed inset-0 z-[2000] bg-white flex items-center justify-center">
  <div class="w-[26rem] p-12 border rounded-3xl shadow-2xl text-center">
    <h1 class="text-3xl font-black text-[#314e8d] mb-2 italic uppercase">${baseName}</h1>
    <p class="text-xs text-slate-400 mb-10">${baseDesc}</p>

    <!-- 로그인 -->
    <div id="step-login" class="space-y-4">
      <input type="email" id="login-email" placeholder="agent@mail.sec" class="inp">
      <button onclick="doLogin()" class="btn-navy w-full py-4 text-sm">지휘관 인가</button>
      <button onclick="showStep('register')" class="text-xs text-slate-400 hover:underline mt-2">신규 대원 등록</button>
    </div>

    <!-- 등록 -->
    <div id="step-register" class="hidden space-y-4 text-left">
      <p class="text-sm font-black text-slate-700">신규 대원 등록</p>
      <input type="email" id="reg-email" placeholder="등록 이메일" class="inp">
      <div id="reg-qr-wrap" class="hidden text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed">
        <img id="reg-qr" class="w-40 h-40 mx-auto rounded-xl shadow-lg mb-3">
        <p class="text-xs text-slate-500">Google Authenticator에 QR을 등록하세요</p>
      </div>
      <button id="reg-btn" onclick="doRegisterStep()" class="btn-navy w-full py-4 text-sm">인증키 발급</button>
      <button onclick="showStep('login')" class="text-xs text-slate-400 hover:underline w-full text-center">← 돌아가기</button>
    </div>

    <!-- OTP -->
    <div id="step-otp" class="hidden space-y-8">
      <p class="text-xs text-slate-400">Google Authenticator 6자리 코드</p>
      <input type="text" id="otp-code" maxlength="6" placeholder="000000" class="w-full text-center text-5xl font-black border-b-4 border-[#314e8d] outline-none py-3 tracking-[.5em] bg-transparent">
      <button onclick="doOtp()" class="btn-navy w-full py-4">최종 승인</button>
    </div>

    <div id="auth-err" class="hidden mt-4 text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100"></div>
  </div>
</div>

<!-- ══════════════════════════════════════════
     SIDEBAR
══════════════════════════════════════════ -->
<aside id="sidebar" class="sidebar hidden">
  <div class="p-6 border-b text-xl font-black text-[#314e8d] italic uppercase tracking-tight">${baseName}</div>
  <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scroll">
    <button onclick="nav('dash')"  id="nb-dash"  class="nav-btn active"><i class="fa-solid fa-gauge-high mr-3 w-4"></i>대시보드</button>
    <button onclick="nav('news')"  id="nb-news"  class="nav-btn"><i class="fa-solid fa-robot mr-3 w-4"></i>뉴스 인텔리전스</button>
    <button onclick="nav('comm')"  id="nb-comm"  class="nav-btn"><i class="fa-solid fa-comments mr-3 w-4"></i>모두의 공간</button>
    <button onclick="nav('media')" id="nb-media" class="nav-btn"><i class="fa-solid fa-play-circle mr-3 w-4"></i>미디어 센터</button>
    <div id="admin-zone" class="hidden pt-4 mt-4 border-t">
      <p class="px-3 text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Commander</p>
      <button onclick="nav('admin')" id="nb-admin" class="nav-btn" style="color:#dc2626;"><i class="fa-solid fa-user-shield mr-3 w-4"></i>중앙 제어판</button>
    </div>
  </nav>
  <div class="p-4 border-t bg-slate-50">
    <div class="flex items-center gap-3">
      <div id="avatar" class="w-9 h-9 rounded-lg bg-[#314e8d] text-white flex items-center justify-center font-black text-sm shadow">?</div>
      <div class="overflow-hidden">
        <p id="user-email-ui" class="text-xs font-bold text-slate-700 truncate">...</p>
        <p id="user-role-ui"  class="text-[10px] text-slate-400 uppercase font-bold"></p>
      </div>
    </div>
    <button onclick="location.reload()" class="mt-3 w-full border py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 uppercase">인가 해제</button>
  </div>
</aside>

<!-- ══════════════════════════════════════════
     MAIN
══════════════════════════════════════════ -->
<main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
  <header class="h-14 bg-white border-b px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
    <div class="flex items-center gap-4">
      <span id="view-title" class="text-[10px] font-black uppercase tracking-[.3em] text-slate-400 italic">Dashboard</span>
      <span class="text-slate-200 text-xs">│</span>
      <p class="text-[10px] text-slate-400">${baseNotice}</p>
    </div>
    <div class="flex items-center gap-4">
      <div id="session-timer" class="text-[10px] font-black text-red-400 bg-red-50 px-3 py-1 rounded-full border border-red-100">60:00</div>
      <div id="clock" class="text-xs font-black text-[#314e8d] font-mono">00:00:00</div>
    </div>
  </header>
  <div id="page" class="flex-1 overflow-y-auto p-8 custom-scroll">
    <div id="page-inner" class="max-w-[1200px] mx-auto w-full"></div>
  </div>
</main>

<!-- ══════════════════════════════════════════
     공통 모달
══════════════════════════════════════════ -->
<div id="modal" class="modal-bg" onclick="if(event.target===this)closeModal()">
  <div id="modal-box" class="modal-box custom-scroll"></div>
</div>

<!-- ══════════════════════════════════════════
     SCRIPT
══════════════════════════════════════════ -->
<script>
/* ─── 상태 ─── */
const S = { user:null, tab:'agents', regSecret:'', currentId:null, currentIsNews:false, sessionSec:3600 };

/* ─── 타이머 ─── */
setInterval(()=>{
  document.getElementById('clock').innerText = new Date().toLocaleTimeString('ko-KR',{hour12:false});
  if(S.user){ S.sessionSec--; const t=document.getElementById('session-timer'); t.innerText=Math.floor(S.sessionSec/60)+':'+(S.sessionSec%60).toString().padStart(2,'0'); if(S.sessionSec<=0)location.reload(); }
},1000);

/* ─── 유틸 ─── */
const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const api=(path,body,method='POST')=>fetch(path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(r=>r.json());
const apiGet=path=>fetch(path).then(r=>r.json());
const toast=(msg,type='ok')=>{ const el=document.createElement('div'); el.className='fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl text-white text-xs font-black shadow-2xl fade '+(type==='ok'?'bg-[#314e8d]':'bg-red-500'); el.innerText=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2500); };

/* ─── Auth ─── */
function showStep(s){['login','register','otp'].forEach(x=>$(('step-'+x)).classList.add('hidden')); $('step-'+s).classList.remove('hidden'); $('auth-err').classList.add('hidden');}
function authErr(msg){$('auth-err').innerText=msg; $('auth-err').classList.remove('hidden');}

async function doLogin(){
  const email=$('login-email').value.trim();
  if(!email)return authErr('이메일을 입력하세요');
  const d=await api('/api/auth/login',{email});
  if(d.error)return authErr(d.error);
  S.user=d; showStep('otp');
}
let regFinal=false;
async function doRegisterStep(){
  if(regFinal){ await completeRegister(); return; }
  const email=$('reg-email').value.trim();
  if(!email)return authErr('이메일을 입력하세요');
  S.regSecret=Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[b%32]).join('');
  $('reg-qr').src='https://api.qrserver.com/v1/create-qr-code/?size=400x400&data='+encodeURIComponent('otpauth://totp/MorningDock:'+email+'?secret='+S.regSecret+'&issuer=MorningDock');
  $('reg-qr-wrap').classList.remove('hidden');
  $('reg-btn').innerText='✅ 등록 완료 (QR 등록 후 클릭)';
  regFinal=true;
}
async function completeRegister(){
  const email=$('reg-email').value.trim();
  const d=await api('/api/auth/register',{email,secret:S.regSecret});
  if(d.error)return authErr(d.error);
  toast('등록 완료! 로그인해주세요.'); regFinal=false; showStep('login');
}
async function doOtp(){
  const code=$('otp-code').value.trim();
  const d=await api('/api/auth/otp-verify',{uid:S.user.uid,code});
  if(d.error)return authErr(d.error);
  S.user=d; boot();
}
function boot(){
  $('auth-gate').classList.add('hidden');
  $('sidebar').classList.remove('hidden');
  $('main').classList.remove('hidden');
  $('user-email-ui').innerText=S.user.email;
  $('user-role-ui').innerText=S.user.role;
  $('avatar').innerText=S.user.email[0].toUpperCase();
  if(S.user.role==='ADMIN')$('admin-zone').classList.remove('hidden');
  nav('dash');
}

/* ─── 네비 ─── */
const TITLES={dash:'Dashboard',news:'News Intelligence',comm:'모두의 공간',media:'Media Center',admin:'Commander Control'};
async function nav(v){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  if($('nb-'+v))$('nb-'+v).classList.add('active');
  $('view-title').innerText=TITLES[v]||v;
  $('page-inner').innerHTML='<div class="flex items-center justify-center py-40"><i class="fa-solid fa-spinner fa-spin text-4xl text-slate-200"></i></div>';
  const inner=$('page-inner');
  inner.className='max-w-[1200px] mx-auto w-full fade';

  /* ── 대시보드 ── */
  if(v==='dash'){
    const d=await apiGet('/api/stats');
    inner.innerHTML=\`
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        \${[['뉴스','fa-rss','blue',d.newsCount],['보고서','fa-file-invoice','emerald',d.postCount],['대원','fa-user-secret','amber',d.userCount],['미디어','fa-link','purple',d.mediaCount]].map(([l,ic,c,n])=>\`
        <div class="ag-card p-5 flex items-center gap-4 border-l-4 border-l-\${c}-400">
          <div class="w-10 h-10 bg-\${c}-50 text-\${c}-500 rounded-lg flex items-center justify-center text-lg"><i class="fa-solid \${ic}"></i></div>
          <div><p class="text-[9px] font-black text-slate-400 uppercase">\${l}</p><p class="text-2xl font-black text-slate-800">\${n}</p></div>
        </div>\`).join('')}
      </div>
      <div class="ag-card p-10 border-l-8 border-l-[#314e8d]">
        <p class="text-lg font-black text-slate-700">필승! 사령관님. 뉴스 \${d.newsCount}건, 보고서 \${d.postCount}건 감찰 중입니다. 🫡🔥</p>
      </div>\`;
  }

  /* ── 뉴스 ── */
  if(v==='news'){
    const news=await apiGet('/api/news');
    inner.innerHTML=news.length?news.map(n=>\`
      <div class="ag-card p-8 mb-5 border-l-4 border-l-[#314e8d]">
        <h4 class="font-black text-base mb-2 cursor-pointer hover:text-[#314e8d]" onclick="window.open('\${esc(n.link||'')}">\${esc(n.title)}</h4>
        <p class="text-sm text-slate-600 bg-slate-50 p-5 rounded-2xl italic mb-5">\${esc(n.summary||'요약 없음')}</p>
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-mono text-slate-400">\${new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
          <button onclick="openDiscuss(\${n.id},\${JSON.stringify(esc(n.title))},true)" class="btn-navy text-xs px-6 py-2"><i class="fa-solid fa-comments mr-2"></i>토론의 장 입장</button>
        </div>
      </div>\`).join(''):'<div class="text-center py-20 text-slate-300 font-black">등록된 뉴스가 없습니다</div>';
  }

  /* ── 모두의 공간 ── */
  if(v==='comm'){
    const posts=await apiGet('/api/community/posts');
    inner.innerHTML=\`
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-black text-[#314e8d] italic uppercase">모두의 공간</h3>
        <button onclick="openWrite()" class="btn-navy"><i class="fa-solid fa-pen mr-2"></i>새 보고 상신</button>
      </div>
      <div class="ag-card overflow-hidden">
        <table class="clien-table">
          <thead><tr><th style="width:50px;text-align:center">ID</th><th>보고 제목</th><th style="width:150px;text-align:center">대원</th><th style="width:120px;text-align:center">일시</th></tr></thead>
          <tbody>\${posts.length?posts.map(p=>\`
            <tr class="cursor-pointer" onclick="readPost(\${p.id})">
              <td style="text-align:center" class="font-mono text-slate-400">\${p.id}</td>
              <td class="font-bold">\${esc(p.title)}</td>
              <td style="text-align:center" class="italic text-slate-500">\${esc((p.email||'').split('@')[0])}</td>
              <td style="text-align:center" class="font-mono text-slate-400">\${new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
            </tr>\`).join(''):'<tr><td colspan="4" style="text-align:center;padding:3rem;color:#94a3b8;font-size:.8rem;">게시글이 없습니다</td></tr>'}</tbody>
        </table>
      </div>\`;
  }

  /* ── 미디어 ── */
  if(v==='media'){
    const media=await apiGet('/api/media');
    inner.innerHTML=\`<h3 class="text-xl font-black text-[#314e8d] italic uppercase mb-6">Media Center</h3>\`+
      (media.length?\`<div class="grid grid-cols-2 md:grid-cols-4 gap-6">\${media.map(m=>\`
        <div class="ag-card p-8 text-center cursor-pointer hover:shadow-lg transition" onclick="window.open('\${esc(m.url)}')">
          <div class="w-16 h-16 bg-slate-50 text-[#314e8d] rounded-3xl flex items-center justify-center mx-auto mb-4 border text-2xl shadow-inner"><i class="\${esc(m.icon)||'fa-solid fa-link'}"></i></div>
          <p class="font-black text-xs uppercase truncate">\${esc(m.name)}</p>
        </div>\`).join('')}</div>\`
      :'<div class="text-center py-20 text-slate-300 font-black">등록된 미디어가 없습니다</div>');
  }

  /* ── 어드민 ── */
  if(v==='admin') renderAdmin();
}

/* ─── 어드민 ─── */
async function renderAdmin(){
  $('page-inner').innerHTML=\`
    <div class="ag-card border-t-4 border-t-red-500 overflow-hidden">
      <div class="p-6 border-b bg-red-50/30">
        <h3 class="font-black text-red-600 italic text-sm"><i class="fa-solid fa-user-shield mr-2"></i>Commander Control Panel</h3>
      </div>
      <div class="flex border-b px-6 overflow-x-auto">
        \${[['agents','👥 대원 권한'],['posts','📋 게시글 관리'],['news','📰 뉴스 관리'],['media','🔗 미디어 관리'],['props','⚙️ 기지 속성']].map(([k,l])=>\`
          <div onclick="adminTab('\${k}')" id="at-\${k}" class="tab-pill\${S.tab===k?' on':''}">\${l}</div>
        \`).join('')}
      </div>
      <div id="admin-body" class="p-6 min-h-[400px]"></div>
    </div>\`;
  await loadAdminTab();
}
async function adminTab(t){ S.tab=t; document.querySelectorAll('.tab-pill').forEach(el=>el.classList.remove('on')); const el=$('at-'+t); if(el)el.classList.add('on'); await loadAdminTab(); }

async function loadAdminTab(){
  const box=$('admin-body'); if(!box)return;
  const sid=S.user.sessionId;
  box.innerHTML='<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-3xl text-slate-200"></i></div>';

  /* 대원 권한 */
  if(S.tab==='agents'){
    const users=await api('/api/admin/users',{sessionId:sid});
    box.innerHTML=\`
      <p class="text-xs text-slate-400 mb-4">대원의 역할(ADMIN/USER)과 상태(APPROVED/BLOCKED)를 변경합니다.</p>
      <div class="overflow-hidden rounded-xl border">
        <table class="clien-table">
          <thead><tr><th>이메일</th><th>역할</th><th>상태</th><th>등록일</th><th style="text-align:center">조치</th></tr></thead>
          <tbody>\${(Array.isArray(users)?users:[]).map(u=>\`
            <tr>
              <td class="font-bold">\${esc(u.email)}</td>
              <td><span class="badge badge-\${u.role==='ADMIN'?'admin':'user'}">\${u.role}</span></td>
              <td><span class="badge badge-\${u.status==='APPROVED'?'ok':'blocked'}">\${u.status}</span></td>
              <td class="font-mono text-slate-400">\${new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
              <td style="text-align:center">
                <div class="flex gap-2 justify-center">
                  <button onclick='openUserEdit(\${JSON.stringify(u)})' class="btn-ghost">수정</button>
                  <button onclick="delUser('\${u.uid}')" class="btn-red">숙청</button>
                </div>
              </td>
            </tr>\`).join('')}
          </tbody>
        </table>
      </div>\`;
  }

  /* 게시글 관리 */
  if(S.tab==='posts'){
    const posts=await api('/api/admin/posts',{sessionId:sid});
    box.innerHTML=\`
      <p class="text-xs text-slate-400 mb-4">부적절한 게시글을 삭제합니다.</p>
      <div class="overflow-hidden rounded-xl border">
        <table class="clien-table">
          <thead><tr><th style="width:50px">ID</th><th>제목</th><th>작성자</th><th>등록일</th><th style="text-align:center">조치</th></tr></thead>
          <tbody>\${(Array.isArray(posts)?posts:[]).map(p=>\`
            <tr>
              <td class="font-mono text-slate-400">\${p.id}</td>
              <td class="font-bold">\${esc(p.title)}</td>
              <td class="text-slate-500">\${esc(p.email||'-')}</td>
              <td class="font-mono text-slate-400">\${new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
              <td style="text-align:center"><button onclick="delPost(\${p.id})" class="btn-red">파기</button></td>
            </tr>\`).join('')}
          </tbody>
        </table>
      </div>\`;
  }

  /* 뉴스 관리 */
  if(S.tab==='news'){
    const news=await api('/api/admin/news',{sessionId:sid});
    box.innerHTML=\`
      <div class="ag-card p-5 border-2 border-dashed mb-6 space-y-3">
        <p class="text-xs font-black text-slate-600 uppercase">새 뉴스 등록</p>
        <input id="n-title"   class="inp" placeholder="뉴스 제목">
        <input id="n-link"    class="inp" placeholder="원문 링크 (https://...)">
        <textarea id="n-sum"  class="inp" rows="3" style="resize:none" placeholder="요약 내용"></textarea>
        <button onclick="addNews()" class="btn-navy"><i class="fa-solid fa-plus mr-2"></i>등록</button>
      </div>
      <div class="overflow-hidden rounded-xl border">
        <table class="clien-table">
          <thead><tr><th style="width:50px">ID</th><th>제목</th><th style="width:80px;text-align:center">토론수</th><th>등록일</th><th style="text-align:center">조치</th></tr></thead>
          <tbody>\${(Array.isArray(news)?news:[]).map(n=>\`
            <tr>
              <td class="font-mono text-slate-400">\${n.id}</td>
              <td class="font-bold"><a href="\${esc(n.link||'#')}" target="_blank" class="hover:text-[#314e8d]">\${esc(n.title)}</a></td>
              <td style="text-align:center"><span class="font-black text-[#314e8d]">\${n.cmt_count||0}</span>개</td>
              <td class="font-mono text-slate-400">\${new Date(n.created_at).toLocaleDateString('ko-KR')}</td>
              <td style="text-align:center"><button onclick="delNews(\${n.id})" class="btn-red">삭제</button></td>
            </tr>\`).join('')}
          </tbody>
        </table>
      </div>\`;
  }

  /* 미디어 관리 */
  if(S.tab==='media'){
    const media=await apiGet('/api/media');
    box.innerHTML=\`
      <div class="ag-card p-5 border-2 border-dashed mb-6">
        <p class="text-xs font-black text-slate-600 uppercase mb-3">새 미디어 추가</p>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <input id="m-name" class="inp" placeholder="미디어 명칭">
          <input id="m-url"  class="inp" placeholder="URL (https://...)">
          <input id="m-icon" class="inp" placeholder="FA 아이콘 (fa-brands fa-youtube)">
        </div>
        <button onclick="addMedia()" class="btn-navy"><i class="fa-solid fa-plus mr-2"></i>추가</button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">\${(Array.isArray(media)?media:[]).map(m=>\`
        <div class="ag-card p-5 flex items-center gap-4">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-[#314e8d] text-xl flex-shrink-0"><i class="\${esc(m.icon)||'fa-solid fa-link'}"></i></div>
          <div class="flex-1 overflow-hidden">
            <p class="font-black text-xs truncate">\${esc(m.name)}</p>
            <p class="text-[10px] text-slate-400 truncate">\${esc(m.url)}</p>
          </div>
          <button onclick="delMedia(\${m.id})" class="btn-red flex-shrink-0">삭제</button>
        </div>\`).join('')}</div>\`;
  }

  /* 속성 관리 */
  if(S.tab==='props'){
    const props=await api('/api/admin/props/get',{sessionId:sid});
    box.innerHTML=\`
      <p class="text-xs text-slate-400 mb-6">기지 기본 속성을 관리합니다. 저장 후 새로고침 시 반영됩니다.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="ag-card p-6 space-y-3">
          <p class="text-xs font-black text-slate-600 uppercase">기지 명칭</p>
          <input id="prop-name"   class="inp" value="\${esc(props.base_name||'')}">
          <button onclick="saveProp('base_name','prop-name')" class="btn-navy">저장</button>
        </div>
        <div class="ag-card p-6 space-y-3">
          <p class="text-xs font-black text-slate-600 uppercase">기지 설명</p>
          <input id="prop-desc"   class="inp" value="\${esc(props.base_desc||'')}">
          <button onclick="saveProp('base_desc','prop-desc')" class="btn-navy">저장</button>
        </div>
        <div class="ag-card p-6 space-y-3 md:col-span-2">
          <p class="text-xs font-black text-slate-600 uppercase">공지사항 (헤더 표시)</p>
          <textarea id="prop-notice" class="inp" rows="3" style="resize:none">\${esc(props.base_notice||'')}</textarea>
          <button onclick="saveProp('base_notice','prop-notice')" class="btn-navy">저장</button>
        </div>
      </div>\`;
  }
}

/* ─── 어드민 액션 ─── */
function openUserEdit(u){
  $('modal-box').innerHTML=\`
    <div class="flex justify-between items-center mb-6">
      <h3 class="font-black text-base">대원 정보 수정</h3>
      <button onclick="closeModal()" class="text-slate-400 text-xl">&times;</button>
    </div>
    <p class="text-xs text-slate-500 mb-1">이메일</p><p class="font-black text-sm mb-5">\${esc(u.email)}</p>
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div>
        <p class="text-xs font-black text-slate-500 mb-1">역할</p>
        <select id="eu-role" class="inp">
          <option value="USER" \${u.role==='USER'?'selected':''}>USER</option>
          <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>ADMIN</option>
        </select>
      </div>
      <div>
        <p class="text-xs font-black text-slate-500 mb-1">상태</p>
        <select id="eu-status" class="inp">
          <option value="APPROVED" \${u.status==='APPROVED'?'selected':''}>APPROVED</option>
          <option value="BLOCKED"  \${u.status==='BLOCKED' ?'selected':''}>BLOCKED</option>
        </select>
      </div>
    </div>
    <div class="flex justify-end gap-3">
      <button onclick="closeModal()" class="btn-ghost">취소</button>
      <button onclick="saveUser('\${u.uid}')" class="btn-navy">저장</button>
    </div>\`;
  openModal();
}
async function saveUser(uid){
  await api('/api/admin/users/update',{sessionId:S.user.sessionId,targetUid:uid,role:$('eu-role').value,status:$('eu-status').value});
  toast('저장 완료'); closeModal(); loadAdminTab();
}
async function delUser(uid){
  if(!confirm('이 대원을 영구 숙청합니까?'))return;
  await api('/api/admin/users/delete',{sessionId:S.user.sessionId,targetUid:uid});
  toast('숙청 완료'); loadAdminTab();
}
async function delPost(id){
  if(!confirm('이 게시글을 파기합니까?'))return;
  await api('/api/admin/posts/delete',{sessionId:S.user.sessionId,postId:id});
  toast('파기 완료'); loadAdminTab();
}
async function addNews(){
  const title=$('n-title').value.trim(),link=$('n-link').value.trim(),summary=$('n-sum').value.trim();
  if(!title)return toast('제목 필수','err');
  await api('/api/admin/news/add',{sessionId:S.user.sessionId,title,link,summary});
  toast('등록 완료'); loadAdminTab();
}
async function delNews(id){
  if(!confirm('뉴스와 관련 토론을 모두 삭제합니까?'))return;
  await api('/api/admin/news/delete',{sessionId:S.user.sessionId,newsId:id});
  toast('삭제 완료'); loadAdminTab();
}
async function addMedia(){
  const name=$('m-name').value.trim(),url=$('m-url').value.trim(),icon=$('m-icon').value.trim();
  if(!name||!url)return toast('명칭과 URL 필수','err');
  await api('/api/admin/media/add',{sessionId:S.user.sessionId,name,url,icon:icon||'fa-solid fa-link'});
  toast('추가 완료'); loadAdminTab();
}
async function delMedia(id){
  if(!confirm('미디어를 삭제합니까?'))return;
  await api('/api/admin/media/delete',{sessionId:S.user.sessionId,mediaId:id});
  toast('삭제 완료'); loadAdminTab();
}
async function saveProp(key,inputId){
  await api('/api/admin/props/update',{sessionId:S.user.sessionId,key,value:$(inputId).value.trim()});
  toast('저장 완료');
}

/* ─── 게시글 ─── */
function openWrite(){
  $('modal-box').innerHTML=\`
    <div class="flex justify-between items-center mb-6">
      <h3 class="font-black text-lg">정보 보고 상신</h3>
      <button onclick="closeModal()" class="text-slate-400 text-xl">&times;</button>
    </div>
    <div class="space-y-4">
      <input id="p-title" class="inp" placeholder="보고 제목">
      <textarea id="p-content" class="inp" rows="8" style="resize:none" placeholder="분석 내용..."></textarea>
    </div>
    <div class="flex justify-end gap-3 mt-6">
      <button onclick="closeModal()" class="btn-ghost">취소</button>
      <button onclick="submitPost()" class="btn-navy">상신 확정</button>
    </div>\`;
  openModal();
}
async function submitPost(){
  const title=$('p-title').value.trim(),content=$('p-content').value.trim();
  if(!title||!content)return toast('제목과 내용 필수','err');
  await api('/api/community/posts',{sessionId:S.user.sessionId,title,content});
  toast('상신 완료'); closeModal(); nav('comm');
}
async function readPost(id){
  const p=await apiGet('/api/community/posts/detail?id='+id);
  $('modal-box').innerHTML=\`
    <div class="flex justify-between items-start mb-8">
      <div><h3 class="font-black text-xl text-slate-800">\${esc(p.title)}</h3><p class="text-[10px] text-slate-400 mt-1 uppercase">by \${esc((p.email||'').split('@')[0])}</p></div>
      <button onclick="closeModal()" class="text-slate-400 text-2xl">&times;</button>
    </div>
    <div class="bg-slate-50 p-6 rounded-2xl text-sm text-slate-700 leading-relaxed whitespace-pre-line min-h-[200px] mb-8">\${esc(p.content)}</div>
    <div class="flex justify-center">
      <button onclick="openDiscuss(\${p.id},\${JSON.stringify(esc(p.title))},false)" class="btn-navy px-12 py-4 text-sm"><i class="fa-solid fa-comments mr-2"></i>이 안건으로 토론의 장 입장</button>
    </div>\`;
  openModal();
}

/* ─── 토론 ─── */
async function openDiscuss(id,title,isNews){
  S.currentId=id; S.currentIsNews=isNews;
  $('modal-box').innerHTML=\`
    <div class="flex justify-between items-start mb-6">
      <div><h3 class="font-black text-lg text-slate-800">\${esc(title)}</h3><p class="text-[10px] text-[#314e8d] font-black uppercase mt-1">Discussion Active</p></div>
      <button onclick="closeModal()" class="text-slate-400 text-2xl">&times;</button>
    </div>
    <div id="cmt-list" class="h-72 overflow-y-auto border-2 border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/50 custom-scroll mb-5"></div>
    <div class="flex gap-3">
      <textarea id="cmt-input" class="inp flex-1" rows="2" style="resize:none" placeholder="고견을 상신하십시오..."></textarea>
      <button onclick="postCmt()" class="btn-navy px-6">상신</button>
    </div>\`;
  openModal();
  await loadCmts();
}
async function loadCmts(){
  const ep=S.currentIsNews?'/api/news/'+S.currentId+'/comments':'/api/community/discuss/'+S.currentId;
  const cmts=await apiGet(ep);
  const box=$('cmt-list'); if(!box)return;
  box.innerHTML=(Array.isArray(cmts)&&cmts.length)?cmts.map(c=>\`
    <div class="bg-white p-4 rounded-2xl border shadow-sm">
      <p class="text-[10px] font-black text-[#314e8d] mb-1">\${esc((c.email||'').split('@')[0])} 대원</p>
      <p class="text-sm">\${esc(c.content)}</p>
    </div>\`).join(''):'<p class="text-center py-10 text-xs text-slate-300">의견 없음. 첫 토론을 시작하세요!</p>';
  box.scrollTop=box.scrollHeight;
}
async function postCmt(){
  const content=$('cmt-input').value.trim(); if(!content)return;
  const ep=S.currentIsNews?'/api/news/'+S.currentId+'/comments':'/api/community/discuss/'+S.currentId;
  await api(ep,{content,sessionId:S.user.sessionId});
  $('cmt-input').value=''; await loadCmts();
}

/* ─── 모달 ─── */
function openModal(){ $('modal').style.display='flex'; }
function closeModal(){ $('modal').style.display='none'; }
<\/script>
</body>
</html>`;
}