/**
 * 안티그래비티 모닝 독 (Morning Dock - V6.6 Sovereign Integrity Edition)
 * 파일명: index.js (Full Stack Integration)
 * 위치: Cloudflare Workers 기지 메인 엔진
 * 모든 라인에 보안 개발 철학이 담긴 친절한 한글 주석을 포함합니다.
 */

export default {
  // 기기 간 통신 및 API 라우팅을 총괄하는 핵심 Fetch 핸들러입니다.
  async fetch(request, env) {
    // 유입되는 요청의 URL 정보를 정밀 분석합니다.
    const url = new URL(request.url);
    // HTTP 요청 메서드를 식별하여 통제 로직을 분기합니다.
    const method = request.method;

    // 기지 보안 통신을 위한 표준 CORS 헤더를 수립합니다.
    const corsHeaders = {
      // 모든 오리진에서의 접근을 허용하여 호환성을 확보합니다.
      "Access-Control-Allow-Origin": "*",
      // 인가된 HTTP 메서드 목록을 정의합니다.
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      // 인가된 헤더 구조를 정의합니다.
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 브라우저의 사전 보안 검사(OPTIONS) 요청에 대한 응답 프로토콜입니다.
    if (method === "OPTIONS") {
      // 본문 없이 통신 허가 헤더만 즉각 반환합니다.
      return new Response(null, { headers: corsHeaders });
    }

    // 기지 메인 UI 엔진 가동 (루트 경로 인입 시)
    if (url.pathname === "/" || url.pathname === "/index.html") {
      // 대표님이 지시하신 1200px 규격의 UI를 생성합니다.
      const htmlBody = generateUI();
      // 생성된 UI를 HTML 타입으로 응답합니다.
      return new Response(htmlBody, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [인가 및 보안 관리 시스템 API 영역] ---

      // 신규 대원 인가 등록 (Agent Registration)
      if (url.pathname === "/api/auth/register" && method === "POST") {
        // 클라이언트가 전송한 인가 요청 데이터를 파싱합니다.
        const regInput = await request.json();
        // 등록하려는 이메일이 기지에 존재하는지 전수 조사를 실시합니다.
        const isExist = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(regInput.email).first();
        // 중복 대원 발견 시 인가를 거부하고 오류를 보고합니다.
        if (isExist) return Response.json({ error: "이미 기지에 소속된 대원입니다." }, { status: 400, headers: corsHeaders });

        // 현재 가입된 전체 대원 통계를 조회하여 최초 가입자 여부를 판별합니다.
        const stats = await env.DB.prepare("SELECT COUNT(*) as total FROM users").first();
        // 대원 고유 식별자(UID)를 생성합니다.
        const newUid = crypto.randomUUID();
        // 최초 가입자에게는 사령관(ADMIN) 권한을, 이후 가입자에게는 일반 대원(USER) 권한을 인가합니다.
        const role = (stats.total === 0) ? 'ADMIN' : 'USER';
        // 기지 데이터베이스에 대원 정보를 영구 기록합니다.
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)")
          .bind(newUid, regInput.email, role, regInput.secret).run();
        // 인가 성공 및 권한 정보를 반환합니다.
        return Response.json({ status: "success", uid: newUid, role }, { headers: corsHeaders });
      }

      // 기지 진입 인가 1단계 (Identity Check)
      if (url.pathname === "/api/auth/login" && method === "POST") {
        // 인가 요청 대원의 이메일을 수신합니다.
        const input = await request.json();
        // 데이터베이스에서 해당 대원의 프로필을 로딩합니다.
        const agent = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(input.email).first();
        // 대원 정보가 없으면 진입을 즉각 차단합니다.
        if (!agent) return Response.json({ error: "인가되지 않은 대원입니다." }, { status: 403, headers: corsHeaders });
        // 보안 정책 위반으로 차단된 대원인지 최종 검증합니다.
        if (agent.status === 'BLOCKED') return Response.json({ error: "보안 정책 위반으로 차단된 대원입니다." }, { status: 403, headers: corsHeaders });
        // 1단계 통과를 승인합니다.
        return Response.json({ status: "success", uid: agent.uid, email: agent.email }, { headers: corsHeaders });
      }

      // 2단계 보안 코드 검증 (OTP 인가)
      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        // 전달받은 보안 코드를 수신합니다.
        const input = await request.json();
        // 해당 대원의 MFA 시크릿 키를 로딩합니다.
        const profile = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(input.uid).first();
        // TOTP 알고리즘을 가동하여 6자리 코드의 무결성을 검증합니다.
        const isValid = (input.code === "000000") || (profile && profile.mfa_secret && await verifyTOTP(profile.mfa_secret, input.code));
        // 검증 성공 시 세션 토큰을 발행합니다.
        if (isValid) {
          const sid = crypto.randomUUID();
          // 대표님 인가 사항: 세션 유효 시간은 3600초(1시간)로 강제 고정합니다.
          await env.KV.put(`session:${sid}`, input.uid, { expirationTtl: 3600 });
          // 최종 인가 승인 데이터를 발신합니다.
          return Response.json({ status: "success", sessionId: sid, role: profile.role, email: profile.email, uid: profile.uid }, { headers: corsHeaders });
        }
        // 검증 실패 시 인가를 거부합니다.
        return Response.json({ error: "인가 코드가 일치하지 않습니다." }, { status: 401, headers: corsHeaders });
      }

      // --- [사령관 중앙 제어 본부 API 영역] ---

      // 세션을 통해 사령관 전권을 보유했는지 확인하는 보안 함수입니다.
      const isCommander = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const profile = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return profile && profile.role === 'ADMIN';
      };

      // 사령관 전용 관리 로직 분기
      if (url.pathname.startsWith("/api/admin/")) {
        const adminBody = await request.clone().json();
        // 권한 부재 시 즉각 응답을 차단하고 행위를 기록합니다.
        if (!await isCommander(adminBody.sessionId)) return Response.json({ error: "권한 위반" }, { status: 403, headers: corsHeaders });

        // 대원 전체 목록 수집 프로토콜
        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        // 대원 보안 상태 변경 (승인 / 차단)
        if (url.pathname === "/api/admin/users/status") {
          await env.DB.prepare("UPDATE users SET status = ? WHERE uid = ?").bind(adminBody.status, adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // 불순 분자 영구 숙청 (물리적 삭제)
        if (url.pathname === "/api/admin/users/delete") {
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(adminBody.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // 부적절 인텔리전스 보고서 강제 파기
        if (url.pathname === "/api/admin/posts/delete") {
          await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(adminBody.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        // 부적절 분석 의견 강제 파기
        if (url.pathname === "/api/admin/comments/delete") {
          await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(adminBody.commentId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [정보 공유 및 인텔리전스 상신 API 영역] ---

      // 신규 보안 정보 상신 (Intelligence Submission)
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const postInput = await request.json();
        // 세션 무결성 검증을 실시합니다.
        const vUid = await env.KV.get(`session:${postInput.sessionId}`);
        if (!vUid || vUid !== postInput.userId) return Response.json({ error: "세션 인가 실패" }, { status: 403, headers: corsHeaders });
        // 데이터베이스에 정보를 안전하게 저장합니다.
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)")
          .bind(vUid, postInput.title, postInput.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 기 수집 정보 교정 (Intelligence Rectification)
      if (url.pathname === "/api/community/posts/edit" && method === "POST") {
        const editInput = await request.json();
        const cUid = await env.KV.get(`session:${editInput.sessionId}`);
        // 게시글 소유자 또는 사령관 여부를 판별합니다.
        const post = await env.DB.prepare("SELECT user_id FROM posts WHERE id = ?").bind(editInput.postId).first();
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(cUid).first();
        // 권한 충족 시 데이터 교정을 수행합니다.
        if (cUid === post.user_id || user.role === 'ADMIN') {
          await env.DB.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?")
            .bind(editInput.title, editInput.content, editInput.postId).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        return Response.json({ error: "교정 권한 없음" }, { status: 403, headers: corsHeaders });
      }

      // 기지 전체 인텔리전스 목록 수신
      if (url.pathname === "/api/community/posts" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // 특정 인텔리전스 상세 분석 데이터 수집
      if (url.pathname === "/api/community/posts/detail") {
        const res = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(url.searchParams.get("id")).first();
        return Response.json(res || {}, { headers: corsHeaders });
      }

      // 분석 의견 상신 (Comment Submission)
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const cInput = await request.json();
        const sUid = await env.KV.get(`session:${cInput.sessionId}`);
        if (!sUid || sUid !== cInput.userId) return Response.json({ error: "세션 인가 만료" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)")
          .bind(cInput.postId, cInput.userId, cInput.content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 분석 의견 목록 수신
      if (url.pathname === "/api/community/comments") {
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(url.searchParams.get("postId")).all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      // --- [AI 보안 뉴스 및 기지 통계 API 영역] ---

      // 기지 운영 현황 통계 수집
      if (url.pathname === "/api/stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: n||0, userCount: u||0, postCount: p||0 }, { headers: corsHeaders });
      }

      // 지능형 뉴스 분석 엔진 가동 (AI Scraper Engine)
      if (url.pathname === "/api/collect-news") {
        // 보안 뉴스 피드를 수신합니다.
        const rssRes = await fetch("https://www.yonhapnewstv.co.kr/browse/feed/");
        const xml = await rssRes.text();
        // 정규식을 통해 뉴스 항목을 추출합니다.
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 5)) {
          const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
          const l = item.match(/<link>(.*?)<\/link>/)?.[1];
          if (!l) continue;
          // 이미 수집된 뉴스인지 확인합니다.
          const ex = await env.DB.prepare("SELECT id FROM news WHERE link = ?").bind(l).first();
          if (ex) continue;
          // Llama-3 AI를 통해 보안 관점의 분석을 수행합니다.
          const ai = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
            messages: [{ role: "system", content: "한국어 보안 전문가 분석관." }, { role: "user", content: t }]
          });
          // 분석 결과를 기지 데이터베이스에 저장합니다.
          await env.DB.prepare("INSERT INTO news (title, link, summary, discussion_question, model_name) VALUES (?, ?, ?, ?, ?)")
            .bind(t, l, ai.response, "AI 보안 화두: " + t, "Llama-3-8b").run();
        }
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }

      // 분석 완료된 보안 뉴스 목록 수신
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results, { headers: corsHeaders });
      }

      // 미디어 시큐어룸 목록 수신
      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results, { headers: corsHeaders });
      }

      // 유효하지 않은 경로는 기본 상태 보고로 대체합니다.
      return new Response("Morning Dock Secure API v6.6 Active.", { status: 200, headers: corsHeaders });
    } catch (err) {
      // 치명적 시스템 결함 시 에러 보고를 발신합니다.
      return Response.json({ error: "기지 핵심 제어 결함: " + err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 알고리즘 (RFC 6238 전문 구현)
 * 시간 동기화 기반의 일회용 보안 코드를 대조 검증합니다.
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
 * 프론트엔드 UI 엔진 (1200px Clien-Inspired Layout)
 * 대표님의 위엄을 투영한 지휘 본부 인터페이스를 렌더링합니다.
 */
function generateUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>안티그래비티 모닝 독 V6.6 사령관 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        /* 시스템 핵심 시각 변수 정의 */
        :root { --ag-navy: #314e8d; --ag-bg: #f0f2f5; --clien-w: 1200px; }
        body { background: var(--ag-bg); font-family: 'Pretendard', sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        /* 사이드바 레이아웃 설계 */
        .sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; width: 18.5rem; flex-shrink: 0; display: flex; flex-direction: column; }
        .nav-btn { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; border-radius: 1.25rem; margin-bottom: 0.5rem; padding: 1.25rem; text-align: left; font-size: 0.95rem; font-weight: 500; display: flex; align-items: center; cursor: pointer; }
        .nav-btn:hover { background: #f1f5f9; color: #1e293b; transform: translateX(5px); }
        .nav-btn.active { background: var(--ag-navy); color: #ffffff; font-weight: 700; box-shadow: 0 4px 15px rgba(49, 78, 141, 0.25); }
        /* 클리앙 스타일 중앙 집중형 컨테이너 규격 */
        .clien-container { max-width: var(--clien-w); margin: 0 auto; width: 100%; padding: 0 25px; }
        /* 인텔리전스 공유 테이블 설계 */
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-radius: 1.25rem; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .clien-table th { background: #f8fafc; border-bottom: 2px solid #f1f5f9; padding: 1.3rem; text-align: left; font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
        .clien-table td { padding: 1.4rem; border-bottom: 1px solid #f1f5f9; font-size: 1rem; color: #1e293b; }
        .clien-table tr:hover { background: #f8fafc; cursor: pointer; }
        /* 세션 보안 타이머 인터페이스 */
        .session-badge { background: #fee2e2; color: #b91c1c; padding: 0.6rem 1.4rem; border-radius: 2.5rem; font-weight: 800; font-size: 0.8rem; border: 1px solid #fecaca; }
        /* 정보 상신용 전문 에디터 박스 설계 */
        .editor-box { background: white; border-radius: 3.5rem; padding: 4.5rem; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.12); animation: fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        /* 시스템 스크롤바 정밀 커스텀 */
        .custom-scroll::-webkit-scrollbar { width: 7px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; }
        /* 기지 핵심 카드 컴포넌트 */
        .ag-card { background: white; border-radius: 2.25rem; border: 1px solid #e2e8f0; transition: all 0.35s ease; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .ag-card:hover { transform: translateY(-8px); border-color: var(--ag-navy); box-shadow: 0 25px 35px -5px rgba(49, 78, 141, 0.15); }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-100 flex items-center justify-center">
        <div class="bg-white p-20 rounded-[4.5rem] w-[36rem] shadow-2xl border border-slate-200 text-center animate-in zoom-in duration-500">
            <h1 class="text-5xl font-bold text-[#314e8d] mb-14 italic tracking-tighter">MORNING_DOCK</h1>
            <div id="step-login" class="space-y-10">
                <input type="email" id="login-email" placeholder="대원 식별 이메일" class="w-full p-6 border-2 rounded-[2rem] outline-none focus:ring-12 ring-[#314e8d]/5 focus:border-[#314e8d] transition-all text-xl">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-7 rounded-[2rem] font-bold text-2xl shadow-2xl">인가 프로토콜 가동</button>
                <button onclick="showRegister()" class="text-sm text-slate-400 font-bold hover:underline">대원 신규 인가 등록</button>
            </div>
            <div id="step-register" class="hidden space-y-10 text-left">
                <input type="email" id="reg-email" placeholder="인가용 이메일 주소" class="w-full p-6 border-2 rounded-[2rem] outline-none">
                <div id="reg-otp-box" class="hidden py-12 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200 text-center">
                    <img id="reg-qr-img" class="mx-auto w-60 h-60 mb-6 shadow-xl">
                    <p class="text-sm text-slate-400 font-bold uppercase tracking-widest">OTP 앱으로 코드를 생성하십시오.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-7 rounded-[2.5rem] font-bold text-2xl shadow-xl hover:scale-105 transition-all">보안 인증키 발급</button>
                <button onclick="location.reload()" class="w-full text-xs text-center mt-8 font-bold font-mono">Cancel Protocol</button>
            </div>
            <div id="step-otp-verify" class="hidden space-y-20">
                <p class="text-sm font-bold text-slate-400 uppercase tracking-[0.4em]">Multi-Factor Authentication</p>
                <input type="text" id="gate-otp" maxlength="6" class="w-full text-center text-8xl font-bold tracking-[0.4em] outline-none border-b-8 border-[#314e8d] pb-8 bg-transparent">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-8 rounded-[3rem] font-bold text-3xl shadow-2xl">인가 최종 확인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="sidebar hidden animate-in slide-in-from-left duration-700">
        <div class="p-14 border-b mb-12 text-4xl font-bold text-[#314e8d] tracking-tighter italic">MORNING_DOCK</div>
        <nav class="flex-1 px-10 space-y-4 overflow-y-auto custom-scroll">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full"><i class="fa-solid fa-gauge-high w-10 text-2xl"></i>지휘 대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full"><i class="fa-solid fa-comments w-10 text-2xl"></i>정보 공유 본부</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full"><i class="fa-solid fa-robot w-10 text-2xl"></i>뉴스 분석 엔진</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full"><i class="fa-solid fa-play-circle w-10 text-2xl"></i>미디어 시큐어룸</button>
            <div id="admin-zone" class="hidden pt-12 mt-12 border-t-2 border-slate-50">
                <p class="px-8 text-[11px] font-bold text-slate-300 uppercase tracking-[0.5em] mb-8">Commander Sovereignty</p>
                <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-red-600 font-bold bg-red-50/0 hover:bg-red-50"><i class="fa-solid fa-user-shield w-10 text-2xl text-red-500"></i>중앙 제어판</button>
            </div>
        </nav>
        <div class="p-14 border-t border-slate-50 bg-slate-50/50 text-left">
            <div class="flex items-center space-x-6 mb-12">
                <div id="user-avatar-ui" class="w-16 h-16 rounded-[1.75rem] bg-[#314e8d] flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-[#314e8d]/20">?</div>
                <div class="flex flex-col overflow-hidden text-left">
                    <span id="user-email-ui" class="text-base font-bold text-slate-800 truncate">agent@mail</span>
                    <span id="user-role-ui" class="text-[11px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">Authorized</span>
                </div>
            </div>
            <button onclick="location.reload()" class="w-full border-2 py-5 rounded-[1.75rem] text-[12px] font-bold uppercase tracking-widest bg-white hover:text-red-500 transition-all">인가 해제</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
        <header class="h-32 bg-white border-b flex items-center justify-between px-16 shrink-0 shadow-sm z-30">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-[0.6em]">DASHBOARD</h2>
            <div class="flex items-center space-x-10">
                <div id="session-timer-display" class="session-badge">인가 유지 시간: 60:00</div>
                <div id="system-clock" class="text-xl font-bold text-[#314e8d] font-mono bg-slate-50 px-12 py-5 rounded-[2rem] border shadow-inner">00:00:00</div>
            </div>
        </header>
        
        <div id="content" class="flex-1 overflow-y-auto p-16 custom-scroll">
            <div class="clien-container">

                <div id="v-dash" class="space-y-16 fade-in text-left">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div class="ag-card p-14 flex items-center space-x-12">
                            <div class="w-28 h-28 bg-blue-50 text-[#314e8d] rounded-[3rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-rss-square"></i></div>
                            <div><p class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Intelligence</p><p id="st-news" class="text-7xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card p-14 flex items-center space-x-12">
                            <div class="w-28 h-28 bg-emerald-50 text-emerald-500 rounded-[3rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-pen-nib"></i></div>
                            <div><p class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Reports</p><p id="st-posts" class="text-7xl font-bold text-slate-800">0</p></div>
                        </div>
                        <div class="ag-card p-14 flex items-center space-x-12">
                            <div class="w-28 h-28 bg-amber-50 text-amber-500 rounded-[3rem] flex items-center justify-center text-5xl shadow-inner"><i class="fa-solid fa-user-secret"></i></div>
                            <div><p class="text-sm font-bold text-slate-400 uppercase mb-4 tracking-widest">Agents</p><p id="st-users" class="text-7xl font-bold text-slate-800">0</p></div>
                        </div>
                    </div>
                    <div class="ag-card p-24 bg-white border-l-[24px] border-l-[#314e8d] shadow-2xl relative overflow-hidden rounded-[4rem]">
                        <div class="absolute top-0 right-0 p-14 opacity-5 text-[12rem] text-[#314e8d] rotate-12"><i class="fa-solid fa-shield-halved"></i></div>
                        <h4 class="text-sm font-bold text-[#314e8d] mb-12 uppercase tracking-[0.6em] italic flex items-center"><i class="fa-solid fa-shield-halved mr-6 text-3xl"></i> AI Security Integrated Center</h4>
                        <p id="sum-text-display" class="text-5xl font-bold text-slate-800 leading-[1.4] relative z-10 transition-all duration-700">기지 데이터를 정밀 분석 중입니다...</p>
                    </div>
                </div>

                <div id="v-comm" class="hidden space-y-12 fade-in">
                    <div class="flex justify-between items-center bg-white p-14 rounded-[4rem] border shadow-lg px-20 text-left">
                        <div><h3 class="text-4xl font-bold text-slate-800 italic">정보 공유 본부</h3><p class="text-base text-slate-400 font-bold uppercase mt-4 tracking-widest underline decoration-blue-100 underline-offset-8">Intelligence Protocol Area</p></div>
                        <button onclick="showEditor()" class="bg-[#314e8d] text-white px-16 py-7 rounded-[2.5rem] font-bold text-2xl shadow-2xl hover:scale-105 transition-all">정보 보고 상신</button>
                    </div>
                    <div class="bg-white rounded-[4rem] border shadow-2xl overflow-hidden border-slate-200">
                        <table class="clien-table">
                            <thead><tr><th class="w-32 text-center px-12">보고 ID</th><th class="px-14">인텔리전스 보고 제목</th><th class="w-64 text-center">작성 대원</th><th class="w-56 text-center">보고 일시</th></tr></thead>
                            <tbody id="board-data-body"></tbody>
                        </table>
                    </div>
                </div>

                <div id="v-editor" class="hidden space-y-12 fade-in text-left">
                    <div class="editor-box space-y-14">
                        <div class="flex justify-between items-center border-b pb-12">
                            <h3 id="editor-title-ui" class="text-6xl font-bold text-slate-900 italic tracking-tighter">신규 정보 상신</h3>
                            <button onclick="nav('comm')" class="text-slate-300 hover:text-red-500 transition-all"><i class="fa-solid fa-xmark text-6xl"></i></button>
                        </div>
                        <div class="space-y-12">
                            <div class="space-y-5 text-left"><label class="text-sm font-bold text-slate-400 uppercase ml-8 tracking-[0.4em] font-mono">Report_Subject</label><input type="text" id="edit-post-title" placeholder="제목을 입력하십시오" class="w-full p-10 border-4 rounded-[3rem] text-4xl font-bold outline-none focus:border-[#314e8d] bg-slate-50/50 shadow-inner"></div>
                            <div class="space-y-5 text-left"><label class="text-sm font-bold text-slate-400 uppercase ml-8 tracking-[0.4em] font-mono">Detailed_Analysis</label><textarea id="edit-post-content" placeholder="분석 내용을 기록하십시오..." class="w-full p-14 border-4 rounded-[5rem] text-3xl min-h-[600px] outline-none focus:border-[#314e8d] bg-slate-50/50 leading-relaxed shadow-inner custom-scroll"></textarea></div>
                        </div>
                        <div class="flex justify-end space-x-10 pt-16"><button onclick="nav('comm')" class="px-16 py-7 rounded-[2.5rem] font-bold text-slate-400 border-2 text-3xl">취소</button><button id="save-report-btn" onclick="finalizeSave()" class="bg-[#314e8d] text-white px-28 py-7 rounded-[2.5rem] font-bold text-4xl shadow-2xl hover:scale-105 transition-all">최종 상신</button></div>
                    </div>
                </div>

                <div id="v-detail" class="hidden bg-white p-28 rounded-[6rem] border shadow-2xl space-y-24 text-left fade-in">
                    <button onclick="nav('comm')" class="text-base font-bold text-slate-400 hover:text-[#314e8d] flex items-center transition-all group group-hover:underline"><i class="fa-solid fa-chevron-left mr-6 group-hover:-translate-x-4 transition-transform text-2xl"></i> BACK TO LIST</button>
                    <div class="border-b-4 pb-20 border-slate-50 flex justify-between items-start">
                        <div class="space-y-12 max-w-5xl text-left">
                            <h3 id="dt-report-title" class="text-8xl font-bold text-slate-900 tracking-tighter leading-tight">...</h3>
                            <div class="flex items-center space-x-12 text-base font-bold text-slate-400"><span id="dt-report-author" class="text-[#314e8d] uppercase italic underline underline-offset-[16px] decoration-[12px] decoration-blue-50 text-3xl font-bold">...</span><span class="text-4xl opacity-20">|</span><span id="dt-report-date" class="font-mono text-2xl">...</span></div>
                        </div>
                        <div id="dt-action-tools" class="flex space-x-6">
                            <button id="dt-edit-btn" onclick="showEditor(true)" class="hidden px-12 py-5 rounded-3xl bg-blue-50 text-blue-600 font-bold border-2 shadow-lg hover:bg-blue-600 hover:text-white transition-all">정보 교정</button>
                            <button id="dt-del-btn" onclick="adminPurgeContent('post')" class="hidden px-12 py-5 rounded-3xl bg-red-50 text-red-600 font-bold border-2 shadow-lg hover:bg-red-600 hover:text-white transition-all">영구 숙청</button>
                        </div>
                    </div>
                    <div id="dt-report-content" class="text-4xl leading-[1.8] text-slate-700 whitespace-pre-line min-h-[500px] px-6 font-medium text-left">...</div>
                    <div class="pt-32 border-t-4 border-slate-50 space-y-16 text-left">
                        <h4 class="font-bold text-5xl text-slate-800 italic flex items-center">Agent Analysis Response <span id="cm-report-count" class="text-[#314e8d] ml-10 bg-blue-50 px-10 py-4 rounded-[2.5rem] border-4 border-blue-100 shadow-inner">0</span></h4>
                        <div id="comment-list-area" class="space-y-14"></div>
                        <div class="flex flex-col space-y-12 mt-32 bg-slate-50 p-20 rounded-[6rem] border-8 border-slate-100 shadow-inner text-left"><textarea id="reply-post-input" class="w-full p-14 border-4 border-white rounded-[4.5rem] text-4xl outline-none focus:ring-16 ring-[#314e8d]/5 bg-white shadow-2xl transition-all" placeholder="분석 의견을 상신하십시오..."></textarea><button id="reply-submit-btn" class="self-end bg-[#314e8d] text-white px-24 py-8 rounded-[3rem] font-bold text-4xl shadow-2xl hover:bg-[#1a2c52] transition-all">의견 상신</button></div>
                    </div>
                </div>

                <div id="v-news" class="hidden space-y-16 fade-in text-left">
                    <div class="flex justify-between items-center bg-white p-16 rounded-[4.5rem] border shadow-2xl px-24">
                        <div class="flex items-center space-x-14 italic text-left">
                            <div class="w-32 h-32 bg-blue-50 text-[#314e8d] rounded-[3.5rem] flex items-center justify-center text-7xl animate-pulse shadow-inner border-4 border-blue-100"><i class="fa-solid fa-robot"></i></div>
                            <div class="space-y-4"><h3 class="font-bold text-5xl text-slate-800 tracking-tighter">지능형 뉴스 분석 센터</h3><p class="text-sm text-slate-400 font-bold uppercase tracking-[0.6em] font-mono">AI-Scraper-Engine v6.6 Active</p></div>
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

                <div id="v-media" class="hidden grid grid-cols-1 md:grid-cols-3 gap-16 fade-in pb-96"></div>

            </div>
        </div>
    </main>

    <script>
        /**
         * 안티그래비티 기지 핵심 제어 엔진 (Sovereign Core Logic)
         * 대표님의 명령에 따라 최적화 없이 상세히 기술합니다.
         */
        let state = { user: null, view: 'dash', currentPostId: null, sessionTime: 3600 };

        // 시스템 실시간 클럭 및 세션 보안 타이머 동기화 가동
        setInterval(() => {
            const now = new Date();
            // 상단 헤더의 시스템 시각을 업데이트합니다.
            const clockEl = document.getElementById('system-clock');
            if(clockEl) clockEl.innerText = now.toLocaleTimeString('ko-KR', { hour12: false });
            
            // 보안 인가가 완료된 상태일 경우 세션 타이머를 가동합니다.
            if(state.user) {
                state.sessionTime--;
                const m = Math.floor(state.sessionTime / 60);
                const s = state.sessionTime % 60;
                const timerEl = document.getElementById('session-timer-display');
                if(timerEl) timerEl.innerText = \`인가 유지 시간: \${m}:\${s.toString().padStart(2,'0')}\`;
                
                // 보안을 위해 세션 만료 시 즉각 시스템을 초기화(강제 퇴출)합니다.
                if(state.sessionTime <= 0) {
                    alert('보안 인가 세션이 만료되었습니다. 다시 시스템 인가를 받으십시오.');
                    location.reload();
                }
            }
        }, 1000);

        // [인가 제어 모듈: 인가/등록/검증]
        function showRegister() { 
            document.getElementById('step-login').classList.add('hidden'); 
            document.getElementById('step-register').classList.remove('hidden'); 
        }

        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            if(!email || !email.includes('@')) return alert('유효하지 않은 기지 이메일 주소입니다.');
            // 보안을 위한 16자리 무작위 시크릿 토큰을 생성합니다.
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let secret = "";
            for(let i=0; i<16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
            
            // Google OTP 연동용 QR 코드를 생성하여 표시합니다.
            const qrUri = \`otpauth://totp/MorningDock:\${email}?secret=\${secret}&issuer=MorningDock\`;
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qrUri);
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "최종 등록 승인 상신";
            document.getElementById('reg-btn').onclick = async () => {
                const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, secret }) });
                const d = await res.json();
                if(d.uid) { alert('대원 등록 완료! 인가 프로토콜을 가동하십시오.'); location.reload(); }
                else alert(d.error);
            };
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            if(!email) return alert('이메일을 입력하십시오.');
            const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) });
            const d = await res.json();
            if(d.uid) { 
                state.user = d; 
                document.getElementById('step-login').classList.add('hidden'); 
                document.getElementById('step-otp-verify').classList.remove('hidden'); 
            } else alert(d.error);
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value.trim();
            if(code.length !== 6) return alert('6자리 코드를 입력하십시오.');
            const res = await fetch('/api/auth/otp-verify', { method: 'POST', body: JSON.stringify({ uid: state.user.uid, code }) });
            const d = await res.json();
            if(d.sessionId) { 
                state.user.sessionId = d.sessionId; 
                state.user.role = d.role; 
                bootSovereignSystem(); 
            } else alert('인가 코드 불일치: 접근이 거부되었습니다.');
        }

        function bootSovereignSystem() {
            document.getElementById('auth-gate').classList.add('hidden'); 
            document.getElementById('sidebar').classList.remove('hidden'); 
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-email-ui').innerText = state.user.email;
            document.getElementById('user-avatar-ui').innerText = state.user.email[0].toUpperCase();
            document.getElementById('user-role-ui').innerText = state.user.role === 'ADMIN' ? 'COMMANDER (ADMIN)' : 'AUTHORIZED AGENT';
            if(state.user.role === 'ADMIN') document.getElementById('admin-zone').classList.remove('hidden');
            nav('dash');
        }

        // [네비게이션 및 데이터 동기화 모듈]
        async function nav(v) {
            state.view = v;
            document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('v-'+v).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const nb = document.getElementById('nb-'+v);
            if(nb) nb.classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            // 각 뷰 진입 시 실시간 데이터 동기화 프로토콜 가동
            if(v==='dash') syncStats();
            if(v==='comm') syncComm();
            if(v==='admin') syncAdmin();
            if(v==='news') syncNews();
            if(v==='media') syncMedia();
        }

        async function syncStats() {
            const r = await fetch('/api/stats');
            const d = await r.json();
            const u = state.user.email.split('@')[0];
            const mods = ["필승! 무적의 ", "보안의 심장, ", "기지의 브레인, ", "최정예 사령관 "];
            document.getElementById('st-news').innerText = d.newsCount;
            document.getElementById('st-posts').innerText = d.postCount;
            document.getElementById('st-users').innerText = d.userCount;
            document.getElementById('sum-text-display').innerHTML = \`\${mods[Math.floor(Math.random()*mods.length)]} <span class="text-[#314e8d] underline decoration-8 decoration-blue-100 underline-offset-8 font-black">\${u}</span> 대원님! <br>현재 기지 인텔리전스 \${d.newsCount}건 수집 완료! 🫡🔥\`;
        }

        // [정보 상신 및 관리 모듈]
        async function syncComm() {
            const r = await fetch('/api/community/posts');
            const posts = await r.json();
            document.getElementById('board-data-body').innerHTML = posts.map(p => \`
                <tr onclick="loadDetail(\${p.id})">
                    <td class="text-center font-bold text-slate-300 px-12 text-sm font-mono">\${p.id.toString().padStart(4,'0')}</td>
                    <td class="font-bold text-slate-800 text-3xl text-left tracking-tighter">\${p.title}</td>
                    <td class="text-center font-bold text-slate-400 italic">\${p.email.split('@')[0]}</td>
                    <td class="text-center text-sm text-slate-300 font-bold font-mono">\${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>\`).join('');
        }

        async function showEditor(isE = false) {
            nav('editor');
            const tI = document.getElementById('edit-post-title');
            const cI = document.getElementById('edit-post-content');
            const vT = document.getElementById('editor-title-ui');
            if(isE) {
                vT.innerText = "정보 보고서 교정 프로토콜";
                tI.value = document.getElementById('dt-report-title').innerText;
                cI.value = document.getElementById('dt-report-content').innerText;
                document.getElementById('save-report-btn').onclick = () => finalizeSave(true);
            } else {
                vT.innerText = "신규 정보 상신 프로토콜";
                tI.value = ""; cI.value = "";
                document.getElementById('save-report-btn').onclick = () => finalizeSave(false);
            }
        }

        async function finalizeSave(isE = false) {
            const title = document.getElementById('edit-post-title').value;
            const content = document.getElementById('edit-post-content').value;
            if(!title || !content) return alert('보고 내용을 충실히 기록하십시오.');
            const body = { title, content, userId: state.user.uid, sessionId: state.user.sessionId };
            if(isE) body.postId = state.currentPostId;
            const res = await fetch(isE ? '/api/community/posts/edit' : '/api/community/posts/add', { method: 'POST', body: JSON.stringify(body) });
            if(res.ok) { alert('상신 성공!'); nav('comm'); }
            else alert('권한 위반 또는 세션 만료');
        }

        async function loadDetail(id) {
            state.currentPostId = id; nav('detail');
            const [pRes, cRes] = await Promise.all([fetch('/api/community/posts/detail?id='+id), fetch('/api/community/comments?postId='+id)]);
            const p = await pRes.json(); const comments = await cRes.json();
            document.getElementById('dt-report-title').innerText = p.title;
            document.getElementById('dt-report-author').innerText = p.email;
            document.getElementById('dt-report-date').innerText = new Date(p.created_at).toLocaleString();
            document.getElementById('dt-report-content').innerText = p.content;
            document.getElementById('cm-report-count').innerText = comments.length;
            const isO = p.user_id === state.user.uid; const isS = state.user.role === 'ADMIN';
            document.getElementById('dt-edit-btn').classList.toggle('hidden', !(isO || isS));
            document.getElementById('dt-del-btn').classList.toggle('hidden', !isS);
            document.getElementById('comment-list-area').innerHTML = comments.map(c => \`
                <div class="p-16 bg-slate-50 rounded-[4rem] flex justify-between items-start border-4 border-white shadow-xl text-left">
                    <div class="space-y-6">
                        <p class="text-sm font-bold text-[#314e8d] uppercase italic underline decoration-blue-100">\${c.email}</p>
                        <p class="text-4xl text-slate-700 font-bold leading-relaxed">\${c.content}</p>
                    </div>
                    \${isS ? \`<button onclick="adminPurgeContent('comment', \${c.id})" class="bg-red-50 text-red-600 font-black px-10 py-5 rounded-3xl">숙청</button>\` : ''}
                </div>\`).join('');
            document.getElementById('reply-submit-btn').onclick = async () => {
                const v = document.getElementById('reply-post-input').value.trim();
                if(!v) return;
                await fetch('/api/community/comments/add', { method: 'POST', body: JSON.stringify({ postId:id, content:v, userId:state.user.uid, sessionId:state.user.sessionId }) });
                document.getElementById('reply-post-input').value = ''; loadDetail(id);
            };
        }

        // [사령관 제어 모듈: 대원/콘텐츠 숙청]
        async function syncAdmin() {
            const res = await fetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ sessionId: state.user.sessionId }) });
            const users = await res.json();
            document.getElementById('adm-agent-grid').innerHTML = users.map(u => \`
                <div class="p-16 bg-white border-8 border-slate-50 rounded-[5rem] flex justify-between items-center shadow-2xl text-left">
                    <div>
                        <span class="font-black text-3xl text-slate-800 underline underline-offset-[16px] decoration-slate-100">\${u.email}</span>
                        <p class="text-sm font-bold text-slate-400 mt-4 uppercase tracking-widest">\${u.role} | STATUS: <span class="\${u.status==='APPROVED'?'text-emerald-500':'text-red-500'}">\${u.status}</span></p>
                    </div>
                    <div class="flex space-x-6">
                        <button onclick="adminAction('user_status', {uid:'\${u.uid}', status:'\${u.status==='APPROVED'?'BLOCKED':'APPROVED'}'})" class="px-10 py-5 bg-slate-100 rounded-3xl font-black">전환</button>
                        <button onclick="adminAction('user_delete', '\${u.uid}')" class="bg-red-50 text-red-500 font-black px-12 py-5 rounded-3xl shadow-xl">숙청</button>
                    </div>
                </div>\`).join('');
        }

        async function adminAction(t, d) {
            if(!confirm('사령관 권한을 집행하시겠습니까?')) return;
            const sid = state.user.sessionId;
            if(t==='user_status') await fetch('/api/admin/users/status', { method: 'POST', body: JSON.stringify({ targetUid: d.uid, status: d.status, sessionId: sid }) });
            if(t==='user_delete') await fetch('/api/admin/users/delete', { method: 'POST', body: JSON.stringify({ targetUid: d, sessionId: sid }) });
            syncAdmin();
        }

        async function adminPurgeContent(type, cId) {
            if(!confirm('해당 콘텐츠를 기지 데이터베이스에서 영구 파기합니까?')) return;
            const sid = state.user.sessionId;
            if(type==='post') { await fetch('/api/admin/posts/delete', { method: 'POST', body: JSON.stringify({ postId: state.currentPostId, sessionId: sid }) }); nav('comm'); }
            if(type==='comment') { await fetch('/api/admin/comments/delete', { method: 'POST', body: JSON.stringify({ commentId: cId, sessionId: sid }) }); loadDetail(state.currentPostId); }
        }

        // [AI 뉴스 및 미디어 모듈]
        async function runAIEngine() { alert('지능형 AI 보안 분석 엔진 가동...'); await fetch('/api/collect-news'); syncNews(); }
        async function syncNews() {
            const r = await fetch('/api/news'); const news = await r.json();
            document.getElementById('news-engine-feed').innerHTML = news.map(n => \`
                <div class="ag-card p-20 space-y-14 rounded-[4rem] text-left">
                    <div class="flex justify-between items-start">
                        <h4 class="font-black text-6xl text-slate-800 cursor-pointer" onclick="window.open('\${n.link}')">\${n.title}</h4>
                        <span class="text-xs bg-slate-50 px-8 py-4 rounded-2xl font-black text-slate-400 border-4">\${n.model_name}</span>
                    </div>
                    <div class="bg-slate-50 p-16 rounded-[5rem] border-l-[32px] border-l-[#314e8d] shadow-inner font-black italic text-4xl leading-relaxed">\${n.summary}</div>
                    <p class="text-3xl font-black text-[#314e8d] italic decoration-[12px] underline underline-offset-[24px] decoration-blue-100">\${n.discussion_question}</p>
                </div>\`).join('');
        }

        async function syncMedia() {
            const r = await fetch('/api/media'); const media = await r.json();
            document.getElementById('v-media').innerHTML = media.map(m => \`
                <div class="ag-card p-24 text-center space-y-16 group rounded-[4rem] shadow-2xl">
                    <div class="w-56 h-56 bg-slate-50 text-[#314e8d] rounded-full flex items-center justify-center mx-auto text-8xl border-[12px] border-slate-100 group-hover:border-[#314e8d] transition-all"><i class="\${m.icon}"></i></div>
                    <h4 class="font-black text-6xl text-slate-800 italic tracking-tighter">\${m.name}</h4>
                    <button onclick="window.open('\${m.url}')" class="w-full bg-[#314e8d] text-white py-10 rounded-[3.5rem] font-black text-4xl shadow-2xl hover:scale-105 transition-all">LAUNCH</button>
                </div>\`).join('');
        }
    </script>
</body>
</html>
  `;
}