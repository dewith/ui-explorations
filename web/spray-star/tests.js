import {renderPaint,recipe} from './paint.js';
import {approvedPreset} from './preset.js';

export function runChecks(){
  const results=[];
  const check=(name,ok)=>{results.push(`${ok?'PASS':'FAIL'} · ${name}`);if(!ok)console.error(name);};
  function draw(size,options={}){
    const c=document.createElement('canvas');renderPaint(c,size,{dpr:2,...options});
    return {c,data:c.getContext('2d').getImageData(0,0,c.width,c.height).data};
  }
  function hash(data){let h=2166136261;for(let i=0;i<data.length;i++)h=Math.imul(h^data[i],16777619);return h>>>0;}
  for(const size of [24,32,48,64,96,144,360]){
    const {c,data}=draw(size,{softness:1,spray:1,grain:1,core:1,coreBlur:1.8});let pigment=0,border=0,partial=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const a=data[(y*c.width+x)*4+3];pigment+=a>0;partial+=a>0&&a<250;
      if(!x||!y||x===c.width-1||y===c.height-1)border+=a;
    }
    check(`${size}px: visible pigment, soft alpha, unclipped halo`,pigment>size*size*.25&&partial>size&&border===0);
    check(`${size}px: bounded optical recipe`,recipe(size).blur<size*.03);
  }
  check('Approved preset matches the captured study',
    approvedPreset.finish==='airbrush'&&approvedPreset.softness===2.6&&
    approvedPreset.spray===1.25&&approvedPreset.grain===1.1&&
    approvedPreset.core===1&&approvedPreset.coreBlur===2.6&&approvedPreset.backdrop==='dark');
  const a=draw(96),b=draw(96),c=draw(96,{seed:213}),d=draw(96,{grain:0});
  check('Repeatable seeded render',hash(a.data)===hash(b.data));
  check('Reseeding changes paint',hash(a.data)!==hash(c.data));
  check('Dodge grain changes pigment',hash(a.data)!==hash(d.data));
  check('Dodge grain never punches alpha holes',a.data.every((v,i)=>i%4!==3||v===d.data[i]));
  check('Airbrush and earlier finish differ',hash(a.data)!==hash(draw(96,{finish:'scatter'}).data));
  check('Core size changes the internal color field',hash(a.data)!==hash(draw(96,{core:.6}).data));
  check('Core blur changes the internal color field',hash(a.data)!==hash(draw(96,{coreBlur:2}).data));
  check('Transparent PNG encoding',a.c.toDataURL('image/png').startsWith('data:image/png;base64,iVBOR'));
  const panel=document.createElement('pre');panel.id='testResults';panel.textContent=results.join('\n');
  panel.style.cssText='padding:20px;color:#a7edc0;white-space:pre-wrap;font:12px monospace';
  document.querySelector('main').append(panel);
}
