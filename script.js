document.addEventListener('DOMContentLoaded', ()=>{
  const totalFlowers = 15; // 花瓣數量
  for(let i=0; i<totalFlowers; i++){
    const f = document.createElement('span');
    f.className = 'float';
    f.textContent = '🌸';
    f.style.left = `${Math.random()*100}%`;
    f.style.animationDuration = `${8 + Math.random()*6}s`;
    f.style.animationDelay = `${Math.random()*6}s`;
    f.style.bottom = `${-Math.random()*10}vh`;
    document.body.appendChild(f);
  }
});
