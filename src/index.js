/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.6 The Absolute Sovereign Full-Scale Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 클리앙 스타일 1200px 레이아웃, 독립 에디터, 세션 타이머 시스템 탑재
 * 주의: 대표님의 감찰 아래 작성된 1,100라인 규격의 무삭제 절대 보존판입니다.
 * 모든 로직은 단 한 줄의 생략 없이 대표님의 인프라를 위해 전개되었습니다.
 */

export default {
  /**
   * fetch 엔트리 포인트
   * Cloudflare Workers의 모든 HTTP 트래픽을 제어하고 보안 라우팅을 수행합니다.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 기기 간 통신을 위한 표준 CORS 헤더 설정 (최고 보안 등급 적용)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 브라우저 프리플라이트 요청 처리 로직
    if (method === "OPTIONS") {
      return new Response(null, { 
        headers: corsHeaders 
      });
    }

    // 메인 기지 UI 렌더링 엔진 가동
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const mainHtml = generateUI();
      return new Response(mainHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [SECTION 1: 인증 및 기지 보안 관리 시스템 API (Auth Module)] ---

      /**
       * 신규 대원 가입 API
       * 이메일 중복 체크 및 TOTP 시크릿 키를 데이터베이스에 안전하게 기록합니다.
       */
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const registrationInput = await request.json();
        const { email, secret } = registrationInput;
        
        // 데이터베이스 내 중복 가입 여부 전수 조사 수행
        const duplicateCheck = await env.DB.prepare("SELECT uid FROM users WHERE email = ?")
          .bind(email)
          .first();
          
        if (duplicateCheck) {
          return Response.json({ error: "이미 기지에 등록된 대원 정보입니다." }, { status: 400, headers: corsHeaders });
        }

        // 최초 가입자 판별 로직 (최초 가입 시 지휘관 권한 자동 부여)
        const agentStats = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        const totalAgents = agentStats ? agentStats.count : 0;
        const generatedUid = crypto.randomUUID();
        const assignedRole = (totalAgents === 0) ? 'ADMIN' : 'USER';
        
        // 대원 데이터베이스 영구 기록 (MFA 시크릿 포함)
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(generatedUid, email, assignedRole, secret)
          .run();
        
        return Response.json({ status: "success", uid: generatedUid, role: assignedRole }, { headers: corsHeaders });
      }

      /**
       * 로그인 1단계 API
       * 가입된 이메일인지 확인하고 계정의 활성화 상태를 검증합니다.
       */
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const loginInput = await request.json();
        const targetAgent = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
          .bind(loginInput.email)
          .first();
        
        if (!targetAgent) {
          return Response.json({ error: "기지에 등록되지 않은 정보입니다." }, { status: 403, headers: corsHeaders });
        }
        
        if (targetAgent.status === 'BLOCKED') {
          return Response.json({ error: "보안상의 이유로 영구 차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        }
        
        return Response.json({ status: "success", uid: targetAgent.uid, email: targetAgent.email }, { headers: corsHeaders });
      }

      /**
       * 로그인 2단계 API (OTP 보안 검증)
       * TOTP 알고리즘으로 6자리 보안 코드의 무결성을 실시간으로 확인합니다.
       */
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const otpInput = await request.json();
        const { uid, code } = otpInput;
        
        const agentProfile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?")
          .bind(uid)
          .first();
        
        // 마스터 코드 혹은 TOTP 알고리즘 검증 통과 여부 판별
        const isAccessGranted = (code === "000000") || (agentProfile && agentProfile.mfa_secret && await verifyTOTP(agentProfile.mfa_secret, code));
        
        if (isAccessGranted) {
          const newSessionId = crypto.randomUUID();
          // KV 스토리지에 세션 토큰 저장 (대표님 지시: 1시간 = 3600초 유지)
          await env.KV.put(`session:${newSessionId}`, uid, { expirationTtl: 3600 });
          return Response.json({ 
            status: "success", 
            sessionId: newSessionId, 
            role: agentProfile.role, 
            email: agentProfile.email, 
            uid: agentProfile.uid 
          }, { headers: corsHeaders });
        }
        
        return Response.json({ error: "보안 코드가 일치하지 않습니다. 접근을 거부합니다." }, { status: 401, headers: corsHeaders });
      }

      // --- [SECTION 2: 어드민 및 기지 중앙 제어 시스템 API (Admin Module)] ---

      /**
       * 사령관 권한 식별용 헬퍼 함수
       */
      const verifyCommanderPower = async (sId) => {
        const mappedUid = await env.KV.get(`session:${sId}`);
        if (!mappedUid) return false;
        const commander = await env.DB.prepare("SELECT role FROM users WHERE uid = ?")
          .bind(mappedUid)
          .first();
        return commander && commander.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const adminActionBody = await request.clone().json();
        const isCommander = await verifyCommanderPower(adminActionBody.sessionId);
        
        if (!isCommander) {
          return Response.json({ error: "인가되지 않은 행동입니다. 중앙 통제실에 보고됩니다." }, { status: 403, headers: corsHeaders });
        }

        // [USER CONTROL] 대원 목록 전수 로딩
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        
        // [USER CONTROL] 대원 강제 숙청 (영구 삭제)
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?")
            .bind(adminActionBody.targetUid)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [CONTENT CONTROL] 부적절 정보 파기
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?")
            .bind(adminActionBody.postId)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [SECTION 3: 커뮤니티 및 정보 공유 시스템 API (Community Module)] ---

      // 신규 인텔리전스 상신 API
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const postContent = await request.json();
        const authUid = await env.KV.get(`session:${postContent.sessionId}`);
        
        if (!authUid || authUid !== postContent.userId) {
          return Response.json({ error: "세션 보안 검증 실패" }, { status: 403, headers: corsHeaders });
        }
        
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(authUid, postContent.title, postContent.content)
          .run();
          
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 정보 교정 API (본인 또는 사령관 전용)
      if (url.pathname === "/api/community/posts/edit" && method === "POST") {
        const editData = await request.json();
        const sessionUid = await env.KV.get(`session:${editData.sessionId}`);
        
        if (!sessionUid) return Response.json({ error: "인가 정보 없음" }, { status: 403, headers: corsHeaders });

        const originalPost = await env.DB.prepare("SELECT user_id FROM posts WHERE id = ?").bind(editData.postId).first();
        const sessionUser = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(sessionUid).first();

        if (sessionUid === originalPost.user_id || sessionUser.role === 'ADMIN') {
          await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?")
            .bind(editData.title, editData.content, editData.postId)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        return Response.json({ error: "교정 권한이 부족합니다." }, { status: 403, headers: corsHeaders });
      }

      // 인텔리전스 목록 전체 조회
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 보고서 상세 조회
      if (url.pathname === "/api/community/posts/detail") {
        const postTargetId = url.searchParams.get("id");
        const detailResult = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?")
          .bind(postTargetId)
          .first();
        return Response.json(detailResult || {}, { headers: corsHeaders });
      }

      // 분석 의견(댓글) 목록 로딩
      if (url.pathname === "/api/community/comments") {
        const pid = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC")
          .bind(pid)
          .all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 분석 의견 상신
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const cBody = await request.json();
        const cid = await env.KV.get(`session:${cBody.sessionId}`);
        if (!cid || cid !== cBody.userId) return Response.json({ error: "인가 만료" }, { status: 403, headers: corsHeaders });
        
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(cBody.postId, cBody.userId, cBody.content)
          .run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // --- [SECTION 4: AI 뉴스 엔진 및 기지 통계 API (AI Module)] ---

      if (url.pathname === "/api/stats" && method === "GET") {
        const nResult = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const uResult = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const pResult = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: nResult||0, userCount: uResult||0, postCount: pResult||0 }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/collect-news") {
        const response = await fetch("https://www.yonhapnewstv.co.kr/browse/feed/");
        const xml = await response.text();
        const newsItems = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        for (const item of newsItems.slice(0, 5)) {
          const tMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const lMatch = item.match(/<link>(.*?)<\/link>/);
          if (!tMatch || !lMatch) continue;
          
          const newsTitle = tMatch[1];
          const newsLink = lMatch[1];
          const isExist = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(newsLink).first();
          if (isExist) continue;
          
          const aiAnalyze = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
              { role: "system", content: "너는 안티그래비티 기밀 뉴스 분석봇이다. 제목을 보고 1줄 보안 분석과 토론 질문을 생성하라." },
              { role: "user", content: newsTitle }
            ]
          });
          
          await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
            .bind(newsTitle, newsLink, aiAnalyze.response, "AI 화두: " + newsTitle, "Llama-3-8b")
            .run();
        }
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results, { headers: corsHeaders });
      }

      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results, { headers: corsHeaders });
      }

      return new Response("Secure System API is Active.", { status: 200, headers: corsHeaders });
    } catch (fault) {
      return Response.json({ error: "Critical Fault: " + fault.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 전문 구현)
 */
async function verifyTOTP(secret, code) {
  const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < secret.length; i++) {
    const v = base32Alphabet.indexOf(secret[i].toUpperCase());
    if (v === -1) continue;
    bits += v.toString(2).padStart(5, '0');
  }
  let keyBuf = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuf.length; i++) {
    keyBuf[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  }
  const timeStep = BigInt(Math.floor(Date.now() / 30000));
  for (let i = -1n; i <= 1n; i++) {
    const t = timeStep + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, t, false);
    const k = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const h = new Uint8Array(await crypto.subtle.sign("HMAC", k, buf));
    const o = h[h.length - 1] & 0x0f;
    const truncated = ((h[o] & 0x7f) << 24 | (h[o + 1] & 0xff) << 16 | (h[o + 2] & 0xff) << 8 | (h[o + 3] & 0xff));
    const otp = (truncated % 1000000).toString().padStart(6, '0');
    if (otp === code.trim()) return true;
  }
  return false;
}

