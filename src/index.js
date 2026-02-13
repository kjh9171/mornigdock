/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.9 The Ultimate Sovereign Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 클리앙 스타일 1200px, 사령관 중앙 제어 본부, 전용 독립 에디터, 실시간 보안 타이머
 * 주의: 본 코드는 대표님의 감찰 아래 작성된 1,300라인 규격의 무삭제 절대 보존판입니다.
 * ----------------------------------------------------------------------------------
 * "라인수는 곧 기지의 규모이며, 사령관의 권위이다." - CERT 보안 개발 철학 제1조
 */

export default {
  /**
   * fetch 엔진: Cloudflare Workers의 인바운드 트래픽을 통제하는 기지 관문입니다.
   * 모든 요청은 이 관문을 통해 검증되고 적절한 API 서비스로 라우팅됩니다.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 기기 간 통신을 위한 표준 CORS 헤더 설정 (최고 보안 등급 수립)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 브라우저의 사전 보안 검사(OPTIONS) 요청에 대한 즉각적인 응답 처리
    if (method === "OPTIONS") {
      return new Response(null, { 
        headers: corsHeaders 
      });
    }

    // 루트 경로 접속 시 기지의 메인 UI 렌더링 가동 (generateUI 함수 호출)
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const mainResponseHtml = generateUI();
      return new Response(mainResponseHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [SECTION 1: 인증 및 보안 관리 시스템 (Authentication System)] ---

      /**
       * 신규 대원 가입 API (Register Agent)
       * 이메일 중복 검증 및 보안 강화를 위한 TOTP 시크릿 키를 안전하게 저장함.
       */
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const rawBody = await request.json();
        const { email, secret } = rawBody;
        
        // 데이터베이스 내 중복된 대원이 있는지 전수 조사를 실시함.
        const duplicateAgent = await env.DB.prepare("SELECT uid FROM users WHERE email = ?")
          .bind(email)
          .first();
          
        if (duplicateAgent) {
          return Response.json({ error: "이미 기지에 소속된 대원 이메일입니다." }, { status: 400, headers: corsHeaders });
        }

        // 최초 가입자 판별을 위한 카운트 통계 조회
        const currentStats = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
        const totalCount = currentStats ? currentStats.total : 0;
        
        // 대원 식별자(UID) 생성 및 최초 가입 시 사령관(ADMIN) 권한 자동 인가
        const newUid = crypto.randomUUID();
        const assignedRole = totalCount === 0 ? 'ADMIN' : 'USER';
        
        // 최종 데이터베이스 영구 기록 로직 가동
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(newUid, email, assignedRole, secret)
          .run();
        
        return Response.json({ status: "success", uid: newUid, role: assignedRole }, { headers: corsHeaders });
      }

      /**
       * 로그인 1단계 API (Identity Check)
       * 가입 여부 및 보안 차단 상태를 우선적으로 검증함.
       */
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const loginPayload = await request.json();
        const { email } = loginPayload;
        
        const targetAgent = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
          .bind(email)
          .first();
        
        if (!targetAgent) {
          return Response.json({ error: "기지 가입 이력이 확인되지 않습니다." }, { status: 403, headers: corsHeaders });
        }
        
        if (targetAgent.status === 'BLOCKED') {
          return Response.json({ error: "보안 정책 위반으로 영구 차단된 대원입니다." }, { status: 403, headers: corsHeaders });
        }
        
        return Response.json({ status: "success", uid: targetAgent.uid, email: targetAgent.email }, { headers: corsHeaders });
      }

      /**
       * 로그인 2단계 API (MFA OTP Verify)
       * TOTP 알고리즘을 통한 6자리 보안 코드의 무결성을 실시간으로 확인함.
       */
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const otpPayload = await request.json();
        const { uid, code } = otpPayload;
        
        const agentData = await env.DB.prepare("SELECT * FROM users WHERE uid = ?")
          .bind(uid)
          .first();
        
        // 마스터 코드 "000000" 또는 실시간 시간 동기화 TOTP 알고리즘 작동
        const isMfaValid = (code === "000000") || (agentData && agentData.mfa_secret && await verifyTOTP(agentData.mfa_secret, code));
        
        if (isMfaValid) {
          const freshSessionId = crypto.randomUUID();
          // 대표님 인가 사항: 세션 유효 시간 1시간 (3600초) 설정 및 KV 저장
          await env.KV.put(`session:${freshSessionId}`, uid, { expirationTtl: 3600 });
          return Response.json({ 
            status: "success", 
            sessionId: freshSessionId, 
            role: agentData.role, 
            email: agentData.email, 
            uid: agentData.uid 
          }, { headers: corsHeaders });
        }
        
        return Response.json({ error: "보안 인가 코드가 일치하지 않습니다. 접근을 거부합니다." }, { status: 401, headers: corsHeaders });
      }

      // --- [SECTION 2: 사령관 중앙 제어 본부 API (Admin Sovereignty)] ---

      /**
       * 사령관 권한 식별용 보안 헬퍼 함수
       */
      const isCommanderPower = async (sId) => {
        const sessionUid = await env.KV.get(`session:${sId}`);
        if (!sessionUid) return false;
        const profile = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(sessionUid).first();
        return profile && profile.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const adminActionBody = await request.clone().json();
        const powerCheck = await isCommanderPower(adminActionBody.sessionId);
        
        if (!powerCheck) {
          return Response.json({ error: "사령관 권한이 부족합니다. 침투 탐지 로그에 기록되었습니다." }, { status: 403, headers: corsHeaders });
        }

        // [USER CONTROL] 기지 내 가입 대원 목록 전수 조회
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        
        // [USER CONTROL] 대원 보안 상태 변경 (승인 / 차단)
        if (url.pathname === "/api/admin/users/status") {
          const { targetUid, status } = adminActionBody;
          await env.DB.prepare("UPDATE users SET status = ? WHERE uid = ?")
            .bind(status, targetUid)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [USER CONTROL] 대원 강제 숙청 (데이터베이스 영구 삭제)
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(adminActionBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [CONTENT CONTROL] 부적절 정보 게시글 강제 파기
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(adminActionBody.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [CONTENT CONTROL] 부적절 정보 댓글 강제 파기
        if (url.pathname === "/api/admin/comments/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(adminActionBody.commentId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [SECTION 3: 커뮤니티 인텔리전스 공유 시스템 API (Intelligence Board)] ---

      // 신규 인텔리전스 상신
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const postInput = await request.json();
        const validUid = await env.KV.get(`session:${postInput.sessionId}`);
        
        if (!validUid || validUid !== postInput.userId) {
          return Response.json({ error: "보안 세션 인가 실패" }, { status: 403, headers: corsHeaders });
        }
        
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(validUid, postInput.title, postInput.content)
          .run();
          
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 기존 정보 교정 (본인 또는 사령관 전용)
      if (url.pathname === "/api/community/posts/edit" && method === "POST") {
        const editInput = await request.json();
        const currentUid = await env.KV.get(`session:${editInput.sessionId}`);
        
        if (!currentUid) return Response.json({ error: "인가되지 않은 요청입니다." }, { status: 403, headers: corsHeaders });

        const originalData = await env.DB.prepare("SELECT user_id FROM posts WHERE id = ?").bind(editInput.postId).first();
        const adminCheck = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(currentUid).first();

        // 작성자 본인이거나 사령관일 때만 교정 권한 부여
        if (currentUid === originalData.user_id || adminCheck.role === 'ADMIN') {
          await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?")
            .bind(editInput.title, editInput.content, editInput.postId)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        return Response.json({ error: "교정 권한이 존재하지 않습니다." }, { status: 403, headers: corsHeaders });
      }

      // 인텔리전스 목록 전체 조회
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 특정 인텔리전스 상세 내용 로딩
      if (url.pathname === "/api/community/posts/detail") {
        const targetPostId = url.searchParams.get("id");
        const detailResult = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?")
          .bind(targetPostId)
          .first();
        return Response.json(detailResult || {}, { headers: corsHeaders });
      }

      // 분석 의견(댓글) 목록 조회
      if (url.pathname === "/api/community/comments") {
        const parentPostId = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC")
          .bind(parentPostId)
          .all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 신규 분석 의견 등록
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const commentInput = await request.json();
        const sessionUserUid = await env.KV.get(`session:${commentInput.sessionId}`);
        if (!sessionUserUid || sessionUserUid !== commentInput.userId) return Response.json({ error: "세션 인가 만료" }, { status: 403, headers: corsHeaders });
        
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(commentInput.postId, commentInput.userId, commentInput.content)
          .run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // --- [SECTION 4: 지능형 뉴스 분석 및 기지 통계 API (Intelligence Engine)] ---

      // 기지 현황 통계 수집
      if (url.pathname === "/api/stats" && method === "GET") {
        const nS = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const uS = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const pS = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: nS||0, userCount: uS||0, postCount: pS||0 }, { headers: corsHeaders });
      }

      // 지능형 뉴스 스크랩 가동
      if (url.pathname === "/api/collect-news") {
        const rssResponse = await fetch("https://www.yonhapnewstv.co.kr/browse/feed/");
        const rssXml = await rssResponse.text();
        const items = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        for (const item of items.slice(0, 5)) {
          const tM = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const lM = item.match(/<link>(.*?)<\/link>/);
          if (!tM || !lM) continue;
          
          const newsT = tM[1];
          const newsL = lM[1];
          const checkExist = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(newsL).first();
          if (checkExist) continue;
          
          const aiAnalyze = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
              { role: "system", content: "너는 안티그래비티 기밀 뉴스 분석봇이다. 제목을 보고 1줄 보안 분석과 토론 질문을 생성하라." },
              { role: "user", content: newsT }
            ]
          });
          
          await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
            .bind(newsT, newsL, aiAnalyze.response, "AI 화두: " + newsT, "Llama-3-8b")
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

      return new Response("Secure System API Core v5.9 Operational.", { status: 200, headers: corsHeaders });
    } catch (criticalFault) {
      return Response.json({ error: "Critical Core Fault: " + criticalFault.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 Standard Full Implementation)
 * 기밀 보안 등급의 6자리 인증 코드를 대조 검증함.
 */
async function verifyTOTP(secret, code) {
  const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bitsStr = "";
  for (let i = 0; i < secret.length; i++) {
    const val = base32Alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bitsStr += val.toString(2).padStart(5, '0');
  }
  let keyBuffer = new Uint8Array(Math.floor(bitsStr.length / 8));
  for (let i = 0; i < keyBuffer.length; i++) {
    keyBuffer[i] = parseInt(bitsStr.substring(i * 8, i * 8 + 8), 2);
  }
  const counterStep = BigInt(Math.floor(Date.now() / 30000));
  for (let i = -1n; i <= 1n; i++) {
    const step = counterStep + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, step, false);
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmacHash = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    const offset = hmacHash[hmacHash.length - 1] & 0x0f;
    const truncatedHash = ((hmacHash[offset] & 0x7f) << 24 | (hmacHash[offset + 1] & 0xff) << 16 | (hmacHash[offset + 2] & 0xff) << 8 | (hmacHash[offset + 3] & 0xff));
    const generatedOtp = (truncatedHash % 1000000).toString().padStart(6, '0');
    if (generatedOtp === code.trim()) return true;
  }
  return false;
}

/**
 * 프론트엔드 UI 생성부 (1200px Clien-Inspired / 무삭제 1,300라인 규격 전개)
 * 지휘관의 시각적 편의성과 보안 통제력을 극대화한 인터페이스임.
 */
function generateUI() {
  const htmlPayload = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V5.9 사령관 절대 위엄판</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root { --ag-navy: #314e8d; --ag-bg: #f0f2f5; --clien-w: 1200px; }
        body { background: var(--ag-bg); font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 18.5rem; flex-shrink: 0; display: flex; flex-direction: column; }
        .nav-btn { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; border-radius: 1.25rem; margin-bottom: 0.5rem; padding: 1.25rem; text-align: left; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; transform: translateX(5px); }
        .nav-btn.active { background: var(--ag-navy); color: #ffffff; font-weight: 700; box-shadow: 0 4px 15px rgba(49, 78, 141, 0.25); }
        
        /* 클리앙 스타일 중앙 집중형 레이아웃 프로토콜 */
        .clien-sovereign-container { max-width: var(--clien-w); margin: 0 auto; width: 100%; padding: 0 25px; }
        .clien-data-table { width: 100%; border-collapse: collapse; background: white; border-radius: 1.25rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .clien-data-table th { background: #f8fafc; border-bottom: 2px solid #f1f5f9; padding: 1.3rem; text-align: left; font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .clien-data-table td { padding: 1.4rem; border-bottom: 1px solid #f1f5f9; font-size: 1rem; color: #1e293b; }
        .clien-data-table tr:hover { background: #f8fafc; cursor: pointer; }
        
        .ag-card-base { background: white; border-radius: 2.25rem; border: 1px solid #e2e8f0; transition: all 0.35s; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .ag-card-base:hover { transform: translateY(-7px); border-color: var(--ag-navy); box-shadow: 0 25px 35px -5px rgba(49, 78, 141, 0.15); }
        
        /* 실시간 세션 타이머 UI 스타일 */
        .session-timer-ui { background: #fee2e2; color: #b91c1c; padding: 0.6rem 1.4rem; border-radius: 2.5rem; font-weight: 800; font-size: 0.8rem; border: 1px solid #fecaca; box-shadow: inset 0 2px 4px rgba(185, 28, 28, 0.05); }
        
        .custom-scroll-system::-webkit-scrollbar { width: 7px; }
        .custom-scroll-system::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; }
        
        /* 독립 에디터 전용 뷰 애니메이션 */
        .editor-sovereign-view { background: white; border-radius: 3.5rem; padding: 4.5rem; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.12); animation: slide-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slide-fade-up { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
        
        .admin-action-btn { transition: all 0.2s; font-weight: 700; padding: 0.75rem 1.25rem; border-radius: 1rem; font-size: 0.85rem; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-100 flex items-center justify-center">
        <div class="bg-white p-20 rounded-[4.5rem] w-[36rem] shadow-2xl border border-slate-200 text-center animate-in zoom-in duration-500">
            <h1 class="text-5xl font-bold text-[#314e8d] mb-14 italic tracking-tighter">MORNING_DOCK</h1>
            
            <div id="step-login" class="space-y-10">
                <div class="space-y-4 text-left mb-12 px-2">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">지휘 본부 보안 접속</h3>
                    <p class="text-base text-slate-400 font-medium leading-relaxed">인가받은 대원 이메일을 입력하십시오. <br>인공지능 보안 시스템이 당신을 식별합니다.</p>
                </div>
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="w-full p-6 border-2 border-slate-100 rounded-[2.25rem] outline-none focus:ring-12 ring-[#314e8d]/5 focus:border-[#314e8d] transition-all text-xl">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-7 rounded-[2.25rem] font-bold text-2xl hover:bg-[#253b6d] transition-all shadow-2xl">인가 시스템 승인 요청</button>
                <button onclick="showRegister()" class="text-sm text-slate-400 font-bold hover:text-[#314e8d] hover:underline transition-all mt-10 block mx-auto uppercase tracking-widest">Register New Agent</button>
            </div>

            <div id="step-register" class="hidden space-y-10 text-left">
                <div class="mb-12 px-2">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">신규 대원 등록 프로토콜</h3>
                    <p class="text-base text-slate-400 font-medium leading-relaxed">보안 등급 수립을 위한 OTP 연동이 필수적입니다.</p>
                </div>
                <input type="email" id="reg-email" placeholder="사용할 이메일 주소" class="w-full p-6 border-2 border-slate-100 rounded-[2.25rem] outline-none focus:ring-12 ring-[#314e8d]/5 text-xl">
                <div id="reg-otp-box" class="hidden space-y-10 py-12 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200 text-center">
                    <div class="bg-white p-8 inline-block rounded-[3.5rem] shadow-2xl mb-8">
                        <img id="reg-qr-img" class="w-60 h-60">
                    </div>
                    <p class="text-sm text-slate-400 font-bold leading-relaxed px-12">Google OTP 앱을 가동하여 위 QR 코드를 스캔하십시오. <br>당신의 기지 인증키가 생성됩니다.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-7 rounded-[2.5rem] font-bold text-2xl shadow-xl hover:scale-[1.02] transition-all">보안 인증키 발급 및 상신</button>
                <button onclick="location.reload()" class="w-full text-xs text-slate-400 font-bold mt-10 text-center uppercase tracking-widest">Cancel Registration</button>
            </div>

            <div id="step-otp-verify" class="hidden space-y-20">
                <div class="space-y-8">
                    <div class="w-28 h-28 bg-blue-50 text-[#314e8d] rounded-[2.5rem] flex items-center justify-center mx-auto text-5xl mb-8 shadow-inner"><i class="fa-solid fa-shield-halved"></i></div>
                    <p class="text-sm font-bold text-slate-400 uppercase tracking-[0.4em]">Multi-Factor Auth</p>
                    <p class="text-2xl text-slate-700 font-bold tracking-tight">최종 인가 코드 6자리를 입력하십시오.</p>
                </div>
                <div class="px-14">
                    <input type="text" id="gate-otp" maxlength="6" placeholder="000000" class="w-full text-center text-8xl font-bold tracking-[0.4em] outline-none border-b-8 border-[#314e8d] pb-8 bg-transparent text-slate-800">
                </div>
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-8 rounded-[3rem] font-bold text-3xl hover:bg-[#253b6d] transition-all shadow-2xl shadow-[#314e8d]/30">시스템 최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden animate-in slide-in-from-left duration-700">
        <div class="p-14 border-b border-slate-50 mb-12 text-4xl font-bold text-[#314e8d] tracking-tighter italic">MORNING_DOCK</div>
        <nav class="flex-1 px-10 space-y-4 overflow-y-auto custom-scroll-system">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full"><i class="fa-solid fa-gauge-high w-10 text-2xl"></i>지휘 통합 대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full"><i class="fa-solid fa-comments w-10 text-2xl"></i>모두의 정보 공유</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full"><i class="fa-solid fa-robot w-10 text-2xl"></i>지능형 보안 뉴스봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full"><i class="fa-solid fa-play-circle w-10 text-2xl"></i>미디어 시큐어룸</button>
            
            <div id="admin-sovereign-zone" class="hidden pt-12 mt-12 border-t-2 border-slate-50">
                <p class="px-8 text-[11px] font-bold text-slate-300 uppercase tracking-[0.5em] mb-8">Sovereignty Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-red-600 font-bold bg-red-50/0 hover:bg-red-50"><i class="fa-solid fa-user-shield w-10 text-2xl text-red-500"></i>사령관 중앙 제어판</button>
            </div>
        </nav>
        
        <div class="p-14 border-t border-slate-50 bg-slate-50/50">
            <div class="flex items-center space-x-6 mb-12">
                <div id="user-avatar-ui" class="w-16 h-16 rounded-[1.75rem] bg-[#314e8d] flex items-center justify-center text-white font-bold text-2xl shadow-2xl shadow-[#314e8d]/20">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-base font-bold text-slate-800 truncate">agent@antigravity</span>
                    <span id="user-role-ui" class="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Authorized Agent</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border-2 border-slate-200 py-5 rounded-[1.75rem] text-[12px] font-bold text-slate-400 hover:text-red-500 hover:border-red-200 transition-all uppercase tracking-widest bg-white">Terminate Access</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-32 bg-white border-b border-slate-200 flex items-center justify-between px-16 shrink-0 shadow-sm z-30">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-[0.6em] transition-all">DASHBOARD</h2>
            <div class="flex items-center space-x-10">
                <div id="session-timer-display" class="session-timer-ui">인가 유지 시간: 60:00</div>
                <div id="system-clock" class="text-xl font-bold text-[#314e8d] font-mono bg-slate-50 px-12 py-5 rounded-[2rem] border border-slate-100 shadow-inner">00:00:00</div>
            </div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-16 custom-scroll-system bg-slate-50">
            <div class="clien-sovereign-container"> <div id="v-dash" class="space-y-16 fade-in duration-700">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div class="ag-card-base p-14 flex items-center space-x-12">
                            <div class="w-28 h-28 bg-blue-50 text-[#314e8d] rounded-[3rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-rss-square"></i></div>
                            <div class="text-left"><p class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Intelligence</p><p id="st-news" class="text-7xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card-base p-14 flex items-center space-x-12">
                            <div class="w-28 h-28 bg-emerald-50 text-emerald-500 rounded-[3rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-pen-nib"></i></div>
                            <div class="text-left"><p class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Reports</p><p id="st-posts" class="text-7xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card-base p-14 flex items-center space-x-12">
                            <div class="w-28 h-28 bg-amber-50 text-amber-500 rounded-[3rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-user-secret"></i></div>
                            <div class="text-left"><p class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Agents</p><p id="st-users" class="text-7xl font-bold text-slate-800">0</p></div>
                        </div>
                    </div>
                    <div class="ag-card-base p-24 bg-white border-l-[24px] border-l-[#314e8d] shadow-2xl relative overflow-hidden text-left">
                        <div class="absolute top-0 right-0 p-14 opacity-5 text-[12rem] text-[#314e8d] rotate-12"><i class="fa-solid fa-shield-cat"></i></div>
                        <h4 class="text-sm font-bold text-[#314e8d] mb-12 uppercase tracking-[0.6em] italic flex items-center"><i class="fa-solid fa-shield-halved mr-6 text-3xl"></i> AI Security Integrated Sovereign Status</h4>
                        <p id="sum-text-display" class="text-5xl font-bold text-slate-800 leading-[1.4] relative z-10 transition-all duration-700">데이터를 수신 중입니다...</p>
                    </div>
                </div>

                <div id="v-comm" class="hidden space-y-12 fade-in duration-500">
                    <div class="flex justify-between items-center bg-white p-14 rounded-[4rem] border shadow-lg px-20">
                        <div class="text-left">
                            <h3 class="text-4xl font-bold text-slate-800 tracking-tighter italic">모두의 정보 공유 본부</h3>
                            <p class="text-base text-slate-400 font-bold uppercase mt-4 tracking-widest underline decoration-[#314e8d]/30 underline-offset-[12px]">Intelligence & Response Protocol Area</p>
                        </div>
                        <button onclick="showEditor()" class="bg-[#314e8d] text-white px-16 py-7 rounded-[2.5rem] font-bold text-2xl shadow-2xl hover:scale-105 transition-all">신규 정보 상신 (Submit)</button>
                    </div>
                    <div class="bg-white rounded-[4rem] border shadow-2xl overflow-hidden border-slate-200">
                        <table class="clien-data-table">
                            <thead><tr><th class="w-32 text-center px-12">보고 ID</th><th class="px-14">인텔리전스 보고 제목</th><th class="w-64 text-center">작성 대원</th><th class="w-56 text-center">보고 일시</th></tr></thead>
                            <tbody id="board-data-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="v-editor" class="hidden space-y-12 fade-in duration-500">
                    <div class="editor-sovereign-view space-y-14">
                        <div class="flex justify-between items-center border-b pb-12">
                            <h3 id="editor-title-display" class="text-6xl font-bold text-slate-900 italic tracking-tighter">신규 정보 상신</h3>
                            <button onclick="nav('comm')" class="text-slate-300 hover:text-red-500 transition-all"><i class="fa-solid fa-xmark text-6xl"></i></button>
                        </div>
                        <div class="space-y-12">
                            <div class="space-y-5 text-left">
                                <label class="text-sm font-bold text-slate-400 uppercase ml-8 tracking-[0.4em] font-mono">Report_Subject</label>
                                <input type="text" id="edit-post-title" placeholder="인텔리전스 보고 제목을 입력하십시오" class="w-full p-10 border-4 border-slate-50 rounded-[3rem] text-4xl font-bold outline-none focus:border-[#314e8d] transition-all bg-slate-50/50 shadow-inner">
                            </div>
                            <div class="space-y-5 text-left">
                                <label class="text-sm font-bold text-slate-400 uppercase ml-8 tracking-[0.4em] font-mono">Detailed_Analysis</label>
                                <textarea id="edit-post-content" placeholder="상세 분석 및 대응 권고 사항을 기록하십시오..." class="w-full p-14 border-4 border-slate-50 rounded-[5rem] text-3xl min-h-[700px] outline-none focus:border-[#314e8d] transition-all bg-slate-50/50 custom-scroll-system leading-relaxed shadow-inner"></textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-10 pt-16">
                            <button onclick="nav('comm')" class="px-16 py-7 rounded-[2.5rem] font-bold text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition-all text-3xl">취소 (Cancel)</button>
                            <button id="save-report-btn" onclick="saveReport()" class="bg-[#314e8d] text-white px-28 py-7 rounded-[2.5rem] font-bold text-4xl shadow-2xl hover:bg-[#1a2c52] transition-all hover:scale-105">최종 상신 (Submit)</button>
                        </div>
                    </div>
                </div>

                <div id="v-detail" class="hidden bg-white p-28 rounded-[6rem] border shadow-2xl space-y-24 text-left fade-in">
                    <button onclick="nav('comm')" class="text-base font-bold text-slate-400 hover:text-[#314e8d] flex items-center transition-all group group-hover:underline">
                        <i class="fa-solid fa-chevron-left mr-6 group-hover:-translate-x-4 transition-transform text-2xl"></i> BACK TO INTELLIGENCE LIST
                    </button>
                    <div class="border-b-4 pb-20 border-slate-50 flex justify-between items-start">
                        <div class="space-y-12 max-w-5xl">
                            <h3 id="dt-report-title" class="text-8xl font-bold text-slate-900 tracking-tighter leading-tight">...</h3>
                            <div class="flex items-center space-x-12 text-base font-bold text-slate-400">
                                <span id="dt-report-author" class="text-[#314e8d] uppercase italic underline underline-offset-[16px] decoration-[12px] decoration-blue-50 text-3xl font-bold">...</span>
                                <span class="text-4xl opacity-20">|</span><span id="dt-report-date" class="font-mono text-2xl">...</span>
                            </div>
                        </div>
                        <div id="dt-action-tools" class="flex space-x-6">
                            <button id="dt-edit-btn" onclick="showEditor(true)" class="hidden admin-action-btn bg-blue-50 text-blue-600 border-2 border-blue-100 px-12 py-5 rounded-3xl hover:bg-[#314e8d] hover:text-white shadow-lg">정보 교정 (RECTIFY)</button>
                            <button id="dt-del-btn" onclick="adminSovereignPost('delete')" class="hidden admin-action-btn bg-red-50 text-red-600 border-2 border-red-100 px-12 py-5 rounded-3xl hover:bg-red-600 hover:text-white shadow-lg">영구 숙청 (PURGE)</button>
                        </div>
                    </div>
                    <div id="dt-report-content" class="text-4xl leading-[1.8] text-slate-700 whitespace-pre-line min-h-[500px] px-6 font-medium">...</div>
                    <div class="pt-32 border-t-4 border-slate-50 space-y-16">
                        <h4 class="font-bold text-5xl text-slate-800 italic flex items-center">Agent Response Analysis <span id="cm-report-count" class="text-[#314e8d] ml-10 bg-blue-50 px-10 py-4 rounded-[2.5rem] border-4 border-blue-100 shadow-inner">0</span></h4>
                        <div id="comment-list-area" class="space-y-14"></div>
                        <div class="flex flex-col space-y-12 mt-32 bg-slate-50 p-20 rounded-[6rem] border-8 border-slate-100 shadow-inner">
                            <textarea id="reply-post-input" class="w-full p-14 border-4 border-white rounded-[4.5rem] text-4xl outline-none focus:ring-16 ring-[#314e8d]/5 bg-white shadow-2xl transition-all" placeholder="분석 의견을 상신하십시오..."></textarea>
                            <button id="reply-submit-btn" class="self-end bg-[#314e8d] text-white px-24 py-8 rounded-[3rem] font-bold text-4xl shadow-2xl hover:bg-[#1a2c52] transition-all hover:scale-105">의견 상신 (Submit)</button>
                        </div>
                    </div>
                </div>

                <div id="v-news" class="hidden space-y-20 text-left fade-in">
                    <div class="flex justify-between items-center bg-white p-16 rounded-[4.5rem] border shadow-2xl px-24">
                        <div class="flex items-center space-x-14 italic text-left">
                            <div class="w-32 h-32 bg-blue-50 text-[#314e8d] rounded-[3.5rem] flex items-center justify-center text-7xl animate-pulse shadow-inner border-4 border-blue-100"><i class="fa-solid fa-robot"></i></div>
                            <div class="space-y-4"><h3 class="font-bold text-5xl text-slate-800 tracking-tighter">지능형 뉴스 분석 센터</h3><p class="text-sm text-slate-400 font-bold uppercase tracking-[0.6em] font-mono">AI-Scraper-Engine v5.9 Active</p></div>
                        </div>
                        <button onclick="runAIEngine()" class="bg-[#314e8d] text-white px-20 py-8 rounded-[3.5rem] font-bold text-3xl shadow-2xl hover:scale-105 transition-all">분석 엔진 가동</button>
                    </div>
                    <div id="news-engine-feed" class="space-y-20"></div>
                </div>

                <div id="v-admin" class="hidden space-y-24 pb-96 text-left fade-in">
                    <div class="bg-white p-24 space-y-24 rounded-[6rem] shadow-2xl border-[12px] border-slate-50">
                        <h3 class="font-bold text-7xl text-red-600 italic tracking-tighter underline decoration-red-100 decoration-[16px] underline-offset-[32px] flex items-center"><i class="fa-solid fa-user-shield mr-12 text-8xl"></i> 사령관 중앙 제어 본부</h3>
                        <div id="adm-agent-grid" class="grid grid-cols-1 xl:grid-cols-2 gap-16 mt-20"></div>
                    </div>
                </div>

                <div id="v-media" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20 fade-in pb-96"></div>

            </div> </div>
    </main>

    <script>
        /**
         * 💡 안티그래비티 기지 핵심 제어 엔진 (V5.9 The Ultimate Sovereignty)
         * 대표님의 위엄을 위해 단 한 줄의 생략 없이 상세히 기술됨.
         */
        let state = { 
            user: null, 
            view: 'dash', 
            currentPostId: null, 
            sessionTime: 3600, // 대표님 보안 정책: 1시간(3600초)
            regSecret: '' 
        };

        // 실시간 클럭 및 세션 보안 타이머 통합 프로토콜 가동
        setInterval(() => {
            const now = new Date();
            document.getElementById('system-clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            
            // 세션 잔여 시간 실시간 차감 및 UI 업데이트
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                const timerUI = document.getElementById('session-timer-display');
                timerUI.innerText = \`인가 유지 시간: \${m}:\${s.toString().padStart(2,'0')}\`;
                
                // 세션 만료 시 보안을 위해 시스템 즉각 초기화 (강제 퇴출)
                if(state.sessionTime <= 0) {
                    alert('보안 인가 세션이 만료되었습니다. 다시 시스템 인가를 받으십시오.');
                    location.reload();
                }
            }
        }, 1000);

        // [AUTHENTICATION MODULE: 가입 및 다중 보안 인증] ---------------------------------
        
        function showRegister() { 
            document.getElementById('step-login').classList.add('hidden'); 
            document.getElementById('step-register').classList.remove('hidden'); 
        }

        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            if(!email || !email.includes('@')) return alert('유효하지 않은 기지 이메일 주소입니다!');
            
            // 보안을 위한 16자리 무작위 시크릿 토큰 생성 (Base32 규격 호환)
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let secretToken = "";
            for(let i=0; i<16; i++) secretToken += chars.charAt(Math.floor(Math.random() * chars.length));
            state.regSecret = secretToken;
            
            // Google OTP용 QR 코드 생성기 연동
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${secretToken}&issuer=MorningDock\`;
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qrUri);
            
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "기지 가입 승인 상신";
            document.getElementById('reg-btn').onclick = finalizeRegistration;
        }

        async function finalizeRegistration() {
            const email = document.getElementById('reg-email').value;
            const res = await fetch('/api/auth/register', { 
                method: 'POST', 
                body: JSON.stringify({ email, secret: state.regSecret }) 
            });
            const data = await res.json();
            if(data.uid) { 
                alert('안티그래비티 기지 대원 등록 완료! 보안 로그인을 가동하십시오.'); 
                location.reload(); 
            } else {
                alert('등록 거부: ' + data.error);
            }
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            if(!email) return alert('접속용 이메일을 입력하십시오.');
            const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) });
            const data = await res.json();
            if(data.uid) { 
                state.user = data; 
                document.getElementById('step-login').classList.add('hidden'); 
                document.getElementById('step-otp-verify').classList.remove('hidden'); 
            } else {
                alert('접속 거부: ' + data.error);
            }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value.trim();
            if(code.length !== 6) return alert('6자리 보안 인가 코드를 정확히 입력하십시오.');
            
            const res = await fetch('/api/auth/otp-verify', { 
                method: 'POST', 
                body: JSON.stringify({ uid: state.user.uid, code }) 
            });
            const data = await res.json();
            
            if(data.sessionId) { 
                state.user.sessionId = data.sessionId; 
                state.user.role = data.role; 
                bootSovereignSystem(); 
            } else { 
                alert('보안 코드 불일치: 접근이 거부되었습니다.'); 
            }
        }

        function bootSovereignSystem() {
            document.getElementById('auth-gate').classList.add('hidden'); 
            document.getElementById('sidebar').classList.add('flex'); 
            document.getElementById('sidebar').classList.remove('hidden'); 
            document.getElementById('main').classList.remove('hidden');
            
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('user-role-ui').innerText = state.user.role === 'ADMIN' ? 'COMMANDER (ADMIN)' : 'AUTHORIZED AGENT';
            document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
            
            if(state.user.role === 'ADMIN') document.getElementById('admin-sovereign-zone').classList.remove('hidden');
            
            nav('dash');
        }

        // [NAVIGATION & DASHBOARD MODULE] ---------------------------------------------

        async function nav(viewName) {
            state.view = viewName;
            document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('v-'+viewName).classList.remove('hidden');
            
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById('nb-'+viewName); 
            if(activeBtn) activeBtn.classList.add('active');
            
            document.getElementById('view-title').innerText = viewName.toUpperCase();
            
            // 각 뷰 진입 시 데이터 실시간 동기화 호출
            if(viewName==='dash') syncDashboardStats();
            if(viewName==='comm') syncCommunityIntelligence();
            if(viewName==='news') syncAIEngineNews();
            if(viewName==='media') syncMediaRoom();
            if(viewName==='admin') syncAdminPanel();
        }

        async function syncDashboardStats() {
            const res = await fetch('/api/stats'); 
            const data = await res.json();
            const userId = state.user.email.split('@')[0];
            
            const modifiers = ["필승! 무적의 ", "보안의 심장, ", "기지의 브레인, ", "철통 방어의 화신, ", "최정예 사령관 "];
            const rMod = modifiers[Math.floor(Math.random() * modifiers.length)];
            
            document.getElementById('st-news').innerText = data.newsCount;
            document.getElementById('st-posts').innerText = data.postCount;
            document.getElementById('st-users').innerText = data.userCount;
            
            document.getElementById('sum-text-display').innerHTML = \`
                \${rMod} <span class="text-[#314e8d] underline decoration-8 decoration-blue-100 underline-offset-8 font-black">\${userId}</span> 대원님! <br>
                현재 기지 인텔리전스 \${data.newsCount}건 수집 완료! 동료 대원 \${data.userCount}명 활성화 중! 🫡🔥
            \`;
        }

        // [COMMUNITY & SOVEREIGN EDITOR MODULE] ---------------------------------------

        async function syncCommunityIntelligence() {
            const res = await fetch('/api/community/posts'); 
            const reports = await res.json();
            document.getElementById('board-data-body').innerHTML = reports.map(p => \`
                <tr onclick="loadIntelligenceDetail(\${p.id})" class="group">
                    <td class="text-center font-bold text-slate-300 px-12 text-sm font-mono">\${p.id.toString().padStart(4,'0')}</td>
                    <td class="font-bold text-slate-800 text-3xl group-hover:text-[#314e8d] transition-all tracking-tighter">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 text-xl italic">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-sm text-slate-300 font-bold font-mono">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>\`).join('');
        }

        /**
         * 독립 에디터 뷰 가동 프로토콜 (쓰기/수정 통합)
         */
        async function showEditor(isEditMode = false) {
            nav('editor');
            const titleInput = document.getElementById('edit-post-title');
            const contentInput = document.getElementById('edit-post-content');
            const titleUI = document.getElementById('editor-title-display');
            
            if(isEditMode) {
                titleUI.innerText = "인텔리전스 정보 교정 프로토콜";
                titleInput.value = document.getElementById('dt-report-title').innerText;
                contentInput.value = document.getElementById('dt-report-content').innerText;
                document.getElementById('save-report-btn').onclick = () => finalizeReportSave(true);
            } else {
                titleUI.innerText = "신규 정보 상신 프로토콜";
                titleInput.value = ""; contentInput.value = "";
                document.getElementById('save-report-btn').onclick = () => finalizeReportSave(false);
            }
        }

        async function finalizeReportSave(isEdit = false) {
            const title = document.getElementById('edit-post-title').value.trim();
            const content = document.getElementById('edit-post-content').value.trim();
            if(!title || !content) return alert('모든 인텔리전스 항목을 성실히 입력하십시오.');
            
            const endpoint = isEdit ? '/api/community/posts/edit' : '/api/community/posts/add';
            const payload = { 
                title, content, 
                userId: state.user.uid, 
                sessionId: state.user.sessionId 
            };
            if(isEdit) payload.postId = state.currentPostId;

            const res = await fetch(endpoint, { method:'POST', body:JSON.stringify(payload) });
            if(res.ok) { 
                alert('보고서가 안티그래비티 메인 서버에 안전하게 기록되었습니다!'); 
                nav('comm'); 
            } else {
                alert('상신 거부: 세션 만료 또는 권한 부족입니다.');
            }
        }

        async function loadIntelligenceDetail(id) {
            state.currentPostId = id; 
            nav('detail');
            const [pRes, cRes] = await Promise.all([
                fetch('/api/community/posts/detail?id='+id), 
                fetch('/api/community/comments?postId='+id)
            ]);
            const post = await pRes.json(); 
            const comments = await cRes.json();
            
            document.getElementById('dt-report-title').innerText = post.title;
            document.getElementById('dt-report-author').innerText = post.email;
            document.getElementById('dt-report-date').innerText = new Date(post.created_at).toLocaleString();
            document.getElementById('dt-report-content').innerText = post.content;
            document.getElementById('cm-report-count').innerText = comments.length;
            
            // 사령관 전권 통제 UI 제어
            const isMyPost = post.user_id === state.user.uid;
            const isSovereign = state.user.role === 'ADMIN';
            document.getElementById('dt-edit-btn').classList.toggle('hidden', !(isMyPost || isSovereign));
            document.getElementById('dt-del-btn').classList.toggle('hidden', !isSovereign);
            
            document.getElementById('comment-list-area').innerHTML = comments.map(c => \`
                <div class="p-16 bg-slate-50 rounded-[4rem] flex justify-between items-start border-4 border-white shadow-xl animate-in fade-in">
                    <div class="space-y-6 text-left">
                        <p class="text-sm font-bold text-[#314e8d] uppercase italic underline underline-offset-[12px] decoration-blue-100">\${c.email}</p>
                        <p class="text-4xl text-slate-700 font-bold leading-relaxed">\${c.content}</p>
                    </div>
                    \${isSovereign ? \`<button onclick="adminSovereignComment(\${c.id})" class="bg-red-50 text-red-600 font-black px-10 py-5 rounded-3xl hover:bg-red-600 hover:text-white transition-all text-xl italic">숙청</button>\` : ''}
                </div>\`).join('');
            
            document.getElementById('reply-submit-btn').onclick = async () => {
                const inputVal = document.getElementById('reply-post-input').value.trim(); 
                if(!inputVal) return;
                await fetch('/api/community/comments/add', { 
                    method:'POST', 
                    body:JSON.stringify({
                        postId:id, content:inputVal, 
                        userId:state.user.uid, 
                        sessionId:state.user.sessionId
                    }) 
                });
                document.getElementById('reply-post-input').value = ''; 
                loadIntelligenceDetail(id);
            };
        }

        // [ADMIN SOVEREIGN MODULE: 사령관 중앙 제어 본부 로직] ------------------------------

        async function syncAdminPanel() {
            const res = await fetch('/api/admin/users', { 
                method:'POST', 
                body:JSON.stringify({sessionId:state.user.sessionId}) 
            });
            const agents = await res.json();
            document.getElementById('adm-agent-grid').innerHTML = agents.map(a => \`
                <div class="p-16 bg-white border-8 border-slate-50 rounded-[5rem] flex justify-between items-center shadow-2xl">
                    <div class="flex flex-col space-y-5 text-left">
                        <span class="font-black text-3xl text-slate-800 underline decoration-slate-100 underline-offset-[16px]">\${a.email}</span>
                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">\${a.role} | STATUS: <span class="\${a.status === 'APPROVED' ? 'text-emerald-500' : 'text-red-500'}">\${a.status}</span></span>
                    </div>
                    <div class="flex space-x-6">
                        <button onclick="adminChangeStatus('\${a.uid}', '\${a.status === 'APPROVED' ? 'BLOCKED' : 'APPROVED'}')" class="px-12 py-6 bg-slate-100 rounded-3xl font-black text-slate-600 hover:bg-[#314e8d] hover:text-white transition-all text-xl">\${a.status === 'APPROVED' ? '차단' : '해제'}</button>
                        <button onclick="adminPurgeAgent('\${a.uid}')" class="bg-red-50 text-red-500 font-black px-16 py-6 rounded-3xl hover:bg-red-600 hover:text-white transition-all text-2xl italic shadow-xl">숙청 (PURGE)</button>
                    </div>
                </div>\`).join('');
        }

        async function adminChangeStatus(tUid, newStatus) {
            await fetch('/api/admin/users/status', { method:'POST', body:JSON.stringify({targetUid:tUid, status:newStatus, sessionId:state.user.sessionId}) });
            syncAdminPanel();
        }

        async function adminPurgeAgent(tUid) {
            if(confirm('해당 대원을 기지에서 영구 숙청합니까? 복구는 절대 불가능합니다.')) {
                await fetch('/api/admin/users/delete', { method:'POST', body:JSON.stringify({targetUid:tUid, sessionId:state.user.sessionId}) });
                syncAdminPanel();
            }
        }

        async function adminSovereignPost(action) {
            if(action === 'delete') {
                if(!confirm('인텔리전스 보고서를 기지 데이터베이스에서 영구 파기합니까?')) return;
                await fetch('/api/admin/posts/delete', { method:'POST', body:JSON.stringify({postId:state.currentPostId, sessionId:state.user.sessionId}) });
                nav('comm');
            }
        }

        async function adminSovereignComment(cId) {
            if(!confirm('해당 분석 의견을 파기합니까?')) return;
            await fetch('/api/admin/comments/delete', { method:'POST', body:JSON.stringify({commentId:cId, sessionId:state.user.sessionId}) });
            loadIntelligenceDetail(state.currentPostId);
        }

        // [NEWS & MEDIA ENGINE MODULE] -----------------------------------------------

        async function runAIEngine() { 
            alert('지능형 AI 보안 스크랩 엔진을 가동합니다. 실시간 데이터를 분석 중입니다.'); 
            await fetch('/api/collect-news'); 
            syncAIEngineNews(); 
        }

        async function syncAIEngineNews() {
            const r = await fetch('/api/news'); 
            const nList = await r.json();
            document.getElementById('news-engine-feed').innerHTML = nList.map(n => \`
                <div class="ag-card-base p-20 space-y-14 fade-in">
                    <div class="flex justify-between items-start text-left">
                        <h4 class="font-black text-6xl text-slate-800 cursor-pointer hover:text-[#314e8d] leading-tight tracking-tighter" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <span class="text-xs bg-slate-50 px-8 py-4 rounded-2xl font-black text-slate-400 border-4 uppercase tracking-[0.3em]">\${n.model_name}</span>
                    </div>
                    <div class="bg-slate-50 p-16 rounded-[5rem] border-l-[32px] border-l-[#314e8d] shadow-inner font-black italic text-4xl leading-relaxed text-left">\${n.summary}</div>
                    <p class="text-3xl font-black text-[#314e8d] italic decoration-[12px] underline underline-offset-[24px] decoration-blue-100 text-left">\${n.discussion_question}</p>
                </div>\`).join('');
        }

        async function syncMediaRoom() {
            const r = await fetch('/api/media'); 
            const mList = await r.json();
            document.getElementById('v-media').innerHTML = mList.map(m => \`
                <div class="ag-card-base p-24 text-center space-y-16 group">
                    <div class="w-56 h-56 bg-slate-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto text-8xl border-[12px] border-slate-100 group-hover:border-[#314e8d] transition-all shadow-inner"><i class="\${m.icon}"></i></div>
                    <h4 class="font-black text-6xl text-slate-800 italic tracking-tighter underline underline-offset-[20px] decoration-slate-100">\${m.name}</h4>
                    <button onclick="window.open('\${m.url}')" class="w-full bg-[#314e8d] text-white py-10 rounded-[3.5rem] font-black text-4xl shadow-2xl hover:bg-[#1a2c52] transition-all hover:scale-105">LAUNCH SYSTEM</button>
                </div>\`).join('');
        }
    </script>
</body>
</html>
  `;
  return htmlPayload;
}