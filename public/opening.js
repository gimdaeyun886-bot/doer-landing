/* Scroll color is driven by section 03, not the founder note. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cleanup = [];
  const animations = new Set();
  let observers = [];
  let frame = 0;
  let stopped = false;

  function listen(target,type,handler,options) {
    target.addEventListener(type,handler,options);
    cleanup.push(() => target.removeEventListener(type,handler,options));
  }
  function animate(el,frames,options={}) {
    if(window.DoerMotion)return window.DoerMotion.animate(el,frames,options,'menu');
    if(!el || reduced.matches || document.hidden || !el.animate) return;
    const animation=el.animate(frames,{duration:560,easing:'cubic-bezier(.16,1,.3,1)',...options});
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation),() => animations.delete(animation));
    return animation;
  }
  function initMenu() {
    const button=document.querySelector('.menu-toggle'), menu=document.querySelector('#mobile-nav');
    if(!button || !menu) return;
    document.documentElement.classList.add('has-opening-controls');
    function close(restoreFocus=false) {
      menu.hidden=true; button.setAttribute('aria-expanded','false'); button.setAttribute('aria-label','메뉴 열기');
      if(restoreFocus) button.focus();
    }
    listen(button,'click',() => {
      if(!menu.hidden) return close();
      menu.hidden=false; button.setAttribute('aria-expanded','true'); button.setAttribute('aria-label','메뉴 닫기');
      animate(menu,[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'none'}],{duration:300});
    });
    listen(menu,'click',event => { if(event.target.closest('a')) close(); });
    listen(document,'keydown',event => { if(event.key==='Escape' && !menu.hidden) close(true); });
    listen(window,'resize',() => { if(innerWidth>800) close(); });
  }
  function initTheme() {
    const math=window.DoerOpeningTheme, heading=document.querySelector('#evening-title'), next=document.querySelector('#experience-title');
    if(!math || !heading || !next) return;
    const query=new URLSearchParams(location.search), raw=query.get('theme');
    const fixed=raw!==null && raw.trim()!=='' && Number.isFinite(Number(raw)) ? math.clamp(Number(raw)) : null;
    document.documentElement.classList.toggle('theme-preview',fixed!==null);
    document.documentElement.classList.add('has-scroll-theme');
    const meta=document.querySelector('meta[name="theme-color"]');
    function render() {
      frame=0;
      const h=innerHeight;
      const range=math.bounds(heading.getBoundingClientRect().top+scrollY,next.getBoundingClientRect().top+scrollY,h);
      const progress=fixed ?? math.clamp((scrollY-range.start)/Math.max(1,range.distance));
      // Reduced motion keeps the actual night/cream states, with no traveling blend.
      const colors=math.palette(fixed!==null ? fixed : reduced.matches ? Number(progress>=.5) : progress);
      const vars={'--scene-bg':colors.bg,'--scene-ink':colors.ink,'--scene-muted':colors.muted,'--scene-accent':colors.accent,'--scene-line':colors.line,'--scene-answer-ink':colors.answerInk};
      for(const [key,value] of Object.entries(vars)) document.body.style.setProperty(key,math.css(value));
      // Light ink means a dark header: show the wordmark image in white, otherwise as drawn.
      document.body.style.setProperty('--wordmark-filter',colors.ink[0]+colors.ink[1]+colors.ink[2]>382?'brightness(0) invert(1)':'none');
      meta?.setAttribute('content',math.css(colors.bg));
      document.body.dataset.themeProgress=progress.toFixed(4);
      document.body.dataset.themeStart=range.start.toFixed(2);
      document.body.dataset.themeEnd=range.end.toFixed(2);
      document.body.dataset.themeMode=fixed===null?'scroll':'fixed';
      document.body.dataset.themeAdequate=String(range.adequate);
      // The story line shares the approved color progress and this one scroll owner.
      const journeyProgress=reduced.matches?1:progress;
      document.body.style.setProperty('--journey-fill',String(journeyProgress));
      document.querySelectorAll('.evening-timeline li').forEach((el,i) => el.classList.toggle('is-passed',journeyProgress>=i/4));
      document.dispatchEvent(new CustomEvent('doer:scroll'));
    }
    function requestRender() { if(!frame && !stopped) frame=requestAnimationFrame(render); }
    listen(window,'scroll',requestRender,{passive:true});
    listen(window,'resize',requestRender);
    listen(reduced,'change',requestRender);
    if('ResizeObserver' in window) {
      const observer=new ResizeObserver(requestRender);
      observer.observe(document.querySelector('#main'));
      observers.push(observer);
    }
    document.fonts?.ready.then(requestRender);
    render();
  }
  function start() {
    stopped=false;
    for(const init of [initMenu,initTheme]) {
      try { init(); } catch(error) { console.error('Do-er opening initialization failed:',init.name,error); }
    }
  }
  window.addEventListener('pagehide',() => {
    stopped=true; cancelAnimationFrame(frame); frame=0;
    cleanup.splice(0).forEach(remove => remove());
    observers.forEach(observer => observer.disconnect()); observers=[];
    animations.forEach(a => a.cancel()); animations.clear();
    document.querySelector('.night-room')?.classList.remove('is-in-view');
  });
  window.addEventListener('pageshow',event => { if(event.persisted) start(); });
  start();
})();
