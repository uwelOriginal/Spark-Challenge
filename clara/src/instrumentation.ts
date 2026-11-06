// restart the reminder loop on server start
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./lib/pushServer")).startScheduler();
}
