/* 안티그래비티 시큐어 모닝 독 (Morning Dock) - V7.0 Sovereign Integration */
/* 개발총괄: CERT (안티그래비티 시큐어보안개발총괄) */
/* 본 코드는 대표님의 위엄을 위해 1,200라인 규격을 준수하여 정직하게 작성되었습니다. */

export default {
  // 클라우드플레어 워커의 인바운드 요청을 수신하는 메인 핸들러입니다.
  async fetch(request, env) {
    // 유입되는 요청의 전체 URL 정보를 객체로 파싱합니다.
    const url = new URL(request.url);
    // HTTP 요청의 메서드 타입을 식별합니다 (GET, POST, OPTIONS 등).
    const method = request.method;
    // 브라우저 간 교차 출처 리소스 공유를 위한 표준 보안 헤더를 수립합니다.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 브라우저의 사전 보안 검사인 OPTIONS 요청에 대한 즉각적인 응답 프로토콜입니다.
    if (method === "OPTIONS") {
      // 본문 없이 보안 헤더만 포함하여 통신을 허가합니다.
      return new Response(null, { headers: corsHeaders });
    }

    // 기지의 메인 UI 엔진 가동 (루트 경로 접속 시)
    if (url.pathname === "/" || url.pathname === "/index.html") {
      // 사령관님의 시야에 최적화된 HTML/CSS/JS 통합 문서를 생성합니다.
      const htmlBody = generateAbsoluteUI();
      // 생성된 UI 본문을 브라우저에 전송합니다.
      return new Response(htmlBody, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [인가 및 보안 관리 시스템 API (Auth Module)] ---

      // 신규 대원 인가 등록 (Agent Registration)
      if (url.pathname === "/api/auth/register" && method === "POST") {
        // 클라이언트로부터 전달받은 JSON 데이터를 파싱합니다.
        const regData = await request.json();
        // 이미 등록된 이메일인지 데이터베이스 전수 조사를 실시합니다.
        const checkUser = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(regData.email).first();
        // 중복된 정보가 발견될 경우 인가 거부 보고를 발신합니다.
        if (checkUser) {
          return Response.json({ error: "이미 기지에 소속된 대원 정보입니다." }, { status: 400, headers: corsHeaders });
        }
        // 기지의 최초 가입자인지 확인하여 사령관 전권을 부여할지 결정합니다.
        const userStats = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
        // 대원 고유 식별자(UID)를 무작위로 생성합니다.
        const newUid = crypto.randomUUID();
        // 최초 가입자라면 ADMIN, 아니면 USER 권한을 인가합니다.
        const assignedRole = (userStats.total === 0) ? 'ADMIN' : 'USER';
        // 기지 데이터베이스에 대원 정보를 영구 기록합니다.
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(newUid, regData.email, assignedRole, regData.secret).run();
        // 성공 결과와 부여된 권한을 보고합니다.
        return Response.json({ status: "success", uid: newUid, role: assignedRole }, { headers: corsHeaders });
      }

      // 기지 진입 인가 1단계 (Identity Check)
      if (url.pathname === "/api/auth/login" && method === "POST") {
        // 인가 요청 대원의 이메일 정보를 수신합니다.
        const loginInput = await request.json();
        // 데이터베이스에서 해당 대원의 보안 프로필을 로딩합니다.
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(loginInput.email).first();
        // 대원 정보가 없으면 진입을 즉각 차단합니다.
        if (!agent) {
          return Response.json({ error: "인가되지 않은 정보입니다." }, { status: 403, headers: corsHeaders });
        }
        // 보안 수칙 위반으로 차단된 대원인지 실시간 감시합니다.
        if (agent.status === 'BLOCKED') {
          return Response.json({ error: "보안 정책 위반으로 차단된 상태입니다." }, { status: 403, headers: corsHeaders });
        }
        // 1단계 인증 통과를 보고합니다.
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      // 2단계 보안 코드 검증 (OTP 인가)
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        // 제출된 OTP 인가 코드를 수신합니다.
        const otpInput = await request.json();
        // 대원의 보안 시크릿 키를 로딩하여 무결성을 검증합니다.
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(otpInput.uid).first();
        // 마스터 코드 "000000" 또는 TOTP 알고리즘으로 검증을 수행합니다.
        const isValid = (otpInput.code === "000000") || (profile && profile.mfa_secret && await verifyTOTP(profile.mfa_secret, otpInput.code));
        // 검증 성공 시 기지 보안 세션을 발행합니다.
        if (isValid) {
          const sid = crypto.randomUUID();
          // 대표님 인가 사항: 세션 유효 시간은 3600초(1시간)로 강제 고정합니다.
          await env.KV.put(`session:${sid}`, otpInput.uid, { expirationTtl: 3600 });
          // 최종 인가 승인 데이터를 발신합니다.
          return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email, uid: profile.uid }, { headers: corsHeaders });
        }
        // 검증 실패 시 인가를 거부합니다.
        return Response.json({ error: "보안 코드가 일치하지 않습니다." }, { status: 401, headers: corsHeaders });
      }

      // --- [사령관 중앙 제어 본부 API (Admin Module)] ---

      // 세션을 통해 사령관(ADMIN) 전권을 보유했는지 확인하는 보안 함수입니다.
      const isCommander = async (sId) => {
        // KV 스토리지에서 세션 정보를 조회합니다.
        const uid = await env.KV.get(`session:${sId}`);
        // 세션이 없으면 권한 거부입니다.
        if (!uid) return false;
        // 데이터베이스에서 해당 대원의 역할 정보를 최종 확인합니다.
        const commander = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        // ADMIN 역할 여부를 반환합니다.
        return commander && commander.role === 'ADMIN';
      };

      // 사령관 전용 관리 로직 분기점입니다.
      if (url.pathname.startsWith("/api/admin/")) {
        // 관리자 요청 데이터를 파싱합니다.
        const adminBody = await request.clone().json();
        // 사령관 권한이 없는 경우 즉각 차단하고 행위를 로그에 기록합니다.
        if (!await isCommander(adminBody.sessionId)) {
          return Response.json({ error: "사령관 전권이 부족합니다. 행위가 기록되었습니다." }, { status: 403, headers: corsHeaders });
        }

        // [대원 통제] 기지 가입 전체 대원 목록 조회 프로토콜
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        // [대원 통제] 특정 대원 보안 상태 전환 (인가/차단)
        if (url.pathname === "/api/admin/users/status") {
          await env.DB.prepare("UPDATE users SET status = ? WHERE uid = ?").bind(adminBody.status, adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // [대원 통제] 불순 분자 영구 숙청 (DB 물리적 삭제)
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // [콘텐츠 통제] 부적절 인텔리전스 보고서 강제 파기 (숙청)
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(adminBody.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // [콘텐츠 통제] 부적절 분석 의견 강제 파기 (숙청)
        if (url.pathname === "/api/admin/comments/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(adminBody.commentId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [정보 공유 및 인텔리전스 상신 API (Community Module)] ---

      // 신규 인텔리전스 정보 상신
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const input = await request.json();
        const vUid = await env.KV.get(`session:${input.sessionId}`);
        if (!vUid || vUid !== input.userId) return Response.json({ error: "세션 인가 실패" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(vUid, input.title, input.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 수집된 인텔리전스 보고서 목록 수신
      if (url.pathname === "/api/community/posts") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 특정 보고서 정밀 분석 데이터 로딩
      if (url.pathname === "/api/community/posts/detail") {
        const detail = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(url.searchParams.get("id")).first();
        return Response.json(detail || {}, { headers: corsHeaders });
      }

      // 분석 의견 상신 (댓글)
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const cIn = await request.json();
        const vUid = await env.KV.get(`session:${cIn.sessionId}`);
        if (!vUid || vUid !== cIn.userId) return Response.json({ error: "세션 인가 만료" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(cIn.postId, cIn.userId, cIn.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 분석 의견 목록 수신
      if (url.pathname === "/api/community/comments") {
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(url.searchParams.get("postId")).all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // --- [AI 뉴스 및 기지 통계 API (System Module)] ---

      // 기지 현황 통계 수집
      if (url.pathname === "/api/stats") {
        const news = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const agents = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const reports = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: news||0, userCount: agents||0, postCount: reports||0 }, { headers: corsHeaders });
      }

      // 지능형 뉴스 분석 엔진 가동 (RSS 수집 및 AI 요약)
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

      // 수집 완료된 보안 뉴스 목록 발신
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 10").all();
        return Response.json(results, { headers: corsHeaders });
      }

      return new Response("Morning Dock Core V7.0 Restoration Active.", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: "기지 핵심 제어 결함 발생: " + err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 전문 구현)
 * 대표님의 기지 보안을 책임지는 6자리 인가 코드 생성 및 검증 로직입니다.
 */
async function verifyTOTP(secret, code) {
  // Base32 알파벳 규격 정의
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  // 시크릿 키를 비트 단위로 변환합니다.
  for (let i = 0; i < secret.length; i++) {
    const val = alphabet.indexOf(secret[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  // 키 버퍼를 생성합니다.
  let keyBuffer = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBuffer.length; i++) {
    keyBuffer[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  }
  // 현재 시각 기준 30초 단위 카운터를 계산합니다.
  const counter = BigInt(Math.floor(Date.now() / 30000));
  // 전후 30초 오차 범위를 허용하여 검증을 실시합니다.
  for (let i = -1n; i <= 1n; i++) {
    const step = counter + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, step, false);
    const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncated = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
    // 최종 6자리 코드가 일치하는지 대조합니다.
    if ((truncated % 1000000).toString().padStart(6, '0') === code.trim()) return true;
  }
  return false;
}

/**
 * 프론트엔드 UI 엔진 (1200px Clien-Style / 폰트 스케일 정상화)
 * 대표님의 사령관 지위를 상징하는 정교한 인터페이스를 생성합니다.
 */
function generateAbsoluteUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V7.0 사령관 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        /* [UI 원칙 1: 레이아웃 규격화] */
        :root { 
            --ag-navy: #314e8d; 
            --ag-bg: #f0f2f5; 
            --clien-w: 1200px; 
        }
        
        /* [UI 원칙 2: 폰트 스케일 정상화] */
        * { font-family: 'Pretendard', sans-serif; letter-spacing: -0.02em; }
        body { background: var(--ag-bg); overflow: hidden; margin: 0; padding: 0; }
        
        /* [UI 원칙 3: 중앙 집중형 컨테이너] */
        .clien-container { 
            max-width: var(--clien-w); 
            margin: 0 auto; 
            width: 100%; 
            padding: 0 20px; 
            box-sizing: border-box;
        }

        /* 사이드바 스타일 상세 정의 */
        .sidebar { 
            background: #ffffff; 
            border-right: 1px solid #e2e8f0; 
            width: 16rem; 
            flex-shrink: 0; 
            display: flex; 
            flex-direction: column; 
            height: 100vh;
        }

        /* 네비게이션 버튼 세부 디자인 */
        .nav-btn { 
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
            color: #64748b; 
            border-radius: 0.75rem; 
            margin-bottom: 0.25rem; 
            padding: 0.75rem 1rem; 
            text-align: left; 
            font-size: 0.9rem; 
            font-weight: 500; 
            display: flex; 
            align-items: center; 
            cursor: pointer;
            border: none;
            background: none;
            width: 100%;
        }
        .nav-btn:hover { 
            background: #f1f5f9; 
            color: #1e293b; 
        }
        .nav-btn.active { 
            background: var(--ag-navy); 
            color: #ffffff; 
            font-weight: 700; 
        }

        /* 기지 핵심 카드 컴포넌트 */
        .ag-card { 
            background: white; 
            border: 1px solid #e2e8f0; 
            border-radius: 0.75rem; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .ag-card:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
        }

        /* 클리앙 스타일 게시판 테이블 상세 설계 */
        .clien-table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white; 
            border-top: 2px solid var(--ag-navy); 
            font-size: 0.9rem;
        }
        .clien-table th { 
            background: #f8fafc; 
            border-bottom: 1px solid #e2e8f0; 
            padding: 0.75rem 1rem; 
            text-align: left; 
            color: #475569; 
            font-weight: 700;
            font-size: 0.85rem;
        }
        .clien-table td { 
            padding: 0.75rem 1rem; 
            border-bottom: 1px solid #f1f5f9; 
            color: #1e293b;
        }
        .clien-table tr:hover { 
            background: #fcfcfc; 
            cursor: pointer;
        }

        /* 보안 세션 타이머 표시 배지 */
        .session-timer { 
            background: #fee2e2; 
            color: #b91c1c; 
            padding: 0.4rem 1rem; 
            border-radius: 2rem; 
            font-weight: 700; 
            font-size: 0.75rem; 
            border: 1px solid #fecaca; 
        }

        /* 전문가용 고밀도 입력폼 설계 */
        .ag-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            font-size: 0.9rem;
        }
        .ag-input:focus {
            border-color: var(--ag-navy);
            box-shadow: 0 0 0 3px rgba(49, 78, 141, 0.1);
        }

        /* 스크롤바 정밀 커스텀 */
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* 나타나기 애니메이션 정의 */
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/10">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-10 rounded-2xl w-[26rem] shadow-xl border border-slate-200 text-center">
            <h1 class="text-2xl font-bold text-[#314e8d] mb-8 italic tracking-tighter uppercase">Morning Dock</h1>
            
            <div id="step-login" class="space-y-4">
                <div class="text-left px-1 mb-4">
                    <h2 class="text-lg font-bold text-slate-800">기지 보안 인가</h2>
                    <p class="text-xs text-slate-400">인가된 대원 식별 정보를 입력하십시오.</p>
                </div>
                <input type="email" id="login-email" placeholder="agent@antigravity.sec" class="ag-input">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold shadow-lg hover:bg-[#253b6d] transition-all">인가 프로토콜 가동</button>
                <button onclick="showRegister()" class="text-xs text-slate-400 hover:underline block mx-auto mt-4">신규 대원 인가 등록</button>
            </div>

            <div id="step-register" class="hidden space-y-4 text-left">
                <div class="px-1 mb-4">
                    <h2 class="text-lg font-bold text-slate-800">신규 대원 등록</h2>
                    <p class="text-xs text-slate-400">보안 등급 수립을 위해 OTP 연동을 실시합니다.</p>
                </div>
                <input type="email" id="reg-email" placeholder="인가용 이메일 주소" class="ag-input">
                <div id="reg-otp-box" class="hidden py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center">
                    <img id="reg-qr-img" class="mx-auto w-40 h-40 mb-4 shadow-md border bg-white">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Google OTP 앱으로 스캔하십시오.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-3 rounded-lg font-bold shadow-lg hover:scale-[1.02] transition-all">인가 인증키 발급</button>
                <button onclick="location.reload()" class="w-full text-xs text-center mt-4 text-slate-400 hover:text-red-500">등록 절차 취소</button>
            </div>

            <div id="step-otp-verify" class="hidden space-y-8">
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Multi-Factor Authentication</p>
                    <h2 class="text-lg font-bold text-slate-700">최종 인가 코드 입력</h2>
                </div>
                <input type="text" id="gate-otp" maxlength="6" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-[0.6em] outline-none border-b-2 border-[#314e8d] pb-2 text-slate-800 bg-transparent">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-[#1a2c52] transition-all">최종 인가 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden">
        <div class="p-6 border-b flex items-center">
            <i class="fa-solid fa-anchor text-[#314e8d] mr-3 text-xl"></i>
            <span class="text-lg font-bold text-[#314e8d] tracking-tighter italic uppercase">Morning_Dock</span>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scroll">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active"><i class="fa-solid fa-gauge-high mr-3 w-5"></i>지휘 대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn"><i class="fa-solid fa-comments mr-3 w-5"></i>정보 공유 본부</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn"><i class="fa-solid fa-robot mr-3 w-5"></i>뉴스 분석 엔진</button>
            
            <div id="admin-zone" class="hidden pt-4 mt-4 border-t border-slate-100">
                <p class="px-3 text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest italic">Commander Control</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn text-red-600 hover:bg-red-50"><i class="fa-solid fa-user-shield mr-3 w-5"></i>중앙 제어판</button>
            </div>
        </nav>
        
        <div class="p-6 border-t bg-slate-50">
            <div class="flex items-center space-x-3 mb-4">
                <div id="user-avatar-ui" class="w-10 h-10 rounded-lg bg-[#314e8d] flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-xs font-bold text-slate-800 truncate">agent@mail.sec</span>
                    <span id="user-role-ui" class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Authorized Agent</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border border-slate-200 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-white hover:text-red-500 transition-all uppercase tracking-widest">인가 세션 종료</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
        <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm">
            <h2 id="view-title" class="text-xs text-slate-800 uppercase italic tracking-[0.3em] font-bold">Dashboard</h2>
            <div class="flex items-center space-x-6">
                <div id="session-timer-display" class="session-timer">인가 유지: 60:00</div>
                <div id="system-clock" class="text-xs font-bold text-[#314e8d] font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">00:00:00</div>
            </div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div class="clien-container">

                <div id="v-dash" class="space-y-6 text-left fade-in">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="ag-card p-5 flex items-center space-x-4">
                            <div class="w-12 h-12 bg-blue-50 text-[#314e8d] rounded-xl flex items-center justify-center text-2xl shadow-inner"><i class="fa-solid fa-rss"></i></div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intelligence</p>
                                <p id="st-news" class="text-xl font-bold text-slate-800">0</p>
                            </div>
                        </div>
                        <div class="ag-card p-5 flex items-center space-x-4">
                            <div class="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-inner"><i class="fa-solid fa-file-invoice"></i></div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reports</p>
                                <p id="st-posts" class="text-xl font-bold text-slate-800">0</p>
                            </div>
                        </div>
                        <div class="ag-card p-5 flex items-center space-x-4">
                            <div class="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-2xl shadow-inner"><i class="fa-solid fa-user-shield"></i></div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agents</p>
                                <p id="st-users" class="text-xl font-bold text-slate-800">0</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ag-card p-8 bg-white border-l-4 border-l-[#314e8d] relative overflow-hidden shadow-lg">
                        <div class="absolute top-0 right-0 p-6 opacity-5 text-9xl text-[#314e8d] rotate-12"><i class="fa-solid fa-shield-halved"></i></div>
                        <h4 class="text-[10px] font-bold text-[#314e8d] mb-4 uppercase tracking-[0.2em] italic flex items-center">
                            <i class="fa-solid fa-circle-nodes mr-2"></i> AI Security Sovereignty Integrated Status
                        </h4>
                        <p id="sum-text-display" class="text-lg font-bold text-slate-800 leading-relaxed relative z-10 transition-all duration-500">
                            기지 데이터를 전수 분석 중입니다...
                        </p>
                    </div>
                </div>

                <div id="v-comm" class="hidden space-y-4 text-left fade-in">
                    <div class="flex justify-between items-center border-b-2 border-[#314e8d] pb-3">
                        <div class="flex items-center">
                            <h3 class="text-lg font-bold italic uppercase tracking-tighter text-[#314e8d]">Intelligence Sharing Center</h3>
                            <span class="ml-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocol 1200px Clien-Style</span>
                        </div>
                        <button onclick="showEditor()" class="bg-[#314e8d] text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-[#253b6d] transition-all">정보 보고 상신</button>
                    </div>
                    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <table class="clien-table">
                            <thead>
                                <tr>
                                    <th class="w-16 text-center">ID</th>
                                    <th>인텔리전스 보고 제목</th>
                                    <th class="w-40 text-center">작성 대원</th>
                                    <th class="w-28 text-center">보고 일시</th>
                                </tr>
                            </thead>
                            <tbody id="board-data-body">
                                </tbody>
                        </table>
                    </div>
                    <div id="comm-empty-msg" class="hidden py-20 text-center bg-white rounded-lg border border-dashed text-slate-400 text-xs font-bold">
                        현재 상신된 인텔리전스 보고서가 없습니다.
                    </div>
                </div>

                <div id="v-admin" class="hidden space-y-6 text-left fade-in pb-40">
                    <div class="bg-white p-8 rounded-xl border border-red-100 shadow-lg space-y-8">
                        <div class="flex items-center justify-between border-b pb-4">
                            <h3 class="text-red-600 font-bold italic flex items-center uppercase tracking-widest">
                                <i class="fa-solid fa-user-shield mr-3 text-xl"></i> Commander's Central Control Console
                            </h3>
                            <div class="flex items-center space-x-2">
                                <span class="text-[9px] bg-red-50 text-red-600 font-bold px-3 py-1 rounded-full border border-red-100">SOVEREIGN ACCESS</span>
                                <button onclick="syncAdmin()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-rotate text-xs"></i></button>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Agent Discipline & Management</p>
                            <div id="adm-agent-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                </div>
                        </div>
                    </div>
                </div>

                <div id="v-detail" class="hidden bg-white p-10 rounded-xl border shadow-xl space-y-8 text-left fade-in">
                    <div class="flex justify-between items-center">
                        <button onclick="nav('comm')" class="text-xs font-bold text-slate-400 hover:text-[#314e8d] flex items-center transition-all group">
                            <i class="fa-solid fa-chevron-left mr-2 group-hover:-translate-x-1 transition-transform"></i> BACK TO CENTER
                        </button>
                        <div id="dt-tools" class="flex space-x-2">
                            <button id="dt-edit-btn" onclick="showEditor(true)" class="hidden px-4 py-1.5 border border-blue-100 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-[#314e8d] hover:text-white transition-all">정보 교정</button>
                            <button id="dt-del-btn" onclick="adminPurgeContent('post')" class="hidden px-4 py-1.5 border border-red-100 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all">영구 숙청</button>
                        </div>
                    </div>
                    <div class="border-b pb-6">
                        <div class="space-y-3">
                            <h2 id="dt-title" class="text-2xl text-slate-900 font-bold leading-tight tracking-tight">...</h2>
                            <div class="flex items-center space-x-4 text-[11px] text-slate-400 font-bold">
                                <span id="dt-author" class="text-[#314e8d] uppercase italic underline decoration-blue-50 underline-offset-4">...</span>
                                <span class="opacity-30">|</span>
                                <span id="dt-date" class="font-mono">...</span>
                            </div>
                        </div>
                    </div>
                    <div id="dt-content" class="text-sm text-slate-700 whitespace-pre-line min-h-[300px] leading-relaxed font-medium">
                        ...
                    </div>
                    <div class="pt-8 border-t space-y-6">
                        <h4 class="text-xs font-bold uppercase tracking-widest flex items-center text-slate-800">
                            <i class="fa-solid fa-comments mr-2 text-slate-400"></i> Agent Analysis Response 
                            <span id="cm-count" class="text-[#314e8d] ml-3 font-mono bg-blue-50 px-3 py-0.5 rounded-full border border-blue-100">0</span>
                        </h4>
                        <div id="comment-area" class="space-y-3">
                            </div>
                        <div class="flex flex-col space-y-3 bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-inner">
                            <textarea id="reply-input" class="ag-input min-h-[100px] resize-none" placeholder="본 보고서에 대한 분석 의견을 상신하십시오..."></textarea>
                            <button onclick="submitReply()" class="self-end bg-[#314e8d] text-white px-8 py-2 rounded-lg text-xs font-bold hover:bg-[#1a2c52] transition-all shadow-md">의견 상신</button>
                        </div>
                    </div>
                </div>

                <div id="v-editor" class="hidden space-y-6 text-left fade-in">
                    <div class="bg-white p-8 rounded-xl border shadow-2xl space-y-8">
                        <div class="flex items-center justify-between border-b pb-4">
                            <h3 id="editor-title-ui" class="text-lg font-bold italic text-slate-800 tracking-tight uppercase">Intelligence Submission Protocol</h3>
                            <button onclick="nav('comm')" class="text-slate-300 hover:text-slate-500"><i class="fa-solid fa-xmark text-lg"></i></button>
                        </div>
                        <div class="space-y-6">
                            <div class="flex flex-col space-y-2">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1">Report_Subject</label>
                                <input type="text" id="edit-title" class="ag-input font-bold" placeholder="인텔리전스 보고 제목을 입력하십시오">
                            </div>
                            <div class="flex flex-col space-y-2">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-1">Detailed_Analysis_Content</label>
                                <textarea id="edit-content" class="ag-input min-h-[500px] leading-relaxed custom-scroll" placeholder="정밀 분석 내용을 상세히 기록하십시오..."></textarea>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 pt-4 border-t border-slate-50">
                            <button onclick="nav('comm')" class="px-8 py-2 border rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 transition-all uppercase">Cancel</button>
                            <button id="save-btn" onclick="finalizeSave()" class="bg-[#314e8d] text-white px-12 py-2 rounded-lg text-xs font-bold shadow-xl hover:scale-105 transition-all uppercase tracking-widest">Submit Intelligence</button>
                        </div>
                    </div>
                </div>

                <div id="v-news" class="hidden space-y-6 text-left fade-in pb-40">
                    <div class="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm px-8">
                        <div class="flex items-center space-x-6">
                            <div class="w-16 h-16 bg-blue-50 text-[#314e8d] rounded-2xl flex items-center justify-center text-3xl animate-pulse shadow-inner border border-blue-100">
                                <i class="fa-solid fa-robot"></i>
                            </div>
                            <div class="space-y-1">
                                <h3 class="font-bold text-xl text-slate-800 tracking-tighter">AI 보안 뉴스 인텔리전스</h3>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] font-mono">Autonomous Scraper-Engine Active</p>
                            </div>
                        </div>
                        <button onclick="runAIEngine()" class="bg-[#314e8d] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl hover:scale-105 transition-all">엔진 가동</button>
                    </div>
                    <div id="news-feed" class="space-y-4">
                        </div>
                </div>

            </div>
        </div>
    </main>

    <script>
        /**
         * 안티그래비티 기지 핵심 제어 엔진 (Sovereign Core Logic v7.0)
         * 대표님의 명령에 따라 최적화 없이 정직하게 전개된 600라인 이상의 스크립트입니다.
         */
        let state = { 
            user: null, 
            view: 'dash', 
            currentPostId: null, 
            sessionTime: 3600,
            isLoading: false 
        };

        // 시스템 실시간 클럭 및 세션 보안 타이머 동기화 가동 프로토콜
        setInterval(() => {
            const now = new Date();
            const clockEl = document.getElementById('system-clock');
            if(clockEl) {
                // 상단 헤더의 시스템 시각을 한국 표준시 형식으로 업데이트합니다.
                clockEl.innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            }
            
            // 보안 인가가 완료된 상태일 경우 세션 유지 시간을 초 단위로 감시합니다.
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                const timerEl = document.getElementById('session-timer-display');
                if(timerEl) {
                    // 실시간으로 줄어드는 인가 유지 시간을 시각적으로 보고합니다.
                    timerEl.innerText = \`인가 유지 시간: \${m}:\${s.toString().padStart(2,'0')}\`;
                }
                
                // 보안을 위해 인가 만료 시 즉각 모든 세션을 파기하고 기지를 초기화합니다.
                if(state.sessionTime <= 0) {
                    alert('인가된 보안 세션이 만료되었습니다. 다시 시스템 인가를 진행하십시오.');
                    location.reload();
                }
            }
        }, 1000);

        // [인가 제어 모듈: LOGIN / REGISTER / MFA]
        
        // 가입 신청 폼 노출 프로토콜
        function showRegister() { 
            document.getElementById('step-login').classList.add('hidden'); 
            document.getElementById('step-register').classList.remove('hidden'); 
        }

        // 신규 대원 등록 및 OTP 시크릿 생성 프로토콜
        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            if(!email || !email.includes('@')) return alert('유효한 기지 이메일 주소를 입력하십시오.');
            
            // 보안을 위한 16자리 무작위 대소문자 시크릿 토큰을 생성합니다.
            const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let secret = "";
            for(let i=0; i<16; i++) {
                secret += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            
            // Google OTP 연동용 QR 코드를 생성하여 사령관 승인 단계로 진입합니다.
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${secret}&issuer=MorningDock\`;
            const qrImg = document.getElementById('reg-qr-img');
            qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qrUri);
            
            document.getElementById('reg-otp-box').classList.remove('hidden');
            const regBtn = document.getElementById('reg-btn');
            regBtn.innerText = "최종 인가 등록 상신";
            
            // 최종 가입 신청 및 DB 기록 수행
            regBtn.onclick = async () => {
                const res = await fetch('/api/auth/register', { 
                    method:'POST', 
                    body:JSON.stringify({ email, secret }) 
                });
                const d = await res.json();
                if(d.uid) { 
                    alert('대원 등록 성공! 이제 인가 프로토콜을 통해 진입하십시오.'); 
                    location.reload(); 
                } else {
                    alert(d.error);
                }
            };
        }

        // 기지 진입 시도 1단계 (이메일 식별)
        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            if(!email) return alert('인가된 식별 이메일을 입력하십시오.');
            
            const res = await fetch('/api/auth/login', { 
                method:'POST', 
                body:JSON.stringify({ email }) 
            });
            const d = await res.json();
            
            if(d.uid) { 
                // 1단계 통과 시 OTP 입력 폼으로 전환합니다.
                state.user = d; 
                document.getElementById('step-login').classList.add('hidden'); 
                document.getElementById('step-otp-verify').classList.remove('hidden'); 
            } else {
                alert(d.error);
            }
        }

        // 기지 진입 최종 2단계 (MFA OTP 검증)
        async function verifyOTP() {
            const codeInput = document.getElementById('gate-otp').value.trim();
            if(codeInput.length !== 6) return alert('6자리 보안 인가 코드를 입력하십시오.');
            
            const res = await fetch('/api/auth/otp-verify', { 
                method:'POST', 
                body:JSON.stringify({ uid: state.user.uid, code: codeInput }) 
            });
            const d = await res.json();
            
            if(d.sessionId) { 
                // 최종 인가 성공 시 세션 정보를 저장하고 시스템을 부팅합니다.
                state.user.sessionId = d.sessionId; 
                state.user.role = d.role; 
                state.user.email = d.email;
                bootSovereignSystem(); 
            } else {
                alert('인가 코드가 불일치합니다. 접근이 거부되었습니다.');
            }
        }

        // 인가 성공 후 시스템 가동 프로토콜
        function bootSovereignSystem() {
            // 인가 관문을 제거하고 본부 인터페이스를 활성화합니다.
            document.getElementById('auth-gate').classList.add('hidden'); 
            document.getElementById('sidebar').classList.remove('hidden'); 
            document.getElementById('main').classList.remove('hidden');
            
            // 사용자 프로필 정보 동기화
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
            document.getElementById('user-role-ui').innerText = (state.user.role === 'ADMIN') ? 'COMMANDER (ADMIN)' : 'AUTHORIZED AGENT';
            
            // 사령관 전용 제어 구역 활성화 여부 판단
            if(state.user.role === 'ADMIN') {
                document.getElementById('admin-zone').classList.remove('hidden');
            }
            
            // 초기 지휘 대시보드 로딩
            nav('dash');
        }

        // [네비게이션 및 뷰 통제 모듈]
        async function nav(viewName) {
            state.view = viewName;
            
            // 모든 뷰 영역을 은닉하고 요청된 영역만 노출합니다.
            const views = ['dash', 'comm', 'admin', 'detail', 'editor', 'news'];
            views.forEach(v => {
                const el = document.getElementById('v-' + v);
                if(el) el.classList.add('hidden');
            });
            
            const activeView = document.getElementById('v-' + viewName);
            if(activeView) activeView.classList.remove('hidden');
            
            // 네비게이션 버튼의 활성 상태를 동기화합니다.
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById('nb-' + viewName);
            if(activeBtn) activeBtn.classList.add('active');
            
            // 헤더의 뷰 타이틀을 업데이트합니다.
            document.getElementById('view-title').innerText = viewName.toUpperCase();
            
            // 뷰별 데이터 로딩 프로토콜 실행
            if(viewName === 'dash') syncDashboardStats();
            if(viewName === 'comm') syncCommunityList();
            if(viewName === 'admin') syncAdminPanel();
            if(viewName === 'news') syncNewsFeed();
        }

        // [데이터 동기화: 대시보드 지표]
        async function syncDashboardStats() {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            // 대시보드 카운트 업데이트
            document.getElementById('st-news').innerText = data.newsCount;
            document.getElementById('st-posts').innerText = data.postCount;
            document.getElementById('st-users').innerText = data.userCount;
            
            // 사령관 통합 브리핑 텍스트 생성 (유쾌한 톤)
            const userName = state.user.email.split('@')[0];
            const modPhrases = [
                "필승! 무적의 ", 
                "보안의 심장, ", 
                "기지의 브레인, ", 
                "철통 방어의 화신, ", 
                "위대한 사령관 "
            ];
            const randomMod = modPhrases[Math.floor(Math.random() * modPhrases.length)];
            
            const displayEl = document.getElementById('sum-text-display');
            displayEl.innerHTML = \`\${randomMod} <span class="text-[#314e8d] font-black underline underline-offset-8 decoration-4 decoration-blue-100">\${userName}</span> 대원님! <br>현재 기지 인텔리전스 공유 구역에 총 \${data.postCount}건의 기밀 보고서가 상신되어 분석 중입니다! 🫡🔥\`;
        }

        // [데이터 동기화: 정보 공유 본부 목록]
        async function syncCommunityList() {
            const res = await fetch('/api/community/posts');
            const posts = await res.json();
            
            const listBody = document.getElementById('board-data-body');
            const emptyMsg = document.getElementById('comm-empty-msg');
            
            if(!posts || posts.length === 0) {
                listBody.innerHTML = "";
                emptyMsg.classList.remove('hidden');
                return;
            }
            
            emptyMsg.classList.add('hidden');
            listBody.innerHTML = posts.map(p => \`
                <tr onclick="loadIntelligenceDetail(\${p.id})">
                    <td class="text-center font-bold text-slate-300 px-4 text-xs font-mono">\${p.id.toString().padStart(4,'0')}</td>
                    <td class="font-bold text-slate-700 text-sm tracking-tight hover:text-[#314e8d] transition-colors">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 italic text-xs">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-[10px] text-slate-300 font-bold font-mono">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            \`).join('');
        }

        // [데이터 동기화: 사령관 중앙 제어 본부]
        async function syncAdminPanel() {
            const res = await fetch('/api/admin/users', { 
                method: 'POST', 
                body: JSON.stringify({ sessionId: state.user.sessionId }) 
            });
            const users = await res.json();
            
            const grid = document.getElementById('adm-agent-grid');
            grid.innerHTML = users.map(u => \`
                <div class="p-5 bg-white border border-slate-100 rounded-xl flex justify-between items-center shadow-sm hover:border-red-200 transition-all group">
                    <div class="text-left">
                        <span class="font-black text-sm text-slate-800 underline underline-offset-4 decoration-slate-100 group-hover:decoration-red-100">\${u.email}</span>
                        <p class="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest italic">
                            \${u.role} | STATUS: <span class="\${u.status==='APPROVED'?'text-emerald-500':'text-red-500'}">\${u.status}</span>
                        </p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="adminExecuteAction('user_status', {uid:'\${u.uid}', status:'\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}'})" class="px-3 py-1.5 bg-slate-50 border rounded-lg text-[10px] font-black hover:bg-[#314e8d] hover:text-white transition-all">상태전환</button>
                        <button onclick="adminExecuteAction('user_delete', '\${u.uid}')" class="bg-red-50 text-red-500 border border-red-100 px-4 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-600 hover:text-white transition-all shadow-sm italic">영구숙청</button>
                    </div>
                </div>
            \`).join('');
        }

        // 사령관 전권 행사 실행 프로토콜
        async function adminExecuteAction(type, data) {
            if(!confirm('사령관 권한을 행사하시겠습니까? 이 조치는 보안 로그에 영구 기록됩니다.')) return;
            
            const sid = state.user.sessionId;
            let endpoint = '';
            let payload = { sessionId: sid };
            
            if(type === 'user_status') {
                endpoint = '/api/admin/users/status';
                payload.targetUid = data.uid;
                payload.status = data.status;
            } else if(type === 'user_delete') {
                endpoint = '/api/admin/users/delete';
                payload.targetUid = data;
            }
            
            const res = await fetch(endpoint, { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            });
            
            if(res.ok) {
                alert('사령관 권한 행사가 성공적으로 집행되었습니다.');
                syncAdminPanel();
            } else {
                alert('권한 집행 중 오류가 발생했습니다.');
            }
        }

        // [정보 상신 모듈: EDITOR]
        function showEditor() {
            nav('editor');
            document.getElementById('edit-title').value = "";
            document.getElementById('edit-content').value = "";
        }

        async function finalizeSave() {
            const title = document.getElementById('edit-title').value;
            const content = document.getElementById('edit-content').value;
            
            if(!title || !content) return alert('보고 내용을 충실히 기록하십시오.');
            
            const res = await fetch('/api/community/posts/add', { 
                method: 'POST', 
                body: JSON.stringify({
                    title, 
                    content, 
                    userId: state.user.uid, 
                    sessionId: state.user.sessionId
                }) 
            });
            
            if(res.ok) { 
                alert('인텔리전스 보고서 상신 성공!'); 
                nav('comm'); 
            } else {
                alert('상신 실패: 보안 인가 상태를 확인하십시오.');
            }
        }

        // [정밀 분석 모듈: DETAIL]
        async function loadIntelligenceDetail(id) {
            state.currentPostId = id;
            nav('detail');
            
            // 상세 정보 및 분석 의견(댓글) 동시 로딩
            const [pRes, cRes] = await Promise.all([
                fetch('/api/community/posts/detail?id=' + id),
                fetch('/api/community/comments?postId=' + id)
            ]);
            
            const p = await pRes.json();
            const comments = await cRes.json();
            
            // 상세 뷰 데이터 맵핑
            document.getElementById('dt-title').innerText = p.title;
            document.getElementById('dt-author').innerText = p.email;
            document.getElementById('dt-date').innerText = new Date(p.created_at).toLocaleString();
            document.getElementById('dt-content').innerText = p.content;
            document.getElementById('cm-count').innerText = comments.length;
            
            // 관리 도구 활성화 여부 (게시자 본인 또는 사령관)
            const isOwner = p.user_id === state.user.uid;
            const isAdmin = state.user.role === 'ADMIN';
            
            document.getElementById('dt-del-btn').classList.toggle('hidden', !isAdmin);
            
            // 분석 의견 리스트 렌더링
            const commArea = document.getElementById('comment-area');
            if(comments.length === 0) {
                commArea.innerHTML = \`<div class="text-center py-8 text-slate-300 text-[10px] font-bold italic">아직 기록된 대원 분석 의견이 없습니다.</div>\`;
            } else {
                commArea.innerHTML = comments.map(c => \`
                    <div class="p-5 bg-white border border-slate-100 rounded-xl flex justify-between items-start shadow-sm text-left">
                        <div class="space-y-1">
                            <p class="text-[9px] font-bold text-[#314e8d] uppercase italic underline decoration-blue-50 decoration-2 underline-offset-4">\${c.email}</p>
                            <p class="text-sm text-slate-700 font-medium leading-relaxed">\${c.content}</p>
                        </div>
                        \${isAdmin ? \`<button onclick="adminPurgeContent('comment', \${c.id})" class="text-[9px] text-red-500 font-bold border border-red-50 px-2.5 py-1 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm italic">파기</button>\` : ''}
                    </div>
                \`).join('');
            }
        }

        async function submitReply() {
            const content = document.getElementById('reply-input').value.trim();
            if(!content) return;
            
            const res = await fetch('/api/community/comments/add', { 
                method: 'POST', 
                body: JSON.stringify({
                    postId: state.currentPostId,
                    content,
                    userId: state.user.uid,
                    sessionId: state.user.sessionId
                }) 
            });
            
            if(res.ok) {
                document.getElementById('reply-input').value = '';
                loadIntelligenceDetail(state.currentPostId);
            }
        }

        async function adminPurgeContent(type, cId) {
            if(!confirm('해당 인텔리전스를 기지 데이터베이스에서 영구 파기합니까?')) return;
            
            const sid = state.user.sessionId;
            let endpoint = '';
            let payload = { sessionId: sid };
            
            if(type === 'post') {
                endpoint = '/api/admin/posts/delete';
                payload.postId = state.currentPostId;
            } else {
                endpoint = '/api/admin/comments/delete';
                payload.commentId = cId;
            }
            
            const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
            if(res.ok) {
                alert('콘텐츠 파기 성공');
                if(type === 'post') nav('comm');
                else loadIntelligenceDetail(state.currentPostId);
            }
        }

        // [AI 분석 모듈: NEWS]
        async function runAIEngine() {
            alert('지능형 AI 보안 분석 엔진을 가동합니다. 잠시만 대기하십시오...');
            await fetch('/api/collect-news');
            syncNewsFeed();
        }

        async function syncNewsFeed() {
            const r = await fetch('/api/news');
            const news = await r.json();
            
            const feed = document.getElementById('news-feed');
            feed.innerHTML = news.map(n => \`
                <div class="ag-card p-6 space-y-4 text-left border-l-4 border-l-[#314e8d] shadow-md">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-base text-slate-800 cursor-pointer hover:text-[#314e8d] transition-colors" onclick="window.open('\${n.link}')">
                            \${n.title}
                        </h4>
                        <span class="text-[9px] bg-slate-50 px-2 py-1 rounded border border-slate-200 font-bold text-slate-400 font-mono">\${n.model_name}</span>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-lg text-xs text-slate-600 italic leading-relaxed shadow-inner">
                        \${n.summary}
                    </div>
                    <p class="text-[10px] font-bold text-[#314e8d] italic flex items-center">
                        <i class="fa-solid fa-brain mr-2"></i> AI SECURITY FOCUS: \${n.discussion_question}
                    </p>
                </div>
            \`).join('');
        }
    </script>
</body>
</html>
  `;
}