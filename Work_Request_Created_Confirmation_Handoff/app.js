function fitCanvas(){const scale=Math.min(window.innerWidth/1024,1);document.getElementById('screen').style.setProperty('--scale',scale);document.querySelector('.viewport').style.height=(1536*scale)+'px';}fitCanvas();window.addEventListener('resize',fitCanvas);
document.getElementById('share').addEventListener('click',async()=>{const data={title:'Aasaanly Work Request',text:'My service request has been created on Aasaanly.'};if(navigator.share){try{await navigator.share(data)}catch(e){}}else{alert('Connect this action to the native share sheet in the app.')}});
document.getElementById('view').addEventListener('click',()=>alert('Prototype only — connect to the existing My Requests route.'));
document.getElementById('boost').addEventListener('click',()=>alert('Prototype only — connect to the existing Boost Request route.'));
document.querySelector('.close').addEventListener('click',()=>alert('Prototype only — connect to the existing close/navigation behavior.'));
