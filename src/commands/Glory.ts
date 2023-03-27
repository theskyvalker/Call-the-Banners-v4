import { Message, MessageEmbed } from "discord.js";
import { Command } from "@jiman24/commandment";
import { client } from "..";
import paginationEmbed from "@psibean/discord.js-pagination";
import { chunk, getMedal, botCommandChannelFilter } from "../utils";

const getHonorMessageEmbedTemplate = () =>
  new MessageEmbed()
    .setColor("RANDOM")
    .setTitle("Glory")
    .setThumbnail(
      "https://ik.imagekit.io/moz8vwijd/Glory.jpg"
    );

export default class extends Command {
  name = "glory";
  description =
    "!glory full list of players ranked based on total duels won. EX)!glory";

  async exec(msg: Message, _args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    // Consolidate player attribute and sort player by damage
    const players = [...client.players.values()]
      .map((player) => {
        const duelsWonList = client.duelResultHistory.current.filter(
          (x) => x.winnerID === player.id
        );

        const duelsFoughtList = client.duelResultHistory.current.filter(
          (x) => x.challengedID === player.id || x.challengerID === player.id
        );

        const duelsWon = duelsWonList.length;
        const duelsFought = duelsFoughtList.length;

        return {
          name: player.name,
          duelsFought,
          duelsWon,
        };
      })
      .sort((a, b) => b.duelsWon - a.duelsWon);

    // Seperate player by pages
    const playerPerPage = 5;
    const chunkedPlayers = chunk(players, playerPerPage);

    // Transform chunkedPlayers into array of pages data
    const pagesData = chunkedPlayers.map((chunk, chunkIndex) =>
      getHonorMessageEmbedTemplate().setFields(
        chunk.map((player, playerIndex) => ({
          name: `${getMedal(chunkIndex * playerPerPage + (playerIndex + 1))} ${player.name
            }`,
          value: `Duels Won: ${player.duelsWon}\n Duels Fought: ${player.duelsFought}`,
          inline: true,
        }))
      )
    );

    if (pagesData.length <= 0) {
      return msg.reply({
        embeds: [
          getHonorMessageEmbedTemplate().setDescription(
            "Glory board is currently empty."
          ),
        ],
      });
    }

    return paginationEmbed(msg, pagesData);
  }
}
