import unittest

from backend.app.main import DealInput, flip_analysis, market_snapshot


class InvestorFlowTests(unittest.TestCase):
    def test_flip_analysis_go_decision(self):
        payload = DealInput(
            purchase_price=100000,
            repair_budget=20000,
            arv=200000,
            closing_costs=5000,
            holding_costs=3000,
            selling_costs=7000,
            target_profit_margin=0.30,
        )

        result = flip_analysis(payload)

        self.assertEqual(result["decision"], "GO")
        self.assertAlmostEqual(result["total_cost"], 135000.0, places=2)
        self.assertAlmostEqual(result["profit"], 65000.0, places=2)
        self.assertAlmostEqual(result["roi"], 0.4815, places=4)

    def test_market_snapshot_shape_and_math(self):
        snapshot = market_snapshot("Dallas, TX")

        self.assertEqual(snapshot.market, "Dallas, TX")
        self.assertEqual(snapshot.decision, "NO-GO")
        self.assertAlmostEqual(snapshot.estimated_total_cost, 284000.0, places=2)
        self.assertAlmostEqual(snapshot.estimated_profit, 21000.0, places=2)
        self.assertAlmostEqual(snapshot.estimated_roi, 0.0739, places=4)


if __name__ == "__main__":
    unittest.main()
