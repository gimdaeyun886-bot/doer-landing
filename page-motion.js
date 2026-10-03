/* Page choreography: one entry per section, paused ambient loops, unchanged theme anchors. */
(() => {
  'use strict';
  const R=window.DoerMotion;if(!R)return;
  const q=(s,root=document)=>root.querySelector(s),all=(s,root=document)=>[...root.querySelectorAll(s)];
  const anchors=Object.freeze({phone:[50.15,45.15],windows:[[17.44,42.67],[18.22,42.37],[26.15,39.5]],pencil:[282/660*100,316/603*100]});
  function scene(root,cls){const box=document.createElement('span');box.className=cls;const img=q('img',root);img.before(box);box.append(img);return box;}
  function initRoom(){
    const room=q('.night-room');if(!room)return;
    const box=scene(room,'motion-room-scene'),light=q('.room-phone-light',room);box.append(light);
    R.loop(room,box,[{transform:'translateY(0)'},{transform:'translateY(-5px)'},{transform:'translateY(0)'}],{duration:8000});
    // The source phone is near (451,610) in the 900x1350 image; all overlays share its moving parent.
    R.loop(room,light,[{opacity:.25,transform:'translate(-50%,-50%) scale(.9)',backgroundColor:'#989cf500',offset:0},{opacity:.65,transform:'translate(-50%,-50%) scale(1.08)',backgroundColor:'#989cf511',offset:.48},{opacity:.3,transform:'translate(-50%,-50%) scale(.94)',backgroundColor:'#afa1d411',offset:.87},{opacity:.56,transform:'translate(-50%,-50%) scale(1.03)',backgroundColor:'#b7b4ff11',offset:.91},{opacity:.25,transform:'translate(-50%,-50%) scale(.9)',backgroundColor:'#989cf500',offset:1}],{duration:7800});
    for(let i=0;i<3;i++){
      const tile=document.createElement('i');tile.className='motion-shortform';tile.setAttribute('aria-hidden','true');tile.style.backgroundColor=['#b9b1ef','#8b8ac1','#b8a8ce'][i];box.append(tile);
      R.loop(room,tile,[{opacity:0,transform:`translate(${i*4-4}px,0) scale(.8)`,offset:0},{opacity:.35,transform:`translate(${i*4-4}px,-5px) scale(1)`,offset:.18},{opacity:0,transform:`translate(${i*10-10}px,-30px) scale(.9)`,offset:.8},{opacity:0,transform:'translate(0,0)',offset:1}],{duration:6600+i*650,delay:i*1600});
    }
    anchors.windows.forEach(([x,y],i)=>{const dot=document.createElement('i');dot.className='motion-window';dot.setAttribute('aria-hidden','true');dot.style.left=`${x}%`;dot.style.top=`${y}%`;box.append(dot);R.loop(room,dot,[{opacity:.09},{opacity:.28},{opacity:.09}],{duration:4200+i*1400,delay:i*600});});
  }
  function initStudy(){
    const root=q('.study-cutout');if(!root)return;
    const box=scene(root,'motion-study-scene');
    const writing=document.createElementNS('http://www.w3.org/2000/svg','svg');writing.setAttribute('class','motion-writing');writing.setAttribute('viewBox','0 0 660 603');writing.setAttribute('aria-hidden','true');writing.innerHTML='<path d="M282 316l17 3m-12 4 11 2"/>';box.append(writing);
    R.watch(root,()=>R.reveal(box,0,'study-entry',0,24,520));
    R.loop(root,box,[{transform:'translateY(0) rotate(0)'},{transform:'translateY(-1.5px) rotate(.12deg)'},{transform:'translateY(0) rotate(0)'}],{duration:5600,delay:520});
    const path=q('path',writing);path.style.strokeDasharray='36';
    R.loop(root,path,[{strokeDashoffset:36,opacity:0,offset:0},{strokeDashoffset:0,opacity:.65,offset:.5},{strokeDashoffset:0,opacity:0,offset:1}],{duration:2600});
  }
  function initDevice(){
    const root=q('.phone-pedestal'),device=q('.interactive-device-shell');if(!root||!device)return;
    R.watch(root,()=>R.animate(device,[{opacity:0,transform:'translateY(24px) rotate(-2deg)'},{opacity:1,transform:'translateY(0) rotate(0)'}],{duration:600},'device-entry'));
    R.loop(root,device,[{transform:'translateY(0)'},{transform:'translateY(-3px)'},{transform:'translateY(0)'}],{duration:7200,delay:650});
  }
  function initHero(){
    const root=q('#opening');R.watch(root,()=>{
      all('#hero-title > span').forEach((el,i)=>R.reveal(el,i*90,'hero-entry',0,20,560));
      const em=q('#hero-title em');if(em&&R.allowed(em)){em.style.position='relative';const oldColor=em.style.textDecorationColor;em.style.textDecorationColor='transparent';const line=document.createElement('i');line.className='motion-hero-line';line.setAttribute('aria-hidden','true');em.append(line);const undo=()=>{em.style.textDecorationColor=oldColor;line.remove();},unregister=R.cleanup('hero-entry',undo);R.animate(line,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:380,delay:180,easing:R.E.state},'hero-entry');R.after(580,()=>{undo();unregister();},'hero-entry');}
      R.reveal(q('.hero-description'),200,'hero-entry',0,12,480);R.reveal(q('.opening-actions'),280,'hero-entry',0,10,420);
    });
    const preview=q('.opening-preview');if(!preview)return;
    R.watch(preview,()=>{
      const closed=q('.mini-padlock',preview),check=q('.mini-tick',preview),open=q('.mini-unlock',preview);
      R.lock(closed,'preview-entry');R.loop(preview,q('g',closed),[{transform:'rotate(-28deg)',offset:0},{transform:'rotate(0)',offset:.05},{transform:'rotate(0)',offset:.95},{transform:'rotate(-28deg)',offset:1}],{duration:8000});
      if(check){check.style.strokeDasharray='32';R.loop(preview,check,[{strokeDashoffset:32,opacity:.2,offset:0},{strokeDashoffset:32,opacity:.2,offset:.07},{strokeDashoffset:0,opacity:1,offset:.12},{strokeDashoffset:0,opacity:1,offset:.95},{strokeDashoffset:32,opacity:.2,offset:1}],{duration:8000});}
      R.unlock(open,'preview-entry',650);const shackle=q('.motion-shackle',open);
      R.loop(preview,shackle,[{transform:'rotate(0)',offset:0},{transform:'rotate(0)',offset:.14},{transform:'rotate(-28deg)',offset:.2},{transform:'rotate(-28deg)',offset:.95},{transform:'rotate(0)',offset:1}],{duration:8000});
    });
    const replay=q('.preview-replay');if(replay){replay.hidden=false;R.listen(replay,'click',()=>{R.cancel('preview-replay');R.lock(q('.mini-padlock'),'preview-replay');R.draw(q('.mini-tick'),220,300,'preview-replay',32);R.unlock(q('.mini-unlock'),'preview-replay',620);});}
  }
  function problem(row,index){
    const group=`problem-${index}`;R.cancel(group);
    R.animate(q('.lock-cover',row),[{transform:'translateY(-25px)'},{transform:'translateY(0)'}],{duration:480,easing:R.E.state},group);
    R.animate(q('.problem-toggle circle',row),[{transform:'translateX(30px)'},{transform:'translateX(0)'}],{duration:420,easing:R.E.state},group);
    R.animate(q('.calendar-shift',row),[{transform:'translate(-22px,-20px)'},{transform:'translate(0,0)'}],{duration:480,easing:R.E.state},group);
  }
  function initMethods(){all('.methods-table tbody tr').forEach((row,i)=>{
    R.watch(row,()=>{R.reveal(row,i*70,'methods-entry',0,12,440);problem(row,i);R.animate(q('.doer-answer',row),[{opacity:.3,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}],{duration:440,delay:380+i*70,easing:R.E.enter},'methods-entry');});
    R.listen(row,'pointerenter',()=>problem(row,i));
  });}
  function initPlan(){
    const root=q('.plan-extraction');R.watch(root,()=>{
      all('.calendar-dots i:not(.is-today)',root).forEach((el,i)=>R.reveal(el,Math.min(250,i*6),'plan-entry',0,5,240));
      R.pop(q('.is-today',root),240,'plan-entry');R.draw(q('.plan-pull use',root),240,320,'plan-entry',40);
      all('.extracted-task',root).forEach((el,i)=>{R.reveal(el,420+i*70,'plan-entry',-20,0,380);const n=q('b',el),to=parseInt(n.textContent);R.count(n,0,to,value=>`${value}분`,600,420+i*70,'plan-entry');});
    });
    const table=q('.access-table');R.watch(table,()=>all('.access-chips > span',table).forEach((el,i)=>{R.reveal(el,i*40,'access-entry',0,8,320);const icon=q('.icon',el);R.animate(icon,[{transform:'translateY(-3px) scale(.8)'},{transform:'translateY(0) scale(1)'}],{duration:240,delay:i*40,easing:R.E.spring},'access-entry');if(q('use[href="#i-lock"]',icon))R.lock(icon,'access-entry',i*40);}));
    const passed=new Set();function timeline(){all('.evening-timeline li.is-passed').forEach((el,i)=>{if(!passed.has(el)&&R.allowed(el)){passed.add(el);R.pop(q('.timeline-node',el),i*30,'timeline',260);}});}
    R.listen(document,'doer:scroll',timeline);R.watch(q('.evening-journey'),timeline);
  }
  function transfer(){
    window.DoerChartTransfer?.measure();
    const plot=q('.chart-plot'),path=q('#transfer-curve'),from=q('[data-day="목"] .chart-piece'),to=q('[data-day="토"] .chart-piece');
    if(!plot||!path||!from||!to||!R.allowed(plot)||!path.getTotalLength())return;
    const p=plot.getBoundingClientRect(),a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),length=path.getTotalLength();
    const piece=document.createElement('i');piece.className='motion-transfer-piece';piece.setAttribute('aria-hidden','true');piece.style.width=`${a.width}px`;piece.style.height=`${a.height}px`;plot.append(piece);R.transient(piece,'chart-entry',900);
    const move=(x,y,offset)=>({transform:`translate(${x}px,${y}px)`,offset});
    const keys=[move(a.left-p.left,a.top-p.top,0)];
    for(let i=0;i<=20;i++){const point=path.getPointAtLength(length*i/20);keys.push(move(point.x-a.width/2,point.y-a.height/2,.1+.8*i/20));}
    keys.push(move(b.left-p.left,b.top-p.top,1));R.animate(piece,keys,{duration:800,easing:R.E.state},'chart-entry');
    R.animate(to,[{opacity:0},{opacity:1}],{duration:180,delay:620,easing:R.E.state},'chart-entry');
  }
  function initAdjust(){
    R.watch(q('.adjustment-example'),()=>{R.reveal(q('.user-bubble'),0,'adjust-dialog',18,0,380);R.typing(q('.coach-message > div'),'adjust-dialog',600);});
    const chart=q('.week-chart');R.watch(chart,()=>{
      all('.bar-pair i:not(.chart-piece)',chart).forEach((el,i)=>{el.style.transformOrigin='bottom';R.animate(el,[{transform:'scaleY(.05)'},{transform:'scaleY(1)'}],{duration:650,delay:i*35},'chart-entry');});
      all('.week-day.is-changed',chart).forEach(el=>{const b=q('b',el),after=el.dataset.day==='목'?30:60;R.count(b,45,after,n=>`45→${n}`,700,80,'chart-entry');});
      R.after(180,transfer,'chart-entry');
    });
  }
  function initRoadmap(){
    const root=q('#roadmap');R.watch(root,()=>all('li:not(:last-child)',root).forEach((el,i)=>{const line=document.createElement('i');line.className='motion-roadmap-line';line.setAttribute('aria-hidden','true');el.append(line);R.animate(line,[{transform:innerWidth<=800?'scaleY(0)':'scaleX(0)'},{transform:innerWidth<=800?'scaleY(1)':'scaleX(1)'}],{duration:380,delay:i*180,easing:R.E.state},'roadmap-entry');}));
    R.loop(root,q('.is-current .roadmap-dot'),[{transform:'scale(1)',opacity:1},{transform:'scale(1.09)',opacity:.78},{transform:'scale(1)',opacity:1}],{duration:3800});
  }
  function initSignup(){
    const root=q('.signup-pending'),hand=q('.pending-mail > path:last-child');if(hand){hand.style.transformOrigin='66px 17px';R.loop(root,hand,[{transform:'rotate(0)'},{transform:'rotate(360deg)'}],{duration:18000});}
    all('.signup-next span').forEach((dot,i)=>R.loop(root,dot,[{backgroundColor:'#eee9f9',color:'#5649ed',opacity:.7,offset:0},{backgroundColor:'#5649ed',color:'#fff',opacity:1,offset:.3},{backgroundColor:'#eee9f9',color:'#5649ed',opacity:.7,offset:.6},{backgroundColor:'#eee9f9',color:'#5649ed',opacity:.7,offset:1}],{duration:6000,delay:i*700}));
  }
  function initFaq(){all('.faq-list details').forEach((details,i)=>{
    const summary=q('summary',details),group=`faq-${i}`;let desired=null;
    R.listen(summary,'click',event=>{
      if(!R.allowed(details)){R.cancel(group);desired=null;return;}
      event.preventDefault();const target=!(desired??details.open),height=details.getBoundingClientRect().height;R.cancel(group);desired=target;
      details.open=false;const closed=details.getBoundingClientRect().height;details.open=true;const expanded=details.getBoundingClientRect().height;
      details.style.height=`${target?expanded:closed}px`;summary.setAttribute('aria-expanded',String(target));
      const final=()=>{details.open=target;details.style.height='';summary.removeAttribute('aria-expanded');desired=null;};
      const unregister=R.cleanup(group,final);R.animate(details,[{height:`${height}px`},{height:`${target?expanded:closed}px`}],{duration:300,easing:R.E.state},group);
      R.animate(q('.faq-plus',summary),[{transform:target?'rotate(0)':'rotate(45deg)'},{transform:target?'rotate(45deg)':'rotate(0)'}],{duration:300,easing:R.E.state},group);
      R.after(310,()=>{final();unregister();},group);
    });
    R.listen(window,'resize',()=>R.cancel(group));
  });}
  function initHeader(){
    const root=q('.site-header'),nav=q('.desktop-nav');if(!root||!nav)return;
    const line=document.createElement('i');line.className='motion-nav-rail';line.setAttribute('aria-hidden','true');line.style.opacity='0';nav.append(line);let previous='translateX(0) scaleX(0)',last='';
    function update(){
      root.classList.toggle('motion-compact',scrollY>30);
      const sections=all('#main > section'),at=sections.filter(el=>el.getBoundingClientRect().top<innerHeight*.45).at(-1)?.id;
      const map={methods:'methods',evening:'methods',experience:'experience',adjust:'experience',questions:'questions',signup:'questions'},key=map[at]||'';
      if(key===last)return;last=key;const current=q(`a[href="#${key}"]`,nav);all('a',nav).forEach(el=>{if(el===current)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');});
      if(!current){line.style.opacity='0';return;}const n=nav.getBoundingClientRect(),b=current.getBoundingClientRect(),to=`translateX(${b.left-n.left}px) scaleX(${b.width})`;
      line.style.opacity='1';line.style.transform=to;R.animate(line,[{transform:previous},{transform:to}],{duration:280,easing:R.E.state},'nav');previous=to;
    }
    R.listen(document,'doer:scroll',update);R.listen(window,'resize',()=>{last='';update();});document.fonts.ready.then(()=>{last='';update();});update();
  }
  function overlays(){
    return ['.night-room','.study-cutout'].map(selector=>{
      const root=q(selector),img=q('img',root),r=img.getBoundingClientRect(),list=selector==='.night-room'?[['phone',anchors.phone],...anchors.windows.map((p,i)=>[`window${i+1}`,p])]:[['pencil',anchors.pencil]];
      const round=value=>Math.round(value*100)/100;
      return {scene:selector,assetWidth:img.naturalWidth,assetHeight:img.naturalHeight,imageRect:{left:r.left+scrollX,top:r.top+scrollY,width:r.width,height:r.height},anchors:list.map(([name,[x,y]],i)=>{
        const expected={x:r.left+scrollX+r.width*x/100,y:r.top+scrollY+r.height*y/100};let actual=null;
        if(name==='pencil'){const path=q('.motion-writing path',root),matrix=path?.getScreenCTM();if(matrix){const point=path.getPointAtLength(0),svgPoint=path.closest('svg').createSVGPoint();svgPoint.x=point.x;svgPoint.y=point.y;const p=svgPoint.matrixTransform(matrix);actual={x:p.x+scrollX,y:p.y+scrollY};}}
        else {const overlay=name==='phone'?q('.room-phone-light',root):all('.motion-window',root)[i-1];if(overlay){const b=overlay.getBoundingClientRect();actual={x:b.left+b.width/2+scrollX,y:b.top+b.height/2+scrollY};}}
        return {name,xPercent:x,yPercent:y,documentX:round(expected.x),documentY:round(expected.y),overlayDocumentX:actual?round(actual.x):null,overlayDocumentY:actual?round(actual.y):null,deltaX:actual?round(actual.x-expected.x):null,deltaY:actual?round(actual.y-expected.y):null,aligned:actual?Math.abs(actual.x-expected.x)<=1.5&&Math.abs(actual.y-expected.y)<=1.5:null};
      })};
    });
  }
  all('.journey-label').forEach(label=>R.watch(label,()=>R.pop(q('span',label),0,'label-entry',260)));
  [initRoom,initStudy,initDevice,initHero,initMethods,initPlan,initAdjust,initRoadmap,initSignup,initFaq,initHeader].forEach(fn=>R.safe(fn));
  window.DoerSceneMotion=Object.freeze({overlays,anchors});
})();
