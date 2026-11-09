# ReceiptCourt · Internet Court + x402 + GenLayer

**An agent can pay successfully and still deliver the wrong work.** ReceiptCourt
keeps payment verification separate from semantic delivery review. GenLayer's
validator-agreed decision controls whether a research service admits that buyer's
next request. This is a small local lab, not a commercial wallet or refund system.

1. A disposable buyer signs the mandate, nonce, resource and payment domain.
2. An official x402 v2 middleware returns HTTP 402. The official buyer SDK signs
   an EIP-3009 authorization and retries. The official facilitator verifies it and
   settles a token transfer on a private local EVM (chain 31337, valueless dUSD).
3. The service signs the report hash and buyer intent hash. An evidence reporter
   verifies both signatures, content bindings and a successful matching Transfer
   log. A receipt from a different chain, payee, nonce or report is rejected.
4. The reporter seals this evidence in a deployed GenLayer Studionet contract.
   Each validator independently classifies the same acceptance criteria. Consensus
   compares the exact status vector; citations must exist in the report.
5. The lab reads a FINALIZED/SUCCESS transaction and the resulting contract state.
   It blocks the next HTTP request on `revoke`/`escalate`, before payment middleware.
   `constrain` requires human review; `continue` retains access.

## Trust boundary

The reporter is trusted to attest off-chain payment verification. Local EVM
receipts cannot be re-fetched by Studionet validators. The immutable case binds
the reviewed text to the reporter's evidence hash. This is **not a trustless
cross-chain bridge**, an ERC-7710 revocation controller, escrow, legal judgment,
or automated refund. The service controls its own access; a malicious service
can ignore the decision. No personal wallet, real money, API key or delegated
spend authority is used. Local keys are ephemeral and never exported.

## Review and failure paths

Cases cannot be overwritten, replayed under the same digest or rerolled through
the same contract method. Malformed model answers force validator disagreement.
All-`PASS` yields continue, noncritical failure constrain, critical failure
revoke, and uncertainty escalate. Insufficient proof never enters semantic review.
Protocol appeals remain available in GenLayer; a production service must delay
effect until its chosen appeal/finality policy is satisfied. This lab waits for
finalized state, not just accepted transactions. Emergency recovery is a manual
service-owner decision, never an automatic financial action.

## Upstream integration

The design follows Internet Court's public `genlayer-intelligent-contracts`
adapter (mandate + rubric + signed action receipts -> auditable review decision),
and the signed-evidence pattern in its x402 connector. Payment handling uses
official `@x402/*` packages rather than a mock 402 success flag. Logos identify
the mission's components and do not imply endorsement.
