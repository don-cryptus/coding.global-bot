import { GuildMember } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";
import { joinSettings } from "../modules/members/joinNickname.js";
import { moveMemberToChannel } from "../modules/members/moveMemberToChannel.js";
import { VoiceModule } from "../modules/voice/Voice.module.js";
import { prisma } from "../prisma.js";

@Discord()
export class VoiceStateUpdate {
  @On()
  async voiceStateUpdate(
    [oldVoiceState, newVoiceState]: ArgsOf<"voiceStateUpdate">,
    client: Client,
  ) {
    const member =
      newVoiceState?.member || (oldVoiceState?.member as GuildMember);
    const guild = newVoiceState?.guild || oldVoiceState?.guild;
    const memberGuild = await prisma.memberGuild.findFirst({
      where: {
        memberId: member.id,
        guildId: guild.id,
      },
    });

    if (memberGuild?.moving && memberGuild.moveCounter > 0) return;

    if (!oldVoiceState.channelId)
      await joinSettings(newVoiceState.member as GuildMember, newVoiceState);

    await VoiceModule.updateUserVoiceState(newVoiceState);

    if (!oldVoiceState.channelId && newVoiceState.channelId)
      moveMemberToChannel(newVoiceState.member as GuildMember);

    // save logs to db
    await VoiceModule.logVoiceEventsDb(oldVoiceState, newVoiceState);

    // internal logging
    await VoiceModule.logVoiceEvents(oldVoiceState, newVoiceState);

    await VoiceModule.closeDeadVoiceEvents();
  }
}