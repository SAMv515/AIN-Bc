const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, Partials, ActivityType } = require("discord.js");

const config = require("./config.json");

// توكنات البوتين
const BOT1_TOKEN = config.BOT1_TOKEN;
const BOT2_TOKEN = config.BOT2_TOKEN;

const client1 = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.GuildMember],
});

const client2 = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.GuildMember],
});

// إعداد البوتين بعد أن يصبحوا جاهزين
client1.once("ready", () => {
  console.log("Bot 1 is Ready!");
  client1.user.setActivity({ name: "AIN", type: ActivityType.Streaming, url: "https://www.twitch.tv/twitch" });
});

client2.once("ready", () => {
  console.log("Bot 2 is Ready!");
  client2.user.setActivity({ name: "AIN", type: ActivityType.Streaming, url: "https://www.twitch.tv/twitch" });
});

// وظيفة البرودكاست
client1.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!bc") || message.author.bot) return;

  const allowedRoleId = config.allowedRoleId;
  const member = message.guild.members.cache.get(message.author.id);

  if (!member.roles.cache.has(allowedRoleId)) {
    return message.reply({
      content: "ليس لديك صلاحية لاستخدام هذا الامر!",
      ephemeral: true,
    });
  }

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply({
      content: "ليس لديك صلاحية لاستخدام هذا الامر!",
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#868686')
    .setTitle('لوحة تحكم البرودكاست')
    .setDescription('الرجاء اختيار نوع الإرسال للأعضاء.')
    .setImage('https://cdn.discordapp.com/attachments/1456543407416676362/1458258678615375913/Tek_7.png?ex=695efcba&is=695dab3a&hm=cae223d99ea26b13cc99f56944ebd37633d14e0ab03a948c91f9be965fb9735a&')
    .setFooter({ text: 'AIN ', iconURL: 'https://cdn.discordapp.com/attachments/1456543407416676362/1458258678615375913/Tek_7.png?ex=695efcba&is=695dab3a&hm=cae223d99ea26b13cc99f56944ebd37633d14e0ab03a948c91f9be965fb9735a&' });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("broadcast_select")
      .setPlaceholder("اختر نوع الإرسال")
      .addOptions([
        { label: "ارسل للجميع", value: "send_all", description: "إرسال الرسالة لجميع الأعضاء" },
        { label: "ارسل للمتصلين", value: "send_online", description: "إرسال الرسالة للأعضاء المتصلين فقط" },
        { label: "ارسل للغير المتصلين", value: "send_offline", description: "إرسال الرسالة للأعضاء غير المتصلين" },
      ])
  );

  await message.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
});

client1.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    const selectedOption = interaction.values[0];
    let customId = `modal_${selectedOption}`;

    const modal = new ModalBuilder()
      .setCustomId(customId)
      .setTitle("اكتب رسالتك");

    const messageInput = new TextInputBuilder()
      .setCustomId("messageInput")
      .setLabel("اكتب رسالتك هنا")
      .setStyle(TextInputStyle.Paragraph);

    const mentionInput = new TextInputBuilder()
      .setCustomId("mentionInput")
      .setLabel("هل تريد منشن للأعضاء؟ (نعم/لا)")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(
      new ActionRowBuilder().addComponents(messageInput),
      new ActionRowBuilder().addComponents(mentionInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit()) {
    const message = interaction.fields.getTextInputValue("messageInput");
    const mentionChoice = interaction.fields.getTextInputValue("mentionInput").toLowerCase();
    const isMention = mentionChoice === "نعم";
    const guild = interaction.guild;

    if (!guild) return;

    await interaction.deferReply({ ephemeral: true });

    let membersToSend = await guild.members.fetch();

    // تحويل Collection إلى Array باستخدام Array.from()
    let membersArray = Array.from(membersToSend.values());

    if (interaction.customId === "modal_send_online") {
      membersArray = membersArray.filter((member) => member.presence && member.presence.status !== "offline");
    } else if (interaction.customId === "modal_send_offline") {
      membersArray = membersArray.filter((member) => !member.presence || member.presence.status === "offline");
    }

    // تقسيم الأعضاء بين البوتين
    const bot1Members = membersArray.slice(0, Math.ceil(membersArray.length / 2));
    const bot2Members = membersArray.slice(Math.ceil(membersArray.length / 2));

    let bot1Count = 0;
    let bot2Count = 0;

    // إرسال الرسائل من البوتين
    const sendMessage = async (bot, members) => {
      let count = 0;
      await Promise.all(members.map(async (member) => {
        try {
          const messageContent = isMention ? `${message}\n<@${member.user.id}>` : message;
          await bot.users.send(member.user.id, { content: messageContent, allowedMentions: isMention ? { parse: ['users'] } : {} });
          count++; // زيادة العد
        } catch (error) {
          console.error(`Error sending message to ${member.user.tag}:`, error);
        }
      }));
      return count;
    };

    // إرسال الرسائل باستخدام البوتين
    bot1Count = await sendMessage(client1, bot1Members);
    bot2Count = await sendMessage(client2, bot2Members);

    // إخطار المستخدم بعدد الأعضاء الذين تم إرسال الرسالة لهم
    await interaction.editReply({
      content: `تم إرسال الرسالة بنجاح!\nتم إرسال الرسالة من البوت الأول إلى ${bot1Count} شخص.\nتم إرسال الرسالة من البوت الثاني إلى ${bot2Count} شخص.`
    });
  }
});

// تشغيل البوتين
client1.login(BOT1_TOKEN);
client2.login(BOT2_TOKEN);
