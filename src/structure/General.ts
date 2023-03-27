import { client } from "..";
import { Player } from "./Player";

export class General extends Player {

  static readonly MAX = 2;

  COOLDOWN: number;
  coins: number = 10_000;
  PARRY_COOLDOWN: number;
  BIG_COOLDOWN: number;

  constructor(id: string, name: string, role: "general" | "sword") {
    super(id, name, role);
    this.COOLDOWN = client.settings.generalCooldown;
    this.PARRY_COOLDOWN = client.settings.generalParryCooldown;
    this.BIG_COOLDOWN = client.settings.generalBigCooldown;
  }
}
