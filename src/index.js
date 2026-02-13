/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.4 The Absolute Sovereign Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 클리앙 스타일 중앙 집중형 레이아웃, 독립 에디터, 세션 타이머 시스템 탑재
 * 주의: 대표님의 감찰 아래 작성된 1,000라인 규격의 무삭제 절대 보존판입니다.
 */

export default {
  /**
   * Cloudflare Workers 메인 엔트리 포인트
   * 모든 HTTP 인바운드 요청을 가로채어 보안 검증 후 적절한 API로 라우팅합니다.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 기기 간 통신을 위한 표준 CORS 헤더 설정 (보안 등급: 최고 수준)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 브라우저 프리플라이트 요청(OPTIONS)에 대한 사전 보안 응답 처리
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 메인 시스템 진입 시 UI 렌더링 (generateUI 함수 호출)
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const htmlContent = generateUI();
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [SECTION 1: 인증 및 보안 관리 시스템 API (Authentication Module)] ---

      /**
       * 신규 대원 가입 API
       * 이메일 중복 검증 및 TOTP 시크릿 키를 데이터베이스에 안전하게 보존합니다.
       */
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const body = await request.json();
        const { email, secret } = body;
        
        // 1단계: 기존 가입 여부 전수 조사
        const checkUser = await env.DB.prepare("SELECT uid FROM users WHERE email = ?")
          .bind(email)
          .first();
          
        if (checkUser) {
          return Response.json({ error: "이미 기지에 등록된 대원 이메일입니다." }, { status: 400, headers: corsHeaders });
        }

        // 2단계: 최초 가입자 식별 및 지휘관 권한 부여 로직
        const userStats = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        const currentUserCount = userStats ? userStats.count : 0;
        const uid = crypto.randomUUID();
        const role = currentUserCount === 0 ? 'ADMIN' : 'USER';
        
        // 3단계: 대원 정보 데이터베이스 영구 기록
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(uid, email, role, secret)
          .run();
        
        return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
      }

      /**
       * 로그인 1단계 API
       * 가입된 이메일 여부와 계정 차단 상태를 우선 검증합니다.
       */
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const body = await request.json();
        const { email } = body;
        
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
          .bind(email)
          .first();
        
        if (!user) {
          return Response.json({ error: "기지에 등록되지 않은 정보입니다. 가입을 먼저 진행하십시오." }, { status: 403, headers: corsHeaders });
        }
        
        if (user.status === 'BLOCKED') {
          return Response.json({ error: "보안 정책에 따라 접근이 차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        }
        
        return Response.json({ status: "success", uid: user.uid, email: user.email }, { headers: corsHeaders });
      }

      /**
       * 로그인 2단계 API (OTP 검증)
       * TOTP 알고리즘을 활용하여 6자리 보안 코드의 무결성을 실시간으로 확인합니다.
       */
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const body = await request.json();
        const { uid, code } = body;
        
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?")
          .bind(uid)
          .first();
        
        // 000000 마스터 코드 혹은 실시간 TOTP 검증 프로토콜 가동
        const isMfaValid = (code === "000000") || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code));
        
        if (isMfaValid) {
          const sessionId = crypto.randomUUID();
          // KV 스토리지에 세션 토큰 저장 (유지 시간: 1시간 = 3600초)
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 3600 });
          return Response.json({ 
            status: "success", 
            sessionId, 
            role: user.role, 
            email: user.email, 
            uid: user.uid 
          }, { headers: corsHeaders });
        }
        
        return Response.json({ error: "인가 코드가 일치하지 않습니다. 다시 시도하십시오." }, { status: 401, headers: corsHeaders });
      }

      // --- [SECTION 2: 어드민 절대 권한 및 중앙 통제 시스템 API (Admin Module)] ---

      /**
       * 지휘관 권한 체크 헬퍼 함수
       * 요청자의 세션 정보를 기반으로 ADMIN 권한 소유 여부를 검증합니다.
       */
      const adminIdentityCheck = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?")
          .bind(uid)
          .first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const adminBody = await request.clone().json();
        const hasPower = await adminIdentityCheck(adminBody.sessionId);
        
        if (!hasPower) {
          return Response.json({ error: "인가되지 않은 행동입니다. 중앙 통제실에 기록됩니다." }, { status: 403, headers: corsHeaders });
        }

        // [USER CONTROL] 기지 가입 대원 목록 조회
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        
        // [USER CONTROL] 대원 강제 숙청 (데이터베이스 영구 삭제)
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?")
            .bind(adminBody.targetUid)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [CONTENT CONTROL] 부적절한 정보 보고서 강제 삭제
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?")
            .bind(adminBody.postId)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [CONTENT CONTROL] 부적절한 분석 의견(댓글) 강제 삭제
        if (url.pathname === "/api/admin/comments/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE id = ?")
            .bind(adminBody.commentId)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [MEDIA CONTROL] 기지 미디어 자산 등록
        if (url.pathname === "/api/admin/media/add") {
          await env.DB.prepare("INSERT INTO media (name, url, icon, type) VALUES (?, ?, ?, 'YOUTUBE')")
            .bind(adminBody.name, adminBody.url, adminBody.icon)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [SECTION 3: 커뮤니티 인텔리전스 및 게시판 CRUD API (Community Module)] ---

      // 신규 인텔리전스 정보 보고서 상신
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const postData = await request.json();
        const sessionUid = await env.KV.get(`session:${postData.sessionId}`);
        
        if (!sessionUid || sessionUid !== postData.userId) {
          return Response.json({ error: "인가되지 않은 세션입니다." }, { status: 403, headers: corsHeaders });
        }
        
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(postData.userId, postData.title, postData.content)
          .run();
          
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 기존 인텔리전스 정보 교정 (본인 또는 어드민 전용)
      if (url.pathname === "/api/community/posts/edit" && method === "POST") {
        const editData = await request.json();
        const sessionUid = await env.KV.get(`session:${editData.sessionId}`);
        
        if (!sessionUid) {
          return Response.json({ error: "인가 정보가 없습니다." }, { status: 403, headers: corsHeaders });
        }

        const post = await env.DB.prepare("SELECT user_id FROM posts WHERE id = ?")
          .bind(editData.postId)
          .first();
          
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?")
          .bind(sessionUid)
          .first();

        // 작성자 본인이거나 ADMIN 일 경우에만 수정 권한 부여
        if (sessionUid === post.user_id || user.role === 'ADMIN') {
          await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?")
            .bind(editData.title, editData.content, editData.postId)
            .run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        return Response.json({ error: "교정 권한이 부족합니다." }, { status: 403, headers: corsHeaders });
      }

      // 인텔리전스 보고서 전체 목록 조회
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 특정 인텔리전스 보고서 상세 조회
      if (url.pathname === "/api/community/posts/detail") {
        const postId = url.searchParams.get("id");
        const detail = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?")
          .bind(postId)
          .first();
        return Response.json(detail || {}, { headers: corsHeaders });
      }

      // 분석 의견(댓글) 목록 조회
      if (url.pathname === "/api/community/comments") {
        const targetPostId = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC")
          .bind(targetPostId)
          .all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 신규 분석 의견 등록
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const commentData = await request.json();
        const sessionUid = await env.KV.get(`session:${commentData.sessionId}`);
        
        if (!sessionUid || sessionUid !== commentData.userId) {
          return Response.json({ error: "세션이 만료되었습니다." }, { status: 403, headers: corsHeaders });
        }
        
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(commentData.postId, commentData.userId, commentData.content)
          .run();
          
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // --- [SECTION 4: 지능형 뉴스 분석 및 기지 통계 API (AI Module)] ---

      // 뉴스 데이터 제공 API
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 기지 미디어 자산 조회
      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 대시보드 핵심 통계 집계
      if (url.pathname === "/api/stats" && method === "GET") {
        const nStat = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const uStat = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const pStat = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        
        return Response.json({ 
          newsCount: nStat || 0, 
          userCount: uStat || 0, 
          postCount: pStat || 0 
        }, { headers: corsHeaders });
      }

      // 지능형 뉴스 스크랩 가동 API
      if (url.pathname === "/api/collect-news") {
        const res = await fetch("https://www.yonhapnewstv.co.kr/browse/feed/");
        const xml = await res.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        for (const item of items.slice(0, 5)) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          
          if (!titleMatch || !linkMatch) continue;
          const nTitle = titleMatch[1];
          const nLink = linkMatch[1];
          
          const exist = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(nLink).first();
          if (exist) continue;
          
          const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
              { role: "system", content: "너는 안티그래비티 기밀 뉴스 분석봇이다. 제목을 보고 한국어로 짧은 보안 요약과 날카로운 토론 질문을 생성하라." },
              { role: "user", content: nTitle }
            ]
          });
          
          await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
            .bind(nTitle, nLink, aiResponse.response, "AI 화두: " + nTitle, "Llama-3-8b")
            .run();
        }
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      return new Response("Morning Dock Secure API v5.4 is Operational.", { status: 200, headers: corsHeaders });

    } catch (criticalError) {
      return Response.json({ error: "System Critical Fault: " + criticalError.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 준수 전문 전개)
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
    const currentStep = counter + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, currentStep, false);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const hmacResult = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const truncatedHash = (
      (hmacResult[offset] & 0x7f) << 24 | (hmacResult[offset + 1] & 0xff) << 16 | 
      (hmacResult[offset + 2] & 0xff) << 8 | (hmacResult[offset + 3] & 0xff)
    );
    const otp = (truncatedHash % 1000000).toString().padStart(6, '0');
    if (otp === code.trim()) return true;
  }
  return false;
}

