(() => {
  'use strict';
  const scene = document.querySelector('.scroll-scene');
  if (!scene) return;
  const film = scene.querySelector('video');
  const transition = scene.querySelector('.journey-transition-film');
  let transitionTarget = 0;
  let transitionReady = false;
  function seekTransition() {
    if (!transitionReady || transition.seeking || transition.readyState < 2) return;
    if (Math.abs(transition.currentTime - transitionTarget) > 1 / 30) transition.currentTime = transitionTarget;
  }
  const picture = scene.querySelector('.scroll-picture');
  const stage = scene.querySelector('.scroll-stage');
  const intro = scene.querySelector('.scroll-intro');
  const copy = scene.querySelector('.hero-copy');
  const exit = scene.querySelector('.scroll-exit');
  const controls = scene.querySelector('.scroll-controls');
  const progress = scene.querySelector('.scroll-progress');
  const nav = document.querySelector('.site-nav');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => value * value * (3 - 2 * value);
  let raf = 0, target = 0, enabled = false;
  let observer;

  // Serialize seeks: replacing a pending seek every wheel event can starve decoding.
  function seek() {
    if (!enabled || film.seeking || film.readyState < 2) return;
    if (Math.abs(film.currentTime - target) > 1 / 30) film.currentTime = target;
  }
  function render() {
    raf = 0;
    if (!enabled) return;
    const bounds = scene.getBoundingClientRect();
    document.body.classList.toggle('scene-active', bounds.bottom > innerHeight * .6 && bounds.top < innerHeight);
    const navHeight = nav.getBoundingClientRect().height;
    const distance = Math.max(1, scene.offsetHeight - stage.offsetHeight);
    const p = clamp((navHeight - bounds.top) / distance);
    // Wide screens keep the complete square portrait until the cosmic frames.
    // Narrow screens retain their existing framing and timeline.
    const wide = matchMedia('(min-width: 1000px)').matches;
    const entry = clamp(p / .55);
    target = (wide ? clamp(entry / .80) : clamp((entry - .18) / .62)) * Math.max(0, film.duration - .05);
    const enter = wide
      ? ease(clamp((Math.min(target, film.currentTime) - 5) / 1.5))
      : ease(clamp(entry / .22));
    const width = stage.clientWidth, height = stage.clientHeight;
    const startWidth = Math.min(1040, width - 44, wide ? height - 92 : Infinity);
    const startHeight = wide ? startWidth : height - 92;
    picture.style.setProperty('--picture-width', `${startWidth + (width + 2 - startWidth) * enter}px`);
    picture.style.setProperty('--picture-height', `${startHeight + (height + 2 - startHeight) * enter}px`);
    picture.style.setProperty('--picture-padding', `${10 * (1 - enter)}px`);
    picture.style.setProperty('--picture-radius', `${8 * (1 - enter)}px`);
    seek();
    const transitionP = clamp((p - .55) / .30);
    transitionTarget = transitionP * Math.max(0, (transition.duration || 0) - .05);
    transition.style.opacity = transitionReady && p >= .55 ? '1' : '0';
    seekTransition();
    // Reveal is tied to the decoded frame, not an outstanding seek request.
    const decoded = transitionReady ? transition.currentTime / Math.max(.1, transition.duration - .05) : transitionP;
    const canReveal = p > .80 && decoded > .86;
    const fade = canReveal ? ease(clamp((decoded - .86) / .14)) : 0;
    const reveal = canReveal ? ease(clamp((p - .82) / .08)) : 0;
    intro.style.opacity = 1 - clamp(p / .15);
    intro.style.transform = `translateY(${-p * 70}px)`;
    exit.style.opacity = fade;
    if (copy) {
      copy.style.opacity = reveal;
      copy.style.transform = `translateY(${(1 - reveal) * 35}px)`;
      copy.style.visibility = reveal > .01 ? 'visible' : 'hidden';
      copy.inert = reveal < .8;
    }
    controls.style.opacity = 1 - clamp(p / .10);
    controls.style.visibility = p > .10 ? 'hidden' : 'visible';
    progress.style.transform = `scaleX(${p})`;
  }
  function requestRender() { if (!raf) raf = requestAnimationFrame(render); }
  function measure() {
    const height = `${Math.ceil(nav.getBoundingClientRect().height)}px`;
    scene.style.setProperty('--scene-nav', height);
    document.documentElement.style.setProperty('--film-nav', height);
    requestRender();
  }
  function fallback() {
    enabled = false;
    document.body.classList.remove('scene-active');
    film.pause();
    transition.pause();
    transition.style.opacity = 0;
    scene.classList.remove('is-ready');
    picture.removeAttribute('style');
    if (copy) {
      copy.removeAttribute('style');
      copy.inert = false;
    }
    intro.removeAttribute('style');
    exit.style.opacity = 0;
    controls.style.visibility = 'hidden';
    progress.style.transform = 'scaleX(0)';
    observer?.disconnect();
    document.querySelectorAll('.scene-reveal').forEach(el => el.classList.remove('is-waiting'));
  }
  function ready() {
    if (reduced.matches || !Number.isFinite(film.duration) || enabled) return;
    enabled = true;
    scene.classList.add('is-ready');
    measure();
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        observer.unobserve(entry.target);
      }
    }), { threshold: .06 });
    document.querySelectorAll('body > section > .section-inner').forEach(el => {
      el.classList.add('scene-reveal');
      if (el.getBoundingClientRect().top > innerHeight) el.classList.add('is-waiting');
      observer.observe(el);
    });
  }
  transition.addEventListener('loadeddata', () => { transitionReady = true; requestRender(); });
  transition.addEventListener('seeked', () => { seekTransition(); requestRender(); });
  transition.addEventListener('error', () => { transitionReady = false; requestRender(); });
  film.addEventListener('loadeddata', ready);
  film.addEventListener('seeked', seek);
  film.addEventListener('seeked', requestRender);
  film.addEventListener('error', fallback);
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  new ResizeObserver(measure).observe(nav);
  reduced.addEventListener('change', () => { fallback(); if (!reduced.matches) { transition.src = transition.dataset.src; transition.load(); film.src = film.dataset.src; film.load(); } });
  if (!reduced.matches) {
    transition.src = transition.dataset.src;
    transition.load();
    film.src = film.dataset.src;
    film.load();
  } else fallback();
})();

