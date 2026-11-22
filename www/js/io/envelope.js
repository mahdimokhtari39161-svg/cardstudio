// Shareable "animated envelope" card: ONE self-contained .html file (card images + envelope + generative music).
// Recipient taps the envelope → it opens, the card rises out and music starts. Works offline in any browser.
import { renderVariant } from './export.js';
import { occById, occName } from '../data/occasions.js';
import { PALETTES } from '../data/palettes.js';
import { readFileAs } from '../ui/dom.js';

export const ENVELOPES = {
  classic:   { n: ['کلاسیک کرم', 'Classic cream'], body: '#f3e7cf', flap: '#ead9b4', liner: '#d9c59a', seal: '#a3262a', ink: '#fff', glyph: '❦', pat: 'none' },
  wax:       { n: ['مهر موم قرمز', 'Red wax seal'], body: '#7a1f2b', flap: '#8d2a37', liner: '#5e1620', seal: '#d4af37', ink: '#5e1620', glyph: '✦', pat: 'none' },
  blackgold: { n: ['مشکی و طلایی', 'Black & gold'], body: '#17171b', flap: '#202027', liner: '#0d0d10', seal: '#d4af37', ink: '#111', glyph: '✦', pat: 'gold' },
  whitegold: { n: ['سفید و طلایی', 'White & gold'], body: '#fbf8f0', flap: '#f3ecd9', liner: '#e8dcc0', seal: '#c9a24a', ink: '#fff', glyph: '❦', pat: 'none' },
  floral:    { n: ['گلدار صورتی', 'Pink floral'], body: '#fde8ee', flap: '#f8d0dd', liner: '#f4b9cb', seal: '#c2185b', ink: '#fff', glyph: '✿', pat: 'dots' },
  heart:     { n: ['عاشقانه', 'Romantic'], body: '#f7d9df', flap: '#eebcc7', liner: '#e08fa3', seal: '#c0183c', ink: '#fff', glyph: '♥', pat: 'dots' },
  kids:      { n: ['کودکانه', 'Kids'], body: '#bfe6ff', flap: '#9dd6fb', liner: '#fff3b0', seal: '#ff6b6b', ink: '#fff', glyph: '★', pat: 'stripes' },
  kraft:     { n: ['کاغذ کرافت', 'Kraft paper'], body: '#c8a679', flap: '#b9955f', liner: '#e9d7b5', seal: '#7a4b1e', ink: '#fff', glyph: '❦', pat: 'none' },
  royal:     { n: ['سرمه‌ای سلطنتی', 'Royal navy'], body: '#14213d', flap: '#1c2d52', liner: '#0d1730', seal: '#d4af37', ink: '#14213d', glyph: '♔', pat: 'gold' },
  emerald:   { n: ['سبز اسلامی', 'Emerald'], body: '#0f4d3a', flap: '#176651', liner: '#0a3629', seal: '#d4af37', ink: '#0a3629', glyph: '☪', pat: 'gold' },
  auto:      { n: ['هماهنگ با کارت', 'Match the card'], glyph: '✦' },
};
export const MOODS = {
  romantic: ['عاشقانه (پیانو نرم)', 'Romantic (soft piano)'], festive: ['شاد و جشن', 'Joyful celebration'], royal: ['باشکوه و سلطنتی', 'Grand & royal'],
  calm: ['آرام و صمیمی', 'Calm & warm'], playful: ['کودکانه و بازیگوش', 'Playful'], serene: ['معنوی و آرامش‌بخش', 'Serene & spiritual'],
  persian: ['سنتی ایرانی', 'Persian traditional'], eid: ['جشن شرقی (عید)', 'Oriental festive'], elegy: ['سوگ و مرثیه (بی‌کلام)', 'Mourning elegy (instrumental)'], lullaby: ['لالایی', 'Lullaby'],
  triumph: ['پیروزی و افتخار', 'Triumph'], jazz: ['جاز ملایم', 'Smooth jazz'], none: ['بدون موسیقی', 'No music'],
};
export function moodFor(card) {
  const o = occById[card.occasion]; if (!o) return 'festive';
  if (o.k === 'condolence' || ['memorial', 'muharram', 'sympathy'].includes(o.id)) return 'elegy';
  if (['nowruz', 'yalda'].includes(o.id)) return 'persian'; if (['eidFitr', 'eidAdha', 'ghadir', 'prophetBirthday', 'religiousEids'].includes(o.id)) return 'eid';
  if (['graduation', 'gradParty', 'success', 'promotion'].includes(o.id)) return 'triumph'; if (['newborn', 'babyShower'].includes(o.id)) return 'lullaby'; if (['dinner', 'party', 'seminar', 'meeting', 'conference'].includes(o.id)) return 'jazz'; if (o.k === 'love') return 'romantic';
  if (['wedding', 'engagement', 'aghd', 'anniversary', 'meetAnniversary', 'romantic', 'spouseBirthday'].includes(o.id)) return 'romantic';
  if (['kidBirthday', 'genderReveal', 'childrensDay'].includes(o.id)) return 'playful';
  if (o.g === 'religious') return 'serene'; if (o.g === 'business') return 'royal'; if (o.k === 'thanks' || o.k === 'sorry') return 'calm';
  return 'festive';
}
export function envelopeFor(card) {
  const o = occById[card.occasion], id = o?.id || '';
  if (['wedding', 'engagement', 'aghd', 'anniversary', 'romantic', 'valentine'].includes(id) || o?.k === 'love') return 'wax';
  if (['kidBirthday', 'newborn', 'babyShower', 'genderReveal', 'childrensDay'].includes(id)) return 'kids';
  if (o?.g === 'religious') return 'emerald'; if (o?.g === 'business') return 'royal';
  if (['memorial', 'condolence', 'sympathy', 'muharram'].includes(id)) return 'blackgold';
  return 'whitegold';
}
const UI = { fa: 'برای باز کردن پاکت لمس کنید', en: 'Tap the envelope to open', ar: 'المس المغلف لفتحه', tr: 'Açmak için zarfa dokunun', ru: 'Нажмите на конверт, чтобы открыть', fr: 'Touchez l’enveloppe pour l’ouvrir', de: 'Tippen Sie auf den Umschlag zum Öffnen' };
const FOR = { fa: 'برای', en: 'For', ar: 'إلى', tr: 'Sayın', ru: 'Для', fr: 'Pour', de: 'Für' };

