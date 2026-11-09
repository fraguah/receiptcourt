import './style.css';
const $=s=>document.querySelector(s);
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=x=>x?x.slice(0,10)+'…'+x.slice(-6):'pending';
const explorer='https://explorer-studio.genlayer.com';
let trace,kind='bad';

$('#app').innerHTML=`<header><a class="wordmark" href="#">Receipt<span>Court</span><i></i></a><nav><a href="#evidence">The case</a><a href="#reproduce">Reproduce</a><a href="https://github.com/fraguah/receiptcourt" target="_blank" rel="noreferrer">Source </a></nav><span class="labmark">PARTNER DEMO LAB / 01</span></header>
<main><section class="hero"><div class="eyebrow"><span class="dot"></span> INTERNET COURT × x402 × GENLAYER</div><div class="hero-grid"><h1>Paid does not<br>mean <em>delivered.</em></h1><div class="hero-aside"><p>An agent bought a research report.<br>The payment worked.<br><strong>The answer didn’t.</strong></p><p class="small">x402 proves payment. GenLayer validators judge the work. The service holds the next request.</p><a class="textlink" href="#evidence">Follow the evidence <span>↓</span></a></div></div><div class="partnerstrip"><span>BUILT WITH</span><img src="/internet-court.svg" alt="Internet Court"><b>×</b><img src="/x402.svg" alt="x402"><b>×</b><img src="/genlayer.svg" alt="GenLayer"><div>Local payments.<br>Live validator consensus.</div></div></section>
<section id="evidence" class="workspace"><div class="sectionhead"><div><div class="eyebrow">01 / EVIDENCE WORKSPACE</div><h2>Same payment.<br>Different work.</h2></div><div class="switch" role="group" aria-label="Select a recorded case"><button id="bad" aria-pressed="true">Failed delivery</button><button id="good" aria-pressed="false">Good delivery</button></div></div><div class="recordlabel" id="recordlabel">Loading execution record…</div><div class="casegrid"><article class="panel mandate"><div class="paneltop"><span>01</span><h3>The agreement</h3><span class="chip">SEALED</span></div><p class="mandatecopy" id="mandate"></p><div id="criteria"></div><div class="receiptrow"><span>x402 settlement</span><strong class="green">VERIFIED</strong></div><div class="receiptrow"><span>Report + intent signatures</span><strong class="green">VERIFIED</strong></div><p class="technical">Payment: <span id="payment"></span><br>Local EVM · chain 31337 · valueless dUSD</p></article><article class="panel report"><div class="paneltop"><span>02</span><h3>What arrived</h3><span class="chip">SIGNED</span></div><blockquote id="report"></blockquote><div class="stamp"><span>✓</span><div>Authentic delivery.<small>Authenticity is not quality.</small></div></div><div class="hashbox"><span>IMMUTABLE EVIDENCE HASH</span><code id="hash"></code></div></article><article class="panel verdict"><div class="paneltop"><span>03</span><h3>The court’s decision</h3></div><div class="outcome" id="outcome">PENDING</div><div id="judgments"></div><p class="reason" id="reason"></p><div class="effect" id="effect"></div><button class="verify" id="verify">Verify live state </button><p class="verifyresult" id="verifyresult">Recorded result. Use the button to check current finalized contract state.</p><a class="technical" id="tx" target="_blank" rel="noreferrer">Review transaction </a></article></div></section>
<section class="process"><div class="eyebrow">02 / BEYOND THE RECEIPT</div><h2>Trust the payment.<br>Verify the <em>promise.</em></h2><div class="flow"><div><span>01 / x402</span><h3>Pay</h3><p>Official SDK. Signed EIP-3009 authorization. A real transfer on the local lab chain.</p></div><div><span>02 / EVIDENCE</span><h3>Bind</h3><p>Buyer intent, report, resource and receipt are hashed and signed. Tampering stops here.</p></div><div><span>03 / GENLAYER</span><h3>Judge</h3><p>Validators independently judge each criterion and agree on the exact status vector.</p></div><div><span>04 / SERVICE</span><h3>Enforce</h3><p>A finalized decision controls the next HTTP request, before another payment can start.</p></div></div></section>
<section id="reproduce" class="reproduce"><div><div class="eyebrow">03 / REPRODUCE, DON’T TAKE OUR WORD</div><h2>One command.<br>The whole case.</h2><p>Fresh disposable actors, two x402 payments, a new Studionet court, two independent delivery reviews and a blocked follow-up request.</p><pre>git clone https://github.com/fraguah/receiptcourt
cd receiptcourt
npm ci
npm run lab</pre><a class="textlink" href="https://github.com/fraguah/receiptcourt" target="_blank" rel="noreferrer">Code, architecture & tests </a> <a class="textlink" href="/trace.json" download>Download evidence JSON ↓</a></div><div class="boundary"><span class="eyebrow">THE HONEST BOUNDARY</span><h3>Local money.<br>Real review.</h3><p>dUSD exists only in a private local EVM. The GenLayer contract runs on public Studionet. A named reporter verifies payment provenance off-chain.</p><p>This is a service-access demonstration. It does not move real funds, revoke wallet permissions, issue refunds or claim a trustless cross-chain bridge.</p><p>The hosted view replays the recorded run. The verify button performs a fresh read of GenLayer.</p><a id="contract" target="_blank" rel="noreferrer">View the deployed court </a></div></section>
<section class="film"><div><div class="eyebrow">04 / THE 40-SECOND CASE FILE</div><h2>Watch it unfold.</h2><p>A concise walkthrough of the recorded lab execution.</p></div><video id="film" controls preload="metadata" poster="/poster.png"><source src="/receiptcourt-demo.mp4" type="video/mp4">Video playback is not supported.</video></section></main><footer><span>ReceiptCourt / built by fraguah, with AI assistance</span><span>Internet Court Partner Demo Lab · 2026</span></footer>`;

