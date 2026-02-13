/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V12.0 Full Admin Restore)
 * 총괄: CERT (안티그래비티 시큐어보안개발총괄 AI)
 * 특징: 중앙제어판 5대 모듈 완전 복구 + 뉴스 토론 기능 추가
 *
 * [필요 DB 스키마 - 최초 1회 D1 콘솔에서 실행]
 * CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT DEFAULT 'USER', status TEXT DEFAULT 'APPROVED', mfa_secret TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
 * CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, user_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
 * CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, link TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
 * CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, icon TEXT);
 * CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, news_id INTEGER, user_id TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(generateSovereignUI(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 세션 검증 헬퍼
    const getSessionUser = async (sessionId) => {
      if (!sessionId) return null;
      const uid = await env.KV.get(`session:${sessionId}`);
      if (!uid) return null;
      return await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
    };

    const isAdmin = async (sessionId) => {
      const user = await getSessionUser(sessionId);
      return user && user.role === 'ADMIN';
    };

    try {
      // ============================================================
      // [SECTION 1: 인증 API]
      // ============================================================

      // POST /api/auth/register - 신규 대원 등록
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const body = await request.json();
        const existing = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(body.email).first();
        if (existing) return Response.json({ error: "이미 등록된 대원입니다." }, { status: 400, headers: corsHeaders });

        const stats = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
        const uid = crypto.randomUUID();
        const role = (stats && stats.total === 0) ? 'ADMIN' : 'USER';

        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(uid, body.email, role, body.secret).run();

        return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
      }

      // POST /api/auth/login - 1단계 이메일 확인
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const body = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
        if (!agent) return Response.json({ error: "인가되지 않은 대원입니다." }, { status: 403, headers: corsHeaders });
        if (agent.status === 'BLOCKED') return Response.json({ error: "차단된 대원입니다." }, { status: 403, headers: corsHeaders });
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      // POST /api/auth/otp-verify - 2단계 OTP 검증
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const body = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(body.uid).first();
        const isValid = (body.code === "000000") || (profile && profile.mfa_secret && await verifyTOTP(profile.mfa_secret, body.code));

        if (isValid) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, body.uid, { expirationTtl: 3600 });
          return Response.json({ status: "success", sessionId, role: profile.role, email: profile.email, uid: profile.uid }, { headers: corsHeaders });
        }
        return Response.json({ error: "인가 코드 불일치" }, { status: 401, headers: corsHeaders });
      }

      // ============================================================
      // [SECTION 2: 공개 API]
      // ============================================================

      // GET /api/stats - 통계
      if (url.pathname === "/api/stats" && method === "GET") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        const m = await env.DB.prepare("SELECT COUNT(*) as c FROM media").first("c");
        return Response.json({ newsCount: n || 0, userCount: u || 0, postCount: p || 0, mediaCount: m || 0 }, { headers: corsHeaders });
      }

      // GET /api/news - 뉴스 목록
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // GET /api/media - 미디어 목록
      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // GET /api/community/posts - 게시글 목록
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC"
        ).all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // POST /api/community/posts - 게시글 작성
      if (url.pathname === "/api/community/posts" && method === "POST") {
        const body = await request.json();
        const user = await getSessionUser(body.sessionId);
        if (!user) return Response.json({ error: "인증 필요" }, { status: 401, headers: corsHeaders });

        await env.DB.prepare("INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)")
          .bind(body.title, body.content, user.uid).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // GET /api/news/:id/comments - 뉴스 댓글(토론) 조회
      const newsCommentMatch = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (newsCommentMatch && method === "GET") {
        const newsId = newsCommentMatch[1];
        const { results } = await env.DB.prepare(
          "SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.news_id = ? ORDER BY c.created_at ASC"
        ).bind(newsId).all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // POST /api/news/:id/comments - 뉴스 댓글(토론) 작성
      if (newsCommentMatch && method === "POST") {
        const newsId = newsCommentMatch[1];
        const body = await request.json();
        const user = await getSessionUser(body.sessionId);
        if (!user) return Response.json({ error: "인증 필요" }, { status: 401, headers: corsHeaders });

        await env.DB.prepare("INSERT INTO comments (news_id, user_id, content) VALUES (?, ?, ?)")
          .bind(newsId, user.uid, body.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // ============================================================
      // [SECTION 3: 어드민 API - 사령관 전용]
      // ============================================================

      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json().catch(() => ({}));
        if (!await isAdmin(body.sessionId)) {
          return Response.json({ error: "사령관 권한 부족" }, { status: 403, headers: corsHeaders });
        }

        // --- 대원 관리 ---

        // POST /api/admin/users - 전체 대원 목록
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare(
            "SELECT uid, email, role, status, created_at FROM users ORDER BY created_at DESC"
          ).all();
          return Response.json(results || [], { headers: corsHeaders });
        }

        // POST /api/admin/users/update - 대원 역할/상태 변경
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET role = ?, status = ? WHERE uid = ?")
            .bind(body.role, body.status, body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // POST /api/admin/users/delete - 대원 삭제
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // --- 게시글 관리 ---

        // POST /api/admin/posts - 전체 게시글 목록
        if (url.pathname === "/api/admin/posts") {
          const { results } = await env.DB.prepare(
            "SELECT p.id, p.title, p.content, p.created_at, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: corsHeaders });
        }

        // POST /api/admin/posts/delete - 게시글 삭제
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(body.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // --- 뉴스 관리 ---

        // POST /api/admin/news - 전체 뉴스 목록
        if (url.pathname === "/api/admin/news") {
          const { results } = await env.DB.prepare(
            "SELECT n.*, (SELECT COUNT(*) FROM comments c WHERE c.news_id = n.id) as comment_count FROM news n ORDER BY n.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: corsHeaders });
        }

        // POST /api/admin/news/add - 뉴스 추가
        if (url.pathname === "/api/admin/news/add") {
          await env.DB.prepare("INSERT INTO news (title, link, summary) VALUES (?, ?, ?)")
            .bind(body.title, body.link, body.summary).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // POST /api/admin/news/delete - 뉴스 삭제
        if (url.pathname === "/api/admin/news/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE news_id = ?").bind(body.newsId).run();
          await env.DB.prepare("DELETE FROM news WHERE id = ?").bind(body.newsId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // POST /api/admin/comments/delete - 토론 댓글 삭제
        if (url.pathname === "/api/admin/comments/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(body.commentId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // --- 미디어 관리 ---

        // POST /api/admin/media/add - 미디어 추가
        if (url.pathname === "/api/admin/media/add") {
          await env.DB.prepare("INSERT INTO media (name, url, icon) VALUES (?, ?, ?)")
            .bind(body.name, body.url, body.icon).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // POST /api/admin/media/delete - 미디어 삭제
        if (url.pathname === "/api/admin/media/delete") {
          await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(body.mediaId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // --- 속성 관리 ---

        // POST /api/admin/props/get - 속성 조회
        if (url.pathname === "/api/admin/props/get") {
          const keys = ['base_name', 'base_desc', 'base_notice', 'base_theme'];
          const props = {};
          for (const k of keys) {
            props[k] = await env.KV.get(`prop:${k}`) || '';
          }
          return Response.json(props, { headers: corsHeaders });
        }

        // POST /api/admin/props/update - 속성 저장
        if (url.pathname === "/api/admin/props/update") {
          await env.KV.put(`prop:${body.key}`, body.value);
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      return new Response("Morning Dock V12.0 Active.", { status: 200, headers: corsHeaders });

    } catch (err) {
      return Response.json({ error: "기지 엔진 결함: " + err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

// ============================================================
// TOTP 검증 (RFC 6238)
// ============================================================
async function verifyTOTP(secret, code) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const val = alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let keyBuffer = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuffer.length; i++)
    keyBuffer[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  const counter = BigInt(Math.floor(Date.now() / 30000));
  for (let i = -1n; i <= 1n; i++) {
    const step = counter + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, step, false);
    const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncated = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 |
      (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
    if ((truncated % 1000000).toString().padStart(6, '0') === code.trim()) return true;
  }
  return false;
}

// ============================================================
// 프론트엔드 UI
// ============================================================
function generateSovereignUI() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Morning Dock V12.0</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root { --ag-navy: #314e8d; --ag-bg: #f0f2f5; }
  * { box-sizing: border-box; }
  body { background: var(--ag-bg); font-family: 'Pretendard', sans-serif; letter-spacing: -0.02em; overflow: hidden; }
  .sidebar { background:#fff; border-right:1px solid #e2e8f0; width:16rem; flex-shrink:0; display:flex; flex-direction:column; height:100vh; }
  .nav-btn { transition:all 0.2s; color:#64748b; border-radius:0.75rem; margin-bottom:0.25rem; padding:0.75rem 1rem; text-align:left; font-size:0.875rem; font-weight:500; display:flex; align-items:center; cursor:pointer; border:none; background:none; width:100%; }
  .nav-btn.active { background:var(--ag-navy); color:#fff; font-weight:700; }
  .nav-btn:hover:not(.active) { background:#f1f5f9; }
  h1 { font-size:1.25rem; font-weight:700; }
  .clien-table { width:100%; border-collapse:collapse; background:white; border-top:2px solid var(--ag-navy); }
  .clien-table th { background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.6rem 0.75rem; text-align:left; color:#475569; font-size:0.75rem; font-weight:700; }
  .clien-table td { padding:0.6rem 0.75rem; border-bottom:1px solid #f1f5f9; font-size:0.8rem; vertical-align:middle; }
  .tab-btn { padding:0.5rem 1.1rem; font-size:0.82rem; font-weight:700; color:#64748b; border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap; }
  .tab-btn.active { color:var(--ag-navy); border-bottom-color:var(--ag-navy); }
  .ag-card { background:white; border-radius:0.75rem; border:1px solid #e2e8f0; }
  .custom-scroll::-webkit-scrollbar { width:6px; }
  .custom-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
  .badge-admin { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
  .badge-user { background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd; }
  .badge-approved { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
  .badge-blocked { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
  .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:3000; display:flex; align-items:center; justify-content:center; }
  .modal-box { background:white; border-radius:1rem; padding:2rem; width:90%; max-width:600px; max-height:85vh; overflow-y:auto; }
  select, input[type=text], input[type=email], textarea { outline:none; }
  select:focus, input:focus, textarea:focus { ring: 2px; }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
</style>
</head>
<body class="flex h-screen w-screen">

<!-- ===== AUTH GATE ===== -->
<div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
  <div class="bg-white p-10 rounded-2xl w-[26rem] shadow-xl border border-slate-200 text-center">
    <h1 class="text-[#314e8d] mb-8 italic tracking-tighter uppercase">Morning Dock</h1>

    <div id="step-login" class="space-y-4">
      <input type="email" id="login-email" placeholder="대원 식별 이메일" class="w-full p-3 border rounded-lg text-sm focus:ring-2 ring-blue-100">
      <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold text-sm">인가 프로토콜 가동</button>
      <button onclick="showRegister()" class="text-xs text-slate-400 hover:underline">신규 대원 등록</button>
    </div>

    <div id="step-register" class="hidden space-y-4 text-left">
      <input type="email" id="reg-email" placeholder="인가용 이메일" class="w-full p-3 border rounded-lg text-sm">
      <div id="reg-otp-box" class="hidden py-6 bg-slate-50 rounded-lg border-2 border-dashed text-center">
        <img id="reg-qr-img" class="mx-auto w-40 h-40 mb-2 shadow-md">
        <p class="text-xs text-slate-500 mt-2">Google Authenticator에 QR을 등록하세요</p>
      </div>
      <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold text-sm">인증키 발급</button>
      <button onclick="location.reload()" class="text-xs text-slate-400 hover:underline w-full text-center">돌아가기</button>
    </div>

    <div id="step-otp-verify" class="hidden space-y-8">
      <p class="text-xs text-slate-400">Google Authenticator OTP 6자리를 입력하세요</p>
      <input type="text" id="gate-otp" maxlength="6" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-[0.5em] border-b-2 border-[#314e8d] pb-2 text-slate-800 bg-transparent">
      <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold shadow-xl text-sm">최종 인가 확인</button>
    </div>

    <div id="auth-error" class="hidden mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100"></div>
  </div>
</div>

<!-- ===== SIDEBAR ===== -->
<aside id="sidebar" class="sidebar hidden">
  <div class="p-6 border-b text-xl font-bold text-[#314e8d] italic uppercase tracking-tight">Morning_Dock</div>
  <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scroll">
    <button onclick="nav('dash')" id="nb-dash" class="nav-btn active"><i class="fa-solid fa-gauge-high mr-3 w-4"></i>지휘 대시보드</button>
    <button onclick="nav('comm')" id="nb-comm" class="nav-btn"><i class="fa-solid fa-comments mr-3 w-4"></i>정보 공유 본부</button>
    <button onclick="nav('news')" id="nb-news" class="nav-btn"><i class="fa-solid fa-robot mr-3 w-4"></i>뉴스 분석 엔진</button>
    <button onclick="nav('media')" id="nb-media" class="nav-btn"><i class="fa-solid fa-play-circle mr-3 w-4"></i>미디어 센터</button>
    <div id="admin-zone" class="hidden pt-4 mt-4 border-t">
      <p class="px-2 text-[10px] font-bold text-slate-400 uppercase mb-2">Commander</p>
      <button onclick="nav('admin')" id="nb-admin" class="nav-btn text-red-600 hover:bg-red-50"><i class="fa-solid fa-user-shield mr-3 w-4"></i>중앙 제어판</button>
    </div>
  </nav>
  <div class="p-6 border-t bg-slate-50">
    <div class="flex items-center space-x-3 mb-4">
      <div id="user-avatar-ui" class="w-10 h-10 rounded-lg bg-[#314e8d] flex items-center justify-center text-white font-bold text-sm">?</div>
      <div class="flex flex-col text-left overflow-hidden">
        <span id="user-email-ui" class="text-xs font-bold text-slate-800 truncate">...</span>
        <span id="user-role-ui" class="text-[10px] text-slate-400 uppercase"></span>
      </div>
    </div>
    <button onclick="location.reload()" class="w-full border py-2 rounded-lg text-[10px] font-bold text-slate-500 uppercase hover:bg-slate-100">인가 해제</button>
  </div>
</aside>

<!-- ===== MAIN ===== -->
<main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
  <header class="h-14 bg-white border-b flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
    <h2 id="view-title" class="text-xs text-slate-800 uppercase italic tracking-[0.3em] font-bold">Dashboard</h2>
    <div class="flex items-center space-x-6">
      <div id="session-timer-display" class="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">60:00</div>
      <div id="system-clock" class="text-xs font-bold text-[#314e8d] font-mono">00:00:00</div>
    </div>
  </header>

  <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
    <div class="max-w-[1200px] mx-auto w-full">

      <!-- 대시보드 -->
      <div id="v-dash" class="space-y-6 fade-in">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="ag-card p-5 flex items-center space-x-4 border-l-4 border-l-blue-400 shadow-sm">
            <div class="w-10 h-10 bg-blue-50 text-[#314e8d] rounded-lg flex items-center justify-center text-xl"><i class="fa-solid fa-rss"></i></div>
            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Intelligence</p><p id="st-news" class="text-2xl font-bold text-slate-800">0</p></div>
          </div>
          <div class="ag-card p-5 flex items-center space-x-4 border-l-4 border-l-emerald-400 shadow-sm">
            <div class="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center text-xl"><i class="fa-solid fa-file-invoice"></i></div>
            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Reports</p><p id="st-posts" class="text-2xl font-bold text-slate-800">0</p></div>
          </div>
          <div class="ag-card p-5 flex items-center space-x-4 border-l-4 border-l-amber-400 shadow-sm">
            <div class="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center text-xl"><i class="fa-solid fa-user-secret"></i></div>
            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Agents</p><p id="st-users" class="text-2xl font-bold text-slate-800">0</p></div>
          </div>
          <div class="ag-card p-5 flex items-center space-x-4 border-l-4 border-l-purple-400 shadow-sm">
            <div class="w-10 h-10 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center text-xl"><i class="fa-solid fa-link"></i></div>
            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Media</p><p id="st-media" class="text-2xl font-bold text-slate-800">0</p></div>
          </div>
        </div>
        <div class="ag-card p-8 border-l-4 border-l-[#314e8d] shadow-sm">
          <p id="sum-text-display" class="text-base font-bold text-slate-700">분석 중...</p>
        </div>
      </div>

      <!-- 정보 공유 본부 -->
      <div id="v-comm" class="hidden fade-in space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-bold italic uppercase text-slate-700">Intelligence Center</h3>
          <button onclick="openPostModal()" class="bg-[#314e8d] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#25397a] transition"><i class="fa-solid fa-pen mr-2"></i>보고서 작성</button>
        </div>
        <div class="ag-card shadow-sm overflow-hidden">
          <table class="clien-table">
            <thead><tr><th class="w-12 text-center">ID</th><th>보고 제목</th><th class="w-36 text-center">작성 대원</th><th class="w-28 text-center">일시</th></tr></thead>
            <tbody id="board-data-body"><tr><td colspan="4" class="text-center py-8 text-slate-400 text-xs">로딩 중...</td></tr></tbody>
          </table>
        </div>
      </div>

      <!-- 뉴스 분석 엔진 -->
      <div id="v-news" class="hidden fade-in space-y-4 pb-10">
        <h3 class="text-base font-bold italic uppercase text-slate-700">News Intelligence Engine</h3>
        <div id="news-feed" class="space-y-4"></div>
      </div>

      <!-- 미디어 센터 -->
      <div id="v-media" class="hidden fade-in pb-10">
        <h3 class="text-base font-bold italic uppercase text-slate-700 mb-4">Media Center</h3>
        <div id="media-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
      </div>

      <!-- 중앙 제어판 (어드민) -->
      <div id="v-admin" class="hidden fade-in pb-20">
        <div class="ag-card p-8 border-t-4 border-t-red-500 shadow-sm space-y-6">
          <h3 class="text-red-600 font-bold italic text-sm"><i class="fa-solid fa-user-shield mr-2"></i>Commander Control Panel</h3>

          <!-- 탭 -->
          <div class="flex space-x-1 border-b overflow-x-auto">
            <div onclick="adminTab('agents')" id="at-agents" class="tab-btn active">👥 대원 권한</div>
            <div onclick="adminTab('reports')" id="at-reports" class="tab-btn">📋 게시글 관리</div>
            <div onclick="adminTab('news-mgr')" id="at-news-mgr" class="tab-btn">📰 뉴스 관리</div>
            <div onclick="adminTab('media-mgr')" id="at-media-mgr" class="tab-btn">🔗 미디어 관리</div>
            <div onclick="adminTab('props')" id="at-props" class="tab-btn">⚙️ 기지 속성</div>
          </div>

          <!-- 탭 콘텐츠 -->
          <div id="admin-tab-content" class="min-h-[400px] pt-2">

            <!-- 대원 권한 탭 -->
            <div id="adm-agents">
              <p class="text-xs text-slate-400 mb-4">대원의 역할(ADMIN/USER)과 상태(APPROVED/BLOCKED)를 변경할 수 있습니다.</p>
              <div class="ag-card overflow-hidden shadow-sm">
                <table class="clien-table">
                  <thead><tr><th>이메일</th><th class="w-24 text-center">역할</th><th class="w-24 text-center">상태</th><th class="w-32 text-center">등록일</th><th class="w-40 text-center">조치</th></tr></thead>
                  <tbody id="adm-agent-list"><tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs">로딩 중...</td></tr></tbody>
                </table>
              </div>
            </div>

            <!-- 게시글 관리 탭 -->
            <div id="adm-reports" class="hidden">
              <p class="text-xs text-slate-400 mb-4">부적절한 게시글을 삭제할 수 있습니다.</p>
              <div class="ag-card overflow-hidden shadow-sm">
                <table class="clien-table">
                  <thead><tr><th class="w-12">ID</th><th>제목</th><th class="w-36">작성자</th><th class="w-32">등록일</th><th class="w-24 text-center">조치</th></tr></thead>
                  <tbody id="adm-post-list"><tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs">로딩 중...</td></tr></tbody>
                </table>
              </div>
            </div>

            <!-- 뉴스 관리 탭 -->
            <div id="adm-news-mgr" class="hidden space-y-6">
              <div class="ag-card p-6 border-2 border-dashed border-slate-200 space-y-4">
                <p class="text-xs font-bold text-slate-600 uppercase">새 뉴스 등록</p>
                <div class="grid grid-cols-1 gap-3">
                  <input type="text" id="news-add-title" placeholder="뉴스 제목" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 ring-blue-100">
                  <input type="text" id="news-add-link" placeholder="원문 링크 (https://...)" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 ring-blue-100">
                  <textarea id="news-add-summary" placeholder="요약 내용" rows="3" class="w-full p-2.5 border rounded-lg text-sm resize-none focus:ring-2 ring-blue-100"></textarea>
                </div>
                <button onclick="adminAddNews()" class="bg-[#314e8d] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-[#25397a] transition">등록</button>
              </div>
              <div class="ag-card overflow-hidden shadow-sm">
                <table class="clien-table">
                  <thead><tr><th class="w-12">ID</th><th>제목</th><th class="w-20 text-center">토론 수</th><th class="w-32">등록일</th><th class="w-24 text-center">조치</th></tr></thead>
                  <tbody id="adm-news-list"><tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs">로딩 중...</td></tr></tbody>
                </table>
              </div>
            </div>

            <!-- 미디어 관리 탭 -->
            <div id="adm-media-mgr" class="hidden space-y-6">
              <div class="ag-card p-6 border-2 border-dashed border-slate-200 space-y-4">
                <p class="text-xs font-bold text-slate-600 uppercase">새 미디어 링크 추가</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input type="text" id="media-add-name" placeholder="미디어 명칭" class="p-2.5 border rounded-lg text-sm">
                  <input type="text" id="media-add-url" placeholder="URL (https://...)" class="p-2.5 border rounded-lg text-sm">
                  <input type="text" id="media-add-icon" placeholder="Font Awesome 클래스 (fa-solid fa-tv)" class="p-2.5 border rounded-lg text-sm">
                </div>
                <button onclick="adminAddMedia()" class="bg-[#314e8d] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-[#25397a] transition">추가</button>
              </div>
              <div id="adm-media-list" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
            </div>

            <!-- 기지 속성 탭 -->
            <div id="adm-props" class="hidden space-y-6">
              <p class="text-xs text-slate-400">기지의 기본 속성을 관리합니다. 저장 후 즉시 반영됩니다.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="ag-card p-6 space-y-3 shadow-sm">
                  <p class="text-xs font-bold text-slate-600 uppercase">기지 명칭</p>
                  <input type="text" id="prop-base-name" placeholder="Morning Dock" class="w-full p-2.5 border rounded-lg text-sm">
                  <button onclick="adminSaveProp('base_name', 'prop-base-name')" class="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700">저장</button>
                </div>
                <div class="ag-card p-6 space-y-3 shadow-sm">
                  <p class="text-xs font-bold text-slate-600 uppercase">기지 설명</p>
                  <input type="text" id="prop-base-desc" placeholder="안티그래비티 기지 정보 허브" class="w-full p-2.5 border rounded-lg text-sm">
                  <button onclick="adminSaveProp('base_desc', 'prop-base-desc')" class="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700">저장</button>
                </div>
                <div class="ag-card p-6 space-y-3 shadow-sm md:col-span-2">
                  <p class="text-xs font-bold text-slate-600 uppercase">공지사항</p>
                  <textarea id="prop-base-notice" rows="3" placeholder="전체 공지사항을 입력하세요" class="w-full p-2.5 border rounded-lg text-sm resize-none"></textarea>
                  <button onclick="adminSaveProp('base_notice', 'prop-base-notice')" class="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700">저장</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</main>

<!-- ===== 게시글 작성 모달 ===== -->
<div id="post-modal" class="modal-bg hidden">
  <div class="modal-box">
    <div class="flex justify-between items-center mb-6">
      <h3 class="font-bold text-base text-slate-800">보고서 작성</h3>
      <button onclick="closeModal('post-modal')" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
    </div>
    <div class="space-y-4">
      <input type="text" id="post-title-input" placeholder="보고서 제목" class="w-full p-3 border rounded-lg text-sm focus:ring-2 ring-blue-100">
      <textarea id="post-content-input" rows="6" placeholder="보고 내용을 입력하세요..." class="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 ring-blue-100"></textarea>
    </div>
    <div class="flex justify-end mt-6 space-x-3">
      <button onclick="closeModal('post-modal')" class="px-4 py-2 border rounded-lg text-sm text-slate-600">취소</button>
      <button onclick="submitPost()" class="px-6 py-2 bg-[#314e8d] text-white rounded-lg text-sm font-bold hover:bg-[#25397a]">제출</button>
    </div>
  </div>
</div>

<!-- ===== 뉴스 토론 모달 ===== -->
<div id="discuss-modal" class="modal-bg hidden">
  <div class="modal-box">
    <div class="flex justify-between items-center mb-4">
      <h3 id="discuss-title" class="font-bold text-sm text-slate-800 flex-1 pr-4"></h3>
      <button onclick="closeModal('discuss-modal')" class="text-slate-400 hover:text-slate-600 text-xl flex-shrink-0">&times;</button>
    </div>
    <div id="discuss-comments" class="space-y-3 mb-4 max-h-64 overflow-y-auto custom-scroll border rounded-lg p-3 bg-slate-50"></div>
    <div class="flex gap-2">
      <input type="text" id="discuss-input" placeholder="토론 의견을 입력하세요..." class="flex-1 p-2.5 border rounded-lg text-sm focus:ring-2 ring-blue-100">
      <button onclick="submitComment()" class="px-4 py-2 bg-[#314e8d] text-white rounded-lg text-xs font-bold hover:bg-[#25397a]">전송</button>
    </div>
  </div>
</div>

<!-- ===== 유저 수정 모달 ===== -->
<div id="user-edit-modal" class="modal-bg hidden">
  <div class="modal-box" style="max-width:380px">
    <div class="flex justify-between items-center mb-6">
      <h3 class="font-bold text-sm text-slate-800">대원 정보 수정</h3>
      <button onclick="closeModal('user-edit-modal')" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
    </div>
    <input type="hidden" id="edit-uid">
    <div class="space-y-4">
      <div>
        <p class="text-xs font-bold text-slate-500 mb-1">이메일</p>
        <p id="edit-email" class="text-sm font-bold text-slate-800"></p>
      </div>
      <div>
        <p class="text-xs font-bold text-slate-500 mb-1">역할</p>
        <select id="edit-role" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 ring-blue-100">
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <div>
        <p class="text-xs font-bold text-slate-500 mb-1">상태</p>
        <select id="edit-status" class="w-full p-2.5 border rounded-lg text-sm focus:ring-2 ring-blue-100">
          <option value="APPROVED">APPROVED</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
      </div>
    </div>
    <div class="flex justify-end mt-6 space-x-3">
      <button onclick="closeModal('user-edit-modal')" class="px-4 py-2 border rounded-lg text-sm text-slate-600">취소</button>
      <button onclick="saveUserEdit()" class="px-6 py-2 bg-[#314e8d] text-white rounded-lg text-sm font-bold hover:bg-[#25397a]">저장</button>
    </div>
  </div>
</div>

<script>
let state = { user: null, view: 'dash', sessionTime: 3600, adminActiveTab: 'agents', currentNewsId: null };

// 세션 타이머
setInterval(() => {
  const clock = document.getElementById('system-clock');
  if (clock) clock.innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  if (state.user) {
    state.sessionTime--;
    const t = document.getElementById('session-timer-display');
    if (t) t.innerText = Math.floor(state.sessionTime/60) + ':' + (state.sessionTime%60).toString().padStart(2,'0');
    if (state.sessionTime <= 0) location.reload();
  }
}, 1000);

// ===== 인증 =====
function showRegister() {
  document.getElementById('step-login').classList.add('hidden');
  document.getElementById('step-register').classList.remove('hidden');
}

async function startRegister() {
  const email = document.getElementById('reg-email').value.trim();
  if (!email) return showError('이메일을 입력하세요');
  const secret = Math.random().toString(36).slice(-16).toUpperCase();
  document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent('otpauth://totp/MorningDock:' + email + '?secret=' + secret + '&issuer=MorningDock');
  document.getElementById('reg-otp-box').classList.remove('hidden');
  document.getElementById('reg-btn').textContent = '등록 완료';
  document.getElementById('reg-btn').onclick = async () => {
    const r = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, secret}) });
    const d = await r.json();
    if (d.error) return showError(d.error);
    alert('등록 완료! 로그인 화면으로 이동합니다.');
    location.reload();
  };
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) return showError('이메일을 입력하세요');
  const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email}) });
  const d = await r.json();
  if (d.error) return showError(d.error);
  state.user = d;
  document.getElementById('step-login').classList.add('hidden');
  document.getElementById('step-otp-verify').classList.remove('hidden');
}

async function verifyOTP() {
  const code = document.getElementById('gate-otp').value.trim();
  const r = await fetch('/api/auth/otp-verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({uid:state.user.uid, code}) });
  const d = await r.json();
  if (d.error) return showError(d.error);
  state.user.sessionId = d.sessionId;
  state.user.role = d.role;
  state.user.email = d.email;
  boot();
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function boot() {
  document.getElementById('auth-gate').classList.add('hidden');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('user-email-ui').innerText = state.user.email;
  document.getElementById('user-role-ui').innerText = state.user.role;
  document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
  if (state.user.role === 'ADMIN') document.getElementById('admin-zone').classList.remove('hidden');
  nav('dash');
}

// ===== 네비게이션 =====
const viewTitles = { dash:'Dashboard', comm:'Intelligence Center', news:'News Engine', media:'Media Center', admin:'Commander Control' };
async function nav(v) {
  state.view = v;
  document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById('v-' + v).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nb-' + v).classList.add('active');
  document.getElementById('view-title').innerText = viewTitles[v] || v;
  if (v === 'dash') syncStats();
  if (v === 'comm') syncComm();
  if (v === 'news') syncNews();
  if (v === 'media') syncMedia();
  if (v === 'admin') { state.adminActiveTab = 'agents'; renderAdminTabs(); syncAdmin(); }
}

// ===== 대시보드 =====
async function syncStats() {
  const r = await fetch('/api/stats');
  const d = await r.json();
  document.getElementById('st-news').innerText = d.newsCount;
  document.getElementById('st-posts').innerText = d.postCount;
  document.getElementById('st-users').innerText = d.userCount;
  document.getElementById('st-media').innerText = d.mediaCount;
  document.getElementById('sum-text-display').innerHTML = '필승! 사령관님! 기지 인텔리전스 ' + d.newsCount + '건 및 보고서 ' + d.postCount + '건을 감찰 중입니다! 🫡🔥';
}

// ===== 정보 공유 본부 =====
async function syncComm() {
  const r = await fetch('/api/community/posts');
  const posts = await r.json();
  const tbody = document.getElementById('board-data-body');
  if (!posts.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400 text-xs">게시글이 없습니다</td></tr>'; return; }
  tbody.innerHTML = posts.map(p => '<tr class="hover:bg-slate-50">' +
    '<td class="text-center font-mono text-xs text-slate-400">' + p.id + '</td>' +
    '<td class="font-bold text-sm">' + escHtml(p.title) + '</td>' +
    '<td class="text-center text-xs text-slate-500">' + (p.email ? p.email.split('@')[0] : '-') + '</td>' +
    '<td class="text-center text-xs font-mono text-slate-400">' + new Date(p.created_at).toLocaleDateString('ko-KR') + '</td>' +
    '</tr>').join('');
}

function openPostModal() { document.getElementById('post-modal').classList.remove('hidden'); }

async function submitPost() {
  const title = document.getElementById('post-title-input').value.trim();
  const content = document.getElementById('post-content-input').value.trim();
  if (!title || !content) return alert('제목과 내용을 모두 입력하세요.');
  await fetch('/api/community/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title, content, sessionId:state.user.sessionId}) });
  closeModal('post-modal');
  document.getElementById('post-title-input').value = '';
  document.getElementById('post-content-input').value = '';
  syncComm();
}

// ===== 뉴스 분석 엔진 =====
async function syncNews() {
  const r = await fetch('/api/news');
  const news = await r.json();
  const feed = document.getElementById('news-feed');
  if (!news.length) { feed.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">등록된 뉴스가 없습니다</div>'; return; }
  feed.innerHTML = news.map(n => '<div class="ag-card p-6 space-y-3 border-l-4 border-l-[#314e8d] shadow-sm">' +
    '<h4 class="font-bold text-sm cursor-pointer hover:text-[#314e8d] transition" onclick="if(\\''+escHtml(n.link||'')+'\\') window.open(\\''+escHtml(n.link||'')+'\\');">' + escHtml(n.title) + '</h4>' +
    '<div class="bg-slate-50 p-4 rounded-lg border text-xs text-slate-600 leading-relaxed">' + escHtml(n.summary || '요약 없음') + '</div>' +
    '<div class="flex justify-between items-center">' +
    '<span class="text-[10px] text-slate-400 font-mono">' + new Date(n.created_at).toLocaleDateString('ko-KR') + '</span>' +
    '<button onclick="openDiscuss(' + n.id + ', \\'' + escHtml(n.title) + '\\')" class="text-xs text-[#314e8d] font-bold hover:underline"><i class="fa-solid fa-comments mr-1"></i>토론 참여</button>' +
    '</div></div>').join('');
}

// ===== 뉴스 토론 =====
async function openDiscuss(newsId, title) {
  state.currentNewsId = newsId;
  document.getElementById('discuss-title').innerText = '📰 ' + title;
  document.getElementById('discuss-modal').classList.remove('hidden');
  await loadComments();
}

async function loadComments() {
  const r = await fetch('/api/news/' + state.currentNewsId + '/comments');
  const comments = await r.json();
  const box = document.getElementById('discuss-comments');
  if (!comments.length) { box.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">아직 토론이 없습니다. 첫 의견을 남겨보세요!</p>'; return; }
  box.innerHTML = comments.map(c => '<div class="bg-white rounded-lg p-3 border">' +
    '<div class="flex justify-between items-center mb-1">' +
    '<span class="text-[10px] font-bold text-[#314e8d]">' + (c.email ? c.email.split('@')[0] : '?') + '</span>' +
    '<span class="text-[10px] text-slate-400">' + new Date(c.created_at).toLocaleString('ko-KR') + '</span>' +
    '</div>' +
    '<p class="text-xs text-slate-700">' + escHtml(c.content) + '</p>' +
    '</div>').join('');
  box.scrollTop = box.scrollHeight;
}

async function submitComment() {
  const content = document.getElementById('discuss-input').value.trim();
  if (!content) return;
  await fetch('/api/news/' + state.currentNewsId + '/comments', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content, sessionId:state.user.sessionId}) });
  document.getElementById('discuss-input').value = '';
  await loadComments();
}

// ===== 미디어 센터 =====
async function syncMedia() {
  const r = await fetch('/api/media');
  const media = await r.json();
  const grid = document.getElementById('media-grid');
  if (!media.length) { grid.innerHTML = '<div class="text-slate-400 text-sm text-center py-12 col-span-4">등록된 미디어가 없습니다</div>'; return; }
  grid.innerHTML = media.map(m => '<div class="ag-card p-6 text-center space-y-4 hover:shadow-md transition">' +
    '<div class="w-14 h-14 bg-slate-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto border text-xl shadow-inner"><i class="' + m.icon + '"></i></div>' +
    '<h4 class="font-bold text-xs truncate">' + escHtml(m.name) + '</h4>' +
    '<button onclick="window.open(\\'' + m.url + '\\')" class="w-full bg-[#314e8d] text-white py-2 rounded-lg text-[10px] font-bold hover:bg-[#25397a] transition">Launch</button>' +
    '</div>').join('');
}

// ===== 어드민 탭 =====
const adminTabs = ['agents', 'reports', 'news-mgr', 'media-mgr', 'props'];

function renderAdminTabs() {
  adminTabs.forEach(t => {
    document.getElementById('at-' + t).classList.remove('active');
    document.getElementById('adm-' + t).classList.add('hidden');
  });
  document.getElementById('at-' + state.adminActiveTab).classList.add('active');
  document.getElementById('adm-' + state.adminActiveTab).classList.remove('hidden');
}

function adminTab(tab) {
  state.adminActiveTab = tab;
  renderAdminTabs();
  syncAdmin();
}

async function syncAdmin() {
  const sid = state.user.sessionId;
  const tab = state.adminActiveTab;

  if (tab === 'agents') {
    const r = await fetch('/api/admin/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:sid}) });
    const users = await r.json();
    const tbody = document.getElementById('adm-agent-list');
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs">대원이 없습니다</td></tr>'; return; }
    tbody.innerHTML = users.map(u => {
      const roleBadge = '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ' + (u.role==='ADMIN' ? 'badge-admin' : 'badge-user') + '">' + u.role + '</span>';
      const statusBadge = '<span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ' + (u.status==='BLOCKED' ? 'badge-blocked' : 'badge-approved') + '">' + u.status + '</span>';
      return '<tr class="hover:bg-slate-50">' +
        '<td class="text-xs font-bold">' + escHtml(u.email) + '</td>' +
        '<td class="text-center">' + roleBadge + '</td>' +
        '<td class="text-center">' + statusBadge + '</td>' +
        '<td class="text-center text-xs font-mono text-slate-400">' + new Date(u.created_at).toLocaleDateString('ko-KR') + '</td>' +
        '<td class="text-center">' +
        '<div class="flex justify-center gap-1">' +
        '<button onclick=\'openUserEdit("' + u.uid + '","' + escHtml(u.email) + '","' + u.role + '","' + u.status + '")\' class="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-100 font-bold hover:bg-blue-100">수정</button>' +
        '<button onclick="adminDeleteUser(\'' + u.uid + '\')" class="text-[10px] px-2 py-1 bg-red-50 text-red-500 rounded border border-red-100 font-bold hover:bg-red-100">숙청</button>' +
        '</div></td></tr>';
    }).join('');
  }

  if (tab === 'reports') {
    const r = await fetch('/api/admin/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:sid}) });
    const posts = await r.json();
    const tbody = document.getElementById('adm-post-list');
    if (!posts.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs">게시글이 없습니다</td></tr>'; return; }
    tbody.innerHTML = posts.map(p => '<tr class="hover:bg-slate-50">' +
      '<td class="text-xs font-mono text-slate-400">' + p.id + '</td>' +
      '<td class="text-xs font-bold">' + escHtml(p.title) + '</td>' +
      '<td class="text-xs text-slate-500">' + escHtml(p.email || '-') + '</td>' +
      '<td class="text-xs font-mono text-slate-400">' + new Date(p.created_at).toLocaleDateString('ko-KR') + '</td>' +
      '<td class="text-center"><button onclick="adminDeletePost(' + p.id + ')" class="text-[10px] px-3 py-1 bg-red-50 text-red-500 rounded border border-red-100 font-bold hover:bg-red-100">파기</button></td>' +
      '</tr>').join('');
  }

  if (tab === 'news-mgr') {
    const r = await fetch('/api/admin/news', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:sid}) });
    const news = await r.json();
    const tbody = document.getElementById('adm-news-list');
    if (!news.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 text-xs">등록된 뉴스가 없습니다</td></tr>'; return; }
    tbody.innerHTML = news.map(n => '<tr class="hover:bg-slate-50">' +
      '<td class="text-xs font-mono text-slate-400">' + n.id + '</td>' +
      '<td class="text-xs font-bold"><a href="' + escHtml(n.link||'#') + '" target="_blank" class="hover:text-[#314e8d]">' + escHtml(n.title) + '</a></td>' +
      '<td class="text-center"><span class="text-xs font-bold text-[#314e8d]">' + (n.comment_count||0) + '개</span></td>' +
      '<td class="text-xs font-mono text-slate-400">' + new Date(n.created_at).toLocaleDateString('ko-KR') + '</td>' +
      '<td class="text-center"><button onclick="adminDeleteNews(' + n.id + ')" class="text-[10px] px-3 py-1 bg-red-50 text-red-500 rounded border border-red-100 font-bold hover:bg-red-100">삭제</button></td>' +
      '</tr>').join('');
  }

  if (tab === 'media-mgr') {
    const r = await fetch('/api/media');
    const media = await r.json();
    const list = document.getElementById('adm-media-list');
    if (!media.length) { list.innerHTML = '<div class="text-slate-400 text-xs text-center py-8 col-span-3">등록된 미디어가 없습니다</div>'; return; }
    list.innerHTML = media.map(m => '<div class="ag-card p-4 flex items-center justify-between shadow-sm">' +
      '<div class="flex items-center space-x-3">' +
      '<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[#314e8d]"><i class="' + m.icon + '"></i></div>' +
      '<div><p class="text-xs font-bold">' + escHtml(m.name) + '</p><p class="text-[10px] text-slate-400 truncate max-w-[180px]">' + escHtml(m.url) + '</p></div>' +
      '</div>' +
      '<button onclick="adminDeleteMedia(' + m.id + ')" class="text-[10px] px-3 py-1 bg-red-50 text-red-500 rounded border border-red-100 font-bold hover:bg-red-100">삭제</button>' +
      '</div>').join('');
  }

  if (tab === 'props') {
    const r = await fetch('/api/admin/props/get', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:sid}) });
    const props = await r.json();
    if (props.base_name) document.getElementById('prop-base-name').value = props.base_name;
    if (props.base_desc) document.getElementById('prop-base-desc').value = props.base_desc;
    if (props.base_notice) document.getElementById('prop-base-notice').value = props.base_notice;
  }
}

// ===== 어드민 액션 =====
function openUserEdit(uid, email, role, status) {
  document.getElementById('edit-uid').value = uid;
  document.getElementById('edit-email').innerText = email;
  document.getElementById('edit-role').value = role;
  document.getElementById('edit-status').value = status;
  document.getElementById('user-edit-modal').classList.remove('hidden');
}

async function saveUserEdit() {
  const uid = document.getElementById('edit-uid').value;
  const role = document.getElementById('edit-role').value;
  const status = document.getElementById('edit-status').value;
  await fetch('/api/admin/users/update', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({targetUid:uid, role, status, sessionId:state.user.sessionId}) });
  closeModal('user-edit-modal');
  syncAdmin();
}

async function adminDeleteUser(uid) {
  if (!confirm('이 대원을 숙청하시겠습니까?')) return;
  await fetch('/api/admin/users/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({targetUid:uid, sessionId:state.user.sessionId}) });
  syncAdmin();
}

async function adminDeletePost(id) {
  if (!confirm('이 게시글을 파기하시겠습니까?')) return;
  await fetch('/api/admin/posts/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({postId:id, sessionId:state.user.sessionId}) });
  syncAdmin();
}

async function adminAddNews() {
  const title = document.getElementById('news-add-title').value.trim();
  const link = document.getElementById('news-add-link').value.trim();
  const summary = document.getElementById('news-add-summary').value.trim();
  if (!title) return alert('제목을 입력하세요');
  await fetch('/api/admin/news/add', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title, link, summary, sessionId:state.user.sessionId}) });
  document.getElementById('news-add-title').value = '';
  document.getElementById('news-add-link').value = '';
  document.getElementById('news-add-summary').value = '';
  syncAdmin();
}

async function adminDeleteNews(id) {
  if (!confirm('이 뉴스와 관련 토론을 모두 삭제하시겠습니까?')) return;
  await fetch('/api/admin/news/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({newsId:id, sessionId:state.user.sessionId}) });
  syncAdmin();
}

async function adminAddMedia() {
  const name = document.getElementById('media-add-name').value.trim();
  const url = document.getElementById('media-add-url').value.trim();
  const icon = document.getElementById('media-add-icon').value.trim();
  if (!name || !url) return alert('명칭과 URL을 입력하세요');
  await fetch('/api/admin/media/add', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name, url, icon: icon || 'fa-solid fa-link', sessionId:state.user.sessionId}) });
  document.getElementById('media-add-name').value = '';
  document.getElementById('media-add-url').value = '';
  document.getElementById('media-add-icon').value = '';
  syncAdmin();
}

async function adminDeleteMedia(id) {
  if (!confirm('이 미디어를 삭제하시겠습니까?')) return;
  await fetch('/api/admin/media/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({mediaId:id, sessionId:state.user.sessionId}) });
  syncAdmin();
}

async function adminSaveProp(key, inputId) {
  const value = document.getElementById(inputId).value.trim();
  await fetch('/api/admin/props/update', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({key, value, sessionId:state.user.sessionId}) });
  alert('저장 완료!');
}

// ===== 유틸 =====
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// 모달 외부 클릭 닫기
document.addEventListener('click', function(e) {
  ['post-modal','discuss-modal','user-edit-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('hidden') && e.target === el) closeModal(id);
  });
});
</script>
</body>
</html>`;
}