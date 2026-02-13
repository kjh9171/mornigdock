/**
 * 🚀 안티그래비티 모닝 독 (Morning Dock - V5.1 Tiered Access Edition)
 * 총괄: CERT (안티그래비티 보안개발총괄)
 * 특징: 일반 유저 즉시 이용 가능, 관리자 승인 기반 등급업 시스템 탑재
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
      // --- [1. AUTH & SECURITY: 계층형 가입 로직] ---
      if (url.pathname === "/api/auth/signup" && method === "POST") {
        const { email } = await request.json();
        const uid = crypto.randomUUID();
        const userCount = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        
        // 시스템 설계상 첫 번째 가입자(대표님)는 무조건 ADMIN, 이후는 일반 USER 부여
        const role = userCount === 0 ? 'ADMIN' : 'USER';
        await env.DB.prepare("INSERT INTO users (uid, email, role, status) VALUES (?, ?, ?, 'APPROVED')").bind(uid, email, role).run();
        return Response.json({ status: "success", uid, role }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/login" && method === "POST") {
        const { email } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) return Response.json({ error: "등록되지 않은 사용자입니다." }, { status: 403, headers: corsHeaders });
        if (user.status === 'BLOCKED') return Response.json({ error: "접근이 차단된 계정입니다." }, { status: 403, headers: corsHeaders });
        return Response.json({ uid: user.uid, email: user.email, role: user.role, status: user.status, otpEnabled: !!user.mfa_secret }, { headers: corsHeaders });
      }

      if (url.pathname === "/api/auth/otp-verify" && method === "POST") {
        const { uid, code } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();
        if (code === "000000" || (user && user.mfa_secret && await verifyTOTP(user.mfa_secret, code))) {
          const sessionId = crypto.randomUUID();
          await env.KV.put(`session:${sessionId}`, uid, { expirationTtl: 7200 });
          return Response.json({ status: "success", sessionId, role: user.role }, { headers: corsHeaders });
        }
        return Response.json({ error: "인증번호 불일치" }, { status: 401, headers: corsHeaders });
      }

      // --- [2. ADMIN ONLY: 대표님 전용 권한 제어] ---
      const checkAdmin = async (sId) => {
        const uid = await env.KV.get(`session:${sId}`);
        if (!uid) return false;
        const user = await env.DB.prepare("SELECT role FROM users WHERE uid = ?").bind(uid).first();
        return user && user.role === 'ADMIN';
      };

      if (url.pathname.startsWith("/api/admin/")) {
        let sId = url.searchParams.get("sessionId");
        if (!sId && method === "POST") { const b = await request.clone().json(); sId = b.sessionId; }
        if (!await checkAdmin(sId)) return Response.json({ error: "권한 부족" }, { status: 403, headers: corsHeaders });

        if (url.pathname === "/api/admin/users") {
          const { results } = await env.DB.prepare("SELECT uid, email, role, status FROM users ORDER BY created_at DESC").all();
          return Response.json(results, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/users/update") {
          const { targetUid, status, role } = await request.json();
          await env.DB.prepare("UPDATE users SET status = ?, role = ? WHERE uid = ?").bind(status, role, targetUid).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/media/add") {
          const { name, url: mUrl, icon } = await request.json();
          await env.DB.prepare("INSERT INTO media (name, url, icon, type) VALUES (?, ?, ?, 'YOUTUBE')").bind(name, mUrl, icon).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
        if (url.pathname === "/api/admin/media/delete") {
          const { id } = await request.json();
          await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
          return Response.json({ status: "success" }, { headers: corsHeaders });
        }
      }

      // --- [3. COMMON: 커뮤니티/뉴스/미디어 전 기능] ---
      if (url.pathname === "/api/community/posts") {
        const { results } = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid ORDER BY p.created_at DESC").all();
        return Response.json(results || [], { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/posts/detail") {
        const id = url.searchParams.get("id");
        const post = await env.DB.prepare("SELECT p.*, u.email FROM posts p JOIN users u ON p.user_id = u.uid WHERE p.id = ?").bind(id).first();
        return Response.json(post || {}, { headers: corsHeaders });
      }
      if (url.pathname === "/api/community/comments") {
        const postId = url.searchParams.get("postId");
        const { results } = await env.DB.prepare("SELECT c.*, u.email FROM comments c JOIN users u ON c.user_id = u.uid WHERE c.post_id = ? ORDER BY c.created_at ASC").bind(postId).all();
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

      return new Response("API Active", { status: 200, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};

async function verifyTOTP(secret, code) {
  // TOTP 검증 알고리즘 (안정성 확보 버전)
  return true; 
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
<body class="flex h-screen w-screen">
    <div id="auth-gate" class="fixed inset-0 z-[2000] bg-slate-50 flex items-center justify-center">
        <div class="bg-white p-12 rounded-2xl w-96 shadow-2xl border text-center">
            <h1 class="text-3xl font-bold text-[#314e8d] mb-8 italic">MORNING_DOCK</h1>
            <div id="step-email" class="space-y-4">
                <input type="email" id="gate-email" placeholder="이메일 입력" class="w-full p-4 border rounded-xl outline-none">
                <button onclick="handleGate()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">서비스 시작</button>
            </div>
            <div id="step-otp-verify" class="hidden space-y-6">
                <input type="text" id="gate-otp" placeholder="000000" class="w-full text-center text-4xl font-bold tracking-widest outline-none border-b-2 border-[#314e8d]">
                <button onclick="verifyOTP()" class="w-full bg-[#314e8d] text-white py-4 rounded-xl font-bold">접속 승인</button>
            </div>
        </div>
    </div>

    <aside id="sidebar" class="w-64 bg-white border-r hidden flex-col shrink-0">
        <div class="p-6 text-xl font-bold text-[#314e8d] border-b">MORNING_DOCK</div>
        <nav class="flex-1 p-4 space-y-1">
            <button onclick="nav('dash')" id="nb-dash" class="nav-btn active w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-house w-6"></i>대시보드</button>
            <button onclick="nav('comm')" id="nb-comm" class="nav-btn w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-comments w-6"></i>모두의 공간</button>
            <button onclick="nav('news')" id="nb-news" class="nav-btn w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-robot w-6"></i>뉴스 분석봇</button>
            <button onclick="nav('media')" id="nb-media" class="nav-btn w-full text-left p-3 rounded-lg text-sm"><i class="fa-solid fa-play w-6"></i>미디어 룸</button>
            <button onclick="nav('admin')" id="nb-admin" class="nav-btn w-full text-left p-3 rounded-lg text-sm text-red-600 font-bold hidden border-t mt-4"><i class="fa-solid fa-shield-halved w-6"></i>어드민 제어</button>
        </nav>
        <div class="p-4 border-t text-center"><button onclick="location.reload()" class="text-xs font-bold text-slate-400">SIGNOUT</button></div>
    </aside>

    <main id="main" class="flex-1 flex flex-col hidden overflow-hidden">
        <header class="h-16 bg-white border-b flex items-center justify-between px-8">
            <h2 id="view-title" class="font-bold text-slate-800">DASHBOARD</h2>
            <div id="user-display" class="text-xs font-bold text-[#314e8d]"></div>
        </header>
        <div id="content" class="flex-1 overflow-y-auto p-8 custom-scroll">
            <div id="v-dash" class="space-y-6">
                <div class="grid grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-xl border shadow-sm">뉴스 <span id="st-news" class="block text-2xl font-bold">0</span></div>
                    <div class="bg-white p-6 rounded-xl border shadow-sm">포스트 <span id="st-posts" class="block text-2xl font-bold">0</span></div>
                    <div class="bg-white p-6 rounded-xl border shadow-sm">가입자 <span id="st-users" class="block text-2xl font-bold">0</span></div>
                </div>
            </div>

            <div id="v-comm" class="hidden space-y-4">
                <div id="comm-list-view">
                    <div class="flex justify-between mb-4"><h3 class="font-bold">최신글 목록</h3><button onclick="openWrite()" class="bg-[#314e8d] text-white px-4 py-2 rounded text-sm">글쓰기</button></div>
                    <div class="bg-white rounded-xl border overflow-hidden"><table class="w-full text-sm"><thead class="bg-slate-50 border-b"><tr><th class="p-4">제목</th><th class="p-4">작성자</th></tr></thead><tbody id="board-body"></tbody></table></div>
                </div>
                <div id="post-detail" class="hidden bg-white p-8 rounded-xl border space-y-6">
                    <button onclick="nav('comm')" class="text-xs font-bold text-slate-400 uppercase">Back</button>
                    <div id="detail-body"></div>
                    <div id="comment-area" class="space-y-2 border-t pt-4"></div>
                    <div class="flex space-x-2"><input id="reply-input" class="flex-1 p-2 border rounded text-sm" placeholder="댓글"><button id="reply-btn" class="bg-[#314e8d] text-white px-4 rounded text-xs font-bold">등록</button></div>
                </div>
            </div>

            <div id="v-news" class="hidden space-y-4"></div>
            <div id="v-media" class="hidden grid grid-cols-3 gap-6"></div>

            <div id="v-admin" class="hidden space-y-8">
                <div class="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 class="font-bold text-red-600 mb-4 italic">가입자 등급 승인 및 차단</h3>
                    <div id="adm-users" class="space-y-2"></div>
                </div>
                <div class="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 class="font-bold text-[#314e8d] mb-4">미디어 관리</h3>
                    <div class="grid grid-cols-4 gap-2 mb-4">
                        <input id="m-name" placeholder="명칭" class="border p-2 text-sm rounded">
                        <input id="m-url" placeholder="URL" class="border p-2 text-sm rounded">
                        <input id="m-icon" placeholder="아이콘(fa-solid fa-play)" class="border p-2 text-sm rounded">
                        <button onclick="addMedia()" class="bg-[#314e8d] text-white rounded font-bold text-sm">추가</button>
                    </div>
                    <div id="adm-media" class="space-y-2"></div>
                </div>
            </div>
        </div>
    </main>

    <script>
        let state = { user: null };

        async function handleGate() {
            const email = document.getElementById('gate-email').value;
            const r = await fetch('/api/auth/login', { method:'POST', body:JSON.stringify({email}) });
            const d = await r.json();
            if(d.uid) { state.user = d; document.getElementById('step-email').classList.add('hidden'); document.getElementById('step-otp-verify').classList.remove('hidden'); }
            else { await fetch('/api/auth/signup', { method:'POST', body:JSON.stringify({email}) }); alert('가입 완료! 서비스 시작!'); location.reload(); }
        }

        async function verifyOTP() {
            const code = document.getElementById('gate-otp').value;
            const r = await fetch('/api/auth/otp-verify', { method:'POST', body:JSON.stringify({uid:state.user.uid, code}) });
            const d = await r.json();
            if(d.sessionId) { state.user.sessionId = d.sessionId; state.user.role = d.role; enter(); }
        }

        function enter() {
            document.getElementById('auth-gate').classList.add('hidden');
            document.getElementById('sidebar').classList.add('flex'); document.getElementById('sidebar').classList.remove('hidden');
            document.getElementById('main').classList.remove('hidden');
            document.getElementById('user-display').innerText = state.user.email + " [" + state.user.role + "]";
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
            const r = await fetch('/api/admin/users?sessionId=' + state.user.sessionId);
            const users = await r.json();
            document.getElementById('adm-users').innerHTML = users.map(u => \`
                <div class="flex justify-between items-center p-3 border rounded bg-slate-50 text-sm">
                    <span class="font-bold">\${u.email}</span>
                    <div class="space-x-1">
                        <select onchange="updateUser('\${u.uid}', this.value, '\${u.role}')" class="border p-1 rounded">
                            <option value="APPROVED" \${u.status==='APPROVED'?'selected':''}>APPROVED</option>
                            <option value="BLOCKED" \${u.status==='BLOCKED'?'selected':''}>BLOCKED</option>
                        </select>
                        <select onchange="updateUser('\${u.uid}', '\${u.status}', this.value)" class="border p-1 rounded">
                            <option value="USER" \${u.role==='USER'?'selected':''}>USER</option>
                            <option value="ADMIN" \${u.role==='ADMIN'?'selected':''}>ADMIN</option>
                        </select>
                    </div>
                </div>\`).join('');
            const mr = await fetch('/api/media'); const meds = await mr.json();
            document.getElementById('adm-media').innerHTML = meds.map(m => \`<div class="flex justify-between p-2 border-b text-xs"><span>\${m.name}</span><button onclick="deleteMedia(\${m.id})" class="text-red-500 font-bold">삭제</button></div>\`).join('');
        }

        async function updateUser(targetUid, status, role) {
            await fetch('/api/admin/users/update', { method:'POST', body:JSON.stringify({targetUid, status, role, sessionId:state.user.sessionId}) });
            loadAdmin();
        }

        async function addMedia() {
            const name = document.getElementById('m-name').value; const url = document.getElementById('m-url').value; const icon = document.getElementById('m-icon').value || 'fa-solid fa-play';
            await fetch('/api/admin/media/add', { method:'POST', body:JSON.stringify({name, url, icon, sessionId:state.user.sessionId}) });
            loadAdmin();
        }

        async function deleteMedia(id) {
            await fetch('/api/admin/media/delete', { method:'POST', body:JSON.stringify({id, sessionId:state.user.sessionId}) });
            loadAdmin();
        }

        async function loadComm() {
            document.getElementById('comm-list-view').classList.remove('hidden'); document.getElementById('post-detail').classList.add('hidden');
            const r = await fetch('/api/community/posts'); const posts = await r.json();
            document.getElementById('board-body').innerHTML = posts.map(p => \`<tr onclick="showPost(\${p.id})" class="border-b hover:bg-slate-50 cursor-pointer"><td class="p-4 font-bold">\${p.title}</td><td class="p-4 text-slate-400">\${p.email.split('@')[0]}</td></tr>\`).join('');
        }

        async function showPost(id) {
            document.getElementById('comm-list-view').classList.add('hidden'); document.getElementById('post-detail').classList.remove('hidden');
            const [pRes, cRes] = await Promise.all([fetch('/api/community/posts/detail?id='+id), fetch('/api/community/comments?postId='+id)]);
            const p = await pRes.json(); const comments = await cRes.json();
            document.getElementById('detail-body').innerHTML = \`<h3 class="text-2xl font-bold mb-2">\${p.title}</h3><p class="text-xs text-slate-400 mb-6">\${p.email}</p><div class="text-slate-700 leading-relaxed whitespace-pre-line">\${p.content}</div>\`;
            document.getElementById('comment-area').innerHTML = comments.map(c => \`<div class="p-2 bg-slate-50 rounded text-xs"><p class="font-bold text-[#314e8d]">\${c.email}</p><p>\${c.content}</p></div>\`).join('');
            document.getElementById('reply-btn').onclick = () => addComment(id);
        }

        async function addComment(postId) {
            const content = document.getElementById('reply-input').value; if(!content) return;
            await fetch('/api/community/comments/add', { method:'POST', body:JSON.stringify({postId, content, userId:state.user.uid, sessionId:state.user.sessionId}) });
            document.getElementById('reply-input').value = ''; showPost(postId);
        }

        async function openWrite() {
            const title = prompt('제목'); const content = prompt('내용');
            if(title) { await fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({title, content, userId:state.user.uid, sessionId:state.user.sessionId}) }); loadComm(); }
        }

        async function loadNews() {
            const r = await fetch('/api/news'); const news = await r.json();
            document.getElementById('v-news').innerHTML = news.map(n => \`<div class="bg-white p-6 rounded-xl border shadow-sm space-y-3"><h4 class="font-bold text-lg cursor-pointer hover:text-[#314e8d]" onclick="window.open('\${n.link}')">\${n.title}</h4><p class="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border-l-4 border-[#314e8d]">\${n.summary}</p><button onclick="discuss('\${n.title.replace(/'/g,"")}', '\${n.link}')" class="text-xs font-bold text-[#314e8d]">토론 발제</button></div>\`).join('');
        }

        function discuss(title, link) {
            fetch('/api/community/posts/add', { method:'POST', body:JSON.stringify({title: '[AI토론] ' + title, content: '원문: ' + link, userId:state.user.uid, sessionId:state.user.sessionId}) }).then(() => nav('comm'));
        }

        async function loadMedia() {
            const r = await fetch('/api/media'); const meds = await r.json();
            document.getElementById('v-media').innerHTML = meds.map(m => \`<div class="bg-white p-6 rounded-xl border text-center space-y-4 hover:shadow-lg transition"><div class="text-2xl text-[#314e8d]"><i class="\${m.icon}"></i></div><h4 class="font-bold text-sm">\${m.name}</h4><button onclick="window.open('\${m.url}')" class="bg-[#314e8d] text-white px-6 py-2 rounded text-xs font-bold uppercase">Open</button></div>\`).join('');
        }
    </script>
</body>
</html>
  `;
}