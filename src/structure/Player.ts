import { random } from "@jiman24/discordjs-utils";
import { User, Message, MessageEmbed, TextChannel } from "discord.js";
import { DateTime, Duration } from "luxon";
import { client } from "..";
import { Sword } from "./Sword";
import { Ticket } from "./Ticket";
import { getLootOutcome } from "./LootOutcomes";
import { RALLY_AMOUNT } from "./RallyHistory";
import { MILLISECONDS_PER_HOUR, checkDoubling } from "../utils";
import { getBannerCollection } from "./Banner";

export abstract class Player {
  coins = 0;
  minAttack = 50; // min attack range
  maxAttack = 100; // max attack range
  sharpenMaxAttack = 200; // max attack range with sharpen
  lastAttack = new Date(2000);
  lastLoot = new Date(2000);
  lastLootDuration = 0;
  lastParry = new Date(2000);
  strikeCount = 0;
  battleCount = 0;
  lootCount = 0;
  tickets: Ticket[] = [];
  abstract COOLDOWN: number;
  abstract PARRY_COOLDOWN: number;
  abstract BIG_COOLDOWN: number;
  cooldownEndTime: { [index: string]: DateTime | null } = {
    "attack": null,
    "loot": null,
    "parry": null,
    "big": null,
    "banner": null
  }
  flyingBanner = 0;
  calledBanner = 0;

  // NFT integration active bonuses
  nftBonuses: {
    bonusDoubleChance: number;
    lootNegativeChanceReduction: number;
    lootRareChanceAddition: number;
    duelDamageAddition: number;
    duelCoinAddition: number;
    attackMinDamageAddition: number;
    attackFinalDamageAddition: number;
    attackMaxDamageAddition: number;
    trebuchetEVAddition: number;
    arrowsEVAddition: number;
    coinSharpenCostReduction: number;
    coinLootRewardAddition: number;
    parryBonusValAddition: number;
    parryFailChanceReduction: number;
    attackCooldownAddition: number;
    attackMultiplyFactor: number;
    lootCooldownFactor: number;
    duelRerollRound1Damage: boolean;
    globalCooldownModifierFactor: number;
  } = {
      bonusDoubleChance: 0, //tbd
      lootNegativeChanceReduction: 0, //d
      lootRareChanceAddition: 0, //d
      duelDamageAddition: 0, //d
      duelCoinAddition: 0, //d
      attackMinDamageAddition: 0,
      attackFinalDamageAddition: 0,
      attackMaxDamageAddition: 0,
      trebuchetEVAddition: 0, // set to a number out of 4 depending on how effective it is compared to attacking 4x, Example: 3.1
      arrowsEVAddition: 0, // set to a number out of 4 depending on how effective it is compared to attacking 4x, Example: 3.1
      coinSharpenCostReduction: 0,
      coinLootRewardAddition: 0,
      parryBonusValAddition: 0,
      parryFailChanceReduction: 0,
      attackCooldownAddition: 0,
      attackMultiplyFactor: 1,
      lootCooldownFactor: 1,
      duelRerollRound1Damage: false,
      globalCooldownModifierFactor: 1
    }

  tempBuffs: { [index: string]: number } = {
    "global attack": 0,
    "parry val": 0,
    "sharpen cost": 0,
    "loot rare chance": 0,
    "duel damage": 0,
    "castle attack": 0,
    "attack cooldown trigger": 0,
    "loot fail chance": 0
  }

  constructor(
    public readonly id: string,
    public name: string,
    public role: "general" | "sword"
  ) { }

  static copyWithoutFunctions(source: Object) {
    const filteredEntries = Object.entries(source).filter(([key, value]) => typeof value !== 'function');
    return Object.fromEntries(filteredEntries);
  }

  // Instantiate Sword or General class based on player role. Creates new Sword
  // if player not exists
  static fromUser(user: User): Sword {
    return Player.fromID(user.id, user.username);
  }

  static fromID(id: string, name?: string) {

    const { General } = require("./General");
    const { Sword } = require("./Sword");

    const data = client.players.get(id);

    const user = client.users.cache.get(id);

    if (!data) return new Sword(id, name || user?.username || "", "sword");

    let player: Player = new Sword(id, name || user?.username || "", "sword");

    if (data && data.role === "general") {
      player = new General(data.id, data.name, data.role);
    }

    if (data) {
      Object.assign(player, Player.copyWithoutFunctions(data));
    }

    //@ts-ignore
    player.tickets = player.tickets.map((id: string) => Ticket.fromID(id));

    return player;
  }

