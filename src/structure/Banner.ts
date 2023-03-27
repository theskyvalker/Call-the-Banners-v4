import fs from 'fs';
import Path from 'path';
import { ColorResolvable } from 'discord.js';
import { Player } from './Player';
import { client } from '..';
import sharp from 'sharp';
import { sleep } from '@jiman24/discordjs-utils';

const DATA_DIR = Path.resolve(__dirname, "../../data");
const BANNERS_DATA = JSON.parse(fs.readFileSync(`${DATA_DIR}/bannersRawData.json`).toString());
const ELEMENTS_BY_BONUS = JSON.parse(fs.readFileSync(`${DATA_DIR}/elements_with_levels_by_bonus.json`).toString());
const CATEGORIES_BY_ELEMENT = JSON.parse(fs.readFileSync(`${DATA_DIR}/category_by_element.json`).toString());
const LEVELS_BY_BONUS: { [index: string]: { [index: string]: string[] } } = JSON.parse(fs.readFileSync(`${DATA_DIR}/levels_by_bonus.json`).toString());
const SET_BONUS_BY_STRENGTH: { [index: string]: string[] } = JSON.parse(fs.readFileSync(`${DATA_DIR}/set_bonus_by_strength.json`).toString());

const BANNERS_DATA_PROCESSED = JSON.parse(fs.readFileSync(`${DATA_DIR}/bannersStatsData.json`).toString())
const BANNERS_STRENGTHS_PROCESSED = JSON.parse(fs.readFileSync(`${DATA_DIR}/bannerStrengths.json`).toString())
const BANNERS_ELEMENTS_PROCESSED = JSON.parse(fs.readFileSync(`${DATA_DIR}/bannerElements.json`).toString())

const LEVEL_UP_MAX_3 = 1;
const LEVEL_UP_4 = 2;

const BANNERS_ABI = JSON.parse(fs.readFileSync(`${DATA_DIR}/banners-abi.json`).toString());
const BANNERS_CONTRACT_ADDRESS = process.env.BANNERS_CONTRACT_ADDRESS || '';

function isValidCriteria(element: string, levelUpCriteria: Array<string>, banner: string[]): number {
  const counts = findPair(banner);
  let countValid = 0;
  for (let criterion of levelUpCriteria) {
    if (criterion.includes(CATEGORIES_BY_ELEMENT[element])) {
      countValid += 1;
    }
    if (criterion.includes("Pair") && counts[element] == 2) {
      countValid += 1;
    }
  }
  return countValid;
}

async function getBannerCount(): Promise<number> {
  const sdk = require('api')('@reservoirprotocol/v1.0#1c7mlmlctlk6l5');
  sdk.auth(process.env.BANNERS_RESERVOIR_API_KEY);
  let result = await sdk.getCollectionsV5({ id: BANNERS_CONTRACT_ADDRESS, accept: '*/*' });
  return parseInt(result.data['collections'][0]['tokenCount']);
}

function findPair(banner: string[]): { [index: string]: number } {
  let counts: { [index: string]: number } = {};
  for (let element of banner) {
    if (element in counts) {
      counts[element] += 1;
    }
    else {
      counts[element] = 1;
    }
  }
  return counts;
}

function assignBonusToElement(element: string, levelUp: number, levelUpCriteria: Array<string>, banner: string[]): string[] {
  //console.log(element);
  for (let bonus of Object.keys(ELEMENTS_BY_BONUS)) {
    for (let level of Object.keys(ELEMENTS_BY_BONUS[bonus])) {
      for (let queryElement of ELEMENTS_BY_BONUS[bonus][level]) {
        if (queryElement[0] === element) {
          let effectiveLevel = parseInt(level);
          let validCriteriaCount = isValidCriteria(element, levelUpCriteria, banner)
          if (levelUp === LEVEL_UP_MAX_3 && validCriteriaCount) {
            effectiveLevel += validCriteriaCount;
            if (effectiveLevel > 3) {
              effectiveLevel = 3;
            }
          } else if (levelUp == LEVEL_UP_4) {
            effectiveLevel = 4;
          }
          let result = LEVELS_BY_BONUS[bonus as keyof Object][effectiveLevel.toString() as keyof Object];
          return result;
        }
      }
    }
  }
  return ["", ""];
}

