import { Command } from "@jiman24/commandment";
import { bold, random, sleep } from "@jiman24/discordjs-utils";
import { Message, GuildMember, User } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, MILLISECONDS_PER_MINUTE } from "../utils";
import { DateTime, Duration } from "luxon";
import { italic } from "@discordjs/builders";

interface RoundResult {
  draw: boolean,
  winner: Player | undefined,
  loser: Player,
  totalDamageA: number,
  totalDamageB: number,
  winnings: number
};

export default class extends Command {
  name = "cancelduels";
  description = "!cancelduels Cancel all duels and reclaim locked coin. EX) !cancelduels";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);

    var unResolvedDuels = client.duelHistory.getUnresolvedDuels(client, player);
    let coins = 0;

    for (let duel of unResolvedDuels) {
      coins += duel.betAmount;
      player.coins += duel.betAmount;
      duel.endDate = DateTime.now().minus(Duration.fromMillis(100));
      duel.betAmount = 0;
    }

    player.save();
    client.duelHistory.save();

    msg.channel.send(
      `${msg.author} has cancelled all pending duels and reclaimed ${coins} coins.`
    );

  }
}