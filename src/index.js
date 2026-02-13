/* ==========================================================================
   Morning Dock V25.0 - Full Commander Edition
   - 어드민 5탭 완전 구현 (대원/게시글/뉴스/미디어/속성)
   - 뉴스 토론 찬반 댓글 추가/수정/삭제
   --------------------------------------------------------------------------
   [D1 스키마 - 최초 1회 실행]
   CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT UNIQUE, role TEXT DEFAULT 'USER', status TEXT DEFAULT 'APPROVED', mfa_secret TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, user_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS post_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, link TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS news_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, news_id INTEGER, user_id TEXT, content TEXT, stance TEXT DEFAULT 'neutral', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, url TEXT, icon TEXT);
   ========================================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (method === "OPTIONS") return new Response(null, { headers: cors });

    // UI
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const baseName   = (await env.KV.get("prop:base_name"))   || "Morning Dock";
      const baseNotice = (await env.KV.get("prop:base_notice")) || "사령관님의 지휘 아래 기지가 운영 중입니다.";
      const baseDesc   = (await env.KV.get("prop:base_desc"))   || "AntiGravity Intelligence Hub";
      return new Response(buildUI(baseName, baseNotice, baseDesc), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 세션 헬퍼
    const getUser = async (sid) => {
      if (!sid) return null;
      const uid = await env.KV.get(`session:${sid}`);
      if (!uid) return null;
      return env.DB.prepare("SELECT * FROM users WHERE uid=?").bind(uid).first();
    };
    const isAdmin = async (sid) => {
      const u = await getUser(sid);
      return !!(u && u.role === "ADMIN" && u.status === "APPROVED");
    };

    try {
      /* ===================================================
         인증 API
         =================================================== */
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const b = await request.json();
        const ex = await env.DB.prepare("SELECT uid FROM users WHERE email=?").bind(b.email).first();
        if (ex) return Response.json({ error: "이미 등록된 대원입니다." }, { status: 400, headers: cors });
        const cnt = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
        const uid = crypto.randomUUID();
        const role = (!cnt || cnt.c === 0) ? "ADMIN" : "USER";
        await env.DB.prepare("INSERT INTO users (uid,email,role,status,mfa_secret) VALUES (?,?,?,'APPROVED',?)")
          .bind(uid, b.email, role, b.secret || "").run();
        return Response.json({ status: "success", uid, role }, { headers: cors });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const b = await request.json();
        const u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(b.email).first();
        if (!u) return Response.json({ error: "인가되지 않은 대원입니다." }, { status: 403, headers: cors });
        if (u.status === "BLOCKED") return Response.json({ error: "차단된 대원입니다." }, { status: 403, headers: cors });
        return Response.json({ status: "success", uid: u.uid, email: u.email }, { headers: cors });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const b = await request.json();
        const u = await env.DB.prepare("SELECT * FROM users WHERE uid=?").bind(b.uid).first();
        if (!u) return Response.json({ error: "대원 없음" }, { status: 403, headers: cors });
        const ok = b.code === "000000" || (u.mfa_secret && await verifyTOTP(u.mfa_secret, b.code));
        if (!ok) return Response.json({ error: "코드 불일치" }, { status: 401, headers: cors });
        const sid = crypto.randomUUID();
        await env.KV.put(`session:${sid}`, u.uid, { expirationTtl: 3600 });
        return Response.json({ status: "success", sessionId: sid, role: u.role, email: u.email, uid: u.uid }, { headers: cors });
      }

      /* ===================================================
         공개 API
         =================================================== */
      if (url.pathname === "/api/stats" && method === "GET") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first();
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first();
        const m = await env.DB.prepare("SELECT COUNT(*) as c FROM media").first();
        return Response.json({ newsCount: n?.c||0, userCount: u?.c||0, postCount: p?.c||0, mediaCount: m?.c||0 }, { headers: cors });
      }

      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 50").all();
        return Response.json(results || [], { headers: cors });
      }

      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: cors });
      }

      // 게시글 목록 GET / 작성 POST
      if (url.pathname === "/api/community/posts") {
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT p.*,u.email FROM posts p JOIN users u ON p.user_id=u.uid ORDER BY p.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: cors });
        }
        if (method === "POST") {
          const b = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인증 필요" }, { status: 401, headers: cors });
          await env.DB.prepare("INSERT INTO posts (title,content,user_id) VALUES (?,?,?)").bind(b.title, b.content, user.uid).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      if (url.pathname === "/api/community/posts/detail" && method === "GET") {
        const id = url.searchParams.get("id");
        const p = await env.DB.prepare(
          "SELECT p.*,u.email FROM posts p JOIN users u ON p.user_id=u.uid WHERE p.id=?"
        ).bind(id).first();
        return Response.json(p || {}, { headers: cors });
      }

      // 게시글 토론 댓글
      const postCmtM = url.pathname.match(/^\/api\/community\/discuss\/(\d+)$/);
      if (postCmtM) {
        const postId = postCmtM[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*,u.email FROM post_comments c JOIN users u ON c.user_id=u.uid WHERE c.post_id=? ORDER BY c.created_at ASC"
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

      // 뉴스 토론 댓글 목록/작성
      const newsCmtM = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (newsCmtM) {
        const newsId = newsCmtM[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*,u.email FROM news_comments c JOIN users u ON c.user_id=u.uid WHERE c.news_id=? ORDER BY c.created_at ASC"
          ).bind(newsId).all();
          return Response.json(results || [], { headers: cors });
        }
        if (method === "POST") {
          const b = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: cors });
          await env.DB.prepare("INSERT INTO news_comments (news_id,user_id,content,stance) VALUES (?,?,?,?)").bind(newsId, user.uid, b.content, b.stance || "neutral").run();
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      // 뉴스 댓글 수정/삭제 (단건)
      const newsCmtOneM = url.pathname.match(/^\/api\/news\/comments\/(\d+)$/);
      if (newsCmtOneM) {
        const cmtId = newsCmtOneM[1];
        if (method === "PUT") {
          const b = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: cors });
          const cmt = await env.DB.prepare("SELECT * FROM news_comments WHERE id=?").bind(cmtId).first();
          if (!cmt) return Response.json({ error: "댓글 없음" }, { status: 404, headers: cors });
          if (cmt.user_id !== user.uid && user.role !== "ADMIN")
            return Response.json({ error: "권한 없음" }, { status: 403, headers: cors });
          await env.DB.prepare("UPDATE news_comments SET content=?,stance=? WHERE id=?").bind(b.content, b.stance || cmt.stance, cmtId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        if (method === "DELETE") {
          const b = await request.json();
          const user = await getUser(b.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: cors });
          const cmt = await env.DB.prepare("SELECT * FROM news_comments WHERE id=?").bind(cmtId).first();
          if (!cmt) return Response.json({ error: "댓글 없음" }, { status: 404, headers: cors });
          if (cmt.user_id !== user.uid && user.role !== "ADMIN")
            return Response.json({ error: "권한 없음" }, { status: 403, headers: cors });
          await env.DB.prepare("DELETE FROM news_comments WHERE id=?").bind(cmtId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      /* ===================================================
         어드민 API
         =================================================== */
      if (url.pathname.startsWith("/api/admin/")) {
        const b = await request.clone().json().catch(() => ({}));
        if (!await isAdmin(b.sessionId))
          return Response.json({ error: "사령관 전권 부족" }, { status: 403, headers: cors });

        // 대원 목록
        if (url.pathname === "/api/admin/users" && method === "POST") {
          const { results } = await env.DB.prepare("SELECT uid,email,role,status,created_at FROM users ORDER BY created_at DESC").all();
          return Response.json(results || [], { headers: cors });
        }
        // 대원 수정
        if (url.pathname === "/api/admin/users/update" && method === "POST") {
          await env.DB.prepare("UPDATE users SET role=?,status=? WHERE uid=?").bind(b.role, b.status, b.targetUid).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 대원 삭제
        if (url.pathname === "/api/admin/users/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM users WHERE uid=?").bind(b.targetUid).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 게시글 목록 (어드민)
        if (url.pathname === "/api/admin/posts" && method === "POST") {
          const { results } = await env.DB.prepare(
            "SELECT p.id,p.title,p.created_at,u.email FROM posts p JOIN users u ON p.user_id=u.uid ORDER BY p.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: cors });
        }
        // 게시글 삭제
        if (url.pathname === "/api/admin/posts/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM post_comments WHERE post_id=?").bind(b.postId).run();
          await env.DB.prepare("DELETE FROM posts WHERE id=?").bind(b.postId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 뉴스 목록 (어드민)
        if (url.pathname === "/api/admin/news" && method === "POST") {
          const { results } = await env.DB.prepare(
            "SELECT n.*,(SELECT COUNT(*) FROM news_comments c WHERE c.news_id=n.id) as cmt_count FROM news n ORDER BY n.created_at DESC"
          ).all();
          return Response.json(results || [], { headers: cors });
        }
        // 뉴스 등록
        if (url.pathname === "/api/admin/news/add" && method === "POST") {
          await env.DB.prepare("INSERT INTO news (title,link,summary) VALUES (?,?,?)").bind(b.title, b.link || "", b.summary || "").run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 뉴스 삭제
        if (url.pathname === "/api/admin/news/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM news_comments WHERE news_id=?").bind(b.newsId).run();
          await env.DB.prepare("DELETE FROM news WHERE id=?").bind(b.newsId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 미디어 추가
        if (url.pathname === "/api/admin/media/add" && method === "POST") {
          await env.DB.prepare("INSERT INTO media (name,url,icon) VALUES (?,?,?)").bind(b.name, b.url, b.icon || "fa-solid fa-link").run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 미디어 삭제
        if (url.pathname === "/api/admin/media/delete" && method === "POST") {
          await env.DB.prepare("DELETE FROM media WHERE id=?").bind(b.mediaId).run();
          return Response.json({ status: "success" }, { headers: cors });
        }
        // 속성 조회
        if (url.pathname === "/api/admin/props/get" && method === "POST") {
          return Response.json({
            base_name:   (await env.KV.get("prop:base_name"))   || "Morning Dock",
            base_desc:   (await env.KV.get("prop:base_desc"))   || "",
            base_notice: (await env.KV.get("prop:base_notice")) || "",
          }, { headers: cors });
        }
        // 속성 저장
        if (url.pathname === "/api/admin/props/update" && method === "POST") {
          await env.KV.put(`prop:${b.key}`, b.value);
          return Response.json({ status: "success" }, { headers: cors });
        }
      }

      return new Response("Morning Dock V25.0 ACTIVE", { status: 200, headers: cors });

    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: cors });
    }
  }
};

/* ===================================================
   TOTP 검증
   =================================================== */
async function verifyTOTP(secret, code) {
  try {
    const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    for (const ch of secret.toUpperCase()) {
      const v = ABC.indexOf(ch);
      if (v >= 0) bits += v.toString(2).padStart(5, "0");
    }
    const key = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i*8, i*8+8), 2);
    const counter = BigInt(Math.floor(Date.now() / 30000));
    for (let d = -1n; d <= 1n; d++) {
      const buf = new ArrayBuffer(8);
      new DataView(buf).setBigUint64(0, counter + d, false);
      const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
      const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", k, buf));
      const off = hmac[hmac.length - 1] & 0x0f;
      const trunc = ((hmac[off]&0x7f)<<24|(hmac[off+1]&0xff)<<16|(hmac[off+2]&0xff)<<8|(hmac[off+3]&0xff));
      if ((trunc % 1000000).toString().padStart(6, "0") === code.trim()) return true;
    }
    return false;
  } catch { return false; }
}

/* ===================================================
   UI
   =================================================== */
function buildUI(baseName, baseNotice, baseDesc) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${baseName}</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f0f2f5;font-family:'Pretendard',sans-serif;letter-spacing:-.02em;overflow:hidden;}
:root{--navy:#314e8d;}

/* 사이드바 */
.sidebar{background:#fff;border-right:1px solid #e2e8f0;width:15rem;flex-shrink:0;display:flex;flex-direction:column;height:100vh;}
.nav-btn{display:flex;align-items:center;width:100%;padding:.7rem 1rem;border-radius:.6rem;font-size:.82rem;font-weight:700;color:#64748b;border:none;background:transparent;cursor:pointer;transition:.15s;gap:.65rem;}
.nav-btn:hover:not(.on){background:#f8fafc;}
.nav-btn.on{background:var(--navy);color:#fff;box-shadow:0 4px 12px rgba(49,78,141,.25);}

/* 카드 */
.card{background:#fff;border-radius:1rem;border:1px solid #e8ecf2;box-shadow:0 1px 4px rgba(0,0,0,.05);}

/* 테이블 */
.tbl{width:100%;border-collapse:collapse;font-size:.82rem;}
.tbl th{background:#f8fafc;border-bottom:2px solid var(--navy);padding:.65rem 1rem;text-align:left;font-size:.72rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;}
.tbl td{padding:.65rem 1rem;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
.tbl tbody tr:hover td{background:#fafbfc;}

/* 탭 */
.tab-item{padding:.55rem 1.1rem;font-size:.78rem;font-weight:800;color:#94a3b8;border-bottom:2.5px solid transparent;cursor:pointer;white-space:nowrap;transition:.15s;}
.tab-item.on{color:var(--navy);border-bottom-color:var(--navy);}

/* 배지 */
.bdg{display:inline-flex;align-items:center;padding:.15rem .6rem;border-radius:9999px;font-size:.68rem;font-weight:800;line-height:1.4;}
.bdg-admin{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
.bdg-user{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;}
.bdg-ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;}
.bdg-blocked{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
.bdg-pro{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}
.bdg-con{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;}
.bdg-neu{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;}

/* 인풋/버튼 */
.inp{width:100%;padding:.65rem .9rem;border:1.5px solid #e2e8f0;border-radius:.6rem;font-size:.82rem;font-family:inherit;outline:none;transition:.15s;background:#fff;}
.inp:focus{border-color:var(--navy);box-shadow:0 0 0 3px rgba(49,78,141,.08);}
.btn{padding:.6rem 1.2rem;border-radius:.6rem;font-weight:800;font-size:.78rem;border:none;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:.4rem;}
.btn:hover{transform:translateY(-1px);}
.btn-navy{background:var(--navy);color:#fff;}
.btn-navy:hover{background:#25397a;}
.btn-red{background:#ef4444;color:#fff;}
.btn-red:hover{background:#dc2626;}
.btn-sky{background:#0ea5e9;color:#fff;}
.btn-sky:hover{background:#0284c7;}
.btn-ghost{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;}
.btn-ghost:hover{background:#e2e8f0;}
.btn-sm{padding:.35rem .8rem;font-size:.72rem;}

/* 모달 */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:5000;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
.modal-box{background:#fff;border-radius:1.25rem;padding:2rem;width:90%;max-width:640px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);}

/* 스크롤 */
.sc::-webkit-scrollbar{width:4px;}
.sc::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px;}

/* 애니 */
.fade{animation:fd .2s ease;}
@keyframes fd{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}

/* 찬반 버튼 */
.stance-btn{padding:.4rem .9rem;border-radius:.5rem;font-size:.75rem;font-weight:800;border:2px solid transparent;cursor:pointer;transition:.15s;}
.stance-pro{background:#fef2f2;color:#dc2626;border-color:#fecaca;}
.stance-pro.sel,.stance-pro:hover{background:#dc2626;color:#fff;border-color:#dc2626;}
.stance-neu{background:#f8fafc;color:#64748b;border-color:#e2e8f0;}
.stance-neu.sel,.stance-neu:hover{background:#475569;color:#fff;border-color:#475569;}
.stance-con{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;}
.stance-con.sel,.stance-con:hover{background:#1d4ed8;color:#fff;border-color:#1d4ed8;}
</style>
</head>
<body class="flex h-screen w-screen">

<!-- ════════════ AUTH ════════════ -->
<div id="auth-gate" class="fixed inset-0 z-[9000] bg-slate-50 flex items-center justify-center">
  <div class="bg-white w-96 rounded-2xl p-10 shadow-2xl border border-slate-100 text-center">
    <h1 class="text-2xl font-black text-[#314e8d] italic uppercase mb-1">${baseName}</h1>
    <p class="text-xs text-slate-400 mb-8">${baseDesc}</p>

    <div id="s-login" class="space-y-3">
      <input id="login-email" type="email" placeholder="agent@mail.sec" class="inp">
      <button onclick="doLogin()" class="btn btn-navy w-full justify-center py-3">지휘관 인가</button>
      <button onclick="showStep('register')" class="text-xs text-slate-400 hover:underline mt-1">신규 대원 등록</button>
    </div>

    <div id="s-register" class="hidden space-y-3 text-left">
      <p class="text-sm font-black text-slate-700 mb-1">신규 대원 등록</p>
      <input id="reg-email" type="email" placeholder="이메일" class="inp">
      <div id="reg-qr-wrap" class="hidden text-center py-5 bg-slate-50 rounded-xl border-2 border-dashed">
        <img id="reg-qr" class="w-36 h-36 mx-auto rounded-lg shadow mb-2">
        <p class="text-xs text-slate-500">Google Authenticator로 QR을 스캔하세요</p>
      </div>
      <button id="reg-btn" onclick="doRegStep()" class="btn btn-navy w-full justify-center py-3">인증키 발급</button>
      <button onclick="showStep('login')" class="text-xs text-slate-400 hover:underline w-full text-center">← 돌아가기</button>
    </div>

    <div id="s-otp" class="hidden space-y-6">
      <p class="text-xs text-slate-400">Google Authenticator 6자리 코드 입력</p>
      <input id="otp-code" type="text" maxlength="6" placeholder="000000"
        class="w-full text-center text-5xl font-black border-b-4 border-[#314e8d] py-2 tracking-[.5em] outline-none bg-transparent">
      <button onclick="doOtp()" class="btn btn-navy w-full justify-center py-3">최종 승인</button>
    </div>

    <div id="auth-err" class="hidden mt-4 text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100"></div>
  </div>
</div>

<!-- ════════════ SIDEBAR ════════════ -->
<aside id="sidebar" class="sidebar hidden">
  <div class="p-5 border-b">
    <p class="text-lg font-black text-[#314e8d] italic uppercase">${baseName}</p>
    <p class="text-[10px] text-slate-400 mt-0.5">${baseDesc}</p>
  </div>
  <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto sc">
    <button onclick="nav('dash')"  id="nb-dash"  class="nav-btn on"><i class="fa-solid fa-gauge-high w-4"></i>대시보드</button>
    <button onclick="nav('news')"  id="nb-news"  class="nav-btn"><i class="fa-solid fa-newspaper w-4"></i>뉴스 인텔리전스</button>
    <button onclick="nav('comm')"  id="nb-comm"  class="nav-btn"><i class="fa-solid fa-comments w-4"></i>모두의 공간</button>
    <button onclick="nav('media')" id="nb-media" class="nav-btn"><i class="fa-solid fa-play-circle w-4"></i>미디어 센터</button>
    <div id="admin-zone" class="hidden pt-3 mt-2 border-t">
      <p class="px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Commander</p>
      <button onclick="nav('admin')" id="nb-admin" class="nav-btn" style="color:#dc2626">
        <i class="fa-solid fa-user-shield w-4"></i>중앙 제어판
      </button>
    </div>
  </nav>
  <div class="p-4 border-t bg-slate-50">
    <div class="flex items-center gap-3 mb-3">
      <div id="avatar" class="w-8 h-8 rounded-lg bg-[#314e8d] text-white font-black text-sm flex items-center justify-center shadow">?</div>
      <div class="overflow-hidden">
        <p id="user-email-ui" class="text-xs font-bold text-slate-700 truncate"></p>
        <p id="user-role-ui"  class="text-[9px] text-slate-400 uppercase font-black"></p>
      </div>
    </div>
    <button onclick="location.reload()" class="w-full border rounded-lg py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 uppercase">인가 해제</button>
  </div>
</aside>

<!-- ════════════ MAIN ════════════ -->
<main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-[#f0f2f5]">
  <header class="h-12 bg-white border-b px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
    <div class="flex items-center gap-3">
      <span id="view-title" class="text-[10px] font-black uppercase tracking-[.3em] text-slate-400 italic">Dashboard</span>
      <span class="text-slate-200">│</span>
      <span class="text-[10px] text-slate-400">${baseNotice}</span>
    </div>
    <div class="flex items-center gap-3">
      <div id="session-timer" class="text-[9px] font-black text-red-400 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">60:00</div>
      <div id="clock" class="text-[11px] font-black text-[#314e8d] font-mono">00:00:00</div>
    </div>
  </header>
  <div id="page" class="flex-1 overflow-y-auto p-6 sc">
    <div id="page-inner" class="max-w-[1200px] mx-auto"></div>
  </div>
</main>

<!-- ════════════ 공통 모달 ════════════ -->
<div id="modal" class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div id="modal-box" class="modal-box sc"></div>
</div>

<!-- ════════════ 토스트 ════════════ -->
<div id="toast" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] hidden">
  <div id="toast-inner" class="px-5 py-3 rounded-xl text-white text-xs font-black shadow-2xl"></div>
</div>

<script>
/* ─────────────────────────────────────
   상태
───────────────────────────────────── */
const G = {
  user: null,
  tab: 'agents',
  regSecret: '',
  regFinal: false,
  sessionSec: 3600,
  discussNewsId: null,
  editCmtId: null,
};

/* ─────────────────────────────────────
   유틸
───────────────────────────────────── */
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

async function api(path, body, method='POST') {
  const res = await fetch(path, {
    method,
    headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}
async function apiGet(path) {
  return (await fetch(path)).json();
}

let toastTimer;
function toast(msg, type='ok') {
  const el = $('toast-inner');
  el.innerText = msg;
  el.className = 'px-5 py-3 rounded-xl text-white text-xs font-black shadow-2xl ' + (type==='ok' ? 'bg-[#314e8d]' : 'bg-red-500');
  $('toast').classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 2500);
}

/* ─────────────────────────────────────
   타이머
───────────────────────────────────── */
setInterval(() => {
  $('clock').innerText = new Date().toLocaleTimeString('ko-KR', {hour12:false});
  if (G.user) {
    G.sessionSec--;
    const t = $('session-timer');
    t.innerText = Math.floor(G.sessionSec/60) + ':' + String(G.sessionSec%60).padStart(2,'0');
    if (G.sessionSec <= 0) location.reload();
  }
}, 1000);

/* ─────────────────────────────────────
   인증
───────────────────────────────────── */
function showStep(s) {
  ['login','register','otp'].forEach(x => $('s-'+x).classList.add('hidden'));
  $('s-'+s).classList.remove('hidden');
  $('auth-err').classList.add('hidden');
}
function authErr(msg) {
  $('auth-err').innerText = msg;
  $('auth-err').classList.remove('hidden');
}

async function doLogin() {
  const email = $('login-email').value.trim();
  if (!email) return authErr('이메일을 입력하세요');
  const d = await api('/api/auth/login', {email});
  if (d.error) return authErr(d.error);
  G.user = d;
  showStep('otp');
}

async function doRegStep() {
  if (G.regFinal) {
    const email = $('reg-email').value.trim();
    const d = await api('/api/auth/register', {email, secret: G.regSecret});
    if (d.error) return authErr(d.error);
    toast('등록 완료! 로그인하세요.');
    G.regFinal = false;
    showStep('login');
    return;
  }
  const email = $('reg-email').value.trim();
  if (!email) return authErr('이메일을 입력하세요');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  G.regSecret = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => chars[b % 32]).join('');
  $('reg-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' +
    encodeURIComponent('otpauth://totp/MorningDock:'+email+'?secret='+G.regSecret+'&issuer=MorningDock');
  $('reg-qr-wrap').classList.remove('hidden');
  $('reg-btn').innerText = '✅ 등록 완료 (QR 스캔 후 클릭)';
  G.regFinal = true;
}

async function doOtp() {
  const code = $('otp-code').value.trim();
  const d = await api('/api/auth/otp-verify', {uid: G.user.uid, code});
  if (d.error) return authErr(d.error);
  G.user = d;
  boot();
}

function boot() {
  $('auth-gate').classList.add('hidden');
  $('sidebar').classList.remove('hidden');
  $('main').classList.remove('hidden');
  $('user-email-ui').innerText = G.user.email;
  $('user-role-ui').innerText = G.user.role;
  $('avatar').innerText = G.user.email[0].toUpperCase();
  if (G.user.role === 'ADMIN') $('admin-zone').classList.remove('hidden');
  nav('dash');
}

/* ─────────────────────────────────────
   네비
───────────────────────────────────── */
const V_TITLE = {dash:'Dashboard', news:'News Intelligence', comm:'모두의 공간', media:'Media Center', admin:'Commander Control'};

async function nav(v) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
  if ($('nb-'+v)) $('nb-'+v).classList.add('on');
  $('view-title').innerText = V_TITLE[v] || v;
  const inner = $('page-inner');
  inner.innerHTML = '<div class="flex justify-center py-32"><i class="fa-solid fa-spinner fa-spin text-4xl text-slate-200"></i></div>';
  inner.className = 'max-w-[1200px] mx-auto fade';

  if (v === 'dash')  await renderDash(inner);
  if (v === 'news')  await renderNews(inner);
  if (v === 'comm')  await renderComm(inner);
  if (v === 'media') await renderMedia(inner);
  if (v === 'admin') await renderAdmin(inner);
}

/* ─────────────────────────────────────
   대시보드
───────────────────────────────────── */
async function renderDash(el) {
  const d = await apiGet('/api/stats');
  el.innerHTML = \`
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      \${[['뉴스','fa-newspaper','blue',d.newsCount],['보고서','fa-file-lines','emerald',d.postCount],['대원','fa-users','amber',d.userCount],['미디어','fa-play-circle','purple',d.mediaCount]]
        .map(([l,ic,c,n]) => \`
        <div class="card p-5 flex items-center gap-4 border-l-4 border-l-\${c}-400">
          <div class="w-10 h-10 bg-\${c}-50 rounded-xl flex items-center justify-center text-lg text-\${c}-500">
            <i class="fa-solid \${ic}"></i>
          </div>
          <div>
            <p class="text-[9px] font-black text-slate-400 uppercase">\${l}</p>
            <p class="text-2xl font-black text-slate-800">\${n}</p>
          </div>
        </div>\`).join('')}
    </div>
    <div class="card p-8 border-l-4 border-l-[#314e8d]">
      <p class="text-base font-black text-slate-700">필승! 사령관님. 뉴스 \${d.newsCount}건, 보고서 \${d.postCount}건 감찰 중입니다. 🫡🔥</p>
    </div>\`;
}

/* ─────────────────────────────────────
   뉴스 인텔리전스 (토론 포함)
───────────────────────────────────── */
async function renderNews(el) {
  const news = await apiGet('/api/news');
  if (!news.length) {
    el.innerHTML = '<div class="text-center py-32 text-slate-300 font-black text-sm">등록된 뉴스가 없습니다</div>';
    return;
  }
  el.innerHTML = news.map(n => \`
    <div class="card p-6 mb-4 border-l-4 border-l-[#314e8d]">
      <div class="flex justify-between items-start gap-4 mb-3">
        <h4 class="font-black text-sm flex-1 cursor-pointer hover:text-[#314e8d] transition"
          onclick="if('\${esc(n.link||'')}')window.open('\${esc(n.link||'')}')">\${esc(n.title)}</h4>
        <span class="text-[10px] font-mono text-slate-400 shrink-0">\${new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
      <p class="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl italic mb-4 leading-relaxed">\${esc(n.summary||'요약 없음')}</p>
      <div class="flex justify-end">
        <button onclick="openNewsDiscuss(\${n.id}, \${JSON.stringify(esc(n.title))})"
          class="btn btn-navy btn-sm"><i class="fa-solid fa-comments"></i>토론의 장 입장</button>
      </div>
    </div>\`).join('');
}

/* ─────────────────────────────────────
   뉴스 토론 모달 (찬반 댓글 CRUD)
───────────────────────────────────── */
let currentStance = 'neutral';

async function openNewsDiscuss(newsId, title) {
  G.discussNewsId = newsId;
  G.editCmtId = null;
  currentStance = 'neutral';
  $('modal-box').innerHTML = \`
    <div class="flex justify-between items-start mb-5">
      <div>
        <h3 class="font-black text-base text-slate-800">\${esc(title)}</h3>
        <p class="text-[10px] text-[#314e8d] font-black uppercase mt-0.5">📢 토론의 장</p>
      </div>
      <button onclick="closeModal()" class="text-slate-300 hover:text-slate-500 text-2xl leading-none">×</button>
    </div>

    <!-- 찬반 통계 -->
    <div id="stance-stats" class="flex gap-2 mb-4"></div>

    <!-- 댓글 목록 -->
    <div id="discuss-list" class="space-y-2 mb-5 max-h-64 overflow-y-auto sc
      border border-slate-100 rounded-xl p-3 bg-slate-50/50"></div>

    <!-- 입력 영역 -->
    <div class="border-t pt-4">
      <p id="edit-label" class="text-xs font-black text-slate-500 mb-2">새 의견 상신</p>

      <!-- 찬반 선택 -->
      <div class="flex gap-2 mb-3">
        <button id="sb-pro" onclick="setStance('pro')"
          class="stance-btn stance-pro">👍 찬성</button>
        <button id="sb-neu" onclick="setStance('neutral')"
          class="stance-btn stance-neu sel">💬 중립</button>
        <button id="sb-con" onclick="setStance('con')"
          class="stance-btn stance-con">👎 반대</button>
      </div>

      <div class="flex gap-2">
        <textarea id="cmt-input" rows="2" placeholder="고견을 상신하십시오..."
          class="inp flex-1" style="resize:none;"></textarea>
        <div class="flex flex-col gap-2">
          <button onclick="submitCmt()" class="btn btn-navy btn-sm h-full px-4">상신</button>
          <button id="cancel-edit-btn" onclick="cancelEdit()" class="btn btn-ghost btn-sm hidden">취소</button>
        </div>
      </div>
    </div>\`;

  openModal();
  await loadNewsDiscuss();
}

function setStance(s) {
  currentStance = s;
  ['pro','neu','con'].forEach(x => {
    const btn = document.getElementById('sb-'+x);
    if(btn) btn.classList.toggle('sel', (x==='neu'?'neutral':x) === s || x === s);
  });
  // 정확히
  document.getElementById('sb-pro')?.classList.toggle('sel', s==='pro');
  document.getElementById('sb-neu')?.classList.toggle('sel', s==='neutral');
  document.getElementById('sb-con')?.classList.toggle('sel', s==='con');
}

async function loadNewsDiscuss() {
  const box = $('discuss-list');
  const statsEl = $('stance-stats');
  if (!box) return;

  const cmts = await apiGet('/api/news/'+G.discussNewsId+'/comments');
  if (!Array.isArray(cmts)) return;

  // 통계
  const pro = cmts.filter(c=>c.stance==='pro').length;
  const con = cmts.filter(c=>c.stance==='con').length;
  const neu = cmts.filter(c=>c.stance==='neutral').length;
  if (statsEl) statsEl.innerHTML = \`
    <span class="bdg bdg-pro">👍 찬성 \${pro}</span>
    <span class="bdg bdg-neu">💬 중립 \${neu}</span>
    <span class="bdg bdg-con">👎 반대 \${con}</span>
    <span class="bdg" style="background:#f8fafc;color:#64748b;border:1px solid #e2e8f0;">전체 \${cmts.length}</span>\`;

  if (!cmts.length) {
    box.innerHTML = '<p class="text-center py-8 text-xs text-slate-300">아직 토론이 없습니다. 첫 의견을 남겨보세요!</p>';
    return;
  }

  const myUid = G.user?.uid;
  const isAdmin = G.user?.role === 'ADMIN';
  box.innerHTML = cmts.map(c => {
    const isMine = c.user_id === myUid;
    const bdgClass = c.stance==='pro'?'bdg-pro': c.stance==='con'?'bdg-con':'bdg-neu';
    const bdgLabel = c.stance==='pro'?'👍 찬성': c.stance==='con'?'👎 반대':'💬 중립';
    return \`
      <div class="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
        <div class="flex justify-between items-center mb-1.5">
          <div class="flex items-center gap-2">
            <span class="bdg \${bdgClass}">\${bdgLabel}</span>
            <span class="text-[10px] font-black text-[#314e8d]">\${esc((c.email||'').split('@')[0])} 대원</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-mono text-slate-300">\${new Date(c.created_at).toLocaleString('ko-KR')}</span>
            \${(isMine||isAdmin) ? \`
              <button onclick="startEditCmt(\${c.id},\${JSON.stringify(esc(c.content))},'\${c.stance}')"
                class="btn btn-ghost btn-sm text-[9px]"><i class="fa-solid fa-pen"></i></button>
              <button onclick="deleteCmt(\${c.id})"
                class="btn btn-red btn-sm text-[9px]"><i class="fa-solid fa-trash"></i></button>
            \` : ''}
          </div>
        </div>
        <p class="text-xs text-slate-700 leading-relaxed" id="cmt-text-\${c.id}">\${esc(c.content)}</p>
      </div>\`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

async function submitCmt() {
  const content = $('cmt-input').value.trim();
  if (!content) return toast('내용을 입력하세요', 'err');

  if (G.editCmtId) {
    // 수정
    const d = await api('/api/news/comments/'+G.editCmtId, {sessionId:G.user.sessionId, content, stance:currentStance}, 'PUT');
    if (d.error) return toast(d.error, 'err');
    toast('수정 완료');
    cancelEdit();
  } else {
    // 등록
    const d = await api('/api/news/'+G.discussNewsId+'/comments', {sessionId:G.user.sessionId, content, stance:currentStance});
    if (d.error) return toast(d.error, 'err');
    toast('상신 완료');
  }
  $('cmt-input').value = '';
  await loadNewsDiscuss();
}

function startEditCmt(id, content, stance) {
  G.editCmtId = id;
  $('cmt-input').value = content;
  $('edit-label').innerText = '✏️ 의견 수정 중';
  $('cancel-edit-btn').classList.remove('hidden');
  setStance(stance || 'neutral');
  $('cmt-input').focus();
}

function cancelEdit() {
  G.editCmtId = null;
  $('cmt-input').value = '';
  $('edit-label').innerText = '새 의견 상신';
  $('cancel-edit-btn').classList.add('hidden');
  setStance('neutral');
}

async function deleteCmt(id) {
  if (!confirm('이 의견을 삭제하시겠습니까?')) return;
  const d = await api('/api/news/comments/'+id, {sessionId:G.user.sessionId}, 'DELETE');
  if (d.error) return toast(d.error, 'err');
  toast('삭제 완료');
  await loadNewsDiscuss();
}

/* ─────────────────────────────────────
   모두의 공간
───────────────────────────────────── */
async function renderComm(el) {
  const posts = await apiGet('/api/community/posts');
  el.innerHTML = \`
    <div class="flex justify-between items-center mb-5">
      <h3 class="text-lg font-black text-[#314e8d] italic uppercase">모두의 공간</h3>
      <button onclick="openWrite()" class="btn btn-navy"><i class="fa-solid fa-pen"></i>새 보고 상신</button>
    </div>
    <div class="card overflow-hidden">
      <table class="tbl">
        <thead><tr><th style="width:50px;text-align:center">ID</th><th>보고 제목</th><th style="width:150px;text-align:center">대원</th><th style="width:120px;text-align:center">일시</th></tr></thead>
        <tbody>
          \${posts.length ? posts.map(p=>\`
            <tr class="cursor-pointer" onclick="readPost(\${p.id})">
              <td style="text-align:center" class="font-mono text-slate-400 text-xs">\${p.id}</td>
              <td class="font-bold">\${esc(p.title)}</td>
              <td style="text-align:center" class="text-slate-500 italic text-xs">\${esc((p.email||'').split('@')[0])}</td>
              <td style="text-align:center" class="font-mono text-slate-400 text-xs">\${new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
            </tr>\`).join('')
            : '<tr><td colspan="4" style="text-align:center;padding:3rem;color:#cbd5e1;font-size:.8rem;">게시글이 없습니다</td></tr>'}
        </tbody>
      </table>
    </div>\`;
}

async function openWrite() {
  $('modal-box').innerHTML = \`
    <div class="flex justify-between items-center mb-5">
      <h3 class="font-black text-base">정보 보고 상신</h3>
      <button onclick="closeModal()" class="text-slate-300 hover:text-slate-500 text-2xl">×</button>
    </div>
    <div class="space-y-3">
      <input id="p-title" class="inp" placeholder="보고 제목">
      <textarea id="p-content" class="inp" rows="8" style="resize:none;" placeholder="분석 내용..."></textarea>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal()" class="btn btn-ghost">취소</button>
      <button onclick="submitPost()" class="btn btn-navy">상신 확정</button>
    </div>\`;
  openModal();
}

async function submitPost() {
  const title = $('p-title').value.trim();
  const content = $('p-content').value.trim();
  if (!title || !content) return toast('제목과 내용을 입력하세요', 'err');
  const d = await api('/api/community/posts', {sessionId:G.user.sessionId, title, content});
  if (d.error) return toast(d.error, 'err');
  toast('상신 완료');
  closeModal();
  nav('comm');
}

async function readPost(id) {
  const p = await apiGet('/api/community/posts/detail?id='+id);
  $('modal-box').innerHTML = \`
    <div class="flex justify-between items-start mb-6">
      <div>
        <h3 class="font-black text-lg text-slate-800">\${esc(p.title)}</h3>
        <p class="text-[10px] text-slate-400 mt-1">by \${esc((p.email||'').split('@')[0])}</p>
      </div>
      <button onclick="closeModal()" class="text-slate-300 hover:text-slate-500 text-2xl">×</button>
    </div>
    <div class="bg-slate-50 p-5 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-line min-h-[180px] mb-6">
      \${esc(p.content)}
    </div>
    <div class="flex justify-center">
      <button onclick="openPostDiscuss(\${p.id}, \${JSON.stringify(esc(p.title))})"
        class="btn btn-navy px-10 py-3">
        <i class="fa-solid fa-comments"></i>이 안건으로 토론의 장 입장
      </button>
    </div>\`;
  openModal();
}

async function openPostDiscuss(postId, title) {
  $('modal-box').innerHTML = \`
    <div class="flex justify-between items-start mb-5">
      <div>
        <h3 class="font-black text-base text-slate-800">\${esc(title)}</h3>
        <p class="text-[10px] text-[#314e8d] font-black uppercase mt-0.5">📢 토론의 장</p>
      </div>
      <button onclick="closeModal()" class="text-slate-300 hover:text-slate-500 text-2xl">×</button>
    </div>
    <div id="post-cmt-list" class="space-y-2 mb-4 max-h-64 overflow-y-auto sc
      border border-slate-100 rounded-xl p-3 bg-slate-50/50"></div>
    <div class="flex gap-2 border-t pt-4">
      <textarea id="post-cmt-input" rows="2" placeholder="의견을 입력하세요..."
        class="inp flex-1" style="resize:none;"></textarea>
      <button onclick="submitPostCmt(\${postId})" class="btn btn-navy btn-sm px-5">상신</button>
    </div>\`;
  openModal();

  const cmts = await apiGet('/api/community/discuss/'+postId);
  const box = $('post-cmt-list');
  if (!box) return;
  box.innerHTML = Array.isArray(cmts) && cmts.length
    ? cmts.map(c => \`
        <div class="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <p class="text-[10px] font-black text-[#314e8d] mb-1">\${esc((c.email||'').split('@')[0])} 대원</p>
          <p class="text-xs text-slate-700">\${esc(c.content)}</p>
        </div>\`).join('')
    : '<p class="text-center py-8 text-xs text-slate-300">아직 의견이 없습니다.</p>';
  box.scrollTop = box.scrollHeight;
}

async function submitPostCmt(postId) {
  const content = $('post-cmt-input').value.trim();
  if (!content) return;
  await api('/api/community/discuss/'+postId, {sessionId:G.user.sessionId, content});
  $('post-cmt-input').value = '';
  openPostDiscuss(postId, '토론');
}

/* ─────────────────────────────────────
   미디어
───────────────────────────────────── */
async function renderMedia(el) {
  const media = await apiGet('/api/media');
  el.innerHTML = '<h3 class="text-lg font-black text-[#314e8d] italic uppercase mb-5">Media Center</h3>' +
    (media.length
      ? \`<div class="grid grid-cols-2 md:grid-cols-4 gap-4">\${media.map(m=>\`
          <div class="card p-7 text-center cursor-pointer hover:shadow-md transition"
            onclick="window.open('\${esc(m.url)}')">
            <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border text-2xl text-[#314e8d] shadow-inner">
              <i class="\${esc(m.icon)||'fa-solid fa-link'}"></i>
            </div>
            <p class="font-black text-xs uppercase truncate">\${esc(m.name)}</p>
          </div>\`).join('')}</div>\`
      : '<div class="text-center py-32 text-slate-300 font-black text-sm">등록된 미디어가 없습니다</div>');
}

/* ─────────────────────────────────────
   어드민
───────────────────────────────────── */
async function renderAdmin(el) {
  G.tab = G.tab || 'agents';
  el.innerHTML = \`
    <div class="card border-t-4 border-t-red-500">
      <div class="px-6 py-4 border-b bg-red-50/40">
        <h3 class="font-black text-red-600 italic text-sm">
          <i class="fa-solid fa-user-shield mr-2"></i>Commander Control Panel
        </h3>
      </div>
      <div class="flex border-b px-4 overflow-x-auto">
        \${[['agents','👥 대원 권한'],['posts','📋 게시글 관리'],['news','📰 뉴스 관리'],['media','🔗 미디어 관리'],['props','⚙️ 기지 속성']]
          .map(([k,l]) => \`<div onclick="adminTab('\${k}')" id="at-\${k}" class="tab-item\${G.tab===k?' on':''}">\${l}</div>\`).join('')}
      </div>
      <div id="admin-body" class="p-6 min-h-[420px]"></div>
    </div>\`;
  await loadAdminTab();
}

async function adminTab(t) {
  G.tab = t;
  document.querySelectorAll('.tab-item').forEach(e => e.classList.remove('on'));
  const el = $('at-'+t);
  if (el) el.classList.add('on');
  await loadAdminTab();
}

async function loadAdminTab() {
  const box = $('admin-body');
  if (!box) return;
  box.innerHTML = '<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-3xl text-slate-200"></i></div>';
  const sid = G.user.sessionId;

  /* ── 대원 권한 ── */
  if (G.tab === 'agents') {
    const users = await api('/api/admin/users', {sessionId:sid});
    if (!Array.isArray(users) || users.error) { box.innerHTML = '<p class="text-red-500 text-xs p-4">'+esc(users?.error||'오류')+'</p>'; return; }
    box.innerHTML = \`
      <p class="text-xs text-slate-400 mb-4">대원의 역할과 상태를 변경합니다.</p>
      <div class="overflow-hidden rounded-xl border">
        <table class="tbl">
          <thead>
            <tr>
              <th>이메일</th>
              <th style="width:90px">역할</th>
              <th style="width:100px">상태</th>
              <th style="width:110px">등록일</th>
              <th style="width:120px;text-align:center">조치</th>
            </tr>
          </thead>
          <tbody>
            \${users.map(u => \`
              <tr>
                <td class="font-bold text-xs">\${esc(u.email)}</td>
                <td><span class="bdg \${u.role==='ADMIN'?'bdg-admin':'bdg-user'}">\${u.role}</span></td>
                <td><span class="bdg \${u.status==='APPROVED'?'bdg-ok':'bdg-blocked'}">\${u.status}</span></td>
                <td class="font-mono text-slate-400 text-xs">\${new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                <td>
                  <div class="flex gap-1.5 justify-center">
                    <button onclick='openEditUser(\${JSON.stringify(u)})' class="btn btn-ghost btn-sm">수정</button>
                    <button onclick="delUser('\${u.uid}')" class="btn btn-red btn-sm">삭제</button>
                  </div>
                </td>
              </tr>\`).join('')}
          </tbody>
        </table>
      </div>\`;
  }

  /* ── 게시글 관리 ── */
  if (G.tab === 'posts') {
    const posts = await api('/api/admin/posts', {sessionId:sid});
    if (!Array.isArray(posts)) { box.innerHTML = '<p class="text-red-500 text-xs p-4">오류</p>'; return; }
    box.innerHTML = \`
      <p class="text-xs text-slate-400 mb-4">부적절한 게시글을 삭제합니다. 삭제 시 관련 댓글도 함께 삭제됩니다.</p>
      <div class="overflow-hidden rounded-xl border">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:50px">ID</th>
              <th>제목</th>
              <th style="width:160px">작성자</th>
              <th style="width:110px">등록일</th>
              <th style="width:80px;text-align:center">조치</th>
            </tr>
          </thead>
          <tbody>
            \${posts.length ? posts.map(p=>\`
              <tr>
                <td class="font-mono text-slate-400 text-xs">\${p.id}</td>
                <td class="font-bold text-xs">\${esc(p.title)}</td>
                <td class="text-slate-500 text-xs">\${esc(p.email||'-')}</td>
                <td class="font-mono text-slate-400 text-xs">\${new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                <td style="text-align:center">
                  <button onclick="delPost(\${p.id})" class="btn btn-red btn-sm">파기</button>
                </td>
              </tr>\`).join('')
              : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;font-size:.8rem;">게시글 없음</td></tr>'}
          </tbody>
        </table>
      </div>\`;
  }

  /* ── 뉴스 관리 ── */
  if (G.tab === 'news') {
    const news = await api('/api/admin/news', {sessionId:sid});
    if (!Array.isArray(news)) { box.innerHTML = '<p class="text-red-500 text-xs p-4">오류</p>'; return; }
    box.innerHTML = \`
      <div class="card p-5 border-2 border-dashed mb-6 space-y-3">
        <p class="text-xs font-black text-slate-600 uppercase">새 뉴스 등록</p>
        <input id="n-title"   class="inp" placeholder="뉴스 제목 *">
        <input id="n-link"    class="inp" placeholder="원문 링크 (https://...)">
        <textarea id="n-sum"  class="inp" rows="3" style="resize:none;" placeholder="요약 내용"></textarea>
        <button onclick="addNews()" class="btn btn-navy btn-sm"><i class="fa-solid fa-plus"></i>등록</button>
      </div>
      <div class="overflow-hidden rounded-xl border">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:50px">ID</th>
              <th>제목</th>
              <th style="width:80px;text-align:center">토론 수</th>
              <th style="width:110px">등록일</th>
              <th style="width:80px;text-align:center">조치</th>
            </tr>
          </thead>
          <tbody>
            \${news.length ? news.map(n=>\`
              <tr>
                <td class="font-mono text-slate-400 text-xs">\${n.id}</td>
                <td class="font-bold text-xs">
                  \${n.link ? \`<a href="\${esc(n.link)}" target="_blank" class="hover:text-[#314e8d]">\${esc(n.title)}</a>\` : esc(n.title)}
                </td>
                <td style="text-align:center"><span class="font-black text-[#314e8d]">\${n.cmt_count||0}</span></td>
                <td class="font-mono text-slate-400 text-xs">\${new Date(n.created_at).toLocaleDateString('ko-KR')}</td>
                <td style="text-align:center">
                  <button onclick="delNews(\${n.id})" class="btn btn-red btn-sm">삭제</button>
                </td>
              </tr>\`).join('')
              : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#cbd5e1;font-size:.8rem;">뉴스 없음</td></tr>'}
          </tbody>
        </table>
      </div>\`;
  }

  /* ── 미디어 관리 ── */
  if (G.tab === 'media') {
    const media = await apiGet('/api/media');
    box.innerHTML = \`
      <div class="card p-5 border-2 border-dashed mb-6">
        <p class="text-xs font-black text-slate-600 uppercase mb-3">새 미디어 추가</p>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <input id="m-name" class="inp" placeholder="미디어 명칭 *">
          <input id="m-url"  class="inp" placeholder="URL (https://...) *">
          <input id="m-icon" class="inp" placeholder="FA 아이콘 (fa-brands fa-youtube)">
        </div>
        <button onclick="addMedia()" class="btn btn-navy btn-sm"><i class="fa-solid fa-plus"></i>추가</button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        \${media.length ? media.map(m=>\`
          <div class="card p-4 flex items-center gap-3">
            <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#314e8d] text-lg shrink-0">
              <i class="\${esc(m.icon)||'fa-solid fa-link'}"></i>
            </div>
            <div class="flex-1 overflow-hidden">
              <p class="font-black text-xs truncate">\${esc(m.name)}</p>
              <p class="text-[10px] text-slate-400 truncate">\${esc(m.url)}</p>
            </div>
            <button onclick="delMedia(\${m.id})" class="btn btn-red btn-sm shrink-0">삭제</button>
          </div>\`).join('')
          : '<p class="col-span-3 text-center py-12 text-slate-300 text-xs font-black">미디어 없음</p>'}
      </div>\`;
  }

  /* ── 기지 속성 ── */
  if (G.tab === 'props') {
    const props = await api('/api/admin/props/get', {sessionId:sid});
    box.innerHTML = \`
      <p class="text-xs text-slate-400 mb-6">기지 기본 속성을 관리합니다. 저장 후 새로고침 시 헤더/타이틀에 반영됩니다.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div class="card p-5 space-y-3">
          <p class="text-xs font-black text-slate-600 uppercase">기지 명칭</p>
          <input id="prop-name" class="inp" value="\${esc(props?.base_name||'')}">
          <button onclick="saveProp('base_name','prop-name')" class="btn btn-navy btn-sm">저장</button>
        </div>
        <div class="card p-5 space-y-3">
          <p class="text-xs font-black text-slate-600 uppercase">기지 설명 (부제)</p>
          <input id="prop-desc" class="inp" value="\${esc(props?.base_desc||'')}">
          <button onclick="saveProp('base_desc','prop-desc')" class="btn btn-navy btn-sm">저장</button>
        </div>
        <div class="card p-5 space-y-3 md:col-span-2">
          <p class="text-xs font-black text-slate-600 uppercase">헤더 공지사항</p>
          <textarea id="prop-notice" class="inp" rows="3" style="resize:none;">\${esc(props?.base_notice||'')}</textarea>
          <button onclick="saveProp('base_notice','prop-notice')" class="btn btn-navy btn-sm">저장</button>
        </div>
      </div>\`;
  }
}

/* ── 어드민 액션 ── */
function openEditUser(u) {
  $('modal-box').innerHTML = \`
    <div class="flex justify-between items-center mb-5">
      <h3 class="font-black text-base">대원 정보 수정</h3>
      <button onclick="closeModal()" class="text-slate-300 hover:text-slate-500 text-2xl">×</button>
    </div>
    <p class="text-xs text-slate-500 mb-1">이메일</p>
    <p class="font-black text-sm mb-5">\${esc(u.email)}</p>
    <div class="grid grid-cols-2 gap-4 mb-5">
      <div>
        <p class="text-xs font-black text-slate-500 mb-1">역할</p>
        <select id="eu-role" class="inp">
          <option value="USER"  \${u.role==='USER' ?'selected':''}>USER</option>
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
    <div class="flex justify-end gap-2">
      <button onclick="closeModal()" class="btn btn-ghost">취소</button>
      <button onclick="saveUser('\${u.uid}')" class="btn btn-navy">저장</button>
    </div>\`;
  openModal();
}

async function saveUser(uid) {
  const d = await api('/api/admin/users/update', {
    sessionId: G.user.sessionId,
    targetUid: uid,
    role: $('eu-role').value,
    status: $('eu-status').value
  });
  if (d.error) return toast(d.error, 'err');
  toast('저장 완료');
  closeModal();
  await loadAdminTab();
}

async function delUser(uid) {
  if (!confirm('이 대원을 영구 삭제합니까?')) return;
  const d = await api('/api/admin/users/delete', {sessionId:G.user.sessionId, targetUid:uid});
  if (d.error) return toast(d.error, 'err');
  toast('삭제 완료');
  await loadAdminTab();
}

async function delPost(id) {
  if (!confirm('이 게시글을 파기합니까?')) return;
  const d = await api('/api/admin/posts/delete', {sessionId:G.user.sessionId, postId:id});
  if (d.error) return toast(d.error, 'err');
  toast('파기 완료');
  await loadAdminTab();
}

async function addNews() {
  const title = $('n-title').value.trim();
  const link  = $('n-link').value.trim();
  const summary = $('n-sum').value.trim();
  if (!title) return toast('제목을 입력하세요', 'err');
  const d = await api('/api/admin/news/add', {sessionId:G.user.sessionId, title, link, summary});
  if (d.error) return toast(d.error, 'err');
  toast('등록 완료');
  await loadAdminTab();
}

async function delNews(id) {
  if (!confirm('뉴스와 관련 토론을 모두 삭제합니까?')) return;
  const d = await api('/api/admin/news/delete', {sessionId:G.user.sessionId, newsId:id});
  if (d.error) return toast(d.error, 'err');
  toast('삭제 완료');
  await loadAdminTab();
}

async function addMedia() {
  const name = $('m-name').value.trim();
  const url  = $('m-url').value.trim();
  const icon = $('m-icon').value.trim();
  if (!name || !url) return toast('명칭과 URL을 입력하세요', 'err');
  const d = await api('/api/admin/media/add', {sessionId:G.user.sessionId, name, url, icon: icon||'fa-solid fa-link'});
  if (d.error) return toast(d.error, 'err');
  toast('추가 완료');
  await loadAdminTab();
}

async function delMedia(id) {
  if (!confirm('미디어를 삭제합니까?')) return;
  const d = await api('/api/admin/media/delete', {sessionId:G.user.sessionId, mediaId:id});
  if (d.error) return toast(d.error, 'err');
  toast('삭제 완료');
  await loadAdminTab();
}

async function saveProp(key, inputId) {
  const value = $(inputId).value.trim();
  const d = await api('/api/admin/props/update', {sessionId:G.user.sessionId, key, value});
  if (d.error) return toast(d.error, 'err');
  toast('저장 완료');
}

/* ── 모달 ── */
function openModal() { $('modal').style.display = 'flex'; }
function closeModal() {
  $('modal').style.display = 'none';
  G.editCmtId = null;
}
<\/script>
</body>
</html>`;
}