import { calculateOdds } from "@poker-core/calculate-odds/calculate-odds.ts";
import { Round, validateRound } from "@poker-core/round/round.ts";
import {
  Application,
  Context,
  Next,
  Router,
} from "https://deno.land/x/oak@v14.0.0/mod.ts";

const port = Number(Deno.env.get("PORT") || "7071");

let iterations = Number(Deno.env.get("ITERATIONS"));

if (!iterations || iterations <= 0) {
  console.error("iterations invalid value. Will use default value: 50_000");
  iterations = 50_000;
}

const apiKey = Deno.env.get("APIKEY");

const router = new Router();
router.post("/api/calcOdds", validateClient, async (ctx) => {
  let body: { estimate: number; round: Round };
  try {
    body = await ctx.request.body.json();
  } catch {
    return ctx.throw(400, "failed to parse body");
  }
  if (!validateRound(body.round)) {
    return ctx.throw(400, "invalid round payload");
  }
  const odds = calculateOdds(body.round, iterations);
  ctx.response.body = { odds };
});
router.get("/liveness", (ctx) => {
  ctx.response.body = "Liveness Check Passed";
});
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port });

function validateClient(ctx: Context, next: Next) {
  if (!apiKey) return next();
  else if (apiKey === ctx.request.headers.get("x-api-key")) next();
  else ctx.response.status = 403;
}
