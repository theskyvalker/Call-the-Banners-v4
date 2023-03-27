import { client } from "..";
import { Player } from "./Player";

const MIN_ATTACK_CAP = 80;

export class Sword extends Player {

  COOLDOWN: number;
  PARRY_COOLDOWN: number;
  BIG_COOLDOWN: number

  constructor(id: string, name: string, role: "sword" | "general") {
    super(id, name, role);
    this.COOLDOWN = client.settings.swordsCooldown;
    this.PARRY_COOLDOWN = client.settings.swordsParryCooldown;
    this.BIG_COOLDOWN = client.settings.swordsBigCooldown;
  }

  rankUp(currentBattleStrikes: number) {
    if (this.minAttack < MIN_ATTACK_CAP) {
      if (currentBattleStrikes > 10) {
        this.minAttack += 2;
      } else {
        this.minAttack += 1;
      }
    }
  }
}