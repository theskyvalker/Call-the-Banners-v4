import { Command } from "@jiman24/commandment";
import { bold } from "@jiman24/discordjs-utils";
import { Message, MessageEmbed } from "discord.js";
import { client } from "..";
import { Castle } from "../structure/Castle";
import { Player } from "../structure/Player";
import { getCastleImage, botCommandChannelFilter, getCastleFromGeneral } from "../utils";

export default class extends Command {
  name = "arrowslits";
  description = "!arrowslits Defend your castle by manning the arrow slits. EX)!arrowslits south - to defend south";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    if (client.battleStage.stage !== "start") {
      throw new Error("you can only use arrow slits once the battle has begun!");
    }

    const player = Player.fromUser(msg.author);

    const castleName = args[0];

    if (!castleName) {
      throw new Error(`you need to mention a castle`);
    }

    const castle = Castle.fromName(castleName);

    if (player.role === "general" && getCastleFromGeneral(player)?.name != castle.name) {
      throw new Error("you can only man the arrow slits to defend your own castle!")
    }

    const cooldown = player.isOnCooldown("big");

    if (cooldown.status) {
      throw new Error(`Please wait for ${bold(cooldown.timeLeft)}`);
    }

    const fortifyAmount = player.arrowSlits();

    const castleNewHp = castle.hp + fortifyAmount;

    if (castleNewHp > castle.maxhp) {
      throw new Error(
        `castle's HP will exceed if you defend it right now`
      );
    }

    castle.hp = castleNewHp;
    player.setCooldown("big");

    castle.save();
    player.save();

    const isStrongStrike = fortifyAmount >= 220 / 2;
    const isWeakStrike = fortifyAmount <= 190 / 2;

    if (isStrongStrike || isWeakStrike) {
      const strikeImage = isWeakStrike
        ? "IMAGE URL FOR ARROW SLITS WEAK STRIKE"
        : "IMAGE URL FOR ARROW SLITS STRONG STRIKE";

      const embed = new MessageEmbed()
        .setTitle(
          `${bold(player.name)} is manning the arrow slits for the ${bold(castleName)} to defend ${bold(
            fortifyAmount
          )} HP!`
        )
        .setDescription(
          isStrongStrike
            ? "Huzzah! Their men will be looking like pincushions!"
            : "Perhaps a pair of glasses might help with that aim!"
        )
        .setImage(strikeImage);
      this.sendEmbed(msg, embed);
    } else {
      msg.channel.send(
        `${bold(player.name)} is manning the arrow slits for the ${bold(castleName)} to defend ${bold(
          fortifyAmount
        )} HP!`
      );
    }

    const attachment = await getCastleImage(
      castle.hp,
      castle.initialhp,
      castle.id
    );
    msg.channel.send({ files: [attachment] });

  }
}
