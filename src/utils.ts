import { MessageAttachment, MessageEmbed, TextChannel } from "discord.js";
import Canvas, { createCanvas, loadImage } from "@napi-rs/canvas";
import { bold, random } from "@jiman24/discordjs-utils";
import { Message } from "discord.js";
import { Player } from "./structure/Player";
import { client } from ".";
import { General } from "./structure/General";
import { Castle } from "./structure/Castle";
import { checkImageExists, processImage } from "./structure/Banner";
import fs from 'fs';

export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = 60000;
export const MILLISECONDS_PER_HOUR = 3600000;

const FAIRY_CHANCE = 0; // set to a low number to make fairy rarer, minimum (most rare) is 1
const HOF_UPDATE_FREQUENCY = 40;
const FAIRY_COINS_MIN = 0;
const FAIRY_COINS_MAX = 0;

export function chunk<T>(arr: T[], size: number) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
    arr.slice(i * size, i * size + size)
  );
}

export async function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function checkDoubling(bonusDoubleChance: number, origBonus: number): number {
  const roll = random.integer(1, 100);
  return (roll <= bonusDoubleChance) ? 2 * origBonus : origBonus;
}

export function getRandWithExpectedVal(expected: number) {
  let v = 1;
  while (true) {
    //outcome is true with probability p = 1/k
    let outcome = random.realZeroToOneInclusive() < 1 / expected;
    if (outcome)
      return v;
    else
      v++;
  }
}

function makePlayerList(): Array<Player> {
  return client.players.array();
}

function coinFairy(msg: Message) {
  const players = makePlayerList();
  let winner = Player.fromID(random.pick(players).id);
  if (!winner || winner.id === process.env.CTB_ID) return;
  const winnings = random.integer(FAIRY_COINS_MIN, FAIRY_COINS_MAX);
  winner.coins += winnings;
  winner.save();
  msg.channel.send(`The coin fairy appeared and dropped ${bold(winnings)} coins in <@${winner.id}>'s coin pouch!`);
}

async function checkHoF() {
  if (client.hofCounter === HOF_UPDATE_FREQUENCY) {
    refreshHOF();
    client.hofCounter = 0;
  } else {
    client.hofCounter += 1;
  }
}

export function logNonCommandMessage(msg: Message) {
  checkHoF();
  if (msg.author.id == process.env.CTB_ID) return; // don't process messages from the bot for activity
  if (random.integer(1, 100) <= FAIRY_CHANCE) {
    console.log("invoking the coin fairy");
    coinFairy(msg);
  }
}

export function decimalCheck<T>(num: number, decimal: number) {
  return num.toFixed(decimal).replace(/[.,]00$/, "");
}

export function getCastleFromGeneral(general: General) {

  const castleNorth = Castle.fromName("north");
  const castleSouth = Castle.fromName("south");

  if (castleNorth.general) {
    if (general.id == castleNorth.general.id) {
      return castleNorth;
    } else {
      return castleSouth;
    }
  } else {
    return undefined;
  }

}

export function getMedal(num: number) {
  switch (num) {
    case 1:
      return ":first_place:";
    case 2:
      return ":second_place:";
    case 3:
      return ":third_place:";
  }

  return num;
}

export async function getCastleImage(
  currenthp: number,
  initialhp: number,
  castleName: string
) {
  const hpBarWidth = 350;

  const hpPercentage = currenthp / initialhp;

  const canvas = Canvas.createCanvas(400, 280);
  const context = canvas.getContext("2d");
  let background = await Canvas.loadImage(
    getBaseCastleImage(hpPercentage, castleName)
  );

  // This uses the canvas dimensions to stretch the image onto the entire canvas
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  context.beginPath();
  context.fillStyle = "#4C4E52";
  context.rect(25, 25, hpBarWidth, 5);
  context.stroke();
  context.fill();

  let setHpBarWidth = (hpPercentage % 1) * hpBarWidth;
  if (hpPercentage >= 1) {
    setHpBarWidth = hpBarWidth;
  }

  context.beginPath();
  context.fillStyle = "#FF0000";
  context.rect(25, 25, setHpBarWidth, 5);
  context.stroke();
  context.fill();

  if (hpPercentage > 1) {
    context.beginPath();
    context.fillStyle = "#B800B2";
    context.rect(25, 25, (hpPercentage - 1) * hpBarWidth, 5);
    context.stroke();
    context.fill();
  }

  const attachment = new MessageAttachment(
    await canvas.encode("png"),
    "castle.png"
  );

  return attachment;
}

