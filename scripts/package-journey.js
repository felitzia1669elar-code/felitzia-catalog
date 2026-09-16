(() => {
 const section = document.querySelector('.package-journey');
 if (!section) return;
 const frame = section.querySelector('.package-frame');
 const copy = section.querySelector('.copy');
 const stage = section.querySelector('.package-stage');
 const canvas = section.querySelector('canvas');
 const ctx = canvas.getContext('2d');
 const count = 203, images = [];
 let wanted = 0;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clamp = x => Math.max(0,Math.min(1,x));
 function draw() {
  if (images[wanted]?.complete && images[wanted].naturalWidth) ctx.drawImage(images[wanted],0,0,1024,768);
 }
 function update() {
  const nav = document.querySelector('.site-nav').getBoundingClientRect().height;
  section.style.setProperty('--package-nav', `${nav}px`);
  const rect = section.getBoundingClientRect();
  const p = reduced ? 0 : clamp((nav-rect.top)/(section.offsetHeight-(innerHeight-nav)));
  const expand = clamp(p/.16);
  frame.style.transform = 'none';
  const base = frame.getBoundingClientRect();
  const view = stage.getBoundingClientRect();
  const full = Math.min(innerWidth-24,view.height*4/3);
  const scale = 1+(full/base.width-1)*expand;
  const dx = (innerWidth/2-(base.left+base.width/2))*expand;
  const dy = (view.top+view.height/2-(base.top+base.height/2))*expand;
  frame.style.transform = `translate(${dx}px,${dy}px) scale(${scale})`;
  frame.style.borderRadius = `${24*(1-expand)}px`;
  copy.style.opacity = `${1-clamp(p/.1)}`;
  copy.style.visibility = p >= .1 ? 'hidden' : 'visible';
  wanted = Math.round(clamp((p-.16)/.78)*(count-1));
  draw();
 }
 for(let i=0;i<count;i++) {
  const image=new Image(); images.push(image); image.onload=draw;
  image.src=`../assets/package-journey/frame-${String(i+1).padStart(3,'0')}.jpg`;
 }
 let scheduled=false;
 addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;update();});}},{passive:true});
 addEventListener('resize',update);
 update();
})();