async function downloadImage(image_url: string, filename: string) {
  try {
    const res = await fetch(image_url);
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filename, buffer);
    //console.log("Successfully saved image to: " + path.join(DATA_DIR, filename));
  } catch (e) {
    console.log("Failed to download image with error: " + e);
  }
}

async function cropImage(filename: string) {
  const image = sharp(filename)
    .extract({ left: 650, top: 250, width: 700, height: 1480 });
  fs.writeFileSync(Path.basename(filename).split('.')[0] + '_cropped' + Path.extname(filename), await image.toBuffer());
}

async function _uploadImage(fileOnDisk: string, fileName: string) {

  try {
    var ImageKit = require("imagekit");

    var imagekit = new ImageKit({
      publicKey: process.env.BANNERS_IK_PUBLIC_KEY,
      privateKey: process.env.BANNERS_IK_PRIVATE_KEY,
      urlEndpoint: process.env.BANNERS_IK_ENDPOINT_URL
    });

    let data = fs.readFileSync(fileOnDisk);
    //console.log(data.byteLength);
    imagekit.upload({
      file: data, //required
      fileName: fileName, //required
      useUniqueFileName: false,
      folder: "/Banners"
    }, function (error: Error, result: any) {
      if (error) console.log(error);
      else console.log(result);
    });
  } catch (e) {
    console.log(`Failed to upload image with error: ${e}`)
  }
}

async function uploadImage(bannerID: string) {
  const fileOnDisk = `${bannerID}_cropped.png`;
  const fileName = `${bannerID}.png`

  await _uploadImage(fileOnDisk, fileName);
}

export async function getTraitsAlternate(bannerID: string): Promise<{ [index: string]: string }[]> {
  const Web3 = require('web3');
  const web3 = new Web3(process.env.ALCHEMY_ETHER_PROVIDER);
  const contract = new web3.eth.Contract(BANNERS_ABI, BANNERS_CONTRACT_ADDRESS);
  const tokenData = await (await fetch(await contract.methods.tokenURI(bannerID).call())).json();
  return tokenData['traits'];
}

export async function processImage(bannerID: string) {
  const Web3 = require('web3');
  const web3 = new Web3(process.env.ALCHEMY_ETHER_PROVIDER);
  const contract = new web3.eth.Contract(BANNERS_ABI, BANNERS_CONTRACT_ADDRESS);
  const tokenData = await (await fetch(await contract.methods.tokenURI(bannerID).call())).json();
  const imageURL = tokenData['image_url'] + "?transparent=true";
  await downloadImage(imageURL, bannerID + ".png");
  await cropImage(bannerID + ".png");
  await uploadImage(bannerID);
}

function constructImageURL(bannerID: number): string {
  return process.env.BANNERS_IK_ENDPOINT_URL + "/Banners/" + bannerID + ".png?"
}

export async function getBannerCollection(address: string): Promise<number[]> {
  const sdk = require('api')('@reservoirprotocol/v1.0#1c7mlmlctlk6l5');
  sdk.auth(process.env.BANNERS_RESERVOIR_API_KEY || 'demo-api-key');
  sdk.server('https://api.reservoir.tools');

  let continuation = null;
  let res, bannersList: number[] = [];

  do {
    if (continuation != null) {
      //console.log("using with continuation " + continuation);
      res = await sdk.getUsersUserTokensV6({
        contract: BANNERS_CONTRACT_ADDRESS,
        sortDirection: 'asc',
        limit: '200',
        user: address,
        accept: '*/*',
        continuation: continuation
      });
    } else {
      //console.log("using without continuation");
      res = await sdk.getUsersUserTokensV6({
        contract: BANNERS_CONTRACT_ADDRESS,
        sortDirection: 'asc',
        limit: '200',
        user: address,
        accept: '*/*'
      })
    }
    var banners: Object[] = Array.from(res.data['tokens']);
    for (var banner of banners) {
      bannersList.push(parseInt(banner['token' as keyof Object]['tokenId' as keyof Object].toString()));
    }
    continuation = res.data['continuation'];
    //console.log(continuation);
  } while (continuation != null);

  return bannersList;
}

