from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
app=root
required=[app/'index.html',app/'styles.css',app/'js'/'app.js']
missing=[str(p) for p in required if not p.exists()]
if missing: raise SystemExit('Phase 1.1フォルダ直下へoverlay内の全ファイルをコピーしてから実行してください。不足: '+', '.join(missing))
for p in required: shutil.copy2(p,p.with_suffix(p.suffix+'.phase1.1.bak'))
index=(app/'index.html').read_text(encoding='utf-8')
if 'id="authDialog"' not in index:
    index=index.replace('<div class="actions"><button class="sub" id="importBtn">','<div class="cloud-status"><span id="syncStatus">ローカル</span><span id="userEmail"></span><button class="sub" id="logoutBtn" hidden>ログアウト</button></div><div class="actions"><button class="sub" id="importBtn">')
    index=index.replace('<div id="toast" class="toast" hidden></div>','''<dialog id="authDialog" class="auth-dialog"><form id="authForm"><div class="dialog-head"><div><small>プライベート同期</small><h2>ログイン</h2></div></div><p class="muted">旅行データはSupabaseへ非公開保存されます。</p><label>メールアドレス<input id="authEmail" type="email" autocomplete="email" required></label><label>パスワード<input id="authPassword" type="password" minlength="6" required></label><p id="authMessage" class="muted"></p><div class="dialog-actions"><button type="button" class="sub" id="signupBtn">新規アカウント作成</button><button type="submit">ログイン</button></div></form></dialog><div id="toast" class="toast" hidden></div>''')
(app/'index.html').write_text(index,encoding='utf-8')
css=(app/'styles.css').read_text(encoding='utf-8')
if '.cloud-status{' not in css: css+='\n.cloud-status{display:flex;gap:7px;align-items:center;flex-wrap:wrap;font-size:11px;color:var(--muted)}#syncStatus{display:inline-flex;padding:4px 8px;border-radius:999px;background:#f3f4f6;font-weight:700}#syncStatus.syncing{background:#fff7ed;color:#9a3412}#syncStatus.synced{background:#ecfdf5;color:#047857}#syncStatus.error{background:#fef2f2;color:#b91c1c}.auth-dialog{width:min(430px,calc(100vw - 22px))}.auth-dialog form{max-height:none}\n'
(app/'styles.css').write_text(css,encoding='utf-8')
p=app/'js'/'app.js';s=p.read_text(encoding='utf-8')
s=s.replace('import{Storage}from"./storage.js";','import{Storage,setStorageUser,onStorageStatus}from"./storage.js";import{isCloudConfigured,getCurrentSession,signIn,signUp,signOut}from"./cloud.js";')
s=s.replace('let state,day=1;','let state,day=1,appStarted=false;')
s=s.replace('async function boot(){state=normalize(await Storage.load());','async function startApp(){if(appStarted)return;appStarted=true;state=normalize(await Storage.load());')
old=';list()}boot();'
new=''';list()}
function setSyncStatus(kind,text){const el=$("#syncStatus");el.className=kind||"";el.textContent=text}
async function boot(){onStorageStatus(setSyncStatus);if(!isCloudConfigured()){setSyncStatus("","ローカル");await startApp();return}try{const session=await getCurrentSession();if(session){setStorageUser(session.user);$("#userEmail").textContent=session.user.email||"";$("#logoutBtn").hidden=false;await startApp();return}$("#authDialog").showModal()}catch(error){setSyncStatus("error","接続エラー");$("#authMessage").textContent=error.message;$("#authDialog").showModal()}}
$("#authForm").onsubmit=async e=>{e.preventDefault();$("#authMessage").textContent="ログイン中…";try{const session=await signIn($("#authEmail").value,$("#authPassword").value);setStorageUser(session.user);$("#userEmail").textContent=session.user.email||"";$("#logoutBtn").hidden=false;$("#authDialog").close();await startApp()}catch(error){$("#authMessage").textContent=error.message}};
$("#signupBtn").onclick=async()=>{$("#authMessage").textContent="登録中…";try{const session=await signUp($("#authEmail").value,$("#authPassword").value);if(session){setStorageUser(session.user);$("#userEmail").textContent=session.user.email||"";$("#logoutBtn").hidden=false;$("#authDialog").close();await startApp()}else{$("#authMessage").textContent="確認メールを確認後、ログインしてください。"}}catch(error){$("#authMessage").textContent=error.message}};
$("#logoutBtn").onclick=async()=>{await Storage.flush();await signOut();location.reload()};boot();'''
if old not in s and 'function setSyncStatus' not in s: raise SystemExit('app.jsの想定位置が見つかりません。Phase 1.1修正版か確認してください。')
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('Phase 2 patch applied successfully.')
