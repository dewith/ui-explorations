import {renderPaint,recipe} from './paint.js';
import {approvedPreset} from './preset.js';
const $=id=>document.getElementById(id);
const state={...approvedPreset};
const sizes=[144,96,64,48,32,24];
const items=sizes.map(size=>{
  const f=document.createElement('figure');f.className='sample';f.style.minWidth=`${size+20}px`;
  const well=document.createElement('div');well.className='well';
  const c=document.createElement('canvas');c.style.width=`${size}px`;c.style.height=`${size}px`;
  c.setAttribute('aria-label',`${size} pixel independently tuned spray star`);
  well.append(c);const caption=document.createElement('figcaption');caption.textContent=`${size} px`;
  const detail=document.createElement('small');detail.textContent=`σ ${recipe(size).blur.toFixed(2)}`;
  caption.append(detail);f.append(well,caption);$('sizeGrid').append(f);return{size,canvas:c};
});
let queued=false;
function render(){
  const start=performance.now(),size=Math.min(window.innerWidth<=740?310:360,Math.floor($('stage').clientWidth-24));
  $('hero').style.width=`${size}px`;$('hero').style.height=`${size}px`;
  $('composition').style.width=`${size}px`;$('composition').style.height=`${size}px`;
  renderPaint($('hero'),size,state);
  for(const item of items)renderPaint(item.canvas,item.size,state);
  $('renderInfo').textContent=`${size} px · ${Math.round(performance.now()-start)} ms`;
  $('seedLabel').textContent=`SEED ${state.seed}`;
  for(const key of ['softness','spray','grain','core','coreBlur'])$(key+'Value').textContent=`${state[key].toFixed(2)}×`;
  queued=false;
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(render);}}
for(const key of ['softness','spray','grain','core','coreBlur'])$(key).addEventListener('input',e=>{state[key]=Number(e.target.value);schedule();});
$('reseed').onclick=()=>{state.seed=Math.floor(Math.random()*100000);schedule();};
$('reset').onclick=()=>{Object.assign(state,approvedPreset);$('finish').value=state.finish;$('backdrop').value=state.backdrop;for(const k of ['softness','spray','grain','core','coreBlur'])$(k).value=state[k];applyBackdrop(state.backdrop);schedule();};
$('finish').onchange=e=>{state.finish=e.target.value;schedule();};
function applyBackdrop(value){state.backdrop=value;for(const el of [$('stage'),...document.querySelectorAll('.well')]){el.classList.remove('checker','black','paper');if(value!=='dark')el.classList.add({checker:'checker',black:'black',light:'paper'}[value]);}}
$('backdrop').onchange=e=>applyBackdrop(e.target.value);
$('export').onclick=()=>{const c=document.createElement('canvas');renderPaint(c,360,{...state,dpr:3});c.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cendero-spray-${state.seed}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});};
window.addEventListener('resize',schedule);
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{
  const mode=button.dataset.mode;
  $('comparisonLabel').textContent={paint:'JavaScript rendering',reference:'Original Figma layers',split:'JavaScript ←  |  → Figma'}[mode];
  for(const peer of document.querySelectorAll('[data-mode]'))peer.setAttribute('aria-pressed',String(peer===button));
  $('hero').hidden=mode==='reference';$('referenceHero').hidden=mode==='paint';$('divider').hidden=mode!=='split';
  $('hero').style.clipPath=mode==='split'?'inset(0 50% 0 0)':'none';
  $('referenceHero').style.clipPath=mode==='split'?'inset(0 0 0 50%)':'none';
};
$('finish').value=state.finish;$('backdrop').value=state.backdrop;for(const k of ['softness','spray','grain','core','coreBlur'])$(k).value=state[k];
render();
if(new URLSearchParams(location.search).has('test'))import('./tests.js?v=approved-preset').then(m=>m.runChecks());
