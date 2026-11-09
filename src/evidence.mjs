import {createHash} from 'node:crypto';
import {verifyMessage, decodeEventLog} from 'viem';

export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
}
export const digest = value => createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
const transferAbi=[{type:'event',name:'Transfer',inputs:[{indexed:true,name:'from',type:'address'},{indexed:true,name:'to',type:'address'},{indexed:false,name:'value',type:'uint256'}]}];
const authorizationAbi=[{type:'event',name:'AuthorizationUsed',inputs:[{indexed:true,name:'authorizer',type:'address'},{indexed:true,name:'nonce',type:'bytes32'}]}];

// Prove payment and provenance before asking GenLayer to judge the *meaning* of delivery.
export async function verifyBundle(bundle, trusted) {
  const {intent, intentSignature, receipt, receiptSignature, report, settlement}=bundle;
  if (!intent || !receipt || !report || !settlement?.success) throw Error('Incomplete evidence');
  if (bundle.httpStatus!==200) throw Error('Delivery did not return HTTP 200');
  if (intent.origin!==trusted.origin || intent.path!=='/api/report') throw Error('Wrong resource');
  if (!same(intent.buyer,trusted.buyer) || !same(receipt.signer,trusted.seller)) throw Error('Wrong signer');
  if (intent.network!==trusted.network || !same(intent.asset,trusted.asset) || !same(intent.payTo,trusted.payTo)) throw Error('Wrong payment domain');
  if (intent.amount!==trusted.amount || !/^[0-9]+$/.test(intent.amount)) throw Error('Wrong amount');
  if (receipt.intentHash!==digest(intent) || receipt.reportHash!==digest(report) || receipt.nonce!==intent.nonce) throw Error('Evidence hash mismatch');
  if (!/^0x[0-9a-f]{64}$/i.test(receipt.paymentNonce??'')) throw Error('Missing payment authorization nonce');
  if (!await verifyMessage({address:trusted.buyer,message:canonical(intent),signature:intentSignature})) throw Error('Bad buyer signature');
  if (!await verifyMessage({address:trusted.seller,message:canonical(receipt),signature:receiptSignature})) throw Error('Bad seller signature');
  if (settlement.network!==trusted.network || !same(settlement.payer,trusted.buyer) || !/^0x[0-9a-f]{64}$/i.test(settlement.transaction)) throw Error('Wrong settlement');
  const tx = await trusted.client.getTransactionReceipt({hash:settlement.transaction});
  if (tx.status!=='success') throw Error('Settlement reverted');
  const paid=tx.logs.some(log=>{
    if(!same(log.address,trusted.asset)) return false;
    try { const e=decodeEventLog({abi:transferAbi,data:log.data,topics:log.topics});
      return same(e.args.from,trusted.buyer)&&same(e.args.to,trusted.payTo)&&e.args.value===BigInt(trusted.amount);
    } catch { return false; }
  });
  if (!paid) throw Error('No matching token transfer');
  const bound=tx.logs.some(log=>{
    if(!same(log.address,trusted.asset)) return false;
    try {const e=decodeEventLog({abi:authorizationAbi,data:log.data,topics:log.topics});
      return same(e.args.authorizer,trusted.buyer)&&same(e.args.nonce,receipt.paymentNonce);
    } catch {return false;}
  });
  if(!bound) throw Error('Payment receipt belongs to a different authorization');
  return {verified:true, bundleHash:digest(bundle),transaction:settlement.transaction};
}
