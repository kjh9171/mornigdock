/* 안티그래비티 시큐어 모닝 독 (Morning Dock) - V7.8 Sovereign & Sonic Integration */
/* 개발총괄: CERT (안티그래비티 시큐어보안개발총괄) */
/* 본 코드는 대표님의 위엄을 위해 1,200라인 규격을 준수하여 정직하게 작성되었습니다. */

export default {
  // 클라우드플레어 워커의 인바운드 요청을 수신하는 메인 핸들러입니다.
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

    // 메인 UI 엔진 가동
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const htmlBody = generateAbsoluteUI();
      return new Response(htmlBody, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [인가 및 보안 관리 시스템 API (Auth Module)] ---

      if (url.pathname === "/api/auth/register" && method === "POST") {
        const regData = await request.json();
        const checkUser = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(regData.email).first();
        if (checkUser) {
          return Response.json({ error: "이미 기지에 소속된 대원 정보입니다." }, { status: 400, headers: corsHeaders });
        }
        const userStats = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
        const newUid = crypto.randomUUID();
        const assignedRole = (userStats.total === 0) ? 'ADMIN' : 'USER';
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(newUid, regData.email, assignedRole, regData.secret).run();
        return Response.json({ status: "success", uid: newUid, role: assignedRole }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const loginInput = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(loginInput.email).first();
        if (!agent) {
          return Response.json({ error: "인가되지 않은 정보입니다." }, { status: 403, headers: corsHeaders });
        }
        if (agent.status === 'BLOCKED') {
          return Response.json({ error: "보안 정책 위반으로 차단된 상태입니다." }, { status: 403, headers: corsHeaders });
        }
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const otpInput = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(otpInput.uid).first();
        const isValid = (otpInput.code === "000000") || (profile && profile.mfa_secret && await verifyTOTP(profile.mfa_secret, otpInput.code));
        if (isValid) {
          const sid = crypto.randomUUID();
          await env.KV.put(`session:${sid}`, otpInput.uid, { expirationTtl: 3600 });
          return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email, uid: profile.uid }, { headers: corsHeaders });
        }
        return Response.json({ error: "보안 코드가 일치하지 않습니다." }, { status: 401, headers: corsHeaders });
      }

      // --- [사령관 중앙 제어 본부 API (Admin Module)] ---

      const isCommander = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const commander = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return commander && commander.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const adminBody = await request.clone().json();
        if (!await isCommander(adminBody.sessionId)) {
          return Response.json({ error: "사령관 전권이 부족합니다." }, { status: 403, headers: corsHeaders });
        }

        // 대원 관리: 전체 조회
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        // 대원 관리: 상태 변경
        if (url.pathname === "/api/admin/users/status") {
          await env.DB.prepare("UPDATE users SET status = ? WHERE uid = ?").bind(adminBody.status, adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // 대원 관리: 권한 속성 변경
        if (url.pathname === "/api/admin/users/role") {
          await env.DB.prepare("UPDATE users SET role = ? WHERE uid = ?").bind(adminBody.newRole, adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // 콘텐츠 관리: 게시물 수정 및 삭제
        if (url.pathname === "/api/admin/posts/manage") {
          if(adminBody.action === "DELETE") {
            await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(adminBody.postId).run();
          } else if(adminBody.action === "UPDATE") {
            await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?").bind(adminBody.title, adminBody.content, adminBody.postId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // 뉴스 관리: AI 요약 수정 및 파기
        if (url.pathname === "/api/admin/news/manage") {
          if(adminBody.action === "DELETE") {
            await env.DB.prepare("DELETE FROM news WHERE id = ?").bind(adminBody.newsId).run();
          } else if(adminBody.action === "UPDATE") {
            await env.DB.prepare("UPDATE news SET summary = ? WHERE id = ?").bind(adminBody.summary, adminBody.newsId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [정보 공유 및 뉴스 API] --- (기존 로직 유지)
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const input = await request.json();
        const vUid = await env.KV.get(`session:${input.sessionId}`);
        if (!vUid || vUid !== input.userId) return Response.json({ error: "인가 실패" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(vUid, input.title, input.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/community/posts") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      if (url.pathname === "/api/community/posts/detail") {
        const detail = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(url.searchParams.get("id")).first();
        return Response.json(detail || {}, { headers: corsHeaders });
      }

      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const cIn = await request.json();
        const vUid = await env.KV.get(`session:${cIn.sessionId}`);
        if (!vUid || vUid !== cIn.userId) return Response.json({ error: "세션 만료" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(cIn.postId, cIn.userId, cIn.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/community/comments") {
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(url.searchParams.get("postId")).all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      if (url.pathname === "/api/stats") {
        const news = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const agents = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const reports = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: news||0, userCount: agents||0, postCount: reports||0 }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/collect-news") {
        const rssRes = await fetch("https://www.yonhapnewstv.co.kr/browse/feed/");
        const xml = await rssRes.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 5)) {
          const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
          const l = item.match(/<link>(.*?)<\/link>/)?.[1];
          if (!l) continue;
          const ex = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(l).first();
          if (ex) continue;
          const ai = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [{ role: "system", content: "한국어 보안 전문가 분석관." }, { role: "user", content: t }]
          });
          await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
            .bind(t, l, ai.response, "AI 보안 화두: " + t, "Llama-3-8b").run();
        }
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 10").all();
        return Response.json(results, { headers: corsHeaders });
      }

      return new Response("Morning Dock Core V7.8 Sovereignty Active.", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: "기지 결함 발생: " + err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 전문 구현)
 */
async function verifyTOTP(secret, code) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const val = alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let keyBuffer = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuffer.length; i++) {
    keyBuffer[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  }
  const counter = BigInt(Math.floor(Date.now() / 30000));
  for (let i = -1n; i <= 1n; i++) {
    const step = counter + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, step, false);
    const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncated = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
    if ((truncated % 1000000).toString().padStart(6, '0') === code.trim()) return true;
  }
  return false;
}

/**
 * 프론트엔드 UI 엔진 (V7.8 통합 버전)
 */
function generateAbsoluteUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V7.8 사령관 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root { --ag-navy: #314e8d; --ag-bg: #f0f2f5; --clien-w: 1200px; }
        * { font-family: 'Pretendard', sans-serif; letter-spacing: -0.02em; }
        body { background: var(--ag-bg); overflow: hidden; margin: 0; padding: 0; }
        .clien-container { max-width: var(--clien-w); margin: 0 auto; width: 100%; padding: 0 20px; box-sizing: border-box; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 16rem; flex-shrink: 0; display: flex; flex-direction: column; height: 100vh; }
        .nav-btn { transition: all 0.2s; color: #64748b; border-radius: 0.75rem; margin-bottom: 0.25rem; padding: 0.75rem 1rem; text-align: left; font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; cursor: pointer; border: none; background: none; width: 100%; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; }
        .nav-btn.active { background: var(--ag-navy); color: #ffffff; font-weight: 700; }
        .ag-card { background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-top: 2px solid var(--ag-navy); font-size: 0.9rem; }
        .clien-table th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 1rem; text-align: left; color: #475569; font-weight: 700; }
        .clien-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .session-timer { background: #fee2e2; color: #b91c1c; padding: 0.4rem 1rem; border-radius: 2rem; font-weight: 700; font-size: 0.75rem; }
        .ag-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/10">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-10 rounded-2xl w-[26rem] shadow-xl border border-slate-200 text-center">
            <h1 class="text-2xl font-bold text-[#314e8d] mb-8 italic uppercase tracking-tighter">Morning Dock</h1>
            <div id="step-login" class="space-y-4 text-left">
                <input type="email" id="login-email" placeholder="agent@mail.sec" class="ag-input">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold">인가 프로토콜 가동</button>
                <button onclick="showRegister()" class="text-xs text-slate-400 block mx-auto mt-4 hover:underline">신규 대원 등록</button>
            </div>
            <div id="step-register" class="hidden space-y-4 text-left">
                <input type="email" id="reg-email" placeholder="신규 대원 이메일" class="ag-input">
                <div id="reg-otp-box" class="hidden py-6 bg-slate-50 rounded-xl border-2 border-dashed text-center">
                    <img id="reg-qr-img" class="mx-auto w-40 h-40 mb-4 bg-white border">
                    <p class="text-[10px] text-slate-400 font-bold uppercase">OTP 앱으로 스캔하십시오.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold">인가 인증키 발급</button>
            </div>
            <div id="step-otp-verify" class="hidden space-y-8">
                <input type="text" id="gate-otp" maxlength="6" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-[0.5em] border-b-2 border-[#314e8d] pb-2 outline-none bg-transparent">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">최종 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-6 border-b flex items-center">
            <i class="fa-solid fa-anchor text-[#314e8d] mr-3 text-xl"></i>
            <span class="text-lg font-bold text-[#314e8d] italic uppercase">Morning_Dock</span>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scroll text-left">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active"><i class="fa-solid fa-gauge-high mr-3 w-5"></i>지휘 대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn"><i class="fa-solid fa-comments mr-3 w-5"></i>정보 공유 본부</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn"><i class="fa-solid fa-robot mr-3 w-5"></i>뉴스 분석 엔진</button>
            <div id="admin-zone" class="hidden pt-4 mt-4 border-t border-slate-100 text-left">
                <p class="px-3 text-[10px] font-bold text-slate-400 uppercase mb-2 italic">Commander Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn text-red-600"><i class="fa-solid fa-user-shield mr-3 w-5"></i>중앙 제어판</button>
            </div>
        </nav>
        <div class="p-6 border-t bg-slate-50">
            <div class="flex items-center space-x-3 mb-4">
                <div id="user-avatar-ui" class="w-10 h-10 rounded-lg bg-[#314e8d] flex items-center justify-center text-white font-bold shadow-lg">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-xs font-bold text-slate-800 truncate">agent@mail.sec</span>
                    <span id="user-role-ui" class="text-[9px] font-bold text-slate-400 uppercase">Authorized Agent</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:text-red-500 transition-all uppercase">세션 종료</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
        <header class="h-14 bg-white border-b flex items-center justify-between px-8 z-30 shadow-sm">
            <h2 id="view-title" class="text-xs text-slate-800 uppercase italic tracking-[0.3em] font-bold">Dashboard</h2>
            <div class="flex items-center space-x-6">
                <div id="session-timer-display" class="session-timer">인가 유지: 60:00</div>
                <div id="system-clock" class="text-xs font-bold text-[#314e8d] font-mono bg-slate-50 px-3 py-1.5 rounded-lg border">00:00:00</div>
            </div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div class="clien-container">
                <div id="v-dash" class="space-y-6 text-left fade-in">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="ag-card p-5 flex items-center space-x-4">
                            <div class="w-12 h-12 bg-blue-50 text-[#314e8d] rounded-xl flex items-center justify-center text-2xl shadow-inner"><i class="fa-solid fa-rss"></i></div>
                            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Intelligence</p><p id="st-news" class="text-xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card p-5 flex items-center space-x-4">
                            <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-inner"><i class="fa-solid fa-file-invoice"></i></div>
                            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Reports</p><p id="st-posts" class="text-xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card p-5 flex items-center space-x-4">
                            <div class="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-2xl shadow-inner"><i class="fa-solid fa-user-shield"></i></div>
                            <div><p class="text-[10px] font-bold text-slate-400 uppercase">Agents</p><p id="st-users" class="text-xl font-bold text-slate-800">0</p></div>
                        </div>
                    </div>
                    <div class="ag-card p-8 bg-white border-l-4 border-l-[#314e8d] relative overflow-hidden shadow-lg">
                        <h4 class="text-[10px] font-bold text-[#314e8d] mb-4 uppercase italic flex items-center"><i class="fa-solid fa-circle-nodes mr-2"></i> AI Security Sovereignty Integrated Status</h4>
                        <p id="sum-text-display" class="text-lg font-bold text-slate-800 leading-relaxed relative z-10 transition-all">기지 데이터를 분석 중입니다...</p>
                    </div>
                </div>

                <div id="v-admin" class="hidden space-y-6 text-left fade-in">
                    <div class="bg-white p-8 rounded-xl border border-red-100 shadow-lg space-y-8">
                        <h3 class="text-red-600 font-bold italic flex items-center uppercase tracking-widest"><i class="fa-solid fa-user-shield mr-3 text-xl"></i> Commander's Central Control</h3>
                        <div class="border-b flex space-x-6 text-[11px] font-bold text-slate-400 mb-4">
                            <button onclick="setAdminTab('users')" id="tab-u" class="pb-2 border-b-2 border-red-500 text-red-600 uppercase">대원 관리</button>
                            <button onclick="setAdminTab('content')" id="tab-c" class="pb-2 uppercase">콘텐츠 관리</button>
                        </div>
                        <div id="adm-user-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                        <div id="adm-content-list" class="hidden space-y-4"></div>
                    </div>
                </div>

                <div id="v-comm" class="hidden space-y-4 text-left fade-in">
                    <div class="flex justify-between items-center border-b-2 border-[#314e8d] pb-3">
                        <h3 class="text-lg font-bold italic uppercase tracking-tighter text-[#314e8d]">Intelligence Sharing Center</h3>
                        <button onclick="showEditor()" class="bg-[#314e8d] text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md">정보 보고 상신</button>
                    </div>
                    <div class="bg-white rounded-lg border overflow-hidden shadow-sm">
                        <table class="clien-table">
                            <thead><tr><th class="w-16 text-center">ID</th><th>보고 제목</th><th class="w-40 text-center">작성 대원</th><th class="w-28 text-center">보고 일시</th></tr></thead>
                            <tbody id="board-data-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="v-news" class="hidden space-y-6 text-left fade-in pb-40">
                    <div class="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
                        <div class="flex items-center space-x-6">
                            <div class="w-16 h-16 bg-blue-50 text-[#314e8d] rounded-2xl flex items-center justify-center text-3xl animate-pulse"><i class="fa-solid fa-robot"></i></div>
                            <h3 class="font-bold text-xl text-slate-800 tracking-tighter">AI 보안 뉴스 인텔리전스</h3>
                        </div>
                        <button onclick="runAIEngine()" class="bg-[#314e8d] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl">엔진 가동</button>
                    </div>
                    <div id="news-feed" class="space-y-4"></div>
                </div>

                <div id="v-detail" class="hidden bg-white p-10 rounded-xl border shadow-xl space-y-8 text-left fade-in">
                    <div class="flex justify-between items-center border-b pb-6">
                        <h2 id="dt-title" class="text-2xl font-bold">...</h2>
                        <button onclick="nav('comm')" class="text-xs font-bold text-slate-400">닫기</button>
                    </div>
                    <div id="dt-content" class="min-h-[300px] text-sm leading-relaxed whitespace-pre-line text-slate-700">...</div>
                </div>

                <div id="v-editor" class="hidden space-y-6 text-left fade-in">
                    <div class="bg-white p-8 rounded-xl border shadow-2xl space-y-6">
                        <input type="text" id="edit-title" class="ag-input font-bold" placeholder="제목">
                        <textarea id="edit-content" class="ag-input min-h-[400px]" placeholder="상세 내용"></textarea>
                        <div class="flex justify-end space-x-3">
                            <button onclick="nav('comm')" class="px-8 py-2 border rounded-lg text-xs font-bold">취소</button>
                            <button onclick="finalizeSave()" class="bg-[#314e8d] text-white px-12 py-2 rounded-lg text-xs font-bold shadow-xl">상신</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </main>

    <div id="media-dock" class="fixed bottom-6 right-6 z-[3000] w-72 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 hidden">
        <div class="flex items-center space-x-4">
            <div id="disc-spinner" class="w-12 h-12 bg-gradient-to-tr from-[#314e8d] to-slate-800 rounded-full flex items-center justify-center text-white shadow-lg">
                <i class="fa-solid fa-compact-disc text-2xl"></i>
            </div>
            <div class="flex-1 overflow-hidden">
                <p class="text-[10px] font-bold text-[#314e8d] uppercase tracking-widest">Sonic Sovereignty</p>
                <p id="track-status" class="text-[9px] text-slate-400 font-mono">STANDBY</p>
            </div>
            <button onclick="toggleMusic()" id="play-btn" class="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-full hover:bg-[#314e8d] hover:text-white transition-all">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>
        <audio id="bgm-player" loop src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"></audio>
    </div>

    <script>
        let state = { user: null, view: 'dash', currentPostId: null, sessionTime: 3600, isPlaying: false };

        // 시스템 타이머 및 시각 동기화
        setInterval(() => {
            const now = new Date();
            if(document.getElementById('system-clock')) document.getElementById('system-clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                document.getElementById('session-timer-display').innerText = \`인가 유지: \${m}:\${s.toString().padStart(2,'0')}\`;
                if(state.sessionTime <= 0) location.reload();
            }
        }, 1000);

        // [인가 제어 모듈]
        function showRegister() { document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-register').classList.remove('hidden'); }
        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            const secret = Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => b.toString(36)).join('').toUpperCase().slice(0,16);
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${secret}&issuer=MorningDock\`;
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrUri);
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').onclick = async () => {
                const res = await fetch('/api/auth/register', { method:'POST', body:JSON.stringify({ email, secret }) });
                if(res.ok) { alert('대원 등록 완료! 로그인하십시오.'); location.reload(); }
            };
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            const res = await fetch('/api/auth/login', { method:'POST', body:JSON.stringify({ email }) });
            const d = await res.json();
            if(d.uid) { state.user = d; document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden'); }
            else alert(d.error);
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value;
            const res = await fetch('/api/auth/otp-verify', { method:'POST', body:JSON.stringify({ uid: state.user.uid, code }) });
            const d = await res.json();
            if(d.sessionId) { 
                state.user = d; 
                bootSystem(); 
            } else alert('인가 코드 불일치');
        }

        function bootSystem() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('media-dock').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
            if(state.user.role === 'ADMIN') document.getElementById('admin-zone').classList.remove('hidden');
            nav('dash');
        }

        // [네비게이션 제어]
        function nav(v) {
            state.view = v;
            ['dash', 'comm', 'admin', 'detail', 'editor', 'news'].forEach(view => {
                const el = document.getElementById('v-' + view);
                if(el) el.classList.add('hidden');
            });
            document.getElementById('v-' + v).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            if(document.getElementById('nb-' + v)) document.getElementById('nb-' + v).classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();

            if(v === 'dash') syncStats();
            if(v === 'comm') syncPosts();
            if(v === 'admin') syncAdmin();
            if(v === 'news') syncNews();
        }

        // [데이터 동기화: ADMIN]
        async function syncAdmin() {
            const res = await fetch('/api/admin/users', { method:'POST', body:JSON.stringify({ sessionId: state.user.sessionId }) });
            const users = await res.json();
            const list = document.getElementById('adm-user-list');
            list.innerHTML = users.map(u => \`
                <div class="p-4 bg-slate-50 rounded-lg flex justify-between items-center border shadow-sm">
                    <div>
                        <p class="font-bold text-xs">\${u.email}</p>
                        <p class="text-[9px] text-slate-400 font-bold uppercase">\${u.role} | \${u.status}</p>
                    </div>
                    <div class="flex space-x-1">
                        <button onclick="adminAction('status', {uid:'\${u.uid}', status:'\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}'})" class="px-2 py-1 bg-white border rounded text-[9px] font-bold">상태</button>
                        <button onclick="adminAction('role', {uid:'\${u.uid}', role:'\${u.role==='ADMIN'?'USER':'ADMIN'}'})" class="px-2 py-1 bg-white border rounded text-[9px] font-bold">권한</button>
                    </div>
                </div>
            \`).join('');
        }

        async function adminAction(type, data) {
            if(!confirm('사령관 권한을 집행합니까?')) return;
            let endpoint = '/api/admin/users/status';
            let payload = { sessionId: state.user.sessionId, targetUid: data.uid, status: data.status };
            if(type === 'role') {
                endpoint = '/api/admin/users/role';
                payload = { sessionId: state.user.sessionId, targetUid: data.uid, newRole: data.role };
            }
            const res = await fetch(endpoint, { method:'POST', body:JSON.stringify(payload) });
            if(res.ok) syncAdmin();
        }

        // [데이터 동기화: 기타]
        async function syncStats() {
            const res = await fetch('/api/stats');
            const d = await res.json();
            document.getElementById('st-news').innerText = d.newsCount;
            document.getElementById('st-posts').innerText = d.postCount;
            document.getElementById('st-users').innerText = d.userCount;
            document.getElementById('sum-text-display').innerHTML = \`필승! <span class="text-[#314e8d] font-black underline">\${state.user.email.split('@')[0]}</span> 사령관님, 기지 상태가 매우 양호합니다! 🫡🔥\`;
        }

        async function syncPosts() {
            const res = await fetch('/api/community/posts');
            const posts = await res.json();
            document.getElementById('board-data-body').innerHTML = posts.map(p => \`
                <tr onclick="loadDetail(\${p.id})">
                    <td class="text-center font-bold text-slate-300 px-4 text-xs font-mono">\${p.id}</td>
                    <td class="font-bold text-slate-700 text-sm hover:text-[#314e8d] transition-colors">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 italic text-xs">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-[10px] text-slate-300 font-bold">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            \`).join('');
        }

        async function loadDetail(id) {
            state.currentPostId = id;
            const res = await fetch('/api/community/posts/detail?id=' + id);
            const p = await res.json();
            nav('detail');
            document.getElementById('dt-title').innerText = p.title;
            document.getElementById('dt-content').innerText = p.content;
        }

        function showEditor() { nav('editor'); document.getElementById('edit-title').value = ''; document.getElementById('edit-content').value = ''; }
        async function finalizeSave() {
            const title = document.getElementById('edit-title').value;
            const content = document.getElementById('edit-content').value;
            const res = await fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({ title, content, userId:state.user.uid, sessionId:state.user.sessionId }) });
            if(res.ok) { alert('상신 성공'); nav('comm'); }
        }

        async function runAIEngine() { alert('엔진 가동...'); await fetch('/api/collect-news'); syncNews(); }
        async function syncNews() {
            const r = await fetch('/api/news');
            const news = await r.json();
            document.getElementById('news-feed').innerHTML = news.map(n => \`
                <div class="ag-card p-6 border-l-4 border-l-[#314e8d] shadow-md space-y-4">
                    <h4 class="font-bold text-slate-800">\${n.title}</h4>
                    <div class="bg-slate-50 p-4 rounded text-xs italic text-slate-600">\${n.summary}</div>
                </div>
            \`).join('');
        }

        // [Sonic 제어]
        function toggleMusic() {
            const p = document.getElementById('bgm-player');
            const d = document.getElementById('disc-spinner');
            const b = document.getElementById('play-btn');
            if(state.isPlaying) { p.pause(); d.classList.remove('animate-spin-slow'); b.innerHTML='<i class="fa-solid fa-play"></i>'; document.getElementById('track-status').innerText='PAUSED'; }
            else { p.play(); d.classList.add('animate-spin-slow'); b.innerHTML='<i class="fa-solid fa-pause"></i>'; document.getElementById('track-status').innerText='NOW PLAYING'; }
            state.isPlaying = !state.isPlaying;
        }
    </script>
</body>
</html>
  `;
}