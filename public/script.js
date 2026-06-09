let user=null,tasks=[],eid=null,view='dash',fstat='all',srt='created',sq='';

function isReg(){return document.getElementById('name-row').style.display!=='none'}
function swapAuth(){
  const r=isReg();
  document.getElementById('name-row').style.display=r?'none':'block';
  document.getElementById('a-title').textContent=r?'Sign in':'Create account';
  document.getElementById('a-sub').textContent=r?'Pick up where you left off.':'Start organising your work.';
  document.querySelector('.btn-main').textContent=r?'Sign in':'Create account';
  document.getElementById('a-switch').innerHTML=r?'No account? <a onclick="swapAuth()">Create one</a>':'Have an account? <a onclick="swapAuth()">Sign in</a>';
}

async function doAuth(){
  const e=document.getElementById('a-email').value.trim();
  const p=document.getElementById('a-pass').value;
  const n=document.getElementById('a-name').value.trim();
  if(!e||!p){toast('Fill in all fields','err');return;}
  
  const endpoint = isReg() ? '/api/register' : '/api/login';
  const body = isReg() ? {e,p,n} : {e,p};
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if(data.success){
      user = data.user;
      toast(isReg() ? 'Account created!' : 'Welcome back, '+user.n.split(' ')[0]+'!','ok');
      await fetchTasks();
      
      document.getElementById('auth').style.display='none';
      document.getElementById('main').style.display='flex';
      document.getElementById('uname').textContent=user.n;
      document.getElementById('uav').textContent=user.n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      render();startRT();
    } else {
      toast(data.message, 'err');
    }
  } catch(err){
    toast('Error connecting to server', 'err');
  }
}

async function fetchTasks() {
  if (!user) return;
  try {
    const res = await fetch('/api/tasks?email=' + encodeURIComponent(user.e));
    const data = await res.json();
    tasks = data.tasks || [];
  } catch(err) {
    toast('Error fetching tasks', 'err');
  }
}

function logout(){user=null;tasks=[];document.getElementById('main').style.display='none';document.getElementById('auth').style.display='flex';toast('Signed out','inf');}

function go(v,el){
  view=v;fstat='all';sq='';document.getElementById('sq').value='';
  document.querySelectorAll('.sb-item').forEach(x=>x.classList.remove('on'));
  if(el)el.classList.add('on');
  const T={dash:'Dashboard',all:'All tasks',board:'Board',today:'Due today',high:'High priority',overdue:'Overdue'};
  document.getElementById('pg-title').textContent=T[v]||v;
  render();
}

function filtered(){
  let list=[...tasks];
  const td=new Date().toISOString().split('T')[0];
  if(view==='today') list=list.filter(t=>t.due===td);
  else if(view==='high') list=list.filter(t=>t.priority==='high');
  else if(view==='overdue') list=list.filter(t=>t.due&&t.due<td&&!t.done);
  if(fstat!=='all') list=list.filter(t=>t.status===fstat);
  if(sq) list=list.filter(t=>(t.title+t.desc+t.tag).toLowerCase().includes(sq));
  if(srt==='due') list.sort((a,b)=>(a.due||'9999')>(b.due||'9999')?1:-1);
  else if(srt==='priority'){const p={high:0,medium:1,low:2};list.sort((a,b)=>p[a.priority]-p[b.priority]);}
  else list.sort((a,b)=>b.created-a.created);
  return list;
}

function setF(s){fstat=s;render();}
function setSrt(s){srt=s;render();}
function qSearch(v){sq=v.toLowerCase();render();}

function render(){
  badge();
  const pg=document.getElementById('pg');
  if(view==='dash') pg.innerHTML=rDash();
  else if(view==='board') pg.innerHTML=rBoard();
  else pg.innerHTML=rList();
}

