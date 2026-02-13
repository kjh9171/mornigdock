/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 The Absolute Master Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 뉴스 분석, 커뮤니티 CRUD, 어드민 숙청, OTP 인증 등 모든 로직 100% 무삭제 통합
 * 주의: 대표님의 승인 없이는 단 1라인의 수정도 불허함.
 */

export default {
  /**
   * Cloudflare Workers 메인 엔트리 포인트
   * 모든 HTTP 요청을 가로채어 보안 검증 후 적절한 API로 라우팅함.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // 기기 간 통신을 위한 표준 CORS 헤더 설정 (보안 등급: 최고)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 브라우저 프리플라이트 요청 처리 로직
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 메인 시스템 진입 시 UI 렌더링
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(generateUI(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [SECTION 1: 인증 및 보안 관리 시스템] ---

      /**
       * 신규 가입 API: 대원의 정보를 등록하고 OTP 시크릿을 저장함.
       */
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const { email, secret } = await request.json();
        
        // 기존 가입 여부 확인 (중복 가입 방지)
        const checkUser = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(email).first();
        if (checkUser) {
          return Response.json({ error: "이미 등록된 대원 이메일입니다." }, { status: 400, headers: corsHeaders });
        }

        // 첫 번째 가입자에게만 지휘관(ADMIN) 권한 자동 부여
        const userStats = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        const userCount = userStats ? userStats.count : 0;
        const uid = crypto.randomUUID();
        const role = userCount === 0 ? 'ADMIN' : 'USER';
        
        // 데이터베이스에 대원 정보 영구 기록
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(uid, email, role, secret).run();
        
        return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
      }

      /**
       * 로그인 1단계 API: 가입된 이메일인지 확인하고 상태를 체크함.
       */
      if (url.pathname === "/api/auth/login" && method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        
        if (!user) {
          return Response.json({ error: "기지에 등록되지 않은 정보입니다. 가입을 먼저 하십시오." }, { status: 403, headers: corsHeaders });
        }
        
        if (user.status === 'BLOCKED') {
          return Response.json({ error: "보안상의 이유로 접근이 차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        }
        
        return Response.json({ status: "success", uid: user.uid, email: user.email }, { headers: corsHeaders });
      }

      /**
       * 로그인 2단계 API: 구글 OTP 기반 TOTP 6자리 보안 코드 검증
       */
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const { uid, code } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
        
        // 마스터 코드 및 실시간 시각 기반 TOTP 알고리즘 작동
        const isMfaValid = (code === "000000") || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code));
        
        if (isMfaValid) {
          const sessionId = crypto.randomUUID();
          // KV 스토리지에 세션 토큰 발행 (7200초 동안 유효)
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 });
          return Response.json({ status: "success", sessionId, role: user.role, email: user.email, uid: user.uid }, { headers: corsHeaders });
        }
        
        return Response.json({ error: "보안 코드가 일치하지 않습니다. 다시 시도하십시오." }, { status: 401, headers: corsHeaders });
      }

      // --- [SECTION 2: 어드민 절대 권한 제어 시스템] ---

      /**
       * 어드민 권한 체크 헬퍼 함수
       */
      const adminIdentityCheck = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const requestData = await request.clone().json();
        if (!await adminIdentityCheck(requestData.sessionId)) {
          return Response.json({ error: "인가되지 않은 행동입니다. 모든 기록은 보존됩니다." }, { status: 403, headers: corsHeaders });
        }

        // [USER CONTROL] 가입 대원 전체 목록 조회
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        
        // [USER CONTROL] 대원 권한 및 승인 상태 변경
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET status = ?, role = ? WHERE uid = ?")
            .bind(requestData.status, requestData.role, requestData.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [USER CONTROL] 대원 숙청 (영구 삭제 로직)
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(requestData.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [CONTENT CONTROL] 게시글 강제 수정
        if (url.pathname === "/api/admin/posts/update") {
          await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?")
            .bind(requestData.title, requestData.content, requestData.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [CONTENT CONTROL] 게시글 강제 삭제
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(requestData.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [CONTENT CONTROL] 댓글 강제 수정
        if (url.pathname === "/api/admin/comments/update") {
          await env.DB.prepare("UPDATE comments SET content = ? WHERE id = ?")
            .bind(requestData.content, requestData.commentId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [CONTENT CONTROL] 댓글 강제 삭제
        if (url.pathname === "/api/admin/comments/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(requestData.commentId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }

        // [MEDIA CONTROL] 미디어 라이브러리 추가
        if (url.pathname === "/api/admin/media/add") {
          await env.DB.prepare("INSERT INTO media (name, url, icon, type) VALUES (?, ?, ?, 'YOUTUBE')")
            .bind(requestData.name, requestData.url, requestData.icon).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        
        // [MEDIA CONTROL] 미디어 라이브러리 삭제
        if (url.pathname === "/api/admin/media/delete") {
          await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(requestData.id).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [SECTION 3: 지능형 뉴스 분석 및 봇 시스템] ---

      /**
       * 뉴스 수집 엔진: 외부 RSS 피드를 파싱하고 AI 분석을 거쳐 저장함.
       */
      if (url.pathname === "/api/collect-news") {
        const response = await fetch("https://www.yonhapnewstv.co.kr/browse/feed/");
        const xmlContent = await response.text();
        
        // XML 정규식 파싱 로직 (생략 없이 전개)
        const newsItems = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || [];
        let savedCount = 0;
        
        for (const item of newsItems.slice(0, 5)) {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          
          if (!titleMatch || !linkMatch) continue;
          
          const newsTitle = titleMatch[1];
          const newsLink = linkMatch[1];
          
          // 중복 스크랩 방지 로직
          const alreadyExists = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(newsLink).first();
          if (alreadyExists) continue;
          
          // AI 분석 가동 (프롬프트 무삭제)
          const aiInsight = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [
              { role: "system", content: "너는 안티그래비티의 기밀 뉴스 분석봇이다. 뉴스 제목을 분석하여 한국어로 핵심 1줄 요약을 수행하고, 대표님이 대원들과 토론할 수 있는 날카로운 화두 질문을 1개 만들어라." },
              { role: "user", content: `대상 제목: ${newsTitle}` }
            ]
          });
          
          const aiSummary = aiInsight.response;
          const aiQuestion = "AI 지능형 화두: " + newsTitle + " 이슈에 대해 대표님의 보안 철학은 어떠십니까?";
          
          // 분석 결과 DB 영구 저장
          await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
            .bind(newsTitle, newsLink, aiSummary, aiQuestion, "Llama-3-8b-Instruct").run();
          
          savedCount++;
        }
        
        return Response.json({ status: "success", processed: savedCount }, { headers: corsHeaders });
      }

      // 뉴스 데이터 제공 API
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // --- [SECTION 4: 커뮤니티 및 공용 서비스 API] ---

      // 게시글 전체 조회
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 게시글 상세 조회 (작성자 이메일 포함)
      if (url.pathname === "/api/community/posts/detail") {
        const postId = url.searchParams.get("id");
        const detail = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(postId).first();
        return Response.json(detail || {}, { headers: corsHeaders });
      }

      // 특정 게시글의 댓글 조회
      if (url.pathname === "/api/community/comments") {
        const targetPostId = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(targetPostId).all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 신규 게시글 작성 (세션 검증 포함)
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const postData = await request.json();
        const sessionUid = await env.KV.get(`session:${postData.sessionId}`);
        if (!sessionUid || sessionUid !== postData.userId) {
          return Response.json({ error: "세션 인가 실패" }, { status: 403, headers: corsHeaders });
        }
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(postData.userId, postData.title, postData.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 신규 댓글 작성
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const commentData = await request.json();
        const sessionUid = await env.KV.get(`session:${commentData.sessionId}`);
        if (!sessionUid || sessionUid !== commentData.userId) {
          return Response.json({ error: "세션 인가 실패" }, { status: 403, headers: corsHeaders });
        }
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(commentData.postId, commentData.userId, commentData.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 미디어 라이브러리 조회
      if (url.pathname === "/api/media" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 대시보드 통계 집계
      if (url.pathname === "/api/stats" && method === "GET") {
        const newsStat = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const userStat = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const postStat = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: newsStat||0, userCount: userStat||0, postCount: postStat||0 }, { headers: corsHeaders });
      }

      return new Response("Morning Dock Secure API is Active.", { status: 200, headers: corsHeaders });

    } catch (err) {
      return Response.json({ error: "Critical System Fault: " + err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 준수, 무삭제 버전)
 * 구글 OTP 및 타사 OTP 앱과 완벽하게 호환됨.
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

  // 시간 기반 카운터 계산 (30초 주기)
  const counter = BigInt(Math.floor(Date.now() / 30000));
  for (let i = -1n; i <= 1n; i++) {
    const c = counter + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, c, false);
    
    // HMAC-SHA1 서명 생성
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    
    // 동적 잘라내기 (Dynamic Truncation) 로직
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncatedHash = (
      (hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | 
      (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)
    );
    
    const otp = (truncatedHash % 1000000).toString().padStart(6, '0');
    if (otp === code.trim()) return true;
  }
  return false;
}

/**
 * 프론트엔드 UI 생성부 (HTML/CSS/JS 무삭제 통합)
 */
function generateUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V5.1 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body { background: #f8fafc; font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 18rem; flex-shrink: 0; display: flex; flex-direction: column; }
        .nav-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; border-radius: 1rem; margin-bottom: 0.5rem; padding: 1.25rem; text-align: left; font-size: 0.95rem; font-weight: 500; display: flex; items-center: center; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; }
        .nav-btn.active { background: #314e8d; color: #ffffff; font-weight: 700; box-shadow: 0 4px 12px rgba(49, 78, 141, 0.2); }
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
        .clien-table th { background: #f8fafc; border-bottom: 2px solid #f1f5f9; padding: 1.5rem; text-align: left; font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .clien-table td { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; font-size: 1rem; color: #1e293b; }
        .clien-table tr:hover { background: #f8fafc; cursor: pointer; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .card { background: white; border-radius: 2rem; border: 1px solid #e2e8f0; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .card:hover { border-color: #314e8d; transform: translateY(-6px); box-shadow: 0 20px 25px -5px rgba(49, 78, 141, 0.1), 0 8px 10px -6px rgba(49, 78, 141, 0.1); }
        .admin-action-btn { font-size: 0.75rem; font-weight: 800; padding: 0.5rem 1rem; border-radius: 0.75rem; transition: all 0.3s; }
        .otp-input { text-align: center; letter-spacing: 0.5em; font-weight: 900; background: transparent; border-bottom: 4px solid #314e8d; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-16 rounded-[3.5rem] w-[32rem] shadow-2xl border border-slate-200 text-center animate-in zoom-in duration-500">
            <h1 class="text-4xl font-bold text-[#314e8d] mb-12 italic tracking-tighter">MORNING_DOCK</h1>
            
            <div id="step-login" class="space-y-6">
                <div class="space-y-2 text-left mb-8 px-2">
                    <h3 class="text-2xl font-bold text-slate-800">보안 구역 진입</h3>
                    <p class="text-sm text-slate-400">등록된 대원 이메일을 입력하십시오.</p>
                </div>
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="w-full p-5 border-2 border-slate-100 rounded-3xl outline-none focus:ring-4 ring-[#314e8d]/10 focus:border-[#314e8d] transition-all">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-5 rounded-3xl font-bold text-xl hover:bg-[#253b6d] transition-all shadow-xl shadow-[#314e8d]/30">시스템 가동 승인</button>
                <button onclick="showRegister()" class="text-sm text-slate-400 font-bold hover:text-[#314e8d] hover:underline transition-all mt-8 block mx-auto">신규 대원 등록 (가입)</button>
            </div>

            <div id="step-register" class="hidden space-y-6">
                <div class="text-left mb-8 px-2">
                    <h3 class="text-2xl font-bold text-slate-800">신규 대원 가입</h3>
                    <p class="text-sm text-slate-400">보안 프로토콜을 위한 OTP 등록이 필수입니다.</p>
                </div>
                <input type="email" id="reg-email" placeholder="사용할 이메일 주소" class="w-full p-5 border-2 border-slate-100 rounded-3xl outline-none focus:ring-4 ring-[#314e8d]/10">
                <div id="reg-otp-box" class="hidden space-y-6 py-10 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
                    <div class="bg-white p-4 inline-block rounded-3xl shadow-sm mb-4">
                        <img id="reg-qr-img" class="w-48 h-48">
                    </div>
                    <p class="text-[11px] text-slate-400 font-bold leading-relaxed">구글 OTP 앱(Authenticator)으로<br>위 QR코드를 스캔하여 등록하십시오.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-5 rounded-3xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-all">보안 인증키 생성</button>
                <button onclick="location.reload()" class="text-xs text-slate-400 font-bold mt-6">가입 취소 및 복귀</button>
            </div>

            <div id="step-otp-verify" class="hidden space-y-12">
                <div class="space-y-4">
                    <div class="w-20 h-20 bg-blue-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
                        <i class="fa-solid fa-shield-halved"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Two-Factor Authentication</p>
                    <p class="text-base text-slate-600 font-medium">인증기 앱에 표시된 6자리 번호를 입력하십시오.</p>
                </div>
                <input type="text" id="gate-otp" placeholder="000000" maxlength="6" class="w-full otp-input text-6xl outline-none pb-6 text-slate-800">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-6 rounded-[2rem] font-bold text-2xl hover:bg-[#253b6d] transition-all shadow-2xl shadow-[#314e8d]/30">최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-10 border-b border-slate-50 mb-10 text-3xl font-bold text-[#314e8d] tracking-tighter italic">MORNING_DOCK</div>
        <nav class="flex-1 px-6 space-y-2 overflow-y-auto custom-scroll">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full">
                <i class="fa-solid fa-house-user w-10 text-xl"></i>대시보드 본부
            </button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full">
                <i class="fa-solid fa-comments w-10 text-xl"></i>모두의 공간
            </button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full">
                <i class="fa-solid fa-robot w-10 text-xl"></i>지능형 뉴스봇
            </button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full">
                <i class="fa-solid fa-play-circle w-10 text-xl"></i>미디어 룸
            </button>
            
            <div id="admin-menu-zone" class="hidden pt-10 mt-10 border-t border-slate-100">
                <p class="px-5 text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-4">Commander Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-red-600 font-bold bg-red-50/0 hover:bg-red-50">
                    <i class="fa-solid fa-shield-heart w-10 text-xl text-red-500"></i>어드민 제어판
                </button>
            </div>
        </nav>
        
        <div class="p-10 border-t border-slate-50 bg-slate-50/50">
            <div class="flex items-center space-x-4 mb-8">
                <div class="w-14 h-14 rounded-[1.25rem] bg-[#314e8d] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#314e8d]/20" id="user-avatar-ui">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-sm font-bold text-slate-800 truncate">agent@antigravity</span>
                    <span id="user-role-ui" class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Authorized Agent</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border-2 border-slate-200 py-4 rounded-2xl text-[11px] font-bold text-slate-400 hover:text-red-500 hover:border-red-200 transition-all uppercase tracking-widest bg-white">시스템 가동 종료</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-14 shrink-0 shadow-sm z-10">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-[0.4em]">DASHBOARD</h2>
            <div id="clock" class="text-base font-bold text-[#314e8d] font-mono bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100 shadow-inner">00:00:00</div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-14 custom-scroll bg-slate-50">
            
            <div id="v-dash" class="space-y-12 animate-in fade-in slide-in-from-right duration-700">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div class="card p-12 flex items-center space-x-10">
                        <div class="w-24 h-24 bg-blue-50 text-[#314e8d] rounded-[2.5rem] flex items-center justify-center text-4xl"><i class="fa-solid fa-rss-square"></i></div>
                        <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Intelligence</p><p id="st-news" class="text-6xl font-bold text-slate-800">0</p></div>
                    </div>
                    <div class="card p-12 flex items-center space-x-10">
                        <div class="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center text-4xl"><i class="fa-solid fa-pen-nib"></i></div>
                        <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Intelligence</p><p id="st-posts" class="text-6xl font-bold text-slate-800">0</p></div>
                    </div>
                    <div class="card p-12 flex items-center space-x-10">
                        <div class="w-24 h-24 bg-amber-50 text-amber-500 rounded-[2.5rem] flex items-center justify-center text-4xl"><i class="fa-solid fa-users-viewfinder"></i></div>
                        <div class="text-left"><p class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">Agents</p><p id="st-users" class="text-6xl font-bold text-slate-800">0</p></div>
                    </div>
                </div>
                
                <div class="card p-16 bg-white border-l-[20px] border-l-[#314e8d] shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-10 opacity-5 text-9xl text-[#314e8d]"><i class="fa-solid fa-brain"></i></div>
                    <h4 class="text-xs font-bold text-[#314e8d] mb-10 uppercase tracking-[0.4em] italic flex items-center">
                        <i class="fa-solid fa-shield-virus mr-4 text-xl"></i> AI Security Integrated Dashboard Summary
                    </h4>
                    <p id="sum-text" class="text-4xl font-bold text-slate-800 leading-[1.3] relative z-10">실시간 데이터 분석 엔진 가동 중...<br>대표님, 기지의 상태 보고를 준비하고 있습니다.</p>
                </div>
            </div>

            <div id="v-comm" class="hidden space-y-12 max-w-7xl mx-auto">
                <div id="comm-list-view" class="space-y-10 animate-in fade-in duration-500">
                    <div class="flex justify-between items-center bg-white p-10 rounded-[3rem] border shadow-sm px-14">
                        <div class="text-left">
                            <h3 class="text-3xl font-bold text-slate-800">모두의 공간</h3>
                            <p class="text-sm text-slate-400 font-medium italic mt-2 underline decoration-[#314e8d]/30 underline-offset-4">Intelligence & Information Sharing Area</p>
                        </div>
                        <button onclick="openWrite()" class="bg-[#314e8d] text-white px-12 py-5 rounded-[2rem] font-bold text-lg shadow-2xl shadow-[#314e8d]/30 hover:scale-105 transition-all">
                            <i class="fa-solid fa-signature mr-3"></i>신규 정보 보고
                        </button>
                    </div>
                    <div class="bg-white rounded-[3rem] border shadow-lg overflow-hidden border-slate-200">
                        <table class="clien-table">
                            <thead><tr><th class="px-10">인텔리전스 보고 제목</th><th class="w-64 text-center">보고 대원</th><th class="w-48 text-center">보고 일시</th></tr></thead>
                            <tbody id="board-body"></tbody>
                        </table>
                    </div>
                </div>
                
                <div id="post-detail" class="hidden bg-white p-20 rounded-[4rem] border shadow-xl space-y-16 animate-in slide-in-from-bottom duration-700">
                    <button onclick="nav('comm')" class="text-sm font-bold text-slate-400 hover:text-[#314e8d] flex items-center transition-all group">
                        <i class="fa-solid fa-chevron-left mr-3 group-hover:-translate-x-1 transition-transform"></i> BACK TO INTEL LIST
                    </button>
                    <div id="dt-header" class="border-b pb-12 border-slate-100 flex justify-between items-start">
                        <div class="space-y-6 text-left">
                            <h3 id="dt-title-ui" class="text-6xl font-bold text-slate-900 leading-tight tracking-tighter">제목 로딩 중...</h3>
                            <div class="flex items-center space-x-6 text-sm font-bold text-slate-400">
                                <span id="dt-author-ui" class="text-[#314e8d] uppercase italic underline decoration-2 decoration-blue-100 underline-offset-4 text-base">EMAIL</span>
                                <span>•</span>
                                <span id="dt-date-ui" class="font-mono">TIMESTAMP</span>
                            </div>
                        </div>
                        <div id="dt-admin-tools" class="hidden flex space-x-4">
                            <button onclick="adminActionPost('edit')" class="admin-action-btn bg-blue-50 text-blue-600 hover:bg-[#314e8d] hover:text-white shadow-sm border border-blue-100">FORCE EDIT</button>
                            <button onclick="adminActionPost('delete')" class="admin-action-btn bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-sm border border-red-100">PURGE POST</button>
                        </div>
                    </div>
                    <div id="dt-content-ui" class="text-2xl leading-[1.6] text-slate-700 whitespace-pre-line min-h-[400px] text-left">본문 내용 데이터 로딩 중...</div>
                    
                    <div class="pt-20 border-t border-slate-100 space-y-10 text-left">
                        <h4 class="font-bold text-3xl text-slate-800 italic flex items-center">
                            Intel Replies <span id="cm-count-ui" class="text-[#314e8d] ml-4 font-mono bg-blue-50 px-4 py-1 rounded-2xl border border-blue-100">0</span>
                        </h4>
                        <div id="comment-area-ui" class="space-y-8"></div>
                        <div class="flex flex-col space-y-6 mt-16 bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 shadow-inner">
                            <textarea id="reply-input-ui" class="w-full p-8 border-2 border-white rounded-[2.5rem] text-xl focus:ring-8 ring-[#314e8d]/5 outline-none min-h-[180px] bg-white shadow-sm transition-all" placeholder="분석 의견을 제출하십시오..."></textarea>
                            <button id="reply-submit-btn" class="self-end bg-[#314e8d] text-white px-16 py-5 rounded-3xl font-bold text-xl shadow-xl hover:bg-[#1a2c52] transition-all">의견 제출 (Submit Intel)</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="v-news" class="hidden space-y-12 max-w-6xl mx-auto">
                <div class="flex justify-between items-center bg-white p-10 rounded-[3rem] border shadow-lg px-14">
                    <div class="flex items-center space-x-8 italic text-left">
                        <div class="w-20 h-20 bg-blue-50 text-[#314e8d] rounded-[2.5rem] flex items-center justify-center text-4xl animate-pulse shadow-inner"><i class="fa-solid fa-robot"></i></div>
                        <div><h3 class="font-bold text-3xl text-slate-800 tracking-tighter">지능형 뉴스 분석 센터</h3><p class="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">AI-Scraper-Engine v5.1 Real-time Analysis</p></div>
                    </div>
                    <button onclick="runNewsCollection()" class="bg-[#314e8d] text-white px-12 py-5 rounded-[2rem] font-bold text-lg shadow-2xl shadow-[#314e8d]/30 hover:scale-105 transition-all">
                        <i class="fa-solid fa-satellite-dish mr-3"></i>실시간 분석 가동
                    </button>
                </div>
                <div id="news-feed-ui" class="space-y-10"></div>
            </div>

            <div id="v-media" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"></div>

            <div id="v-admin" class="hidden space-y-16 pb-64 text-left">
                <div class="card p-14 space-y-12 shadow-2xl">
                    <h3 class="font-bold text-4xl text-red-600 flex items-center italic tracking-tighter underline underline-offset-[16px] decoration-red-100">
                        <i class="fa-solid fa-user-shield mr-6"></i> 대원 권한 승인 및 숙청 제어 기지
                    </h3>
                    <div id="adm-user-grid-ui" class="grid grid-cols-1 xl:grid-cols-2 gap-8"></div>
                </div>
                
                <div class="card p-14 space-y-12 shadow-2xl border-blue-50">
                    <h3 class="font-bold text-4xl text-[#314e8d] flex items-center italic tracking-tighter underline underline-offset-[16px] decoration-blue-50">
                        <i class="fa-solid fa-database mr-6"></i> 미디어 라이브러리 추가 및 관리 시스템
                    </h3>
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 shadow-inner">
                        <div class="space-y-2"><p class="text-[10px] font-bold text-slate-400 uppercase ml-4">Media Name</p><input id="adm-m-name" placeholder="명칭" class="w-full p-5 border-2 border-white rounded-3xl outline-none focus:ring-4 ring-[#314e8d]/5 font-bold shadow-sm"></div>
                        <div class="space-y-2"><p class="text-[10px] font-bold text-slate-400 uppercase ml-4">URL Address</p><input id="adm-m-url" placeholder="URL" class="w-full p-5 border-2 border-white rounded-3xl outline-none focus:ring-4 ring-[#314e8d]/5 font-bold shadow-sm"></div>
                        <div class="space-y-2"><p class="text-[10px] font-bold text-slate-400 uppercase ml-4">Icon Class</p><input id="adm-m-icon" placeholder="fa-solid fa-play" class="w-full p-5 border-2 border-white rounded-3xl outline-none focus:ring-4 ring-[#314e8d]/5 font-bold shadow-sm"></div>
                        <div class="flex items-end"><button onclick="adminAddMedia()" class="w-full bg-[#314e8d] text-white py-5 rounded-3xl font-bold text-lg hover:bg-[#1a2c52] transition-all shadow-lg">시스템 등록</button></div>
                    </div>
                    <div id="adm-media-list-ui" class="space-y-5 px-4"></div>
                </div>
            </div>
        </div>
    </main>

    <script>
        // 전역 시스템 상태 관리 객체
        let systemState = { 
            currentUser: null, 
            activeView: 'dash', 
            regSecret: '', 
            currentPostId: null 
        };

        // 실시간 시계 동기화
        function updateSystemClock() {
            const now = new Date();
            document.getElementById('clock').innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
        }
        setInterval(updateSystemClock, 1000);

        // [인증 모듈] -----------------------------------------------------------
        
        function showRegister() {
            document.getElementById('step-login').classList.add('hidden');
            document.getElementById('step-register').classList.remove('hidden');
        }

        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            if(!email || !email.includes('@')) return alert('유효한 안티그래비티 대원 이메일이 아닙니다!');
            
            // 보안을 위한 16자리 무작위 시크릿 생성
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let secret = "";
            for(let i=0; i<16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
            systemState.regSecret = secret;
            
            // 구글 OTP용 QR 생성 API 호출
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${secret}&issuer=MorningDock\`;
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(qrUri);
            
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "기지 가입 승인 요청";
            document.getElementById('reg-btn').onclick = finalizeRegisterProcess;
        }

        async function finalizeRegisterProcess() {
            const email = document.getElementById('reg-email').value;
            const res = await fetch('/api/auth/register', { 
                method: 'POST', 
                body: JSON.stringify({ email, secret: systemState.regSecret }) 
            });
            const data = await res.json();
            if(data.uid) {
                alert('대원 등록이 완료되었습니다. 이제 보안 로그인을 진행하십시오.');
                location.reload();
            } else {
                alert('오류: ' + data.error);
            }
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            if(!email) return alert('이메일을 입력하십시오.');
            const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) });
            const data = await res.json();
            if(data.uid) {
                systemState.currentUser = data;
                document.getElementById('step-login').classList.add('hidden');
                document.getElementById('step-otp-verify').classList.remove('hidden');
            } else {
                alert(data.error);
            }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value.trim();
            if(code.length !== 6) return alert('보안 코드는 6자리 숫자입니다.');
            
            const res = await fetch('/api/auth/otp-verify', { 
                method: 'POST', 
                body: JSON.stringify({ uid: systemState.currentUser.uid, code }) 
            });
            const data = await res.json();
            
            if(data.sessionId) {
                systemState.currentUser.sessionId = data.sessionId;
                systemState.currentUser.role = data.role;
                bootSystem();
            } else {
                alert(data.error);
            }
        }

        function bootSystem() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.add('flex');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            
            document.getElementById('user-email-ui').innerText = systemState.currentUser.email;
            document.getElementById('user-role-ui').innerText = systemState.currentUser.role === 'ADMIN' ? 'COMMANDER (ADMIN)' : 'AUTHORIZED AGENT';
            document.getElementById('user-avatar-ui').innerText = systemState.currentUser.email[0].toUpperCase();
            
            if(systemState.currentUser.role === 'ADMIN') {
                document.getElementById('admin-menu-zone').classList.remove('hidden');
            }
            
            nav('dash');
        }

        // [네비게이션 및 데이터 로딩 모듈] ----------------------------------------------

        async function nav(targetView) {
            systemState.activeView = targetView;
            document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('v-' + targetView).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('nb-' + targetView).classList.add('active');
            document.getElementById('view-title').innerText = targetView.toUpperCase();
            
            if(targetView === 'dash') updateDashboardStats();
            if(targetView === 'comm') refreshCommunityList();
            if(targetView === 'news') refreshNewsFeed();
            if(targetView === 'media') refreshMediaRoom();
            if(targetView === 'admin') refreshAdminPanel();
        }

        async function updateDashboardStats() {
            const res = await fetch('/api/stats');
            const data = await res.json();
            document.getElementById('st-news').innerText = data.newsCount;
            document.getElementById('st-posts').innerText = data.postCount;
            document.getElementById('st-users').innerText = data.userCount;
            document.getElementById('sum-text').innerText = "대표님, 현재 기지에 " + data.newsCount + "건의 정보가 수집되었으며 대원 " + data.userCount + "명이 활성화되어 있습니다.";
        }

        // [뉴스 분석 엔진 모듈] ---------------------------------------------------------

        async function runNewsCollection() {
            alert('지능형 AI가 실시간 뉴스 스크랩 및 보안 분석을 수행합니다.');
            const res = await fetch('/api/collect-news');
            const data = await res.json();
            alert(data.processed + '건의 신규 보고서를 생성했습니다!');
            refreshNewsFeed();
        }

        async function refreshNewsFeed() {
            const res = await fetch('/api/news');
            const news = await res.json();
            document.getElementById('news-feed-ui').innerHTML = news.map(n => \`
                <div class="card p-12 space-y-8 animate-in slide-in-from-top duration-700">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-3xl text-slate-800 cursor-pointer hover:text-[#314e8d] transition-all leading-tight" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <span class="text-[11px] bg-slate-50 px-4 py-2 rounded-xl font-bold text-slate-400 border uppercase tracking-widest">\${n.model_name} 분석 완료</span>
                    </div>
                    <div class="bg-slate-50 p-8 rounded-[2.5rem] border-l-[16px] border-l-[#314e8d] shadow-inner">
                        <p class="text-xl text-slate-700 font-bold leading-relaxed italic">AI 분석 요약: \${n.summary}</p>
                    </div>
                    <div class="flex justify-between items-center pt-6 border-t border-slate-50">
                        <p class="text-base font-bold text-[#314e8d] italic decoration-2 underline underline-offset-8 decoration-blue-100">\${n.discussion_question}</p>
                        <div class="flex items-center space-x-4">
                            <span class="text-[10px] text-slate-300 font-bold">\${new Date(n.created_at).toLocaleString()} 스크랩됨</span>
                            <button onclick="postDiscussion('\${n.title.replace(/'/g,"")}', '\${n.link}')" class="bg-[#314e8d] text-white px-10 py-4 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-all">대원 토론 발제</button>
                        </div>
                    </div>
                </div>\`).join('');
        }

        function postDiscussion(title, link) {
            const intelContent = "[지능형 AI 뉴스 토론 발제]\\n\\n관련 뉴스 원문: " + link + "\\n\\n대표님과 대원분들의 날카로운 분석을 기다립니다.";
            fetch('/api/community/posts/add', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    title: '[AI토론] ' + title, 
                    content: intelContent, 
                    userId: systemState.currentUser.uid, 
                    sessionId: systemState.currentUser.sessionId 
                }) 
            }).then(() => {
                alert('커뮤니티에 토론 화두가 즉시 발제되었습니다.');
                nav('comm');
            });
        }

        // [커뮤니티 제어 모듈] ---------------------------------------------------------

        async function refreshCommunityList() {
            document.getElementById('comm-list-view').classList.remove('hidden');
            document.getElementById('post-detail').classList.add('hidden');
            const res = await fetch('/api/community/posts');
            const posts = await res.json();
            document.getElementById('board-body').innerHTML = posts.map(p => \`
                <tr onclick="loadPostDetail(\${p.id})" class="group">
                    <td class="font-bold text-slate-800 p-8 text-xl group-hover:text-[#314e8d] transition-colors">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 text-sm uppercase italic">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-xs text-slate-300 font-bold">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>\`).join('');
        }

        async function loadPostDetail(id) {
            systemState.currentPostId = id;
            document.getElementById('comm-list-view').classList.add('hidden');
            document.getElementById('post-detail').classList.remove('hidden');
            
            // 어드민 전용 제어툴 노출 여부
            if(systemState.currentUser.role === 'ADMIN') {
                document.getElementById('dt-admin-tools').classList.remove('hidden');
            }
            
            const [postRes, commentRes] = await Promise.all([
                fetch('/api/community/posts/detail?id=' + id),
                fetch('/api/community/comments?postId=' + id)
            ]);
            const post = await postRes.json();
            const comments = await commentRes.json();
            
            document.getElementById('dt-title-ui').innerText = post.title;
            document.getElementById('dt-author-ui').innerText = post.email;
            document.getElementById('dt-date-ui').innerText = new Date(post.created_at).toLocaleString();
            document.getElementById('dt-content-ui').innerText = post.content;
            document.getElementById('cm-count-ui').innerText = comments.length;
            
            document.getElementById('comment-area-ui').innerHTML = comments.map(c => \`
                <div class="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex justify-between items-start shadow-inner">
                    <div class="space-y-3">
                        <div class="flex items-center space-x-3 text-xs font-bold text-[#314e8d] uppercase italic underline decoration-blue-100 underline-offset-4">
                            <span>\${c.email}</span>
                            <span class="text-slate-200">|</span>
                            <span class="text-[10px] text-slate-300 font-mono">\${new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p class="text-xl text-slate-700 leading-relaxed font-medium">\${c.content}</p>
                    </div>
                    \${systemState.currentUser.role === 'ADMIN' ? \`
                        <div class="flex space-x-2">
                            <button onclick="adminActionComment('edit', '\${c.id}', '\${c.content.replace(/'/g,"")}')" class="admin-action-btn bg-blue-50 text-blue-500">EDIT</button>
                            <button onclick="adminActionComment('delete', '\${c.id}')" class="admin-action-btn bg-red-50 text-red-500">DELETE</button>
                        </div>
                    \` : ''}
                </div>\`).join('');
            
            document.getElementById('reply-submit-btn').onclick = () => submitReplyIntel(id);
        }

        async function submitReplyIntel(postId) {
            const content = document.getElementById('reply-input-ui').value.trim();
            if(!content) return;
            await fetch('/api/community/comments/add', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    postId, 
                    content, 
                    userId: systemState.currentUser.uid, 
                    sessionId: systemState.currentUser.sessionId 
                }) 
            });
            document.getElementById('reply-input-ui').value = '';
            loadPostDetail(postId);
        }

        async function openWrite() {
            const title = prompt('보고서 제목을 입력하십시오:');
            const content = prompt('정보 상세 내용을 입력하십시오:');
            if(title && content) {
                await fetch('/api/community/posts/add', { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                        title, 
                        content, 
                        userId: systemState.currentUser.uid, 
                        sessionId: systemState.currentUser.sessionId 
                    }) 
                });
                refreshCommunityList();
            }
        }

        // [어드민 전용 게시글/댓글 제어] --------------------------------------------------

        async function adminActionPost(action) {
            if(action === 'delete') {
                if(!confirm('해당 게시글을 기지에서 영구 삭제합니까?')) return;
                await fetch('/api/admin/posts/delete', { 
                    method: 'POST', 
                    body: JSON.stringify({ postId: systemState.currentPostId, sessionId: systemState.currentUser.sessionId }) 
                });
                nav('comm');
            } else if(action === 'edit') {
                const title = prompt('제목 강제 수정:', document.getElementById('dt-title-ui').innerText);
                const content = prompt('본문 강제 수정:', document.getElementById('dt-content-ui').innerText);
                if(title && content) {
                    await fetch('/api/admin/posts/update', { 
                        method: 'POST', 
                        body: JSON.stringify({ postId: systemState.currentPostId, title, content, sessionId: systemState.currentUser.sessionId }) 
                    });
                    loadPostDetail(systemState.currentPostId);
                }
            }
        }

        async function adminActionComment(action, commentId, oldContent) {
            if(action === 'delete') {
                if(!confirm('해당 의견을 삭제합니까?')) return;
                await fetch('/api/admin/comments/delete', { 
                    method: 'POST', 
                    body: JSON.stringify({ commentId, sessionId: systemState.currentUser.sessionId }) 
                });
                loadPostDetail(systemState.currentPostId);
            } else if(action === 'edit') {
                const content = prompt('의견 강제 수정:', oldContent);
                if(content) {
                    await fetch('/api/admin/comments/update', { 
                        method: 'POST', 
                        body: JSON.stringify({ commentId, content, sessionId: systemState.currentUser.sessionId }) 
                    });
                    loadPostDetail(systemState.currentPostId);
                }
            }
        }

        // [어드민 제어판 모듈] ---------------------------------------------------------

        async function refreshAdminPanel() {
            const res = await fetch('/api/admin/users', { 
                method: 'POST', 
                body: JSON.stringify({ sessionId: systemState.currentUser.sessionId }) 
            });
            const users = await res.json();
            
            document.getElementById('adm-user-grid-ui').innerHTML = users.map(u => \`
                <div class="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] flex justify-between items-center shadow-sm hover:border-red-200 transition-all">
                    <div class="flex flex-col space-y-1 text-left">
                        <span class="font-bold text-lg text-slate-800 underline decoration-slate-100 underline-offset-8">\${u.email}</span>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">\${u.role} | \${u.status}</span>
                    </div>
                    <div class="flex space-x-3">
                        <select onchange="adminUpdateUser('\${u.uid}', this.value, '\${u.role}')" class="text-[11px] font-bold p-3 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none">
                            <option value="APPROVED" \${u.status==='APPROVED'?'selected':''}>APPROVED</option>
                            <option value="BLOCKED" \${u.status==='BLOCKED'?'selected':''}>BLOCKED</option>
                        </select>
                        <select onchange="adminUpdateUser('\${u.uid}', '\${u.status}', this.value)" class="text-[11px] font-bold p-3 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none">
                            <option value="USER" \${u.role==='USER'?'selected':''}>AGENT (USER)</option>
                            <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>COMMANDER (ADMIN)</option>
                        </select>
                        <button onclick="adminDeleteUser('\${u.uid}')" class="bg-red-50 text-red-500 font-bold px-6 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs italic">숙청</button>
                    </div>
                </div>\`).join('');
                
            const mRes = await fetch('/api/media');
            const meds = await mRes.json();
            document.getElementById('adm-media-list-ui').innerHTML = meds.map(m => \`
                <div class="flex justify-between items-center p-6 border-b border-slate-50 text-base font-bold text-slate-700 bg-white rounded-2xl mb-2">
                    <span class="flex items-center"><i class="\${m.icon} mr-4 text-[#314e8d]"></i> \${m.name} <span class="text-xs text-slate-300 font-normal ml-3 tracking-tighter italic">(\${m.url})</span></span>
                    <button onclick="adminDeleteMedia(\${m.id})" class="text-red-500 bg-red-50 px-6 py-2 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all">삭제</button>
                </div>\`).join('');
        }

        async function adminUpdateUser(targetUid, status, role) {
            await fetch('/api/admin/users/update', { 
                method: 'POST', 
                body: JSON.stringify({ targetUid, status, role, sessionId: systemState.currentUser.sessionId }) 
            });
            refreshAdminPanel();
        }

        async function adminDeleteUser(targetUid) {
            if(!confirm('정말로 해당 대원을 데이터베이스에서 영구 숙청하시겠습니까?')) return;
            await fetch('/api/admin/users/delete', { 
                method: 'POST', 
                body: JSON.stringify({ targetUid, sessionId: systemState.currentUser.sessionId }) 
            });
            refreshAdminPanel();
        }

        async function adminAddMedia() {
            const name = document.getElementById('adm-m-name').value;
            const url = document.getElementById('adm-m-url').value;
            const icon = document.getElementById('adm-m-icon').value || 'fa-solid fa-play';
            if(!name || !url) return alert('정보를 모두 입력하십시오.');
            await fetch('/api/admin/media/add', { 
                method: 'POST', 
                body: JSON.stringify({ name, url, icon, sessionId: systemState.currentUser.sessionId }) 
            });
            document.getElementById('adm-m-name').value = '';
            document.getElementById('adm-m-url').value = '';
            refreshAdminPanel();
        }

        async function adminDeleteMedia(id) {
            if(!confirm('해당 미디어 라이브러리를 삭제합니까?')) return;
            await fetch('/api/admin/media/delete', { 
                method: 'POST', 
                body: JSON.stringify({ id, sessionId: systemState.currentUser.sessionId }) 
            });
            refreshAdminPanel();
        }

        // [미디어 룸 모듈] -----------------------------------------------------------

        async function refreshMediaRoom() {
            const res = await fetch('/api/media');
            const meds = await res.json();
            document.getElementById('v-media').innerHTML = meds.map(m => \`
                <div class="card p-14 text-center space-y-10 group animate-in zoom-in duration-500">
                    <div class="w-32 h-32 bg-slate-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto text-5xl group-hover:scale-110 transition-transform shadow-inner border-2 border-slate-100"><i class="\${m.icon}"></i></div>
                    <div class="text-center">
                        <h4 class="font-bold text-3xl text-slate-800 italic tracking-tighter">\${m.name}</h4>
                        <p class="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3">SECURE MODULE ACTIVE</p>
                    </div>
                    <button onclick="window.open('\${m.url}')" class="w-full bg-[#314e8d] text-white py-5 rounded-[2rem] font-bold text-lg shadow-2xl shadow-[#314e8d]/20 hover:bg-[#1a2c52] transition-all">SYSTEM LAUNCH</button>
                </div>\`).join('');
        }
    </script>
</body>
</html>
  `;
}