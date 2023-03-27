import { Command } from "@jiman24/commandment";
import { bold } from "@jiman24/discordjs-utils";
import { Message, MessageEmbed } from "discord.js";
import { client } from "..";
import { Castle } from "../structure/Castle";
import { Player } from "../structure/Player";
import { getCastleImage, botCommandChannelFilter, sleep, MILLISECONDS_PER_MINUTE } from "../utils";
import { DateTime } from "luxon";

export default class extends Command {
  name = "trebuchet";
  description = "!trebuchet attack castle by manning a trebuchet. Deals heavy damage but takes 24 hours. EX)!trebuchet north";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    if (client.battleStage.stage !== "start") {
      throw new Error("you can only attack when battle starts");
    }

    const castleName = args[0];

    if (!castleName) {
      throw new Error("you need to specify which castle");
    }

    // await msg.delete(); # immediately remove the command message

    const castle = Castle.fromName(castleName);
    const general = castle.general;

    if (!general) {
      throw new Error(`castle ${castle.name} has not been assigned a general`);
    }

    const player = Player.fromUser(msg.author);

    const cooldown = player.isOnCooldown("big");

    if (cooldown.status) {
      throw new Error(`Please wait for ${bold(cooldown.timeLeft)}`);
    }

    if (player.id === general.id) {
      throw new Error("You cannot attack your own castle");
    }

    msg.channel.send(
      `${bold(player.name)} is manning a trebuchet against the ${bold(castleName)}!`
    );

    client.strikeHistory.addStrike({
      playerID: player.id,
      damage: 0,
      castleID: castle.id,
      date: new Date(),
      autopaid: false,
      isTrebuchet: true
    });
    client.strikeHistory.save(); // make the strike available in the pool for parry

    player.lastAttack = new Date();
    player.setCooldown("big");
    player.save();

    await sleep(MILLISECONDS_PER_MINUTE); // 1 minute delay

    const [attack, parryMessage] = player.attack(castleName, true); // check if it was parried before processing the damage

    castle.hp -= attack;
    castle.save();

    let strike = client.strikeHistory.getLastStrike(player.id);

    strike.damage = attack;
    client.strikeHistory.save();

    const battled = client.strikeHistory.current.filter(
      (strike) => strike.playerID === player.id
    );

    if (battled.length === 1) {
      player.battleCount++;
    }

    const isStrongStrike = attack >= (player.nftBonuses.trebuchetEVAddition / 2) * 90; // adjust threshold as needed
    const isWeakStrike = attack <= (player.nftBonuses.trebuchetEVAddition / 2) * 50; // adjust threshold as needed

    if (isStrongStrike || isWeakStrike) {
      const strikeImage = isWeakStrike
        ? "https://cdn.discordapp.com/attachments/982462379449282613/1011100466630893628/Weakstrike.jpg"
        : "https://cdn.discordapp.com/attachments/982462379449282613/1011100466291150858/Strongstrike.jpg";

      const embed = new MessageEmbed()
        .setTitle(
          `${bold(player.name)} attacked ${bold(castleName)} using a trebuchet for ${bold(
            attack
          )} damage! ${parryMessage}`
        )
        .setDescription(
          isStrongStrike
            ? "Huzzah! Their walls are weeping stones tonight!"
            : "The enemy castle is THAT way, son!"
        )
        .setImage(strikeImage);
      this.sendEmbed(msg, embed);
    } else {
      msg.channel.send(
        `${bold(player.name)} attacked ${bold(castleName)} using a trebuchet for ${bold(
          attack
        )} damage! ${parryMessage}`
      );
    }

    var makeitrainobj = client.makeitrainHistory.getValidMakeItRain(castleName, DateTime.now());

    if (makeitrainobj) {

      var awarding_general = Player.fromID(makeitrainobj.playerID);

      if (awarding_general && awarding_general.id != player.id) {

        if (makeitrainobj != null) {
          if (awarding_general.coins >= makeitrainobj.amount) {

            awarding_general.coins -= makeitrainobj.amount;
            player.coins += makeitrainobj.amount;
            player.save();
            awarding_general.save();

            msg.channel.send(
              `${msg.author} claimed a bounty of ${bold(makeitrainobj.amount)} coins offered by ${bold(awarding_general.name)}!`
            );
          } else {
            msg.channel.send(
              `The bounty of ${bold(makeitrainobj.amount)} coins offered by ${bold(awarding_general.name)} could not be processed due to insufficient coins`
            )
          }
        }
      }
    }

    /**
     * Round ended when hp fall below 0
     */
    if (castle.hp <= 0) {
      const attachment = await getCastleImage(
        castle.hp,
        castle.initialhp,
        castle.id
      );
      msg.channel.send(`${bold(castleName)} has fallen!`);
      msg.channel.send({ files: [attachment] });
      const winCastle =
        Castle.castleA.id === castle.id ? Castle.castleB : Castle.castleA;
      msg.channel.send(`${bold(winCastle.name)} won the battle!`);

      player.coins += Castle.FATAL_BLOW_REWARD;

      player.save();

      client.battleStage.setEndStage(msg.channel);
    }
  }
}