function rDash(){
  const total=tasks.length,done=tasks.filter(t=>t.done).length;
  const inprog=tasks.filter(t=>t.status==='inprogress').length;
  const hi=tasks.filter(t=>t.priority==='high'&&!t.done).length;
  const td=new Date().toISOString().split('T')[0];
  const od=tasks.filter(t=>t.due&&t.due<td&&!t.done).length;
  const pct=total?Math.round(done/total*100):0;
  const rec=tasks.slice().sort((a,b)=>b.created-a.created).slice(0,5);
  return `<div class="stats">
    <div class="stat"><div class="stat-lbl">Total tasks</div><div class="stat-val">${total}</div><div class="stat-sub">all time</div></div>
    <div class="stat"><div class="stat-lbl">Completed</div><div class="stat-val" style="color:#3B6D11">${done}</div><div class="stat-sub">${pct}%</div></div>
    <div class="stat"><div class="stat-lbl">In progress</div><div class="stat-val" style="color:#185FA5">${inprog}</div></div>
    <div class="stat"><div class="stat-lbl">High priority</div><div class="stat-val" style="color:#A32D2D">${hi}</div><div class="stat-sub">${od} overdue</div></div>
  </div>
  <div class="prog-card">
    <div class="prog-hd"><span>Overall progress</span><span style="color:var(--color-text-secondary);font-weight:400">${pct}% complete</span></div>
    <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
  </div>
  <div class="sec-lbl">Recent</div>
  <div class="task-list">${rec.map(tc).join('')||empty('No tasks yet','Click New task to get started')}</div>`;
}

function rList(){
  const list=filtered();
  const lbl={all:'All',todo:'To do',inprogress:'In progress',done:'Done',blocked:'Blocked'};
  return `<div class="filters">
    ${['all','todo','inprogress','done','blocked'].map(s=>`<button class="fbtn ${fstat===s?'on':''}" onclick="setF('${s}')">${lbl[s]}</button>`).join('')}
    <select class="sort-sel" onchange="setSrt(this.value)">
      <option value="created" ${srt==='created'?'selected':''}>Newest</option>
      <option value="due" ${srt==='due'?'selected':''}>Due date</option>
      <option value="priority" ${srt==='priority'?'selected':''}>Priority</option>
    </select>
  </div>
  <div class="task-list">${list.map(tc).join('')||empty('No tasks found','Adjust your filters or search query')}</div>`;
}

function rBoard(){
  const cols=[{k:'todo',l:'To do',i:'circle'},{k:'inprogress',l:'In progress',i:'progress'},{k:'done',l:'Done',i:'circle-check'},{k:'blocked',l:'Blocked',i:'ban'}];
  return `<div class="board">${cols.map(c=>{
    const items=tasks.filter(t=>t.status===c.k);
    return `<div class="bcol">
      <div class="bcol-hd"><span class="bcol-title"><i class="ti ti-${c.i}" aria-hidden="true"></i>${c.l}</span><span class="bcol-cnt">${items.length}</span></div>
      ${items.map(t=>`<div class="btask" onclick="openM(${t.id})">
        <div class="btask-title">${x(t.title)}</div>
        <div class="btask-ft"><span class="pill p-${t.priority}">${t.priority}</span>${t.due?`<span style="font-size:10px;color:var(--color-text-tertiary)">${t.due}</span>`:''}</div>
      </div>`).join('')||`<div class="bempty">Empty</div>`}
    </div>`;
  }).join('')}</div>`;
}

const SL={todo:'To do',inprogress:'In progress',done:'Done',blocked:'Blocked'};
function tc(t){
  const td=new Date().toISOString().split('T')[0];
  const od=t.due&&t.due<td&&!t.done;
  return `<div class="tcard ${t.done?'done':''}">
    <div class="tc-check ${t.done?'ck':''}" onclick="chk(${t.id},event)" role="checkbox" aria-checked="${t.done}">${t.done?'<i class="ti ti-check"></i>':''}</div>
    <div class="tc-body" onclick="openM(${t.id})">
      <div class="tc-title">${x(t.title)}</div>
      ${t.desc?`<div class="tc-desc">${x(t.desc)}</div>`:''}
      <div class="tc-meta">
        <span class="pill p-${t.priority}">${t.priority}</span>
        <span class="pill p-${t.status}">${SL[t.status]}</span>
        ${t.tag?`<span class="chip">${x(t.tag)}</span>`:''}
        ${t.due?`<span class="tc-date ${od?'od':''}"><i class="ti ti-calendar" aria-hidden="true"></i>${t.due}</span>`:''}
        ${t.assignee?`<span class="tc-date"><i class="ti ti-user" aria-hidden="true"></i>${x(t.assignee)}</span>`:''}
      </div>
    </div>
    <div class="tc-acts">
      <button class="ib" onclick="openM(${t.id})" aria-label="Edit"><i class="ti ti-edit"></i></button>
      <button class="ib" onclick="del(${t.id},event)" aria-label="Delete"><i class="ti ti-trash"></i></button>
    </div>
  </div>`;
}

