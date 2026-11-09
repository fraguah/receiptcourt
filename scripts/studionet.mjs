import {readFile} from 'node:fs/promises';
import {generatePrivateKey} from 'viem/accounts';
import {createAccount,createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {createHash} from 'node:crypto';

export function receiptState(tx){
  const statuses={0:'PENDING',1:'ACTIVATED',2:'CANCELED',3:'PROPOSING',4:'COMMITTING',5:'REVEALING',6:'ACCEPTED',7:'FINALIZED',8:'UNDETERMINED'};
  const raw=tx.statusName??tx.status_name??tx.status;
  const status=String(statuses[raw]??raw??'UNKNOWN').toUpperCase();
  const list=Array.isArray(tx.consensus_data?.leader_receipt)?tx.consensus_data.leader_receipt:[];
  const leader=list.filter(r=>r.mode==='leader').at(-1)??list[0]??tx.consensus_data?.leader_receipt??tx.leader_receipt??{};
  const execution=String(tx.txExecutionResultName??leader.execution_result??tx.execution_result??'UNKNOWN').toUpperCase();
  return {status,execution,success:status==='FINALIZED'&&['SUCCESS','FINISHED_WITH_RETURN'].includes(execution),failed:['CANCELED','CANCELLED','UNDETERMINED'].includes(status)||(status==='FINALIZED'&&['ERROR','FAILURE','FINISHED_WITH_ERROR'].includes(execution))};
}
export async function runCourt(cases,event){
  const account=createAccount(generatePrivateKey());
  const client=createClient({chain:studionet,account});
  const readClient=createClient({chain:studionet});
  async function track(hash){
    const end=Date.now()+240000;
    let prior='';
    while(Date.now()<end){
      const tx=await readClient.getTransaction({hash}); const s=receiptState(tx);
      if(s.status!==prior){event('GENLAYER_STATUS',{hash,...s});prior=s.status;}
      if(s.success) return tx;
      if(s.failed) throw Error('GenLayer execution failed: '+JSON.stringify({hash,...s}));
      await new Promise(r=>setTimeout(r,3000));
    }
    throw Error('GenLayer still pending; resume transaction '+hash+' instead of redeploying.');
  }
  const code=await readFile(new URL('../contracts/receipt_court.py',import.meta.url),'utf8');
  const deploy=await client.deployContract({code,args:[],leaderOnly:false});
  event('GENLAYER_DEPLOY',{hash:deploy});
  const deployed=await track(deploy);
  const address=deployed.data?.contract_address??deployed.data?.contractAddress??deployed.contract_address??deployed.recipient??deployed.to_address??deployed.txDataDecoded?.contractAddress;
  if(!/^0x[0-9a-f]{40}$/i.test(address??'')) throw Error('No deployed address in finalized receipt: '+JSON.stringify(deployed));
  const result={address,reporter:account.address,deploy,cases:[]};
  for(const c of cases){
    const payload=JSON.stringify(c.payload);
    // Python canonical JSON is verified from the transaction return/state, never guessed.
    const open=await client.writeContract({address,functionName:'open_case',args:[payload],value:0n,leaderOnly:false});
    event('GENLAYER_OPEN_CASE',{kind:c.kind,hash:open});
    await track(open);
    const caseId=createHash('sha256').update(JSON.stringify(sortDeep(c.payload))).digest('hex');
    const stored=await readClient.readContract({address,functionName:'get_case',args:[caseId],stateStatus:'finalized'});
    if(!stored) throw Error('Sealed case missing from contract state');
    const review=await client.writeContract({address,functionName:'review_case',args:[caseId],value:0n,leaderOnly:false});
    event('GENLAYER_REVIEW',{kind:c.kind,hash:review,caseId});
    await track(review);
    let decision=await readClient.readContract({address,functionName:'get_decision',args:[caseId],stateStatus:'finalized'});
    if(typeof decision==='string') decision=JSON.parse(decision);
    if(decision.bundle_hash!==c.payload.bundle_hash||decision.buyer.toLowerCase()!==c.payload.buyer.toLowerCase()) throw Error('Decision bound to wrong evidence');
    event('GENLAYER_DECISION',{kind:c.kind,decision:decision.decision,statuses:decision.statuses});
    result.cases.push({kind:c.kind,caseId,open,review,decision});
  }
  return result;
}
const sortDeep=x=>Array.isArray(x)?x.map(sortDeep):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sortDeep(x[k])])):x;
