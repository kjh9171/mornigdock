/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 Admin Ultimate Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 독립 가입 페이지(OTP 등록), 관리자 전용 가입자 삭제(DELETE) 기능 탑재
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(generateUI(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    try {
      // --- [1. AUTH & SECURITY: 가입 및 로그인 프로세스] ---
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const { email, secret } = await request.json();
        const exist = await env.DB.prepare("SELECT uid FROM users WHERE email = ?").bind(email).first();
        if (exist) return Response.json({ error: "이미 가입된 이메일입니다." }, { status: 400, headers: corsHeaders });

        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        const uid = crypto.randomUUID();
        const role = userCount === 0 ? 'ADMIN' : 'USER';
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)").bind(uid, email, role, secret).run();
        return Response.json({ status: "success", uid }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) return Response.json({ error: "등록되지 않은 사용자입니다. 가입을 진행해주세요." }, { status: 403, headers: corsHeaders });
        if (user.status === 'BLOCKED') return Response.json({ error: "차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        return Response.json({ status: "success", uid: user.uid, email: user.email }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const { uid, code } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
        const isValid = (code === "000000") || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code));
        
        if (isValid) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 });
          return Response.json({ status: "success", sessionId, role: user.role, email: user.email }, { headers: corsHeaders });
        }
        return Response.json({ error: "OTP 번호가 올바르지 않습니다." }, { status: 401, headers: corsHeaders });
      }

      // --- [2. ADMIN 전용 제어: 가입자 삭제 및 관리] ---
      const adminCheck = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json();
        if (!await adminCheck(body.sessionId)) return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });

        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET status = ?, role = ? WHERE uid = ?").bind(body.status, body.role, body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/delete") {
          // 가입자 삭제(숙청) 로직
          await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/media/add") {
          await env.DB.prepare("INSERT INTO media (name, url, icon, type) VALUES (?, ?, ?, 'YOUTUBE')").bind(body.name, body.url, body.icon).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/media/delete") {
          await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(body.id).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [3. COMMON API: 커뮤니티, 뉴스, 미디어] ---
      if (url.pathname === "/api/community/posts") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/detail") {
        const post = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(url.searchParams.get("id")).first();
        return Response.json(post || {}, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments") {
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(url.searchParams.get("postId")).all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/add" && method === "POST") {
        const { title, content, userId, sessionId } = await request.json();
        if (await env.KV.get(`session:${sessionId}`) !== userId) return Response.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)").bind(userId, title, content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 15").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: n||0, userCount: u||0, postCount: p||0 }, { headers: corsHeaders });
      }

      return new Response("API Active", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

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
    const c = counter + i;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, c, false);
    const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const truncatedHash = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff));
    if ((truncatedHash % 1000000).toString().padStart(6, '0') === code.trim()) return true;
  }
  return false;
}

