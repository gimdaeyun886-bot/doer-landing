(() => {
  'use strict';
  const config=window.DoerConfig,form=document.querySelector('#signup-form');
  if(!config||!form)return;
  const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasAddress=/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(config.endpoint);
  const ready=window.doerSignupReady();
  for(const link of document.querySelectorAll('[data-signup-link]'))link.hidden=!ready;
  for(const note of document.querySelectorAll('[data-signup-note]'))note.hidden=!ready;
  const headerDemo=document.querySelector('[data-header-demo]');
  headerDemo.hidden=ready;
  if(hasAddress){headerDemo.href='#signup';headerDemo.textContent='베타 알림 신청하기';} // Pending block remains the honest destination until verified.
  for(const pending of document.querySelectorAll('.signup-pending'))pending.hidden=ready;
  form.hidden=!ready;
  document.querySelector('#signup').classList.toggle('is-pending',!ready);
  for(const el of document.querySelectorAll('[data-operator]'))el.textContent=config.operator;
  for(const el of document.querySelectorAll('[data-contact]')){el.textContent=config.contact;if(emailPattern.test(config.contact))el.href=`mailto:${config.contact}`;}
  const button=form.querySelector('[type=submit]'),feedback=document.querySelector('#signup-feedback');
  let begun=false;
  form.addEventListener('focusin',()=>{if(!begun&&ready){begun=true;window.doerTrack?.('lead_start');}});
  document.addEventListener('click',event=>{if(ready&&event.target.closest('a[href="#signup"]'))requestAnimationFrame(()=>form.elements.email.focus({preventScroll:true}));});
  let busy=false,attempt=null;
  function newId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now().toString(36)}-${Array.from(crypto.getRandomValues(new Uint32Array(4))).map(n=>n.toString(36)).join('-')}`;}
  function payload(){return {email:form.elements.email.value.trim().toLowerCase(),device:form.elements.device.value,exam:form.elements.exam.value.trim(),interview:form.elements.interview.checked,consent:form.elements.consent.checked,consentVersion:config.consentVersion};}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||busy)return;
    const data=payload();
    const emailValid=data.email.length<=254&&emailPattern.test(data.email),consentValid=data.consent;
    document.querySelector('#email-error').textContent=emailValid?'':'이메일 주소를 확인해 주세요.';
    document.querySelector('#consent-error').textContent=consentValid?'':'개인정보 수집·이용 동의가 필요해요.';
    form.elements.email.setAttribute('aria-invalid',String(!emailValid));form.elements.consent.setAttribute('aria-invalid',String(!consentValid));
    if(!emailValid||!consentValid){(!emailValid?form.elements.email:form.elements.consent).focus();return;}
    const signature=JSON.stringify(data);
    if(!attempt||attempt.signature!==signature)attempt={signature,id:newId()};
    busy=true;button.disabled=true;button.textContent='신청을 보내고 있어요';form.setAttribute('aria-busy','true');feedback.textContent='';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    window.doerTrack?.('lead_submit',{device:data.device});
    try {
      const response=await fetch(config.endpoint,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...data,requestId:attempt.id}),signal:controller.signal});
      if(!response.ok)throw new Error('HTTP response');
      const result=await response.json();
      if(result.ok!==true||result.stored!==true||result.requestId!==attempt.id||typeof result.duplicate!=='boolean')throw new Error('Unconfirmed result');
      feedback.textContent=result.duplicate?'이미 신청한 이메일이에요. 새 행을 추가하지 않았어요.':'신청을 받았어요. 베타가 준비되면 이메일로 알려드릴게요.';
      if(!result.duplicate&&data.interview)feedback.textContent+=' 인터뷰 일정도 이 이메일로 연락드릴게요.';
      button.textContent='신청 확인 완료';button.disabled=true;
      [...form.elements].forEach(el=>{el.disabled=true;});
      window.doerTrack?.('lead_success',{duplicate:result.duplicate,device:data.device});
    } catch(error) {
      feedback.replaceChildren(document.createTextNode('잠시 뒤 다시 시도해 주세요. 문의: '));
      const contact=document.createElement('a');contact.href=`mailto:${config.contact}`;contact.textContent=config.contact;feedback.append(contact);
      button.disabled=false;button.textContent='베타 알림 신청하기';
      // Preserve all fields and the same requestId: a timed-out write may have succeeded.
      window.doerTrack?.('lead_error');
    } finally {clearTimeout(timeout);busy=false;form.removeAttribute('aria-busy');}
  });
})();
