/* eslint-disable @typescript-eslint/no-var-requires */
const { AutotaskClient } = require("defender-autotask-client");

require("dotenv").config();

async function main() {
  console.log(`Uploading rolled up code to Defender...`);

  const defenderClient = new AutotaskClient({
    apiKey: process.env.OZ_API_KEY,
    apiSecret: process.env.OZ_API_SECRET,
  });

  await defenderClient.updateCodeFromFolder(
    process.env.OZ_AUTOTASK_ID,
    "./build"
  );

  console.log(`Complete!`);
}

main()
  .then(() => process.exit(0))
  .catch(() => {
    process.exit(1);
  });