(() => {
 'use strict';
 const scene=document.querySelector('.footer-journey');
 if(!scene) return;
 const stage=scene.querySelector('.footer-stage'), film=scene.querySelector('.footer-film');
 const still=scene.querySelector('.footer-still'), white=scene.querySelector('.footer-white');
 const board=scene.querySelector('.footer-board'), nav=document.querySelector('.site-nav');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=v=>Math.max(0,Math.min(1,v));
 let ready=false, target=0, raf=0, failed=false;
 function seek(){if(ready&&!film.seeking&&Math.abs(film.currentTime-target)>1/30) film.currentTime=target;}
 function render(){
  raf=0;
  const animated=ready&&!reduced.matches&&!failed;
  scene.classList.toggle('is-scrubbing',animated);
  const navH=nav.getBoundingClientRect().height;
  scene.style.setProperty('--footer-nav',navH+'px');
  const w=stage.clientWidth,h=stage.clientHeight;
  const scale=Math.max(w/1344,h/768), dx=(w-1344*scale)/2,dy=(h-768*scale)/2;
  const left=Math.max(16,dx+280*scale),right=Math.min(w-16,dx+1064*scale);
  board.style.left=left+'px';board.style.width=(right-left)+'px';
  board.style.top=(dy+210*scale)+'px';board.style.height=(380*scale)+'px';
  if(!animated){film.style.opacity=0;still.style.opacity=1;white.style.opacity=0;board.style.opacity=1;board.style.visibility='visible';board.inert=false;return;}
  const p=clamp((navH-scene.getBoundingClientRect().top)/Math.max(1,scene.offsetHeight-stage.offsetHeight));
  const t=clamp((p-.08)/.72);
  target=t*Math.max(0,film.duration-.045);seek();
  const finished=p>=.82&&film.currentTime>=film.duration-.15;
  film.style.opacity=1;still.style.opacity=finished?1:0;
  white.style.opacity=1-clamp(p/.12);
  board.style.opacity=finished?1:0;board.style.visibility=finished?'visible':'hidden';board.inert=!finished;
 }
 function queue(){if(!raf)raf=requestAnimationFrame(render);}
 film.addEventListener('loadeddata',()=>{ready=true;queue();});
 film.addEventListener('seeked',()=>{seek();queue();});
 film.addEventListener('error',()=>{failed=true;queue();});
 window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});
 new ResizeObserver(queue).observe(nav);
 function load(){if(!reduced.matches&&!film.src){film.src=film.dataset.src;film.preload='auto';film.load();}}
 reduced.addEventListener('change',()=>{load();queue();});
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();observer.disconnect();}},{rootMargin:'1600px'});
 observer.observe(scene);queue();
})();