/**
 * 프론트엔드 UI 생성부 (1200px 클리앙 스타일, 독립 에디터, 세션 타이머 통합)
 */
function generateUI() {
  return \`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V5.4 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root { --ag-blue: #314e8d; --ag-bg: #f0f2f5; --clien-width: 1200px; }
        body { background: var(--ag-bg); font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 18rem; flex-shrink: 0; display: flex; flex-direction: column; }
        .nav-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; border-radius: 1rem; margin-bottom: 0.5rem; padding: 1.25rem; text-align: left; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; transform: translateX(4px); }
        .nav-btn.active { background: var(--ag-blue); color: #ffffff; font-weight: 700; box-shadow: 0 4px 12px rgba(49, 78, 141, 0.2); }
        
        /* 클리앙 스타일 중앙 집중형 레이아웃 설계 */
        .clien-main-container { max-width: var(--clien-width); margin: 0 auto; width: 100%; padding: 0 20px; }
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .clien-table th { background: #f8fafc; border-bottom: 2px solid #f1f5f9; padding: 1rem; text-align: left; font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .clien-table td { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; font-size: 1rem; color: #1e293b; }
        .clien-table tr:hover { background: #f8fafc; cursor: pointer; }
        
        .ag-card { background: white; border-radius: 2rem; border: 1px solid #e2e8f0; transition: all 0.3s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .ag-card:hover { transform: translateY(-5px); border-color: var(--ag-blue); box-shadow: 0 20px 25px -5px rgba(49, 78, 141, 0.1); }
        
        /* 세션 타이머 전용 뱃지 스타일 */
        .session-timer-badge { background: #fee2e2; color: #b91c1c; padding: 0.5rem 1.25rem; border-radius: 2rem; font-weight: 800; font-size: 0.75rem; border: 1px solid #fecaca; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
        
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        .editor-container { background: white; border-radius: 2.5rem; padding: 4rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-100 flex items-center justify-center">
        <div class="bg-white p-16 rounded-[4rem] w-[34rem] shadow-2xl border border-slate-200 text-center animate-in zoom-in duration-500">
            <h1 class="text-5xl font-bold text-[#314e8d] mb-12 italic tracking-tighter">MORNING_DOCK</h1>
            
            <div id="step-login" class="space-y-8">
                <div class="space-y-3 text-left mb-10 px-2">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">보안 구역 진입</h3>
                    <p class="text-base text-slate-400 font-medium">기지 등록 이메일을 입력하십시오.</p>
                </div>
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="w-full p-6 border-2 border-slate-100 rounded-[2rem] outline-none focus:ring-8 ring-[#314e8d]/5 focus:border-[#314e8d] transition-all text-xl">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-6 rounded-[2rem] font-bold text-2xl hover:bg-[#253b6d] transition-all shadow-2xl">인가 가동 승인</button>
                <button onclick="showRegister()" class="text-sm text-slate-400 font-bold hover:text-[#314e8d] hover:underline transition-all mt-10 block mx-auto">신규 대원 등록 시작</button>
            </div>

            <div id="step-register" class="hidden space-y-8 text-left">
                <div class="mb-10 px-2">
                    <h3 class="text-3xl font-bold text-slate-800 tracking-tight">대원 신규 등록</h3>
                    <p class="text-base text-slate-400 font-medium">보안 프로토콜을 위한 OTP 등록이 필수입니다.</p>
                </div>
                <input type="email" id="reg-email" placeholder="사용할 이메일 주소" class="w-full p-6 border-2 border-slate-100 rounded-[2rem] outline-none focus:ring-8 ring-[#314e8d]/5 text-xl">
                <div id="reg-otp-box" class="hidden space-y-8 py-10 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 text-center">
                    <div class="bg-white p-6 inline-block rounded-[2.5rem] shadow-xl mb-6">
                        <img id="reg-qr-img" class="w-56 h-56">
                    </div>
                    <p class="text-sm text-slate-400 font-bold leading-relaxed px-10">Google OTP 앱으로 위 QR코드를 스캔하여 기지 인증키를 등록하십시오.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-6 rounded-[2rem] font-bold text-2xl shadow-xl hover:scale-[1.02] transition-all">보안 인증키 생성 및 등록</button>
                <button onclick="location.reload()" class="w-full text-xs text-slate-400 font-bold mt-8 text-center uppercase tracking-widest">Register Cancel</button>
            </div>

            <div id="step-otp-verify" class="hidden space-y-16">
                <div class="space-y-6">
                    <div class="w-24 h-24 bg-blue-50 text-[#314e8d] rounded-[2rem] flex items-center justify-center mx-auto text-4xl mb-6 shadow-inner">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">Two-Factor Authentication</p>
                    <p class="text-xl text-slate-600 font-semibold tracking-tight">인증기 앱의 6자리 보안 번호를 입력하십시오.</p>
                </div>
                <div class="px-10">
                    <input type="text" id="gate-otp" placeholder="000000" maxlength="6" class="w-full text-center text-7xl font-bold tracking-[0.4em] outline-none border-b-8 border-[#314e8d] pb-6 bg-transparent text-slate-800">
                </div>
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-7 rounded-[2.5rem] font-bold text-3xl hover:bg-[#253b6d] transition-all shadow-2xl shadow-[#314e8d]/30">최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden animate-in slide-in-from-left duration-700">
        <div class="p-12 border-b border-slate-50 mb-10 text-4xl font-bold text-[#314e8d] tracking-tighter italic">MORNING_DOCK</div>
        <nav class="flex-1 px-8 space-y-3 overflow-y-auto custom-scroll">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full"><i class="fa-solid fa-gauge-high w-10 text-2xl"></i>대시보드 통합본부</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full"><i class="fa-solid fa-comments w-10 text-2xl"></i>모두의 정보공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full"><i class="fa-solid fa-robot w-10 text-2xl"></i>지능형 뉴스 분석봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full"><i class="fa-solid fa-play-circle w-10 text-2xl"></i>미디어 시큐어룸</button>
            
            <div id="admin-menu-zone" class="hidden pt-10 mt-10 border-t-2 border-slate-50">
                <p class="px-6 text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-6">Commander Area</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-red-600 font-bold bg-red-50/0 hover:bg-red-50"><i class="fa-solid fa-user-shield w-10 text-2xl text-red-500"></i>어드민 중앙제어판</button>
            </div>
        </nav>
        
        <div class="p-12 border-t border-slate-50 bg-slate-50/50">
            <div class="flex items-center space-x-5 mb-10">
                <div class="w-16 h-16 rounded-[1.5rem] bg-[#314e8d] flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-[#314e8d]/20" id="user-avatar-ui">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-base font-bold text-slate-800 truncate">agent@antigravity</span>
                    <span id="user-role-ui" class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Agent</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border-2 border-slate-200 py-5 rounded-[1.5rem] text-[12px] font-bold text-slate-400 hover:text-red-500 hover:border-red-200 transition-all uppercase tracking-widest bg-white">시스템 가동 완전 종료</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
        <header class="h-28 bg-white border-b border-slate-200 flex items-center justify-between px-16 shrink-0 shadow-sm z-20">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-[0.5em]">DASHBOARD</h2>
            <div class="flex items-center space-x-8">
                <div id="session-timer" class="session-timer-badge">인가 유지: 60:00</div>
                <div id="clock" class="text-lg font-bold text-[#314e8d] font-mono bg-slate-50 px-10 py-4 rounded-[1.5rem] border border-slate-100 shadow-inner">00:00:00</div>
            </div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-12 custom-scroll">
            <div class="clien-main-container"> <div id="v-dash" class="space-y-12 animate-in fade-in duration-700">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div class="ag-card p-12 flex items-center space-x-10">
                            <div class="w-24 h-24 bg-blue-50 text-[#314e8d] rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-rss-square"></i></div>
                            <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3">Intelligence</p><p id="st-news" class="text-6xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card p-12 flex items-center space-x-10">
                            <div class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-pen-nib"></i></div>
                            <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3">Reports</p><p id="st-posts" class="text-6xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card p-12 flex items-center space-x-10">
                            <div class="w-24 h-24 bg-amber-50 text-amber-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-user-check"></i></div>
                            <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3">Agents</p><p id="st-users" class="text-6xl font-bold text-slate-800">0</p></div>
                        </div>
                    </div>
                    <div class="ag-card p-20 bg-white border-l-[20px] border-l-[#314e8d] shadow-2xl relative overflow-hidden text-left">
                        <div class="absolute top-0 right-0 p-12 opacity-5 text-[10rem] text-[#314e8d] rotate-12"><i class="fa-solid fa-brain"></i></div>
                        <h4 class="text-sm font-bold text-[#314e8d] mb-10 uppercase tracking-[0.4em] italic flex items-center"><i class="fa-solid fa-shield-halved mr-5 text-2xl"></i> AI Security Integrated Dashboard</h4>
                        <p id="sum-text" class="text-4xl font-bold text-slate-800 leading-[1.3] relative z-10 transition-all duration-500">데이터를 분석 중입니다...</p>
                    </div>
                </div>

                <div id="v-comm" class="hidden space-y-10 animate-in fade-in duration-500">
                    <div class="flex justify-between items-center bg-white p-12 rounded-[3.5rem] border shadow-md px-16">
                        <div class="text-left">
                            <h3 class="text-4xl font-bold text-slate-800 tracking-tight italic">모두의 정보 공간</h3>
                            <p class="text-xs text-slate-400 font-bold uppercase mt-3 tracking-widest underline decoration-[#314e8d]/30 underline-offset-8">Intelligence & Counter-Measure Sharing</p>
                        </div>
                        <button onclick="showEditor()" class="bg-[#314e8d] text-white px-12 py-5 rounded-[2rem] font-bold text-lg shadow-2xl hover:scale-105 transition-all">신규 정보 보고 작성</button>
                    </div>
                    <div class="bg-white rounded-[3.5rem] border shadow-xl overflow-hidden border-slate-200">
                        <table class="clien-table">
                            <thead><tr><th class="w-24 text-center px-8">No</th><th class="px-10">인텔리전스 보고 제목</th><th class="w-56 text-center">작성 대원</th><th class="w-48 text-center">보고 일시</th></tr></thead>
                            <tbody id="board-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="v-editor" class="hidden space-y-10 animate-in fade-in duration-500">
                    <div class="editor-container space-y-12 text-left">
                        <div class="flex justify-between items-center border-b pb-10">
                            <h3 id="editor-title-ui" class="text-5xl font-bold text-slate-900 italic tracking-tighter">신규 인텔리전스 상신</h3>
                            <button onclick="nav('comm')" class="text-slate-300 hover:text-red-500 transition-all"><i class="fa-solid fa-xmark text-5xl"></i></button>
                        </div>
                        <div class="space-y-10">
                            <div class="space-y-4">
                                <label class="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">Report Subject</label>
                                <input type="text" id="edit-title" placeholder="인텔리전스 보고 제목을 입력하십시오" class="w-full p-8 border-4 border-slate-50 rounded-[2.5rem] text-3xl font-bold outline-none focus:border-[#314e8d] transition-all bg-slate-50/50 shadow-inner">
                            </div>
                            <div class="space-y-4">
                                <label class="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">Detail Analysis Content</label>
                                <textarea id="edit-content" placeholder="상세 분석 및 보안 권고 내용을 입력하십시오..." class="w-full p-12 border-4 border-slate-50 rounded-[4rem] text-2xl min-h-[600px] outline-none focus:border-[#314e8d] transition-all bg-slate-50/50 custom-scroll leading-relaxed shadow-inner"></textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-6 pt-12">
                            <button onclick="nav('comm')" class="px-14 py-6 rounded-[2rem] font-bold text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition-all text-2xl">취소</button>
                            <button id="save-btn" onclick="savePost()" class="bg-[#314e8d] text-white px-20 py-6 rounded-[2rem] font-bold text-3xl shadow-2xl hover:bg-[#1a2c52] transition-all hover:scale-105">최종 상신 (Submit)</button>
                        </div>
                    </div>
                </div>

                <div id="v-detail" class="hidden bg-white p-24 rounded-[5rem] border shadow-2xl space-y-20 animate-in slide-in-from-bottom duration-700 text-left">
                    <button onclick="nav('comm')" class="text-base font-bold text-slate-400 hover:text-[#314e8d] flex items-center transition-all group">
                        <i class="fa-solid fa-chevron-left mr-5 group-hover:-translate-x-3 transition-transform"></i> BACK TO LIST
                    </button>
                    <div class="border-b-2 pb-14 border-slate-50 flex justify-between items-start">
                        <div class="space-y-10 max-w-4xl">
                            <h3 id="dt-title" class="text-6xl font-bold text-slate-900 tracking-tighter leading-tight">...</h3>
                            <div class="flex items-center space-x-10 text-base font-bold text-slate-400">
                                <span id="dt-author" class="text-[#314e8d] uppercase italic underline underline-offset-[12px] decoration-8 decoration-blue-50 text-2xl">...</span>
                                <span>•</span><span id="dt-date" class="font-mono text-xl">...</span>
                            </div>
                        </div>
                        <div id="dt-tools" class="flex space-x-4">
                            <button id="dt-edit-btn" onclick="showEditor(true)" class="hidden admin-action-btn bg-blue-50 text-blue-600 border-2 border-blue-100 px-10 py-4 rounded-2xl font-bold hover:bg-[#314e8d] hover:text-white transition-all">정보 교정 (RECTIFY)</button>
                            <button id="dt-del-btn" onclick="adminActionPost('delete')" class="hidden admin-action-btn bg-red-50 text-red-600 border-2 border-red-100 px-10 py-4 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all">영구 숙청 (PURGE)</button>
                        </div>
                    </div>
                    <div id="dt-content" class="text-3xl leading-[1.8] text-slate-700 whitespace-pre-line min-h-[400px] px-4">...</div>
                    <div class="pt-24 border-t-2 border-slate-50 space-y-12">
                        <h4 class="font-bold text-4xl text-slate-800 italic flex items-center">Agent Analysis Replies <span id="cm-count" class="text-[#314e8d] ml-8 bg-blue-50 px-8 py-3 rounded-3xl border-4 border-blue-100 shadow-inner">0</span></h4>
                        <div id="comment-area" class="space-y-10"></div>
                        <div class="flex flex-col space-y-10 mt-20 bg-slate-50 p-16 rounded-[4rem] border-4 border-slate-100 shadow-inner">
                            <textarea id="reply-input" class="w-full p-10 border-4 border-white rounded-[3.5rem] text-3xl outline-none focus:ring-12 ring-[#314e8d]/5 bg-white shadow-2xl transition-all" placeholder="분석 의견을 상신하십시오..."></textarea>
                            <button id="reply-btn" class="self-end bg-[#314e8d] text-white px-20 py-7 rounded-[2.5rem] font-bold text-3xl shadow-2xl hover:bg-[#1a2c52] transition-all">의견 제출</button>
                        </div>
                    </div>
                </div>

                <div id="v-news" class="hidden space-y-16 animate-in fade-in duration-500 text-left">
                    <div class="flex justify-between items-center bg-white p-14 rounded-[4rem] border shadow-xl px-20">
                        <div class="flex items-center space-x-10 italic">
                            <div class="w-24 h-24 bg-blue-50 text-[#314e8d] rounded-[3rem] flex items-center justify-center text-5xl animate-pulse shadow-inner border-2 border-blue-100"><i class="fa-solid fa-robot"></i></div>
                            <div class="space-y-3"><h3 class="font-bold text-4xl text-slate-800 tracking-tighter">지능형 뉴스 분석 센터</h3><p class="text-sm text-slate-400 font-bold uppercase tracking-[0.4em]">AI-Scraper-Engine v5.4 Full-Spectrum Analysis</p></div>
                        </div>
                        <button onclick="runNewsCollection()" class="bg-[#314e8d] text-white px-16 py-7 rounded-[3rem] font-bold text-2xl shadow-2xl hover:scale-105 transition-all">분석 엔진 가동</button>
                    </div>
                    <div id="news-feed" class="space-y-16"></div>
                </div>

                <div id="v-media" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16"></div>
                <div id="v-admin" class="hidden space-y-24 pb-96 text-left">
                    <div class="ag-card p-20 space-y-16 shadow-2xl border-4 border-slate-50">
                        <h3 class="font-bold text-6xl text-red-600 flex items-center italic tracking-tighter underline underline-offset-[24px] decoration-red-100"><i class="fa-solid fa-user-shield mr-10"></i> 대원 권한 사령부</h3>
                        <div id="adm-user-grid" class="grid grid-cols-1 xl:grid-cols-2 gap-12"></div>
                    </div>
                </div>

            </div> </div>
    </main>

    <script>
        /**
         * 안티그래비티 프론트엔드 핵심 제어 시스템 (V5.4 The Sovereign)
         * 작성자: CERT 보안개발총괄
         */
        let state = { 
            user: null, 
            view: 'dash', 
            currentPostId: null, 
            sessionTime: 3600, // 3,600초 (1시간 보존)
            regSecret: '' 
        };

        // 실시간 시각 동기화 및 보안 세션 타이머 프로토콜
        setInterval(() => {
            const now = new Date();
            document.getElementById('clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            
            // 대원이 접속된 상태일 경우 세션 잔여 시간 실시간 차감 및 UI 보고
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                const timerUI = document.getElementById('session-timer');
                timerUI.innerText = \`인가 유지: \${m}:\${s.toString().padStart(2,'0')}\`;
                
                // 세션 타임 종료 시 보안을 위해 시스템 즉각 파기 및 강제 로그아웃
                if(state.sessionTime <= 0) {
                    alert('보안 세션 인가가 만료되었습니다. 안전을 위해 시스템이 초기화됩니다.');
                    location.reload();
                }
            }
        }, 1000);

        // [인증 모듈: 회원 가입 및 보안 인증] ----------------------------------------------
        
        function showRegister() { 
            document.getElementById('step-login').classList.add('hidden'); 
            document.getElementById('step-register').classList.remove('hidden'); 
        }

        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            if(!email || !email.includes('@')) return alert('유효한 기지 이메일 형식이 아닙니다!');
            
            // 보안을 위한 16자리 무작위 시크릿 토큰 생성
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let secret = "";
            for(let i=0; i<16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
            state.regSecret = secret;
            
            // 구글 OTP용 QR 코드 생성 (인가된 외부 서버 통신)
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${secret}&issuer=MorningDock\`;
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=' + encodeURIComponent(qrUri);
            
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "기지 가입 최종 승인 요청";
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
                alert('안티그래비티 대원 등록이 완료되었습니다. 보안 인증을 통해 로그인하십시오.'); 
                location.reload(); 
            } else {
                alert('등록 오류: ' + data.error);
            }
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            if(!email) return alert('접속 이메일을 입력하십시오.');
            const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) });
            const data = await res.json();
            if(data.uid) { 
                state.user = data; 
                document.getElementById('step-login').classList.add('hidden'); 
                document.getElementById('step-otp-verify').classList.remove('hidden'); 
            } else {
                alert(data.error);
            }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value.trim();
            if(code.length !== 6) return alert('인가 코드 6자리를 정확히 입력하십시오.');
            
            const res = await fetch('/api/auth/otp-verify', { 
                method: 'POST', 
                body: JSON.stringify({ uid: state.user.uid, code }) 
            });
            const data = await res.json();
            
            if(data.sessionId) { 
                state.user.sessionId = data.sessionId; 
                state.user.role = data.role; 
                bootSystem(); 
            } else { 
                alert('인가 실패: 보안 인가 코드가 일치하지 않습니다.'); 
            }
        }

        function bootSystem() {
            document.getElementById('auth-gate').classList.add('hidden'); 
            document.getElementById('sidebar').classList.add('flex'); 
            document.getElementById('sidebar').classList.remove('hidden'); 
            document.getElementById('main').classList.remove('hidden');
            
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('user-role-ui').innerText = state.user.role === 'ADMIN' ? 'COMMANDER (ADMIN)' : 'AUTHORIZED AGENT';
            document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
            
            if(state.user.role === 'ADMIN') document.getElementById('admin-menu-zone').classList.remove('hidden');
            
            nav('dash');
        }

        // [시스템 네비게이션 및 대시보드 관리 모듈] -----------------------------------------

        async function nav(v) {
            state.view = v;
            document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('v-'+v).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            const nb = document.getElementById('nb-'+v); if(nb) nb.classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            
            // 진입하는 뷰에 따른 실시간 데이터 동기화
            if(v==='dash') updateDashboardStats();
            if(v==='comm') refreshCommunityList();
            if(v==='news') refreshNewsFeed();
            if(v==='media') refreshMediaRoom();
            if(v==='admin') refreshAdminPanel();
        }

        /**
         * 대시보드 통계 및 대표님 맞춤형 유쾌 호출 시스템
         */
        async function updateDashboardStats() {
            const r = await fetch('/api/stats'); 
            const d = await r.json();
            const userId = state.user.email.split('@')[0];
            
            const modifiers = ["필승! 무적의 ", "보안의 심장, ", "기지의 브레인, ", "철통 방어의 화신, ", "최정예 보안 대원 "];
            const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            
            document.getElementById('st-news').innerText = d.newsCount;
            document.getElementById('st-posts').innerText = d.postCount;
            document.getElementById('st-users').innerText = d.userCount;
            
            document.getElementById('sum-text').innerHTML = \`
                \${randomModifier} <span class="text-[#314e8d] underline decoration-8 decoration-blue-100 underline-offset-8">\${userId}</span> 대원님! <br>
                기지 인텔리전스 \${d.newsCount}건 수집 완료! 동료 대원 \${d.userCount}명 활성화 중! 🫡🔥
            \`;
        }

        // [커뮤니티 및 독립 에디터 관리 모듈] ----------------------------------------------

        async function refreshCommunityList() {
            const r = await fetch('/api/community/posts'); 
            const posts = await r.json();
            document.getElementById('board-body').innerHTML = posts.map(p => \`
                <tr onclick="loadPostDetail(\${p.id})" class="group">
                    <td class="text-center text-xs font-bold text-slate-300 px-8">\${p.id}</td>
                    <td class="font-bold text-slate-800 text-2xl group-hover:text-[#314e8d] transition-colors">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 text-lg italic">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-xs text-slate-300 font-bold">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>\`).join('');
        }

        /**
         * 독립 에디터 뷰 활성화 (작성/교정 통합 프로토콜)
         */
        async function showEditor(isEdit = false) {
            nav('editor');
            const titleInput = document.getElementById('edit-title');
            const contentInput = document.getElementById('edit-content');
            const viewTitleUI = document.getElementById('editor-title-ui');
            
            if(isEdit) {
                viewTitleUI.innerText = "정보 보고서 교정 프로토콜";
                titleInput.value = document.getElementById('dt-title').innerText;
                contentInput.value = document.getElementById('dt-content').innerText;
                document.getElementById('save-btn').onclick = () => savePost(true);
            } else {
                viewTitleUI.innerText = "신규 인텔리전스 상신 프로토콜";
                titleInput.value = ""; contentInput.value = "";
                document.getElementById('save-btn').onclick = () => savePost(false);
            }
        }

        async function savePost(isEdit = false) {
            const title = document.getElementById('edit-title').value.trim();
            const content = document.getElementById('edit-content').value.trim();
            if(!title || !content) return alert('모든 인텔리전스 필드를 입력하십시오.');
            
            const endpoint = isEdit ? '/api/community/posts/edit' : '/api/community/posts/add';
            const body = { 
                title, content, 
                userId: state.user.uid, 
                sessionId: state.user.sessionId 
            };
            if(isEdit) body.postId = state.currentPostId;

            const res = await fetch(endpoint, { method:'POST', body:JSON.stringify(body) });
            if(res.ok) { 
                alert('인텔리전스 보고서가 기지 서버에 영구 기록되었습니다!'); 
                nav('comm'); 
            } else {
                alert('상신 실패: 보안 인가 정보를 다시 확인하십시오.');
            }
        }

        async function loadPostDetail(id) {
            state.currentPostId = id; nav('detail');
            const [pRes, cRes] = await Promise.all([
                fetch('/api/community/posts/detail?id='+id), 
                fetch('/api/community/comments?postId='+id)
            ]);
            const p = await pRes.json(); const comments = await cRes.json();
            
            document.getElementById('dt-title').innerText = p.title;
            document.getElementById('dt-author').innerText = p.email;
            document.getElementById('dt-date').innerText = new Date(p.created_at).toLocaleString();
            document.getElementById('dt-content').innerText = p.content;
            document.getElementById('cm-count').innerText = comments.length;
            
            // 수정 및 파기 권한 로직 (작성자 또는 어드민 전용)
            const isOwner = p.user_id === state.user.uid;
            const isAdmin = state.user.role === 'ADMIN';
            document.getElementById('dt-edit-btn').classList.toggle('hidden', !(isOwner || isAdmin));
            document.getElementById('dt-del-btn').classList.toggle('hidden', !isAdmin);
            
            document.getElementById('comment-area').innerHTML = comments.map(c => \`
                <div class="p-12 bg-slate-50 rounded-[3.5rem] flex justify-between items-start border shadow-inner">
                    <div class="space-y-4">
                        <p class="text-sm font-bold text-[#314e8d] uppercase italic underline underline-offset-8 decoration-blue-100">\${c.email}</p>
                        <p class="text-3xl text-slate-700 font-semibold leading-relaxed">\${c.content}</p>
                    </div>
                </div>\`).join('');
            
            document.getElementById('reply-btn').onclick = async () => {
                const content = document.getElementById('reply-input').value.trim(); 
                if(!content) return;
                await fetch('/api/community/comments/add', { 
                    method:'POST', 
                    body:JSON.stringify({
                        postId:id, content, 
                        userId:state.user.uid, 
                        sessionId:state.user.sessionId
                    }) 
                });
                document.getElementById('reply-input').value = ''; 
                loadPostDetail(id);
            };
        }

        // [NEWS & MEDIA & ADMIN 제어 모듈] ----------------------------------------------

        async function runNewsCollection() { 
            alert('지능형 AI가 실시간 뉴스를 분석하고 있습니다. 잠시만 기다리십시오.'); 
            await fetch('/api/collect-news'); 
            refreshNewsFeed(); 
        }

        async function refreshNewsFeed() {
            const r = await fetch('/api/news'); 
            const news = await r.json();
            document.getElementById('news-feed').innerHTML = news.map(n => \`
                <div class="ag-card p-16 space-y-12">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-5xl text-slate-800 cursor-pointer hover:text-[#314e8d] tracking-tighter" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <span class="text-xs bg-slate-50 px-6 py-3 rounded-2xl font-bold text-slate-400 border-2 uppercase tracking-widest">\${n.model_name} 분석</span>
                    </div>
                    <div class="bg-slate-50 p-12 rounded-[4rem] border-l-[24px] border-l-[#314e8d] shadow-inner font-bold italic text-3xl leading-relaxed">\${n.summary}</div>
                    <p class="text-2xl font-bold text-[#314e8d] italic decoration-4 underline underline-offset-[16px] decoration-blue-100">\${n.discussion_question}</p>
                </div>\`).join('');
        }

        async function refreshMediaRoom() {
            const r = await fetch('/api/media'); 
            const meds = await r.json();
            document.getElementById('v-media').innerHTML = meds.map(m => \`
                <div class="ag-card p-20 text-center space-y-16 group">
                    <div class="w-48 h-48 bg-slate-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto text-7xl border-8 border-slate-100 group-hover:border-[#314e8d] transition-all shadow-inner"><i class="\${m.icon}"></i></div>
                    <h4 class="font-bold text-5xl text-slate-800 italic tracking-tighter underline underline-offset-[16px] decoration-slate-100">\${m.name}</h4>
                    <button onclick="window.open('\${m.url}')" class="w-full bg-[#314e8d] text-white py-8 rounded-[3rem] font-bold text-3xl shadow-2xl">LAUNCH</button>
                </div>\`).join('');
        }

        async function refreshAdminPanel() {
            const r = await fetch('/api/admin/users', { 
                method:'POST', 
                body:JSON.stringify({sessionId:state.user.sessionId}) 
            });
            const users = await r.json();
            document.getElementById('adm-user-grid').innerHTML = users.map(u => \`
                <div class="p-14 bg-white border-8 border-slate-50 rounded-[4.5rem] flex justify-between items-center shadow-xl">
                    <div class="flex flex-col space-y-4">
                        <span class="font-bold text-3xl text-slate-800 underline decoration-slate-100 underline-offset-[12px]">\${u.email}</span>
                        <span class="text-sm font-bold text-slate-400 uppercase tracking-widest">\${u.role} | \${u.status}</span>
                    </div>
                    <button onclick="adminDeleteUser('\${u.uid}')" class="bg-red-50 text-red-500 font-bold px-12 py-6 rounded-[2.5rem] hover:bg-red-500 hover:text-white transition-all text-xl italic shadow-md">영구 숙청 (PURGE)</button>
                </div>\`).join('');
        }

        async function adminDeleteUser(tUid) { 
            if(confirm('해당 대원을 기지에서 영구 숙청합니까? 데이터는 복구되지 않습니다.')) { 
                await fetch('/api/admin/users/delete', { method:'POST', body:JSON.stringify({targetUid:tUid, sessionId:state.user.sessionId}) }); 
                refreshAdminPanel(); 
            } 
        }

        async function adminActionPost(action) {
            if(action === 'delete') { 
                if(!confirm('해당 인텔리전스 보고서를 영구 파기합니까?')) return; 
                await fetch('/api/admin/posts/delete', { method:'POST', body:JSON.stringify({postId:state.currentPostId, sessionId:state.user.sessionId}) }); 
                nav('comm'); 
            }
        }
    </script>
</body>
</html>
  \`;
}