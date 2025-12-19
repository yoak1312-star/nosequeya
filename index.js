const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const PANEL_CHANNEL_ID = config.panelChannelId;
const LOG_CHANNEL_ID = config.logChannelId;
const ACCESS_ROLE_ID = config.accessRoleId;
const VERIFY_TEXT = config.verifyText;
const COOLDOWN_TIME = (config.cooldownSeconds || 120) * 1000;
const ACCOUNTS_DIR = path.join(__dirname, "accounts");

const cooldowns = new Map();
let panelMessage = null;

function getStock(service) {
    const file = path.join(ACCOUNTS_DIR, `${service}.txt`);
    if (!fs.existsSync(file)) return 0;
    return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length;
}

function services() {
    if (!fs.existsSync(ACCOUNTS_DIR)) return [];
    return fs.readdirSync(ACCOUNTS_DIR).filter(f => f.endsWith(".txt")).map(f => f.replace(".txt", ""));
}

function buildEmbed() {
    const embed = new EmbedBuilder().setTitle("🎁 OPS GEN PANEL").setColor(0x00ff99).setDescription("Seleccioná un servicio para generar cuenta");
    for (const s of services()) {
        const stock = getStock(s);
        embed.addFields({ name: `${stock > 0 ? "🟢" : "❌"} ${s}`, value: `Stock: **${stock}**`, inline: true });
    }
    return embed;
}

function buildButtons() {
    const rows = [];
    let row = new ActionRowBuilder();
    for (const s of services()) {
        const stock = getStock(s);
        if (row.components.length === 5) { rows.push(row); row = new ActionRowBuilder(); }
        row.addComponents(new ButtonBuilder().setCustomId(`gen_${s}`).setLabel(s).setStyle(stock > 0 ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(stock === 0));
    }
    if (row.components.length) rows.push(row);
    rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("verify_access").setLabel("✅ Verificar acceso").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("refresh_panel").setLabel("🔄 Actualizar").setStyle(ButtonStyle.Primary)));
    return rows;
}

async function createOrLoadPanel() {
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 10 });
    panelMessage = messages.find(m => m.author.id === client.user.id);
    if (!panelMessage) {
        panelMessage = await channel.send({ embeds: [buildEmbed()], components: buildButtons() });
    } else {
        await panelMessage.edit({ embeds: [buildEmbed()], components: buildButtons() });
    }
}

client.once("ready", async () => {
    console.clear();
    console.log(` ██████╗ ██████╗ ███████╗
 ██╔═══██╗██╔══██╗██╔════╝
 ██║ ██║██████╔╝███████╗
 ██║ ██║██╔═══╝ ╚════██║
 ╚██████╔╝██║     ███████║
  ╚═════╝ ╚═╝     ╚══════╝
     OPS GEN INICIADO`);
    await createOrLoadPanel();
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    try {
        if (interaction.customId === "refresh_panel") {
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
            await panelMessage.edit({ embeds: [buildEmbed()], components: buildButtons() });
            return;
        }
        if (interaction.customId === "verify_access" || interaction.customId.startsWith("gen_")) {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
            const member = await interaction.guild.members.fetch(interaction.user.id);
            let hasRequiredStatus = false;
            try {
                await member.fetch(true);
                const status = member.presence?.activities.find(a => a.type === ActivityType.Custom);
                const statusText = status?.state;
                hasRequiredStatus = statusText && statusText.includes(VERIFY_TEXT);
            } catch (presenceError) {
                console.warn(`No se pudo obtener la presencia de ${interaction.user.tag}:`, presenceError.message);
            }
            if (interaction.customId === "verify_access") {
                if (hasRequiredStatus) {
                    if (!member.roles.cache.has(ACCESS_ROLE_ID)) await member.roles.add(ACCESS_ROLE_ID);
                    return interaction.editReply("🎉 Acceso otorgado correctamente.");
                } else {
                    return interaction.editReply(`❌ Tu estado no contiene el texto requerido.\nNecesitas tener: \`${VERIFY_TEXT}\``);
                }
            }
            if (interaction.customId.startsWith("gen_")) {
                const userId = interaction.user.id;
                const now = Date.now();
                if (cooldowns.has(userId) && cooldowns.get(userId) > now) {
                    const t = Math.ceil((cooldowns.get(userId) - now) / 1000);
                    return interaction.editReply(`⏳ Esperá ${t}s antes de generar otra cuenta.`);
                }
                if (!hasRequiredStatus) {
                    if (member.roles.cache.has(ACCESS_ROLE_ID)) {
                        await member.roles.remove(ACCESS_ROLE_ID);
                        console.log(`Rol quitado a ${interaction.user.tag} por no tener el estado.`);
                    }
                    return interaction.editReply(`❌ Tenés que tener este texto en tu estado para generar:\n\`${VERIFY_TEXT}\``);
                }
                const service = interaction.customId.replace("gen_", "");
                const file = path.join(ACCOUNTS_DIR, `${service}.txt`);
                if (!fs.existsSync(file)) return interaction.editReply("❌ El servicio no existe.");
                const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
                if (!lines.length) return interaction.editReply("❌ Sin stock para este servicio.");
                const account = lines.shift();
                fs.writeFileSync(file, lines.join("\n"));
                try {
                    await interaction.user.send(`🎁 **${service}**\n\`${account}\``);
                    cooldowns.set(userId, now + COOLDOWN_TIME);
                    await interaction.editReply("✅ Cuenta enviada por MD.");
                    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                    if (logChannel) {
                        logChannel.send(`🎁 ${interaction.user.tag} generó **${service}**`);
                    }
                    await panelMessage.edit({ embeds: [buildEmbed()], components: buildButtons() });
                } catch (dmError) {
                    console.error(`Error al enviar DM a ${interaction.user.tag}:`, dmError);
                    const linesToRestore = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
                    linesToRestore.push(account);
                    fs.writeFileSync(file, linesToRestore.join("\n"));
                    await interaction.editReply("❌ No pude enviarte la cuenta por MD. Actívalos y vuelve a intentar.");
                }
            }
        }
    } catch (err) {
        console.error("❌ ERROR GENERAL EN INTERACTION:", err);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: "❌ Ocurrió un error inesperado. Inténtalo de nuevo.", ephemeral: true }).catch(() => {});
        }
    }
});

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
    console.error("❌ TOKEN no definido en variables de entorno");
    process.exit(1);
}
client.login(TOKEN);


