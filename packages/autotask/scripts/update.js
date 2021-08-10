/* eslint-disable @typescript-eslint/no-var-requires */
const { AutotaskClient } = require("defender-autotask-client");

require("dotenv").config({ path: "../../.env" });

const parseDefenderCreds = () => {
  return JSON.parse(process.env.DEFENDER_CREDENTIALS);
};

async function main() {
  console.log(`Uploading rolled up code to Defender...`);
  const creds = parseDefenderCreds();

  const defenderClient = new AutotaskClient({
    apiKey: creds.apiKey,
    apiSecret: creds.apiSecret,
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