export function getBaseCastleImage(percentage: number, castleName: string) {
  switch (castleName) {
    case "north":
      if (percentage > 0.65) {
        return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997364968722463/CastleState1Blue.png";
      }
      if (percentage > 0.35) {
        return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997367896346664/CastleState2Blue.png";
      }
      if (percentage > 0) {
        return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997369062371388/CastleState3Blue.png";
      }

      return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997370832375808/CastleState4Blue.png";

    case "south":
      if (percentage > 0.65) {
        return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997365295894598/CastleState1Red.png";
      }
      if (percentage > 0.35) {
        return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997368437424148/CastleState2Red.png";
      }
      if (percentage > 0) {
        return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997369439862784/CastleState3Red.png";
      }

      return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997371167916053/CastleState4Red.png";
  }

  return "https://cdn.discordapp.com/attachments/1008996898155286590/1008997364968722463/CastleState1Blue.png";
}

// set different thresholds of min_roll_value, max_roll_value, hp difference factor for damage

const CHANCE_BY_MULTIPLIER = [
  [1, 50, 0.9],
  [51, 100, 0.7]
]

export function getMultiplierv2(hpDiff: number) {
  const roll = random.integer(1, 100);
  console.log(`rolled ${roll} for multipler v2`);
  console.log(`hp diff is ${hpDiff}`);
  for (let tuple of CHANCE_BY_MULTIPLIER) {
    if (roll >= tuple[0] && roll <= tuple[1]) {
      return tuple[2];
    }
  }
  return 0.5; // default fallback value
}

export function botCommandChannelFilter(channelId: string) {
  const botCommandChannels = process.env.BOT_COMMAND_CHANNEL_IDS!.split(",");
  if (!botCommandChannels.includes(channelId)) {
    throw new Error("This command only allow in bot command channel");
  }
}

export function enlistChannelFilter(channelId: string) {
  if (channelId != process.env.ENLIST_COMMAND_CHANNEL_ID) {
    throw new Error("This command is only allowed in the enroll channel");
  }
}

export async function createTop3Image(banners: string[], imgName: string) {
  const canvas = createCanvas(700 + 525 + 350 + 50, 1480);
  const ctx = canvas.getContext('2d');
  if (banners[0]) {
    let image1;
    try {
      image1 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/${banners[0]}.png?v4`);
    } catch (e) {
      await processImage(banners[0]);
      await sleep(4000);
      await checkImageExists(banners[0]);
      image1 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/${banners[0]}.png?v4`);
    }
    try {
      ctx.drawImage(image1, 0, 0);
    } catch {
      image1 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/000404.png?v4`);
      ctx.drawImage(image1, 0, 0);
    }
  }
  if (banners[1]) {
    let image2;
    try {
      image2 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/${banners[1]}.png?v4`);
    } catch (e) {
      await processImage(banners[1]);
      await sleep(4000);
      await checkImageExists(banners[1]);
      image2 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/${banners[1]}.png?v4`);
    }
    try {
      ctx.drawImage(image2, 700 + 25, 0, 525, 1110);
    } catch (e) {
      image2 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/000404.png?v4`);
      ctx.drawImage(image2, 0, 0);
    }
  }
  if (banners[2]) {
    let image3;
    try {
      image3 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/${banners[2]}.png?v4`);
    } catch (e) {
      await processImage(banners[2]);
      await sleep(4000);
      await checkImageExists(banners[2]);
      image3 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/${banners[2]}.png?v4`);
    }
    try {
      ctx.drawImage(image3, 700 + 25 + 525 + 25, 0, 350, 740);
    } catch (e) {
      image3 = await loadImage(`https://ik.imagekit.io/moz8vwijd/Banners/000404.png?v4`);
      ctx.drawImage(image3, 0, 0);
    }
  }
  fs.writeFileSync(`./${imgName}`, canvas.toBuffer('image/png'));
  return canvas;
}

function displayNumber(num: number): string {
  if (parseInt(num.toString()) === num) return num.toString();
  return num.toFixed(2);
}

async function updateHallOfFame(bannerIds: Array<string>, msg: string | undefined, descContent: string, title: string, attachFile: string) {
  await createTop3Image(bannerIds, attachFile);
  const embed = new MessageEmbed().setDescription(descContent)
    .setTitle(title)
    .setImage(`attachment://${attachFile}`);
  const hallOfFameChannel: TextChannel = client.channels.resolve(process.env.HALL_OF_FAME_CHANNEL_ID || "") as TextChannel;
  let msgObj;
  if (msg) {
    msgObj = await hallOfFameChannel.messages.fetch({}, { cache: false });
    msgObj = msgObj.get(msg);
    if (msgObj)
      return await msgObj.edit({ embeds: [embed], files: [`./${attachFile}`] });
  }
  return await hallOfFameChannel.send({ embeds: [embed], files: [`./${attachFile}`] });
}

