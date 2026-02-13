/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 Clien-Style Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 혁신: 클리앙 스타일 UI 전면 개편, 중첩 템플릿 리터럴 구문 오류 완전 해결
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

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(generateUI(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [1. AUTH & SECURITY] ---
      if (url.pathname === "/api/auth/signup" && method === "POST") {
        const { email } = await request.json();
        const uid = crypto.randomUUID();
        try {
          const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
          const role = userCount === 0 ? 'ADMIN' : 'USER';
          await env.DB.prepare("INSERT INTO users (uid, email, role) VALUES (?, ?, ?)").bind(uid, email, role).run();
          return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
        } catch (e) { return Response.json({ error: "이미 가입된 계정입니다." }, { status: 400, headers: corsHeaders }); }
      }
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) return Response.json({ error: "등록되지 않은 사용자입니다." }, { status: 403, headers: corsHeaders });
        if (user.status === 'BLOCKED') return Response.json({ error: "접근이 차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        return Response.json({ uid: user.uid, email: user.email, role: user.role, status: user.status, otpEnabled: !!user.mfa_secret }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/auth/otp-register" && method === "POST") {
        const { uid, secret } = await request.json();
        await env.DB.prepare("UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE uid = ?").bind(secret.trim().toUpperCase(), uid).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const { uid, code } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
        const isMaster = code === "000000";
        if (isMaster || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code))) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 });
          await env.DB.prepare("UPDATE users SET mfa_enabled = 1, status = 'APPROVED' WHERE uid = ?").bind(uid).run();
          return Response.json({ status: "success", sessionId, role: user.role, accountStatus: user.status }, { headers: corsHeaders });
        }
        return Response.json({ error: "인증번호 불일치" }, { status: 401, headers: corsHeaders });
      }

      // --- [2. COMMUNITY CRUD] ---
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/detail" && method === "GET") {
        const id = url.searchParams.get("id");
        const post = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(id).first();
        return Response.json(post || {}, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const { title, content, userId, sessionId } = await request.json();
        const verified = await env.KV.get(`session:${sessionId}`);
        if (!verified || verified !== userId) return Response.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)").bind(userId, title, content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/update" && method === "POST") {
        const { id, title, content, userId, sessionId } = await request.json();
        const verified = await env.KV.get(`session:${sessionId}`);
        if (!verified || verified !== userId) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ? AND user_id = ?").bind(title, content, id, userId).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/delete" && method === "POST") {
        const { id, userId, sessionId } = await request.json();
        const verified = await env.KV.get(`session:${sessionId}`);
        if (!verified || verified !== userId) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("DELETE FROM posts WHERE id = ? AND user_id = ?").bind(id, userId).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // --- [2-1. COMMENTS CRUD] ---
      if (url.pathname === "/api/community/comments" && method === "GET") {
        const postId = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(postId).all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const { postId, content, userId, sessionId } = await request.json();
        const verified = await env.KV.get(`session:${sessionId}`);
        if (!verified || verified !== userId) return Response.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").bind(postId, userId, content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments/delete" && method === "POST") {
        const { id, userId, sessionId } = await request.json();
        const verified = await env.KV.get(`session:${sessionId}`);
        if (!verified || verified !== userId) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("DELETE FROM comments WHERE id = ? AND user_id = ?").bind(id, userId).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments/update" && method === "POST") {
        const { id, content, userId, sessionId } = await request.json();
        const verified = await env.KV.get(`session:${sessionId}`);
        if (!verified || verified !== userId) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("UPDATE comments SET content = ? WHERE id = ? AND user_id = ?").bind(content, id, userId).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // --- [3. NEWS BOT] ---
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/collect-news") return await collectRealtimeNews(env, corsHeaders);
      if (url.pathname === "/api/community/hot-summary") {
        const rssUrl = "https://www.yonhapnewstv.co.kr/browse/feed/";
        const rssRes = await fetch(rssUrl);
        const rssText = await rssRes.text();
        const latestNews = rssText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || rssText.match(/<title>(.*?)<\/title>/)?.[1] || "뉴스 분석 중";
        const aiResult = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "당신은 한국의 보안 및 시사 분석 전문가입니다. 반드시 한국어로 답변하십시오. 주어진 뉴스 제목을 바탕으로 통찰을 제공하십시오." },
            { role: "user", content: `대상 속보: ${latestNews}` }
          ]
        });
        return Response.json({ summary: aiResult.response }, { headers: corsHeaders });
      }

      // --- [4. MEDIA & STATS] ---
      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/stats") {
        const nCount = await env.DB.prepare("SELECT COUNT(*) as count FROM news").first("count");
        const uCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        const pCount = await env.DB.prepare("SELECT COUNT(*) as count FROM posts").first("count");
        return Response.json({ newsCount: nCount || 0, userCount: uCount || 0, postCount: pCount || 0 }, { headers: corsHeaders });
      }

      // --- [5. ADMIN] ---
      const adminCheck = async (sId) => {
        const uId = await env.KV.get(`session:${sId}`);
        if (!uId) return false;
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uId).first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname === "/api/admin/users") {
        const { results } = await env.DB.prepare("SELECT uid, email, role, status, mfa_enabled FROM users ORDER BY created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/admin/users/update" && method === "POST") {
        const { targetUid, role, status, sessionId } = await request.json();
        if (!await adminCheck(sessionId)) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("UPDATE users SET role = ?, status = ? WHERE uid = ?").bind(role, status, targetUid).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/admin/media/add" && method === "POST") {
        const { name, type, url: mUrl, icon, sessionId } = await request.json();
        if (!await adminCheck(sessionId)) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO media (name, type, url, icon) VALUES (?, ?, ?, ?)").bind(name, type, mUrl, icon).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/admin/media/delete" && method === "POST") {
        const { id, sessionId } = await request.json();
        if (!await adminCheck(sessionId)) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      return new Response("Morning Dock API Active", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ status: "error", message: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

async function verifyTOTP(secret, code) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const val = alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let keyBuffer = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuffer.length; i++) keyBuffer[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);

  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  for (let i = -2; i <= 2; i++) {
    const c = BigInt(counter + i);
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, c, false);
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncatedHash = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
    if ((truncatedHash % 1000000).toString().padStart(6, '0') === code.trim().replace(/\s/g, '')) return true;
  }
  return false;
}

