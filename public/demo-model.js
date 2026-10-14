/* Pure, testable state. No upload, lock API, AI call, or storage of personal data. */
(function(root,factory){const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api;else root.DoerDemo=api;})(globalThis,()=>{
  'use strict';
  const DEMO_SCENARIO=Object.freeze({
    goal:'퇴근 후 정보처리기사 공부를 하고 싶어',time:'오늘은 45분 정도 할 수 있어',
    reason:'오늘 야근해서 30분밖에 못 하겠어.',start:'2026-10-01',end:'2026-11-11',days:42,lectures:18,
    today:1,saturday:3,weekMinutes:Object.freeze([45,45,45,45,45,45,45]),weekNames:Object.freeze(['월','화','수','목','금','토','일']),
    tasks:Object.freeze([
      Object.freeze({id:'lecture',name:'강의 1개 듣기',minutes:20,proof:'수강 완료 화면 캡처',reason:'강의명과 완료 표시, 진행률을 함께 확인할 수 있어요.',icon:'screen'}),
      Object.freeze({id:'note',name:'핵심 내용 정리',minutes:10,proof:'정리 노트 사진',reason:'오늘 강의의 핵심 내용을 정리한 흔적을 확인할 수 있어요.',icon:'book'}),
      Object.freeze({id:'review',name:'복습 문제 5개',minutes:15,proof:'풀이·채점 사진',reason:'다섯 문제를 풀고 채점한 흔적을 함께 확인할 수 있어요.',icon:'camera'})
    ])
  });
  const fresh=()=>({view:'goal',started:false,confirmed:false,apps:['릴스','쇼츠','스토리'],done:[],evidence:{},adjusted:false,reason:false,proposal:false,rejected:false,finding:null,ready:null,findCount:0,month:0,day:1});
  const active=s=>DEMO_SCENARIO.tasks.filter(t=>!s.adjusted||t.id!=='review');
  const complete=s=>s.started&&active(s).every(t=>s.done.includes(t.id));
  const total=s=>active(s).reduce((n,t)=>n+t.minutes,0);
  const phase=s=>complete(s)?3:s.started?2:s.view==='conditions'?1:0;
  function requestProof(s,id){
    if(!s.started||s.finding||s.done.includes(id)||!active(s).some(t=>t.id===id))return null;
    s.finding=id;s.ready=null;return s.findCount++===0?1000:700;
  }
  function resolveProof(s,id){if(s.finding!==id)return false;s.finding=null;s.ready=id;s.evidence[id]='found';return true;}
  function certify(s,id){
    if(!s.started||s.ready!==id||s.done.includes(id)||!active(s).some(t=>t.id===id))return false;
    s.done.push(id);s.evidence[id]='confirmed';s.ready=null;if(complete(s))s.view='result';return true;
  }
  function accept(s){
    if(!s.started||!s.proposal||s.done.includes('review')||s.adjusted)return false;
    s.adjusted=true;s.proposal=false;s.finding=null;s.ready=null;s.view=complete(s)?'result':'today';return true;
  }
  function propose(s){if(s.done.includes('review'))return false;s.reason=true;s.rejected=false;s.proposal=s.started&&!s.adjusted;return s.proposal;}
  function week(adjusted=true){return DEMO_SCENARIO.weekMinutes.map((before,i)=>({name:DEMO_SCENARIO.weekNames[i],before,after:adjusted?(i===3?30:i===5?60:before):before,changed:adjusted&&(i===3||i===5)}));}
  function dayTasks(s,day){
    if(day===1)return active(s).map(t=>({name:t.name,minutes:t.minutes}));
    const lectureDay=Math.ceil(day*18/42)>Math.ceil((day-1)*18/42);
    const items=[{name:lectureDay?'다음 강의 듣기':'핵심 개념 복습',minutes:20},{name:'핵심 정리',minutes:10},{name:'복습 문제',minutes:15}];
    if(day===3&&s.adjusted)items.push({name:'옮긴 복습 문제 5개',minutes:15});
    return items;
  }
  return {DEMO_SCENARIO,fresh,active,complete,total,phase,requestProof,resolveProof,certify,accept,propose,week,dayTasks};
});
