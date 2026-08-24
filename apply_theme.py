from pathlib import Path
import shutil
app=Path(__file__).resolve().parent
required=[app/'index.html',app/'styles.css',app/'js'/'app.js']
missing=[str(p) for p in required if not p.exists()]
if missing: raise SystemExit('このoverlayの中身を旅行アプリのルートへコピーしてから実行してください。不足: '+', '.join(missing))
for p in required: shutil.copy2(p,p.with_suffix(p.suffix+'.pre-theme.bak'))
# index.html
p=app/'index.html';s=p.read_text(encoding='utf-8')
if 'name="theme-color"' not in s:s=s.replace('<meta name="viewport" content="width=device-width,initial-scale=1">','<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f4f7f6">')
if 'theme.css' not in s:s=s.replace('<link rel="stylesheet" href="styles.css">','<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="theme.css">')
if 'id="themeBtn"' not in s:s=s.replace('<button class="sub" id="importBtn">','<button class="sub" id="themeBtn">テーマ</button><button class="sub" id="importBtn">')
if 'id="themeDialog"' not in s:
  marker='<dialog id="tripDialog">'
  dialog='''<dialog id="themeDialog"><form id="themeForm"><div class="dialog-head"><div><small>表示設定</small><h2>カラーテーマ</h2></div><button type="button" class="icon" id="themeCloseBtn">×</button></div><label><select id="themeSelect"><option value="system">端末設定に合わせる</option><option value="light">Journey Light</option><option value="dark">Night Travel</option><option value="paper">Warm Paper</option></select></label><div class="theme-preview"><button type="button" class="theme-choice" data-theme-choice="light"><span class="theme-swatch sw-light"></span><strong>Journey Light</strong><small>明るく読みやすい標準</small></button><button type="button" class="theme-choice" data-theme-choice="dark"><span class="theme-swatch sw-dark"></span><strong>Night Travel</strong><small>夜間向けダーク</small></button><button type="button" class="theme-choice" data-theme-choice="paper"><span class="theme-swatch sw-paper"></span><strong>Warm Paper</strong><small>旅のしおり風</small></button></div><label class="theme-device"><input id="themeDeviceOnly" type="checkbox">この端末だけに適用</label><p class="muted">オフの場合はSupabase設定としてPCとスマホへ同期します。</p><div class="dialog-actions"><button type="button" class="sub" id="themeCancelBtn">キャンセル</button><button type="submit">適用</button></div></form></dialog>'''
  s=s.replace(marker,dialog+marker)
p.write_text(s,encoding='utf-8')
# app.js
p=app/'js'/'app.js';s=p.read_text(encoding='utf-8')
if './theme.js' not in s:
  first_end=s.find(';')+1
  s=s[:first_end]+'import{applyTheme,watchSystemTheme,getDeviceTheme,setDeviceTheme}from"./theme.js";'+s[first_end:]
if 'function initThemeUI' not in s:
  insertion='''
function currentCloudTheme(){return state?.settings?.theme||"system"}
function refreshThemeChoices(){const selected=getDeviceTheme()||currentCloudTheme();$("#themeSelect").value=selected;document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("active",b.dataset.themeChoice===selected));$("#themeDeviceOnly").checked=Boolean(getDeviceTheme())}
function initThemeUI(){applyTheme(currentCloudTheme());watchSystemTheme(currentCloudTheme);$("#themeBtn").onclick=()=>{refreshThemeChoices();$("#themeDialog").showModal()};$("#themeCloseBtn").onclick=$("#themeCancelBtn").onclick=()=>$("#themeDialog").close();document.querySelectorAll("[data-theme-choice]").forEach(b=>b.onclick=()=>{$("#themeSelect").value=b.dataset.themeChoice;document.querySelectorAll("[data-theme-choice]").forEach(x=>x.classList.toggle("active",x===b));applyTheme(b.dataset.themeChoice)});$("#themeSelect").onchange=()=>applyTheme($("#themeSelect").value);$("#themeForm").onsubmit=async e=>{e.preventDefault();const value=$("#themeSelect").value;if($("#themeDeviceOnly").checked){setDeviceTheme(value)}else{setDeviceTheme("");state.settings.theme=value;await save()}applyTheme(currentCloudTheme());$("#themeDialog").close();toast("テーマを変更しました")}}
'''
  # Add before startApp/boot or boot
  pos=s.find('async function startApp()')
  if pos<0:pos=s.find('async function boot()')
  s=s[:pos]+insertion+s[pos:]
  # invoke once after state loaded and before UI binding
  s=s.replace('state=normalize(await Storage.load());initEditor(', 'state=normalize(await Storage.load());initThemeUI();initEditor(')
  s=s.replace('state=normalize(await Storage.load());', 'state=normalize(await Storage.load());initThemeUI();',1) if 'initThemeUI();initEditor(' not in s else s
p.write_text(s,encoding='utf-8')
print('Theme patch applied. Backups: *.pre-theme.bak')