async function getOnChainBannerData(bannerID: number): Promise<{ [index: string]: string }[]> {
  const sdk = require('api')('@reservoirprotocol/v1.0#1c7mlmlctlk6l5');
  sdk.auth(process.env.BANNERS_RESERVOIR_API_KEY);
  try {
    let result = await sdk.getTokensV5({
      tokens: `${BANNERS_CONTRACT_ADDRESS}%3A${bannerID}`,
      includeAttributes: 'true',
      accept: '*/*'
    });
    let traits = [];
    for (let attribute of result.data['tokens'][0]['token']['attributes']) {
      traits.push({ 'trait_type': attribute['key'], 'value': attribute['value'] });
    }
    //check if traits fetch was successful, if not, try to fetch using an alternate API once
    return (traits.length > 5) ? traits : await getTraitsAlternate(bannerID.toString());
  } catch (e) {
    console.error(`fetching on-chain data for banner ID: ${bannerID} failed with error: ${e}`);
    throw new Error(`fetching on-chain data for banner ID: ${bannerID} failed!`);
  }
}

async function checkBannerInCollection(bannerID: number, player: Player) {
  const address = client.ethAddress.findAddress(player.id);
  if (!address) {
    throw new Error(`you need to be enlisted to call a banner`);
  }
  const collection = await getBannerCollection(address);
  return collection.includes(bannerID);
}

export async function setBannerForPlayer(bannerID: number, player: Player): Promise<Player> {
  if (!await checkBannerInCollection(bannerID, player)) {
    throw new Error(`provided banner ID is not in your collection!`)
  }
  const bannerData = await getBannerInfo(bannerID);
  // code to allocate banner bonuses to various player attributes
  console.log(bannerData[1]);
  console.log(bannerData[2]);
  player.resetNftBonuses();
  player = resolveStrengthBuffs(player, bannerData[1]);
  player = resolveElementBuffs(player, bannerData[2]);
  player.calledBanner = bannerID;
  if (!player.flyingBanner) player.flyingBanner = bannerID;
  return player;
}

export async function flyBannerForPlayer(bannerID: number, player: Player): Promise<Player> {
  if (!await checkBannerInCollection(bannerID, player)) {
    throw new Error(`provided banner ID is not in your collection!`)
  }
  player.flyingBanner = bannerID;
  return player;
}

function parseNumber(inp: string) {
  if (parseInt(inp).toString() !== inp) {
    return parseFloat(inp);
  } else {
    return parseInt(inp);
  }
}

export async function checkImageExists(bannerID: string) {
  var ImageKit = require("imagekit");

  var imagekit = new ImageKit({
    publicKey: process.env.BANNERS_IK_PUBLIC_KEY,
    privateKey: process.env.BANNERS_IK_PRIVATE_KEY,
    urlEndpoint: process.env.BANNERS_IK_ENDPOINT_URL
  });

  let fileList = await imagekit.listFiles({
    searchQuery: `name="${bannerID}.png"`,
    path: "Banners"
  });

  if (fileList.length > 0) {
    return true;
  } else {
    await processImage(bannerID);
    await sleep(4000); //add a delay to let the uploading complete
    return true;
  }
}

