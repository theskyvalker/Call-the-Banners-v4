import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter } from "../utils";
import { DateTime } from "luxon";
import { bold } from "@jiman24/discordjs-utils";

export default class extends Command {
  name = "parry";
  description = "!parry try to parry the latest attack by the tagged user. EX)!parry <username>";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    if (client.battleStage.stage !== "start") {
      throw new Error("you can only parry when battle starts");
    }

    const player = Player.fromUser(msg.author);

    if (msg.mentions.repliedUser) {
      throw new Error("!parry can't be used as a reply");
    }

    const target = msg.mentions.members?.first();

    if (!target) {
      throw new Error(`You need to specify the target of your parry`);
    }

    if (player.id === target.id) {
      throw new Error("You cannot parry yourself");
    }

    const cooldown = player.isOnCooldown("parry");

    if (cooldown.status) {
      throw new Error(`Please wait for ${bold(cooldown.timeLeft)}`);
    }

    const strike = client.strikeHistory.getLastStrike(target.id);

    if (!strike || (strike && DateTime.now().diff(DateTime.fromJSDate(strike.date), 'seconds').seconds > 58)) {
      throw new Error(`No valid attack by ${target.displayName} to parry`);
    }

    if (client.parryHistory.getValidParry(target.id, strike.date).length > 0) {
      throw new Error(`Another player has already parried ${target.displayName}`);
    }

    player.lastParry = new Date();
    player.setCooldown('parry');
    player.save();

    client.parryHistory.addParry({
      attackerID: target.id,
      defenderID: player.id,
      attackTime: strike.date,
      parryTime: player.lastParry,
      parryVal: 0,
      success: false,
      parryMessage: ""
    });
    client.parryHistory.save();

  }
}
