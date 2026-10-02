"""Shared singletons for routers."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.genai.copilot import Copilot
from app.genai.llm_gateway import LLMGateway
from app.genai.rag import BM25Retriever
from app.services.state import AppState, get_state


def state_dep() -> AppState:
    return get_state()


@lru_cache
def get_gateway() -> LLMGateway:
    return LLMGateway(get_settings())


@lru_cache
def get_retriever() -> BM25Retriever:
    return BM25Retriever(get_settings().knowledge_dir)


def get_copilot() -> Copilot:
    return Copilot(get_gateway(), get_retriever())
