import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { botCommandChannelFilter } from "../utils";
import paginationEmbed from "@psibean/discord.js-pagination";
import { getBannerInfo, setBannerForPlayer } from "../structure/Banner";
import { Player } from "../structure/Player";
import { bold } from "@jiman24/discordjs-utils";

export default class extends Command {
  name = "callbanner";
  description = "!callbanner Call a banner you own to use its bonuses in battle. EX)!callbanner <id>";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    let player = Player.fromID(msg.author.id);
    if (!player) {
      throw new Error("player not found");
    }

    const cooldown = player.isOnCooldown("banner");

    if (cooldown.status) {
      throw new Error(`Please wait for ${bold(cooldown.timeLeft)}`);
    }

    const bannerID = args[0];
    let bannerIDnum = 0;

    if (!bannerID) {
      throw new Error("you need to specify a banner ID");
    }
    try {
      bannerIDnum = parseInt(args[0]);
    } catch {
      throw new Error("provided banner ID is not a valid number")
    }

    try {
      player = await setBannerForPlayer(bannerIDnum, player);
      const bannerEmbedData = await getBannerInfo(bannerIDnum);

      player.setCooldown("banner");
      player.save();

      let bannerStats = new MessageEmbed()
        .setColor(bannerEmbedData[0].color)
        .setTitle(`Banner #${bannerID}`)
        .setImage(
          bannerEmbedData[0].imageURL
        )
        .setFields(bannerEmbedData[0].stats);

      const pagesData = [bannerStats];

      paginationEmbed(msg, pagesData);

      msg.channel.send(`The house of Banner ${bannerIDnum} has answered your call!`);
      player.setCooldown("banner");

    } catch (error: any) {
      throw new Error(error.toString());
    }
  }
}