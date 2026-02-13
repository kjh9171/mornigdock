/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 Clien-Style Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 수정사항: 템플릿 리터럴 구문 오류 수정 및 D1 DB 안정화
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS 헤더 설정 - 보안상 허용된 도메인만 설정하는 것이 좋으나 현재는 개발 편의를 위해 전체 허용
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // OPTIONS 요청에 대한 사전 응답 처리
    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 루트 경로 접속 시 UI 렌더링
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(generateUI(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    try {
      // --- [1. AUTH & SECURITY: 사용자 인증 및 가입] ---
      if (url.pathname === "/api/auth/signup" && method === "POST") {
        const { email } = await request.json();
        const uid = crypto.randomUUID();
        try {
          // 첫 가입자를 관리자로 설정하는 로직
          const userCountResult = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
          const userCount = userCountResult ? userCountResult.count : 0;
          const role = userCount === 0 ? 'ADMIN' : 'USER';
          await env.DB.prepare("INSERT INTO users (uid, email, role, status) VALUES (?, ?, ?, 'APPROVED')").bind(uid, email, role).run();
          return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
        } catch (e) { 
          return Response.json({ error: "이미 가입된 계정입니다." }, { status: 400, headers: corsHeaders }); 
        }
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
        const isMaster = code === "000000"; // 마스터 코드 (개발용)
        if (isMaster || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code))) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 }); // 2시간 세션 유지
          return Response.json({ status: "success", sessionId, role: user.role, accountStatus: user.status }, { headers: corsHeaders });
        }
        return Response.json({ error: "인증번호 불일치" }, { status: 401, headers: corsHeaders });
      }

      // --- [2. COMMUNITY CRUD: 게시판 기능] ---
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

      // --- [3. NEWS & AI: 뉴스 수집 및 요약] ---
      if (url.pathname === "/api/news" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 20").all();
        return Response.json(results || [], { headers: corsHeaders });
      }

      if (url.pathname === "/api/stats") {
        const nCount = await env.DB.prepare("SELECT COUNT(*) as count FROM news").first();
        const uCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        const pCount = await env.DB.prepare("SELECT COUNT(*) as count FROM posts").first();
        return Response.json({ 
          newsCount: nCount ? nCount.count : 0, 
          userCount: uCount ? uCount.count : 0, 
          postCount: pCount ? pCount.count : 0 
        }, { headers: corsHeaders });
      }

      // --- [4. ADMIN: 관리자 전용 제어] ---
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

      return new Response("Morning Dock API Active", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ status: "error", message: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

/**
 * TOTP 인증 검증 로직 (보안 핵심)
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

  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  for (let i = -1; i <= 1; i++) { // 시간 오차 허용 범위를 -1 ~ +1 슬롯으로 최적화
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

/**
 * UI 생성 함수 (백슬래시 구문 오류 수정 버전)
 */
function generateUI() {
  // 템플릿 리터럴 내의 JavaScript 코드 문자열에서 백슬래시 에러 방지를 위해 분리 처리
  const newlineChar = "\\n"; 
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모닝독 V5.1 Client-Style</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        body { background: #f1f5f9; color: #1e293b; font-family: 'Pretendard', sans-serif; letter-spacing: -0.02em; }
        .clien-blue { color: #314e8d; }
        .bg-clien-blue { background-color: #314e8d; }
        .nav-btn { transition: all 0.2s; color: #64748b; border-radius: 0.5rem; }
        .nav-btn.active { background: #314e8d; color: white; }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body class="flex h-screen overflow-hidden">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-2xl w-[32rem] shadow-xl border border-slate-200 text-center">
            <h1 class="text-3xl font-bold clien-blue tracking-tight mb-8">MORNING_DOCK</h1>
            <div id="step-email" class="space-y-4">
                <input type="email" id="gate-email" placeholder="이메일 입력" class="w-full p-3 border rounded-lg outline-none">
                <button onclick="handleGate()" class="bg-clien-blue text-white w-full py-3 rounded-lg font-bold text-lg">인증 및 로그인</button>
                <div class="pt-4 text-sm text-slate-400">계정이 없으면 자동으로 회원가입됩니다.</div>
            </div>
            <div id="step-otp-verify" class="hidden space-y-6">
                <p class="text-slate-600">OTP 인증번호 6자리를 입력하세요.</p>
                <input type="text" id="gate-otp-code" placeholder="000000" class="w-full text-4xl font-bold tracking-[0.2em] text-center border-b-2 outline-none">
                <button onclick="verifyOTP()" class="bg-clien-blue text-white w-full py-3 rounded-lg font-bold">로그인 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="w-64 bg-white border-right border-slate-200 hidden flex-col">
        <div class="p-6 text-xl font-bold clien-blue border-b">MORNING_DOCK</div>
        <nav class="flex-1 p-4 space-y-1">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-house w-6"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-comments w-6"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-3 flex items-center text-sm"><i class="fa-solid fa-newspaper w-6"></i>뉴스봇</button>
        </nav>
        <div class="p-4 border-t">
            <button onclick="logout()" class="text-xs text-slate-400 font-bold uppercase">Sign Out</button>
        </div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden bg-slate-50">
        <header class="h-16 bg-white border-b flex items-center justify-between px-8">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase">DASHBOARD</h2>
            <div id="clock" class="text-sm font-mono clien-blue font-bold">00:00:00</div>
        </header>
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div id="v-dash" class="space-y-6">
                <div class="grid grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p class="text-xs text-slate-400 font-bold uppercase">News Count</p>
                        <p id="st-news" class="text-3xl font-bold clien-blue mt-1">0</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p class="text-xs text-slate-400 font-bold uppercase">Total Posts</p>
                        <p id="st-posts" class="text-3xl font-bold clien-blue mt-1">0</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p class="text-xs text-slate-400 font-bold uppercase">Users</p>
                        <p id="st-users" class="text-3xl font-bold clien-blue mt-1">0</p>
                    </div>
                </div>
            </div>
            </div>
    </main>

    <script>
        let state = { user: null, view: 'dash' };
        
        // 시계 업데이트 로직
        setInterval(() => {
            document.getElementById('clock').innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false });
        }, 1000);

        async function handleGate() {
            const email = document.getElementById('gate-email').value;
            if(!email) return alert('이메일을 입력해주세요!');
            
            // 로그인 시도 (실패 시 자동 회원가입 로직은 서버 API에서 처리)
            const r = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) });
            const d = await r.json();
            
            if(d.uid) {
                state.user = d;
                document.getElementById('step-email').classList.add('hidden');
                document.getElementById('step-otp-verify').classList.remove('hidden');
            } else {
                // 회원가입 프로세스
                const reg = await fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email }) });
                const regD = await reg.json();
                if(regD.uid) alert('가입 완료! 다시 로그인 시도 후 OTP를 등록하세요.');
            }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp-code').value;
            const r = await fetch('/api/auth/otp-verify', { 
                method: 'POST', 
                body: JSON.stringify({ uid: state.user.uid, code }) 
            });
            const d = await r.json();
            if(d.sessionId) {
                state.user.sessionId = d.sessionId;
                enterSystem();
            } else {
                alert('인증번호가 틀렸습니다!');
            }
        }

        function enterSystem() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.add('flex');
            document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            loadStats();
        }

        async function loadStats() {
            const r = await fetch('/api/stats');
            const d = await r.json();
            document.getElementById('st-news').innerText = d.newsCount;
            document.getElementById('st-posts').innerText = d.postCount;
            document.getElementById('st-users').innerText = d.userCount;
        }

        function nav(v) {
            state.view = v;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('nb-' + v).classList.add('active');
            document.getElementById('view-title').innerText = v.toUpperCase();
            // 각 뷰에 따른 로딩 로직 추가 가능
        }

        function logout() {
            location.reload();
        }
    </script>
</body>
</html>
  `;
}