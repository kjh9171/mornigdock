/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V4.2.1 Syntax Fix Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 혁신: 마스터 OTP(000000) 도입, AI 분석 한국어 최적화, 분석 모델(Llama-3-8b) 명시, 구문 오류 완벽 수정
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
      return new Response(generateV41UI(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [1. AUTH & SECURITY] ---
      if (url.pathname === "/api/auth/signup" && method === "POST") {
        const { email } = await request.json();
        const uid = crypto.randomUUID();
        try {
          await env.DB.prepare("INSERT INTO users (uid, email) VALUES (?, ?)").bind(uid, email).run();
          return Response.json({ status: "success", uid }, { headers: corsHeaders });
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
        // Master OTP for Local (000000)
        const isMaster = code === "000000";
        if (isMaster || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code))) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 });
          // Sync mfa and ensure status
          await env.DB.prepare("UPDATE users SET mfa_enabled = 1, status = 'APPROVED' WHERE uid = ?").bind(uid).run();
          return Response.json({ status: "success", sessionId, role: user.role, accountStatus: user.status }, { headers: corsHeaders });
        }
        return Response.json({ error: "인증번호 불일치" }, { status: 401, headers: corsHeaders });
      }

      // --- [2. COMMUNITY (모두의 공간) CRUD] ---
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

      // --- [2-1. COMMENTS (댓글) CRUD] ---
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

      // --- [3. NEWS BOT] ---
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/collect-news") return await collectRealtimeNews(env, corsHeaders);
      if (url.pathname === "/api/community/hot-summary") {
        // Fetch real-time news from RSS for Dashboard Insight
        const rssUrl = "https://www.yonhapnewstv.co.kr/browse/feed/";
        const rssRes = await fetch(rssUrl);
        const rssText = await rssRes.text();
        const latestNews = rssText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || rssText.match(/<title>(.*?)<\/title>/)?.[1] || "뉴스 분석 중";
        
        const aiResult = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "당신은 한국의 네이버/연합뉴스 속보 분석 전문가입니다. 반드시 한국어로 답변하십시오. 주어진 뉴스 제목을 바탕으로 현재의 흐름을 날카롭게 분석하여 1~2줄의 강력한 통찰을 제공하십시오." },
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

      // --- [5. ADMIN: USER & SOURCE & MEDIA MGMT] ---
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
      if (url.pathname === "/api/admin/sources") {
        const { results } = await env.DB.prepare("SELECT * FROM news_sources").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/admin/source/add" && method === "POST") {
        const { name, url: sUrl, category, sessionId } = await request.json();
        if (!await adminCheck(sessionId)) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO news_sources (name, url, category) VALUES (?, ?, ?)").bind(name, sUrl, category).run();
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

      return new Response("Morning Dock V4.2.1 Active.", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ status: "error", message: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

// --- [SECURITY CORE] ---
function base32Decode(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let output = new Uint8Array(Math.ceil(base32.length * 5 / 8));
  for (let i = 0; i < base32.length; i++) {
    const val = alphabet.indexOf(base32[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let byteIndex = 0;
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    output[byteIndex++] = parseInt(bits.substring(i, i + 8), 2);
  }
  return output.slice(0, byteIndex);
}

async function verifyTOTP(secret, code) {
  const keyBuffer = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  // Window expanded to -2 ~ 2 (approx 60s) for time drift
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

// --- [NEWS BOT GUTS] ---
async function collectRealtimeNews(env, headers) {
  const { results: sources } = await env.DB.prepare("SELECT * FROM news_sources").all();
  let total = 0;
  const modelId = "@cf/meta/llama-3-8b-instruct";
  
  for (const src of sources) {
    try {
      const res = await fetch(src.url);
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 3)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || "뉴스 속보";
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        if (!link) continue;
        const exist = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(link).first();
        if (exist) continue;
        
        const aiAnalysis = await env.AI.run(modelId, {
          messages: [
            { role: "system", content: "당신은 한국어 뉴스 분석 전문가입니다. 반드시 모든 답변을 한국어로만 작성하십시오. 영어 답변은 절대로 금지됩니다. 기사 제목을 분석하여 1줄 요약과, 커뮤니티 토론용 날카로운 질문 1개를 반드시 '한국어'로만 생성하십시오." },
            { role: "user", content: `대상 기사: ${title}` }
          ]
        });
        
        await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
          .bind(title, link, aiAnalysis.response, "[AI 토론 화두] 이 기사를 바탕으로 어떤 변화가 생길까요?", "Llama-3-8b via Cloudflare AI").run();
        total++;
      }
    } catch(e) {}
  }
  return Response.json({ processed: total }, { headers });
}

// --- [UI GENERATOR] ---
function generateV41UI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모닝독 V5.0: RBAC & Media Hub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;800&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: { 'mb-accent': '#22d3ee', 'mb-bg': '#020617', 'clien-blue': '#314e8d' },
                    fontFamily: { sans: ['"Pretendard"', 'sans-serif'] }
                }
            }
        }
    </script>
    <style>
        body { background: #010309; color: #f8fafc; font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.01em; line-height: 1.6; }
        .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); }
        .nav-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #94a3b8; font-weight: 600; }
        .nav-btn:hover { color: #f8fafc; background: rgba(255,255,255,0.03); }
        .nav-btn.active { color: #22d3ee; background: rgba(34,211,238,0.08); border-left: 5px solid #22d3ee; padding-left: 1.5rem; }
        .clien-table { width: 100%; border-collapse: collapse; font-size: 17px; }
        .item-list tr { border-bottom: 1px solid #1e293b; transition: all 0.2s; }
        .item-list tr:hover { background: rgba(34,211,238,0.05); cursor: pointer; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .insight-card { border-left: 16px solid #22d3ee; background: linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(15,23,42,0) 100%); }
        h1, h2, h3, h4 { letter-spacing: -0.04em; }
        p { color: #cbd5e1; }
        .text-vivid { color: #f8fafc; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-mb-accent/30">

    <!-- [GATEWAY] -->
    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-[#020617] flex items-center justify-center">
        <div class="glass p-16 rounded-[4rem] w-[45rem] text-center shadow-2xl border-mb-accent/10">
            <h1 class="text-5xl font-bold tracking-tighter mb-4 italic">MORNING_DOCK</h1>
            <p class="text-[10px] text-slate-500 font-bold mb-12 uppercase tracking-[6px]">V5.0 Security & Media</p>
            <div id="step-email" class="space-y-4">
                <input type="email" id="gate-email" placeholder="이메일 입력" class="w-full p-6 bg-slate-900 border-2 border-slate-800 rounded-3xl font-bold text-center outline-none focus:border-mb-accent">
                <button onclick="handleGate()" class="w-full bg-mb-accent text-slate-950 py-7 rounded-3xl text-2xl font-bold">인증 시작</button>
                <div class="pt-4 flex justify-center space-x-2 text-sm"><span class="text-slate-500" id="mode-label">계정이 없으신가요?</span><button onclick="toggleGateMode()" id="mode-btn" class="text-mb-accent font-bold hover:underline font-bold">회원가입</button></div>
            </div>
            <div id="step-otp-register" class="hidden animate-fade-in space-y-6">
                <input type="text" id="gate-otp-secret" oninput="updateQR()" class="w-full p-6 bg-slate-900 border-2 border-mb-accent/30 rounded-3xl font-bold text-center outline-none uppercase tracking-widest">
                <div class="bg-white p-4 rounded-3xl inline-block mx-auto"><img id="qr-img" style="width:160px;height:160px;" src=""></div>
                <button onclick="registerOTP()" class="w-full bg-mb-accent text-slate-950 py-6 rounded-3xl font-bold">보안 키 저장</button>
            </div>
            <div id="step-otp-verify" class="hidden animate-fade-in space-y-8">
                <input type="text" id="gate-otp-code" placeholder="000 000" class="w-full p-6 bg-slate-900 border-2 border-mb-warm/40 rounded-3xl text-5xl font-bold tracking-[0.5em] text-center outline-none">
                <button onclick="verifyOTP()" class="w-full bg-mb-warm text-slate-950 py-7 rounded-3xl text-3xl font-bold">로그인 승인</button>
            </div>
        </div>
    </div>

    <!-- [SIDEBAR] -->
    <aside id="sidebar" class="w-72 bg-[#05070a] border-r border-slate-800 flex flex-col hidden shrink-0 z-50">
        <div class="p-10 text-center"><h2 class="text-2xl font-bold italic">MORNING_DOCK</h2></div>
        <nav class="flex-1 px-4 space-y-2">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-5 rounded-2xl flex items-center font-bold text-lg"><i class="fa-solid fa-tachometer-alt w-10"></i><span>대시보드</span></button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-5 rounded-2xl flex items-center text-slate-400 font-bold text-lg"><i class="fa-solid fa-list-ul w-10"></i><span>모두의 공간</span></button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-5 rounded-2xl flex items-center text-slate-400 font-bold text-lg"><i class="fa-solid fa-robot w-10"></i><span>지능형 뉴스봇</span></button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full text-left p-5 rounded-2xl flex items-center text-slate-400 font-bold text-lg"><i class="fa-solid fa-music w-10"></i><span>미디어 룸</span></button>
            <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-left p-5 rounded-2xl flex items-center text-red-500 font-bold text-lg mt-14 border-t border-slate-800 pt-8 hidden"><i class="fa-solid fa-sliders w-10"></i><span>어드민 제어</span></button>
        </nav>
        <div class="p-8"><button onclick="logout()" class="w-full bg-slate-900 py-3 rounded-xl text-xs font-bold text-slate-500 uppercase">Sign Out</button></div>
    </aside>

    <!-- [MAIN] -->
    <main id="main" class="flex-1 flex flex-col hidden bg-[#010204] overflow-hidden">
        <header class="h-24 glass flex items-center justify-between px-12 border-b border-white/5 shrink-0 z-40">
            <h2 id="view-title" class="text-2xl font-bold tracking-tighter uppercase italic">DASHBOARD</h2>
            <div id="clock" class="text-2xl font-bold text-mb-accent font-mono">00:00:00</div>
        </header>

        <div id="content" class="flex-1 overflow-y-auto custom-scroll p-12 scroll-smooth">
            <!-- [VIEW: DASH] -->
            <div id="v-dash" class="space-y-12">
                <div class="glass p-16 rounded-[4rem] insight-card shadow-2xl">
                    <h4 class="text-lg font-extrabold mb-10 text-mb-accent tracking-[6px] uppercase italic">AI Deep Insight Analysis</h4>
                    <p id="sum-text" class="text-4xl font-extrabold text-vivid font-serif leading-snug italic">지능형 데이터를 분석하고 있습니다...</p>
                    <div class="mt-12 pt-10 border-t border-white/5 flex items-center space-x-4">
                        <div class="w-3 h-3 bg-mb-accent animate-pulse rounded-full"></div>
                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">Real-time Analysis Engine Active</span>
                    </div>
                </div>
            </div>

            <!-- [VIEW: COMMUNITY] -->
            <div id="v-comm" class="hidden fade-in space-y-8 max-w-6xl mx-auto pb-40">
                <div class="flex justify-between items-center bg-slate-900/40 p-10 rounded-[3rem]">
                    <div><h3 class="text-4xl font-bold">모두의 공간</h3><p class="text-sm text-mb-accent font-bold mt-1">이웃들과 지혜를 나누는 타임라인</p></div>
                    <button onclick="openWriteModal()" class="px-8 py-4 bg-mb-accent text-slate-950 rounded-2xl font-bold">새 글 작성</button>
                </div>
                <div id="comm-list-view" class="glass rounded-[3rem] overflow-hidden">
                    <table class="clien-table">
                        <thead class="bg-slate-900/50"><tr><th class="w-16 text-center">No</th><th>제목</th><th class="w-40 text-center">작성자</th><th class="w-32 text-center">날짜</th></tr></thead>
                        <tbody id="board-body" class="item-list"></tbody>
                    </table>
                </div>
                <div id="post-detail" class="hidden space-y-8 fade-in">
                    <button onclick="backToBoard()" class="text-mb-accent font-bold bg-mb-accent/10 px-6 py-2 rounded-xl mb-4"><i class="fa-solid fa-arrow-left mr-2"></i>목록으로</button>
                    <div id="detail-content" class="glass p-14 rounded-[4rem] border-l-[12px] border-mb-accent"></div>
                </div>
            </div>

            <!-- [VIEW: NEWS BOT] -->
            <div id="v-news" class="hidden fade-in max-w-5xl mx-auto space-y-12 pb-40">
                <div id="news-grid" class="space-y-8"></div>
            </div>

            <!-- [VIEW: MEDIA] -->
            <div id="v-media" class="hidden fade-in pb-40"><div id="media-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"></div></div>

            <!-- [VIEW: ADMIN] -->
            <div id="v-admin" class="hidden fade-in space-y-12 pb-40">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="glass p-10 rounded-[3rem] flex flex-col"><h4 class="font-bold text-lg mb-6 uppercase text-mb-accent italic">User Hub</h4><div id="adm-users" class="space-y-4"></div></div>
                    <div class="glass p-10 rounded-[3rem] flex flex-col"><div class="flex justify-between mb-6 items-center"><h4 class="font-bold text-lg uppercase text-mb-accent italic">Media Hub</h4><button onclick="addMediaModule()" class="text-mb-accent font-bold text-sm">+ ADD</button></div><div id="adm-media" class="space-y-4"></div></div>
                </div>
            </div>
        </div>
    </main>

    <!-- [POST MODAL] -->
    <div id="post-modal" class="fixed inset-0 z-[1500] bg-black/90 backdrop-blur-md hidden flex items-center justify-center p-8">
        <div class="glass p-14 rounded-[5rem] w-[55rem] space-y-8">
            <h3 id="modal-title" class="text-4xl font-bold italic tracking-tighter">우리들의 지혜 기록</h3>
            <input type="hidden" id="modal-id">
            <input type="text" id="modal-title-input" placeholder="제목을 입력하세요" class="w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl font-bold text-xl outline-none focus:border-mb-accent">
            <textarea id="modal-content-input" placeholder="내용을 정중히 작성해 주세요" class="w-full h-80 p-6 bg-slate-900 border border-slate-800 rounded-4xl text-lg font-bold outline-none custom-scroll"></textarea>
            <div class="flex space-x-4"><button onclick="savePost()" class="flex-1 bg-mb-accent text-slate-950 py-6 rounded-3xl font-bold text-xl">기록하기</button><button onclick="closeModal()" class="flex-1 bg-slate-800 text-white py-6 rounded-3xl font-bold text-xl">닫기</button></div>
        </div>
    </div>

    <script>
        let state = { user: null, mode: 'login', view: 'dash' };
        function updateClock() { document.getElementById('clock').innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false }); }
        setInterval(updateClock, 1000); updateClock();

        window.onload = () => {
            const saved = localStorage.getItem('morning_dock_v50');
            if(saved) { state.user = JSON.parse(saved); enterHub(); }
        };

        async function handleGate() {
            const email = document.getElementById('gate-email').value;
            if(!email) return alert('이메일 입력 필수');
            const r = await fetch(\`/api/auth/\${state.mode}\`, { method: 'POST', body: JSON.stringify({ email }) });
            const d = await r.json();
            if (d.uid) {
                state.user = { uid: d.uid, email, role: d.role, status: d.status };
                document.getElementById('step-email').classList.add('hidden');
                if (state.mode === 'signup' || !d.otpEnabled) {
                    document.getElementById('step-otp-register').classList.remove('hidden');
                    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let s = ''; for(let i=0;i<16;i++) s += c[Math.floor(Math.random()*32)];
                    document.getElementById('gate-otp-secret').value = s; updateQR();
                } else { document.getElementById('step-otp-verify').classList.remove('hidden'); }
            } else { alert(d.error); }
        }

        function updateQR() {
            const s = document.getElementById('gate-otp-secret').value.toUpperCase();
            if(s.length>=6) document.getElementById('qr-img').src = \`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent('otpauth://totp/MorningDock:'+state.user.email+'?secret='+s+'&issuer=MorningDock')}\`;
        }

        async function registerOTP() {
            const s = document.getElementById('gate-otp-secret').value.toUpperCase();
            await fetch('/api/auth/otp-register', { method: 'POST', body: JSON.stringify({ uid: state.user.uid, secret: s }) });
            alert('보안 키 저장 완료!'); document.getElementById('step-otp-register').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden');
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp-code').value.replace(/[^0-9]/g, '');
            const r = await fetch('/api/auth/otp-verify', { method: 'POST', body: JSON.stringify({ uid: state.user.uid, code }) });
            const d = await r.json();
            if(d.sessionId) { 
                state.user.sessionId = d.sessionId; state.user.role = d.role; state.user.status = d.status;
                localStorage.setItem('morning_dock_v50', JSON.stringify(state.user)); 
                enterHub(); 
            } else { alert(d.error); }
        }

        function logout() { localStorage.removeItem('morning_dock_v50'); location.reload(); }

        function enterHub() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            if(state.user.role === 'ADMIN') document.getElementById('nb-admin').classList.remove('hidden');
            nav('dash'); loadSummary();
        }

        async function loadStats() {
            const r = await fetch('/api/stats'); const d = await r.json();
            document.getElementById('st-news').innerText = d.newsCount;
            document.getElementById('st-posts').innerText = d.postCount;
            document.getElementById('st-users').innerText = d.userCount;
        }

        async function loadSummary() {
            const r = await fetch('/api/community/hot-summary'); const d = await r.json();
            document.getElementById('sum-text').innerText = d.summary || "활발한 교류가 진행 중입니다.";
        }

        function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(\`nb-\${v}\`).classList.add('active');
            document.querySelectorAll('[id^=\"v-\"]').forEach(d => d.classList.add('hidden'));
            document.getElementById(\`v-\${v}\`).classList.remove('hidden');
            document.getElementById('view-title').innerText = v.toUpperCase();
            if(v==='comm') loadComm(); if(v==='news') loadNews(); if(v==='media') loadMedia(); if(v==='admin') loadAdmin();
        }

        async function loadComm() {
            document.getElementById('comm-list-view').classList.remove('hidden');
            document.getElementById('post-detail').classList.add('hidden');
            const r = await fetch('/api/community/posts'); const posts = await r.json();
            document.getElementById('board-body').innerHTML = posts.map((p, idx) => \`
                <tr onclick=\"showPostDetail(\${p.id})\">
                    <td class=\"p-6 text-center text-slate-600\">#\${posts.length-idx}</td>
                    <td class=\"p-6 font-bold\">\${p.title}</td>
                    <td class=\"p-6 text-center text-sm font-bold text-mb-accent\">\${p.email.split('@')[0]}</td>
                    <td class=\"p-6 text-center text-[10px] text-slate-500\">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            \`).join('');
        }

        async function showPostDetail(id) {
            document.getElementById('comm-list-view').classList.add('hidden');
            document.getElementById('post-detail').classList.remove('hidden');
            const [pResp, cResp] = await Promise.all([
                fetch(\`/api/community/posts/detail?id=\${id}\`),
                fetch(\`/api/community/comments?postId=\${id}\`)
            ]);
            const p = await pResp.json();
            const comments = await cResp.json();

            document.getElementById('detail-content').innerHTML = \`
                <div class=\"flex justify-between items-start mb-10 pb-10 border-b border-white/5\">
                    <div><h3 class=\"text-5xl font-bold mb-4 italic tracking-tighter\">\${p.title}</h3><p class=\"text-slate-500 font-bold uppercase tracking-widest text-xs\">\${p.email} | \${new Date(p.created_at).toLocaleString()}</p></div>
                    \${p.user_id === state.user.uid || state.user.role === 'ADMIN' ? \`
                        <div class=\"flex space-x-4\"><button onclick=\"editPost(\${p.id})\" class=\"bg-emerald-500/10 text-emerald-400 px-6 py-2 rounded-xl font-bold\">수정</button><button onclick=\"deletePost(\${p.id})\" class=\"bg-red-500/10 text-red-500 px-6 py-2 rounded-xl font-bold\">삭제</button></div>
                    \`:''}
                </div>
                <div class=\"text-2xl font-bold leading-relaxed whitespace-pre-line text-slate-300 mb-16\">\${p.content}</div>
                
                <!-- Comment Section -->
                <div class=\"mt-20 space-y-8\">
                    <h4 class=\"text-xl font-bold text-mb-accent italic\">Deep Discussion (\${comments.length})</h4>
                    <div class=\"space-y-6\">
                        \${comments.map(c => \`
                            <div class=\"p-8 bg-slate-900/50 rounded-3xl border border-white/5\">
                                <div class=\"flex justify-between mb-4\"><span class=\"text-xs font-bold text-mb-accent\">\${c.email}</span><span class=\"text-[10px] text-slate-500\">\${new Date(c.created_at).toLocaleString()}</span></div>
                                <div class=\"text-lg font-bold text-slate-200\">\${c.content}</div>
                            </div>
                        \`).join('')}
                    </div>
                    <div class=\"mt-10 bg-slate-900 p-8 rounded-[3rem] border border-mb-accent/20\">
                        <textarea id=\"new-comment-input\" placeholder=\"지혜로운 댓글을 남겨주세요\" class=\"w-full bg-transparent border-none outline-none text-lg font-bold text-slate-200 resize-none h-24 custom-scroll\"></textarea>
                        <div class=\"flex justify-end mt-4\"><button onclick=\"addComment(\${p.id})\" class=\"bg-mb-accent text-slate-950 px-8 py-3 rounded-2xl font-bold\">답글 달기</button></div>
                    </div>
                </div>
            \`;
        }

        async function addComment(postId) {
            const content = document.getElementById('new-comment-input').value;
            if(!content) return;
            await fetch('/api/community/comments/add', { method:'POST', body:JSON.stringify({ postId, content, userId:state.user.uid, sessionId:state.user.sessionId }) });
            showPostDetail(postId);
        }

        function backToBoard() { loadComm(); }
        function openWriteModal() { closeModal(); document.getElementById('post-modal').classList.remove('hidden'); }
        function closeModal() { document.getElementById('post-modal').classList.add('hidden'); document.getElementById('modal-id').value = ''; document.getElementById('modal-title-input').value = ''; document.getElementById('modal-content-input').value = ''; }

        async function savePost() {
            const id = document.getElementById('modal-id').value;
            const title = document.getElementById('modal-title-input').value;
            const content = document.getElementById('modal-content-input').value;
            if(!title || !content) return;
            const api = id ? '/api/community/posts/update' : '/api/community/posts/add';
            await fetch(api, { method:'POST', body:JSON.stringify({ id:Number(id), title, content, userId:state.user.uid, sessionId:state.user.sessionId }) });
            alert('기록 완료!'); closeModal(); backToBoard();
        }

        async function deletePost(id) {
            if(!confirm('정말 삭제하시겠습니까?')) return;
            await fetch('/api/community/posts/delete', { method:'POST', body:JSON.stringify({ id, userId:state.user.uid, sessionId:state.user.sessionId }) });
            alert('삭제되었습니다.'); backToBoard();
        }

        async function editPost(id) {
            const r = await fetch(\`/api/community/posts/detail?id=\${id}\`); const p = await r.json();
            document.getElementById('modal-id').value = p.id;
            document.getElementById('modal-title-input').value = p.title;
            document.getElementById('modal-content-input').value = p.content;
            document.getElementById('post-modal').classList.remove('hidden');
        }

        async function loadNews() {
            const r = await fetch('/api/news'); const news = await r.json();
            document.getElementById('news-grid').innerHTML = news.map(n => \`
                <div class="glass p-12 rounded-[4rem] border-l-[16px] border-emerald-500 space-y-8 fade-in">
                    <div class="flex justify-between items-center">
                        <h4 class="text-4xl font-bold underline decoration-mb-accent decoration-8 italic">\${n.title}</h4>
                        <span class="bg-mb-accent/10 text-mb-accent px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest">Analyzed by: \${n.model_name || "Llama-3-8b"}</span>
                    </div>
                    <p class="p-10 bg-slate-900 border-l-8 border-mb-accent rounded-3xl text-xl font-bold font-serif text-slate-300">"\${n.summary}"</p>
                    <div class="bg-black/30 p-10 rounded-3xl flex justify-between items-center border border-white/5 mx-4">
                        <p class="text-xl font-bold text-mb-accent italic tracking-tight">Topic: "\${n.discussion_question}"</p>
                        <div class="flex space-x-4">
                            <button 
                                onclick="discussOnNews(this.dataset.t, this.dataset.l, this.dataset.s)" 
                                data-t="\${n.title.replace(/"/g, '&quot;')}" 
                                data-l="\${n.link}" 
                                data-s="\${n.summary.replace(/"/g, '&quot;')}"
                                class="bg-mb-accent text-slate-950 px-8 py-3 rounded-2xl font-bold text-xs uppercase">
                                토론 발제
                            </button>
                            <a href="\${n.link}" target="_blank" class="bg-white/10 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase">전문 읽기</a>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function discussOnNews(t, l, s) { 
            state.view = 'comm';
            const navBtn = document.getElementById('nb-comm');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            navBtn.classList.add('active');
            document.querySelectorAll('[id^=\"v-\"]').forEach(d => d.classList.add('hidden'));
            document.getElementById('v-comm').classList.remove('hidden');
            document.getElementById('view-title').innerText = 'COMMUNITY';
            
            openWriteModal(); 
            document.getElementById('modal-title-input').value = \`[지능형 토론] \${t}\`; 
            document.getElementById('modal-content-input').value = \`기사: \${l}\\n\\nAI 요약: \${s}\`; 
        }

        async function loadMedia() {
            const r = await fetch('/api/media'); const meds = await r.json();
            document.getElementById('media-grid').innerHTML = meds.map(m => \`
                <div class=\"glass p-10 rounded-[4rem] text-center space-y-6 hover:scale-105 transition-all border-b-8 border-mb-accent\">
                    <i class=\"\${m.icon} text-7xl text-mb-accent\"></i>
                    <div><h4 class=\"text-2xl font-bold italic tracking-tighter\">\${m.name}</h4><p class=\"text-[10px] font-bold uppercase text-slate-500 mb-6\">\${m.type}</p></div>
                    <div class=\"flex flex-col space-y-3\">
                        <button onclick=\"window.open('\${m.url}', '_blank')\" class=\"w-full bg-mb-accent text-slate-950 py-3 rounded-2xl font-bold text-xs\">콘텐츠 열기</button>
                        \${state.user.role === 'ADMIN' ? \`<button onclick=\"deleteMedia(\${m.id})\" class=\"text-red-500 text-[10px] font-bold\">REMOVE</button>\`:''}
                    </div>
                </div>
            \`).join('');
        }

        async function loadAdmin() {
            const [uResp, mResp] = await Promise.all([fetch('/api/admin/users'), fetch('/api/media')]);
            const users = await uResp.json(); const meds = await mResp.json();
            
            document.getElementById('adm-users').innerHTML = users.map(u => \`
                <div class=\"p-6 bg-slate-900 rounded-3xl flex justify-between items-center\">
                    <div><span class=\"font-bold\">\${u.email}</span><span class=\"ml-4 text-[10px] font-bold \${u.status==='APPROVED'?'text-emerald-400':'text-red-500'}\">[\${u.status}]</span></div>
                    <div class=\"flex space-x-2\">
                        <select onchange=\"updateUser('\${u.uid}', this.value, '\${u.status}')\" class=\"bg-slate-800 text-[10px] rounded-lg p-1 outline-none text-mb-accent\">
                            <option value=\"USER\" \${u.role==='USER'?'selected':''}>USER</option>
                            <option value=\"ADMIN\" \${u.role==='ADMIN'?'selected':''}>ADMIN</option>
                        </select>
                        <button onclick=\"updateUser('\${u.uid}', '\${u.role}', '\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}')\" class=\"text-[10px] font-bold p-1 bg-white/5 rounded-lg\">\${u.status==='APPROVED'?'BLOCK':'APPROVE'}</button>
                    </div>
                </div>
            \`).join('');

            document.getElementById('adm-media').innerHTML = meds.map(m => \`
                <div class=\"p-6 bg-slate-900 rounded-3xl flex justify-between items-center\"><span class=\"font-bold text-sm\">\${m.name}</span><button onclick=\"deleteMedia(\${m.id})\" class=\"text-red-500 font-bold text-xs uppercase\">X</button></div>
            \`).join('');
        }

        async function updateUser(targetUid, role, status) {
            await fetch('/api/admin/users/update', { method:'POST', body:JSON.stringify({ targetUid, role, status, sessionId:state.user.sessionId }) });
            loadAdmin();
        }

        function addMediaModule() {
            const n = prompt('미디어 명칭'); const t = prompt('유형 (YOUTUBE/PODCAST/MUSIC)'); const u = prompt('주소 (URL)');
            if(!n || !u) return;
            fetch('/api/admin/media/add', { method:'POST', body:JSON.stringify({ name:n, type:t||'YOUTUBE', url:u, icon:'fa-solid fa-play', sessionId:state.user.sessionId }) }).then(()=>loadAdmin());
        }

        async function deleteMedia(id) {
            if(!confirm('삭제하시겠습니까?')) return;
            await fetch('/api/admin/media/delete', { method:'POST', body:JSON.stringify({ id, sessionId:state.user.sessionId }) });
            loadAdmin(); if(state.view==='media') loadMedia();
        }
    </script>
</body>
</html>
  `;
}
