"""Business-logic tests with an explicitly mocked GenVM. Live consensus is in trace.json."""
import importlib.util
import json
import pathlib
import sys
import types
import unittest


class UserError(Exception):
    pass


class Return:
    def __init__(self, data):
        self.calldata = data


class Contract:
    def __new__(cls):
        obj = super().__new__(cls)
        obj.cases, obj.decisions = {}, {}
        return obj


gl = types.SimpleNamespace(Contract=Contract, message=types.SimpleNamespace(sender_address="reporter"), public=types.SimpleNamespace(view=lambda f: f, write=lambda f: f), vm=types.SimpleNamespace(UserError=UserError, Return=Return, Result=object), nondet=types.SimpleNamespace())
module = types.ModuleType("genlayer")
module.gl, module.Address, module.TreeMap, module.u256 = gl, str, dict, int
sys.modules["genlayer"] = module
spec = importlib.util.spec_from_file_location("receipt_court", pathlib.Path(__file__).parents[1] / "contracts/receipt_court.py")
contract_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract_module)


class CourtTests(unittest.TestCase):
    def setUp(self):
        gl.message.sender_address = "reporter"
        self.court = contract_module.ReceiptCourt()
        self.payload = {"mandate":"Write the agreed report.","criteria":[{"text":"Relevant content", "critical":False},{"text":"No leveraged trade advice", "critical":True}],"report":"Relevant content. No trades are proposed.","bundle_hash":"a"*64,"payment_tx":"0x"+"b"*64,"buyer":"demo-buyer"}
        self.calls = 0

    def open(self):
        return self.court.open_case(json.dumps(self.payload))

    def mock_review(self, statuses):
        def prompt(*args, **kwargs):
            self.calls += 1
            return {"statuses":statuses,"citations":[0 if s!="UNKNOWN" else None for s in statuses],"reason":"Test reasoning."}
        gl.nondet.exec_prompt = prompt
        def nondet(leader, validator):
            value = leader()
            if not validator(Return(value)):
                raise UserError("Validator disagrees")
            return value
        gl.vm.run_nondet_unsafe = nondet

    def test_only_reporter_can_seal(self):
        gl.message.sender_address = "stranger"
        with self.assertRaisesRegex(UserError, "Only the evidence reporter"):
            self.open()

    def test_identical_case_cannot_be_replayed(self):
        self.open()
        with self.assertRaisesRegex(UserError, "already sealed"):
            self.open()

    def test_critical_failure_revokes_after_independent_review(self):
        case_id = self.open()
        self.mock_review(["PASS", "FAIL"])
        self.court.review_case(case_id)
        self.assertEqual(json.loads(self.court.get_decision(case_id))["decision"], "revoke")
        self.assertEqual(self.calls, 2)

    def test_noncritical_failure_constrains(self):
        case_id = self.open()
        self.mock_review(["FAIL", "PASS"])
        self.court.review_case(case_id)
        self.assertEqual(json.loads(self.court.get_decision(case_id))["decision"], "constrain")

    def test_unknown_escalates(self):
        case_id = self.open()
        self.mock_review(["UNKNOWN", "PASS"])
        self.court.review_case(case_id)
        self.assertEqual(json.loads(self.court.get_decision(case_id))["decision"], "escalate")

    def test_cannot_reroll_decision(self):
        case_id = self.open()
        self.mock_review(["PASS", "PASS"])
        self.court.review_case(case_id)
        with self.assertRaisesRegex(UserError, "Already reviewed"):
            self.court.review_case(case_id)

    def test_fabricated_citation_does_not_commit_a_decision(self):
        case_id = self.open()
        gl.nondet.exec_prompt = lambda *a, **k: {"statuses":["PASS","PASS"],"citations":[999,999],"reason":"Test."}
        with self.assertRaisesRegex(UserError, "Citation not in report"):
            self.court.review_case(case_id)
        self.assertEqual(self.court.get_decision(case_id), "")


if __name__ == "__main__":
    unittest.main()
