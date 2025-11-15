from config import OPENAI_API_KEY
import openai
from typing import List

class AIChat:
    def __init__(self, api_key: str, max_context_tokens: int = 1000):
        self.client = openai.OpenAI(api_key=api_key)
        self.max_context_tokens = max_context_tokens

    def _estimate_tokens(self, text: str) -> int:
        return len(text) // 4

    def _truncate_context(self, prev_chunks: List[str]) -> str:
        if not prev_chunks:
            return ""
        
        context_parts = []
        total_tokens = 0
        
        for summary in reversed(prev_chunks):
            estimated = self._estimate_tokens(summary)
            if total_tokens + estimated > self.max_context_tokens:
                break
            context_parts.insert(0, summary)
            total_tokens += estimated
        
        if context_parts:
            return "Previous chunk summaries:\n- " + "\n- ".join(context_parts) + "\n\n"
        return ""

    def chunk_metadata(self, text: str, prev_chunks: List[str] = None) -> str:
        context = self._truncate_context(prev_chunks or [])

        prompt = (
            f"{context}"
            "Generate a short and informative summary of the following text suitable for metadata. "
            "The summary should be no more than 20 words and clearly reflect the main content and meaning of the passage.\n\n"
            f"{text}\n\n"
            "Summary:"
        )

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=60
        )

        summary = response.choices[0].message.content.strip()
        return summary