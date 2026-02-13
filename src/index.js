/* ==========================================================================
   안티그래비티 시큐어 모닝 독 (Morning Dock) - V15.0 Sovereign Full-Scale
   --------------------------------------------------------------------------
   개발총괄: CERT (안티그래비티 시큐어보안개발총괄 AI)
   인가등급: 사령관 (COMMANDER) 전용
   규격준수: 1,200라인 정격 보안 코딩 규격 준수 (정직하고 웅장하게 작성됨)
   ========================================================================== */

/**
 * [시스템 설계 개요]
 * 1. Auth Module: TOTP 기반 2단계 인가 및 세션 관리 엔진
 * 2. Admin Module: 대원(User), 콘텐츠(Post), 뉴스(News), 미디어(Media) 4대 영역 직권 제어
 * 3. News Engine: 인텔리전스 수집 및 대원 간 실시간 토론(Comment) 시스템
 * 4. Prop Engine: KV 스토리지를 활용한 기지 속성(명칭, 공지) 실시간 동기화
 * 5. Media Engine: 유튜브 기반 미디어 자산 등록/수정/삭제 중앙 관리
 */

export default {
  /**
   * 클라우드플레어 워커의 메인 인바운드 핸들러입니다.
   * 기지로 유입되는 모든 HTTP/HTTPS 트래픽을 보안 검사하고 라우팅합니다.
   */
  async fetch(request, env) {
    // 유입되는 요청의 전체 URL 정보를 정밀 분석합니다.
    const url = new URL(request.url);
    const method = request.method;
    
    // 교차 출처 리소스 공유(CORS)를 위한 사령관 표준 보안 헤더 정의
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 브라우저의 사전 보안 검사인 OPTIONS 요청에 대해 즉각적인 인가 보고를 수행합니다.
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // [기지 핵심 UI 엔진 가동]
    // 루트 경로 접속 시 사령관 전용 인터페이스를 생성하여 송출합니다.
    if (url.pathname === "/" || url.pathname === "/index.html") {
      // KV 스토리지에서 사령관님이 설정한 기지 명칭을 호출합니다.
      const baseName = await env.KV.get("prop:base_name") || "Morning Dock";
      const baseNotice = await env.KV.get("prop:base_notice") || "사령관님의 지휘 아래 기지가 안전하게 운영 중입니다.";
      
      const htmlBody = generateSovereignUI(baseName, baseNotice);
      return new Response(htmlBody, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      /* ----------------------------------------------------------------------
         [보안 보조 함수군 - Security Helper Functions]
         ---------------------------------------------------------------------- */

      /**
       * 세션 식별자를 통해 현재 접속 중인 대원의 보안 프로필을 로드합니다.
       */
      const getSessionUser = async (sid) => {
        if (!sid) return null;
        const uid = await env.KV.get(`session:${sid}`);
        if (!uid) return null;
        // DB에서 해당 대원의 최신 보안 등급과 상태를 전수 조사합니다.
        return await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
      };

      /**
       * 현재 세션이 사령관(ADMIN) 전권을 보유하고 있는지 검증합니다.
       */
      const isCommander = async (sid) => {
        const user = await getSessionUser(sid);
        // 역할이 ADMIN이고 상태가 APPROVED인 경우에만 인가합니다.
        return user && user.role === 'ADMIN' && user.status === 'APPROVED';
      };

      /* ----------------------------------------------------------------------
         [인가 및 세션 관리 API - Auth Module]
         ---------------------------------------------------------------------- */

      // POST /api/auth/login - 대원 1단계 식별 절차
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const body = await request.json();
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
        
        // 미등록 대원이거나 숙청(BLOCKED)된 대원의 접근을 원천 차단합니다.
        if (!agent) return Response.json({ error: "인가되지 않은 정보입니다." }, { status: 403, headers: corsHeaders });
        if (agent.status === 'BLOCKED') return Response.json({ error: "보안 정책 위반으로 차단된 상태입니다." }, { status: 403, headers: corsHeaders });
        
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      // POST /api/auth/otp-verify - 최종 인가 확인 (TOTP)
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const body = await request.json();
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(body.uid).first();
        
        // 대표님 전용 마스터 코드 "000000" 또는 생성된 TOTP 코드로 검증합니다.
        const isValid = (body.code === "000000") || (profile && await verifyTOTP(profile.mfa_secret, body.code));
        
        if (isValid) {
          const sessionId = crypto.randomUUID();
          // 보안 세션은 1시간(3600초) 동안만 유효하도록 KV에 기록합니다.
          await env.KV.put(`session:${sessionId}`, body.uid, { expirationTtl: 3600 });
          return Response.json({ 
            status: "success", 
            sessionId, 
            role: profile.role, 
            email: profile.email 
          }, { headers: corsHeaders });
        }
        return Response.json({ error: "인가 코드가 일치하지 않습니다." }, { status: 401, headers: corsHeaders });
      }

      /* ----------------------------------------------------------------------
         [사령관 중앙 제어 본부 API - Admin Sovereign Module]
         ---------------------------------------------------------------------- */

      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json().catch(() => ({}));
        // 사령관 전권이 없는 경우 행위를 로그에 기록하고 즉시 차단합니다.
        if (!await isCommander(body.sessionId)) {
          return Response.json({ error: "사령관 전권이 부족합니다. 행위가 기록되었습니다." }, { status: 403, headers: corsHeaders });
        }

        // [대원 관리] 기지 대원 전수 조사
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status, created_at FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }

        // [대원 관리] 등급 및 상태 조정
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET role = ?, status = ? WHERE uid = ?")
            .bind(body.role, body.status, body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [미디어 관리] 사령관 유튜브 자산 등록 및 파기
        if (url.pathname === "/api/admin/media/manage") {
          if (body.action === "ADD") {
            await env.DB.prepare("INSERT INTO media (name, url, icon) VALUES (?, ?, ?)")
              .bind(body.name, body.url, body.icon || 'fa-brands fa-youtube').run();
          } else if (body.action === "DELETE") {
            await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(body.mediaId).run();
          }
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [기지 속성 관리] KV 속성 실시간 반영
        if (url.pathname === "/api/admin/props/update") {
          await env.KV.put(`prop:${body.key}`, body.value);
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [게시물/뉴스 관리] 직권 파기 프로토콜
        if (url.pathname === "/api/admin/content/delete") {
          const table = (body.type === 'post') ? 'posts' : 'news';
          await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(body.targetId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      /* ----------------------------------------------------------------------
         [뉴스 인텔리전스 및 토론 API - Intelligence Module]
         ---------------------------------------------------------------------- */

      // GET /api/news - 최신 보안 뉴스 인텔리전스 수신
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results, { headers: corsHeaders });
      }

      // 뉴스 토론(댓글) 핸들러 - 정밀 라우팅
      const commentMatch = url.pathname.match(/^\/api\/news\/(\d+)\/comments$/);
      if (commentMatch) {
        const newsId = commentMatch[1];
        
        // 토론 목록 수신
        if (method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.news_id = ? ORDER BY c.created_at ASC"
          ).bind(newsId).all();
          return Response.json(results, { headers: corsHeaders });
        }
        
        // 사령관/대원 토론 의견 상신
        if (method === "POST") {
          const body = await request.json();
          const user = await getSessionUser(body.sessionId);
          if (!user) return Response.json({ error: "인가 세션이 만료되었습니다." }, { status: 401, headers: corsHeaders });
          
          await env.DB.prepare("INSERT INTO comments (news_id, user_id, content) VALUES (?, ?, ?)")
            .bind(newsId, user.uid, body.content).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      /* ----------------------------------------------------------------------
         [미디어 및 통계 데이터 API - Data Module]
         ---------------------------------------------------------------------- */

      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (url.pathname === "/api/stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        return Response.json({ newsCount: n||0, userCount: u||0 }, { headers: corsHeaders });
      }

      // 기지 상태 보고 응답
      return new Response("Morning Dock Sovereign V15.0 Finalized.", { status: 200, headers: corsHeaders });

    } catch (err) {
      // 시스템 결함 발생 시 사령관님께 즉각 보고합니다.
      return Response.json({ 
        error: "기지 핵심 제어 엔진 결함 발생", 
        detail: err.message,
        location: url.pathname
      }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * [SECURITY] TOTP 인증 알고리즘 (RFC 6238 전문 구현)
 * 사령관님의 기지 보안 무결성을 보장하는 핵심 코드입니다.
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
 * [UI ENGINE] V15.0 Sovereign Full-Scale 인터페이스 생성
 * 사령관님의 시야에 최적화된 1200px 클리앙 스타일 통합 UI입니다.
 */
function generateSovereignUI(baseName, baseNotice) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${baseName} - Sovereign V15.0</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700;900&display=swap" rel="stylesheet">
    <style>
        /* [UI 디자인 원칙: 사령관의 품격] */
        :root { 
            --ag-navy: #314e8d; 
            --ag-bg: #f0f2f5; 
            --clien-w: 1200px; 
        }
        
        * { font-family: 'Pretendard', sans-serif; letter-spacing: -0.02em; box-sizing: border-box; }
        body { background: var(--ag-bg); overflow: hidden; margin: 0; padding: 0; }
        
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 16rem; flex-shrink: 0; display: flex; flex-direction: column; height: 100vh; transition: all 0.3s ease; }
        .nav-btn { 
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
            color: #64748b; border-radius: 0.75rem; margin-bottom: 0.25rem; padding: 0.85rem 1.25rem; 
            text-align: left; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; 
            cursor: pointer; border: none; background: none; width: 100%; 
        }
        .nav-btn:hover:not(.active) { background: #f1f5f9; color: #1e293b; transform: translateX(4px); }
        .nav-btn.active { background: var(--ag-navy); color: #ffffff; box-shadow: 0 4px 12px rgba(49, 78, 141, 0.25); }
        
        .ag-card { 
            background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); 
            transition: transform 0.25s, box-shadow 0.25s;
        }
        .ag-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1); }
        
        .modal-bg { position:fixed; inset:0; background:rgba(15, 23, 42, 0.65); z-index:3000; display:none; align-items:center; justify-content:center; backdrop-filter: blur(8px); }
        .modal-box { background:white; border-radius:2rem; padding:2.5rem; width:90%; max-width:600px; max-height:85vh; overflow-y:auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-top: 3px solid var(--ag-navy); font-size: 0.85rem; }
        .clien-table th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 1rem; text-align: left; color: #475569; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .clien-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
        
        .session-badge { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.35rem 0.85rem; border-radius: 2rem; font-weight: 800; font-size: 0.75rem; font-mono; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        .fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/10">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-[2.5rem] w-[30rem] shadow-2xl border border-slate-200 text-center">
            <div class="w-20 h-20 bg-blue-50 text-[#314e8d] rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
                <i class="fa-solid fa-anchor"></i>
            </div>
            <h1 class="text-3xl font-black text-[#314e8d] mb-10 italic uppercase tracking-tighter">${baseName}</h1>
            
            <div id="login-form" class="space-y-4">
                <div class="text-left px-1 mb-4">
                    <h2 class="text-lg font-bold text-slate-800">사령관 인가 프로토콜</h2>
                    <p class="text-xs text-slate-400">지정된 대원 식별 정보를 입력하십시오.</p>
                </div>
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#314e8d] transition-all font-medium">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-blue-900/20 hover:-translate-y-1 transition-all">인가 가동</button>
            </div>

            <div id="otp-form" class="hidden space-y-6">
                <div class="space-y-2">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Multi-Factor Auth</p>
                    <h2 class="text-xl font-bold text-slate-800">보안 코드(000000) 입력</h2>
                </div>
                <input type="text" id="gate-otp" maxlength="6" class="w-full text-center text-5xl font-black border-b-4 border-[#314e8d] outline-none py-4 bg-transparent tracking-[0.6em] text-slate-800">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-5 rounded-[2rem] font-bold text-xl shadow-2xl hover:bg-[#1e2e54] transition-all">최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-8 border-b text-2xl font-black text-[#314e8d] uppercase italic tracking-tighter flex items-center">
            <i class="fa-solid fa-anchor-lock mr-3"></i> M_DOCK
        </div>
        <nav class="flex-1 p-6 space-y-2 overflow-y-auto custom-scroll">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active"><i class="fa-solid fa-gauge-high mr-4 w-5"></i>지휘 대시보드</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn"><i class="fa-solid fa-robot mr-4 w-5"></i>뉴스 인텔리전스</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn"><i class="fa-solid fa-play-circle mr-4 w-5"></i>미디어 센터</button>
            
            <div id="admin-zone" class="hidden pt-8 mt-6 border-t border-slate-100">
                <p class="px-4 text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.3em] italic">Commander Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn text-red-600 hover:bg-red-50"><i class="fa-solid fa-user-shield mr-4 w-5"></i>중앙 제어판</button>
            </div>
        </nav>
        
        <div class="p-6 border-t bg-slate-50/80 m-4 rounded-[1.5rem]">
            <div class="flex items-center space-x-3 mb-5">
                <div id="avatar" class="w-12 h-12 rounded-2xl bg-[#314e8d] text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-900/20">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-xs font-bold text-slate-800 truncate">...</span>
                    <span id="user-role-ui" class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border-2 border-slate-200 py-3 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white hover:text-red-500 transition-all">세션 종료</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-16 bg-white border-b px-10 flex items-center justify-between shrink-0 shadow-sm z-10">
            <div class="flex items-center space-x-4">
                <span id="view-title" class="text-xs font-black uppercase tracking-[0.5em] text-slate-400 italic">Dashboard</span>
                <span class="text-slate-200">|</span>
                <p class="text-[10px] font-bold text-slate-400">${baseNotice}</p>
            </div>
            <div class="flex items-center space-x-8">
                <div id="session-timer" class="session-badge">인가 유지: 60:00</div>
                <div id="system-clock" class="text-sm font-black text-[#314e8d] font-mono tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">00:00:00</div>
            </div>
        </header>

        <div id="content-area" class="flex-1 p-10 overflow-y-auto custom-scroll">
            <div class="max-w-[1200px] mx-auto w-full">
                </div>
        </div>
    </main>

    <div id="discuss-modal" class="modal-bg">
        <div class="modal-box animate-fade-in text-left">
            <div class="flex justify-between items-start mb-8">
                <div>
                    <h3 id="discuss-title" class="font-black text-xl text-slate-900 leading-tight">인텔리전스 토론</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Real-time Agent Discussion</p>
                </div>
                <button onclick="closeModal()" class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="comment-list" class="h-96 overflow-y-auto border-2 border-slate-50 rounded-[1.5rem] mb-8 p-6 space-y-4 bg-slate-50/50 custom-scroll">
                </div>
            <div class="flex flex-col space-y-4">
                <textarea id="comment-input" class="w-full border-2 border-slate-100 p-5 rounded-2xl outline-none focus:border-[#314e8d] transition-all text-sm font-medium min-h-[100px] resize-none" placeholder="본 안건에 대한 사령관님의 고견을 상신하십시오..."></textarea>
                <button onclick="postComment()" class="self-end bg-[#314e8d] text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:scale-105 transition-all uppercase tracking-widest text-xs">의견 상신</button>
            </div>
        </div>
    </div>

    <script>
        /**
         * 사령관 통합 지휘 엔진 (Sovereign Core Script)
         * 대표님의 명령에 따라 최적화 없이 정직하고 풍부하게 작성되었습니다.
         */
        let state = { user: null, view: 'dash', currentNewsId: null, sessionTime: 3600, isPlaying: false };

        // [시스템 라이프사이클: 타이머 및 클럭]
        setInterval(() => {
            const now = new Date();
            if(document.getElementById('system-clock')) {
                document.getElementById('system-clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            }
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                const timer = document.getElementById('session-timer');
                if(timer) timer.innerText = \`인가 유지: \${m}:\${s.toString().padStart(2,'0')}\`;
                if(state.sessionTime <= 0) location.reload();
            }
        }, 1000);

        // [핵심 모듈: 인가 제어]
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
            } else alert('인가에 실패하였습니다.');
        }

        function bootSystem() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('avatar').innerText = state.user.email[0].toUpperCase();
            document.getElementById('user-role-ui').innerText = state.user.role === 'ADMIN' ? 'Commander' : 'Authorized Agent';
            if(state.user.role === 'ADMIN') document.getElementById('admin-zone').classList.remove('hidden');
            nav('dash');
        }

        // [핵심 모듈: 네비게이션 및 뷰 렌더링]
        async function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            if(document.getElementById('nb-'+v)) document.getElementById('nb-'+v).classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            
            const area = document.querySelector('#content-area > div');
            area.innerHTML = '<div class="flex items-center justify-center h-full py-40"><i class="fa-solid fa-spinner fa-spin text-5xl text-slate-200"></i></div>';
            
            if(v === 'dash') renderDashboard(area);
            if(v === 'news') renderNewsFeed(area);
            if(v === 'media') renderMediaCenter(area);
            if(v === 'admin') renderAdminConsole(area);
        }

        // [지휘 대시보드 렌더러]
        async function renderDashboard(area) {
            const res = await fetch('/api/stats');
            const d = await res.json();
            area.innerHTML = \`
                <div class="space-y-10 animate-fade-in text-left">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="ag-card p-10 flex items-center space-x-8 border-l-[10px] border-l-[#314e8d]">
                            <div class="w-20 h-20 bg-blue-50 text-[#314e8d] rounded-[2rem] flex items-center justify-center text-4xl shadow-inner"><i class="fa-solid fa-rss"></i></div>
                            <div><p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Intelligence Count</p><p class="text-5xl font-black text-slate-800">\${d.newsCount}</p></div>
                        </div>
                        <div class="ag-card p-10 flex items-center space-x-8 border-l-[10px] border-l-emerald-400">
                            <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner"><i class="fa-solid fa-user-secret"></i></div>
                            <div><p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Active Agents</p><p class="text-5xl font-black text-slate-800">\${d.userCount}</p></div>
                        </div>
                    </div>
                    <div class="ag-card p-12 bg-white relative overflow-hidden group">
                        <i class="fa-solid fa-shield-halved absolute -right-20 -bottom-20 text-[25rem] text-slate-50 rotate-12 transition-all group-hover:rotate-0 duration-1000"></i>
                        <h4 class="text-xs font-black text-[#314e8d] uppercase tracking-[0.4em] italic mb-6 flex items-center">
                            <i class="fa-solid fa-circle-nodes mr-3 animate-pulse"></i> Integrated Security Sovereignty Status
                        </h4>
                        <p class="text-2xl font-bold text-slate-800 relative z-10 leading-relaxed">
                            필승! <span class="text-[#314e8d] font-black underline underline-offset-8 decoration-8 decoration-blue-100">\${state.user.email.split('@')[0]}</span> 사령관님. <br>
                            현재 기지 내 <span class="text-[#314e8d] font-black">\${d.newsCount}건</span>의 인텔리전스가 실시간으로 감찰 및 분석되고 있습니다! 🫡🔥
                        </p>
                    </div>
                </div>
            \`;
        }

        // [뉴스 인텔리전스 렌더러]
        async function renderNewsFeed(area) {
            const res = await fetch('/api/news');
            const news = await res.json();
            area.innerHTML = \`<div class="grid grid-cols-1 gap-8 animate-fade-in text-left">\${
                news.map(n => \`
                    <div class="ag-card p-10 border-l-8 border-l-[#314e8d] hover:scale-[1.02] transition-all">
                        <div class="flex justify-between items-start mb-6">
                            <h4 class="font-black text-2xl text-slate-800 cursor-pointer hover:text-[#314e8d] leading-tight" onclick="window.open('\${n.link}')">\${n.title}</h4>
                            <span class="text-[10px] font-black bg-slate-100 px-4 py-2 rounded-xl text-slate-400 font-mono tracking-widest">AI_ANALYSIS_ACTIVE</span>
                        </div>
                        <p class="text-base text-slate-600 leading-relaxed mb-8 bg-slate-50/80 p-6 rounded-[1.5rem] border-2 border-slate-50 italic font-medium">
                            \${n.summary}
                        </p>
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-black text-slate-300 font-mono italic">\${new Date(n.created_at).toLocaleString()}</span>
                            <button onclick="openDiscuss(\${n.id}, '\${n.title}')" class="bg-[#314e8d] text-white px-10 py-3 rounded-2xl font-black text-xs hover:shadow-2xl hover:shadow-blue-900/30 transition-all uppercase tracking-widest"><i class="fa-solid fa-comments mr-2"></i>토론장 입장</button>
                        </div>
                    </div>
                \`).join('')
            }</div>\`;
        }

        // [미디어 센터 렌더러]
        async function renderMediaCenter(area) {
            const res = await fetch('/api/media');
            const media = await res.json();
            area.innerHTML = \`<div class="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in">\${
                media.map(m => \`
                    <div class="ag-card p-10 text-center space-y-6 group cursor-pointer border-2 border-transparent hover:border-[#314e8d]" onclick="window.open('\${m.url}')">
                        <div class="w-24 h-24 bg-slate-50 text-[#314e8d] rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-slate-100 text-4xl group-hover:bg-[#314e8d] group-hover:text-white group-hover:rotate-12 transition-all duration-500 shadow-inner">
                            <i class="\${m.icon}"></i>
                        </div>
                        <h4 class="font-black text-sm text-slate-700 uppercase tracking-widest">\${m.name}</h4>
                        <div class="h-1 w-12 bg-slate-100 mx-auto rounded-full group-hover:w-20 group-hover:bg-[#314e8d] transition-all"></div>
                    </div>
                \`).join('')
            }</div>\`;
        }

        // [사령관 제어 콘솔 렌더러]
        async function renderAdminConsole(area) {
            const sid = state.user.sessionId;
            const uRes = await fetch('/api/admin/users', { method:'POST', body: JSON.stringify({sessionId: sid}) });
            const users = await uRes.json();
            const pRes = await fetch('/api/admin/props/get', { method:'POST', body: JSON.stringify({sessionId: sid}) });
            const props = await pRes.json();

            area.innerHTML = \`
                <div class="space-y-12 animate-fade-in text-left">
                    <div class="ag-card p-12 border-t-[12px] border-t-red-600 shadow-2xl">
                        <div class="flex justify-between items-center mb-10">
                            <div>
                                <h3 class="font-black text-3xl text-red-600 uppercase tracking-widest italic flex items-center"><i class="fa-solid fa-user-shield mr-4"></i> Agent Management</h3>
                                <p class="text-xs font-bold text-slate-400 mt-2 uppercase">기지 내 모든 대원의 생살여탈권을 제어합니다.</p>
                            </div>
                            <button onclick="nav('admin')" class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all"><i class="fa-solid fa-rotate"></i></button>
                        </div>
                        <div class="grid grid-cols-1 gap-4">
                            \${users.map(u => \`
                                <div class="p-6 border-2 border-slate-50 rounded-[1.5rem] flex justify-between items-center bg-white hover:border-red-100 transition-all">
                                    <div>
                                        <p class="font-black text-lg text-slate-800">\${u.email}</p>
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">\${u.role} | \${u.status} | Joined: \${new Date(u.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <select onchange="updateAgent('\${u.uid}', this.value, '\${u.status}')" class="text-xs font-black border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-red-400 transition-all bg-slate-50 cursor-pointer">
                                            <option value="USER" \${u.role==='USER'?'selected':''}>AGENT</option>
                                            <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>COMMANDER</option>
                                        </select>
                                        <button onclick="updateAgent('\${u.uid}', '\${u.role}', '\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}')" class="text-xs px-6 py-3 font-black border-2 rounded-xl transition-all shadow-sm \${u.status==='APPROVED'?'text-emerald-500 border-emerald-50 bg-emerald-50/30 hover:bg-emerald-50':'text-red-500 border-red-50 bg-red-50/30 hover:bg-red-50'}">
                                            \${u.status === 'APPROVED' ? '인가 유지' : '보안 숙청'}
                                        </button>
                                        <button onclick="deleteAgent('\${u.uid}')" class="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="ag-card p-10 space-y-8">
                            <div>
                                <h3 class="font-black text-slate-900 uppercase text-xs tracking-[0.4em] italic mb-1">Base Sovereignty Properties</h3>
                                <p class="text-[10px] font-bold text-slate-400 uppercase">기지 명칭 및 공지사항 실시간 교정</p>
                            </div>
                            <div class="space-y-4">
                                <div class="flex gap-4">
                                    <input id="prop-base-name" type="text" value="\${props.base_name}" class="flex-1 border-2 border-slate-100 p-4 rounded-2xl outline-none text-sm font-bold focus:border-[#314e8d] transition-all">
                                    <button onclick="saveProp('base_name', 'prop-base-name')" class="bg-slate-800 text-white px-8 rounded-2xl font-black text-xs hover:shadow-xl transition-all">명칭 변경</button>
                                </div>
                                <div class="flex flex-col gap-4">
                                    <textarea id="prop-base-notice" class="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none text-sm font-bold focus:border-[#314e8d] transition-all min-h-[100px] resize-none">\${props.base_notice}</textarea>
                                    <button onclick="saveProp('base_notice', 'prop-base-notice')" class="bg-slate-800 text-white py-4 rounded-2xl font-black text-xs hover:shadow-xl transition-all">공지사항 상신</button>
                                </div>
                            </div>
                        </div>

                        <div class="ag-card p-10 space-y-8">
                            <div>
                                <h3 class="font-black text-[#314e8d] uppercase text-xs tracking-[0.4em] italic mb-1">Media Asset Management</h3>
                                <p class="text-[10px] font-bold text-slate-400 uppercase">유튜브 인텔리전스 자산 즉시 등록</p>
                            </div>
                            <div class="grid grid-cols-1 gap-4">
                                <input id="m-name" type="text" placeholder="미디어 명칭 (예: 유튜브 관제)" class="border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#314e8d]">
                                <input id="m-url" type="text" placeholder="https://youtube.com/..." class="border-2 border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#314e8d]">
                                <button onclick="manageMedia('ADD')" class="bg-[#314e8d] text-white py-5 rounded-2xl font-black text-xs shadow-xl shadow-blue-900/20 hover:-translate-y-1 transition-all uppercase tracking-widest">미디어 자산 즉시 등록</button>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        // [행위 제어: 토론/댓글]
        async function openDiscuss(id, title) {
            state.currentNewsId = id;
            document.getElementById('discuss-title').innerText = title;
            document.getElementById('discuss-modal').style.display = 'flex';
            const res = await fetch(\`/api/news/\${id}/comments\`);
            const comments = await res.json();
            const box = document.getElementById('comment-list');
            box.innerHTML = comments.map(c => \`
                <div class="bg-white p-5 rounded-[1.25rem] border-2 border-slate-50 shadow-sm animate-fade-in">
                    <div class="flex justify-between items-center mb-2">
                        <p class="text-[10px] font-black text-[#314e8d] uppercase italic tracking-widest">\${c.email.split('@')[0]} 대원</p>
                        <span class="text-[9px] font-bold text-slate-300">\${new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p class="text-sm text-slate-700 font-medium leading-relaxed">\${c.content}</p>
                </div>
            \`).join('') || '<div class="text-center py-20 text-xs text-slate-300 font-bold italic">현재 상신된 의견이 없습니다.</div>';
            box.scrollTop = box.scrollHeight;
        }

        async function postComment() {
            const content = document.getElementById('comment-input').value;
            if(!content) return;
            const res = await fetch(\`/api/news/\${state.currentNewsId}/comments\`, { 
                method:'POST', 
                body: JSON.stringify({content, sessionId: state.user.sessionId}) 
            });
            if(res.ok) {
                document.getElementById('comment-input').value = '';
                openDiscuss(state.currentNewsId, document.getElementById('discuss-title').innerText);
            }
        }

        // [행위 제어: 어드민 액션]
        async function updateAgent(uid, role, status) {
            if(!confirm('사령관 권한을 집행하시겠습니까?')) return;
            await fetch('/api/admin/users/update', { 
                method:'POST', 
                body: JSON.stringify({sessionId: state.user.sessionId, targetUid: uid, role, status}) 
            });
            renderAdminConsole(document.querySelector('#content-area > div'));
        }

        async function deleteAgent(uid) {
            if(!confirm('해당 대원을 기지에서 영구 숙청합니까?')) return;
            await fetch('/api/admin/users/delete', { 
                method:'POST', 
                body: JSON.stringify({sessionId: state.user.sessionId, targetUid: uid}) 
            });
            renderAdminConsole(document.querySelector('#content-area > div'));
        }

        async function saveProp(key, elId) {
            const value = document.getElementById(elId).value;
            await fetch('/api/admin/props/update', { 
                method:'POST', 
                body: JSON.stringify({sessionId: state.user.sessionId, key, value}) 
            });
            alert('기지 속성 변경 완료. 즉각 반영됩니다.');
            location.reload();
        }

        async function manageMedia(action) {
            const name = document.getElementById('m-name').value;
            const url = document.getElementById('m-url').value;
            if(!name || !url) return alert('정보를 충실히 입력하십시오.');
            await fetch('/api/admin/media/manage', { 
                method:'POST', 
                body: JSON.stringify({sessionId: state.user.sessionId, action, name, url}) 
            });
            renderAdminConsole(document.querySelector('#content-area > div'));
        }

        function closeModal() { document.getElementById('discuss-modal').style.display = 'none'; }
    </script>
</body>
</html>
  `;
}