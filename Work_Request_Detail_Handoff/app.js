const list=document.querySelector('.provider-list');
const filters=[...document.querySelectorAll('.filter')];
const original=[...document.querySelectorAll('.provider')];
filters.forEach(button=>button.addEventListener('click',()=>{
  filters.forEach(item=>item.classList.toggle('active',item===button));
  const mode=button.dataset.sort;
  const sorted=[...original];
  if(mode==='rating') sorted.sort((a,b)=>Number(b.dataset.rating)-Number(a.dataset.rating));
  if(mode==='nearby') sorted.sort((a,b)=>Number(a.dataset.distance)-Number(b.dataset.distance));
  if(mode==='fast') sorted.sort((a,b)=>Number(a.dataset.response)-Number(b.dataset.response));
  sorted.forEach(card=>list.appendChild(card));
}));
document.querySelectorAll('.accept').forEach(button=>button.addEventListener('click',()=>{
  button.innerHTML='Accepted';button.classList.add('accepted');button.disabled=true;
}));
document.querySelectorAll('[data-action],.boost-cta,.profile').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.action || (button.classList.contains('profile')?'profile':'boost');
  alert('Prototype only: connect '+action+' to the existing Aasaanly app route/API.');
}));
document.querySelector('.back').addEventListener('click',()=>history.back());
