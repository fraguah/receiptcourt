# ReceiptCourt

**Paid does not mean delivered.** An Internet Court Partner Demo Lab integration
with **x402** and **GenLayer**, built by `fraguah` with AI assistance.

A buyer pays for a report. One response meets the agreed scope; another gives
irrelevant leveraged-trading advice and tries to override the reviewer. Both
payments are authentic. GenLayer validators independently judge delivery against
the same sealed criteria. The research service uses the finalized result to stop
the next request before another payment.

## Reproduce

Node 22+ (tested on Node 24), Python 3 and outbound access to
`https://studio.genlayer.com/api` are required. No personal wallet or API key.

```sh
npm ci
npm test
npm run lab
npm run dev
```

`npm run lab` starts a private local EVM and service, mints valueless demo tokens,
runs official x402 v2 payment flows, deploys a fresh GenLayer Studionet court,
reviews both reports with full validator consensus, checks finalized state and
tests the follow-up HTTP 403. It writes `public/trace.json`, then stops its local
server and chain. Each full run creates a new test deployment, not a Portal
submission. Never rerun while a previous transaction is pending.

`npm run dev` opens the evidence viewer. It replays the recorded run; **Verify
live state** performs a fresh finalized-state read. The hosted viewer does not
run an EVM or make paid requests on the visitor's behalf. To inspect only the
local payment layer, run `npm run lab -- --payment-only` (this overwrites the
trace with a payment-only record and does not claim a GenLayer verdict).

## What is real, and where

| Component | Execution |
| --- | --- |
| x402 client, resource server, facilitator | Official `@x402/*` 2.30.0 packages |
| Payment settlement | Real EIP-3009 token transfer on a private local Ganache EVM, chain 31337 |
| Token | Locally minted **dUSD**, no monetary value; never public USDC |
| Buyer and service signatures | Real EIP-191 signatures from fresh disposable actors |
| Delivery judgment | Deployed GenLayer Studionet intelligent contract, independently checked by validators |
| Access effect | Local service returns HTTP 403 before x402 middleware after a finalized revoke |
| Public viewer | Recorded evidence with a live on-chain verification button |

The evidence verifier checks buyer/service signatures, report and intent hashes,
resource, chain, asset, payee, amount, settlement status and matching Transfer
**and AuthorizationUsed nonce**. An old payment for another authorization cannot
be combined with a new report. The contract seals the resulting bundle hash;
its named reporter is trusted to attest those off-chain checks.

## Consensus boundary

The contract, rather than a frontend LLM, owns the decision. Every validator
independently judges every criterion and compares the exact PASS/FAIL/UNKNOWN
vector with the leader. Source-segment indices produce deterministic citations,
so generated paraphrases cannot masquerade as quotations. Critical failure
derives `revoke`, other failure `constrain`, uncertainty `escalate`, all PASS
`continue`. Cases and decisions cannot be overwritten or rerolled. GenLayer's
protocol appeal path remains available.

This is a service-access lab, **not** escrow, a refund system, legal adjudication,
an ERC-7710 controller or a trustless cross-chain bridge. The service chooses to
honor the result. The public network cannot fetch receipts from your private
local EVM, so the reporter's attestation is an explicit trust assumption.

## Checks

- `npm test`: 13 Node evidence/receipt tests and 7 explicitly mocked GenVM
  business-logic tests. These unit tests do not prove validator consensus.
- `genvm-lint check contracts/receipt_court.py`: AST and SDK semantic validation.
- `npm run lab`: actual x402 and Studionet integration; execution proofs and
  validator results are recorded in `public/trace.json`.
- `npm run build`: static evidence viewer.

Local tests cover tampered reports, wrong signers/payees/amounts, HTTP failures,
reverted settlement, payment/authorization mixing, invalid citations, untrusted
case writers, duplicate cases, reroll prevention and finalized receipt handling.

## Demo film

`public/receiptcourt-demo.mp4` is a 40-second, AI-assisted motion edit of the
successful recorded lab. All three component logos are visible. It uses real
recorded outcomes and clearly labels local-money versus public-network review.
To regenerate after a successful run:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python scripts/render-film.py
```

Requires `ffmpeg` and DejaVu Sans fonts. The film is a visual walkthrough, not
uninterrupted real-time footage; network finalization is condensed.

## Structure and upstreams

- `contracts/receipt_court.py`: GenLayer review and immutable case state.
- `contracts/DemoUSD.sol`: local-only EIP-3009 token. Unrestricted mint: never deploy it publicly.
- `scripts/local-lab.mjs`: official x402 integration and service enforcement.
- `scripts/studionet.mjs`: ephemeral reporter and finalized network execution.
- `src/evidence.mjs`: cryptographic and payment-domain validation.
- `docs/ARCHITECTURE.md`: boundaries, review and failure paths.

Design follows Internet Court's [GenLayer adapter](https://github.com/internet-court/internet-court-skill/tree/main/integrations/genlayer-intelligent-contracts)
and its [signed-evidence pattern](https://github.com/internet-court/internet-court-skill/tree/main/integrations/x402-erc7710).
The payment protocol is [x402](https://github.com/x402-foundation/x402).
The project does not claim partner endorsement or production security.

MIT for original code. Partner marks remain their owners' trademarks;
see `docs/ASSETS.md`.
