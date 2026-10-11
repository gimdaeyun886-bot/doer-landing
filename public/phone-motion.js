/* Render observer/hook. Reads snapshots; does not call a model action or own its timer. */
(() => {
  'use strict';
  const R=window.DoerMotion,M=window.DoerDemo,screen=document.querySelector('#phone-screen'),tabs=document.querySelector('.phone-tabs'),host=document.querySelector('.handset');
  if(!R||!M||!screen)return;
  let previous=null,oldReview=null,oldTab=null,deviceBusyTimer=0,keyboardIntent=false;
  const group='phone',stateGroup='phone-status',phoneRoot=document.querySelector('.phone-pedestal');
  R.watch(phoneRoot);
  const rect=el=>el?.getBoundingClientRect();
  const clone=el=>el?{node:el.cloneNode(true),rect:rect(el)}:null;
  function capture(){return R.safe(()=>{
    const review=screen.querySelector('[data-task-card="review"]');if(review)oldReview=review.cloneNode(true);
    const circle=document.querySelector('#outside-circle'),bar=screen.querySelector('.demo-progress-track i'),track=screen.querySelector('.demo-progress-track');
    const option=previous?.finding?screen.querySelectorAll('.motion-proof-option')[M.DEMO_SCENARIO.tasks.findIndex(t=>t.id===previous.finding)]:null;
    return {preview:clone(screen.querySelector('.proof-preview')),proofIcon:clone(option),selected:clone(screen.querySelector('.demo-prompt')),review:oldReview,
      chips:[...screen.querySelectorAll('.start-apps label')].filter(el=>el.querySelector('input')?.checked).map(clone),
      circle:circle?getComputedStyle(circle).strokeDashoffset:'125.664',fill:bar&&track?rect(bar).width/Math.max(1,rect(track).width):0,
      tab:oldTab,phase:previous?M.phase(previous):0};
  });}
  function finalMarks(s){
    for(const id of s.done){const title=screen.querySelector(`[data-task-card="${id}"] h4`);if(!title)continue;
      title.style.position='relative';const line=document.createElement('i');line.className='motion-strike';line.setAttribute('aria-hidden','true');title.append(line);
    }
  }
  function calendar(s){
    const cells=[...screen.querySelectorAll('.demo-calendar button')];
    cells.filter(el=>el.dataset.day!==String(M.DEMO_SCENARIO.today)).forEach((el,i)=>R.reveal(el,Math.min(240,i*7),group,0,5,240));
    R.pop(screen.querySelector(`[data-day="${M.DEMO_SCENARIO.today}"]`),240,group);
    screen.querySelectorAll('.selected-day > p').forEach((el,i)=>R.reveal(el,300+i*60,group,0,14,280));
    if(s.adjusted)R.pop(screen.querySelector('.moved-day small'),280,group);
  }
  function progress(s,before){
    const count=M.active(s).filter(t=>s.done.includes(t.id)).length,total=M.active(s).length;
    const prior=previous?M.active(previous).filter(t=>previous.done.includes(t.id)).length:0,priorTotal=previous?M.active(previous).length:total;
    if(count===prior&&total===priorTotal)return;
    const number=screen.querySelector('.demo-progress b');
    if(number){const n=R.ghost(number,screen,rect(number),group,300);if(n){n.textContent=`${prior}/${priorTotal}`;n.classList.add('motion-progress-digit');R.animate(n,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-16px)'}],{duration:280,easing:R.E.state},group);}R.reveal(number,0,group,0,16,280);}
    const fill=screen.querySelector('.demo-progress-track i'),ratio=count/total;
    if(fill&&ratio){fill.style.transformOrigin='left';R.animate(fill,[{transform:`scaleX(${(before?.fill??prior/priorTotal)/ratio})`},{transform:'scaleX(1)'}],{duration:420,easing:R.E.state},group);}
  }
  function proof(s){
    const finding=screen.querySelector('.proof-finding');if(!finding)return;
    finding.querySelector(':scope > .icon')?.remove();finding.classList.add('motion-proof-active');
    const orbit=document.createElement('span');orbit.className='motion-proof-orbit';orbit.setAttribute('aria-hidden','true');
    orbit.innerHTML='<svg class="motion-proof-ring" viewBox="0 0 72 72"><circle cx="36" cy="36" r="27" stroke-dasharray="135 35"/></svg>';
    orbit.append(R.svg('coach'));finding.prepend(orbit);
    const duration=s.findCount===1?1000:700,selected=M.DEMO_SCENARIO.tasks.findIndex(t=>t.id===s.finding),places=[[-38,9],[0,-25],[38,9]];
    R.animate(orbit.querySelector('.motion-proof-ring'),[{transform:'rotate(0)',opacity:.4},{transform:'rotate(360deg)',opacity:1}],{duration,easing:R.E.state},group);
    M.DEMO_SCENARIO.tasks.forEach((task,i)=>{
      const icon=document.createElement('span');icon.className='motion-proof-option';icon.append(R.svg(task.icon));orbit.append(icon);
      const [x,y]=places[i];icon.style.transform=i===selected?'translate(0,0) scale(1.2)':`translate(${x}px,${y}px) scale(.85)`;icon.style.opacity=i===selected?'1':'.25';
      R.animate(icon,[{opacity:.25,transform:`translate(${x}px,${y}px) scale(.6)`,offset:0},{opacity:1,transform:`translate(${x}px,${y}px) scale(1)`,offset:.6},{opacity:i===selected?1:.25,transform:i===selected?'translate(0,0) scale(1.2)':`translate(${x}px,${y}px) scale(.85)`,offset:1}],{duration:duration-100,delay:i*35,easing:R.E.state},group);
    });
  }
  function stamp(before,id){
    if(before?.preview){const card=R.ghost(before.preview.node,host,before.preview.rect,group,340);R.animate(card,[{opacity:1},{opacity:0}],{duration:320,easing:R.E.state},group);}
    const target=screen.querySelector(`[data-task-card="${id}"] .task-top > span`)||screen.querySelector('.demo-success > .icon');
    if(!target)return;
    const mark=document.createElement('span');mark.className='motion-check-stamp';mark.setAttribute('aria-hidden','true');mark.append(R.svg('check'));
    const r=rect(target),copy=R.ghost(mark,host,{...r,left:r.left-12,top:r.top-12,width:46},group,380);
    R.animate(copy,[{opacity:0,transform:'scale(1.3)'},{opacity:1,transform:'scale(1)',offset:.5},{opacity:0,transform:'scale(1)',offset:1}],{duration:360,easing:R.E.spring},group);
    R.pop(target,0,group,260);R.draw(target.querySelector('use'),220,30,group,32);
    const strike=screen.querySelector(`[data-task-card="${id}"] .motion-strike`);R.animate(strike,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:220,delay:40,easing:R.E.state},group);
  }
  function started(before){
    before?.chips.forEach((entry,i)=>{
      const copy=R.ghost(entry.node,host,entry.rect,'phone-chips',520+i*70);if(!copy)return;
      const icon=R.svg('lock');copy.append(icon);R.pop(icon,i*70,'phone-chips',210);R.lock(icon,'phone-chips',i*70);
      R.animate(copy,[{opacity:1},{opacity:0,transform:'translateY(-6px)'}],{duration:240,delay:230+i*70,easing:R.E.state},'phone-chips');
    });
  }
  function accepted(s,before){
    const list=screen.querySelector('.demo-tasks');
    if(before?.review&&list){const r=rect(list),copy=R.ghost(before.review,screen,{left:r.left,top:r.bottom,width:r.width},group,420);R.animate(copy,[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(130px)'}],{duration:380,easing:R.E.state},group);}
    const anchor=screen.querySelector('.demo-view');
    if(anchor&&R.allowed(anchor)){anchor.style.position='relative';const badge=document.createElement('span');badge.className='motion-saturday';badge.setAttribute('aria-hidden','true');badge.innerHTML=`<span>토요일</span><b>${M.DEMO_SCENARIO.saturday}</b><small>+15분</small>`;anchor.append(badge);R.transient(badge,group,1500);R.pop(badge.querySelector('small'),120,group,300);R.reveal(badge,0,group,0,6,240);}
  }
  function completed(){
    const icon=screen.querySelector('.demo-success > .icon');R.unlock(icon,group);
    if(icon){const ring=document.createElement('span');ring.className='motion-result-ring';ring.setAttribute('aria-hidden','true');const r=rect(icon),copy=R.ghost(ring,host,{...r,left:r.left-10,top:r.top-10,width:70},group,600);R.animate(copy,[{opacity:.5,transform:'scale(.6)'},{opacity:0,transform:'scale(1.6)'}],{duration:560,easing:R.E.enter},group);}
    screen.querySelectorAll('.demo-chips > span').forEach((chip,i)=>{chip.style.backgroundColor='#e6f1e9';chip.style.color='#216342';R.animate(chip,[{backgroundColor:'#fce7de',color:'#9f331b',transform:'scale(.96)'},{backgroundColor:'#e6f1e9',color:'#216342',transform:'scale(1)'}],{duration:300,delay:i*70,easing:R.E.state},group);});
  }
  function outside(s,before){
    const total=M.active(s).length,count=M.active(s).filter(t=>s.done.includes(t.id)).length,circle=document.querySelector('#outside-circle');
    R.animate(circle,[{strokeDashoffset:before?.circle??'125.664'},{strokeDashoffset:String(125.664*(1-count/total))}],{duration:420,easing:R.E.state},stateGroup);
    R.reveal(document.querySelector('#live-count'),0,stateGroup,0,10,280);
    if(previous&&M.phase(previous)!==M.phase(s)){
      const from=document.querySelector(`[data-track="${before?.phase??0}"] .step-number`),to=document.querySelector(`[data-track="${M.phase(s)}"] .step-number`);
      if(from&&to){const r=rect(from),t=rect(to),copy=R.ghost(from,document.querySelector('.experience-intro'),r,stateGroup,340);copy?.classList.add('motion-step-travel');R.animate(copy,[{opacity:1,transform:'translate(0,0)'},{opacity:0,transform:`translate(${t.left-r.left}px,${t.top-r.top}px)`}],{duration:320,easing:R.E.state},stateGroup);R.pop(to,140,stateGroup);}
    }
    s.done.filter(id=>!previous?.done.includes(id)).forEach(id=>{const row=document.querySelector(`[data-proof-row="${id}"]`);R.animate(row,[{backgroundColor:'#fffcf8'},{backgroundColor:'#e6f1e9',offset:.45},{backgroundColor:'#fffcf8'}],{duration:600,easing:R.E.state},stateGroup);});
    if(M.complete(s)){
      const chip=document.querySelector('#live-blocked');
      const span=document.createElement('span');span.className='motion-proof-unlocked';span.setAttribute('aria-hidden','true');span.append(R.svg('unlock'));chip.prepend(span);
      chip.style.backgroundColor='#e6f1e9';chip.style.color='#216342';
      if(!previous?.complete){R.animate(chip,[{backgroundColor:'#fce7de'},{backgroundColor:'#e6f1e9'}],{duration:360,easing:R.E.state},stateGroup);R.unlock(span.firstChild,stateGroup);}
    }else{
      const chip=document.querySelector('#live-blocked');chip.style.backgroundColor='';chip.style.color='';
    }
  }
  function rail(){
    const button=tabs.querySelector('[aria-current="page"]');if(!button||tabs.hidden)return;
    const b=rect(button),t=rect(tabs),x=b.left-t.left+8,w=b.width-16,to=`translateX(${x}px) scaleX(${w})`;
    const line=document.createElement('i');line.className='motion-tab-rail';line.setAttribute('aria-hidden','true');line.style.transform=to;tabs.append(line);
    if(oldTab)R.animate(line,[{transform:oldTab},{transform:to}],{duration:280,easing:R.E.state},group);oldTab=to;
  }
  function play(s,before){return R.safe(()=>{
    R.cancel(group);R.cancel(stateGroup);R.cancel('phone-chips');
    finalMarks(s);rail();
    const changed=previous?.view!==s.view;
    if(changed){
      const order={goal:0,time:1,loading:2,plan:3,conditions:4,today:5,lock:5,coach:6,records:7,result:8};
      const direction=previous&&order[s.view]<order[previous.view]?-1:1,view=screen.querySelector('.demo-view');
      R.animate(view,[{opacity:.25,transform:`translateX(${direction*16}px)`},{opacity:1,transform:'translateX(0)'}],{duration:300},group);
      const title=view?.querySelector('.phone-heading'),body=view?.querySelector(':scope > p:not(.demo-phase)'),choice=view?.querySelector('.demo-prompt,.phone-primary,.start-apps,.demo-tasks,.demo-calendar,.demo-record,.demo-chips');
      [title,body,choice].forEach((el,i)=>R.reveal(el,i*60,group,0,8,260));
      if(s.view==='plan')calendar(s);
      if(s.view==='goal')R.typing(title,group);
    }
    if(s.view==='time'&&changed){R.reveal(screen.querySelector('.demo-user'),0,group,16,0,300);R.typing(screen.querySelector('.phone-heading'),group);}
    if(s.view==='loading'&&changed&&R.allowed(screen)){R.typing(screen.querySelector('.proof-finding'),group);const el=document.createElement('span');el.className='motion-selection-echo';el.setAttribute('aria-hidden','true');el.textContent=M.DEMO_SCENARIO.time;screen.querySelector('.proof-finding').before(el);R.transient(el,group,640);R.reveal(el,0,group,16,0,280);}
    if(s.view==='coach'&&s.reason&&!previous?.reason){R.reveal(screen.querySelector('.demo-user'),0,group,16,0,280);R.typing(screen.querySelector('.demo-coach'),group);}
    if(s.finding&&s.finding!==previous?.finding)proof(s);
    if(s.ready&&s.ready!==previous?.ready){const card=screen.querySelector('.proof-preview'),label=screen.querySelector('.proof-result > b');R.animate(card,[{opacity:0,transform:'translateY(16px) rotate(-3deg)'},{opacity:1,transform:'translateY(0) rotate(0)'}],{duration:360},group);R.reveal(label,0,group,0,5,220);
      if(before?.proofIcon&&label){const from=before.proofIcon.rect,to=rect(label),copy=R.ghost(before.proofIcon.node,host,from,group,300);R.animate(copy,[{opacity:1,transform:'translate(0,0) scale(1.2)'},{opacity:0,transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(.7)`}],{duration:280,easing:R.E.state},group);}
    }
    s.done.filter(id=>!previous?.done.includes(id)).forEach(id=>stamp(before,id));
    progress(s,before);outside(s,before);
    if(s.started&&!previous?.started)started(before);
    if(s.adjusted&&!previous?.adjusted)accepted(s,before);
    if(M.complete(s)&&!previous?.complete)completed();
    else if(M.complete(s))screen.querySelectorAll('.demo-chips > span').forEach(chip=>{chip.style.backgroundColor='#e6f1e9';chip.style.color='#216342';});
    previous={...s,complete:M.complete(s)};
  });}
  R.listen(document,'change',event=>{if(event.target.dataset.app){const label=event.target.closest('label');R.animate(label,[{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:260,easing:R.E.spring},'press');}},true);
  function busy(event){if(event.type==='pointerdown')keyboardIntent=false;else if(event.key==='Tab')keyboardIntent=true;if(!event.target.closest('.handset'))return;R.cancel('device-entry');R.pause(phoneRoot,true);clearTimeout(deviceBusyTimer);deviceBusyTimer=setTimeout(()=>R.pause(phoneRoot,false),1800);}
  R.listen(document,'pointerdown',busy,true);R.listen(document,'keydown',busy,true);
  R.listen(document,'focusin',event=>{if(keyboardIntent&&event.target.closest('.handset'))R.cancel('phone');});
  R.listen(window,'pagehide',()=>clearTimeout(deviceBusyTimer));
  window.DoerPhoneMotion=Object.freeze({capture,play});
})();
