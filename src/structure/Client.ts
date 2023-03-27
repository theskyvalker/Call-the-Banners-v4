import { CommandManager } from "@jiman24/commandment";
import { Client as DiscordClient, Message } from "discord.js";
import type { ClientOptions } from "discord.js";
import Enmap from "enmap";
import { BattleStage } from "./BattleStage";
import { Settings } from "./Settings";
import { StrikeHistory } from "./StrikeHistory";
import { SharpenHistory } from "./SharpenHistory";
import { LoadHistory } from "./LoadHistory";
import { EthAddress } from "./EthAddress";
import { MakeItRainHistory } from "./MakeItRainHistory";
import { DuelHistory } from "./DuelHistory";
import { DuelResultHistory } from "./DuelResultHistory";
import { RallyHistory } from "./RallyHistory";
import { ParryHistory } from "./ParryHistory";
import { LootHistory } from "./LootHistory";
import { HoFHistory } from "./HallOfFame";

export class Client extends DiscordClient {
  commandManager = new CommandManager(process.env.PREFIX || "!");
  players = new Enmap("player");
  castles = new Enmap("castle");
  battleStage: BattleStage;
  settings: Settings;
  strikeHistory: StrikeHistory;
  sharpenHistory: SharpenHistory;
  makeitrainHistory: MakeItRainHistory;
  duelHistory: DuelHistory;
  duelResultHistory: DuelResultHistory;
  rallyHistory: RallyHistory;
  parryHistory: ParryHistory;
  loadHistory: LoadHistory;
  ethAddress: EthAddress;
  lootHistory: LootHistory;
  hof: HoFHistory;
  hofCounter: number;

  constructor(options: ClientOptions) {
    super(options);
    this.battleStage = new BattleStage();
    this.settings = new Settings();
    this.strikeHistory = new StrikeHistory();
    this.sharpenHistory = new SharpenHistory();
    this.makeitrainHistory = new MakeItRainHistory();
    this.duelHistory = new DuelHistory();
    this.duelResultHistory = new DuelResultHistory();
    this.rallyHistory = new RallyHistory();
    this.parryHistory = new ParryHistory();
    this.loadHistory = new LoadHistory();
    this.ethAddress = new EthAddress();
    this.lootHistory = new LootHistory();
    this.hof = new HoFHistory();
    this.hofCounter = 0;
  }
}
