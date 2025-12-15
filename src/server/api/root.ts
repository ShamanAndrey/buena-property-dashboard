import { aiRouter } from "@/server/api/routers/ai";
import { buildingRouter } from "@/server/api/routers/building";
import { postRouter } from "@/server/api/routers/post";
import { propertyRouter } from "@/server/api/routers/property";
import { unitRouter } from "@/server/api/routers/unit";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	post: postRouter,
	property: propertyRouter,
	building: buildingRouter,
	unit: unitRouter,
	ai: aiRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
