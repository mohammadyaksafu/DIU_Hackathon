from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.security import Principal, authenticate, create_token, get_principal

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=128)


@router.post("/login")
def login(body: LoginRequest) -> dict:
    role = authenticate(body.username, body.password)
    if role is None:
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_token(body.username, role), "token_type": "bearer", "role": role, "username": body.username}


@router.get("/me")
def me(principal: Principal = Depends(get_principal)) -> dict:
    return {"username": principal.username, "role": principal.role}
