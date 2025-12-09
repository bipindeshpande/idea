import json


class MockLLM:
    """
    A deterministic mock LLM used for integration & regression tests.
    Always returns predictable outputs based on persona + template.
    """

    def __init__(self, persona="default"):
        self.persona = persona

    def generate(self, prompt):
        return self._response_for_persona()

    def _response_for_persona(self):
        if self.persona == "risk_averse":
            return json.dumps({
                "ideas": [
                    {"title": "Lean Micro SaaS", "score": 88},
                    {"title": "Content Repurposing Service", "score": 81},
                    {"title": "AI-powered PDF Cleanup Tool", "score": 77}
                ],
                "tone": "reassuring",
                "risk_style": "avoid high upfront investment",
                "roadmap": {
                    "day_30": "Validate with smallest scope possible.",
                    "day_60": "Collect early feedback.",
                    "day_90": "Scale only if metrics hit threshold."
                }
            })

        if self.persona == "fast_executor":
            return json.dumps({
                "ideas": [
                    {"title": "Automated Video Clipper", "score": 91},
                    {"title": "AI Newsletter Generator", "score": 86},
                    {"title": "Real-time Conversation Summarizer", "score": 83}
                ],
                "tone": "direct",
                "risk_style": "bias toward action",
                "roadmap": {
                    "day_30": "Ship MVP in one week.",
                    "day_60": "Acquire 10 users.",
                    "day_90": "Iterate aggressively."
                }
            })

        if self.persona == "low_time":
            return json.dumps({
                "ideas": [
                    {"title": "One-Page Info Product", "score": 82},
                    {"title": "Done-for-You Resume Optimizer", "score": 79},
                    {"title": "Micro Template Store", "score": 74}
                ],
                "tone": "supportive",
                "risk_style": "minimize ops",
                "roadmap": {
                    "day_30": "Create 1 template.",
                    "day_60": "Publish quietly.",
                    "day_90": "Automate everything possible."
                }
            })

        return json.dumps({
            "ideas": [],
            "tone": "neutral",
            "roadmap": {}
        })