  checkTempBuff(buffType: string, inputVal: number): number {
    console.log(`Checking ${buffType} with input value ${inputVal}`);
    //console.log(this.tempBuffs);
    if (buffType === "attack cooldown trigger") {
      if (this.tempBuffs["attack cooldown trigger"] == 1) {
        this.resetTempBuffs("attack cooldown trigger");
        this.save();
        return 1;
      }
    } else if (buffType === "castle attack") {
      inputVal += this.tempBuffs["global attack"] + this.tempBuffs["castle attack"];
      this.resetTempBuffs("global attack");
      this.resetTempBuffs("castle attack");
      return inputVal;
    } else if (buffType in this.tempBuffs) {
      inputVal += this.tempBuffs[buffType];
      this.resetTempBuffs(buffType);
      this.save();
      return inputVal;
    }
    return 0;
  }

  resetCooldown(group: "attack" | "loot" | "parry" | "big" | "banner"): void {
    this.cooldownEndTime[group] = null;
  }

  resetAllCooldowns(): void {
    console.log(client.settings);
    this.cooldownEndTime = {
      "attack": null,
      "loot": null,
      "parry": null,
      "big": null,
      "banner": null
    }
    for (let group of Object.keys(this.cooldownEndTime)) {
      this.cooldownEndTime[group] = null;
    }
  }

  setCooldown(group: "attack" | "loot" | "parry" | "big" | "banner"): void {
    switch (group) {
      case "attack": {
        this.cooldownEndTime["attack"] = DateTime.now().plus(Duration.fromMillis(
          (this.COOLDOWN + this.nftBonuses.attackCooldownAddition) * this.nftBonuses.globalCooldownModifierFactor * MILLISECONDS_PER_HOUR
        ))
        break;
      }
      case "loot": {
        this.cooldownEndTime["loot"] = DateTime.now().plus(Duration.fromMillis(
          this.lastLootDuration * this.nftBonuses.lootCooldownFactor * this.nftBonuses.globalCooldownModifierFactor * MILLISECONDS_PER_HOUR
        ));
        break;
      }
      case "parry": {
        this.cooldownEndTime[group] = DateTime.now().plus(Duration.fromMillis(
          this.PARRY_COOLDOWN * this.nftBonuses.globalCooldownModifierFactor * MILLISECONDS_PER_HOUR
        ));
        break;
      }
      case "big": {
        this.cooldownEndTime[group] = DateTime.now().plus(Duration.fromMillis(
          this.BIG_COOLDOWN * this.nftBonuses.globalCooldownModifierFactor * MILLISECONDS_PER_HOUR
        ));
        break;
      }
      case "banner": {
        this.cooldownEndTime[group] = DateTime.now().plus(Duration.fromMillis(
          this.COOLDOWN * this.nftBonuses.globalCooldownModifierFactor * MILLISECONDS_PER_HOUR
        ));
        break;
      }
    }
  }

  async lootWithID(playerID: string, timeDuration: number): Promise<void> {
    setTimeout(async () => {
      const player = Player.fromID(playerID);
      if (player) {
        let outcome = getLootOutcome(player, timeDuration / MILLISECONDS_PER_HOUR);
        let rarityMsg = "";
        if (outcome.result === "neutral") {
          rarityMsg = "Better luck next time!"
        } else if (outcome.result === "negative") {
          if (outcome.rarity.includes("common")) {
            rarityMsg = "You got unlucky!"
          } else if (outcome.rarity.includes("very rare")) {
            rarityMsg = "You got extremely unlucky!"
          } else {
            rarityMsg = "You got very unlucky!"
          }
        } else {
          rarityMsg = `You found ${outcome.rarity} loot!`
        }

        const defaultChannelID = process.env.BOT_COMMAND_CHANNEL_IDS?.split(',')[0]; // deployment
        //const defaultChannelID = "1045193476385550406"; // testing
        let defaultChannel;

        if (defaultChannelID)
          defaultChannel = client.channels.cache.get(defaultChannelID) as TextChannel;

        const author = client.users.cache.get(playerID);
        const imageURL = author?.displayAvatarURL() || "";

        let embed = (new MessageEmbed())
          .setColor("RANDOM")
          .setThumbnail(imageURL)
          .setTitle(rarityMsg)
          .setDescription(`${author} ${outcome.message}`)

        await defaultChannel?.send({ embeds: [embed] });
        //await msg.reply(`${msg.author} ${outcome.message}`);

        const loots = client.lootHistory.current.filter(
          (x) => x.playerID === player.id
        );
        const lastLoot = loots[loots.length - 1]; // narrow down the latest ones
        lastLoot.outcome = outcome;
        client.lootHistory.save();
      }
    }, timeDuration);
  }

