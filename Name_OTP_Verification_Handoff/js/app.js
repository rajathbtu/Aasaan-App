const otpInputs = [...document.querySelectorAll('.otp input')];
const verifyButton = document.querySelector('#verify');
const nameInput = document.querySelector('#fullName');
const error = document.querySelector('#nameError');
const resend = document.querySelector('#resend');
const timerEl = document.querySelector('#timer');
let remaining = 26;

function otpValue(){ return otpInputs.map(input => input.value).join(''); }
function updateVerify(){ verifyButton.disabled = !(nameInput.value.trim().length > 1 && otpValue().length === 4); }
otpInputs.forEach((input,index)=>{
  input.addEventListener('input',()=>{
    input.value = input.value.replace(/\D/g,'').slice(-1);
    if(input.value && otpInputs[index+1]) otpInputs[index+1].focus();
    updateVerify();
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='Backspace' && !input.value && otpInputs[index-1]) otpInputs[index-1].focus();
  });
  input.addEventListener('paste',event=>{
    const pasted=(event.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,4);
    if(pasted){event.preventDefault();pasted.split('').forEach((digit,i)=>otpInputs[i].value=digit);otpInputs[Math.min(pasted.length,3)].focus();updateVerify();}
  });
});
nameInput.addEventListener('input',()=>{error.classList.remove('show');updateVerify();});
document.querySelector('#changeNumber').addEventListener('click',()=>alert('Open the mobile-number edit flow.'));
verifyButton.addEventListener('click',()=>{
  if(nameInput.value.trim().length<2){error.textContent='Please enter your full name.';error.classList.add('show');nameInput.focus();return;}
  if(otpValue().length!==4){return;}
  document.querySelector('#success').classList.add('show');
  document.querySelector('#success').textContent='Demo: details validated. Connect this action to your OTP verification API.';
});
const countdown=setInterval(()=>{
  if(remaining>0){remaining--;timerEl.textContent=`00:${String(remaining).padStart(2,'0')}`;}
  else{clearInterval(countdown);resend.disabled=false;timerEl.textContent='';}
},1000);
resend.addEventListener('click',()=>{remaining=26;resend.disabled=true;timerEl.textContent='00:26';otpInputs.forEach(input=>input.value='');otpInputs[0].focus();updateVerify();});
updateVerify();
