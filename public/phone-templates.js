(() => {
  'use strict';
  const M=window.DoerDemo,S=M.DEMO_SCENARIO;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const primary=(text,action)=>`<button type="button" class="phone-primary" data-action="${action}">${text} ${icon('arrow')}</button>`;
  const heading=(text,phase)=>`<h3 class="phone-heading" tabindex="-1">${text}</h3><p class="demo-phase">${phase}</p>`;
  const fine='<p class="phone-fine">준비된 예시예요. 실제 AI 상담·차단·업로드는 하지 않아요.</p>';
  function preview(id) {
    if(id==='lecture')return `<div class="proof-preview proof-lecture" aria-label="강의 완료 화면 예시"><header><b>기본 개념 1강</b><span>수강 기록</span></header><div class="lecture-poster">${icon('play')} 소프트웨어 설계</div><div class="lecture-complete"><b>수강 완료</b><span>100%</span></div><div class="lecture-bar"></div><small>시연용 화면 · 20분 강의</small></div>`;
    if(id==='note')return `<div class="proof-preview proof-notes" aria-label="핵심 정리 노트 사진 예시"><header><b>1강 · 핵심 정리</b><span>10월 1일</span></header><p><b>요구사항</b> · 무엇을 만들지 먼저 정리</p><p><b>응집도</b> · 모듈 안의 역할은 가깝게</p><p><b>결합도</b> · 모듈 사이 의존은 낮게</p><small>시연용 노트 · 사진 자료를 표현한 예시</small></div>`;
    return `<div class="proof-preview proof-review" aria-label="다섯 문제 풀이와 채점 사진 예시"><header><b>1강 복습 · 5문제</b><span>풀이 + 채점</span></header><ol><li>요구사항 구분 — 정답</li><li>모듈의 역할 — 정답</li><li>응집도 비교 — 정답</li><li>결합도 비교 — 정답</li><li>설계 순서 — 오답 / 다시 확인</li></ol><footer>5개 풀이 확인 · 4/5 정답 · 시연용 자료</footer></div>`;
  }
  function calendar(s) {
    const month=9+s.month,first=new Date(2026,month,1),last=new Date(2026,month+1,0).getDate();
    let cells=['일','월','화','수','목','금','토'].map(d=>`<span>${d}</span>`).join('');
    cells+='<span aria-hidden="true"></span>'.repeat(first.getDay());
    for(let date=1;date<=last;date++){
      const day=Math.round((Date.UTC(2026,month,date)-Date.UTC(2026,9,1))/864e5)+1;
      cells+=day>=1&&day<=42?`<button type="button" data-day="${day}" aria-label="${month+1}월 ${date}일${day===3&&s.adjusted?' · 복습 15분 이동':''}" aria-pressed="${s.day===day}" class="${day===3&&s.adjusted?'moved-day':''}"><span>${date}</span>${day===3&&s.adjusted?'<small>+15분</small>':''}</button>`:`<span>${date}</span>`;
    }
    const date=new Date(2026,9,s.day),items=M.dayTasks(s,s.day);
    return `<div class="calendar-toolbar"><strong>2026년 ${month+1}월</strong><div><button type="button" data-month="-1" aria-label="이전 달" ${s.month===0?'disabled':''}>${icon('arrow')}</button><button type="button" data-month="1" aria-label="다음 달" ${s.month===1?'disabled':''}>${icon('arrow')}</button></div></div><div class="demo-calendar" role="group" aria-label="6주 날짜별 계획">${cells}</div><div class="selected-day"><b>${date.getMonth()+1}월 ${date.getDate()}일 · ${items.reduce((n,t)=>n+t.minutes,0)}분</b>${items.map(t=>`<p>${esc(t.name)} · ${t.minutes}분</p>`).join('')}</div>`;
  }
  function task(s,t) {
    const done=s.done.includes(t.id),finding=s.finding===t.id,ready=s.ready===t.id;
    return `<li class="demo-task" data-task-card="${t.id}"><div class="task-top"><span>${done?icon('check'):''}</span><h4>${t.name}</h4><small>${t.minutes}분</small></div>${done?'<p class="task-done">인증 완료</p>':finding?`<div class="proof-finding" role="status">${icon('coach')} 맞춤 인증 방법을 찾고 있어요</div>`:ready?`<div class="proof-result"><b class="phone-fine">${icon(t.icon)} ${t.proof}</b>${preview(t.id)}<p>${t.reason}</p><button type="button" data-certify="${t.id}">이 예시 자료로 인증하기</button></div>`:`<button type="button" data-find="${t.id}" ${s.finding?'disabled':''}>끝낸 일 인증하기</button>`}</li>`;
  }
  function today(s) {
    if(!s.started)return heading('시작 조건을<br>먼저 확인해요.','2/4 · 시작 준비')+primary('시작 조건 확인하기','conditions')+fine;
    const active=M.active(s),done=active.filter(t=>s.done.includes(t.id)).length;
    return heading(s.adjusted?'오늘은 30분,<br>여기까지 해봐요.':'오늘은 45분,<br>세 가지만 끝내봐요.','3/4 · 오늘 할 일')+`<p class="lock-state">${icon(M.complete(s)?'unlock':'lock')} ${M.complete(s)?'오늘 분량 완료 · 잠금 해제':s.apps.length?'선택한 화면 잠김 · 인증 후 해제':'선택한 제한 화면 없음'}${s.apps.length&&!M.complete(s)?'<button type="button" class="lock-link" data-action="lock">보기</button>':''}</p><div class="demo-progress"><span>인증 완료</span><b>${done}/${active.length}</b></div><div class="demo-progress-track"><i style="--progress:${done/active.length*100}%"></i></div><ul class="demo-tasks">${active.map(t=>task(s,t)).join('')}</ul>${s.adjusted?'<p class="phone-fine">복습 15분은 토요일에 남겨뒀어요.</p>':''}${fine}`;
  }
  function coach(s) {
    const immutable=s.done.includes('review');
    let content=heading('버거운 날엔,<br>계획을 다시 봐요.','이번 체험의 코치')+'<p>완료한 일과 기록은 그대로 두고, 아직 하지 않은 일만 옮겨요.</p>';
    if(immutable)return content+`<div class="demo-coach"><b>아직 하지 않은 복습을 옮기는 예시예요</b><p>오늘 45분 → 30분, 토요일 45분 → 60분.</p><small>복습을 이미 끝냈으므로 읽기 전용이에요. 완료 기록과 상태는 바꾸지 않아요.</small></div>`+fine;
    if(!s.reason)return content+`<button type="button" class="demo-prompt" data-action="reason">${S.reason}</button>`+fine;
    content+=`<div class="demo-user">${S.reason}</div>`;
    if(s.adjusted)return content+'<div class="demo-coach">수락한 변경안을 반영했어요. 복습 15분은 토요일 계획에 남아 있고, 완료한 일은 그대로예요.</div>'+primary('오늘 할 일 보기','today');
    if(s.rejected)return content+'<div class="demo-coach">원래 계획을 유지했어요. 오늘 할 일과 기록은 바뀌지 않았어요.</div>'+primary('오늘 할 일 보기','today');
    return content+`<div class="demo-coach"><b>복습 문제 5개를 토요일로 옮길까요?</b><p>오늘 45분 → 30분<br>토요일 45분 → 60분</p><p>강의 18개와 정리·복습 범위, 시험일 11월 11일은 그대로예요. 오늘은 강의와 정리 2개를 모두 인증하면 끝나요.</p><small>토요일 부담이 15분 늘어요. 준비된 응답이며 자동으로 바꾸지 않아요.</small></div>${s.started?primary('변경 내용 확인하고 수락하기','accept')+'<button type="button" class="phone-text-button" data-action="reject">원래 계획을 유지할게요</button>':primary('시작 조건부터 확인하기','conditions')}${fine}`;
  }
  function goal(){return `<img src="assets/original-wordmark.png" width="82" height="24" alt="do-er"><div class="demo-avatar">${icon('coach')}</div>${heading('퇴근 후의 공부,<br>어디서 시작할까요?','준비된 예시 중에서 골라보세요')}<p>시험까지 6주, 남은 강의는 18개.<br>오늘 할 공부부터 정해봐요.</p><button type="button" class="demo-prompt" data-action="goal">${S.goal}</button>${fine}`;}
  function time(){return heading('오늘은 얼마나<br>시간을 낼 수 있나요?','준비된 예시 중에서 골라보세요')+`<div class="demo-user">${S.goal}</div><button type="button" class="demo-prompt" data-action="time">${S.time}</button>`+fine;}
  function loading(){return heading('전체 계획을<br>오늘 할 일로 나누고 있어요.','예시 계획 불러오는 중')+`<div class="proof-finding" role="status">${icon('coach')} 6주 계획을 준비할게요</div>`+fine;}
  function plan(s){return heading('6주 계획에서,<br>오늘 세 가지.','1/4 · 전체 계획')+'<p>10월 1일 시작 · 11월 11일 시험<br>강의 18개 + 정리·복습 · 하루 45분 예시</p>'+calendar(s)+primary(s.started?'오늘 할 일 보기':'이 계획으로 시작하기',s.started?'today':'conditions')+fine;}
  function conditions(s){return heading('오늘의 약속을<br>확인해 주세요.','2/4 · 시작 조건')+`<p>강의 20분 · 정리 10분 · 복습 15분<br>모든 과제를 인증하면 선택한 화면이 열려요.</p><p class="phone-fine">인증 방법은 과제를 끝냈을 때 코치가 정해요.</p><fieldset class="start-apps"><legend>잠글 화면</legend>${['릴스','쇼츠','스토리','게임'].map(app=>`<label><input type="checkbox" data-app="${app}" ${s.apps.includes(app)?'checked':''}>${app}</label>`).join('')}</fieldset><p class="phone-fine">인강·유튜브 강의·검색·메신저·전화는 남겨두는 설계예요. 실제 기기를 잠그지 않아요.</p><label class="start-confirm"><input id="demo-consent" type="checkbox" ${s.confirmed?'checked':''}> 오늘 분량과 선택한 화면의 해제 조건을 확인했어요.</label><p id="start-error" role="status"></p><button type="button" class="phone-primary" data-action="start" ${s.confirmed?'':'disabled'}>오늘 공부 시작하기 ${icon('arrow')}</button>`;}
  function lock(s){return `<div class="phone-lock-screen">${heading('오늘 할 일을 마치면<br>다시 열려요.','선택한 화면의 잠금 예시')}<div class="phone-lock-hero">${icon('lock')}</div><p class="phone-muted">${s.apps.map(esc).join(' · ')}<br>필수 과제 인증이 끝날 때까지 잠긴 상태예요.</p>${primary('오늘 할 일로 돌아가기','today')}${fine}</div>`;}
  function records(s){return heading('내가 끝낸 일은,<br>그대로 남아 있어요.','이번 체험의 기록')+(s.done.length?s.done.map(id=>{const t=S.tasks.find(t=>t.id===id);return `<div class="demo-record">${icon('check')} ${t.name}<small>${t.proof} · 인증 완료</small></div>`;}).join(''):'<p>아직 완료한 일이 없어요. 오늘 할 일을 인증하면 여기에 남아요.</p>')+(s.adjusted?'<div class="demo-record adjusted">복습 15분 → 토요일<small>조정 기록 · 완료 기록과 구분해요</small></div>':'')+primary('오늘 할 일 보기','today')+fine;}
  function result(s){return `<div class="demo-success">${icon('unlock')}${heading('오늘의 공부 끝.<br>이제 편히 쉬세요.','4/4 · 인증 완료')}<p>${s.adjusted?'조정한 2개':'약속한 3개'} 과제를 모두 인증했어요.<br>${s.apps.length?'선택한 화면이 다시 열리는 예시예요.':'화면 제한 없이 오늘 분량을 마쳤어요.'}</p><div class="demo-chips">${s.apps.map(app=>`<span>${esc(app)} · 열림</span>`).join('')}</div><a class="phone-primary" href="#adjust" data-adjust-result>힘든 날엔 어떻게 조정되는지 보기 ${icon('arrow')}</a><a class="phone-primary" href="#signup" data-result-signup hidden>베타 알림 신청하기</a><button type="button" class="phone-text-button" data-action="records">오늘의 기록 보기</button><p class="phone-fine" data-result-pending>베타 신청은 곧 열려요</p></div>${fine}`;}
  const views={goal,time,loading,plan,conditions,today,coach,lock,records,result};
  function render(s){return `<div class="demo-view" data-view="${s.view}">${views[s.view](s)}</div>`;}
  window.DoerPhoneTemplates={render,preview,icon};
})();
