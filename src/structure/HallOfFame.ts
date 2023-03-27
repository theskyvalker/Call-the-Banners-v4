import { Message } from "discord.js";
import Enmap from "enmap";

export interface HallOfFame {
  duels: string | undefined,
  maxAttack: string | undefined,
  totalDamage: string | undefined,
  totalCoins: string | undefined,
  totalBlocked: string | undefined
};

export interface HallOfInfamy {
  duelsLost: string | undefined,
  leastAvgAttack: string | undefined,
  minAttack: string | undefined,
  lostCoins: string | undefined,
  leastDamageBlocked: string | undefined
}

export class HoFHistory {
  id = "main";
  private static db = new Enmap("hof");
  hof: HallOfFame = {
    duels: undefined,
    maxAttack: undefined,
    totalDamage: undefined,
    totalCoins: undefined,
    totalBlocked: undefined
  }
  hoi: HallOfInfamy = {
    duelsLost: undefined,
    leastAvgAttack: undefined,
    minAttack: undefined,
    lostCoins: undefined,
    leastDamageBlocked: undefined
  }

  constructor() {
    const data = HoFHistory.db.get(this.id);
    Object.assign(this, data);
  }

  clear() {
    this.hof = {
      duels: undefined,
      maxAttack: undefined,
      totalDamage: undefined,
      totalCoins: undefined,
      totalBlocked: undefined
    }
    this.hoi = {
      duelsLost: undefined,
      leastAvgAttack: undefined,
      minAttack: undefined,
      lostCoins: undefined,
      leastDamageBlocked: undefined
    }
  }

  save() {
    HoFHistory.db.set(this.id, { ...this });
  }
}