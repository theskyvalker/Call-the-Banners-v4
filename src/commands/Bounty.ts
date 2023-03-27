import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, MILLISECONDS_PER_MINUTE } from "../utils";
import { Castle } from "../structure/Castle";
import { DateTime, Duration } from "luxon";

export default class extends Command {
  name = "bounty";
  description = "!bounty automatically pays out attackers targeting the specified castle a set amount for a specified amount of time. EX) !bounty <target castle> <coin amount> <time in minutes>";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);

    if (client.battleStage.stage != "start") {
      throw new Error("you can only offer bounties when the battle is ongoing");
    }

    const castleName = args[0];
    const amountStr = args[1];
    const amount = parseInt(args[1]);
    const timedurationStr = args[2];
    const timeduration = parseInt(timedurationStr);

    if (!castleName) {
      throw new Error(`you need to mention a castle`);
    } else if (castleName.toLowerCase() != "north" && castleName.toLowerCase() != "south") {
      throw new Error(`provided castle name ${castleName} is not valid`)
    } else if (!amountStr) {
      throw new Error(`you need to give amount of coins to award`);
    } else if (Number.isNaN(amount) || amount <= 0) {
      throw new Error(`please give a valid non-negative integer amount of coins`);
    } else if (!timedurationStr) {
      throw new Error(`please give a time duration`);
    } else if (Number.isNaN(timeduration) || timeduration < 1 || timeduration > 1440) {
      throw new Error(`please give a valid integer time duration between 1 to 1440 minutes (24 hours)`);
    }

    const castle = Castle.fromName(castleName);
    const general = castle.general;

    if (!general) {
      throw new Error(`castle ${castle.name} has not been assigned a general`);
    }

    //check if player is a general or not and has enough coins or not
    if (player.role != "general") {
      throw new Error("only generals can offer bounties");
    } else if (player.coins < amount) {
      throw new Error("not enough coin to provide the offered bounty");
    } else if (player.id == general.id) {
      throw new Error("you cannot offer a bounty to attack your own castle");
    }

    client.makeitrainHistory.addMakeItRain({
      playerID: player.id,
      time_start: DateTime.now(),
      time_end: DateTime.now().plus(Duration.fromMillis(timeduration * MILLISECONDS_PER_MINUTE)),
      castle: castleName,
      amount: amount
    });

    client.makeitrainHistory.save();

    msg.channel.send(
      `${msg.author} successfully initiated a bounty of ${amount} coins for attacking castle ${castleName} in the next ${timeduration} minutes. <@&${process.env.BOUNTY_HUNTER_ROLE_ID || ""}>`
    )

  }
}