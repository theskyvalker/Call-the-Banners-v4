import { Command } from "@jiman24/commandment";
import { PermissionResolvable } from "discord.js";
import { refreshHOF } from "../utils";

export default class extends Command {
  name = "hof";
  description = "Update the Hall of Fame and Hall of Infamy";
  permissions: PermissionResolvable[] = ["ADMINISTRATOR"];

  async exec() {
    await refreshHOF();
  }
}