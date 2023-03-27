import Enmap from "enmap";

export class Settings {
  id = "main";
  generalCooldown = 4; // hours
  swordsCooldown = 6; // hours
  generalParryCooldown = 8; // hours
  swordsParryCooldown = 8; // hours
  generalBigCooldown = 8; // hours
  swordsBigCooldown = 12; // hours

  private static db = new Enmap("settings");

  public static battleChannelList = [
    "", //battlefield channel 1 id
    "" //battlefield channel 2 id
  ];

  constructor() {
    const data = Settings.db.get(this.id);
  }

  save() {
    Settings.db.set(this.id, { ...this });
  }
}