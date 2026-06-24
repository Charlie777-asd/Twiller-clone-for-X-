const baseUrl = process.env.HEALTHCHECK_URL || `http://localhost:${process.env.PORT || 5000}`;
const target = `${baseUrl.replace(/\/+$/, "")}/healthz`;

try {
  const response = await fetch(target);
  if (!response.ok) {
    throw new Error(`Healthcheck returned ${response.status}`);
  }

  const body = await response.json();
  if (!body?.ok) {
    throw new Error("Healthcheck payload did not report ok=true");
  }

  console.log(`Healthcheck passed for ${target}`);
} catch (error) {
  console.error(`Healthcheck failed for ${target}: ${error.message}`);
  process.exit(1);
}
