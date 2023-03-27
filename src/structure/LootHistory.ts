import Enmap from "enmap";
import { DateTime, Duration } from "luxon";
import { MILLISECONDS_PER_HOUR } from "../utils";
import { LootOutcome } from "./LootOutcomes"
import { Player } from "./Player";

interface Loot {
  playerID: string;
  date: Date;
  duration: number;
  outcome: LootOutcome | null;
}

export class LootHistory {
  id = "main";
  private static db = new Enmap("loot_history");
  allTime: Loot[] = [];
  current: Loot[] = [];

  static MIN_DURATION: number = 1;
  static MAX_DURATION: number = 4;

  constructor() {
    const data = LootHistory.db.get(this.id);
    Object.assign(this, data);
  }

  addLoot(loot: Loot) {
    this.allTime.push(loot);
    this.current.push(loot);
  }

  public addPlayerCoins(playerID: string, coins: number, playerCoins: Array<{ playerID: string, metric: number }>): void {
    for (let entry of playerCoins) {
      if (entry.playerID === playerID) {
        entry.metric += coins;
        return;
      }
    }
    playerCoins.push({ playerID: playerID, metric: coins });
  }

  public getTotalCoinsRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    const playerCoins: Array<{ playerID: string, metric: number }> = [];
    let loots = this.current;
    if (cutoffDate) {
      loots = this.allTime.filter((loot) => loot.date >= cutoffDate);
    }
    for (let loot of loots) {
      if (loot.outcome?.coins && loot.outcome.coins != 0 && loot.outcome.result === "positive") {
        this.addPlayerCoins(loot.playerID, loot.outcome.coins, playerCoins);
      }
    }
    return playerCoins.sort((a, b) => b.metric - a.metric);
  }

  public getTotalCoinsLostRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    const playerCoins: Array<{ playerID: string, metric: number }> = [];
    let loots = this.current;
    if (cutoffDate) {
      loots = this.allTime.filter((loot) => loot.date >= cutoffDate);
    }
    for (let loot of loots) {
      if (loot.outcome?.coins && loot.outcome.coins != 0 && loot.outcome.result === "negative") {
        this.addPlayerCoins(loot.playerID, Math.abs(loot.outcome.coins), playerCoins);
      }
    }
    return playerCoins.sort((a, b) => b.metric - a.metric);
  }

  public resumePendingLoot(): void {
    const pendingLoots = this.current.filter((loot) => {
      if (!loot.outcome && DateTime.fromJSDate(loot.date).plus(Duration.fromMillis(loot.duration * MILLISECONDS_PER_HOUR)).toSeconds() > DateTime.now().toSeconds()) return loot;
    });
    for (let loot of pendingLoots) {
      let player = Player.fromID(loot.playerID);
      player.lootWithID(player.id, DateTime.fromJSDate(loot.date).plus(Duration.fromMillis(loot.duration * MILLISECONDS_PER_HOUR)).diffNow());
      console.log(`Resumed loot that was started at ${loot.date}`);
    }
  }

  // Clears current battle loot. Should be called on "end" stage
  clear() {
    this.current = [];
  }

  save() {
    LootHistory.db.set(this.id, { ...this });
  }
}
