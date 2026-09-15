import unittest

from fastapi import HTTPException

from backend.app.api.canonical_canary import (
    BuckleyCanaryRequest,
    CapitalControls,
    ContractEconomics,
    PropertyIdentity,
    RehabEvidence,
    UnderwritingEvidence,
    evaluate_502_buckley,
)


class CanonicalBuckleyCanaryTests(unittest.TestCase):
    def base_payload(self) -> BuckleyCanaryRequest:
        return BuckleyCanaryRequest(
            property=PropertyIdentity(
                address="502 Buckley St, Park Hills, MO 63601",
                parcel_apn="09-30-06-01-018-0003.00",
                property_type="single_family",
                beds=2,
                baths=1,
                sqft=848,
                lot_size=0.281,
                year_built=1920,
                current_condition="seller_disclosed_updates; independent inspection evidence required",
            ),
            contract=ContractEconomics(
                purchase_price=117000,
                financing_type="FHA 203(b) fixed rate",
                financing_terms={
                    "loan_amount": 114880,
                    "apr_note_rate": 0.07125,
                    "term_months": 360,
                    "interest_only": False,
                    "cash_to_close": 4611.16,
                    "initial_monthly_payment": 1100.51,
                    "source_ref": "Closing_Package.pdf",
                },
                seller_concessions=6594,
                closing_date="2026-05-01",
                fha_conditions=["owner-occupancy / principal-residence restrictions apply"],
            ),
            underwriting=UnderwritingEvidence(
                comp_evidence_refs=["comp-1", "comp-2", "comp-3"],
                low_arv=180000,
                base_arv=200000,
                high_arv=220000,
                confidence=0.75,
            ),
            rehab=RehabEvidence(
                inspection_evidence_refs=["inspection-1"],
                scope_evidence_refs=["scope-1"],
                bid_evidence_refs=["bid-1"],
                rehab_budget=90000,
                contingency=9000,
                schedule_days=120,
            ),
            capital=CapitalControls(
                capital_stack=[{"type": "cash", "amount": 10000}],
            ),
        )

    def test_complete_evidence_reaches_independent_verification(self):
        result = evaluate_502_buckley(self.base_payload())
        self.assertEqual(result.intake.status, "READY")
        self.assertEqual(result.underwriting.status, "READY")
        self.assertEqual(result.capital.status, "READY")
        self.assertEqual(result.operations.status, "READY")
        self.assertEqual(result.next_gate, "INDEPENDENT_VERIFICATION")

    def test_missing_identity_holds_intake(self):
        payload = self.base_payload()
        payload.property.parcel_apn = None
        result = evaluate_502_buckley(payload)
        self.assertEqual(result.intake.status, "HOLD_FOR_DATA")
        self.assertIn("parcel_apn", result.intake.missing)

    def test_missing_comps_holds_underwriting(self):
        payload = self.base_payload()
        payload.underwriting.comp_evidence_refs = []
        result = evaluate_502_buckley(payload)
        self.assertEqual(result.underwriting.status, "HOLD_FOR_DATA")
        self.assertIn("comp_evidence_refs", result.underwriting.missing)

    def test_debt_terms_are_never_guessed(self):
        payload = self.base_payload()
        payload.capital.capital_stack = [{"type": "private_money", "principal": 90000}]
        result = evaluate_502_buckley(payload)
        self.assertEqual(result.capital.status, "HOLD_FOR_DATA")
        self.assertIn("capital_stack[0].apr", result.capital.missing)
        self.assertIn("capital_stack[0].term_months", result.capital.missing)
        self.assertIn("capital_stack[0].interest_only", result.capital.missing)

    def test_missing_scope_blocks_operations(self):
        payload = self.base_payload()
        payload.rehab.scope_evidence_refs = []
        result = evaluate_502_buckley(payload)
        self.assertEqual(result.operations.status, "BLOCKED")
        self.assertIn("scope_evidence_refs", result.operations.missing)

    def test_wrong_property_is_rejected(self):
        payload = self.base_payload()
        payload.property.address = "123 Other St, Park Hills, MO"
        with self.assertRaises(HTTPException) as ctx:
            evaluate_502_buckley(payload)
        self.assertEqual(ctx.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
