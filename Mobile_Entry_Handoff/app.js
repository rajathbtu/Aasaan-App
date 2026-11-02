
const input=document.querySelector('#mobile');
const send=document.querySelector('#send');
const helper=document.querySelector('#helper');
const toast=document.querySelector('#toast');
const langBtn=document.querySelector('#language');
const langMenu=document.querySelector('#language-menu');
input.addEventListener('input',()=>{
  input.value=input.value.replace(/\D/g,'').slice(0,10);
  helper.textContent='';
  toast.classList.remove('show');
});
send.addEventListener('click',()=>{
  const value=input.value.trim();
  if(!/^[6-9]\d{9}$/.test(value)){
    helper.textContent=value.length!==10?'Enter a valid 10-digit mobile number.':'Enter a valid Indian mobile number.';
    input.focus();return;
  }
  toast.textContent='Mobile number validated. Connect this action to your existing OTP service.';
  toast.classList.add('show');
});
langBtn.addEventListener('click',()=>langMenu.classList.toggle('open'));
langMenu.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  langBtn.querySelector('.language-name').textContent=b.dataset.language;
  langMenu.classList.remove('open');
}));
document.addEventListener('click',e=>{
  if(!langMenu.contains(e.target)&&!langBtn.contains(e.target))langMenu.classList.remove('open');
});
