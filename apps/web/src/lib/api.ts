import { env } from "@bisp-final-flow/env/web";

export const API_URL = env.VITE_SERVER_URL.replace(/\/$/, "");

export const apiUrl = (path: string) =>
  `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
