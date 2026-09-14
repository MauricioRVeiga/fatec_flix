async function main() {
  for (const file of [".env", ".env.local"]) {
    try {
      process.loadEnvFile(file);
    } catch {}
  }

  const { syncChannels } = await import("../services/sync-channels");

  console.log("Channel Sync\n");

  const result = await syncChannels();

  console.log(`Received: ${result.received}`);
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Errors: ${result.failed}`);
  console.log();

  if (result.status === "skipped") {
    console.log(`Sync skipped: ${result.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "failed") {
    console.error(`Sync failed: ${result.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "partial") {
    console.log(`Sync completed with ${result.failed} invalid record(s).`);
    return;
  }

  console.log("Sync completed successfully.");
}

main().catch(async (error) => {
  const { toErrorMessage } = await import("../lib/utils");
  console.error("Sync crashed:", toErrorMessage(error));
  process.exitCode = 1;
});
