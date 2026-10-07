"""Jev smoke test: one Choice, one Score, one Noul on synthetic text. Needs TYPESAFE_API_KEY."""
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

TICKET = "I was charged twice for my March subscription. Please refund the extra charge."
SEVERITY = [
    "Cosmetic; no impact on the customer",
    "Something is wrong, but the customer can still use the product",
    "The customer cannot use the product at all",
]

with TypeSafeClient(timeout=10) as client:
    r = client.system_one(
        state={"ticket": TICKET},
        questions={
            "category": Choice(
                instructions="Which category fits the main request in `ticket`?",
                criteria={
                    "billing": "Charges, invoices, refunds, or subscriptions",
                    "bug_report": "Something in the product is broken or producing errors",
                    "other": "Anything else",
                },
            ),
            "severity": Score(instructions="How severe is the problem described in `ticket`?", criteria=SEVERITY),
            "refund_requested": Noul(instructions="Does `ticket` explicitly ask for a refund or credit?"),
        },
    )

a = r.answers
print("category:", a["category"].choice, "confidence", round(a["category"].confidence, 3), a["category"].probabilities)
print("severity:", round(a["severity"].score, 3), "confidence", round(a["severity"].confidence, 3))
print("refund_requested (noul):", round(a["refund_requested"].noul, 3))
print("model:", getattr(r, "model", "?"), "usage:", getattr(r, "usage", "?"))

assert a["category"].choice == "billing", a["category"].choice
assert a["refund_requested"].noul > 0.7, a["refund_requested"].noul
print("OK")
