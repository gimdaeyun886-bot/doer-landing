(() => {
  'use strict';
  const M=window.DoerDemo,T=window.DoerPhoneTemplates;
  const screen=document.querySelector('#phone-screen'),tabs=document.querySelector('.phone-tabs'),toast=document.querySelector('.phone-toast');
  if(!screen||!M||!T)return;
  let state=M.fresh(),generation=0,timer=0,hinted=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function cancelFinding(){generation++;clearTimeout(timer);timer=0;state.finding=null;}
  function snapshot(){return JSON.parse(JSON.stringify(state));}
  function render(focus=false,keepScroll=false) {
    const motionBefore=window.DoerPhoneMotion?.capture();
    const previous=screen.scrollTop;
    screen.innerHTML=T.render(state);screen.dataset.view=state.view;
    screen.scrollTop=keepScroll?previous:0;
    tabs.hidden=['goal','time','loading','conditions'].includes(state.view);
    const active=state.view==='result'||state.view==='lock'?'today':state.view;
    tabs.innerHTML=[['plan','전체 계획','plan'],['today','오늘','check'],['coach','코치','chat'],['records','기록','book']].map(([view,label,icon])=>`<button type="button" data-view="${view}" ${view===active?'aria-current="page"':''}>${T.icon(icon)}<span>${label}</span></button>`).join('');
    const phase=M.phase(state);
    document.querySelectorAll('[data-track]').forEach(el=>el.classList.toggle('active',Number(el.dataset.track)===phase));
    const tasks=M.active(state),done=tasks.filter(t=>state.done.includes(t.id)).length;
    document.querySelector('#live-lock').textContent=!state.started?'아직 시작하지 않았어요':M.complete(state)?'오늘 분량 완료 · 잠금 해제':state.apps.length?'선택한 화면은 잠긴 상태예요':'선택한 제한 화면이 없어요';
    document.querySelector('#live-progress').textContent=`오늘 ${tasks.length}개 · ${M.total(state)}분 / 인증 ${done}개`;
    document.querySelector('#live-count').textContent=`${done}/${tasks.length}`;
    document.querySelector('#outside-circle').style.strokeDashoffset=String(125.664*(1-done/tasks.length));
    document.querySelector('#live-blocked').textContent=`${M.complete(state)?'열림':state.started?'차단 중':'선택'}: ${state.apps.length?state.apps.join(' · '):'없음'}`;
    for(const task of M.DEMO_SCENARIO.tasks){
      const cell=document.querySelector(`[data-proof-row="${task.id}"] td:last-child`);
      cell.textContent=state.evidence[task.id]?`${task.proof}${state.done.includes(task.id)?' · 인증 완료':''}`:state.adjusted&&task.id==='review'?'토요일로 이동 · 아직 확인 전':'아직 확인하지 않았어요';
    }
    const ready=window.doerSignupReady?.();
    const signup=screen.querySelector('[data-result-signup]'),pending=screen.querySelector('[data-result-pending]');
    if(signup)signup.hidden=!ready;if(pending)pending.hidden=Boolean(ready);
    if(signup&&ready){signup.className='phone-primary';screen.querySelector('[data-action="records"]').className='phone-text-button';}
    if(focus)screen.querySelector('.phone-heading')?.focus({preventScroll:true});
    document.dispatchEvent(new CustomEvent('doer:state',{detail:{...snapshot(),complete:M.complete(state)}}));
    window.DoerPhoneMotion?.play(snapshot(),motionBefore);
  }
  function go(view){cancelFinding();state.view=view;toast.textContent='';render(true);window.doerTrack?.('demo_step',{view});if(view==='coach')window.doerTrack?.('coach_open');}
  function later(ms,fn){const token=++generation;timer=setTimeout(()=>{if(token===generation){timer=0;fn();}},ms);}
  const actions={
    goal:()=>{go('time');window.doerTrack?.('demo_goal_selected');},
    time:()=>{go('loading');later(700,()=>{state.view='plan';render(true);});},
    conditions:()=>go('conditions'),
    start:()=>{if(!state.confirmed)return;state.started=true;if(state.reason)M.propose(state);go('today');window.doerTrack?.('demo_start');},
    today:()=>go(M.complete(state)?'result':'today'),
    records:()=>go('records'),
    reason:()=>{M.propose(state);render(false,true);window.doerTrack?.('demo_adjust_proposed');},
    accept:()=>{cancelFinding();if(M.accept(state)){render(true);toast.textContent='변경안을 반영했어요. 완료 기록은 그대로예요.';window.doerTrack?.('adjust_accept',{adjusted:true});}},
    reject:()=>{state.proposal=false;state.rejected=true;render(false,true);window.doerTrack?.('demo_adjust_rejected');},
    lock:()=>go('lock')
  };
  screen.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.action)return actions[button.dataset.action]?.();
    if(button.dataset.find){
      const id=button.dataset.find,ms=M.requestProof(state,id);if(ms===null)return;
      render(false,true);window.doerTrack?.('demo_cert_requested',{task:id});
      later(ms,()=>{if(M.resolveProof(state,id)){render(false,true);screen.querySelector(`[data-certify="${id}"]`)?.focus();window.doerTrack?.('demo_cert_found',{task:id});}});return;
    }
    if(button.dataset.certify){
      const id=button.dataset.certify;if(!M.certify(state,id))return;
      const complete=M.complete(state);render(complete,!complete);
      if(!complete)screen.querySelector('[data-find]')?.focus();
      if(!hinted){toast.textContent='힘든 날엔 코치에서 아직 하지 않은 일을 옮길 수 있어요.';hinted=true;}
      if(complete){toast.textContent='오늘 분량을 모두 인증했어요. 잠금 해제 예시를 확인해 주세요.';window.doerTrack?.('demo_complete',{adjusted:state.adjusted});}
      window.doerTrack?.('demo_cert_confirmed',{task:id});return;
    }
    if(button.dataset.day){state.day=Number(button.dataset.day);render(false,true);}
    if(button.dataset.month){state.month=Math.max(0,Math.min(1,state.month+Number(button.dataset.month)));render(false,true);}
  });
  screen.addEventListener('change',event=>{
    const input=event.target;
    if(input.dataset.app){state.apps=input.checked?[...new Set([...state.apps,input.dataset.app])]:state.apps.filter(app=>app!==input.dataset.app);}
    if(input.id==='demo-consent'){state.confirmed=input.checked;screen.querySelector('[data-action="start"]').disabled=!state.confirmed;}
  });
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)go(button.dataset.view);});
  document.querySelector('#phone-reset')?.addEventListener('click',()=>{cancelFinding();state=M.fresh();hinted=false;toast.textContent='이번 체험을 처음부터 다시 시작해요.';render(true);});
  document.querySelectorAll('[data-open-coach]').forEach(link=>link.addEventListener('click',()=>{go('coach');M.propose(state);render(true);}));
  window.addEventListener('pagehide',cancelFinding);
  window.addEventListener('pageshow',event=>{if(event.persisted){if(state.view==='loading')state.view='plan';render();}});
  window.DoerPhone=Object.freeze({getState:snapshot});
  render();
})();
