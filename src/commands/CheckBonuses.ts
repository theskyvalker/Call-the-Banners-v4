import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { Player } from "../structure/Player";
import { botCommandChannelFilter } from "../utils";
import paginationEmbed from "@psibean/discord.js-pagination";
import { client } from "..";

type NftBonuses = {
  [key: string]: any;
};

type ConvertedBonus = {
  name: string;
  value: string;
};

const NFT_BONUS_DEFAULTS: { [index: string]: [any, string] } =
{
  bonusDoubleChance: [0, "Chance to double the bonus of matched elements"],
  lootNegativeChanceReduction: [0, "Less chance for negative loot effects"],
  lootRareChanceAddition: [0, "More chance for rare loot"],
  duelDamageAddition: [0, "% damage boost during duels"],
  duelCoinAddition: [0, "Win % more coins from duel wins"],
  attackMinDamageAddition: [0, "Higher min attack value"],
  attackFinalDamageAddition: [0, "Added attack value against castles"],
  attackMaxDamageAddition: [0, "Higher maximum attack value"],
  trebuchetEVAddition: [0, "Increased trebuchet damage"], // same as the value declared in src/structure/Player.ts
  arrowsEVAddition: [0, "Increased arrow slits effectiveness"], // same as the value declared in src/structure/Player.ts
  coinSharpenCostReduction: [0, "Sharpen Cost Reduction"],
  coinLootRewardAddition: [0, "Added Loot Coins Rewards"],
  parryBonusValAddition: [0, "More damage blocked with parries"],
  parryFailChanceReduction: [0, "Less chance to fail parries"],
  attackCooldownAddition: [0, "Longer attack cooldown"],
  attackMultiplyFactor: [1, "Damage multiplier for attacks"],
  lootCooldownFactor: [1, "Cooldown factor for loot"],
  duelRerollRound1Damage: [false, "Reroll first round duel damage and take the higher number"],
  globalCooldownModifierFactor: [1, "Global cooldown factor"]
}

const TEMP_BUFF_DEFAULTS: { [index: string]: [number, string] } = {
  "global attack": [0, "Extra damage on next attack"],
  "parry val": [0, "Block extra damage on next parry"],
  "sharpen cost": [0, "Modifier for next sharpen cost"],
  "loot rare chance": [0, "Rare chance modifier for next loot"],
  "duel damage": [0, "Damage modifier for next duel"],
  "castle attack": [0, "Extra damage to castles with next attack"],
  "attack cooldown trigger": [0, "!attack won't trigger cooldown"],
  "loot fail chance": [0, "Modified chance for negative loot outcome"]
}

export default class extends Command {
  name = "bonuses";
  description = "!bonuses show your currently active bonuses. EX)!bonuses";

  convertNftBonusesToArray(nftBonuses: NftBonuses): ConvertedBonus[] {
    const bonusesArray: ConvertedBonus[] = [];

    for (const key in nftBonuses) {
      if (nftBonuses.hasOwnProperty(key) && (key in NFT_BONUS_DEFAULTS && nftBonuses[key] != NFT_BONUS_DEFAULTS[key][0])) {
        bonusesArray.push({
          name: NFT_BONUS_DEFAULTS[key][1],
          value: nftBonuses[key].toString(),
        });
      }
    }

    return bonusesArray;
  }

  convertTempBonusesToArray(nftBonuses: NftBonuses): ConvertedBonus[] {
    const bonusesArray: ConvertedBonus[] = [];

    for (const key in nftBonuses) {
      if (nftBonuses.hasOwnProperty(key) && (key in TEMP_BUFF_DEFAULTS && nftBonuses[key] != TEMP_BUFF_DEFAULTS[key][0])) {
        bonusesArray.push({
          name: TEMP_BUFF_DEFAULTS[key][1],
          value: nftBonuses[key].toString(),
        });
      }
    }
    return bonusesArray;
  }

  async exec(msg: Message, _args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    const user = msg.author;
    const player = Player.fromUser(user);
    const thumbnail = user.avatarURL();

    let buffString;

    if (player.calledBanner) {
      buffString = `Permanent Buffs from Banner #${player.calledBanner}`
    } else {
      buffString = `No banner called.`
    }

    let sharpenAvail = false;
    const playerSharpen = client.sharpenHistory.getPlayerSharpen(player.id, false)[0];
    if (playerSharpen && !playerSharpen.used) sharpenAvail = true;

    const tempBonusArr = this.convertTempBonusesToArray(player.tempBuffs);
    tempBonusArr.push({ name: "Sharpen Active?", value: sharpenAvail.toString() });

    const permBonuses = new MessageEmbed()
      .setColor("RANDOM")
      .setTitle(`Active Bonuses for ${player.name}`)
      .setThumbnail(thumbnail || "https://w7.pngwing.com/pngs/304/275/png-transparent-user-profile-computer-icons-profile-miscellaneous-logo-monochrome-thumbnail.png")
      .setDescription(buffString)
      .addFields(this.convertNftBonusesToArray(player.nftBonuses));

    const tempBonuses = new MessageEmbed()
      .setColor("RANDOM")
      .setTitle(`Active Bonuses for ${player.name}`)
      .setThumbnail(thumbnail || "https://w7.pngwing.com/pngs/304/275/png-transparent-user-profile-computer-icons-profile-miscellaneous-logo-monochrome-thumbnail.png")
      .setDescription(`Temporary Buffs`)
      .addFields(tempBonusArr);

    const pagesData = [permBonuses, tempBonuses];
    paginationEmbed(msg, pagesData);
  }
}