function render(){
  const c=trace.cases.find(c=>c.kind===kind); const review=trace.court?.cases.find(c=>c.kind===kind); const d=review?.decision;
  if(!c) return;
  $('#mandate').textContent=c.payload.mandate;
  $('#criteria').innerHTML=c.payload.criteria.map((r,i)=>`<div class="criterion"><b>0${i+1}</b><p>${escape(r.text)}${r.critical?'<small>CRITICAL CONDITION</small>':''}</p></div>`).join('');
  $('#payment').textContent=short(c.bundle.settlement.transaction);
  $('#report').textContent=c.bundle.report;
  $('#hash').textContent=c.proof.bundleHash;
  $('#outcome').textContent=d?.decision?.toUpperCase()??'PENDING';
  $('#outcome').className='outcome '+(d?.decision??'');
  $('#judgments').innerHTML=(d?.statuses??[]).map((s,i)=>`<div class="judgment ${s}"><span>Criterion 0${i+1}</span><b>${escape(s)}</b></div>`).join('');
  $('#reason').textContent=d?.reason??'No consensus result recorded yet.';
  $('#effect').innerHTML=d?.decision==='continue'?'<strong>200 / ADMITTED</strong><span>Future requests remain available.</span>':d?.decision==='revoke'?'<strong>403 / ACCESS HELD</strong><span>Next request blocked. No new payment.</span>':'<strong>HUMAN REVIEW</strong><span>No automatic financial action.</span>';
  $('#tx').href=review?explorer+'/transactions/'+review.review:'#';
  $('#contract').href=trace.court?explorer+'/address/'+trace.court.address:'#';
  $('#verify').disabled=!review;
  $('#verifyresult').textContent='Recorded result. Use the button to check current finalized contract state.';
  $('#recordlabel').textContent=`RECORDED RUN / ${new Date(trace.startedAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC · x402 ${trace.officialSdk.replace('@x402 ','')} · Local EVM + Studionet`;
  for(const k of ['good','bad']) $('#'+k).setAttribute('aria-pressed',String(k===kind));
}
for(const k of ['good','bad']) $('#'+k).onclick=()=>{kind=k;render();};
$('#verify').onclick=async()=>{
  const b=$('#verify'); b.disabled=true; $('#verifyresult').textContent='Reading finalized state from Studionet…';
  try{
    const c=trace.court.cases.find(c=>c.kind===kind);
    const [{createClient},{studionet}]=await Promise.all([import('genlayer-js'),import('genlayer-js/chains')]);
    const client=createClient({chain:studionet});
    let live=await client.readContract({address:trace.court.address,functionName:'get_decision',args:[c.caseId],stateStatus:'finalized'});
    if(typeof live==='string') live=JSON.parse(live);
    if(live.case_id!==c.caseId||live.bundle_hash!==c.decision.bundle_hash||live.decision!==c.decision.decision||JSON.stringify(live.statuses)!==JSON.stringify(c.decision.statuses)) throw Error('Live state differs from the recorded evidence.');
    $('#verifyresult').textContent='✓ Verified now: finalized contract state matches this evidence and decision.';
  } catch(e){$('#verifyresult').textContent='Could not verify: '+e.message;}
  finally{b.disabled=false;}
};
fetch('/trace.json').then(r=>{if(!r.ok)throw Error('Evidence file unavailable');return r.json();}).then(t=>{trace=t;render();}).catch(e=>{$('#recordlabel').textContent=e.message;$('#verify').disabled=true;});
