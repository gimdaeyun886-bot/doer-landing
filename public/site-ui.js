(() => {
  'use strict';
  const M=window.DoerDemo,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const chart=document.querySelector('#week-bars');
  chart.innerHTML=M.week(true).map(day=>{
    const bars=day.changed?`<i class="chart-original" style="--minutes:${day.before}" aria-hidden="true"></i><i class="changed" style="--minutes:${day.after}" aria-hidden="true"></i><i class="chart-piece ${day.after<day.before?'chart-piece-out':''}" style="bottom:${Math.min(day.before,day.after)*3}px" aria-hidden="true"></i>`:`<i class="chart-unchanged" style="--minutes:${day.before}" aria-hidden="true"></i>`;
    return `<div class="week-day ${day.changed?'is-changed':''}" data-day="${day.name}"><div class="bar-pair" role="img" aria-label="${day.name}요일 ${day.changed?`원래 ${day.before}분, 조정안 ${day.after}분`:`변경 없이 ${day.before}분`}">${bars}<b style="--label-minutes:${Math.max(day.before,day.after)}" aria-hidden="true">${day.changed?`${day.before}→${day.after}`:day.before}</b></div><span>${day.name}</span></div>`;
  }).join('');
  window.DoerChartTransfer?.init();
  document.querySelector('.calendar-dots').innerHTML=Array.from({length:M.DEMO_SCENARIO.days},(_,i)=>{
    const date=new Date(`${M.DEMO_SCENARIO.start}T12:00:00`);date.setDate(date.getDate()+i);
    return `<i class="${i===M.DEMO_SCENARIO.today-1?'is-today':''}">${i===M.DEMO_SCENARIO.today-1?'오늘':date.getDate()===1?`${date.getMonth()+1}/1`:date.getDate()}</i>`;
  }).join('');
  // Presentation only: consume the existing snapshot; never mutate the phone/model.
  function presentState(state){
    if(!state)return;
    const complete=M.complete(state),chip=document.querySelector('#live-blocked');
    chip.classList.toggle('state-allowed',complete);
    chip.classList.toggle('state-blocked',state.started&&!complete&&state.apps.length>0);
    chip.classList.toggle('state-selected',!complete&&(!state.started||state.apps.length===0));
    document.querySelectorAll('[data-proof-row]').forEach(row=>row.classList.toggle('is-confirmed',state.done.includes(row.dataset.proofRow)));
  }
  presentState(window.DoerPhone?.getState());
  const observers=[],animations=new Set();
  const study=document.querySelector('.study-cutout');
  let studyVisible=false;
  const syncStudy=()=>study.classList.toggle('is-active',studyVisible&&!document.hidden&&!reduced.matches);
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{studyVisible=entries[0].isIntersecting;syncStudy();});observer.observe(study);observers.push(observer);
  }
  const bottom=document.querySelector('.mobile-action'),experience=document.querySelector('#experience'),signup=document.querySelector('#signup');
  let done=false,frame=0;
  function update(){
    frame=0;document.documentElement.style.setProperty('--viewport-width',`${document.documentElement.clientWidth}px`);
    const phone=document.querySelector('.phone-pedestal').getBoundingClientRect(),lead=signup.getBoundingClientRect();
    const inPhone=phone.top<innerHeight&&phone.bottom>0,inLead=lead.top<innerHeight&&lead.bottom>0;
    const focused=/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    const keyboard=window.visualViewport&&visualViewport.height<innerHeight*.75;
    const ready=window.doerSignupReady();
    const heroVisible=document.querySelector('#opening').getBoundingClientRect().bottom>innerHeight*.3;
    bottom.hidden=innerWidth>800||inPhone||inLead||focused||keyboard||heroVisible;
    bottom.href=done&&ready?'#signup':'#experience';bottom.textContent=done&&ready?'베타 알림 신청하기':'미리 체험하기';
  }
  const request=()=>{if(!frame)frame=requestAnimationFrame(update);};
  document.addEventListener('doer:scroll',request);window.addEventListener('resize',request);
  window.visualViewport?.addEventListener('resize',request);document.addEventListener('focusin',request);document.addEventListener('focusout',request);
  document.addEventListener('doer:state',event=>{done=event.detail.complete;presentState(event.detail);request();});
  document.addEventListener('click',event=>{const link=event.target.closest('a[href="#experience"],a[href="#signup"]');if(link)window.doerTrack?.(link.hash==='#experience'?'demo_step':'lead_click',{source:link.closest('header')?'header':link.classList.contains('mobile-action')?'mobile':'page'});});
  document.querySelectorAll('.faq-list details').forEach((details,i)=>details.addEventListener('toggle',()=>{if(details.open)window.doerTrack?.('faq_open',{view:String(i+1)});}));
  document.addEventListener('visibilitychange',()=>{syncStudy();if(document.hidden)animations.forEach(a=>a.cancel());});
  reduced.addEventListener('change',()=>{syncStudy();if(reduced.matches)animations.forEach(a=>a.cancel());});
  window.addEventListener('pagehide',()=>{observers.forEach(o=>o.disconnect());animations.forEach(a=>a.cancel());cancelAnimationFrame(frame);frame=0;study.classList.remove('is-active');});
  window.addEventListener('pageshow',event=>{if(event.persisted){observers[0]?.observe(study);update();}});
  update();
  window.doerTrack?.('landing_view');
  if('IntersectionObserver' in window){const seen=new IntersectionObserver(entries=>{entries.filter(e=>e.isIntersecting).forEach(e=>{window.doerTrack?.('section_view',{view:e.target.id});seen.unobserve(e.target);});},{threshold:.15});document.querySelectorAll('main > section').forEach(el=>seen.observe(el));observers.push(seen);}
})();