const MUSIC_JS = `
function Music(mood){
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC||mood==='none') return {start(){},stop(){},toggle(){return false}};
  const P={
    romantic:{bpm:68,root:60,ch:[[0,4,7,11],[9,0,4,7],[5,9,0,4],[7,11,2,5]],sc:[0,2,4,7,9,11],w:'sine',pad:'sine',swing:0},
    festive:{bpm:112,root:67,ch:[[0,4,7],[5,9,0],[7,11,2],[0,4,7]],sc:[0,2,4,7,9],w:'triangle',pad:'triangle',swing:.1},
    royal:{bpm:62,root:62,ch:[[0,3,7],[8,0,3],[5,8,0],[7,11,2]],sc:[0,2,3,5,7,8,10],w:'triangle',pad:'sawtooth',swing:0},
    calm:{bpm:58,root:57,ch:[[0,3,7,10],[8,0,3,7],[5,8,0,3],[7,10,2,5]],sc:[0,3,5,7,10],w:'sine',pad:'sine',swing:0},
    playful:{bpm:126,root:72,ch:[[0,4,7],[7,11,2],[9,0,4],[5,9,0]],sc:[0,2,4,7,9],w:'square',pad:'triangle',swing:.12},
    serene:{bpm:52,root:62,ch:[[0,7,12],[-2,5,10],[-4,3,8],[-2,5,10]],sc:[0,2,5,7,9],w:'sine',pad:'sine',swing:0},
    persian:{bpm:84,root:62,ch:[[0,4,7],[1,5,8],[0,4,7],[-2,2,5]],sc:[0,1,4,5,7,8,10],w:'triangle',pad:'sine',swing:.05,as:1},
    eid:{bpm:118,root:64,ch:[[0,4,7],[5,9,0],[0,4,7],[7,11,2]],sc:[0,1,4,5,7,8,11],w:'triangle',pad:'triangle',swing:.1},
    elegy:{bpm:44,root:57,ch:[[0,7,12],[0,7,12],[-2,5,10],[0,7,12]],sc:[0,2,3,5,7,8],w:'sine',pad:'sawtooth',swing:0,as:4,mel:.25},
    lullaby:{bpm:60,root:72,ch:[[0,4,7],[5,9,0],[0,4,7],[7,11,2]],sc:[0,2,4,7,9],w:'sine',pad:'sine',swing:0,as:2,mel:.3},
    triumph:{bpm:100,root:60,ch:[[0,4,7],[5,9,0],[7,11,2],[0,4,7]],sc:[0,2,4,7,9],w:'triangle',pad:'sawtooth',swing:0},
    jazz:{bpm:92,root:60,ch:[[0,4,7,11],[2,5,9,0],[7,11,2,5],[0,4,7,9]],sc:[0,2,4,7,9,10],w:'sine',pad:'sine',swing:.25}
  }[mood]||null; if(!P) return {start(){},stop(){},toggle(){return false}};
  let ctx,master,timer,on=false,step=0,seed=7;
  const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  const hz=m=>440*Math.pow(2,(m-69)/12);
  function note(m,t,d,vol,type,lp){
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter(); o.type=type; o.frequency.value=hz(m);
    f.type='lowpass'; f.frequency.value=lp||2400; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(f);f.connect(g);g.connect(master); o.start(t); o.stop(t+d+0.05);
  }
  function tick(){
    if(!on) return; const spb=60/P.bpm, eighth=spb/2; const ahead=ctx.currentTime+0.6;
    while(next<ahead){
      const bar=Math.floor(step/8)%P.ch.length, pos=step%8, ch=P.ch[bar];
      const sw=(pos%2?eighth*P.swing:0), t=next+sw;
      if(pos===0){ ch.forEach((c,i)=>note(P.root-12+c,t,eighth*7.5,0.05,P.pad,700)); note(P.root-24+ch[0],t,eighth*3.5,0.09,'sine',500); }
      const arp=[0,1,2,1,3%ch.length,2,1,2][pos]; if(pos%(P.as||1)===0&&(pos!==7||rnd()<.5)) note(P.root+ch[arp%ch.length]+(pos%4===2?12:0),t,eighth*2.6,0.07,P.w,2600);
      if(pos%2===0&&rnd()<(P.mel||.55)){ const n=P.sc[Math.floor(rnd()*P.sc.length)]; note(P.root+12+n,t,eighth*3,0.06,P.w,3200); }
      next+=eighth; step++;
    }
    timer=setTimeout(tick,120);
  }
  let next=0;
  return {
    start(){ try{ if(!ctx){ctx=new AC(); master=ctx.createGain(); master.gain.value=0; const d=ctx.createDelay(); d.delayTime.value=.32; const fb=ctx.createGain(); fb.gain.value=.34; const wet=ctx.createGain(); wet.gain.value=.3; master.connect(ctx.destination); master.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(ctx.destination);} ctx.resume(); on=true; next=ctx.currentTime+.05; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(.9,ctx.currentTime+2.5); tick(); }catch(e){} },
    stop(){ on=false; clearTimeout(timer); if(ctx) master.gain.linearRampToValueAtTime(0,ctx.currentTime+.5); },
    toggle(){ if(on){this.stop();return false}else{this.start();return true} }
  };
}`;

