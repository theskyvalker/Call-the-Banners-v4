import Enmap from "enmap";
import { DateTime } from "luxon";
import { checkDoubling, getRandWithExpectedVal } from "../utils";
import { random } from "@jiman24/discordjs-utils";
import { Player } from "./Player";

interface Parry {
  defenderID: string;
  attackerID: string;
  attackTime: Date;
  parryTime: Date;
  success: boolean;
  parryVal: number;
  parryMessage: string;
}

// set the below thresholds on a scale of 1 to 100

const BASE_CHANCE_TO_FAIL = 0;
const MIN_CHANCE_TO_FAIL = 0;
const MAX_NEGATIVE_VAL = 0;
const MAX_POSITIVE_VAL = 0;
const NEUTRAL_CHANCE = 0;

// can add more messages based on the templates provided to add variety to the printed messages

const PARRY_MESSAGES = {
  "neutral": [
    "<defender> tries to intercept but is not able to match <attacker>'s speed!"
  ],
  "success": [
    "<attacker>'s blade meets its match in <defender>'s steel! The damage was reduced by **<parryVal>**."
  ],
  "fail": [
    "<defender> tries to parry, but <attacker> steals their sword and attacked for **<parryVal>** extra damage!"
  ]
}

export class ParryHistory {
  id = "main";
  private static db = new Enmap("parry_history");
  allTime: Parry[] = [];
  current: Parry[] = [];

  constructor() {
    const data = ParryHistory.db.get(this.id);
    Object.assign(this, data);
  }

  getValidParry(targetID: string, timeOfAttack: Date) {
    const items = this.allTime.filter(
      (parryObj) =>
        (Math.abs(DateTime.fromJSDate(parryObj.attackTime).diff(DateTime.fromJSDate(timeOfAttack), "seconds").seconds) <= 60) && parryObj.attackerID === targetID
    );
    return items;
  }

  addParry(parry: Parry) {
    const defender = Player.fromID(parry.defenderID);
    if (!defender) {
      return;
    }
    const parryFailChanceReduction = checkDoubling(defender.nftBonuses.bonusDoubleChance, defender.nftBonuses.parryFailChanceReduction);
    const parryBonusVal = checkDoubling(defender.nftBonuses.bonusDoubleChance, defender.nftBonuses.parryBonusValAddition);
    if (parryBonusVal != defender.nftBonuses.parryBonusValAddition) {
      console.log("doubled parry bonus val");
    }
    if (parryFailChanceReduction != defender.nftBonuses.parryFailChanceReduction) {
      console.log("doubled parry fail chance reduction");
    }
    const parryVal = this.resolveParry(parry.attackTime, parry.parryTime, parryFailChanceReduction, parryBonusVal);
    console.log(`Parried for ${parryVal}`);
    const attackerName = Player.fromID(parry.attackerID)?.name;
    const defenderName = defender.name;
    if (parryVal > 0) {
      parry.success = true;
      parry.parryMessage = random.pick(PARRY_MESSAGES["success"]);
    } else if (parryVal === 0) {
      parry.parryMessage = random.pick(PARRY_MESSAGES["neutral"]);
    } else {
      parry.parryMessage = random.pick(PARRY_MESSAGES["fail"]);
    }

    parry.parryVal = defender.checkTempBuff("parry val", parryVal);
    console.log(`Parry value increased after temp buff: ${parry.parryVal}`);
    parry.parryMessage = parry.parryMessage.
      replace("<attacker>", attackerName || "null").
      replace("<defender>", defenderName || "null");
    this.allTime.push(parry);
    this.current.push(parry);
  }

  // Clears current battle parries. Should be called on "end" stage
  clear() {
    this.current = [];
  }

  save() {
    ParryHistory.db.set(this.id, { ...this });
  }

  public addPlayerParry(playerID: string, damage: number, playerDamages: Array<{ playerID: string, metric: number }>): void {
    for (let entry of playerDamages) {
      if (entry.playerID === playerID) {
        entry.metric += damage;
        return;
      }
    }
    playerDamages.push({ playerID: playerID, metric: damage });
  }

  public getTotalParryRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    const playerParries: Array<{ playerID: string, metric: number }> = [];
    let parries = this.current;
    if (cutoffDate) {
      parries = this.allTime.filter((parry) => parry.parryTime >= cutoffDate);
    }
    for (let parry of parries)
      this.addPlayerParry(parry.defenderID, parry.parryVal, playerParries);
    return playerParries.sort((a, b) => b.metric - a.metric);
  }

  public getNegativeParryRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    const playerParries: Array<{ playerID: string, metric: number }> = [];
    let parries = this.current;
    if (cutoffDate) {
      parries = this.allTime.filter((parry) => parry.parryTime >= cutoffDate);
    }
    for (let parry of parries) {
      if (parry.parryVal < 0) {
        this.addPlayerParry(parry.defenderID, parry.parryVal, playerParries);
      }
    }
    return playerParries.sort((a, b) => b.metric - a.metric);
  }

  public rollParryValue(success: boolean) {
    let val;
    if (success) {
      val = getRandWithExpectedVal(0); // change expected value as per desired expected value of a successful parry
      if (val > MAX_POSITIVE_VAL) val = MAX_POSITIVE_VAL;
    } else {
      val = getRandWithExpectedVal(0); // change expected value as per desired expected value of a failed parry
      if (val > MAX_NEGATIVE_VAL) val = MAX_NEGATIVE_VAL;
      val = -1 * val;
    }
    return val;
  }

  resolveParry(attackTime: Date, parryTime: Date, parryBonusChance: number, parryBonusVal: number) {
    let timeLeftParry = 60 - DateTime.fromJSDate(parryTime).diff(DateTime.fromJSDate(attackTime), 'seconds').seconds;
    (timeLeftParry < 0) ? timeLeftParry = 0 : null;
    const timeBonus = (timeLeftParry / 60) * 0; // change the 0 to a positive number based on your preference of how the time to parry affects success
    let failChance = BASE_CHANCE_TO_FAIL - timeBonus - parryBonusChance;
    if (failChance < MIN_CHANCE_TO_FAIL) {
      failChance = MIN_CHANCE_TO_FAIL;
    }
    const roll = random.integer(1, 100);
    if (roll <= NEUTRAL_CHANCE) {
      return 0;
    } else if (roll <= NEUTRAL_CHANCE + failChance) {
      return this.rollParryValue(false) + parryBonusVal;
    } else {
      return this.rollParryValue(true) + parryBonusVal;
    }
  }

  delete() {
    ParryHistory.db.deleteAll();
  }
}