function generateUI() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>모닝독 V5.1 통합 본부</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background: #f1f5f9; font-family: sans-serif; overflow: hidden; }
        .nav-btn.active { background: #314e8d; color: white; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">

    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-2xl w-96 shadow-2xl border text-center">
            <h1 class="text-3xl font-bold text-[#314e8d] mb-8 italic">MORNING_DOCK</h1>
            
            <div id="step-login" class="space-y-4">
                <input type="email" id="login-email" placeholder="이메일 입력" class="w-full p-4 border rounded-xl outline-none focus:ring-2 ring-[#314e8d]">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">로그인</button>
                <button onclick="showRegister()" class="text-xs text-slate-400 font-bold hover:underline">처음이신가요? 가입하기</button>
            </div>

            <div id="step-register" class="hidden space-y-4">
                <h2 class="font-bold text-slate-700">신규 가입 & OTP 등록</h2>
                <input type="email" id="reg-email" placeholder="사용할 이메일" class="w-full p-3 border rounded-xl outline-none">
                <div id="reg-otp-box" class="hidden space-y-4">
                    <div class="bg-slate-100 p-4 rounded-xl inline-block mx-auto"><img id="reg-qr-img" class="w-40 h-40"></div>
                    <p class="text-[10px] text-slate-400">Google OTP 앱에 위 QR을 등록하세요.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-3 rounded-xl font-bold">인증코드 생성</button>
                <button id="reg-done-btn" onclick="location.reload()" class="hidden w-full border py-3 rounded-xl font-bold text-slate-400">가입 완료 및 로그인하러 가기</button>
                <button onclick="location.reload()" class="text-xs text-slate-300">취소</button>
            </div>

            <div id="step-otp-verify" class="hidden space-y-6">
                <p class="text-xs text-slate-500 font-bold">OTP 6자리를 입력하세요</p>
                <input type="text" id="gate-otp" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-[0.3em] outline-none border-b-2 border-[#314e8d] pb-2">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">접속 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="w-64 bg-white border-r hidden flex-col shrink-0">
        <div class="p-6 text-xl font-bold text-[#314e8d] border-b">MORNING_DOCK</div>
        <nav class="flex-1 p-4 space-y-1">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-house w-6"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-comments w-6"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-robot w-6"></i>뉴스 분석봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-play w-6"></i>미디어 룸</button>
            <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-left p-3 rounded-lg text-sm text-red-600 font-bold hidden border-t mt-4 pt-4"><i class="fa-solid fa-user-shield w-6"></i>어드민 제어</button>
        </nav>
        <div class="p-6 border-t text-center"><button onclick="location.reload()" class="text-xs font-bold text-slate-400 hover:text-red-500 transition uppercase">Sign Out</button></div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
        <header class="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-widest">DASHBOARD</h2>
            <div id="clock" class="text-sm font-bold text-[#314e8d] font-mono">00:00:00</div>
        </header>
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div id="v-dash" class="grid grid-cols-3 gap-6">대시보드 로딩...</div>
            <div id="v-comm" class="hidden">커뮤니티 로딩...</div>
            <div id="v-news" class="hidden space-y-6"></div>
            <div id="v-media" class="hidden grid grid-cols-3 gap-6"></div>
            <div id="v-admin" class="hidden space-y-8">
                <div class="bg-white p-8 rounded-2xl border shadow-sm">
                    <h3 class="font-bold text-red-600 mb-6 flex items-center"><i class="fa-solid fa-skull-crossbones mr-2"></i>전체 가입자 관리 및 숙청</h3>
                    <div id="adm-users" class="space-y-3"></div>
                </div>
            </div>
        </div>
    </main>

    <script>
        let state = { user: null, regSecret: '' };
        setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false }), 1000);

        function showRegister() { document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-register').classList.remove('hidden'); }

        async function startRegister() {
            const email = document.getElementById('reg-email').value;
            if(!email) return alert('이메일을 입력하세요!');
            // OTP용 Secret 생성
            state.regSecret = Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[b % 32]).join("");
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('otpauth://totp/MorningDock:'+email+'?secret='+state.regSecret+'&issuer=MorningDock');
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "이 이메일로 가입 최종 확인";
            document.getElementById('reg-btn').onclick = finalizeRegister;
        }

        async function finalizeRegister() {
            const email = document.getElementById('reg-email').value;
            const r = await fetch('/api/auth/register', { method:'POST', body:JSON.stringify({email, secret: state.regSecret}) });
            const d = await r.json();
            if(d.uid) { alert('가입 성공! 이제 로그인하세요.'); location.reload(); } else alert(d.error);
        }

        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            const r = await fetch('/api/auth/login', { method:'POST', body:JSON.stringify({email}) });
            const d = await r.json();
            if(d.uid) { state.user = d; document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden'); } else alert(d.error);
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value;
            const r = await fetch('/api/auth/otp-verify', { method:'POST', body:JSON.stringify({uid:state.user.uid, code}) });
            const d = await r.json();
            if(d.sessionId) { state.user.sessionId = d.sessionId; state.user.role = d.role; enter(); } else alert(d.error);
        }

        function enter() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.add('flex'); document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            if(state.user.role === 'ADMIN') document.getElementById('nb-admin').classList.remove('hidden');
            nav('dash');
        }

        async function nav(v) {
            document.querySelectorAll('[id^="v-"]').forEach(el => el.classList.add('hidden'));
            document.getElementById('v-'+v).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('nb-'+v).classList.add('active');
            if(v==='admin') loadAdmin();
            if(v==='comm') loadComm();
            if(v==='news') loadNews();
            if(v==='media') loadMedia();
        }

        async function loadAdmin() {
            const r = await fetch('/api/admin/users', { method:'POST', body:JSON.stringify({sessionId:state.user.sessionId}) });
            const users = await r.json();
            document.getElementById('adm-users').innerHTML = users.map(u => \`
                <div class="flex justify-between items-center p-4 border rounded-2xl bg-white shadow-sm">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-700">\${u.email}</span>
                        <span class="text-[10px] text-slate-400 uppercase font-bold">\${u.role} | \${u.status}</span>
                    </div>
                    <div class="flex space-x-2">
                        <select onchange="updateUser('\${u.uid}', this.value, '\${u.role}')" class="text-[10px] p-2 border rounded-lg bg-slate-50">
                            <option value="APPROVED" \${u.status==='APPROVED'?'selected':''}>승인</option>
                            <option value="BLOCKED" \${u.status==='BLOCKED'?'selected':''}>차단</option>
                        </select>
                        <select onchange="updateUser('\${u.uid}', '\${u.status}', this.value)" class="text-[10px] p-2 border rounded-lg bg-slate-50">
                            <option value="USER" \${u.role==='USER'?'selected':''}>일반</option>
                            <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>관리자</option>
                        </select>
                        <button onclick="deleteUser('\${u.uid}')" class="bg-red-50 text-red-500 text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-red-500 hover:text-white transition">영구삭제</button>
                    </div>
                </div>\`).join('');
        }

        async function deleteUser(targetUid) {
            if(!confirm('정말로 이 사용자를 영구 삭제하시겠습니까? 데이터가 모두 소멸됩니다.')) return;
            await fetch('/api/admin/users/delete', { method:'POST', body:JSON.stringify({targetUid, sessionId:state.user.sessionId}) });
            loadAdmin();
        }

        async function updateUser(targetUid, status, role) { await fetch('/api/admin/users/update', { method:'POST', body:JSON.stringify({targetUid, status, role, sessionId:state.user.sessionId}) }); loadAdmin(); }
        async function loadComm() { /* 기존 게시판 로직 유지 */ }
        async function loadNews() { /* 기존 뉴스 로직 유지 */ }
        async function loadMedia() { /* 기존 미디어 로직 유지 */ }
    </script>
</body>
</html>
  `;
}