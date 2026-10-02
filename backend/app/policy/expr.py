"""Restricted expression evaluator for policy and rule YAML.

Only a whitelisted subset of Python expression syntax is allowed: boolean logic,
comparisons, arithmetic, names, constants and calls to whitelisted functions.
No attribute access, subscripts, lambdas, comprehensions or builtins, so a policy
file can never execute arbitrary code. Unknown names evaluate to 0 (missing
detector => no signal), which keeps the policy working in degraded mode.
"""
from __future__ import annotations

import ast
import operator
from functools import lru_cache
from typing import Any, Callable, Mapping

_BIN = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: lambda a, b: a / b if b else 0.0,
    ast.Mod: lambda a, b: a % b if b else 0.0,
}
_CMP = {
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
}
_UNARY = {ast.Not: operator.not_, ast.USub: operator.neg, ast.UAdd: operator.pos}
BASE_FUNCS: dict[str, Callable] = {"min": min, "max": max, "abs": abs}


class ExpressionError(ValueError):
    pass


@lru_cache(maxsize=512)
def compile_expr(source: str) -> ast.Expression:
    src = source.strip()
    if src.lower() == "true":
        src = "True"
    elif src.lower() == "false":
        src = "False"
    try:
        tree = ast.parse(src, mode="eval")
    except SyntaxError as exc:
        raise ExpressionError(f"Invalid expression {source!r}: {exc}") from exc
    for node in ast.walk(tree):
        allowed = (
            ast.Expression,
            ast.BoolOp,
            ast.And,
            ast.Or,
            ast.Compare,
            ast.BinOp,
            ast.UnaryOp,
            ast.Name,
            ast.Load,
            ast.Constant,
            ast.Call,
            *_BIN.keys(),
            *_CMP.keys(),
            *_UNARY.keys(),
        )
        if not isinstance(node, allowed):
            raise ExpressionError(f"Disallowed syntax {type(node).__name__} in {source!r}")
        if isinstance(node, ast.Call) and not isinstance(node.func, ast.Name):
            raise ExpressionError(f"Only simple function calls allowed in {source!r}")
    return tree


def evaluate(source: str, names: Mapping[str, Any], funcs: Mapping[str, Callable] | None = None) -> Any:
    tree = compile_expr(source)
    fn_table = {**BASE_FUNCS, **(funcs or {})}

    def ev(node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            if node.id in ("True", "False"):
                return node.id == "True"
            value = names.get(node.id, 0)
            return 0 if value is None else value
        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(ev(v) for v in node.values)
            return any(ev(v) for v in node.values)
        if isinstance(node, ast.UnaryOp):
            return _UNARY[type(node.op)](ev(node.operand))
        if isinstance(node, ast.BinOp):
            return _BIN[type(node.op)](ev(node.left), ev(node.right))
        if isinstance(node, ast.Compare):
            left = ev(node.left)
            for op, comp in zip(node.ops, node.comparators):
                right = ev(comp)
                if not _CMP[type(op)](left, right):
                    return False
                left = right
            return True
        if isinstance(node, ast.Call):
            fn = fn_table.get(node.func.id)
            if fn is None:
                raise ExpressionError(f"Unknown function {node.func.id}")
            return fn(*[ev(a) for a in node.args])
        raise ExpressionError(f"Unsupported node {type(node).__name__}")

    return ev(tree)
