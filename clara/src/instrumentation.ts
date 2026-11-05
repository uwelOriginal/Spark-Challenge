// Runs once when the server starts, so reminders keep going out after a restart even if nobody opens the app.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./lib/pushServer")).startScheduler();
}
