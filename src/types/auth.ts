// Backend auth contract (see AUTH.md).

/** Body of `POST /auth/register`. Only these two fields are accepted (unknown fields → 400). */
export interface RegisterRequest {
  username: string
  password: string
}

/** Body of `POST /auth/login`. */
export type LoginRequest = RegisterRequest

/** `POST /auth/register` (201) and `GET /auth/me` (200). `username` is normalized. */
export interface UserResponse {
  username: string
}

/** `POST /auth/login` (200). */
export interface AccessTokenResponse {
  /** Opaque for the client: sent back as-is, never parsed. */
  accessToken: string
  tokenType: 'Bearer'
  /** ISO-8601, UTC. After it every protected call answers 401. */
  expiresAt: string
}

/** What the client keeps for the current session. */
export interface AuthSession extends AccessTokenResponse {
  username: string
}
