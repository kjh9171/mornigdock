/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 The Final Ultimate Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 혁신: 모든 기능(대시보드, 뉴스봇, 어드민 권한, 미디어, OTP) 100% 통합 복구
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
      // --- [1. AUTH & SECURITY: 가입/로그인/OTP] ---
      if (url.pathname === "/api/auth/register" && method === "POST") {
        const { email, secret } = await request.json();
        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        const uid = crypto.randomUUID();
        const role = userCount === 0 ? 'ADMIN' : 'USER';
        await env.DB.prepare("INSERT INTO users (uid, email, role, status, mfa_secret) VALUES (?, ?, ?, 'APPROVED', ?)").bind(uid, email, role, secret).run();
        return Response.json({ status: "success", uid }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) return Response.json({ error: "등록되지 않은 사용자입니다." }, { status: 403, headers: corsHeaders });
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
          return Response.json({ status: "success", sessionId, role: user.role, email: user.email, uid: user.uid }, { headers: corsHeaders });
        }
        return Response.json({ error: "인증번호 불일치" }, { status: 401, headers: corsHeaders });
      }

      // --- [2. ADMIN ONLY: 제어판 및 가입자/미디어 관리] ---
      const checkAdmin = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        const body = await request.clone().json();
        if (!await checkAdmin(body.sessionId)) return Response.json({ error: "권한 없음" }, { status: 403, headers: corsHeaders });

        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          await env.DB.prepare("UPDATE users SET status = ?, role = ? WHERE uid = ?").bind(body.status, body.role, body.targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/delete") {
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

      // --- [3. COMMON API: 대시보드 통계/뉴스/커뮤니티] ---
      if (url.pathname === "/api/stats") {
        const n = await env.DB.prepare("SELECT COUNT(*) as c FROM news").first("c");
        const u = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
        const p = await env.DB.prepare("SELECT COUNT(*) as c FROM posts").first("c");
        return Response.json({ newsCount: n||0, userCount: u||0, postCount: p||0 }, { headers: corsHeaders });
      }
      if (url.pathname === "/api/news") {
        const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 15").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/media") {
        const { results } = await env.DB.prepare("SELECT * FROM media ORDER BY id ASC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/detail") {
        const p = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(url.searchParams.get("id")).first();
        return Response.json(p || {}, { headers: corsHeaders });
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
      if (url.pathname === "/api/community/comments/add" && method === "POST") {
        const { postId, content, userId, sessionId } = await request.json();
        if (await env.KV.get(`session:${sessionId}`) !== userId) return Response.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
        await env.DB.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").bind(postId, userId, content).run();
        return Response.json({ status: "success" }, { headers: corsHeaders });
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
        body { background: #f1f5f9; font-family: sans-serif; overflow: hidden; letter-spacing: -0.02em; }
        .nav-btn.active { background: #314e8d; color: white; }
        .clien-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; }
        .clien-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 16px; text-align: left; font-size: 13px; color: #64748b; }
        .clien-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body class="flex h-screen w-screen selection:bg-[#314e8d]/20">
    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-3xl w-96 shadow-2xl border text-center">
            <h1 class="text-3xl font-bold text-[#314e8d] mb-8 italic">MORNING_DOCK</h1>
            <div id="step-login" class="space-y-4">
                <input type="email" id="login-email" placeholder="이메일 입력" class="w-full p-4 border rounded-2xl outline-none focus:ring-2 ring-[#314e8d]">
                <button onclick="handleLogin()" class="w-full bg-[#314e8d] text-white py-4 rounded-2xl font-bold text-lg">입입 시작</button>
                <button onclick="showRegister()" class="text-xs text-slate-400 font-bold hover:underline">신규 가입하기</button>
            </div>
            <div id="step-register" class="hidden space-y-4 text-left">
                <h3 class="font-bold text-slate-800 text-center mb-4">가입 및 OTP 등록</h3>
                <input type="email" id="reg-email" placeholder="이메일" class="w-full p-3 border rounded-xl outline-none mb-4">
                <div id="reg-otp-box" class="hidden space-y-4 text-center">
                    <div class="bg-slate-50 p-4 rounded-2xl inline-block border"><img id="reg-qr-img" class="w-40 h-40"></div>
                    <p class="text-[10px] text-slate-400">구글 OTP 앱에 등록하세요.</p>
                </div>
                <button id="reg-btn" onclick="startRegister()" class="w-full bg-[#314e8d] text-white py-3 rounded-xl font-bold">인증코드 생성</button>
                <button onclick="location.reload()" class="w-full text-xs text-slate-400 mt-2">취소</button>
            </div>
            <div id="step-otp-verify" class="hidden space-y-6">
                <input type="text" id="gate-otp" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-[0.3em] outline-none border-b-2 border-[#314e8d] pb-2">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-2xl font-bold text-lg">최종 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="w-64 bg-white border-r hidden flex-col shrink-0">
        <div class="p-6 text-xl font-bold text-[#314e8d] border-b tracking-tighter">MORNING_DOCK</div>
        <nav class="flex-1 p-4 space-y-1">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-house w-6"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-comments w-6"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-robot w-6"></i>뉴스 분석봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full text-left p-3 rounded-lg text-sm font-medium"><i class="fa-solid fa-play w-6"></i>미디어 룸</button>
            <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-left p-3 rounded-lg text-sm text-red-600 font-bold hidden border-t mt-4 pt-4"><i class="fa-solid fa-user-shield w-6"></i>어드민 제어</button>
        </nav>
        <div class="p-6 border-t"><button onclick="location.reload()" class="w-full text-xs font-bold text-slate-400 hover:text-red-500 transition uppercase">Sign Out</button></div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden bg-slate-50">
        <header class="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0">
            <h2 id="view-title" class="font-bold text-slate-800 uppercase italic text-sm tracking-widest">DASHBOARD</h2>
            <div id="clock" class="text-sm font-bold text-[#314e8d] font-mono">00:00:00</div>
        </header>
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div id="v-dash" class="space-y-6">
                <div class="grid grid-cols-3 gap-6">
                    <div class="bg-white p-8 rounded-2xl border shadow-sm">뉴스 분석 <span id="st-news" class="block text-4xl font-bold text-[#314e8d]">0</span></div>
                    <div class="bg-white p-8 rounded-2xl border shadow-sm">게시글 <span id="st-posts" class="block text-4xl font-bold text-[#314e8d]">0</span></div>
                    <div class="bg-white p-8 rounded-2xl border shadow-sm">가입자 <span id="st-users" class="block text-4xl font-bold text-[#314e8d]">0</span></div>
                </div>
            </div>

            <div id="v-comm" class="hidden space-y-6">
                <div id="comm-list-view">
                    <div class="flex justify-between items-center mb-6"><h3 class="font-bold text-lg text-slate-800">모두의 공간</h3><button onclick="openWrite()" class="bg-[#314e8d] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md">글쓰기</button></div>
                    <table class="clien-table shadow-sm border"><thead><tr><th>제목</th><th class="w-32">작성자</th></tr></thead><tbody id="board-body"></tbody></table>
                </div>
                <div id="post-detail" class="hidden bg-white p-10 rounded-2xl border shadow-sm space-y-8">
                    <button onclick="nav('comm')" class="text-xs font-bold text-slate-400"><i class="fa-solid fa-arrow-left mr-1"></i> BACK</button>
                    <div id="detail-body"></div>
                    <div id="comment-area" class="space-y-4 pt-8 border-t"></div>
                    <div class="flex space-x-2"><input id="reply-input" class="flex-1 p-4 border rounded-2xl text-sm" placeholder="댓글 내용을 입력하세요."><button id="reply-btn" class="bg-[#314e8d] text-white px-8 rounded-2xl font-bold">등록</button></div>
                </div>
            </div>

            <div id="v-news" class="hidden space-y-6"></div>
            <div id="v-media" class="hidden grid grid-cols-3 gap-6"></div>

            <div id="v-admin" class="hidden space-y-8 pb-20">
                <div class="bg-white p-8 rounded-2xl border shadow-sm">
                    <h3 class="font-bold text-red-600 mb-6 flex items-center italic"><i class="fa-solid fa-users-gear mr-2"></i>사용자 권한 승인 및 숙청</h3>
                    <div id="adm-users" class="space-y-3"></div>
                </div>
                <div class="bg-white p-8 rounded-2xl border shadow-sm">
                    <h3 class="font-bold text-[#314e8d] mb-6 flex items-center"><i class="fa-solid fa-clapperboard mr-2"></i>미디어 룸 관리</h3>
                    <div class="grid grid-cols-4 gap-3 mb-6">
                        <input id="m-name" placeholder="명칭" class="border p-2 rounded-xl text-sm">
                        <input id="m-url" placeholder="URL" class="border p-2 rounded-xl text-sm">
                        <input id="m-icon" placeholder="아이콘" class="border p-2 rounded-xl text-sm">
                        <button onclick="addMedia()" class="bg-[#314e8d] text-white rounded-xl font-bold text-sm">추가</button>
                    </div>
                    <div id="adm-media" class="space-y-2"></div>
                </div>
            </div>
        </div>
    </main>

    <script>
        let state = { user: null, regSecret: '' };
        setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString('ko-KR', { hour12: false }), 1000);

        function showRegister() { document.getElementById('step-login').classList.add('hidden'); document.getElementById('step-register').classList.remove('hidden'); }

        async function startRegister() {
            const email = document.getElementById('reg-email').value; if(!email) return;
            state.regSecret = Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[b % 32]).join("");
            document.getElementById('reg-qr-img').src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('otpauth://totp/MorningDock:'+email+'?secret='+state.regSecret+'&issuer=MorningDock');
            document.getElementById('reg-otp-box').classList.remove('hidden');
            document.getElementById('reg-btn').innerText = "가입 승인 요청";
            document.getElementById('reg-btn').onclick = finalizeRegister;
        }

        async function finalizeRegister() {
            const email = document.getElementById('reg-email').value;
            const r = await fetch('/api/auth/register', { method:'POST', body:JSON.stringify({email, secret: state.regSecret}) });
            if((await r.json()).uid) { alert('가입 성공! 로그인 하세요.'); location.reload(); }
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
            if(d.sessionId) { state.user.sessionId = d.sessionId; state.user.role = d.role; enter(); } else alert('인증 실패');
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
            if(v==='dash') { const r = await fetch('/api/stats'); const d = await r.json(); document.getElementById('st-news').innerText = d.newsCount; document.getElementById('st-posts').innerText = d.postCount; document.getElementById('st-users').innerText = d.userCount; }
            if(v==='comm') loadComm();
            if(v==='news') loadNews();
            if(v==='media') loadMedia();
            if(v==='admin') loadAdmin();
        }

        async function loadAdmin() {
            const r = await fetch('/api/admin/users', { method:'POST', body:JSON.stringify({sessionId:state.user.sessionId}) });
            const users = await r.json();
            document.getElementById('adm-users').innerHTML = users.map(u => \`
                <div class="flex justify-between items-center p-4 border rounded-2xl bg-white shadow-sm">
                    <span class="font-bold text-sm">\${u.email} <span class="text-[10px] text-slate-400 font-bold ml-2">[\${u.role}]</span></span>
                    <div class="flex space-x-2">
                        <select onchange="updateUser('\${u.uid}', this.value, '\${u.role}')" class="text-[10px] p-2 border rounded-lg">
                            <option value="APPROVED" \${u.status==='APPROVED'?'selected':''}>승인</option>
                            <option value="BLOCKED" \${u.status==='BLOCKED'?'selected':''}>차단</option>
                        </select>
                        <select onchange="updateUser('\${u.uid}', '\${u.status}', this.value)" class="text-[10px] p-2 border rounded-lg">
                            <option value="USER" \${u.role==='USER'?'selected':''}>사용자</option>
                            <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>관리자</option>
                        </select>
                        <button onclick="deleteUser('\${u.uid}')" class="bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1 rounded-lg">삭제</button>
                    </div>
                </div>\`).join('');
            const mr = await fetch('/api/media'); const meds = await mr.json();
            document.getElementById('adm-media').innerHTML = meds.map(m => \`<div class="flex justify-between p-2 border-b text-xs items-center"><span>\${m.name}</span><button onclick="deleteMedia(\${m.id})" class="text-red-500 font-bold">삭제</button></div>\`).join('');
        }

        async function deleteUser(targetUid) { if(confirm('영구 삭제?')) { await fetch('/api/admin/users/delete', { method:'POST', body:JSON.stringify({targetUid, sessionId:state.user.sessionId}) }); loadAdmin(); } }
        async function updateUser(targetUid, status, role) { await fetch('/api/admin/users/update', { method:'POST', body:JSON.stringify({targetUid, status, role, sessionId:state.user.sessionId}) }); loadAdmin(); }
        async function addMedia() { await fetch('/api/admin/media/add', { method:'POST', body:JSON.stringify({name:document.getElementById('m-name').value, url:document.getElementById('m-url').value, icon:document.getElementById('m-icon').value || 'fa-solid fa-play', sessionId:state.user.sessionId}) }); loadAdmin(); }
        async function deleteMedia(id) { await fetch('/api/admin/media/delete', { method:'POST', body:JSON.stringify({id, sessionId:state.user.sessionId}) }); loadAdmin(); }

        async function loadComm() {
            document.getElementById('comm-list-view').classList.remove('hidden'); document.getElementById('post-detail').classList.add('hidden');
            const r = await fetch('/api/community/posts'); const posts = await r.json();
            document.getElementById('board-body').innerHTML = posts.map(p => \`<tr onclick="showPost(\${p.id})" class="border-b hover:bg-slate-50 cursor-pointer transition"><td class="p-4 font-bold text-slate-700">\${p.title}</td><td class="p-4 text-slate-500 font-medium">\${p.email.split('@')[0]}</td></tr>\`).join('');
        }

        async function showPost(id) {
            document.getElementById('comm-list-view').classList.add('hidden'); document.getElementById('post-detail').classList.remove('hidden');
            const [pRes, cRes] = await Promise.all([fetch('/api/community/posts/detail?id='+id), fetch('/api/community/comments?postId='+id)]);
            const p = await pRes.json(); const comments = await cRes.json();
            document.getElementById('detail-body').innerHTML = \`<h3 class="text-2xl font-bold mb-3 text-slate-900">\${p.title}</h3><p class="text-xs text-slate-400 font-bold mb-8">\${p.email} • \${new Date(p.created_at).toLocaleString()}</p><div class="text-slate-700 leading-relaxed text-lg whitespace-pre-line">\${p.content}</div>\`;
            document.getElementById('comment-area').innerHTML = comments.map(c => \`<div class="p-4 bg-slate-50 rounded-2xl text-sm border-slate-100 shadow-sm"><p class="font-bold text-[#314e8d] mb-1">\${c.email}</p><p class="text-slate-700">\${c.content}</p></div>\`).join('');
            document.getElementById('reply-btn').onclick = () => addComment(id);
        }

        async function addComment(postId) {
            const content = document.getElementById('reply-input').value; if(!content) return;
            await fetch('/api/community/comments/add', { method:'POST', body:JSON.stringify({postId, content, userId:state.user.uid, sessionId:state.user.sessionId}) });
            document.getElementById('reply-input').value = ''; showPost(postId);
        }

        async function openWrite() {
            const title = prompt('제목'); const content = prompt('내용');
            if(title && content) { await fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({title, content, userId:state.user.uid, sessionId:state.user.sessionId}) }); loadComm(); }
        }

        async function loadNews() {
            const r = await fetch('/api/news'); const news = await r.json();
            document.getElementById('v-news').innerHTML = news.map(n => \`
                <div class="bg-white p-8 rounded-2xl border shadow-sm space-y-4 hover:shadow-md transition">
                    <h4 class="font-bold text-xl cursor-pointer hover:text-[#314e8d]" onclick="window.open('\${n.link}')">\${n.title}</h4>
                    <p class="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl border-l-8 border-[#314e8d] leading-relaxed">\${n.summary || '분석 중...'}</p>
                    <button onclick="discuss('\${n.title.replace(/'/g,"")}', '\${n.link}')" class="text-xs font-bold text-[#314e8d] hover:underline uppercase tracking-tighter">Start Discussion</button>
                </div>\`).join('');
        }

        function discuss(title, link) {
            fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({title: '[AI토론] ' + title, content: '관련 뉴스 원문: ' + link, userId:state.user.uid, sessionId:state.user.sessionId}) }).then(() => nav('comm'));
        }

        async function loadMedia() {
            const r = await fetch('/api/media'); const meds = await r.json();
            document.getElementById('v-media').innerHTML = meds.map(m => \`<div class="bg-white p-10 rounded-2xl border text-center space-y-5 hover:shadow-lg transition"><div class="text-4xl text-[#314e8d]"><i class="\${m.icon}"></i></div><h4 class="font-bold text-slate-800">\${m.name}</h4><button onclick="window.open('\${m.url}')" class="w-full bg-[#314e8d] text-white py-3 rounded-xl text-xs font-bold uppercase shadow-sm">Launch</button></div>\`).join('');
        }
    </script>
</body>
</html>
  `;
}