export async function getBannerInfo(bannerID: number, forceChain: boolean = false): Promise<[{ stats: { name: string, value: string }[], statsBreakdown: { name: string, value: string }[], imageURL: string, color: ColorResolvable }, { [index: string]: { names: string[], val: number } }, { [index: string]: { names: string[], val: number } }]> {
  if (bannerID < 1 || bannerID > await getBannerCount()) {
    throw new Error(`banner ID not valid`);
  } else if (!forceChain && bannerID in BANNERS_DATA_PROCESSED) {
    console.log(`Fetching data from cache for ID ${bannerID}`);
    if (BANNERS_DATA_PROCESSED[bannerID].stats.length === 0) {
      //no stats possibly means that our existing cached copy is invalid
      return getBannerInfo(bannerID, true);
    } else {
      //ensure that image has been uploaded before returning from cache
      await checkImageExists(bannerID.toString());
      return [BANNERS_DATA_PROCESSED[bannerID], BANNERS_STRENGTHS_PROCESSED[bannerID], BANNERS_ELEMENTS_PROCESSED[bannerID]];
    }
  } else {
    console.log(`Fetching data from the chain for ID ${bannerID}`)
    BANNERS_DATA[bannerID] = {};
    BANNERS_DATA[bannerID]['traits'] = await getOnChainBannerData(bannerID);
    await processImage(bannerID.toString());
    console.log(BANNERS_DATA[bannerID]);
    fs.writeFileSync(`${DATA_DIR}/bannersRawData.json`, JSON.stringify(BANNERS_DATA, null, 4));
  }
  let bannerStats = [];
  let bannerStrengths: { [index: string]: { names: string[], val: number } } = {};
  let bannerElements: { [index: string]: { names: string[], val: number } } = {};
  let levelUp = 0;
  let levelUpCriteria = [];
  let banner = [];
  let color: ColorResolvable = "RANDOM";
  for (let trait of BANNERS_DATA[bannerID]['traits']) {
    if (trait['trait_type'] === 'Element') {
      banner.push(trait['value']);
    }
    if (trait['trait_type'] === 'Color') {
      try {
        color = trait['value'].split('/')[0].toUpperCase() as ColorResolvable;
      } catch (e) {
        console.log(e);
      }
    }
    if (trait['trait_type'] === 'Strength') {
      if (trait['value'] in SET_BONUS_BY_STRENGTH) {
        let setBonus = SET_BONUS_BY_STRENGTH[trait['value'] as keyof typeof SET_BONUS_BY_STRENGTH];
        bannerStats.push({ name: `Strength: ${trait['value']}`, value: setBonus[0].replace("{}", setBonus[1]) });
        if (setBonus[0] in bannerStrengths) {
          bannerStrengths[setBonus[0]].val += parseInt(setBonus[1]);
          bannerStrengths[setBonus[0]].names.push(trait['value']);
        } else {
          bannerStrengths[setBonus[0]] = { names: [trait['value']], val: parseInt(setBonus[1]) };
        }
        if (setBonus[0] === "Level up respective bonuses (from level 1 to 2 and level 2 to 3)") {
          levelUp = LEVEL_UP_MAX_3;
          levelUpCriteria.push(trait['value']);
        } else if (setBonus[0] === "Unlock a level 4 bonus") {
          levelUp = LEVEL_UP_4;
          levelUpCriteria.push(trait['value']);
        }
      }
    }
  }
  for (let trait of BANNERS_DATA[bannerID]['traits']) {
    let bonus = assignBonusToElement(trait['value'], levelUp, levelUpCriteria, banner);
    if (trait['trait_type'] === 'Element') {
      if (bonus[0] in bannerElements) {
        bannerElements[bonus[0]].names.push(trait['value']);
        bannerElements[bonus[0]].val += parseNumber(bonus[1]);
      } else {
        bannerElements[bonus[0]] = { names: [trait['value']], val: parseNumber(bonus[1]) };
      }
      bannerStats.push({ name: `Element: ${trait['value']}`, value: bonus[0].replace("{}", bonus[1]) });
    }
  }

  let bannerStatsCumulative = [];
  for (let strength of Object.keys(bannerStrengths)) {
    bannerStatsCumulative.push({ name: strength.replace("{}", bannerStrengths[strength].val.toString()), value: bannerStrengths[strength].names.toString() });
  }
  for (let element of Object.keys(bannerElements)) {
    bannerStatsCumulative.push({ name: element.replace("{}", bannerElements[element].val.toString()), value: bannerElements[element].names.toString() });
  }

  BANNERS_DATA_PROCESSED[bannerID] = {
    stats: bannerStatsCumulative,
    statsBreakdown: bannerStats,
    imageURL: constructImageURL(bannerID),
    color: color
  };
  BANNERS_ELEMENTS_PROCESSED[bannerID] = bannerElements;
  BANNERS_STRENGTHS_PROCESSED[bannerID] = bannerStrengths;
  fs.writeFileSync(`${DATA_DIR}/bannersStatsData.json`, JSON.stringify(BANNERS_DATA_PROCESSED, null, 4));
  fs.writeFileSync(`${DATA_DIR}/bannerStrengths.json`, JSON.stringify(BANNERS_STRENGTHS_PROCESSED, null, 4));
  fs.writeFileSync(`${DATA_DIR}/bannerElements.json`, JSON.stringify(BANNERS_ELEMENTS_PROCESSED, null, 4));
  await checkImageExists(bannerID.toString()); //this is a new banner, so verify that the image is uploaded
  return [BANNERS_DATA_PROCESSED[bannerID], BANNERS_STRENGTHS_PROCESSED[bannerID], BANNERS_ELEMENTS_PROCESSED[bannerID]];
}


