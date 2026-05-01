"use client";

import Cookies from "@/node_modules/@types/js-cookie";
import { authApi } from "./api";
import type { Token, User } from "./types";

const COOKIE_OPTS = { expires: 1, sameSite: "lax" as const };
const REFRESH_OPTS = { expires: 7, sameSite: "lax" as const };

export function saveTokens(token: Token) {
  Cookies.set("access_token", token.access_token, COOKIE_OPTS);
  Cookies.set("refresh_token", token.refresh_token, REFRESH_OPTS);
}

export function clearTokens() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}

export function getAccessToken(): string | undefined {
  return Cookies.get("access_token");
}

export function isAuthenticated(): boolean {
  return !!Cookies.get("access_token");
}

export async function login(email: string, password: string): Promise<User> {
  const token = await authApi.login(email, password);
  saveTokens(token);
  const user = await authApi.me();
  return user;
}

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<User> {
  const user = await authApi.register(email, password, fullName);
  const token = await authApi.login(email, password);
  saveTokens(token);
  return user;
}

export async function logout() {
  try {
    await authApi.logout();
  } finally {
    clearTokens();
  }
}
