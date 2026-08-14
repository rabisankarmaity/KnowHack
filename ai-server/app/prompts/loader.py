"""Loads the prompt templates from app/prompts/*.txt."""
import os

_PROMPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def load_prompt(name: str) -> str:
    path = os.path.join(_PROMPTS_DIR, name)
    with open(path, encoding="utf-8") as fh:
        return fh.read().strip()