function resolveStrengthBuffs(player: Player, bonuses: { [index: string]: { names: string[]; val: number; }; }): Player {
  for (let bonus of Object.keys(bonuses)) {
    switch (bonus) {
      case "Loot command completes {}% faster": {
        player.nftBonuses.lootCooldownFactor = (100 - bonuses[bonus].val) / 100;
        break;
      }
      case "Deal {} more damage to castles with every attack": {
        player.nftBonuses.attackFinalDamageAddition += bonuses[bonus].val;
        break;
      }
      case "{}% chance to double the bonus of matched elements": {
        player.nftBonuses.bonusDoubleChance += bonuses[bonus].val;
        break;
      }
      case "Attacks take 8 hours to complete but deal 50% more damage": {
        player.nftBonuses.attackCooldownAddition = 8 - player.COOLDOWN;
        player.nftBonuses.attackMultiplyFactor = 1.5;
        break;
      }
      case "All cooldowns cut by half": {
        player.nftBonuses.globalCooldownModifierFactor = 1 / 2;
        break;
      }
      case "Reroll first round duel damage and take the higher number": {
        player.nftBonuses.duelRerollRound1Damage = true;
        break;
      }
    }
  }
  return player;
}

function resolveElementBuffs(player: Player, bonuses: { [index: string]: { names: string[]; val: number; }; }): Player {
  for (let bonus of Object.keys(bonuses)) {
    switch (bonus) {
      case "{}% less chance for negative loot effects": {
        player.nftBonuses.lootNegativeChanceReduction += bonuses[bonus].val;
        break;
      }
      case "+{}% chance to find rare loot": {
        player.nftBonuses.lootRareChanceAddition += bonuses[bonus].val;
        break;
      }
      case "Deal {}% more damage in duels": {
        player.nftBonuses.duelDamageAddition += bonuses[bonus].val;
        break;
      }
      case "Win extra {}% coins from duels": {
        player.nftBonuses.duelCoinAddition += bonuses[bonus].val;
        break;
      }
      case "+{} minimum attack damage against castles": {
        player.nftBonuses.attackMinDamageAddition += bonuses[bonus].val;
        break;
      }
      case "+{} maximum attack damage against castles": {
        player.nftBonuses.attackMaxDamageAddition += bonuses[bonus].val;
        break;
      }
      case "Sharpen costs {} less coins": {
        player.nftBonuses.coinSharpenCostReduction += bonuses[bonus].val;
        break;
      }
      case "Find {}% extra coins from looting": {
        player.nftBonuses.coinLootRewardAddition += bonuses[bonus].val;
        break;
      }
      case "Successful parries block {} more damage": {
        player.nftBonuses.parryBonusValAddition += bonuses[bonus].val;
        break
      }
      case "Parries fail {}% less often": {
        player.nftBonuses.parryFailChanceReduction += bonuses[bonus].val;
        break
      }
    }
    if (bonus.includes("increased trebuchet damage")) {
      player.nftBonuses.trebuchetEVAddition = bonuses[bonus].val;
    }
    if (bonus.includes("increased arrow slits damage")) {
      player.nftBonuses.arrowsEVAddition = bonuses[bonus].val;
    }
  }
  return player;
}