  async loot(msg: Message, timeDuration: number): Promise<void> {
    setTimeout(async () => {
      const player = Player.fromID(msg.author.id);
      if (player) {
        let outcome = getLootOutcome(player, timeDuration);
        let rarityMsg = "";
        if (outcome.result === "neutral") {
          rarityMsg = "Better luck next time!"
        } else if (outcome.result === "negative") {
          if (outcome.rarity.includes("common")) {
            rarityMsg = "You got unlucky!"
          } else if (outcome.rarity.includes("very rare")) {
            rarityMsg = "You got extremely unlucky!"
          } else {
            rarityMsg = "You got very unlucky!"
          }
        } else {
          rarityMsg = `You found ${outcome.rarity} loot!`
        }

        let embed = (new MessageEmbed())
          .setColor("RANDOM")
          .setThumbnail(msg.author.displayAvatarURL())
          .setTitle(rarityMsg)
          .setDescription(`${msg.author} ${outcome.message}`)

        await msg.reply({ embeds: [embed] });
        //await msg.reply(`${msg.author} ${outcome.message}`);

        const loots = client.lootHistory.current.filter(
          (x) => x.playerID === player.id && x.duration === timeDuration
        );
        const lastLoot = loots[loots.length - 1]; // narrow down the latest ones
        lastLoot.outcome = outcome;
        client.lootHistory.save();
      }
    }, timeDuration * MILLISECONDS_PER_HOUR);
  }

  checkDateTime(inp: string | DateTime | null): DateTime | null {
    if (inp === null) return null;
    if (typeof (inp) === "string") return DateTime.fromISO(inp);
    return inp;
  }

  fixAllCooldownTimes() {
    for (let key of Object.keys(this.cooldownEndTime)) {
      this.cooldownEndTime[key] = this.checkDateTime(this.cooldownEndTime[key]);
    }
  }

  checkName(): void {
    if (!this.name) {
      const username = (client.users.cache.get(this.id)?.username);
      (username) ? this.name = username : null;
      this.save();
    }
  }

  isOnCooldown(group: "attack" | "loot" | "parry" | "big" | "banner"): { status: boolean, timeLeft: string } {
    this.checkName();
    let cooldownEnd = null;
    this.fixAllCooldownTimes();
    if (group === "attack" || group === "big") {
      if (this.cooldownEndTime["attack"] && this.cooldownEndTime["big"]) {
        console.log("Checking which cd is higher");
        if (this.cooldownEndTime["attack"].toSeconds() > this.cooldownEndTime["big"].toSeconds()) {
          cooldownEnd = this.cooldownEndTime["attack"];
        } else {
          cooldownEnd = this.cooldownEndTime["big"];
        }
      } else {
        console.log("Checking whichever cooldown exists");
        cooldownEnd = this.cooldownEndTime["big"] || this.cooldownEndTime["attack"];
      }
    } else {
      console.log("other group cooldown check");
      cooldownEnd = this.cooldownEndTime[group];
    }
    if (!cooldownEnd) {
      return { status: false, timeLeft: "" };
    }
    //const diff = cooldownEnd.diffNow("seconds").seconds;
    const diff = cooldownEnd.diffNow("hours").hours;
    if (diff < 0) {
      this.cooldownEndTime[group] = null;
      this.save();
      return { status: false, timeLeft: "" };
    } else {
      const { hours, minutes, seconds } = cooldownEnd.diffNow([
        "hours",
        "minutes",
        "seconds",
      ]);
      return { status: true, timeLeft: `${hours}h ${minutes}m ${seconds.toFixed(2)}s` };
    }
  }

  resetTempBuffs(buffType: string) {
    this.tempBuffs[buffType] = 0;
    this.save();
    return;
  }

  resetNftBonuses() {
    this.nftBonuses = {
      bonusDoubleChance: 0,
      lootNegativeChanceReduction: 0,
      lootRareChanceAddition: 0,
      duelDamageAddition: 0,
      duelCoinAddition: 0,
      attackMinDamageAddition: 0,
      attackFinalDamageAddition: 0,
      attackMaxDamageAddition: 0,
      trebuchetEVAddition: 0, // change to match the same base value declared above
      arrowsEVAddition: 0, // change to match the same base value declared above
      coinSharpenCostReduction: 0,
      coinLootRewardAddition: 0,
      parryBonusValAddition: 0,
      parryFailChanceReduction: 0,
      attackCooldownAddition: 0,
      attackMultiplyFactor: 1,
      lootCooldownFactor: 1,
      duelRerollRound1Damage: false,
      globalCooldownModifierFactor: 1
    };
  }

  async getFlyingBanner(): Promise<string> {
    if (this.flyingBanner) {
      return this.flyingBanner.toString();
    } else if (this.calledBanner) {
      return this.calledBanner.toString();
    } else {
      const address = client.ethAddress.findAddress(this.id);
      if (address) {
        console.log("picking random banner from holdings");
        const bannerIds = await getBannerCollection(address);
        return (bannerIds.length) ? random.pick(bannerIds).toString() : "000404";
      }
    }
    return "000404";
  }

