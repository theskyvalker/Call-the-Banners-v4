import Enmap from "enmap";

export interface Strike {
  playerID: string;
  castleID: string;
  date: Date;
  damage: number;
  autopaid: boolean;
  isTrebuchet: boolean;
}

export class StrikeHistory {
  id = "main";
  private static db = new Enmap("strike_history");
  allTime: Strike[] = [];
  current: Strike[] = [];

  constructor() {
    const data = StrikeHistory.db.get(this.id);
    Object.assign(this, data);
  }

  addStrike(strike: Strike) {
    this.allTime.push(strike);
    this.current.push(strike);
  }

  getLastStrike(playerID: string) {
    let strikes = this.current.filter(
      (strikeObj) =>
        strikeObj.playerID === playerID);
    return strikes[strikes.length - 1];
  }

  public addPlayerAttack(playerID: string, damage: number, playerDamages: Array<{ playerID: string, metric: number }>): void {
    for (let entry of playerDamages) {
      if (entry.playerID === playerID) {
        entry.metric += damage;
        return;
      }
    }
    playerDamages.push({ playerID: playerID, metric: damage });
  }

  public getTotalDamageRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    let strikes = this.current;
    if (cutoffDate) {
      strikes = this.allTime.filter((strike) => strike.date >= cutoffDate);
    }
    const playerDamages: Array<{ playerID: string, metric: number }> = [];
    for (let strike of strikes)
      this.addPlayerAttack(strike.playerID, strike.damage, playerDamages);
    return playerDamages.sort((a, b) => b.metric - a.metric);
  }

  public getAverageDamageRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    const playerDamages: Array<{ playerID: string, metric: number }> = [];
    const playerStrikeCounts: { [index: string]: number } = {};
    let strikes = this.current;
    if (cutoffDate) {
      strikes = this.allTime.filter((strike) => strike.date >= cutoffDate);
    }
    for (let strike of strikes) {
      this.addPlayerAttack(strike.playerID, strike.damage, playerDamages);
      if (strike.playerID in playerStrikeCounts) {
        playerStrikeCounts[strike.playerID] += 1;
      } else {
        playerStrikeCounts[strike.playerID] = 1;
      }
    }
    for (let entry of playerDamages) {
      entry.metric /= playerStrikeCounts[entry.playerID];
    }
    return playerDamages.sort((a, b) => a.metric - b.metric);
  }

  public checkPlayerMaxStrike(playerID: string, damage: number, playerDamages: Array<{ playerID: string, metric: number }>): void {
    for (let entry of playerDamages) {
      if (entry.playerID === playerID) {
        if (entry.metric < damage) {
          entry.metric = damage;
        }
        return;
      }
    }
    playerDamages.push({ playerID: playerID, metric: damage });
  }

  public checkPlayerMinStrike(playerID: string, damage: number, playerDamages: Array<{ playerID: string, metric: number }>): void {
    for (let entry of playerDamages) {
      if (entry.playerID === playerID) {
        if (entry.metric > damage) {
          entry.metric = damage;
        }
        return;
      }
    }
    playerDamages.push({ playerID: playerID, metric: damage });
  }

  public getMaxDamageRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    let strikes = this.current;
    if (cutoffDate) {
      strikes = this.allTime.filter((strike) => strike.date >= cutoffDate);
    }
    const playerDamages: Array<{ playerID: string, metric: number }> = [];
    for (let strike of strikes) {
      if (strike.damage > 600) continue;
      this.checkPlayerMaxStrike(strike.playerID, strike.damage, playerDamages);
    }
    return playerDamages.sort((a, b) => b.metric - a.metric);
  }

  public getMinDamageRankings(cutoffDate?: Date): Array<{ playerID: string, metric: number }> {
    let strikes = this.current;
    if (cutoffDate) {
      strikes = this.allTime.filter((strike) => strike.date >= cutoffDate);
    }
    const playerDamages: Array<{ playerID: string, metric: number }> = [];
    for (let strike of strikes)
      this.checkPlayerMinStrike(strike.playerID, strike.damage, playerDamages);
    return playerDamages.sort((a, b) => b.metric - a.metric);
  }

  // Clears current battle strikes. Should be called on "end" stage
  clear() {
    this.current = [];
  }

  save() {
    StrikeHistory.db.set(this.id, { ...this });
  }
}
