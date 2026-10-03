/* Local, interruptible presentation runtime. Never owns product state or task timers. */
(() => {
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const E={enter:'cubic-bezier(.16,1,.3,1)',state:'cubic-bezier(.22,.75,.25,1)',spring:'cubic-bezier(.34,1.56,.64,1)'};
  const roots=new Map(),animations=new Set(),cleanups=new Map(),timers=new Map(),tweens=new Set(),listeners=[];
  let frame=0,suspended=false,errors=0;
  const visible=el=>{if(!el?.isConnected)return false;const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
  const allowed=el=>!suspended&&!document.hidden&&!preference.matches&&visible(el);
  const safe=fn=>{try{return fn();}catch(error){errors++;console.warn('Do-er motion skipped:',error);}};
  const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push(()=>target?.removeEventListener(type,fn,options));};
  function cleanup(group,fn){if(!cleanups.has(group))cleanups.set(group,new Set());cleanups.get(group).add(fn);return ()=>cleanups.get(group)?.delete(fn);}
  function cancel(group){
    for(const item of [...animations])if(item.group===group){item.animation.cancel();animations.delete(item);}
    for(const [id,g] of [...timers])if(g===group){clearTimeout(id);timers.delete(id);}
    for(const item of [...tweens])if(item.group===group){item.finish();tweens.delete(item);}
    const jobs=cleanups.get(group);cleanups.delete(group);jobs?.forEach(fn=>safe(fn));
  }
  function animate(el,keys,options={},group='page'){
    if(!el?.animate||!allowed(el))return null;
    const animation=el.animate(keys,{duration:360,easing:E.enter,fill:'backwards',...options});
    const item={animation,group};animations.add(item);
    animation.finished.then(()=>animations.delete(item),()=>animations.delete(item));return animation;
  }
  function after(ms,fn,group='page'){
    const id=setTimeout(()=>{timers.delete(id);if(!suspended&&!document.hidden&&!preference.matches)safe(fn);},ms);
    timers.set(id,group);return id;
  }
  function transient(el,group='page',ms=600){
    const remove=()=>el.remove();const unregister=cleanup(group,remove);
    after(ms,()=>{remove();unregister();},group);return el;
  }
  function ghost(original,host,rect,group='phone',ms=500){
    if(!original||!host||!allowed(host))return null;
    const copy=original.cloneNode(true),h=host.getBoundingClientRect();
    copy.classList.add('motion-ghost');copy.setAttribute('aria-hidden','true');copy.inert=true;
    for(const node of [copy,...copy.querySelectorAll('*')]){node.removeAttribute('id');node.removeAttribute('aria-current');}
    copy.querySelectorAll('button,input,a').forEach(el=>{el.tabIndex=-1;});
    Object.assign(copy.style,{left:`${rect.left-h.left+host.scrollLeft}px`,top:`${rect.top-h.top+host.scrollTop}px`,width:`${rect.width}px`,margin:'0'});
    host.append(copy);return transient(copy,group,ms);
  }
  function svg(name){const el=document.createElementNS('http://www.w3.org/2000/svg','svg');el.setAttribute('class','icon');el.setAttribute('aria-hidden','true');el.innerHTML=`<use href="#i-${name}"/>`;return el;}
  function draw(el,duration=220,delay=0,group='page',length=40){
    if(!el||!allowed(el))return;
    const oldArray=el.style.strokeDasharray,oldOffset=el.style.strokeDashoffset;
    el.style.strokeDasharray=String(length);el.style.strokeDashoffset='0';
    const undo=()=>{el.style.strokeDasharray=oldArray;el.style.strokeDashoffset=oldOffset;};const unregister=cleanup(group,undo);
    animate(el,[{strokeDashoffset:length},{strokeDashoffset:0}],{duration,delay,easing:E.state},group);
    after(duration+delay,()=>{undo();unregister();},group);
  }
  function pop(el,delay=0,group='page',duration=260){return animate(el,[{transform:'scale(.6)'},{transform:'scale(1)'}],{duration,delay,easing:E.spring},group);}
  function reveal(el,delay=0,group='page',x=0,y=16,duration=400){return animate(el,[{opacity:0,transform:`translate(${x}px,${y}px)`},{opacity:1,transform:'translate(0,0)'}],{duration,delay},group);}
  function watch(root,fn){
    if(!root)return;
    if(!roots.has(root)){roots.set(root,{visible:visible(root),once:[],loops:[],paused:false});root.dataset.motionRoot='';observer?.observe(root);}
    const item=roots.get(root);if(fn)item.once.push({fn,ran:false});sync(root,item);
  }
  function sync(root,item){
    const on=item.visible&&!document.hidden&&!preference.matches&&!suspended;
    root.classList.toggle('motion-live',on&&!item.paused);
    for(const entry of item.once)if(on&&!entry.ran){entry.ran=true;safe(entry.fn);}
    for(const loop of item.loops){
      if(preference.matches||suspended){loop.animation?.cancel();loop.animation=null;continue;}
      if(on&&!loop.animation){loop.animation=loop.el.animate?.(loop.keys,{iterations:Infinity,easing:E.state,...loop.options});}
      if(loop.animation)(on&&!item.paused?loop.animation.play():loop.animation.pause());
    }
  }
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{const item=roots.get(entry.target);if(item){item.visible=entry.isIntersecting;sync(entry.target,item);}}),{threshold:.08}):null;
  function loop(root,el,keys,options={}){if(!root||!el)return;watch(root);roots.get(root).loops.push({el,keys,options,animation:null});sync(root,roots.get(root));}
  function pause(root,value){const item=roots.get(root);if(item){item.paused=value;sync(root,item);}}
  // Finite counters share one RAF. No perpetual main-thread animation loop.
  function easing(t){const x1=.22,y1=.75,x2=.25,y2=1;let u=t;for(let i=0;i<6;i++){const v=1-u,x=3*v*v*u*x1+3*v*u*u*x2+u*u*u,dx=3*v*v*x1+6*v*u*(x2-x1)+3*u*u*(1-x2);if(dx>.00001)u=Math.max(0,Math.min(1,u-(x-t)/dx));}return 3*(1-u)*(1-u)*u*y1+3*(1-u)*u*u*y2+u*u*u;}
  function tick(now){frame=0;for(const item of [...tweens]){if(!allowed(item.el)){item.finish();tweens.delete(item);continue;}const t=Math.min(1,Math.max(0,(now-item.start)/item.duration));if(now>=item.start)item.update(easing(t));if(t===1){item.finish();tweens.delete(item);}}if(tweens.size)frame=requestAnimationFrame(tick);}
  function count(el,from,to,format=n=>String(n),duration=600,delay=0,group='page'){
    if(!el||!allowed(el))return;const final=el.textContent;
    const item={el,group,start:performance.now()+delay,duration,update:t=>{el.textContent=format(Math.round(from+(to-from)*t));},finish:()=>{el.textContent=final;}};
    tweens.add(item);if(!frame)frame=requestAnimationFrame(tick);
  }
  function typing(target,group='phone',delay=600){
    if(!target||!allowed(target))return;
    const copy=document.createElement('span');copy.className='motion-reply-copy';
    while(target.firstChild)copy.append(target.firstChild);target.append(copy);target.classList.add('motion-reply');
    const dots=document.createElement('span');dots.className='motion-typing';dots.setAttribute('aria-hidden','true');dots.innerHTML='<i></i><i></i><i></i>';target.append(dots);
    [...dots.children].forEach((dot,i)=>animate(dot,[{opacity:.25,transform:'translateY(0)'},{opacity:1,transform:'translateY(-3px)'},{opacity:.25,transform:'translateY(0)'}],{duration:300,iterations:2,delay:i*70,easing:E.state},group));
    animate(copy,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,delay},group);
    const undo=()=>{dots.remove();copy.replaceWith(...copy.childNodes);target.classList.remove('motion-reply');};
    const unregister=cleanup(group,undo);after(delay,()=>{dots.remove();},group);after(delay+240,()=>{undo();unregister();},group);
  }
  function unlock(el,group='phone',delay=0){
    if(!el||!allowed(el))return;
    // Separate shackle: the lock body does not rotate. The base frame is already open.
    if(!el.querySelector('.motion-shackle')){el.setAttribute('viewBox','0 0 24 24');
      el.innerHTML='<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M12 15v2"/><g class="motion-shackle" style="transform:rotate(-28deg);transform-origin:8px 10px"><path d="M8 10V7a4 4 0 0 1 8 0v3"/></g>';
    }
    animate(el.querySelector('g'),[{transform:'rotate(0)'},{transform:'rotate(-28deg)'}],{duration:360,delay,easing:E.spring},group);
  }
  function lock(el,group='page',delay=0){
    if(!el||!allowed(el))return;
    el.setAttribute('viewBox','0 0 24 24');el.innerHTML='<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M12 15v2"/><g style="transform-origin:8px 10px"><path d="M8 10V7a4 4 0 0 1 8 0v3"/></g>';
    animate(el.querySelector('g'),[{transform:'rotate(-28deg)'},{transform:'rotate(0)'}],{duration:240,delay,easing:E.spring},group);
  }
  function settle(){for(const group of new Set([...animations].map(i=>i.group).concat([...timers.values()],[...tweens].map(i=>i.group),[...cleanups.keys()])))cancel(group);cancelAnimationFrame(frame);frame=0;}
  function syncAll(){for(const [root,item] of roots){if(!observer)item.visible=visible(root);sync(root,item);}}
  listen(document,'visibilitychange',()=>{if(document.hidden)settle();syncAll();});
  listen(preference,'change',()=>{if(preference.matches)settle();syncAll();});
  listen(window,'resize',syncAll);
  if(!observer)listen(document,'doer:scroll',syncAll);
  let pressed=null;
  function press(event){const b=event.target.closest('button,.button');if(!b||b.disabled)return;cancel('press-hold');pressed=b;const a=animate(b,[{transform:'scale(1)'},{transform:'scale(.97)'}],{duration:120,easing:E.state,fill:'forwards'},'press-hold');if(a)cleanup('press-hold',()=>a.cancel());}
  function release(){const b=pressed;pressed=null;cancel('press-hold');if(b)animate(b,[{transform:'scale(.97)'},{transform:'scale(1)'}],{duration:120,easing:E.state},'press');}
  listen(document,'pointerdown',press,true);listen(document,'pointerup',release,true);listen(document,'pointercancel',release,true);listen(window,'blur',release);
  listen(document,'keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!event.repeat)press(event);},true);
  listen(document,'keyup',event=>{if(event.key==='Enter'||event.key===' ')release();},true);
  listen(window,'pagehide',()=>{suspended=true;settle();observer?.disconnect();syncAll();});
  listen(window,'pageshow',event=>{if(event.persisted){suspended=false;roots.forEach((_,root)=>observer?.observe(root));syncAll();}});
  document.documentElement.classList.add('motion-enabled');
  window.DoerMotion=Object.freeze({E,allowed,safe,animate,after,transient,cleanup,cancel,ghost,svg,draw,pop,reveal,watch,loop,pause,count,typing,unlock,lock,listen,
    status:()=>{const loops=[...roots.values()].flatMap(root=>root.loops).filter(loop=>loop.animation);return {reduced:preference.matches,hidden:document.hidden,active:animations.size,timers:timers.size,counters:tweens.size,loops:{running:loops.filter(loop=>loop.animation.playState==='running').length,paused:loops.filter(loop=>loop.animation.playState==='paused').length},errors};}});
})();
