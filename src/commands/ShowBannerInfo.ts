import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { client } from "..";
import { botCommandChannelFilter } from "../utils";
import paginationEmbed from "@psibean/discord.js-pagination";
import { getBannerInfo } from "../structure/Banner";

export default class extends Command {
  name = "showbannerinfo";
  description = "!showbannerinfo show the stats for a given banner ID. EX)!showbannerinfo <id>";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);

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
      let bannerEmbedData = await getBannerInfo(bannerIDnum);

      let bannerStats = new MessageEmbed()
        .setColor(bannerEmbedData[0].color)
        .setTitle(`Banner #${bannerID}`)
        .setImage(
          bannerEmbedData[0].imageURL
        )
        .setFields(bannerEmbedData[0].stats);

      let bannerStatBreakdown = new MessageEmbed()
        .setColor(bannerEmbedData[0].color)
        .setTitle(`Banner #${bannerID}`)
        .setImage(
          bannerEmbedData[0].imageURL
        )
        .setFields(bannerEmbedData[0].statsBreakdown);

      const pagesData = [bannerStats, bannerStatBreakdown];

      paginationEmbed(msg, pagesData);

    } catch (error: any) {
      throw new Error(error.toString());
    }
  }
}