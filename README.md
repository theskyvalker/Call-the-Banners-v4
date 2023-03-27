# Call the Banners v4

## Pre-requisites

<ol>

<li>Create a discord bot at https://discord.com/developers/applications</li>
<li>Node.JS</li>
<li>API keys (depends on your on-chain integration needs): Alchemy, Reservoir, Imagekit</li>

</ol>

## Steps to run:

<ol>

<li>Assign the environment variables - bot token, role IDs, channel IDs, enlist channel ID, API keys, endpoint URLs as indicated in env.sample</li>
<li>Set the values/config needed by Settings.ts, Player.ts, Duel.ts, LootOutcomes.ts, ParryHistory.ts</li>
<li>Adapt Banner.ts as per your NFT collection integration needs - fetching collection data, assigning stat bonuses, fetching images and collection stats</li>
<li>npm install - to install the dependencies</li>
<li>npm run clean && npm run build && nodemon dist/index.js - for testing</li>
<li>npm run clean && npm run build && node dist/index.js - for run</li>

</ol>
