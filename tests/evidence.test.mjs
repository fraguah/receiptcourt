import test from 'node:test';
import assert from 'node:assert/strict';
import {privateKeyToAccount,generatePrivateKey} from 'viem/accounts';
import {encodeEventTopics,encodeAbiParameters} from 'viem';
import {canonical,digest,verifyBundle} from '../src/evidence.mjs';
import {receiptState} from '../scripts/studionet.mjs';

async function fixture(){
  const buyer=privateKeyToAccount(generatePrivateKey()), seller=privateKeyToAccount(generatePrivateKey());
  const asset='0x'+'12'.repeat(20), nonce='0x'+'34'.repeat(32), transaction='0x'+'56'.repeat(32);
  const report='A signed test delivery.';
  const intent={buyer:buyer.address,origin:'http://127.0.0.1:4021',path:'/api/report',network:'eip155:31337',asset,payTo:seller.address,amount:'50000',nonce:'request-one'};
  const receipt={signer:seller.address,intentHash:digest(intent),reportHash:digest(report),nonce:intent.nonce,paymentNonce:nonce};
  const transfer={type:'event',name:'Transfer',inputs:[{indexed:true,name:'from',type:'address'},{indexed:true,name:'to',type:'address'},{indexed:false,name:'value',type:'uint256'}]};
  const auth={type:'event',name:'AuthorizationUsed',inputs:[{indexed:true,name:'authorizer',type:'address'},{indexed:true,name:'nonce',type:'bytes32'}]};
  const logs=[{address:asset,topics:encodeEventTopics({abi:[transfer],eventName:'Transfer',args:{from:buyer.address,to:seller.address}}),data:encodeAbiParameters([{type:'uint256'}],[50000n])},{address:asset,topics:encodeEventTopics({abi:[auth],eventName:'AuthorizationUsed',args:{authorizer:buyer.address,nonce}}),data:'0x'}];
  const bundle={intent,intentSignature:await buyer.signMessage({message:canonical(intent)}),receipt,receiptSignature:await seller.signMessage({message:canonical(receipt)}),report,httpStatus:200,settlement:{success:true,payer:buyer.address,network:intent.network,transaction}};
  const trusted={origin:intent.origin,buyer:buyer.address,seller:seller.address,network:intent.network,asset,payTo:seller.address,amount:'50000',client:{getTransactionReceipt:async()=>({status:'success',logs})}};
  return {bundle,trusted,seller,logs,auth};
}
test('valid signed delivery and matching payment authorization pass',async()=>{const f=await fixture();assert.equal((await verifyBundle(f.bundle,f.trusted)).verified,true);});
test('changing the signed report is rejected',async()=>{const f=await fixture();f.bundle.report+=' forged';await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/hash mismatch/);});
test('a different buyer is rejected',async()=>{const f=await fixture();f.trusted.buyer='0x'+'99'.repeat(20);await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/signer/);});
test('a different payee is rejected',async()=>{const f=await fixture();f.trusted.payTo='0x'+'99'.repeat(20);await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/payment domain/);});
test('a failed settlement does not enter semantic review',async()=>{const f=await fixture();f.bundle.settlement.success=false;await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/Incomplete/);});
test('a reverted transaction does not enter semantic review',async()=>{const f=await fixture();f.trusted.client.getTransactionReceipt=async()=>({status:'reverted',logs:f.logs});await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/reverted/);});
test('a paid transfer for another authorization is rejected',async()=>{const f=await fixture();f.bundle.receipt.paymentNonce='0x'+'aa'.repeat(32);f.bundle.receiptSignature=await f.seller.signMessage({message:canonical(f.bundle.receipt)});await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/different authorization/);});
test('a transfer with a different amount is rejected',async()=>{const f=await fixture();f.logs[0].data=encodeAbiParameters([{type:'uint256'}],[1n]);await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/matching token transfer/);});
test('an HTTP error is never accepted as a delivered report',async()=>{const f=await fixture();f.bundle.httpStatus=500;await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/HTTP 200/);});
test('a forged service signature is rejected',async()=>{const f=await fixture();f.bundle.receiptSignature=await privateKeyToAccount(generatePrivateKey()).signMessage({message:canonical(f.bundle.receipt)});await assert.rejects(()=>verifyBundle(f.bundle,f.trusted),/seller signature/);});
test('accepted execution is not finalized success',()=>assert.equal(receiptState({status:'ACCEPTED',execution_result:'SUCCESS'}).success,false));
test('an idle-validator error does not replace the leader receipt',()=>assert.equal(receiptState({status:7,consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'},{mode:'validator',execution_result:'ERROR'}]}}).success,true));
test('finalized failed execution is rejected',()=>assert.equal(receiptState({status:7,execution_result:'ERROR'}).failed,true));