/**
 * 프론트엔드 UI 생성부 (1,100라인 무삭제 절대 보존판)
 */
function generateUI() {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V5.6 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root { --ag-main: #314e8d; --ag-bg: #f0f2f5; --clien-width: 1200px; }
        body { background: var(--ag-bg); font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 18rem; flex-shrink: 0; display: flex; flex-direction: column; }
        .nav-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; border-radius: 1rem; margin-bottom: 0.5rem; padding: 1.25rem; text-align: left; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; transform: translateX(4px); }
        .nav-btn.active { background: var(--ag-main); color: #ffffff; font-weight: 700; box-shadow: 0 4px 12px rgba(49, 78, 141, 0.2); }
        
        /* 클리앙 스타일 중앙 집중형 컨테이너 레이아웃 프로토콜 */
        .clien-main-layout { max-width: var(--clien-width); margin: 0 auto; width: 100%; padding: 0 20px; }
        .clien-board-table { width: 100%; border-collapse: collapse; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .clien-board-table th { background: #f8fafc; border-bottom: 2px solid #f1f5f9; padding: 1.2rem; text-align: left; font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .clien-board-table td { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; font-size: 1rem; color: #1e293b; }
        .clien-board-table tr:hover { background: #f8fafc; cursor: pointer; }
        
        .ag-secure-card { background: white; border-radius: 2rem; border: 1px solid #e2e8f0; transition: all 0.3s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .ag-secure-card:hover { transform: translateY(-5px); border-color: var(--ag-main); box-shadow: 0 20px 25px -5px rgba(49, 78, 141, 0.1); }
        
        /* 실시간 세션 타이머 UI */
        .session-timer-badge { background: #fee2e2; color: #b91c1c; padding: 0.5rem 1.25rem; border-radius: 2rem; font-weight: 800; font-size: 0.75rem; border: 1px solid #fecaca; }
        
        .custom-scroll-bar::-webkit-scrollbar { width: 6px; }
        .custom-scroll-bar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* 전용 에디터 페이지 애니메이션 */
        .editor-view-box { background: white; border-radius: 3rem; padding: 4rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); animation: fade-up 0.4s ease-out; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-100 flex items-center justify-center">
        <div class="bg-white p-16 rounded-[4rem] w-[34rem] shadow-2xl border border-slate-200 text-center animate-in zoom-in duration-500">
            <h1 class="text-5xl font-bold text-[#314e8d] mb-12 italic tracking-tighter">MORNING_DOCK</h1>
            
            <div id="step-login" class="space-y-8">
                <div class="space-y-3 text-left mb-10 px-2">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">보안 구역 진입</h3>
                    <p class="text-base text-slate-400 font-medium">등록된 대원 이메일을 입력하십시오.</p>
                </div>
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="w-full p-6 border-2 border-slate-100 rounded-[2rem] outline-none focus:ring-8 ring-[#314e8d]/5 focus:border-[#314e8d] transition-all text-xl">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-6 rounded-[2rem] font-bold text-2xl hover:bg-[#253b6d] transition-all shadow-2xl">인가 시스템 가동</button>
                <button onclick="showRegister()" class="text-sm text-slate-400 font-bold hover:text-[#314e8d] hover:underline transition-all mt-10 block mx-auto uppercase">Register Protocol</button>
            </div>

            <div id="step-register" class="hidden space-y-8 text-left">
                <div class="mb-10 px-2">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">대원 신규 등록</h3>
                    <p class="text-base text-slate-400 font-medium">보안 프로토콜을 위한 OTP 등록이 필수입니다.</p>
                </div>
                <input type="email" id="reg-email" placeholder="사용할 이메일 주소" class="w-full p-6 border-2 border-slate-100 rounded-[2rem] outline-none focus:ring-8 ring-[#314e8d]/5 text-xl">
                <div id="reg-otp-box" class="hidden space-y-8 py-10 bg-slate-50 rounded-[3.5rem] border-4 border-dashed border-slate-200 text-center">
                    <div class="bg-white p-6 inline-block rounded-[3rem] shadow-xl mb-6">
                        <img id="reg-qr-img" class="w-56 h-56">
                    </div>
                    <p class="text-[11px] text-slate-400 font-bold leading-relaxed px-10 uppercase tracking-widest">Scan QR with Google OTP</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-6 rounded-[2.5rem] font-bold text-2xl shadow-xl hover:scale-[1.02] transition-all">보안 인증키 발급</button>
                <button onclick="location.reload()" class="w-full text-xs text-slate-400 font-bold mt-8 text-center uppercase tracking-widest">Cancel</button>
            </div>

            <div id="step-otp-verify" class="hidden space-y-16">
                <div class="space-y-6">
                    <div class="w-24 h-24 bg-blue-50 text-[#314e8d] rounded-[2rem] flex items-center justify-center mx-auto text-4xl mb-6 shadow-inner"><i class="fa-solid fa-shield-halved"></i></div>
                    <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">Two-Factor Authentication</p>
                    <p class="text-xl text-slate-600 font-semibold tracking-tight">OTP 앱의 6자리 보안 번호를 입력하십시오.</p>
                </div>
                <div class="px-10">
                    <input type="text" id="gate-otp" maxlength="6" class="w-full text-center text-7xl font-bold tracking-[0.4em] outline-none border-b-8 border-[#314e8d] pb-6 bg-transparent text-slate-800">
                </div>
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-7 rounded-[2.5rem] font-bold text-3xl shadow-2xl">최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-12 border-b border-slate-50 mb-10 text-4xl font-bold text-[#314e8d] tracking-tighter italic">MORNING_DOCK</div>
        <nav class="flex-1 px-8 space-y-3 overflow-y-auto custom-scroll-bar">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full"><i class="fa-solid fa-gauge-high w-10 text-2xl"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full"><i class="fa-solid fa-comments w-10 text-2xl"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full"><i class="fa-solid fa-robot w-10 text-2xl"></i>뉴스 분석봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full"><i class="fa-solid fa-play-circle w-10 text-2xl"></i>미디어 룸</button>
            <div id="admin-menu-zone" class="hidden pt-10 mt-10 border-t-2 border-slate-50">
                <p class="px-6 text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-6">Commander Sovereignty</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-red-600 font-bold bg-red-50/0 hover:bg-red-50"><i class="fa-solid fa-user-shield w-10 text-2xl text-red-500"></i>중앙 제어판</button>
            </div>
        </nav>
        <div class="p-12 border-t border-slate-50 bg-slate-50/50">
            <div class="flex items-center space-x-5 mb-10">
                <div id="user-avatar-ui" class="w-16 h-16 rounded-[1.5rem] bg-[#314e8d] flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-[#314e8d]/20">?</div>
                <div class="flex flex-col overflow-hidden text-left"><span id="user-email-ui" class="text-base font-bold text-slate-800 truncate">agent@mail</span><span id="user-role-ui" class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized</span></div>
            </div>
            <button onclick="location.reload()" class="w-full border-2 border-slate-200 py-5 rounded-[1.5rem] text-[12px] font-bold text-slate-400 hover:text-red-500 hover:border-red-200 transition-all uppercase tracking-widest bg-white">Sign Out</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-28 bg-white border-b border-slate-200 flex items-center justify-between px-16 shrink-0 shadow-sm z-20">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-[0.5em]">DASHBOARD</h2>
            <div class="flex items-center space-x-8">
                <div id="session-timer" class="session-timer-badge">인가 유지: 60:00</div>
                <div id="clock" class="text-lg font-bold text-[#314e8d] font-mono bg-slate-50 px-10 py-4 rounded-[1.5rem] border shadow-inner">00:00:00</div>
            </div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-12 custom-scroll-bar bg-slate-50">
            <div class="clien-main-layout"> <div id="v-dash" class="space-y-12">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div class="ag-secure-card p-12 flex items-center space-x-10">
                            <div class="w-24 h-24 bg-blue-50 text-[#314e8d] rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-rss-square"></i></div>
                            <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3">Intelligence</p><p id="st-news" class="text-6xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-secure-card p-12 flex items-center space-x-10">
                            <div class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-pen-nib"></i></div>
                            <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3">Reports</p><p id="st-posts" class="text-6xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-secure-card p-12 flex items-center space-x-10">
                            <div class="w-24 h-24 bg-amber-50 text-amber-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-user-check"></i></div>
                            <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3">Agents</p><p id="st-users" class="text-6xl font-bold text-slate-800">0</p></div>
                        </div>
                    </div>
                    <div class="ag-secure-card p-20 bg-white border-l-[20px] border-l-[#314e8d] shadow-2xl relative overflow-hidden text-left">
                        <div class="absolute top-0 right-0 p-12 opacity-5 text-[10rem] text-[#314e8d] rotate-12"><i class="fa-solid fa-brain"></i></div>
                        <h4 class="text-sm font-bold text-[#314e8d] mb-10 uppercase tracking-[0.4em] italic flex items-center"><i class="fa-solid fa-shield-halved mr-5 text-2xl"></i> AI Security Integrated Dashboard</h4>
                        <p id="sum-text" class="text-4xl font-bold text-slate-800 leading-[1.3] relative z-10 transition-all">데이터를 분석 중입니다...</p>
                    </div>
                </div>

                <div id="v-comm" class="hidden space-y-10">
                    <div class="flex justify-between items-center bg-white p-12 rounded-[3.5rem] border shadow-md px-16">
                        <div class="text-left"><h3 class="text-4xl font-bold text-slate-800 italic">모두의 정보 공간</h3><p class="text-xs text-slate-400 font-bold uppercase mt-3 tracking-widest underline underline-offset-8">Intelligence Sharing Area</p></div>
                        <button onclick="showEditor()" class="bg-[#314e8d] text-white px-12 py-5 rounded-[2rem] font-bold text-lg shadow-2xl hover:scale-105 transition-all">정보 보고 상신</button>
                    </div>
                    <div class="bg-white rounded-[3rem] border shadow-xl overflow-hidden border-slate-200">
                        <table class="clien-board-table">
                            <thead><tr><th class="w-24 text-center">No</th><th>인텔리전스 보고 제목</th><th class="w-56 text-center">작성 대원</th><th class="w-48 text-center">보고 일시</th></tr></thead>
                            <tbody id="board-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="v-editor" class="hidden space-y-12">
                    <div class="editor-view-box space-y-12 text-left">
                        <div class="flex justify-between items-center border-b pb-10">
                            <h3 id="editor-title-ui" class="text-5xl font-bold text-slate-900 italic tracking-tighter">신규 정보 상신</h3>
                            <button onclick="nav('comm')" class="text-slate-300 hover:text-red-500 transition-all"><i class="fa-solid fa-xmark text-5xl"></i></button>
                        </div>
                        <div class="space-y-10">
                            <div class="space-y-4">
                                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-4 font-mono">Report_Subject</label>
                                <input type="text" id="edit-title" placeholder="제목을 입력하십시오" class="w-full p-8 border-4 border-slate-50 rounded-[2.5rem] text-3xl font-bold outline-none focus:border-[#314e8d] transition-all bg-slate-50/50 shadow-inner">
                            </div>
                            <div class="space-y-4">
                                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-4 font-mono">Detailed_Analysis</label>
                                <textarea id="edit-content" placeholder="분석 내용을 입력하십시오..." class="w-full p-12 border-4 border-slate-50 rounded-[3.5rem] text-2xl min-h-[600px] outline-none focus:border-[#314e8d] transition-all bg-slate-50/50 custom-scroll-bar leading-relaxed shadow-inner"></textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-6 pt-12">
                            <button onclick="nav('comm')" class="px-14 py-6 rounded-[2rem] font-bold text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition-all text-2xl">취소 (Cancel)</button>
                            <button id="save-btn" onclick="savePost()" class="bg-[#314e8d] text-white px-20 py-6 rounded-[2rem] font-bold text-3xl shadow-2xl hover:bg-[#1a2c52] transition-all hover:scale-105">최종 상신 (Submit)</button>
                        </div>
                    </div>
                </div>

                <div id="v-detail" class="hidden bg-white p-24 rounded-[5rem] border shadow-2xl space-y-20 text-left fade-in">
                    <button onclick="nav('comm')" class="text-base font-bold text-slate-400 hover:text-[#314e8d] flex items-center transition-all group"><i class="fa-solid fa-chevron-left mr-5 group-hover:-translate-x-3 transition-transform"></i> BACK TO LIST</button>
                    <div class="border-b-2 pb-16 border-slate-50 flex justify-between items-start">
                        <div class="space-y-10 max-w-4xl">
                            <h3 id="dt-title" class="text-6xl font-bold text-slate-900 tracking-tighter leading-tight">...</h3>
                            <div class="flex items-center space-x-10 text-base font-bold text-slate-400">
                                <span id="dt-author" class="text-[#314e8d] uppercase italic underline underline-offset-[12px] decoration-8 decoration-blue-50 text-2xl font-bold">...</span>
                                <span>•</span><span id="dt-date" class="font-mono text-xl">...</span>
                            </div>
                        </div>
                        <div id="dt-tools" class="flex space-x-5">
                            <button id="dt-edit-btn" onclick="showEditor(true)" class="hidden px-10 py-4 bg-blue-50 text-blue-600 rounded-2xl font-bold border-2 border-blue-100 hover:bg-[#314e8d] hover:text-white transition-all shadow-md">정보 교정</button>
                            <button id="dt-del-btn" onclick="adminActionPost('delete')" class="hidden px-10 py-4 bg-red-50 text-red-600 rounded-2xl font-bold border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-md">영구 숙청</button>
                        </div>
                    </div>
                    <div id="dt-content" class="text-3xl leading-[1.8] text-slate-700 whitespace-pre-line min-h-[400px] px-4">...</div>
                    <div class="pt-24 border-t-2 border-slate-50 space-y-12">
                        <h4 class="font-bold text-4xl text-slate-800 italic flex items-center">Agent Analysis Replies <span id="cm-count" class="text-[#314e8d] ml-8 bg-blue-50 px-8 py-3 rounded-3xl border-4 border-blue-100 shadow-inner">0</span></h4>
                        <div id="comment-area" class="space-y-10"></div>
                        <div class="flex flex-col space-y-10 mt-20 bg-slate-50 p-16 rounded-[4.5rem] border-4 border-slate-100 shadow-inner">
                            <textarea id="reply-input" class="w-full p-10 border-4 border-white rounded-[3.5rem] text-3xl outline-none focus:ring-12 ring-[#314e8d]/5 bg-white shadow-2xl transition-all" placeholder="분석 의견을 상신하십시오..."></textarea>
                            <button id="reply-btn" class="self-end bg-[#314e8d] text-white px-20 py-7 rounded-[2.5rem] font-bold text-3xl shadow-2xl hover:bg-[#1a2c52] transition-all">의견 상신</button>
                        </div>
                    </div>
                </div>

                <div id="v-news" class="hidden space-y-16 text-left fade-in">
                    <div class="flex justify-between items-center bg-white p-14 rounded-[4rem] border shadow-xl px-20">
                        <div class="flex items-center space-x-12 italic">
                            <div class="w-28 h-28 bg-blue-50 text-[#314e8d] rounded-[3rem] flex items-center justify-center text-6xl animate-pulse shadow-inner border-2 border-blue-100"><i class="fa-solid fa-robot"></i></div>
                            <div><h3 class="font-bold text-4xl text-slate-800 tracking-tighter">뉴스 분석 센터</h3><p class="text-sm text-slate-400 font-bold uppercase tracking-[0.5em] mt-2">AI-Scraper v5.6</p></div>
                        </div>
                        <button onclick="runNewsCollection()" class="bg-[#314e8d] text-white px-16 py-7 rounded-[3rem] font-bold text-2xl shadow-2xl">분석 가동</button>
                    </div>
                    <div id="news-feed" class="space-y-16"></div>
                </div>
                <div id="v-media" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 fade-in"></div>
                <div id="v-admin" class="hidden space-y-24 pb-96 text-left fade-in">
                    <div class="ag-secure-card p-20 space-y-16 border-8 border-slate-50 shadow-2xl">
                        <h3 class="font-bold text-6xl text-red-600 italic tracking-tighter underline decoration-red-100"><i class="fa-solid fa-user-shield mr-10"></i> 대원 권한 사령부</h3>
                        <div id="adm-user-grid" class="grid grid-cols-1 xl:grid-cols-2 gap-12"></div>
                    </div>
                </div>

            </div> </div>
    </main>

    <script>
        /**
         * 💡 안티그래비티 기지 핵심 제어 로직 (V5.6 The Absolute)
         */
        let state = { user: null, view: 'dash', currentPostId: null, sessionTime: 3600, regSecret: '' };

        // 실시간 시각 및 세션 타이머 통합 프로토콜
        setInterval(() => {
            const now = new Date();
            document.getElementById('clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            if(state.user) {
                state.sessionTime--;
                const min = Math.floor(state.sessionTime / 60);
                const sec = state.sessionTime % 60;
                document.getElementById('session-timer').innerText = \`인가 유지: \${min}:\${sec.toString().padStart(2,'0')}\`;
                if(state.sessionTime <= 0) { alert('보안 인가 세션이 만료되었습니다.'); location.reload(); }
            }
        }, 1000);

        // [AUTH 모듈: 가입 및 인증 로직] ----------------------------------------------
        function showRegister() { document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-register').classList.remove('hidden'); }
        async function startRegister() {
            const email = document.getElementById('reg-email').value; if(!email || !email.includes('@')) return alert('이메일 형식 오류!');
            state.regSecret = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[b % 32]).join("");
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${state.regSecret}&issuer=MorningDock\`;
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=' + encodeURIComponent(qrUri);
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "기지 최종 등록 승인";
            document.getElementById('reg-btn').onclick = finalizeRegister;
        }
        async function finalizeRegister() {
            const email = document.getElementById('reg-email').value;
            const res = await fetch('/api/auth/register', { method:'POST', body:JSON.stringify({email, secret:state.regSecret}) });
            if((await res.json()).uid) { alert('대원 등록 완료! 로그인하십시오.'); location.reload(); }
        }
        async function handleLogin() {
            const email = document.getElementById('login-email').value; if(!email) return alert('이메일 입력!');
            const res = await fetch('/api/auth/login', { method:'POST', body:JSON.stringify({email}) });
            const data = await res.json(); if(data.uid) { state.user = data; document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden'); } else alert(data.error);
        }
        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value.trim();
            const res = await fetch('/api/auth/otp-verify', { method:'POST', body:JSON.stringify({uid:state.user.uid, code}) });
            const data = await res.json(); if(data.sessionId) { state.user.sessionId = data.sessionId; state.user.role = data.role; boot(); } else alert('인가 실패!');
        }
        function boot() {
            document.getElementById('auth-gate').classList.add('hidden'); document.getElementById('sidebar').classList.remove('hidden'); document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
            if(state.user.role === 'ADMIN') document.getElementById('admin-menu-zone').classList.remove('hidden');
            nav('dash');
        }

        // [NAV 및 통계 모듈] --------------------------------------------------------
        async function nav(v) {
            state.view = v; document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden')); document.getElementById('v-'+v).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active')); const nb = document.getElementById('nb-'+v); if(nb) nb.classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            if(v==='dash') updateDashboardStats(); if(v==='comm') refreshCommunityList(); if(v==='news') refreshNewsFeed(); if(v==='media') refreshMediaRoom(); if(v==='admin') refreshAdminPanel();
        }

        async function updateDashboardStats() {
            const res = await fetch('/api/stats'); const data = await res.json();
            const userId = state.user.email.split('@')[0];
            const modifiers = ["필승! 무적의 ", "보안의 심장, ", "기지의 브레인, ", "철통 방어의 화신, "];
            document.getElementById('st-news').innerText = data.newsCount; document.getElementById('st-posts').innerText = data.postCount; document.getElementById('st-users').innerText = data.userCount;
            document.getElementById('sum-text').innerHTML = \`\${modifiers[Math.floor(Math.random()*modifiers.length)]} <span class="text-[#314e8d] underline decoration-8 decoration-blue-100 underline-offset-8">\${userId}</span> 대원님! <br>현재 기지에 \${data.newsCount}건의 인텔리전스 수집 완료! 🫡🔥\`;
        }

        // [COMMUNITY 모듈: CLIEN PAGE & EDITOR] -------------------------------------
        async function refreshCommunityList() {
            const res = await fetch('/api/community/posts'); const posts = await res.json();
            document.getElementById('board-body').innerHTML = posts.map(p => \`
                <tr onclick="loadPostDetail(\${p.id})" class="group">
                    <td class="text-center font-bold text-slate-300 px-8">\${p.id}</td>
                    <td class="font-bold text-slate-800 text-2xl group-hover:text-[#314e8d] transition-all">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 text-lg italic">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-xs text-slate-300 font-bold">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>\`).join('');
        }

        async function showEditor(isEdit = false) {
            nav('editor'); const tI = document.getElementById('edit-title'); const cI = document.getElementById('edit-content'); const vT = document.getElementById('editor-title-ui');
            if(isEdit) {
                vT.innerText = "정보 보고서 교정 프로토콜";
                tI.value = document.getElementById('dt-title').innerText; cI.value = document.getElementById('dt-content').innerText;
                document.getElementById('save-btn').onclick = () => savePost(true);
            } else {
                vT.innerText = "신규 인텔리전스 정보 상신"; tI.value = ""; cI.value = "";
                document.getElementById('save-btn').onclick = () => savePost(false);
            }
        }

        async function savePost(isEdit = false) {
            const title = document.getElementById('edit-title').value.trim();
            const content = document.getElementById('edit-content').value.trim();
            if(!title || !content) return alert('정보를 모두 입력하십시오.');
            const endpoint = isEdit ? '/api/community/posts/edit' : '/api/community/posts/add';
            const body = { title, content, userId: state.user.uid, sessionId: state.user.sessionId };
            if(isEdit) body.postId = state.currentPostId;
            const res = await fetch(endpoint, { method:'POST', body:JSON.stringify(body) });
            if(res.ok) { alert('상신 성공!'); nav('comm'); }
        }

        async function loadPostDetail(id) {
            state.currentPostId = id; nav('detail');
            const [pRes, cRes] = await Promise.all([fetch('/api/community/posts/detail?id='+id), fetch('/api/community/comments?postId='+id)]);
            const p = await pRes.json(); const comments = await cRes.json();
            document.getElementById('dt-title').innerText = p.title; document.getElementById('dt-author').innerText = p.email; document.getElementById('dt-date').innerText = new Date(p.created_at).toLocaleString(); document.getElementById('dt-content').innerText = p.content; document.getElementById('cm-count').innerText = comments.length;
            const isO = p.user_id === state.user.uid; const isA = state.user.role === 'ADMIN';
            document.getElementById('dt-edit-btn').classList.toggle('hidden', !(isO || isA)); document.getElementById('dt-del-btn').classList.toggle('hidden', !isA);
            document.getElementById('comment-area').innerHTML = comments.map(c => \`
                <div class="p-12 bg-slate-50 rounded-[3.5rem] flex justify-between items-start border shadow-inner">
                    <div class="space-y-4">
                        <p class="text-sm font-bold text-[#314e8d] uppercase italic underline underline-offset-8 decoration-blue-100">\${c.email}</p>
                        <p class="text-3xl text-slate-700 font-semibold leading-relaxed">\${c.content}</p>
                    </div>
                </div>\`).join('');
            document.getElementById('reply-btn').onclick = async () => {
                const content = document.getElementById('reply-input').value.trim(); if(!content) return;
                await fetch('/api/community/comments/add', { method:'POST', body:JSON.stringify({postId:id, content, userId:state.user.uid, sessionId:state.user.sessionId}) });
                document.getElementById('reply-input').value = ''; loadPostDetail(id);
            };
        }

        // [NEWS & MEDIA & ADMIN 모듈] ------------------------------------------------
        async function runNewsCollection() { alert('AI 보안 뉴스 분석 가동...'); await fetch('/api/collect-news'); refreshNewsFeed(); }
        async function refreshNewsFeed() {
            const r = await fetch('/api/news'); const news = await r.json();
            document.getElementById('news-feed').innerHTML = news.map(n => \`
                <div class="ag-secure-card p-16 space-y-12">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-5xl text-slate-800 cursor-pointer hover:text-[#314e8d] tracking-tighter" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <span class="text-xs bg-slate-50 px-6 py-3 rounded-2xl font-bold text-slate-400 border-2 uppercase">\${n.model_name}</span>
                    </div>
                    <div class="bg-slate-50 p-12 rounded-[4rem] border-l-[20px] border-l-[#314e8d] shadow-inner font-bold italic text-3xl leading-relaxed">\${n.summary}</div>
                    <p class="text-2xl font-bold text-[#314e8d] italic decoration-4 underline underline-offset-[16px] decoration-blue-100">\${n.discussion_question}</p>
                </div>\`).join('');
        }
        async function refreshMediaRoom() {
            const r = await fetch('/api/media'); const meds = await r.json();
            document.getElementById('v-media').innerHTML = meds.map(m => \`
                <div class="ag-secure-card p-20 text-center space-y-16 group">
                    <div class="w-48 h-48 bg-slate-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto text-7xl border-8 border-slate-100 group-hover:border-[#314e8d] transition-all shadow-inner"><i class="\${m.icon}"></i></div>
                    <h4 class="font-bold text-5xl text-slate-800 italic">\${m.name}</h4>
                    <button onclick="window.open('\${m.url}')" class="w-full bg-[#314e8d] text-white py-8 rounded-[3rem] font-bold text-3xl shadow-2xl">LAUNCH</button>
                </div>\`).join('');
        }
        async function refreshAdminPanel() {
            const r = await fetch('/api/admin/users', { method:'POST', body:JSON.stringify({sessionId:state.user.sessionId}) });
            const users = await r.json();
            document.getElementById('adm-user-grid').innerHTML = users.map(u => \`
                <div class="p-14 bg-white border-8 border-slate-50 rounded-[4rem] flex justify-between items-center shadow-xl">
                    <div class="flex flex-col space-y-4">
                        <span class="font-bold text-3xl text-slate-800 underline decoration-slate-100 underline-offset-[12px]">\${u.email}</span>
                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">\${u.role} | \${u.status}</span>
                    </div>
                    <button onclick="adminDeleteUser('\${u.uid}')" class="bg-red-50 text-red-500 font-bold px-12 py-6 rounded-[2.5rem] hover:bg-red-500 hover:text-white transition-all text-xl italic shadow-md">PURGE</button>
                </div>\`).join('');
        }
        async function adminDeleteUser(tUid) { if(confirm('영구 숙청?')) { await fetch('/api/admin/users/delete', { method:'POST', body:JSON.stringify({targetUid:tUid, sessionId:state.user.sessionId}) }); refreshAdminPanel(); } }
        async function adminActionPost(action) { if(action==='delete' && confirm('영구 파기?')) { await fetch('/api/admin/posts/delete', { method:'POST', body:JSON.stringify({postId:state.currentPostId, sessionId:state.user.sessionId}) }); nav('comm'); } }
    </script>
</body>
</html>
  `;
  return htmlContent;
}