async function updateHallOfInfamy(bannerIds: Array<string>, msg: string | undefined, descContent: string, title: string, attachFile: string) {
  await createTop3Image(bannerIds, attachFile);
  const embed = new MessageEmbed().setDescription(descContent)
    .setTitle(title)
    .setImage(`attachment://${attachFile}`);
  const hallOfFameChannel: TextChannel = client.channels.resolve(process.env.HALL_OF_INFAMY_CHANNEL_ID || "") as TextChannel;
  let msgObj;
  if (msg) {
    //console.log(msg);
    msgObj = await hallOfFameChannel.messages.fetch({}, { cache: false });
    msgObj = msgObj.get(msg);
    if (msgObj)
      return await msgObj.edit({ embeds: [embed], files: [`./${attachFile}`] });
    //console.log(msgObj);
  }
  return await hallOfFameChannel.send({ embeds: [embed], files: [`./${attachFile}`] });
}

async function getRankingDataTop3(playerRanks: { playerID: string, metric: number }[]): Promise<[string, string[]]> {
  let descContent = "";
  let bannerIds: string[] = [];

  for (let i = 0; i < 3; ++i) {
    try {
      let player = Player.fromID(playerRanks[i].playerID);
      //console.log(player?.name);
      if (playerRanks[i] && player) {
        descContent += getMedal(i + 1) + bold(player.name) + ": " + bold(displayNumber(playerRanks[i].metric)) + "\n";
        bannerIds.push(await player.getFlyingBanner());
      } else {
        bannerIds.push("");
      }
    } catch (e) {
      continue;
    }
  }
  return [descContent, bannerIds];
}

async function getRankingDataBottom3(playerRanks: { playerID: string, metric: number }[]): Promise<[string, string[]]> {
  let descContent = "";
  let bannerIds: string[] = [];
  let count = 0;

  for (let i = playerRanks.length - 1; i >= playerRanks.length - 3; --i) {
    try {
      let player = Player.fromID(playerRanks[i].playerID);
      if (playerRanks[i] && player) {
        count += 1;
        descContent += getMedal(count) + bold(player.name) + ": " + bold(displayNumber(playerRanks[i].metric)) + "\n";
        bannerIds.push(await player.getFlyingBanner());
      } else {
        bannerIds.push("");
      }
    } catch (e) {
      continue;
    }
  }
  return [descContent, bannerIds];
}

async function getRankingDataBottom3Negatives(playerRanks: { playerID: string, metric: number }[]): Promise<[string, string[]]> {
  let descContent = "";
  let bannerIds: string[] = [];
  let count = 0;

  for (let i = playerRanks.length - 1; i >= playerRanks.length - 3; --i) {
    try {
      let player = Player.fromID(playerRanks[i].playerID);
      if (playerRanks[i] && player && playerRanks[i].metric < 0) {
        count += 1;
        descContent += getMedal(count) + bold(player.name) + ": " + bold(displayNumber(Math.abs(playerRanks[i].metric))) + "\n";
        bannerIds.push(await player.getFlyingBanner());
      } else {
        bannerIds.push("");
      }
    } catch (e) {
      continue;
    }
  }
  return [descContent, bannerIds];
}

async function calcDuelWonRankings(cutoffDate?: Date) {
  const rankings = client.duelResultHistory.getDuelWonRankings();
  //console.log(rankings);
  let metadata = await getRankingDataTop3(rankings);
  client.hof.hof.duels = (await updateHallOfFame(metadata[1], client.hof.hof.duels, metadata[0], "MOST DUELS WON", "duelTop3.png")).id;
  client.hof.save();
}

async function calcDuelLostRankings(cutoffDate?: Date) {
  const rankings = client.duelResultHistory.getDuelLostRankings();
  //console.log(rankings);
  let metadata = await getRankingDataTop3(rankings);
  client.hof.hoi.duelsLost = (await updateHallOfInfamy(metadata[1], client.hof.hoi.duelsLost, metadata[0], "MOST DUELS LOST", "duelBottom3.png")).id;
  client.hof.save();
}