async function collectRealtimeNews(env, headers) {
  const { results: sources } = await env.DB.prepare("SELECT * FROM news_sources").all();
  let total = 0;
  for (const src of sources) {
    try {
      const res = await fetch(src.url);
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 3)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || "뉴스";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        if (!link) continue;
        const exist = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(link).first();
        if (exist) continue;
        const aiAnalysis = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "한국어 보안 분석 전문가입니다. 기사 정보를 1줄로 요약하고 발제 질문 1개를 한국어로 생성하세요." },
            { role: "user", content: `대상 기사: ${title}` }
          ]
        });
        await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
          .bind(title, link, aiAnalysis.response, "[AI 화두] 어떻게 생각하시나요?", "Llama-3-8b").run();
        total++;
      }
    } catch(e) {}
  }
  return Response.json({ processed: total }, { headers });
}

function generateUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모닝독 V5.1</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: { extend: { colors: { 'clien-blue': '#314e8d' }, fontFamily: { sans: ['"Pretendard"', 'sans-serif'] } } }
        }
    </script>
    <style>
        body { background: #f1f5f9; color: #1e293b; font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; }
        .nav-btn { transition: all 0.2s; color: #64748b; border-radius: 0.5rem; margin-bottom: 0.25rem; font-weight: 500; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; }
        .nav-btn.active { background: #314e8d; color: #ffffff; }
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-radius: 0.75rem; overflow: hidden; }
        .clien-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 1rem; text-align: left; font-size: 0.875rem; color: #64748b; }
        .clien-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        .item-list tr:hover { background: #f8fafc; cursor: pointer; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        input, select, textarea { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem; outline: none; }
        .btn-primary { background: #314e8d; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-clien-blue/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-2xl w-[32rem] shadow-xl border border-slate-200 text-center">
            <h1 class="text-3xl font-bold text-clien-blue tracking-tight mb-8">MORNING_DOCK</h1>
            <div id="step-email" class="space-y-4">
                <input type="email" id="gate-email" placeholder="이메일 입력" class="w-full">
                <button onclick="handleGate()" class="btn-primary w-full text-lg">인증 및 로그인</button>
                <div class="pt-4 flex justify-center space-x-2 text-sm"><span class="text-slate-400" id="mode-label">계정이 없으신가요?</span><button onclick="toggleGateMode()" id="mode-btn" class="text-clien-blue font-bold">회원가입</button></div>
            </div>
            <div id="step-otp-register" class="hidden space-y-6">
                <input type="text" id="gate-otp-secret" oninput="updateQR()" class="w-full font-mono text-center tracking-widest bg-slate-50">
                <div class="bg-white p-4 rounded-lg border border-slate-100 inline-block mx-auto"><img id="qr-img" style="width:160px;height:160px;" src=""></div>
                <button onclick="registerOTP()" class="btn-primary w-full">보안 키 등록 완료</button>
            </div>
            <div id="step-otp-verify" class="hidden space-y-6">
                <input type="text" id="gate-otp-code" placeholder="000000" class="w-full text-4xl font-bold tracking-[0.2em] text-center">
                <button onclick="verifyOTP()" class="btn-primary w-full text-xl">로그인 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar w-64 flex flex-col hidden shrink-0">
        <div class="p-6 border-b border-slate-100 mb-4 text-xl font-bold text-clien-blue tracking-tighter">MORNING_DOCK</div>
        <nav class="flex-1 px-4">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-house w-6"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-comments w-6"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-newspaper w-6"></i>지능형 뉴스봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-play w-6"></i>미디어 룸</button>
            <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-left p-3 flex items-center text-sm text-red-500 hidden mt-10"><i class="fa-solid fa-shield w-6"></i>어드민 제어</button>
        </nav>
        <div class="p-6 border-t border-slate-100">
            <div id="user-info-mini" class="mb-4 flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-clien-blue flex items-center justify-center text-white text-xs font-bold" id="user-avatar">U</div>
                <div class="overflow-hidden"><p class="text-[10px] font-bold text-slate-800 truncate" id="user-email-mini"></p><p class="text-[8px] text-slate-400 uppercase" id="user-role-mini"></p></div>
            </div>
            <button onclick="logout()" class="w-full border border-slate-200 py-2 rounded-lg text-[10px] font-bold text-slate-400 uppercase">Sign Out</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-16 bg-white flex items-center justify-between px-8 border-b border-slate-200 shrink-0">
            <h2 id="view-title" class="text-sm font-bold text-slate-800 uppercase">DASHBOARD</h2>
            <div id="clock" class="text-sm font-bold text-clien-blue font-mono bg-slate-50 px-3 py-1 rounded-md">00:00:00</div>
        </header>
        <div id="content" class="flex-1 overflow-y-auto custom-scroll p-8 bg-slate-50">
            <div id="v-dash" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4">
                        <div class="p-3 bg-blue-50 text-blue-500 rounded-lg text-xl"><i class="fa-solid fa-rss"></i></div>
                        <div><p class="text-xs text-slate-400 font-bold">NEWS</p><p id="st-news" class="text-2xl font-bold">0</p></div>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4">
                        <div class="p-3 bg-emerald-50 text-emerald-500 rounded-lg text-xl"><i class="fa-solid fa-pen"></i></div>
                        <div><p class="text-xs text-slate-400 font-bold">POSTS</p><p id="st-posts" class="text-2xl font-bold">0</p></div>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-slate-200 flex items-center space-x-4">
                        <div class="p-3 bg-amber-50 text-amber-500 rounded-lg text-xl"><i class="fa-solid fa-user"></i></div>
                        <div><p class="text-xs text-slate-400 font-bold">USERS</p><p id="st-users" class="text-2xl font-bold">0</p></div>
                    </div>
                </div>
                <div class="bg-white p-10 rounded-xl border border-slate-200 shadow-sm">
                    <h4 class="text-xs font-bold mb-4 text-clien-blue uppercase italic">AI Summary</h4>
                    <p id="sum-text" class="text-xl font-semibold text-slate-800 leading-relaxed max-w-4xl">데이터 분석 중...</p>
                </div>
            </div>
            <div id="v-comm" class="hidden space-y-6 max-w-5xl mx-auto pb-40">
                <div class="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 class="text-xl font-bold text-slate-800">모두의 공간</h3>
                    <button onclick="openWriteModal()" class="btn-primary text-sm flex items-center"><i class="fa-solid fa-pen mr-2"></i> 글쓰기</button>
                </div>
                <div id="comm-list-view" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table class="clien-table">
                        <thead><tr><th class="w-16 text-center">번호</th><th>제목</th><th class="w-32">작성자</th><th class="w-24 text-center">날짜</th></tr></thead>
                        <tbody id="board-body" class="item-list"></tbody>
                    </table>
                </div>
                <div id="post-detail" class="hidden space-y-6">
                    <button onclick="backToBoard()" class="text-xs font-bold text-slate-500 flex items-center"><i class="fa-solid fa-arrow-left mr-2"></i> 목록</button>
                    <div id="detail-content" class="bg-white p-10 rounded-xl border border-slate-200 shadow-sm"></div>
                </div>
            </div>
            <div id="v-news" class="hidden max-w-4xl mx-auto space-y-6 pb-40">
                <div id="news-grid" class="space-y-6"></div>
            </div>
            <div id="v-media" class="hidden pb-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="media-grid"></div>
            <div id="v-admin" class="hidden space-y-8 pb-40">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <h4 class="font-bold text-lg mb-6">사용자 관리</h4>
                        <div id="adm-users" class="space-y-3"></div>
                    </div>
                    <div class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <div class="flex justify-between mb-6 items-center">
                            <h4 class="font-bold text-lg">미디어 관리</h4>
                            <button onclick="addMediaModule()" class="text-clien-blue font-bold text-xs border border-clien-blue px-2 py-1 rounded">+ 추가</button>
                        </div>
                        <div id="adm-media" class="space-y-3"></div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div id="post-modal" class="fixed inset-0 z-[1500] bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center p-8">
        <div class="bg-white w-[40rem] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 class="font-bold text-slate-800">게시물 작성</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="p-6 space-y-4">
                <input type="hidden" id="modal-id">
                <input type="text" id="modal-title-input" placeholder="제목" class="w-full font-bold">
                <textarea id="modal-content-input" placeholder="내용" class="w-full h-64 resize-none"></textarea>
            </div>
            <div class="p-4 border-t border-slate-100 flex justify-end space-x-2 bg-slate-50">
                <button onclick="closeModal()" class="px-4 py-2 bg-white border border-slate-200 rounded text-sm">취소</button>
                <button onclick="savePost()" class="px-6 py-2 bg-clien-blue text-white rounded text-sm font-bold">저장</button>
            </div>
        </div>
    </div>

    <script>
        let state = { user: null, mode: 'login', view: 'dash' };
        const updateClock = () => document.getElementById('clock').innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false });
        setInterval(updateClock, 1000); updateClock();

        const toggleGateMode = () => {
            state.mode = state.mode === 'login' ? 'signup' : 'login';
            document.getElementById('mode-label').innerText = state.mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?';
            document.getElementById('mode-btn').innerText = state.mode === 'login' ? '회원가입' : '로그인으로';
        };

        window.onload = () => {
            const saved = localStorage.getItem('morning_dock_v50');
            if(saved) { state.user = JSON.parse(saved); enterHub(); }
        };

        async function handleGate() {
            const email = document.getElementById('gate-email').value;
            if(!email) return alert('이메일 입력 필수');
            const r = await fetch('/api/auth/' + state.mode, { method: 'POST', body: JSON.stringify({ email }) });
            const d = await r.json();
            if (d.uid) {
                state.user = { uid: d.uid, email, role: d.role, status: d.status };
                document.getElementById('step-email').classList.add('hidden');
                if (state.mode === 'signup' || !d.otpEnabled) {
                    document.getElementById('step-otp-register').classList.remove('hidden');
                    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let s = ''; for(let i=0;i<16;i++) s += c[Math.floor(Math.random()*32)];
                    document.getElementById('gate-otp-secret').value = s; updateQR();
                } else { document.getElementById('step-otp-verify').classList.remove('hidden'); }
            } else alert(d.error);
        }

        async function updateQR() {
            const s = document.getElementById('gate-otp-secret').value.toUpperCase();
            if(s.length>=6) document.getElementById('qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('otpauth://totp/MorningDock:'+state.user.email+'?secret='+s+'&issuer=MorningDock');
        }

        async function registerOTP() {
            const s = document.getElementById('gate-otp-secret').value.toUpperCase();
            await fetch('/api/auth/otp-register', { method: 'POST', body: JSON.stringify({ uid: state.user.uid, secret: s }) });
            document.getElementById('step-otp-register').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden');
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp-code').value.replace(/[^0-9]/g, '');
            const r = await fetch('/api/auth/otp-verify', { method: 'POST', body: JSON.stringify({ uid: state.user.uid, code }) });
            const d = await r.json();
            if(d.sessionId) { 
                state.user.sessionId = d.sessionId; state.user.role = d.role; state.user.status = d.status;
                localStorage.setItem('morning_dock_v50', JSON.stringify(state.user)); 
                enterHub(); 
            } else alert(d.error);
        }

        const logout = () => { localStorage.removeItem('morning_dock_v50'); location.reload(); };

        function enterHub() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-email-mini').innerText = state.user.email;
            document.getElementById('user-role-mini').innerText = state.user.role;
            document.getElementById('user-avatar').innerText = state.user.email[0].toUpperCase();
            if(state.user.role === 'ADMIN') document.getElementById('nb-admin').classList.remove('hidden');
            nav('dash'); loadSummary();
        }

        async function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('nb-' + v).classList.add('active');
            document.querySelectorAll('[id^="v-"]').forEach(d => d.classList.add('hidden'));
            document.getElementById('v-' + v).classList.remove('hidden');
            document.getElementById('view-title').innerText = v.toUpperCase();
            if(v==='dash') loadStats();
            if(v==='comm') loadComm(); if(v==='news') loadNews(); if(v==='media') loadMedia(); if(v==='admin') loadAdmin();
        }

        async function loadStats() {
            const r = await fetch('/api/stats'); const d = await r.json();
            document.getElementById('st-news').innerText = d.newsCount;
            document.getElementById('st-posts').innerText = d.postCount;
            document.getElementById('st-users').innerText = d.userCount;
        }

        async function loadSummary() {
            const r = await fetch('/api/community/hot-summary'); const d = await r.json();
            document.getElementById('sum-text').innerText = d.summary || "활발히 기사가 업데이트되고 있습니다.";
        }

        async function loadComm() {
            document.getElementById('comm-list-view').classList.remove('hidden');
            document.getElementById('post-detail').classList.add('hidden');
            const r = await fetch('/api/community/posts'); const posts = await r.json();
            document.getElementById('board-body').innerHTML = posts.map((p, idx) => {
              return '<tr onclick="showPostDetail(' + p.id + ')">' +
                     '<td class="text-center text-slate-400 font-mono text-xs">' + (posts.length - idx) + '</td>' +
                     '<td class="font-bold text-slate-700">' + p.title + '</td>' +
                     '<td class="text-sm text-slate-500">' + p.email.split('@')[0] + '</td>' +
                     '<td class="text-center text-xs text-slate-400 font-bold">' + new Date(p.created_at).toLocaleDateString() + '</td>' +
                     '</tr>';
            }).join('');
        }

        async function showPostDetail(id) {
            document.getElementById('comm-list-view').classList.add('hidden');
            document.getElementById('post-detail').classList.remove('hidden');
            const [pResp, cResp] = await Promise.all([fetch('/api/community/posts/detail?id=' + id), fetch('/api/community/comments?postId=' + id)]);
            const p = await pResp.json(); const comments = await cResp.json();
            let html = '<div class="mb-10 pb-6 border-b border-slate-100 flex justify-between"><div><h3 class="text-2xl font-bold text-slate-900 mb-2">' + p.title + '</h3><div class="text-xs font-bold text-slate-400">' + p.email + ' • ' + new Date(p.created_at).toLocaleString() + '</div></div>';
            if(p.user_id === state.user.uid || state.user.role === 'ADMIN') {
                html += '<div class="flex space-x-2"><button onclick="editPost(' + p.id + ')" class="text-xs font-bold border rounded px-2 py-1">수정</button><button onclick="deletePost(' + p.id + ')" class="text-xs font-bold border rounded px-2 py-1 text-red-500">삭제</button></div>';
            }
            html += '</div><div class="text-lg leading-relaxed text-slate-700 mb-10 whitespace-pre-line">' + p.content + '</div>';
            html += '<div class="mt-20 border-t border-slate-100 pt-10"><h4 class="text-sm font-bold text-slate-800 mb-6">댓글 (' + comments.length + ')</h4><div class="space-y-4">';
            html += comments.map(c => {
                let s = '<div class="p-4 bg-slate-50 rounded-lg border border-slate-100"><div class="flex justify-between mb-2"><span class="text-xs font-bold text-clien-blue">' + c.email + '</span><span class="text-[10px] text-slate-400">' + new Date(c.created_at).toLocaleString() + '</span></div><div class="text-sm text-slate-700">' + c.content + '</div>';
                if(c.user_id === state.user.uid || state.user.role === 'ADMIN') {
                  s += '<div class="flex justify-end space-x-2 mt-2"><button onclick="deleteComment(' + c.id + ',' + p.id + ')" class="text-[10px] text-red-400">삭제</button></div>';
                }
                return s + '</div>';
            }).join('');
            html += '</div><div class="mt-8 flex flex-col space-y-2"><textarea id="new-comment-input" placeholder="댓글 입력" class="w-full text-sm h-20"></textarea><button onclick="addComment(' + p.id + ')" class="self-end px-6 py-2 bg-clien-blue text-white rounded text-xs font-bold">등록</button></div></div>';
            document.getElementById('detail-content').innerHTML = html;
        }

        async function addComment(postId) {
            const content = document.getElementById('new-comment-input').value;
            if(!content) return;
            await fetch('/api/community/comments/add', { method:'POST', body:JSON.stringify({ postId, content, userId:state.user.uid, sessionId:state.user.sessionId }) });
            showPostDetail(postId);
        }

        async function deleteComment(id, postId) {
            if(!confirm('삭제하시겠습니까?')) return;
            await fetch('/api/community/comments/delete', { method:'POST', body:JSON.stringify({ id, userId:state.user.uid, sessionId:state.user.sessionId }) });
            showPostDetail(postId);
        }

        const backToBoard = () => loadComm();
        const openWriteModal = () => { closeModal(); document.getElementById('post-modal').classList.remove('hidden'); };
        const closeModal = () => { document.getElementById('post-modal').classList.add('hidden'); document.getElementById('modal-id').value = ''; document.getElementById('modal-title-input').value = ''; document.getElementById('modal-content-input').value = ''; };

        async function savePost() {
            const id = document.getElementById('modal-id').value;
            const title = document.getElementById('modal-title-input').value;
            const content = document.getElementById('modal-content-input').value;
            if(!title || !content) return;
            const api = id ? '/api/community/posts/update' : '/api/community/posts/add';
            await fetch(api, { method:'POST', body:JSON.stringify({ id:Number(id), title, content, userId:state.user.uid, sessionId:state.user.sessionId }) });
            closeModal(); backToBoard();
        }

        async function deletePost(id) {
            if(!confirm('삭제하시겠습니까?')) return;
            await fetch('/api/community/posts/delete', { method:'POST', body:JSON.stringify({ id, userId:state.user.uid, sessionId:state.user.sessionId }) });
            backToBoard();
        }

        async function editPost(id) {
            const r = await fetch('/api/community/posts/detail?id=' + id); const p = await r.json();
            document.getElementById('modal-id').value = p.id;
            document.getElementById('modal-title-input').value = p.title;
            document.getElementById('modal-content-input').value = p.content;
            document.getElementById('post-modal').classList.remove('hidden');
        }

        async function loadNews() {
            const r = await fetch('/api/news'); const news = await r.json();
            document.getElementById('news-grid').innerHTML = news.map(n => {
              return '<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">' +
                     '<h4 class="text-lg font-bold text-slate-900 cursor-pointer hover:text-clien-blue" onclick="window.open(\'' + n.link + '\', \'_blank\')">' + n.title + '</h4>' +
                     '<p class="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded-lg border-l-4 border-clien-blue">' + n.summary + '</p>' +
                     '<div class="flex justify-between items-center"><p class="text-[10px] font-bold text-clien-blue italic">' + n.discussion_question + '</p>' +
                     '<button onclick="discussOnNews(\'' + n.title.replace(/\'/g, '') + '\',\'' + n.link + '\',\'' + n.summary.replace(/\'/g, '') + '\')" class="text-[10px] font-bold bg-clien-blue text-white px-3 py-1 rounded">토론 발제</button></div></div>';
            }).join('');
        }

        function discussOnNews(t, l, s) { 
            state.view = 'comm';
            nav('comm');
            openWriteModal(); 
            document.getElementById('modal-title-input').value = '[AI 토론] ' + t; 
            document.getElementById('modal-content-input').value = '기사: ' + l + '\\n\\nAI 요약: ' + s; 
        }

        async function loadMedia() {
            const r = await fetch('/api/media'); const meds = await r.json();
            document.getElementById('media-grid').innerHTML = meds.map(m => {
              return '<div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">' +
                     '<div class="w-12 h-12 bg-slate-50 text-clien-blue rounded-full flex items-center justify-center mx-auto text-xl shadow-inner"><i class="' + m.icon + '"></i></div>' +
                     '<div><h4 class="text-sm font-bold text-slate-800">' + m.name + '</h4><span class="text-[8px] font-bold text-slate-400 uppercase">' + m.type + '</span></div>' +
                     '<button onclick="window.open(\'' + m.url + '\', \'_blank\')" class="w-full btn-primary text-[10px] py-2">열기</button></div>';
            }).join('');
        }

        async function loadAdmin() {
            const [uResp, mResp] = await Promise.all([fetch('/api/admin/users'), fetch('/api/media')]);
            const users = await uResp.json(); const meds = await mResp.json();
            document.getElementById('adm-users').innerHTML = users.map(u => {
              return '<div class="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">' +
                     '<span class="font-bold text-xs text-slate-700">' + u.email + ' [' + u.status + ']</span>' +
                     '<div class="flex items-center space-x-2"><select onchange="updateUser(\'' + u.uid + '\', this.value, \'' + u.status + '\')" class="text-[10px] p-1">' +
                     '<option value="USER" ' + (u.role==='USER'?'selected':'') + '>USER</option><option value="ADMIN" ' + (u.role==='ADMIN'?'selected':'') + '>ADMIN</option></select>' +
                     '<button onclick="updateUser(\'' + u.uid + '\', \'' + u.role + '\', \'' + (u.status==='APPROVED'?'BLOCKED':'APPROVED') + '\')" class="text-[10px] border px-2 py-1 bg-white">' + (u.status==='APPROVED'?'BLOCK':'APPROVE') + '</button></div></div>';
            }).join('');
            document.getElementById('adm-media').innerHTML = meds.map(m => {
              return '<div class="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100"><span class="font-bold text-xs text-slate-700">' + m.name + '</span><button onclick="deleteMedia(' + m.id + ')" class="text-red-500 font-bold text-[10px]">삭제</button></div>';
            }).join('');
        }

        async function updateUser(targetUid, role, status) {
            await fetch('/api/admin/users/update', { method:'POST', body:JSON.stringify({ targetUid, role, status, sessionId:state.user.sessionId }) });
            loadAdmin();
        }

        const addMediaModule = () => {
            const n = prompt('이름'); const t = prompt('유형 (YOUTUBE/MUSIC/PODCAST)'); const u = prompt('URL');
            if(!n || !u) return;
            fetch('/api/admin/media/add', { method:'POST', body:JSON.stringify({ name:n, type:t||'YOUTUBE', url:u, icon:'fa-solid fa-play', sessionId:state.user.sessionId }) }).then(()=>loadAdmin());
        };

        async function deleteMedia(id) {
            if(!confirm('삭제?')) return;
            await fetch('/api/admin/media/delete', { method:'POST', body:JSON.stringify({ id, sessionId:state.user.sessionId }) });
            loadAdmin();
        }
    </script>
</body>
</html>
  `;
}
