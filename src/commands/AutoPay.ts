import { Command } from "@jiman24/commandment";
import { bold } from "@jiman24/discordjs-utils";
import { Message, User } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { Strike } from "../structure/StrikeHistory";
import { botCommandChannelFilter, getCastleFromGeneral } from "../utils";
import { DateTime, Duration } from "luxon";

function filterStrikes(this: { castleId: string, duration: number, startTime: DateTime, generalID: string }, value: Strike, index: number, array: Strike[]) {
  if (value.castleID == this.castleId || value.playerID == this.generalID || value.autopaid) {
    return;
  }
  const strikeDate = DateTime.fromJSDate(value.date);
  if (strikeDate > this.startTime.minus(Duration.fromMillis(this.duration * 60000)) && strikeDate < this.startTime) {
    return value;
  }
}

export default class extends Command {
  name = "autopay";
  description = "!autopay <amount> <time>. Use !autopay help to see detailed usage guidelines";

  async exec(msg: Message, args: string[]) {

    botCommandChannelFilter(msg.channel.id);

    if (client.battleStage.stage != "start") {
      throw new Error("you can only make automatic payments when the battle is ongoing");
    }

    const player = Player.fromUser(msg.author);

    if (player.role != "general") {
      throw new Error("only generals can use !autopay")
    }

    if (!args[0]) {
      throw new Error("please provide an amount or use help for detailed usage instructions");
    }

    if (args[0] && args[0] == "help") {
      await msg.channel.send(
        `!autopay <amount> <time>\nThe autopay command lets you automatically pay players <amount> coins who attacked the opposing castle in the last <time> minutes`
      )
      return;
    }

    const amountStr = args[0];
    const amount = parseInt(amountStr);
    const timedurationStr = args[1];
    const timeduration = parseInt(timedurationStr);

    if (Number.isNaN(amount)) {
      throw new Error("please gve valid amount");
    } else if (amount > player.coins) {
      throw new Error("insufficient amount");
    } else if (amount < 1) {
      throw new Error("please give an amount more than 0");
    } else if (!timedurationStr) {
      throw new Error(`please give a time duration`);
    } else if (Number.isNaN(timeduration) || timeduration < 1 || timeduration > 1440) {
      throw new Error(`please give a valid integer time duration between 1 to 1440 minutes (24 hours)`);
    }

    let castle = getCastleFromGeneral(player);

    if (!castle) {
      throw new Error(`Could not find a castle associated with this general`)
    }

    const qualifiedAttackers = client.strikeHistory.current.filter(filterStrikes, { castleId: castle.id, duration: timeduration, startTime: DateTime.now(), generalID: player.id });

    console.log(qualifiedAttackers);

    if (qualifiedAttackers.length * amount > player.coins) {
      throw new Error(`Need a total of ${bold(qualifiedAttackers.length * amount)} coins to make payments`);
    }

    for (let qualifiedAttacker of qualifiedAttackers) {

      var receiver = Player.fromID(qualifiedAttacker.playerID);

      if (receiver) {

        player.coins -= amount;
        receiver.coins += amount;

        player.save();
        receiver.save();

        qualifiedAttacker.autopaid = true;
        client.strikeHistory.save();

        msg.channel.send(
          `Successfully paid ${"<@" + receiver.id + ">"} ${bold(amount)} coins`
        );
      }

    }

  }
}
