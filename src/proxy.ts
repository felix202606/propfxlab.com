import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next.js 16 把 middleware.ts 改名为 proxy.ts（功能不变），
 * next-intl 的 createMiddleware 默认导出可以直接复用，无需改动内部逻辑。
 */
export default createMiddleware(routing);

export const config = {
  // 匹配除 /api、/trpc、/_next、/_vercel 以及带文件后缀（如 favicon.ico）之外的所有路径
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