async function calcAttackRankings(cutoffDate?: Date) {
  let metadata;
  const damageRankings = client.strikeHistory.getTotalDamageRankings(cutoffDate);
  //console.log(damageRankings);
  metadata = await getRankingDataTop3(damageRankings);
  client.hof.hof.totalDamage = (await updateHallOfFame(metadata[1], client.hof.hof.totalDamage, metadata[0], "MOST DAMAGE DEALT", "totalDamageTop3.png")).id;
  const maxRankings = client.strikeHistory.getMaxDamageRankings(cutoffDate);
  //console.log(maxRankings);
  metadata = await getRankingDataTop3(maxRankings);
  client.hof.hof.maxAttack = (await updateHallOfFame(metadata[1], client.hof.hof.maxAttack, metadata[0], "HIGHEST SINGLE ATTACK", "maxDamageTop3.png")).id;
  const minRankings = client.strikeHistory.getMinDamageRankings(cutoffDate);
  metadata = await getRankingDataBottom3(minRankings);
  client.hof.hoi.minAttack = (await updateHallOfInfamy(metadata[1], client.hof.hoi.minAttack, metadata[0], "LOWEST SINGLE ATTACK", "maxDamageBottom3.png")).id;
  const avgRankings = client.strikeHistory.getAverageDamageRankings(cutoffDate);
  //console.log(avgRankings);
  metadata = await getRankingDataTop3(avgRankings);
  client.hof.hoi.leastAvgAttack = (await updateHallOfInfamy(metadata[1], client.hof.hoi.leastAvgAttack, metadata[0], "LEAST AVERAGE DAMAGE", "avgDamageBottom3.png")).id;
  client.hof.save();
}

async function calcCoinRankings(cutoffDate?: Date) {
  let metadata;
  const coinRankings = client.lootHistory.getTotalCoinsRankings();
  //console.log(coinRankings);
  metadata = await getRankingDataTop3(coinRankings);
  client.hof.hof.totalCoins = (await updateHallOfFame(metadata[1], client.hof.hof.totalCoins, metadata[0], "MOST COINS LOOTED", "mostCoinsTop3.png")).id;
  const coinsLostRankings = client.lootHistory.getTotalCoinsLostRankings();
  //console.log(coinsLostRankings);
  metadata = await getRankingDataTop3(coinsLostRankings);
  client.hof.hoi.lostCoins = (await updateHallOfInfamy(metadata[1], client.hof.hoi.lostCoins, metadata[0], "MOST COINS LOST WHILE LOOTING", "mostCoinsBottom3.png")).id;
  client.hof.save();
}

async function calcParryRankings(cutoffDate?: Date) {
  let metadata;
  const parryRankings = client.parryHistory.getTotalParryRankings(cutoffDate);
  //console.log("parry rankings");
  //console.log(parryRankings);
  metadata = await getRankingDataTop3(parryRankings);
  client.hof.hof.totalBlocked = (await updateHallOfFame(metadata[1], client.hof.hof.totalBlocked, metadata[0], "MOST DAMAGE BLOCKED BY PARRYING", "parryBlockedDamageTop3.png")).id;
  //console.log("NEGATIVE PARRY RANKINGS");
  let negativerankings = client.parryHistory.getNegativeParryRankings(cutoffDate);
  metadata = await getRankingDataBottom3Negatives(negativerankings);
  client.hof.hoi.leastDamageBlocked = (await updateHallOfInfamy(metadata[1], client.hof.hoi.leastDamageBlocked, metadata[0], "MOST DAMAGE DEALT WITH FAILED PARRIES", "failedParriesBottom3.png")).id;
  client.hof.save();
}

async function cleanHallOfFame() {
  const hallOfFameChannel: TextChannel = client.channels.resolve(process.env.HALL_OF_FAME_CHANNEL_ID || "") as TextChannel;
  await hallOfFameChannel.bulkDelete(100);
}

async function cleanHallofInfamy() {
  const hallOfFameChannel: TextChannel = client.channels.resolve(process.env.HALL_OF_INFAMY_CHANNEL_ID || "") as TextChannel;
  await hallOfFameChannel.bulkDelete(100);
}

export async function refreshHOF() {

  const cutoffDate = new Date("15 March 2023"); // replace with a cutoff date of your choosing for displaying HoF stats
  //console.log(cutoffDate.toLocaleDateString());

  try {
    await cleanHallOfFame();
    await cleanHallofInfamy();

    await calcAttackRankings(cutoffDate);
    await calcDuelWonRankings();
    await calcDuelLostRankings();
    await calcCoinRankings();
    await calcParryRankings(cutoffDate);
  } catch (e) {
    console.log(`ERROR: ${e} while trying to update Hall of Fame`);
  }

}