export async function buildEnvelopeHTML(card, { envelope = 'auto', mood = 'festive', audioFile = null, audioData = '', to = '', lang = card.lang, width = 900 } = {}) {
  const pal = card.pal || PALETTES.gold; let E = ENVELOPES[envelope] || ENVELOPES.classic;
  if (envelope === 'auto') E = { body: pal.s || '#f4ead0', flap: pal.a2 || '#e5d3a0', liner: pal.l || '#fff', seal: pal.a || '#c9a24a', ink: '#fff', glyph: '✦', pat: 'none' };
  const imgs = card.pages.map((_, i) => renderVariant(card, i, 'png', { width }).toDataURL('image/jpeg', 0.86));
  const p0 = card.pages[0], ratio = p0.h / p0.w;
  const bg = card.pages[0].bg?.color || pal.d || '#14213d';
  const dark = (pal.d || '#14213d');
  let audioTag = ''; if (audioData) audioTag = `<audio id="ua" loop src="${audioData}"></audio>`; else if (audioFile) audioTag = `<audio id="ua" loop src="${await readFileAs(audioFile, 'dataURL')}"></audio>`;
  const rtl = ['fa', 'ar'].includes(lang);
  const pat = E.pat === 'dots' ? 'radial-gradient(rgba(255,255,255,.55) 2px,transparent 2.5px) 0 0/16px 16px' : E.pat === 'stripes' ? 'repeating-linear-gradient(45deg,rgba(255,255,255,.35) 0 8px,transparent 8px 16px)' : E.pat === 'gold' ? 'repeating-linear-gradient(45deg,rgba(212,175,55,.12) 0 2px,transparent 2px 14px)' : 'none';
  const title = (card.data?.title || card.name || '').replace(/[<>&"]/g, '');
  return `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title || 'CardStudio'}</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;height:100%;overflow:hidden}
body{font-family:Tahoma,"Segoe UI",system-ui,sans-serif;background:radial-gradient(circle at 50% 30%,${dark}cc,#000 130%),${dark};color:#fff;display:flex;align-items:center;justify-content:center}
#st{width:min(86vw,440px);transition:opacity .8s,transform .8s;text-align:center}
.env{position:relative;width:100%;aspect-ratio:3/2;perspective:1200px;cursor:pointer;filter:drop-shadow(0 22px 28px rgba(0,0,0,.45));animation:fl 3.2s ease-in-out infinite}
@keyframes fl{50%{transform:translateY(-8px)}}
.env.open{animation:none}
.l{position:absolute;inset:0}
.back{background:${E.liner};border-radius:6px;z-index:0}
.slot{z-index:2;clip-path:inset(-400% 0 0 0)}
.paper{position:absolute;left:7%;width:86%;top:8%;aspect-ratio:1/${ratio.toFixed(4)};background:#fff center/cover;border-radius:3px;box-shadow:0 2px 12px rgba(0,0,0,.3);transition:transform 1.1s cubic-bezier(.3,.7,.2,1) .55s}
.env.open .paper{transform:translateY(-62%)}
.pocket{z-index:3;pointer-events:none}
.pocket i{position:absolute;inset:0;background:${E.body};background-image:${pat}}
.pocket .a{clip-path:polygon(0 0,52% 52%,0 100%);filter:brightness(.97)}
.pocket .b{clip-path:polygon(100% 0,48% 52%,100% 100%);filter:brightness(.97)}
.pocket .c{clip-path:polygon(0 100%,50% 46%,100% 100%);filter:brightness(1.05)}
.flapw{position:absolute;left:0;right:0;top:0;height:56%;transform-origin:50% 0;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.5,0,.2,1);z-index:4}
.env.open .flapw{transform:rotateX(180deg)}
.env.open2 .flapw{z-index:1}
.flapw i{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:polygon(0 0,100% 0,50% 100%)}
.flapw .o{background:${E.flap};background-image:${pat}}
.flapw .n{background:${E.liner};transform:rotateX(180deg)}
.seal{position:absolute;left:50%;top:56%;width:15%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,${E.seal},#0006 160%),${E.seal};color:${E.ink};display:flex;align-items:center;justify-content:center;font-size:clamp(14px,5vw,26px);z-index:5;box-shadow:0 3px 8px rgba(0,0,0,.4),inset 0 0 0 3px rgba(255,255,255,.18);transition:transform .45s,opacity .45s}
.env.open .seal{transform:translate(-50%,-50%) scale(1.5);opacity:0}
.to{position:absolute;left:0;right:0;bottom:11%;text-align:center;z-index:5;color:${E.pat==='none'&&envelope!=='wax'?'#5a4a2a':'#f4e7c3'};font-size:clamp(14px,4.2vw,20px);letter-spacing:.5px;text-shadow:0 1px 0 rgba(255,255,255,.2)}
.hint{margin-top:22px;font-size:14px;opacity:.85;animation:bl 1.8s infinite}@keyframes bl{50%{opacity:.35}}
#rd{position:fixed;inset:0;overflow-y:auto;opacity:0;pointer-events:none;transition:opacity 1s;padding:22px 0 40px;display:flex;flex-direction:column;align-items:center;gap:18px}
#rd.show{opacity:1;pointer-events:auto}
#rd img{width:min(92vw,560px);height:auto;border-radius:6px;box-shadow:0 24px 60px rgba(0,0,0,.55);transform:scale(.9) translateY(30px);transition:transform 1.1s cubic-bezier(.2,.8,.2,1)}
#rd.show img{transform:none}
#mu{position:fixed;top:14px;inset-inline-end:14px;width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;font-size:20px;display:none;z-index:9;backdrop-filter:blur(6px)}
</style></head><body>
<div id="st"><div class="env" id="env"><div class="l back"></div><div class="l slot"><div class="paper" id="pp"></div></div>
<div class="l pocket"><i class="a"></i><i class="b"></i><i class="c"></i></div>
<div class="flapw"><i class="o"></i><i class="n"></i></div><div class="seal">${E.glyph}</div>${to ? `<div class="to">${FOR[lang] || ''} ${to.replace(/[<>&"]/g, '')}</div>` : ''}</div>
<p class="hint">${UI[lang] || UI.en}</p></div>
<div id="rd">${imgs.map((s) => `<img alt="" src="${s}">`).join('')}</div>
<button id="mu" aria-label="music">🔊</button>${audioTag}
<script>
document.getElementById('pp').style.backgroundImage='url(${imgs[0]})';
${MUSIC_JS}
const M=Music('${mood}'),ua=document.getElementById('ua'),env=document.getElementById('env'),mu=document.getElementById('mu');let opened=false,playing=false;
function play(){ if(ua){ua.play().catch(()=>{});playing=true}else{playing=M.toggle()||false; if(!playing)M.start(),playing=true} }
env.addEventListener('click',()=>{ if(opened)return; opened=true; env.classList.add('open'); setTimeout(()=>env.classList.add('open2'),350);
  ${mood === 'none' && !audioFile && !audioData ? '' : 'play(); mu.style.display="block";'}
  setTimeout(()=>{document.getElementById('st').style.opacity=0;document.getElementById('st').style.transform='translateY(40px) scale(.9)'},1500);
  setTimeout(()=>{document.getElementById('rd').classList.add('show');document.getElementById('st').style.display='none'},2200); });
mu.onclick=()=>{ if(ua){ua.paused?ua.play():ua.pause();mu.textContent=ua.paused?'🔇':'🔊'} else {const on=M.toggle();mu.textContent=on?'🔊':'🔇'} };
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ua?ua.pause():M.stop()} });
</script></body></html>`;
}

const HINT = { fa: 'فایل را باز کنید و روی پاکت بزنید', en: 'Open the file and tap the envelope', ar: 'افتح الملف واضغط على المغلف', tr: 'Dosyayı açın ve zarfa dokunun', ru: 'Откройте файл и нажмите на конверт', fr: 'Ouvrez le fichier et touchez l’enveloppe', de: 'Datei öffnen und auf den Umschlag tippen' };
export const SHARE_TEXT = { fa: '✉️ یک کارت ویژه برای شما 🎶\nفایل پیوست را باز کنید و روی پاکت بزنید.', en: '✉️ A special card for you 🎶\nOpen the attached file and tap the envelope.', ar: '✉️ بطاقة خاصة لك 🎶\nافتح الملف المرفق واضغط على المغلف.', tr: '✉️ Size özel bir kart 🎶\nEkteki dosyayı açın ve zarfa dokunun.', ru: '✉️ Особая открытка для вас 🎶\nОткройте вложенный файл и нажмите на конверт.', fr: '✉️ Une carte spéciale pour vous 🎶\nOuvrez le fichier joint et touchez l’enveloppe.', de: '✉️ Eine besondere Karte für Sie 🎶\nÖffnen Sie die Datei und tippen Sie auf den Umschlag.' };
// A pretty preview picture (closed envelope + title) shown in chat apps next to the .html file.
export async function buildCover(card, { envelope = 'auto', to = '', lang = card.lang, title = '' } = {}) {
  const pal = card.pal || PALETTES.gold; let E = ENVELOPES[envelope] || ENVELOPES.classic;
  if (envelope === 'auto') E = { body: pal.s || '#f4ead0', flap: pal.a2 || '#e5d3a0', liner: pal.l || '#fff', seal: pal.a || '#c9a24a', ink: '#fff', glyph: '✦' };
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), dark = pal.d || '#14213d', rtl = ['fa', 'ar'].includes(lang);
  const bg = g.createRadialGradient(W / 2, H * 0.38, 80, W / 2, H * 0.45, H * 0.85); bg.addColorStop(0, dark + 'ee'); bg.addColorStop(1, '#000'); g.fillStyle = dark; g.fillRect(0, 0, W, H); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 60; i++) { const x = (i * 337) % W, y = (i * 211) % (H * 0.5), r = 1 + (i % 3); g.globalAlpha = 0.15 + (i % 5) * 0.08; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } g.globalAlpha = 1;
  const ew = 820, eh = 548, ex = (W - ew) / 2, ey = 480;
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 50; g.shadowOffsetY = 28; g.fillStyle = E.liner; g.beginPath(); g.roundRect(ex, ey, ew, eh, 12); g.fill(); g.restore();
  const tri = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach((p) => g.lineTo(...p)); g.closePath(); g.fill(); };
  tri([[ex, ey], [ex + ew * 0.52, ey + eh * 0.52], [ex, ey + eh]], E.body); tri([[ex + ew, ey], [ex + ew * 0.48, ey + eh * 0.52], [ex + ew, ey + eh]], E.body);
  tri([[ex, ey + eh], [ex + ew / 2, ey + eh * 0.46], [ex + ew, ey + eh]], E.body); g.fillStyle = 'rgba(0,0,0,.06)'; tri([[ex, ey + eh], [ex + ew / 2, ey + eh * 0.46], [ex + ew, ey + eh]], 'rgba(255,255,255,.12)');
  tri([[ex, ey], [ex + ew, ey], [ex + ew / 2, ey + eh * 0.56]], E.flap);
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + ew / 2, ey + eh * 0.56); g.lineTo(ex + ew, ey); g.stroke();
  const sx = W / 2, sy = ey + eh * 0.56, sr = 62, sg = g.createRadialGradient(sx - 20, sy - 22, 6, sx, sy, sr); sg.addColorStop(0, '#fff6'); sg.addColorStop(0.25, E.seal); sg.addColorStop(1, E.seal);
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 16; g.shadowOffsetY = 6; g.fillStyle = E.seal; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill(); g.restore(); g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, sr, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 4; g.beginPath(); g.arc(sx, sy, sr - 8, 0, 7); g.stroke(); g.fillStyle = E.ink || '#fff'; g.font = '56px "Vazirmatn", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(E.glyph, sx, sy + 3);
  g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const fam = '"Vazirmatn","Montserrat","Noto Naskh Arabic",sans-serif', head = (title || card.data?.title || card.name || occName(occById[card.occasion], lang) || '').slice(0, 40);
  g.fillStyle = '#fff'; g.font = `800 76px ${fam}`; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14; g.fillText(head, W / 2, 250, W - 140);
  if (to) { g.font = `600 44px ${fam}`; g.fillStyle = pal.a2 || '#f4d36f'; g.fillText(`${FOR[lang] || ''} ${to}`.trim(), W / 2, 330, W - 160); }
  g.shadowBlur = 0; g.font = `500 40px ${fam}`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(HINT[lang] || HINT.en, W / 2, ey + eh + 110, W - 120);
  g.font = '54px "Vazirmatn",sans-serif'; g.fillText('🎶', W / 2, ey + eh + 190);
  return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
}
