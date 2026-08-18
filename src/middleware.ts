import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const authObject = await auth();
    authObject.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\..*).*)", "/"],
};