function empty(t,s){return`<div class="empty"><i class="ti ti-clipboard-list"></i><p>${t}</p><small>${s}</small></div>`;}
function x(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function openM(id){
  eid=id||null;
  const t=id?tasks.find(z=>z.id===id):null;
  document.getElementById('m-title').textContent=id?'Edit task':'New task';
  document.getElementById('f-t').value=t?t.title:'';
  document.getElementById('f-d').value=t?t.desc:'';
  document.getElementById('f-p').value=t?t.priority:'medium';
  document.getElementById('f-s').value=t?t.status:'todo';
  document.getElementById('f-du').value=t?t.due:'';
  document.getElementById('f-tg').value=t?t.tag:'';
  document.getElementById('f-as').value=t?t.assignee:'';
  document.getElementById('m-foot').innerHTML=id?
    `<button class="btn-del" onclick="del(${id},null,true)">Delete</button><div class="sp"></div><button class="btn-sec" onclick="closeM()">Cancel</button><button class="btn-pur" onclick="saveT()">Save</button>`:
    `<button class="btn-sec" onclick="closeM()">Cancel</button><div class="sp"></div><button class="btn-pur" onclick="saveT()">Create task</button>`;
  document.getElementById('modal-wrap').style.display='block';
  setTimeout(()=>document.getElementById('f-t').focus(),40);
}

function closeM(){document.getElementById('modal-wrap').style.display='none';eid=null;}
function backdropClose(e){if(e.target.classList.contains('modal-layer'))closeM();}

async function saveT(){
  const title=document.getElementById('f-t').value.trim();
  if(!title){toast('Title is required','err');return;}
  const d={title,desc:document.getElementById('f-d').value.trim(),priority:document.getElementById('f-p').value,status:document.getElementById('f-s').value,due:document.getElementById('f-du').value,tag:document.getElementById('f-tg').value.trim(),assignee:document.getElementById('f-as').value.trim(),done:document.getElementById('f-s').value==='done',owner:user.e};
  
  try {
    if(eid){
      const res = await fetch('/api/tasks/'+eid, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(d)
      });
      const data = await res.json();
      if(data.success) {
        const i=tasks.findIndex(t=>t.id===eid);tasks[i]={...tasks[i],...data.task};toast('Task updated','ok');
      } else {
        toast('Failed to update task', 'err'); return;
      }
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(d)
      });
      const data = await res.json();
      if(data.success) {
        tasks.unshift(data.task); toast('Task created','ok');
      } else {
        toast('Failed to create task', 'err'); return;
      }
    }
    closeM();render();
  } catch(e) {
    toast('Error saving task', 'err');
  }
}

async function del(id,e,fromM){
  if(e)e.stopPropagation();
  try {
    const res = await fetch('/api/tasks/'+id, {method: 'DELETE'});
    const data = await res.json();
    if(data.success){
      tasks=tasks.filter(t=>t.id!==id);
      if(fromM)closeM();
      toast('Task deleted','inf');render();
    } else {
      toast('Failed to delete task', 'err');
    }
  } catch(err) {
    toast('Error deleting task', 'err');
  }
}

async function chk(id,e){
  e.stopPropagation();
  const t=tasks.find(z=>z.id===id);
  const done = !t.done;
  const status = done?'done':(t.status==='done'?'todo':t.status);
  
  try {
    const res = await fetch('/api/tasks/'+id, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({done, status})
    });
    const data = await res.json();
    if(data.success) {
      t.done = done; t.status = status;
      toast(t.done?'Marked done':'Moved to to do','ok');render();
    } else {
      toast('Failed to update task status', 'err');
    }
  } catch(err) {
    toast('Error updating task', 'err');
  }
}

function badge(){document.getElementById('nb').textContent=tasks.filter(t=>!t.done).length;}

function toast(msg,type='inf'){
  const icons={ok:'ti-circle-check',err:'ti-alert-circle',inf:'ti-info-circle'};
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<i class="ti ${icons[type]}" aria-hidden="true"></i>${msg}`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(),3200);
}

function startRT(){
  const msgs=['Alex Kim completed "Design review"','New task assigned to you','Deploy pipeline passed','2 tasks due tomorrow','Jamie R started user interviews'];
  let i=0;
  setInterval(()=>{if(i<msgs.length&&Math.random()>.55)toast(msgs[i++],'inf');},9000);
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeM();});
document.getElementById('a-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth();});
