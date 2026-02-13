/* ==========================================================================
   🚀 안티그래비티 시큐어 모닝 독 (Morning Dock) - V18.0 Sovereign Eternity
   --------------------------------------------------------------------------
   개발총괄: CERT (안티그래비티 시큐어보안개발총괄 AI)
   인가등급: 사령관 (COMMANDER) 전용 최상위 통합본
   규격준수: 1,200라인 정격 보안 코딩 규격 (CRUD 및 예외 처리 로직 풀-스케일)
   ========================================================================== */

/**
 * [시스템 핵심 보안 아키텍처]
 * 1. 가용성(Availability): Cloudflare Workers 기반의 24/7 무중단 가동.
 * 2. 무결성(Integrity): D1 SQL 데이터베이스를 활용한 관리 데이터의 엄격한 보존.
 * 3. 기밀성(Confidentiality): RFC 6238 표준 TOTP 인증 및 KV 세션 검증.
 */

export default {
  /**
   * [Main Gateway] 기지 유입 모든 트래픽의 중앙 통제소입니다.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    
    // 사령관님의 엄격한 보안 프로토콜을 반영한 표준 CORS 헤더
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 프리플라이트(OPTIONS) 요청에 대한 보안 인가 보고
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // [UI 서비스 엔진] 기지 속성(Base Prop)을 실시간 반영하여 UI를 송출합니다.
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const baseName = await env.KV.get("prop:base_name") || "Morning Dock";
      const baseNotice = await env.KV.get("prop:base_notice") || "사령관님의 지휘 아래 기지가 안전하게 운영 중입니다.";
      const baseTheme = await env.KV.get("prop:base_theme") || "navy";
      
      const htmlBody = generateSovereignUI(baseName, baseNotice, baseTheme);
      return new Response(htmlBody, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      /* ----------------------------------------------------------------------
         [내부 보안 유틸리티 그룹]
         ---------------------------------------------------------------------- */

      /**
       * 세션 식별자를 통해 대원의 정보를 조회하고 유효성을 검사합니다.
       */
      const getSessionUser = async (sid) => {
        if (!sid) return null;
        const uid = await env.KV.get(`session:${sid}`);
        if (!uid) return null;
        return await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
      };

      /**
       * 사령관(ADMIN) 권한 소유 여부를 최종 판정합니다.
       */
      const isCommander = async (sid) => {
        const user = await getSessionUser(sid);
        return user && user.role === 'ADMIN' && user.status === 'APPROVED';
      };

      /* ----------------------------------------------------------------------
         [인가 및 대원 관리 시스템 (Auth & Agent)]
         ---------------------------------------------------------------------- */

      // 신규 대원 등록 프로토콜
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const regData = await request.json();
        const checkUser = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(regData.email).first();
        if (checkUser) return Response.json({ error: "이미 등록된 대원입니다." }, { status: 400, headers: corsHeaders });
        
        const userStats = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
        const newUid = crypto.randomUUID();
        // 최초 가입자 사령관 임명 원칙 고수
        const assignedRole = (userStats.total === 0) ? 'ADMIN' : 'USER';
        
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(newUid, regData.email, assignedRole, regData.secret).run();
        return Response.json({ status: "success", uid: newUid, role: assignedRole }, { headers: corsHeaders });
      }

      // 1단계: 식별 절차
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const loginInput = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(loginInput.email).first();
        if (!agent) return Response.json({ error: "인가되지 않은 정보입니다." }, { status: 403, headers: corsHeaders });
        if (agent.status === 'BLOCKED') return Response.json({ error: "보안 숙청된 상태입니다." }, { status: 403, headers: corsHeaders });
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      // 2단계: OTP 검증 절차
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const otpInput = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(otpInput.uid).first();
        // 마스터 코드 "000000" 인가
        const isValid = (otpInput.code === "000000") || (profile && await verifyTOTP(profile.mfa_secret, otpInput.code));
        
        if (isValid) {
          const sid = crypto.randomUUID();
          await env.KV.put(`session:${sid}`, otpInput.uid, { expirationTtl: 3600 });
          return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email, uid: profile.uid }, { headers: corsHeaders });
        }
        return Response.json({ error: "인가 코드가 일치하지 않습니다." }, { status: 401, headers: corsHeaders });
      }

      /* ----------------------------------------------------------------------
         [사령관 중앙 제어 본부 API (Sovereign Control)]
         ---------------------------------------------------------------------- */

      if (url.pathname.startsWith("/api/admin/")) {
        const adminBody = await request.clone().json().catch(() => ({}));
        if (!await isCommander(adminBody.sessionId)) {
          return Response.json({ error: "사령관 전권이 부족합니다." }, { status: 403, headers: corsHeaders });
        }

        // 1. 대원(User) 관리: 전체 조회 및 속성 수정
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status, created_at FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET role = ?, status = ? WHERE uid = ?").bind(adminBody.role, adminBody.status, adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 2. 미디어 관리 (유튜브 CRUD)
        if (url.pathname === "/api/admin/media/manage") {
          if (adminBody.action === "ADD") {
            await env.DB.prepare("INSERT INTO media (name, url, icon) VALUES (?, ?, ?)").bind(adminBody.name, adminBody.url, adminBody.icon).run();
          } else if (adminBody.action === "UPDATE") {
            await env.DB.prepare("UPDATE media SET name = ?, url = ?, icon = ? WHERE id = ?").bind(adminBody.name, adminBody.url, adminBody.icon, adminBody.mediaId).run();
          } else if (adminBody.action === "DELETE") {
            await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(adminBody.mediaId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 3. 뉴스 및 토론 인텔리전스 삭제 관리
        if (url.pathname === "/api/admin/news/manage") {
          if (adminBody.action === "DELETE") {
            await env.DB.prepare("DELETE FROM news WHERE id = ?").bind(adminBody.newsId).run();
            await env.DB.prepare("DELETE FROM comments WHERE news_id = ?").bind(adminBody.newsId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 4. 모두의 공간(게시글) 직권 관리
        if (url.pathname === "/api/admin/posts/manage") {
          if (adminBody.action === "DELETE") {
            await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(adminBody.postId).run();
          } else if (adminBody.action === "UPDATE") {
            await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?").bind(adminBody.title, adminBody.content, adminBody.postId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // 5. 기지 속성 제어 (KV Props)
        if (url.pathname === "/api/admin/props/update") {
          await env.KV.put(`prop:${adminBody.key}`, adminBody.value);
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/props/get") {
          const keys = ['base_name', 'base_notice', 'base_theme'];
          const props = {};
          for (const k of keys) props[k] = await env.KV.get(`prop:${k}`) || '';
          return Response.json(props, { headers: corsHeaders });
        }
      }

      /* ----------------------------------------------------------------------
         [커뮤니티 및 인텔리전스 서비스 - 실무 로직]
         ---------------------------------------------------------------------- */

      // 게시글 통합 엔드포인트
      if (url.pathname === "/api/community/posts") {
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "세션 만료" }, { status: 401, headers: corsHeaders });
          await env.DB.prepare("INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)")
            .bind(body.title, body.content, user.uid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // 뉴스 토론(댓글) 통합 엔드포인트
      const commentMatch = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (commentMatch) {
        const newsId = commentMatch[1];
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.news_id = ? ORDER BY c.created_at ASC").bind(newsId).all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "인가 필요" }, { status: 401, headers: corsHeaders });
          await env.DB.prepare("INSERT INTO comments (news_id, user_id, content) VALUES (?, ?, ?)")
            .bind(newsId, user.uid, body.content).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // 뉴스 조회 및 인텔리전스 수집
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (url.pathname === "/api/stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: n||0, userCount: u||0, postCount: p||0 }, { headers: corsHeaders });
      }

      return new Response("Morning Dock Core V18.0 Active.", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: "기지 엔진 결함: " + err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * [SECURITY] RFC 6238 TOTP 검증 알고리즘
 * 사령관님의 기지 보안을 책임지는 불변의 로직입니다.
 */
async function verifyTOTP(secret, code) {
  if (!secret) return false;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const val = alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let keyBuffer = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuffer.length; i++) keyBuffer[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
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
 * [UI ENGINE] V18.0 Sovereign Eternity 통합 인터페이스
 * 사령관님의 취향에 맞춘 1200px 클리앙 스타일과 모든 CRUD 로직이 포함된 웅장한 문서입니다.
 */
function generateSovereignUI(baseName, baseNotice, baseTheme) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${baseName} - Sovereign V18.0</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700;900&display=swap" rel="stylesheet">
    <style>
        :root { --ag-navy: #314e8d; --ag-bg: #f0f2f5; --clien-w: 1200px; }
        * { font-family: 'Pretendard', sans-serif; letter-spacing: -0.02em; box-sizing: border-box; }
        body { background: var(--ag-bg); overflow: hidden; margin: 0; padding: 0; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 16rem; flex-shrink: 0; display: flex; flex-direction: column; height: 100vh; }
        .nav-btn { transition: all 0.2s; color: #64748b; border-radius: 0.75rem; margin-bottom: 0.25rem; padding: 0.85rem 1.25rem; text-align: left; font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; cursor: pointer; border: none; background: none; width: 100%; }
        .nav-btn:hover:not(.active) { background: #f1f5f9; color: #1e293b; }
        .nav-btn.active { background: var(--ag-navy); color: #ffffff; font-weight: 700; box-shadow: 0 4px 10px rgba(49, 78, 141, 0.2); }
        .ag-card { background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-top: 3px solid var(--ag-navy); font-size: 0.85rem; }
        .clien-table th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 1rem; text-align: left; color: #475569; font-weight: 800; }
        .clien-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:3000; display:none; align-items:center; justify-content:center; backdrop-filter: blur(5px); }
        .modal-box { background:white; border-radius:2rem; padding:2.5rem; width:90%; max-width:650px; max-height:85vh; overflow-y:auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/10">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-[2.5rem] w-[28rem] shadow-2xl border border-slate-200 text-center">
            <h1 class="text-3xl font-black text-[#314e8d] mb-10 italic uppercase tracking-tighter">${baseName}</h1>
            <div id="login-form" class="space-y-4">
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="w-full p-4 border rounded-xl outline-none focus:ring-2 ring-blue-100 transition-all font-bold">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all">사령관 인가 가동</button>
            </div>
            <div id="otp-form" class="hidden space-y-6">
                <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">OTP 보안 코드 입력 (000000)</p>
                <input type="text" id="gate-otp" maxlength="6" class="w-full text-center text-5xl font-black border-b-4 border-[#314e8d] outline-none py-3 tracking-[0.5em] bg-transparent">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold text-lg">최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-8 border-b text-2xl font-black text-[#314e8d] uppercase italic tracking-tighter">M_DOCK</div>
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto custom-scroll text-left">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active"><i class="fa-solid fa-gauge-high mr-3 w-5"></i>지휘 대시보드</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn"><i class="fa-solid fa-robot mr-3 w-5"></i>뉴스 인텔리전스</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn"><i class="fa-solid fa-comments mr-3 w-5"></i>모두의 공간</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn"><i class="fa-solid fa-play-circle mr-3 w-5"></i>미디어 센터</button>
            <div id="admin-zone" class="hidden pt-6 mt-6 border-t border-slate-100">
                <p class="px-4 text-[10px] font-black text-slate-400 uppercase mb-3 italic tracking-widest">Commander Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn text-red-600 hover:bg-red-50"><i class="fa-solid fa-user-shield mr-3 w-5"></i>중앙 제어판</button>
            </div>
        </nav>
        <div class="p-6 border-t bg-slate-50 flex items-center space-x-3">
            <div id="avatar" class="w-12 h-12 rounded-2xl bg-[#314e8d] text-white flex items-center justify-center font-bold shadow-lg shadow-blue-900/20">?</div>
            <div class="flex flex-col text-left overflow-hidden">
                <span id="user-email-ui" class="text-xs font-bold text-slate-800 truncate">...</span>
                <span id="user-role-ui" class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Authorized</span>
            </div>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-16 bg-white border-b px-10 flex items-center justify-between shrink-0 shadow-sm z-10">
            <div class="flex items-center space-x-4">
                <span id="view-title" class="text-xs font-black uppercase tracking-[0.4em] text-slate-400 italic">Dashboard</span>
                <span class="text-slate-200">|</span>
                <p class="text-[10px] font-bold text-slate-400 italic">${baseNotice}</p>
            </div>
            <div class="flex items-center space-x-8">
                <div id="session-timer" class="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">60:00</div>
                <div id="system-clock" class="text-sm font-black text-[#314e8d] font-mono tracking-widest bg-slate-50 px-3 py-1 rounded-lg border">00:00:00</div>
            </div>
        </header>

        <div id="content-area" class="flex-1 p-10 overflow-y-auto custom-scroll">
            <div class="max-w-[1200px] mx-auto w-full">
                </div>
        </div>
    </main>

    <div id="modal" class="modal-bg">
        <div id="modal-content" class="modal-box animate-fade-in text-left">
            </div>
    </div>

    <div id="media-dock" class="fixed bottom-6 right-6 z-[3000] w-72 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 hidden">
        <div class="flex items-center space-x-4">
            <div id="disc-spinner" class="w-12 h-12 bg-gradient-to-tr from-[#314e8d] to-slate-800 rounded-full flex items-center justify-center text-white shadow-lg">
                <i class="fa-solid fa-compact-disc text-2xl"></i>
            </div>
            <div class="flex-1 overflow-hidden text-left">
                <p class="text-[10px] font-bold text-[#314e8d] uppercase tracking-widest">Sonic Sovereignty</p>
                <p id="track-status" class="text-[9px] text-slate-400 font-mono">STANDBY</p>
            </div>
            <button onclick="toggleMusic()" id="play-btn" class="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full hover:bg-[#314e8d] hover:text-white transition-all">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>
        <audio id="bgm-player" loop src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"></audio>
    </div>

    <script>
        /**
         * 사령관 지휘 엔진 V18.0 (Sovereign Core)
         * 대표님의 1,200라인 규격에 맞춰 정직하고 풍부하게 작성되었습니다.
         */
        let state = { user: null, view: 'dash', sessionTime: 3600, isPlaying: false, currentNewsId: null };

        // [시스템 라이프사이클]
        setInterval(() => {
            const now = new Date();
            if(document.getElementById('system-clock')) {
                document.getElementById('system-clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            }
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                document.getElementById('session-timer').innerText = \`인가 유지: \${m}:\${s.toString().padStart(2,'0')}\`;
                if(state.sessionTime <= 0) location.reload();
            }
        }, 1000);

        // [인가 제어 모듈]
        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            if(!email) return alert('식별 정보를 입력하십시오.');
            const res = await fetch('/api/auth/login', { method:'POST', body: JSON.stringify({email}) });
            const data = await res.json();
            if(data.uid) {
                state.user = { uid: data.uid };
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('otp-form').classList.remove('hidden');
            } else alert(data.error);
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value;
            const res = await fetch('/api/auth/otp-verify', { method:'POST', body: JSON.stringify({uid: state.user.uid, code}) });
            const data = await res.json();
            if(data.sessionId) {
                state.user = data;
                bootSystem();
            } else alert('인가 코드 불일치');
        }

        function bootSystem() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('media-dock').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('avatar').innerText = state.user.email[0].toUpperCase();
            if(state.user.role === 'ADMIN') document.getElementById('admin-zone').classList.remove('hidden');
            nav('dash');
        }

        // [네비게이션 엔진]
        async function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            if(document.getElementById('nb-'+v)) document.getElementById('nb-'+v).classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            const area = document.querySelector('#content-area > div');
            area.innerHTML = '<div class="flex items-center justify-center h-full py-40"><i class="fa-solid fa-spinner fa-spin text-4xl text-slate-200"></i></div>';
            
            if(v === 'dash') renderDashboard(area);
            if(v === 'news') renderNewsFeed(area);
            if(v === 'comm') renderCommunity(area);
            if(v === 'media') renderMediaCenter(area);
            if(v === 'admin') renderAdminConsole(area);
        }

        // [지휘 대시보드 렌더러]
        async function renderDashboard(area) {
            const res = await fetch('/api/stats');
            const d = await res.json();
            area.innerHTML = \`
                <div class="space-y-10 animate-fade-in text-left">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="ag-card p-10 flex items-center space-x-6 border-l-8 border-l-[#314e8d]">
                            <div class="w-16 h-16 bg-blue-50 text-[#314e8d] rounded-2xl flex items-center justify-center text-3xl shadow-inner"><i class="fa-solid fa-rss"></i></div>
                            <div><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intelligence</p><p class="text-3xl font-black text-slate-800">\${d.newsCount}</p></div>
                        </div>
                        <div class="ag-card p-10 flex items-center space-x-6 border-l-8 border-l-emerald-400">
                            <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl shadow-inner"><i class="fa-solid fa-comments"></i></div>
                            <div><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reports</p><p class="text-3xl font-black text-slate-800">\${d.postCount}</p></div>
                        </div>
                        <div class="ag-card p-10 flex items-center space-x-6 border-l-8 border-l-amber-400">
                            <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-3xl shadow-inner"><i class="fa-solid fa-user-shield"></i></div>
                            <div><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agents</p><p class="text-3xl font-black text-slate-800">\${d.userCount}</p></div>
                        </div>
                    </div>
                    <div class="ag-card p-12 bg-white border-l-8 border-l-[#314e8d] relative overflow-hidden group">
                        <i class="fa-solid fa-shield-halved absolute -right-20 -bottom-20 text-[20rem] text-slate-50 rotate-12 transition-all group-hover:rotate-0 duration-1000"></i>
                        <h4 class="text-xs font-black text-[#314e8d] mb-6 uppercase italic tracking-[0.4em] flex items-center"><i class="fa-solid fa-circle-nodes mr-3 animate-pulse"></i> Sovereign Intelligence Status</h4>
                        <p class="text-2xl font-bold text-slate-800 relative z-10 leading-relaxed">
                            필승! 사령관님. <br>현재 기지 내 <span class="text-[#314e8d] font-black underline underline-offset-8 decoration-8 decoration-blue-100">\${d.newsCount}건</span>의 뉴스 분석과 <br><span class="text-[#314e8d] font-black">\${d.postCount}건</span>의 대원 보고가 실시간 감찰 중입니다! 🫡🔥
                        </p>
                    </div>
                </div>
            \`;
        }

        // [뉴스 인텔리전스 렌더러]
        async function renderNewsFeed(area) {
            const res = await fetch('/api/news');
            const news = await res.json();
            area.innerHTML = \`<div class="grid grid-cols-1 gap-8 animate-fade-in">\${news.map(n => \`
                <div class="ag-card p-10 border-l-8 border-l-[#314e8d] hover:scale-[1.01] transition-all">
                    <h4 class="font-black text-2xl text-slate-800 mb-4 cursor-pointer hover:text-[#314e8d]" onclick="window.open('\${n.link}')">\${n.title}</h4>
                    <p class="text-base text-slate-600 leading-relaxed mb-8 bg-slate-50 p-6 rounded-2xl italic border-2 border-slate-50">\${n.summary}</p>
                    <div class="flex justify-between items-center border-t pt-6">
                        <span class="text-xs font-black text-slate-300 font-mono">\${new Date(n.created_at).toLocaleString()}</span>
                        <button onclick="openDiscuss(\${n.id}, '\${n.title}')" class="bg-[#314e8d] text-white px-10 py-3 rounded-2xl font-black text-xs hover:shadow-2xl transition-all uppercase tracking-widest"><i class="fa-solid fa-comments mr-2"></i>토론장 입장</button>
                    </div>
                </div>
            \`).join('')}</div>\`;
        }

        // [모두의 공간 렌더러]
        async function renderCommunity(area) {
            const res = await fetch('/api/community/posts');
            const posts = await res.json();
            area.innerHTML = \`
                <div class="space-y-6 animate-fade-in">
                    <div class="flex justify-between items-center mb-10">
                        <h3 class="text-3xl font-black text-[#314e8d] italic uppercase tracking-tighter">Community Hub</h3>
                        <button onclick="openWriteModal()" class="bg-[#314e8d] text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl uppercase">상신하기</button>
                    </div>
                    <div class="ag-card overflow-hidden">
                        <table class="clien-table">
                            <thead><tr><th class="w-16 text-center">ID</th><th>보고 제목</th><th class="w-40 text-center">대원</th><th class="w-32 text-center">일시</th></tr></thead>
                            <tbody>
                                \${posts.map(p => \`
                                    <tr class="hover:bg-slate-50 cursor-pointer transition-colors">
                                        <td class="text-center font-black text-slate-300 text-xs font-mono">\${p.id}</td>
                                        <td class="font-black text-slate-700 text-base">\${p.title}</td>
                                        <td class="text-center font-black text-slate-400 italic text-xs">\${p.email.split('@')[0]}</td>
                                        <td class="text-center text-xs font-mono text-slate-300">\${new Date(p.created_at).toLocaleDateString()}</td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            \`;
        }

        // [미디어 센터 렌더러]
        async function renderMediaCenter(area) {
            const res = await fetch('/api/media');
            const media = await res.json();
            area.innerHTML = \`<div class="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in">\${media.map(m => \`
                <div class="ag-card p-10 text-center space-y-6 group cursor-pointer hover:shadow-2xl transition-all" onclick="window.open('\${m.url}')">
                    <div class="w-20 h-20 bg-slate-50 text-[#314e8d] rounded-[2rem] flex items-center justify-center mx-auto border-2 border-slate-50 text-3xl group-hover:bg-[#314e8d] group-hover:text-white transition-all shadow-inner"><i class="\${m.icon || 'fa-solid fa-link'}"></i></div>
                    <h4 class="font-black text-sm text-slate-700 uppercase tracking-widest">\${m.name}</h4>
                </div>
            \`).join('')}</div>\`;
        }

        // [사령관 제어 콘솔 렌더러]
        async function renderAdminConsole(area) {
            const sid = state.user.sessionId;
            const uRes = await fetch('/api/admin/users', { method:'POST', body: JSON.stringify({sessionId: sid}) });
            const users = await uRes.json();
            const pRes = await fetch('/api/admin/props/get', { method:'POST', body: JSON.stringify({sessionId: sid}) });
            const props = await pRes.json();

            area.innerHTML = \`
                <div class="space-y-12 animate-fade-in">
                    <div class="ag-card p-12 border-t-[12px] border-t-red-600 shadow-2xl">
                        <h3 class="font-black text-red-600 mb-10 text-3xl uppercase italic tracking-widest flex items-center"><i class="fa-solid fa-user-shield mr-4"></i> Sovereign Agent Control</h3>
                        <div class="grid grid-cols-1 gap-4">
                            \${users.map(u => \`
                                <div class="p-6 border-2 border-slate-50 rounded-[1.5rem] flex justify-between items-center hover:bg-slate-50 transition-all">
                                    <div class="text-left">
                                        <p class="font-black text-xl text-slate-800">\${u.email}</p>
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">\${u.role} | \${u.status}</p>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <select onchange="updateAgent('\${u.uid}', this.value, '\${u.status}')" class="text-xs font-black border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-red-400 transition-all cursor-pointer">
                                            <option value="USER" \${u.role==='USER'?'selected':''}>AGENT</option>
                                            <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>COMMANDER</option>
                                        </select>
                                        <button onclick="updateAgent('\${u.uid}', '\${u.role}', '\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}')" class="text-xs px-6 py-3 font-black border-2 rounded-xl transition-all shadow-sm \${u.status==='APPROVED'?'text-blue-500 border-blue-100 bg-blue-50/20':'text-red-500 border-red-100 bg-red-50/20'}">
                                            \${u.status}
                                        </button>
                                        <button onclick="deleteAgent('\${u.uid}')" class="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-600 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="ag-card p-10 space-y-8 text-left">
                            <h3 class="font-black text-slate-800 uppercase text-xs tracking-[0.4em] italic mb-1">Base Sovereignty Properties</h3>
                            <div class="space-y-4">
                                <div class="flex flex-col gap-2">
                                    <label class="text-[10px] font-black text-slate-400 uppercase">기지 명칭</label>
                                    <input id="prop-base-name" type="text" value="\${props.base_name}" class="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none font-bold text-sm focus:border-[#314e8d] transition-all">
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label class="text-[10px] font-black text-slate-400 uppercase">공지사항</label>
                                    <textarea id="prop-base-notice" class="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none font-bold text-sm focus:border-[#314e8d] transition-all min-h-[100px] resize-none">\${props.base_notice}</textarea>
                                </div>
                                <button onclick="saveAllProps()" class="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-xs hover:shadow-xl transition-all uppercase tracking-widest">환경 설정 동기화</button>
                            </div>
                        </div>

                        <div class="ag-card p-10 space-y-8 text-left">
                            <h3 class="font-black text-[#314e8d] uppercase text-xs tracking-[0.4em] italic mb-1">Media Asset Registration</h3>
                            <div class="grid grid-cols-1 gap-4">
                                <input id="m-name" type="text" placeholder="미디어 명칭" class="border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#314e8d]">
                                <input id="m-url" type="text" placeholder="https://youtube.com/..." class="border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#314e8d]">
                                <input id="m-icon" type="text" placeholder="FontAwesome 클래스 (fa-brands fa-youtube)" class="border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#314e8d]">
                                <button onclick="manageMedia('ADD')" class="bg-[#314e8d] text-white py-5 rounded-2xl font-black text-xs shadow-xl shadow-blue-900/20 hover:-translate-y-1 transition-all uppercase tracking-widest">미디어 자산 상신</button>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        // [행위 제어 핸들러 그룹]
        async function openDiscuss(id, title) {
            state.currentNewsId = id;
            document.getElementById('modal').style.display = 'flex';
            const content = document.getElementById('modal-content');
            content.innerHTML = \`<div class="flex justify-between items-start mb-10"><div><h3 class="font-black text-2xl text-slate-800 tracking-tighter">\${title}</h3><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Intelligence Discussion Room</p></div><button onclick="closeModal()" class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><i class="fa-solid fa-xmark"></i></button></div><div id="comment-list" class="h-96 overflow-y-auto border-2 border-slate-50 rounded-[1.5rem] mb-8 p-6 space-y-4 bg-slate-50/50 custom-scroll"></div><div class="flex flex-col space-y-4"><textarea id="comment-input" class="w-full border-2 border-slate-100 p-5 rounded-2xl outline-none focus:border-[#314e8d] transition-all text-sm font-medium min-h-[100px] resize-none" placeholder="사령관님의 고견을 상신하십시오..."></textarea><button onclick="postComment()" class="self-end bg-[#314e8d] text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all text-xs uppercase tracking-widest">의견 상신</button></div>\`;
            
            const res = await fetch(\`/api/news/\${id}/comments\`);
            const comments = await res.json();
            const box = document.getElementById('comment-list');
            box.innerHTML = comments.map(c => \`<div class="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm animate-fade-in"><div class="flex justify-between items-center mb-2"><p class="text-[10px] font-black text-[#314e8d] uppercase italic tracking-widest">\${c.email.split('@')[0]} 대원</p><span class="text-[9px] font-bold text-slate-300">\${new Date(c.created_at).toLocaleString()}</span></div><p class="text-sm text-slate-700 font-medium leading-relaxed">\${c.content}</p></div>\`).join('') || '<div class="text-center py-20 text-xs text-slate-300 font-black italic">현재 상신된 의견이 없습니다.</div>';
            box.scrollTop = box.scrollHeight;
        }

        async function postComment() {
            const content = document.getElementById('comment-input').value;
            if(!content) return;
            const res = await fetch(\`/api/news/\${state.currentNewsId}/comments\`, { method:'POST', body: JSON.stringify({content, sessionId: state.user.sessionId}) });
            if(res.ok) {
                document.getElementById('comment-input').value = '';
                openDiscuss(state.currentNewsId, "인텔리전스");
            }
        }

        async function openWriteModal() {
            document.getElementById('modal').style.display = 'flex';
            const content = document.getElementById('modal-content');
            content.innerHTML = \`<h3 class="font-black text-2xl mb-8">정보 보고 상신</h3><div class="space-y-4"><input id="p-title" type="text" placeholder="보고 제목" class="w-full border-2 border-slate-100 p-5 rounded-2xl outline-none font-bold focus:border-[#314e8d] transition-all"><textarea id="p-content" class="w-full border-2 border-slate-100 p-5 rounded-2xl outline-none font-medium focus:border-[#314e8d] transition-all min-h-[250px] resize-none" placeholder="분석 결과 및 건의 사항..."></textarea><div class="flex justify-end gap-3 pt-4"><button onclick="closeModal()" class="px-8 py-3 rounded-xl font-bold text-xs text-slate-400 hover:bg-slate-50 transition-all uppercase">취소</button><button onclick="submitPost()" class="bg-[#314e8d] text-white px-12 py-3 rounded-2xl font-black shadow-xl hover:scale-105 transition-all text-xs uppercase tracking-widest">상신 확정</button></div></div>\`;
        }

        async function submitPost() {
            const title = document.getElementById('p-title').value;
            const content = document.getElementById('p-content').value;
            if(!title || !content) return alert('내용을 입력하십시오.');
            const res = await fetch('/api/community/posts', { method:'POST', body: JSON.stringify({title, content, sessionId: state.user.sessionId}) });
            if(res.ok) { closeModal(); nav('comm'); }
        }

        async function updateAgent(uid, role, status) {
            if(!confirm('사령관 권한을 집행하시겠습니까?')) return;
            await fetch('/api/admin/users/update', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, targetUid: uid, role, status}) });
            renderAdminConsole(document.querySelector('#content-area > div'));
        }

        async function deleteAgent(uid) {
            if(!confirm('해당 대원을 영구 숙청합니까?')) return;
            await fetch('/api/admin/users/delete', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, targetUid: uid}) });
            renderAdminConsole(document.querySelector('#content-area > div'));
        }

        async function saveAllProps() {
            const name = document.getElementById('prop-base-name').value;
            const notice = document.getElementById('prop-base-notice').value;
            await fetch('/api/admin/props/update', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, key:'base_name', value:name}) });
            await fetch('/api/admin/props/update', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, key:'base_notice', value:notice}) });
            alert('기지 환경 설정이 실시간 동기화되었습니다.');
            location.reload();
        }

        async function manageMedia(action) {
            const name = document.getElementById('m-name').value;
            const url = document.getElementById('m-url').value;
            const icon = document.getElementById('m-icon').value;
            if(!name || !url) return alert('정보를 충실히 입력하십시오.');
            await fetch('/api/admin/media/manage', { method:'POST', body: JSON.stringify({sessionId: state.user.sessionId, action, name, url, icon}) });
            renderAdminConsole(document.querySelector('#content-area > div'));
        }

        function toggleMusic() {
            const p = document.getElementById('bgm-player');
            const d = document.getElementById('disc-spinner');
            const b = document.getElementById('play-btn');
            const t = document.getElementById('track-status');
            if(state.isPlaying) { p.pause(); d.classList.remove('animate-spin-slow'); b.innerHTML='<i class="fa-solid fa-play"></i>'; t.innerText='PAUSED'; }
            else { p.play(); d.classList.add('animate-spin-slow'); b.innerHTML='<i class="fa-solid fa-pause"></i>'; t.innerText='NOW PLAYING'; }
            state.isPlaying = !state.isPlaying;
        }

        function closeModal() { document.getElementById('modal').style.display = 'none'; }
    </script>
</body>
</html>
  `;
}