  calcFinalDamage(maxAttack: number, isTrebuchet: boolean, isSharpen: boolean, isRally: boolean, parriedVal: number, parryMessage: string): [number, string] {
    let finalDamage = 0;
    if (isTrebuchet) {
      let totalAttack = 0;
      totalAttack += Math.floor((this.nftBonuses.trebuchetEVAddition / 4) * random.integer(this.minAttack, maxAttack));
      if (isRally) {
        maxAttack /= 2;
      }
      if (isSharpen) {
        maxAttack = this.maxAttack;
      }
      for (let i = 0; i < 1; ++i) {
        totalAttack += Math.floor((this.nftBonuses.trebuchetEVAddition / 4) * random.integer(this.minAttack, maxAttack));
      }
      finalDamage = this.checkTempBuff("castle attack", totalAttack);
    } else {
      finalDamage = this.checkTempBuff("castle attack", random.integer(this.minAttack + checkDoubling(this.nftBonuses.bonusDoubleChance, this.nftBonuses.attackMinDamageAddition), maxAttack + checkDoubling(this.nftBonuses.bonusDoubleChance, this.nftBonuses.attackMaxDamageAddition) + checkDoubling(this.nftBonuses.bonusDoubleChance, this.nftBonuses.attackFinalDamageAddition)));
    }
    if (finalDamage < parriedVal) {
      parriedVal = finalDamage - 1;
    }
    parryMessage = parryMessage.
      replace("<parryVal>", Math.abs(parriedVal).toString());
    return [finalDamage - parriedVal, parryMessage];
  }

  arrowSlits(): number {
    let totalAttack = 0;
    for (let i = 0; i < 2; ++i) {
      totalAttack += Math.floor((this.nftBonuses.arrowsEVAddition / 4) * random.integer(this.minAttack, this.maxAttack));
    }
    return totalAttack;
  }

  attack(castleName: string, isTrebuchet: boolean): [number, string] {
    const sharpen = client.sharpenHistory.getPlayerSharpen(this.id);
    let _maxAttack = this.maxAttack;
    let isSharpen = false;
    /**
     * Check is it a sharpened attack
    */
    if (sharpen.length > 0) {
      _maxAttack = this.sharpenMaxAttack;
      isSharpen = true;
      client.sharpenHistory.useSharpen(this.id);
      client.sharpenHistory.save();
    }

    /**
     * Check if this attack was parried or not
     */
    let parriedVal = 0;
    let parryMessage = "";
    const parry = client.parryHistory.getValidParry(this.id, this.lastAttack);
    if (parry.length > 0) {
      console.log(`found valid parry`);
      parriedVal = parry[0].parryVal;
      parryMessage = parry[0].parryMessage;
    }

    if (this.role === "general") {
      return this.calcFinalDamage(_maxAttack, isTrebuchet, isSharpen, false, parriedVal, parryMessage);
    }

    /**
     * Check if there is an ongoing rally
     */
    const rally = client.rallyHistory.getValidRally(castleName, DateTime.now());

    if (rally) {
      //console.log(rally);
      const rallyGeneral = Player.fromID(rally.generalID);
      if (rallyGeneral && rallyGeneral.coins >= RALLY_AMOUNT && (rally.budget === -1 || (rally.coinSpent + RALLY_AMOUNT <= rally.budget))) {
        _maxAttack *= 2;
        rallyGeneral.coins -= RALLY_AMOUNT;
        rally.coinSpent += RALLY_AMOUNT;
        console.log(`${rallyGeneral.name} spent ${RALLY_AMOUNT} coins to sharpen ${this.name}'s attack to a max of ${_maxAttack}`);
        client.rallyHistory.save();
        rallyGeneral.save();
      }
    }

    return this.calcFinalDamage(_maxAttack, isTrebuchet, isSharpen, true, parriedVal, parryMessage);
  }

  strike() {
    const sharpen = client.sharpenHistory.getPlayerSharpen(this.id);
    let _maxAttack = this.maxAttack;

    /**
     * Check is it a sharpened attack
     */
    if (sharpen.length > 0) {
      _maxAttack = this.sharpenMaxAttack;
      client.sharpenHistory.useSharpen(this.id);
      client.sharpenHistory.save();
    }

    return random.integer(this.minAttack, _maxAttack);
  }

  aim() {
    return random.integer(this.minAttack, this.maxAttack);
  }

  save() {
    const { COOLDOWN, PARRY_COOLDOWN, BIG_COOLDOWN, ...data } = this;
    client.players.set(this.id, {
      ...data,
      tickets: data.tickets.map((x) => x.id),
    });
  }
}