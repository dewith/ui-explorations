import { silhouette } from './silhouette.js';
import { approvedPreset } from './preset.js';

const paths = silhouette.map(d => new Path2D(d));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); };
function hash(x, y, seed) {
  let h = Math.imul(x ^ seed, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, seed) {
  const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
  const u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy);
  return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),u),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v);
}
function fbm(x,y,s) {
  return (noise(x,y,s)*.57 + noise(x*2.03,y*2.03,s+31)*.29 + noise(x*4.07,y*4.07,s+77)*.14);
}
function canvas(w,h) { const c=document.createElement('canvas'); c.width=w;c.height=h;return c; }

/** Values are CSS-point optical recipes, not a uniformly scaled hero filter.
 * Small stars keep narrower softness, denser pigment, and finer grain.
 * All point-unit values become device pixels exactly once during rendering.
 */
export function recipe(size) {
  const stops=[
    [24,.40,2.5,.28,.16], [32,.50,3.5,.30,.19], [48,.72,5.8,.32,.22],
    [64,.94,8.5,.35,.25], [96,1.35,14,.38,.28],
    [144,2.1,24,.40,.31], [360,5.5,64,.42,.36], [600,9,108,.44,.38]
  ];
  let a=stops[0],b=stops.at(-1);
  for(let i=1;i<stops.length;i++)if(size<=stops[i][0]){a=stops[i-1];b=stops[i];break;}
  const t=clamp((size-a[0])/(b[0]-a[0]));
  return {blur:mix(a[1],b[1],t),throw:mix(a[2],b[2],t),grainPitch:mix(a[3],b[3],t),dodge:mix(a[4],b[4],t)};
}

export function renderPaint(target, size, options={}) {
  const {seed,softness,spray,grain,core,coreBlur,finish,dpr=window.devicePixelRatio||1}={...approvedPreset,...options};
  // Oversample even on 1× displays: aerosol must read as fine pigment, not
  // one-CSS-pixel confetti. The optical recipe still uses the displayed size.
  const scale=Math.min(3,Math.max(2,dpr)), n=Math.round(size*scale), p=recipe(size);
  target.width=n;target.height=n;
  const mask=canvas(n,n), m=mask.getContext('2d',{willReadFrequently:true});
  // Preserve the reference's authored, asymmetric contour and halo margins.
  m.scale(n/642.486,n/642.486);m.translate(0,(642.486-597.737)/2);
  m.fillStyle='#fff';for(const path of paths)m.fill(path);
  const blurred=canvas(n,n), b=blurred.getContext('2d',{willReadFrequently:true});
  b.filter=`blur(${p.blur*softness*scale}px)`;b.drawImage(mask,0,0);
  const alpha=b.getImageData(0,0,n,n).data;
  function blurredMask(radius){
    const layer=canvas(n,n),c=layer.getContext('2d',{willReadFrequently:true});
    c.filter=`blur(${radius*scale}px)`;c.drawImage(mask,0,0);
    return c.getImageData(0,0,n,n).data;
  }
  const wet=finish==='airbrush'?blurredMask(p.blur*softness*.72):alpha;
  const bleed=finish==='airbrush'?blurredMask(p.blur*softness*1.85):alpha;
  // Red pigment is a second, smaller impression of the authored silhouette.
  // Its blur is independent from the outer pink paint, so the transition
  // follows the arms instead of expanding as a circular radial glow.
  const coreLayer=canvas(n,n),coreContext=coreLayer.getContext('2d',{willReadFrequently:true});
  const coreScale=clamp(.62*core,.28,.9);
  coreContext.filter=`blur(${p.blur*coreBlur*.95*scale}px)`;
  coreContext.translate(n/2,n/2);coreContext.scale(coreScale,coreScale);
  coreContext.drawImage(mask,-n/2,-n/2);
  const coreAlpha=coreContext.getImageData(0,0,n,n).data;
  function sample(x,y,pixels=alpha) {
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    if(ix<0||iy<0||ix>=n-1||iy>=n-1)return 0;
    const k=(iy*n+ix)*4+3;
    return mix(mix(pixels[k],pixels[k+4],fx),mix(pixels[k+n*4],pixels[k+n*4+4],fx),fy)/255;
  }
  const ctx=target.getContext('2d'), out=ctx.createImageData(n,n), data=out.data;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
    const px=x/scale,py=y/scale,u=x/n,v=y/n;
    // Paint atomization: high-frequency displacement across a softly blurred mask.
    const nx=fbm(px*1.04,py*1.04,seed),ny=fbm(px*1.04,py*1.04,seed+101);
    const r=hash(x,y,seed+932), k=(y*n+x)*4;
    let opacity;
    if(finish==='airbrush'){
      // react-port/Headline.jsx: grainy bleed behind a displaced pigment core.
      // Keep the nozzle jitter separate from the broad feathered overspray.
      const dx=(nx-.5)*p.throw*spray*scale*.28,dy=(ny-.5)*p.throw*spray*scale*.28;
      const pigment=sample(x+dx,y+dy,wet);
      const halo=sample(x+dx*.35,y+dy*.35,bleed);
      const stencil=clamp(fbm(px*1.5,py*1.5,seed+309)*5-1.5);
      const mist=halo*stencil*(.2+.8*r)*Math.min(1,spray*.78);
      // Source-over keeps opaque paint intact; only its halo is atomized.
      opacity=pigment+mist*(1-pigment);
    }else{
      const a=sample(x+(nx-.5)*p.throw*spray*scale,y+(ny-.5)*p.throw*spray*scale);
      if(a<.002)continue;
      const probability=mix(Math.pow(a,.62),1,smooth(.65,.96,a));
      if(r>probability)continue;
      opacity=clamp(a/Math.max(.02,probability))*mix(mix(.8,1,hash(x,y,seed+53)),1,smooth(.6,.98,a));
    }
    if(opacity<.002)continue;
    const cloud=fbm(u*5.2,v*5.2,seed+400);
    const coreInk=sample(x,y,coreAlpha);
    const hot=clamp(Math.pow(coreInk,.76)+(cloud-.5)*.028*coreInk);
    // Magenta aerosol over a smaller vermilion star impression.
    const edge=[255,0,215],center=[255,15,16];
    let red=mix(edge[0],center[0],hot), green=mix(edge[1],center[1],hot), blue=mix(edge[2],center[2],hot);
    const shadow=1-.08*smooth(.4,.8,cloud)*(1-hot*.7);
    red*=shadow;green*=shadow;blue*=shadow;
    // Fine COLOR_DODGE grains in pigment, not a transparency-hole overlay.
    const g=hash(Math.floor(px/p.grainPitch),Math.floor(py/p.grainPitch),seed+211);
    // Rare luminous deposits, rather than a uniform brightness/noise wash.
    // Smaller recipes cap the dodge strength to avoid sparkling at icon scale.
    const dodge=finish==='airbrush'
      ? clamp(Math.pow(g,9)*Math.min(.95,p.dodge*2.7)*grain,0,.96)
      : Math.pow(g,3.5)*p.dodge*grain;
    red=clamp(red/255/(1-dodge))*255;
    green=clamp((green/255+.04*grain*Math.pow(g,6))/(1-dodge*.9))*255;
    blue=clamp(blue/255/(1-dodge*.82))*255;
    const tooth=1-(1-g)*.035*grain;
    data[k]=red*tooth;data[k+1]=green*tooth;data[k+2]=blue*tooth;data[k+3]=opacity*255;
  }
  ctx.putImageData(out,0,0);
  return p;
}
