"""Tests for authentication endpoints."""
import pytest


def test_register_success(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "new@detectra.ai",
        "password": "securepass123",
        "full_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@detectra.ai"
    assert data["full_name"] == "New User"
    assert "hashed_password" not in data


def test_register_duplicate_email(client, registered_user):
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@detectra.ai",
        "password": "password123",
        "full_name": "Duplicate",
    })
    assert resp.status_code == 409


def test_register_weak_password(client):
    resp = client.post("/api/v1/auth/register", json={
        "email": "weak@detectra.ai",
        "password": "short",
        "full_name": "Weak Pass",
    })
    assert resp.status_code == 422


def test_login_success(client, registered_user):
    resp = client.post("/api/v1/auth/login", data={
        "username": "test@detectra.ai",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, registered_user):
    resp = client.post("/api/v1/auth/login", data={
        "username": "test@detectra.ai",
        "password": "wrongpass",
    })
    assert resp.status_code == 401


def test_get_me(client, registered_user):
    resp = client.get("/api/v1/auth/me", headers=registered_user["headers"])
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@detectra.ai"


def test_get_me_unauthenticated(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_update_profile(client, registered_user):
    resp = client.patch(
        "/api/v1/auth/me",
        json={"full_name": "Updated Name"},
        headers=registered_user["headers"],
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Updated Name"


def test_refresh_token(client, registered_user):
    login = client.post("/api/v1/auth/login", data={
        "username": "test@detectra.ai",
        "password": "password123",
    })
    refresh_token = login.json()["refresh_token"]
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
