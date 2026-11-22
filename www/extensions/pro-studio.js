import { h, ic, toast, field, clear } from 'cs:js/ui/dom.js';
import { register, go, topbar } from 'cs:js/ui/router.js';
import { Settings, listCards, getCard, saveCard, listEvents } from 'cs:js/core/storage.js';
import { OCCASIONS, occById, occName } from 'cs:js/data/occasions.js';
import { FONTS } from 'cs:js/data/fonts.js';
import { STYLES, STYLE_IDS } from 'cs:js/templates/styles.js';
import { cardFromTemplate } from 'cs:js/templates/registry.js';
import { suggestDesigns, aiText, COLOR_CHOICES, COLOR_NAMES } from 'cs:js/logic/suggest.js';
import { stats } from 'cs:js/logic/guests.js';
import { buildScene, Player } from 'cs:js/gfx/anim.js';
import { videoSupport } from 'cs:js/io/gif.js';
import { saveToDevice } from 'cs:js/io/native.js';
import { hasPaymentProvider } from 'cs:js/core/entitlements.js';

const L = (fa,en) => Settings.get('uiLang') === 'en' ? en : fa;
const lang = () => Settings.get('cardLang') || 'fa';
const opt = (v,label,selected) => h('option',{value:v,selected:!!selected},label);
const readData = file => new Promise((resolve,reject) => {
  const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(file);
});
const assetUrl = src => src ? (/^(data:|https?:)/.test(src) ? src : new URL(src.replace(/^\.\//,''),document.baseURI).href) : '';
const cardChoices = (cards,selected) => [opt('',L('— انتخاب کارت —','— Choose a card —'),!selected),...cards.map(c=>opt(c.id,c.name||c.id,c.id===selected))];

function parseBrief(value) {
  const p = String(value||'').toLowerCase();
  const rules = [
    ['wedding',/عروسی|ازدواج|wedding|marriage|زفاف/],['birthday',/تولد|birthday|ميلاد/],
    ['engagement',/نامزدی|خواستگاری|engagement|خطوبة/],['anniversary',/سالگرد|anniversary|ذكرى/],
    ['newYear',/نوروز|سال نو|new year|nowruz/],['ramadan',/رمضان|ramadan/],
    ['eidFitr',/عید فطر|eid al.?fitr/],['condolence',/تسلیت|سوگواری|condolence|تعزية/],
    ['graduation',/فارغ.?التحصیل|graduation|تخرج/],['babyShower',/نوزاد|baby shower|مولود/]
  ];
  const colors=[['gold',/طلایی|gold|ذهبي/],['rose',/رزگلد|صورتی|rose gold|pink/],['emerald',/زمردی|سبز|emerald|green/],['navy',/سرمه.?ای|مشکی|سیاه|black|navy/],['sky',/آبی|blue/],['violet',/بنفش|purple|violet/],['mono',/مینیمال|ساده|خاکستری|minimal|monochrome/]];
  const styles=[['royal',/سلطنتی|royal|regal/],['minimal',/مینیمال|minimal|ساده/],['floral',/گلدار|گل|floral|flowers/],['classic',/کلاسیک|classic/],['blackgold',/مشکی.*طلایی|طلایی.*مشکی|black.*gold|gold.*black/],['romantic',/عاشقانه|romantic/]];
  return {occ:(rules.find(x=>x[1].test(p))||[])[0]||'wedding',color:(colors.find(x=>x[1].test(p))||[])[0]||'',style:(styles.find(x=>x[1].test(p))||[])[0]||''};
}
let catalogPromise;
async function musicCatalog() {
  if (!catalogPromise) catalogPromise=fetch(new URL('audio/library.json',document.baseURI).href,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('library missing');return r.json();}).then(x=>Array.isArray(x)?x:[]);
  return catalogPromise;
}
async function loadCustomFonts() {
  const fonts=await Settings.get('customFonts')||[];
  for(const f of fonts){try{const face=new FontFace(f.family,'url("'+f.data+'")');await face.load();document.fonts.add(face);}catch(e){console.warn('font skipped',f.family);}}
}
loadCustomFonts().catch(()=>{});

register('prostudio',async()=>{
  const cards=await listCards();
  let tab='smart',previewAudio=null,player=null,playerAudio=null,card=null;
  const panel=h('div'),tabs=[['smart',L('طراح هوشمند','Smart designer')],['music',L('موسیقی','Music')],['timeline',L('تایم‌لاین','Timeline')],['fonts',L('فونت‌ها','Fonts')],['guests',L('مهمانان','Guests')],['store',L('فروشگاه','Shop')]];
  const bar=h('div',{class:'seg'},tabs.map(([id,label])=>h('button',{class:id===tab?'on':'',onclick:()=>{tab=id;renderTabs();render();}},label)));
  const renderTabs=()=>[...bar.children].forEach((b,i)=>b.classList.toggle('on',tabs[i][0]===tab));
  const closeAudio=()=>{if(previewAudio){previewAudio.pause();previewAudio.src='';previewAudio=null;}if(player){player.stop();player=null;}if(playerAudio){playerAudio.pause();playerAudio=null;}};
  const root=h('div',{class:'view'},topbar(L('کارگاه حرفه‌ای CardStudio','CardStudio Pro Studio')),h('div',{class:'scroll'},
    h('div',{class:'pro-hero'},h('b',null,L('از ایده تا دعوت‌نامه قابل ارسال','From idea to a shareable invitation')),h('p',null,L('طراحی پیشنهادی، موسیقی اختصاصی، تنظیم حرکت لایه‌ها و آمار مهمانان.','Design ideas, soundtrack, layer animation and guest analytics.'))),
    bar,panel));
  function render(){clear(panel);closeAudio();if(tab==='smart')smart();else if(tab==='music')music();else if(tab==='timeline')timeline();else if(tab==='fonts')fonts();else if(tab==='guests')guests();else shop();}

  function smart(){
    const prompt=h('textarea',{class:'input',rows:4,dir:'auto',placeholder:L('مثلاً: کارت عروسی طلایی و مشکی، لوکس و مینیمال می‌خواهم.','Example: a luxurious minimal black-and-gold wedding invitation.')});
    const occasion=h('select',{class:'input'},OCCASIONS.map(o=>opt(o.id,occName(o,lang()),o.id==='wedding')));
    const color=h('select',{class:'input'},COLOR_CHOICES.map(([id])=>opt(id,id?(COLOR_NAMES[id]?.[Settings.get('uiLang')==='en'?1:0]||id):L('خودکار','Automatic'),!id)));
    const style=h('select',{class:'input'},[opt('',L('خودکار','Automatic'),true),...STYLE_IDS.map(id=>opt(id,STYLES[id].n[Settings.get('uiLang')==='en'?1:0]||id,false))]);
    const output=h('div');
    const generate=async()=>{
      const brief=prompt.value.trim();if(!brief)return toast(L('ابتدا توضیح طرح را بنویسید.','Describe the design first.'));
      const p=parseBrief(brief);if(occById[p.occ])occasion.value=p.occ;if(p.color)color.value=p.color;if(p.style&&STYLE_IDS.includes(p.style))style.value=p.style;
      clear(output);
      let note=L('پیشنهاد آفلاین بر اساس مناسبت، رنگ و سبک انتخاب شد.','Offline design suggestions were matched to the occasion, colour and style.');
      if(Settings.get('aiEndpoint')&&Settings.get('aiKey')){
        try{note=await aiText({endpoint:Settings.get('aiEndpoint'),key:Settings.get('aiKey'),model:Settings.get('aiModel')||'gpt-4o-mini',prompt:L('یک راهنمای طراحی کوتاه و کاربردی به فارسی برای این کارت بنویس: ','Write a concise practical art direction for this invitation: ')+brief);}
        catch(e){note=L('هوش مصنوعی آنلاین در دسترس نبود؛ پیشنهادهای آفلاین آماده شدند.','Online AI was unavailable; offline suggestions are ready.');}
      }
      const designs=suggestDesigns({occ:occasion.value,lang:lang(),colorPref:color.value,stylePref:style.value,n:8,seed:brief});
      output.append(h('div',{class:'pro-box'},h('b',null,L('راهنمای طراحی','Design direction')),h('p',{class:'pro-muted'},note)));
      const grid=h('div',{class:'pro-grid'});
      for(const d of designs){
        const title=STYLES[d.style]?.n?.[Settings.get('uiLang')==='en'?1:0]||d.style;
        grid.append(h('button',{class:'pro-result',onclick:()=>{const c=cardFromTemplate(d.id,{lang:lang()});c.name=brief.slice(0,50);go('form',{card:c,isNew:true});}},
          h('div',{class:'swatch',style:{background:'linear-gradient(135deg,'+d.colors.a+','+d.colors.a2+','+d.colors.d+')'}}),
          h('b',null,title),h('small',null,(d.fonts||[]).join(' · ')||d.palette),h('p',{class:'pro-muted'},L('استفاده از این طرح ←','Use this design →'))));
      }
      output.append(grid);
    };
    panel.append(h('div',{class:'pro-box'},h('h3',null,L('طراح هوشمند','Smart designer')),
      field(L('توضیح طرح دلخواه','Design brief'),prompt),field(L('مناسبت','Occasion'),occasion),
      h('div',{class:'row'},h('div',{class:'grow'},field(L('رنگ','Colour'),color)),h('div',{class:'grow'},field(L('سبک','Style'),style))),
      h('button',{class:'btn primary block',onclick:generate},ic('wand',15),L('ساخت چند پیشنهاد','Generate design ideas')),
      h('p',{class:'pro-muted'},L('پیشنهاد آفلاین همیشه فعال است. برای تحلیل آنلاین، کلید API خودتان را در تنظیمات وارد کنید.','Offline suggestions are always available. Add your own API key in Settings for online analysis.'))),output);
  }

  async function music(){
    const cardSel=h('select',{class:'input'},cardChoices(cards,cards[0]?.id));
    const mood=h('select',{class:'input'},[opt('',L('همه دسته‌ها','All moods'),true),...['wedding','love','birthday','calm','condolence','religious','madahi','mahdavi'].map(v=>opt(v,v,false))]);
    const start=h('input',{class:'pro-range',type:'range',min:0,max:120,step:1,value:0});
    const volume=h('input',{class:'pro-range',type:'range',min:0,max:100,step:1,value:70});
    const list=h('div'),status=h('p',{class:'pro-muted'},L('در حال خواندن فهرست موسیقی...','Loading music catalogue...'));
    let tracks=[],chosen=null;
    const play=src=>{if(previewAudio)previewAudio.pause();previewAudio=new Audio(assetUrl(src));previewAudio.volume=Number(volume.value)/100;previewAudio.addEventListener('loadedmetadata',()=>{try{previewAudio.currentTime=Number(start.value);}catch{}},{once:true});previewAudio.play().catch(()=>toast(L('برای پخش دوباره دکمه پخش را بزنید.','Tap play again to start audio.')));};
    const renderTracks=()=>{
      clear(list);const filtered=tracks.filter(t=>!mood.value||t.mood===mood.value);
      if(!filtered.length)list.append(h('p',{class:'pro-muted'},L('آهنگی در این دسته پیدا نشد.','No tracks found in this mood.')));
      for(const tr of filtered){
        const src=assetUrl(tr.src);
        list.append(h('div',{class:'pro-track'},h('div',{class:'grow'},h('b',null,(tr.icon||'♫')+' '+tr.title),h('small',null,(tr.moodLabel||tr.mood||'')+' · '+(tr.license||''))),
          h('button',{class:'btn small',onclick:()=>play(src)},ic('play',13),L('پخش','Play')),
          h('button',{class:'btn small primary',onclick:()=>{chosen={...tr};toast(L('آهنگ انتخاب شد. حالا آن را برای کارت ذخیره کنید.','Track selected. Save it to your card.'));}},L('انتخاب','Select'))));
      }
    };
    const save=async()=>{
      if(!cardSel.value||!chosen)return toast(L('کارت و آهنگ را انتخاب کنید.','Choose a card and track.'));
      const c=await getCard(cardSel.value);if(!c)return;c.fx||={};c.fx.musicName=chosen.title;c.fx.musicSrc=chosen.src;c.fx.musicData='';c.fx.musicStart=Number(start.value);c.fx.musicVolume=Number(volume.value)/100;
      await saveCard(c);toast(L('موسیقی و زمان شروع و بلندی صدا ذخیره شد.','Music, start time and volume saved.'));
    };
    panel.append(h('div',{class:'pro-box'},h('h3',null,L('کتابخانه موسیقی آماده','Ready music library')),
      field(L('کارت مقصد','Destination card'),cardSel),field(L('دسته‌بندی','Mood'),mood),status,list,
      field(L('زمان شروع موسیقی (ثانیه)','Music start time (seconds)'),start),field(L('بلندی صدا','Volume'),volume),
      h('div',{class:'row wrap'},h('button',{class:'btn primary',onclick:save},ic('save',14),L('ذخیره برای کارت','Save to card')),
        h('button',{class:'btn',onclick:()=>previewAudio?.pause()},ic('pause',14),L('توقف پخش','Stop preview')))),
      h('div',{class:'pro-box'},h('h3',null,L('انتخاب فایل از گوشی','Upload audio from phone')),
        h('p',{class:'pro-muted'},L('MP3 یا WAV تا ۸ مگابایت؛ فایل در حافظه خصوصی کارت ذخیره می‌شود.','MP3 or WAV up to 8 MB; the file is saved with the card locally.')),
        h('input',{class:'input',type:'file',accept:'.mp3,.wav,audio/mpeg,audio/wav',onchange:async e=>{
          const f=e.target.files?.[0];if(!f)return;if(!cardSel.value)return toast(L('ابتدا کارت مقصد را انتخاب کنید.','Choose a destination card first.'));
          if(f.size>8*1024*1024)return toast(L('حجم فایل باید کمتر از ۸ مگابایت باشد.','Audio file must be under 8 MB.'));
          if(!/\.(mp3|wav)$/i.test(f.name))return toast(L('فقط MP3 و WAV پشتیبانی می‌شود.','Only MP3 and WAV are supported.'));
          try{const data=await readData(f),c=await getCard(cardSel.value);c.fx||={};c.fx.musicName=f.name;c.fx.musicData=data;c.fx.musicSrc='';c.fx.musicStart=Number(start.value);c.fx.musicVolume=Number(volume.value)/100;await saveCard(c);chosen={title:f.name,src:data};play(data);toast(L('فایل موسیقی به کارت اضافه شد.','Audio added to the card.'));}
          catch(err){toast(err.message||String(err));}
        }})));
    mood.addEventListener('change',renderTracks);
    try{tracks=await musicCatalog();status.textContent=tracks.length?L(tracks.length+' آهنگ آماده با اطلاعات مجوز و منبع.',tracks.length+' tracks with licence and source details.'):L('فهرست آهنگ خالی است؛ فایل شخصی قابل انتخاب است.','Music list is empty; personal audio upload is available.');renderTracks();}
    catch(e){status.textContent=L('فهرست موسیقی هنوز در ساخت وب دریافت نشده است؛ از فایل شخصی استفاده کنید.','The music list has not been bundled yet; upload your own track.');}
  }

  function timeline(){
    const cardSel=h('select',{class:'input'},cardChoices(cards,cards[0]?.id));
    const canvas=h('canvas',{class:'pro-canvas',width:520,height:728});
    const layer=h('select',{class:'input'}),delay=h('input',{class:'pro-range',type:'range',min:0.1,max:8,step:0.1,value:1}),dur=h('input',{class:'pro-range',type:'range',min:0.2,max:4,step:0.1,value:0.9});
    const fx=h('select',{class:'input'},['none','fade','rise','drop','zoom','slideL','slideR','type','blur','spin','pop'].map(v=>opt(v,v,v==='rise')));
    const status=h('p',{class:'pro-muted'});let selectedCard=null,elements=[];
    const rebuild=play=>{if(!selectedCard)return;player?.stop();playerAudio?.pause();player=null;playerAudio=null;const scene=buildScene(selectedCard,0);player=new Player(canvas,scene,Math.min(0.55,520/selectedCard.pages[0].w));const src=selectedCard.fx?.musicData||selectedCard.fx?.musicSrc;if(src){playerAudio=new Audio(assetUrl(src));playerAudio.volume=Number(selectedCard.fx?.musicVolume??0.7);playerAudio.loop=true;player.setAudio(playerAudio);}status.textContent=L('مدت نهایی: ','Total duration: ')+scene.duration.toFixed(1)+'s';if(play){if(playerAudio)playerAudio.addEventListener('loadedmetadata',()=>{try{playerAudio.currentTime=Number(selectedCard.fx?.musicStart||0);}catch{}},{once:true});player.t=0;player.play();}};
    const load=async id=>{selectedCard=id?await getCard(id):null;elements=selectedCard?.pages?.[0]?.elements||[];layer.replaceChildren(...elements.map((e,i)=>opt(String(i),(e.name||e.type||'Layer')+' · '+(i+1),i===0)));sync();rebuild(false);};
    const sync=()=>{const e=elements[Number(layer.value)];if(!e)return;e.anim||={};delay.value=String(Math.max(0.1,Number(e.anim.delay||1)));dur.value=String(Number(e.anim.dur||0.9));fx.value=e.anim.in||'rise';};
    const save=async()=>{if(selectedCard){await saveCard(selectedCard);rebuild(false);}};
    layer.addEventListener('change',sync);
    delay.addEventListener('input',async()=>{const e=elements[Number(layer.value)];if(e){e.anim||={};e.anim.delay=Number(delay.value);await save();}});
    dur.addEventListener('input',async()=>{const e=elements[Number(layer.value)];if(e){e.anim||={};e.anim.dur=Number(dur.value);await save();}});
    fx.addEventListener('change',async()=>{const e=elements[Number(layer.value)];if(e){e.anim||={};e.anim.in=fx.value;await save();}});
    cardSel.addEventListener('change',()=>load(cardSel.value));
    const exportBtn=h('button',{class:'btn',onclick:async()=>{
      if(!selectedCard)return toast(L('کارت انتخاب نشده است.','No card selected.'));
      const support=videoSupport();if(!support)return toast(L('این مرورگر ضبط ویدئو را پشتیبانی نمی‌کند.','Video recording is not supported.'));
      const scene=buildScene(selectedCard,0),cv=document.createElement('canvas'),p=new Player(cv,scene,Math.min(0.55,520/selectedCard.pages[0].w)),stream=cv.captureStream(24);
      let audio=null,ac=null;
      const src=selectedCard.fx?.musicData||selectedCard.fx?.musicSrc;
      if(src){try{audio=new Audio(assetUrl(src));audio.loop=true;ac=new (window.AudioContext||window.webkitAudioContext)();const source=ac.createMediaElementSource(audio),gain=ac.createGain(),dest=ac.createMediaStreamDestination();gain.gain.value=Number(selectedCard.fx?.musicVolume??0.7);source.connect(gain);gain.connect(dest);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));await ac.resume();audio.addEventListener('loadedmetadata',()=>{try{audio.currentTime=Number(selectedCard.fx?.musicStart||0);}catch{}},{once:true});p.setAudio(audio);}catch(e){console.warn('Audio export fallback',e);}}
      const rec=new MediaRecorder(stream,{mimeType:support.mime,videoBitsPerSecond:1100000,audioBitsPerSecond:96000}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(r=>rec.onstop=r);rec.start(250);p.t=0;p.play();await new Promise(r=>setTimeout(r,scene.duration*1000+300));p.stop();rec.stop();await done;audio?.pause();ac?.close?.();const blob=new Blob(chunks,{type:support.mime.split(';')[0]});const name='CardStudio-invitation.'+support.ext;const result=await saveToDevice(blob,name);toast(result?.ok?L('ویدئوی کارت با تنظیمات موسیقی ذخیره شد.','Video with soundtrack saved.'):L('ذخیره ویدئو ناموفق بود.','Video save failed.'));
    }},ic('film',14),L('خروجی ویدئو','Export video'));
    panel.append(h('div',{class:'pro-box'},h('h3',null,L('تایم‌لاین انیمیشن لایه‌ها','Layer animation timeline')),
      field(L('کارت','Card'),cardSel),canvas,field(L('لایه','Layer'),layer),field(L('زمان شروع (ثانیه)','Start time (seconds)'),delay),field(L('مدت ورود (ثانیه)','Entrance duration (seconds)'),dur),field(L('افکت ورود','Entrance effect'),fx),status,
      h('div',{class:'row wrap'},h('button',{class:'btn primary',onclick:()=>rebuild(true)},ic('play',14),L('پیش‌نمایش زنده','Live preview')),h('button',{class:'btn',onclick:save},ic('save',14),L('ذخیره','Save')),exportBtn)));
    load(cards[0]?.id).catch(e=>toast(e.message||String(e)));
  }

  function fonts(){
    const cardSel=h('select',{class:'input'},cardChoices(cards,cards[0]?.id)),fontSel=h('select',{class:'input'});
    const scope=h('select',{class:'input'},[opt('all',L('همه نوشته‌های کارت','All text layers'),true),opt('first',L('اولین نوشته','First text layer'),false)]);
    const name=h('input',{class:'input',placeholder:L('نام فونت دلخواه','Custom font family name')}),list=h('div');
    let custom=[];
    const refreshFonts=async()=>{
      const script=(lang()==='fa'||lang()==='ar')?'arabic':'latin';
      const built=FONTS.filter(f=>f.scripts.includes(script));custom=await Settings.get('customFonts')||[];
      fontSel.replaceChildren(...built.map(f=>opt(f.family,f.label+' · '+f.family,false)),...custom.map(f=>opt(f.family,f.family+' · '+L('شخصی','Custom'),false)));
      clear(list);
      for(const f of custom)list.append(h('div',{class:'pro-track'},h('b',{class:'grow',style:{fontFamily:'"'+f.family+'"'}},f.family),h('button',{class:'btn small',onclick:async()=>{custom=custom.filter(x=>x.family!==f.family);await Settings.set('customFonts',custom);refreshFonts();}},L('حذف','Remove'))));
    };
    const apply=async()=>{if(!cardSel.value||!fontSel.value)return toast(L('کارت و فونت را انتخاب کنید.','Choose a card and font.'));const c=await getCard(cardSel.value);const all=(c.pages||[]).flatMap(p=>p.elements||[]).filter(e=>e.type==='text'),targets=scope.value==='first'?all.slice(0,1):all;targets.forEach(e=>e.font=fontSel.value);await saveCard(c);toast(L('فونت اعمال شد.','Font applied.'));};
    const upload=h('input',{class:'input',type:'file',accept:'.ttf,.otf,.woff,.woff2',onchange:async e=>{
      const f=e.target.files?.[0];if(!f)return;if(f.size>4*1024*1024)return toast(L('حجم فونت باید کمتر از ۴ مگابایت باشد.','Font must be under 4 MB.'));
      const family=name.value.trim()||f.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');try{const data=await readData(f),face=new FontFace(family,'url("'+data+'")');await face.load();document.fonts.add(face);custom=(await Settings.get('customFonts'))||[];custom=custom.filter(x=>x.family!==family);custom.push({family,fileName:f.name,data});await Settings.set('customFonts',custom);await refreshFonts();fontSel.value=family;toast(L('فونت اضافه شد.','Font added.'));}catch(err){toast(err.message||String(err));}
    }});
    panel.append(h('div',{class:'pro-box'},h('h3',null,L('کتابخانه فونت','Font library')),field(L('کارت','Card'),cardSel),field(L('فونت','Font'),fontSel),field(L('اعمال روی','Apply to'),scope),h('div',{style:{padding:'18px',background:'var(--card2)',textAlign:'center',fontSize:'22px',borderRadius:'12px',fontFamily:fontSel.value||'inherit'}},L('نمونه تایپوگرافی لوکس','Elegant typography')),h('button',{class:'btn primary block',onclick:apply},L('اعمال به کارت','Apply to card'))),
      h('div',{class:'pro-box'},h('h3',null,L('افزودن فونت دلخواه','Upload a custom font')),field(L('نام نمایشی','Display name'),name),upload,list));
    refreshFonts();
  }

  async function guests(){
    const events=await listEvents();
    if(!events.length){panel.append(h('div',{class:'empty'},h('p',null,L('رویدادی ثبت نشده است. از صفحه مهمانان یک رویداد بسازید.','No events yet. Create one in Guests.')),h('button',{class:'btn primary',onclick:()=>go('guests')},L('مدیریت مهمانان','Open guest manager'))));return;}
    const total=events.reduce((a,e)=>a+stats(e).total,0),yes=events.reduce((a,e)=>a+stats(e).confirmed,0),head=events.reduce((a,e)=>a+stats(e).headcount,0);
    panel.append(h('div',{class:'pro-box'},h('h3',null,L('آمار همه رویدادها','All events')),h('div',{class:'pro-stat'},
      h('div',null,h('b',null,total),h('small',null,L('دعوت‌شده','Invited'))),
      h('div',null,h('b',null,yes),h('small',null,L('تأیید حضور','Confirmed'))),
      h('div',null,h('b',null,head),h('small',null,L('با همراهان','Including guests'))))));
    for(const e of events){const s=stats(e);panel.append(h('button',{class:'pro-box',style:{width:'100%',textAlign:'start',color:'var(--text)'},onclick:()=>go('event',{id:e.id})},h('b',null,e.name||L('رویداد بدون نام','Untitled event')),h('p',{class:'pro-muted'},L('در انتظار: ','Pending: ')+s.invited+' · '+L('حاضر: ','Attending: ')+s.confirmed+' · '+L('رد شده: ','Declined: ')+s.declined)));}
    panel.append(h('button',{class:'btn primary block',onclick:()=>go('guests')},L('مدیریت مهمانان و پاسخ‌ها','Manage guests and replies')));
  }

  function shop(){
    panel.append(h('div',{class:'pro-box'},h('h3',null,L('فروشگاه قالب‌ها','Template shop')),
      h('p',{class:'pro-muted'},L('قالب‌های رایگان و ویژه در برنامه وجود دارند. سیستم قفل قالب‌های ویژه از قبل فعال است.','Free and premium templates already exist. Premium template locking is already available.')),
      h('p',{class:'pro-muted'},hasPaymentProvider()?L('درگاه پرداخت ثبت شده است؛ فروش باید از مسیر همان ارائه‌دهنده انجام شود.','A payment provider is registered; sales must use it.'):L('خرید واقعی هنوز فعال نیست و هیچ وجهی دریافت نمی‌شود. قبل از فروش، درگاه معتبر باید متصل و آزمایش شود.','Real purchases are not active and no payment is collected. A payment provider must be connected and tested before sales.')),
      h('button',{class:'btn primary block',onclick:()=>go('settings')},ic('settings',14),L('تنظیمات اشتراک','Plan settings')),
      h('button',{class:'btn block',onclick:()=>go('home')},ic('grid',14),L('مشاهده قالب‌ها','Browse templates')));
  }

  render();
  return {el:root,destroy:closeAudio};
});

function injectEntry(){
  const host=document.querySelector('#app');if(!host||host.dataset.proStudio==='yes')return;
  host.dataset.proStudio='yes';
  const observer=new MutationObserver(()=>{
    const hero=host.querySelector('.hero');if(!hero||hero.querySelector('[data-pro-studio]'))return;
    const b=document.createElement('button');b.className='tile';b.dataset.proStudio='yes';
    b.innerHTML='<span aria-hidden="true">✦</span><b>'+L('کارگاه حرفه‌ای','Pro studio')+'</b><small>'+L('موسیقی · تایم‌لاین · فونت · مهمان','Music · timeline · fonts · guests')+'</small>';
    b.addEventListener('click',()=>go('prostudio'));hero.append(b);
  });
  observer.observe(host,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectEntry,{once:true});else injectEntry();
window.addEventListener('load',injectEntry,{once:true});
