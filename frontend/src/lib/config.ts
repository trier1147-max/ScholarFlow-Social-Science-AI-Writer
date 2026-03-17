/**
 * 应用配置 - 支持开发/生产环境
 * 部署时通过环境变量 NEXT_PUBLIC_API_URL 注入后端地址
 */
export const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

/**
 * 构建完整的 API URL
 */
export function getApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
