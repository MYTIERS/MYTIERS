const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences, // ضروري لمعرفة حالة الأونلاين/الأوفلاين
        GatewayIntentBits.GuildMembers   // ضروري لقراءة رتب الأعضاء
    ]
});

// ======================== [ الإعدادات الرئيسية ] ========================
const RESULTS_CHANNEL_ID = '1554252285842817174'; // ID روم النتائج 📋╎tier・results
const TESTER_ROLE_ID = '1534195774160638131';     // ID رتبة MY | Tester
const TICKETS_CATEGORY_ID = '';                   // ضع ID الكاتيجوري هنا (اختياري)
const DB_FILE = './database.json';
// ======================================================================

// تحميل وتخزين بيانات التسجيل بملف JSON لعدم ضياعها
let registeredUsers = {};
if (fs.existsSync(DB_FILE)) {
    try {
        registeredUsers = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        registeredUsers = {};
    }
}

function saveData() {
    fs.writeFileSync(DB_FILE, JSON.stringify(registeredUsers, null, 4));
}

// قائمة انتظار مؤقتة لكل كت
const activeQueues = {
    Sword: [],
    Pot: [],
    Vanilla: [],
    UHC: [],
    NethOP: [],
    SMP: [],
    Axe: [],
    Mace: [],
    SpearMace: []
};

const GAMEMODES = ['Vanilla', 'UHC', 'Pot', 'NethOP', 'SMP', 'Sword', 'Axe', 'Mace', 'SpearMace'];

// فحص وجود تستر بحالة أونلاين يحمل رتبة MY | Tester
async function isTesterOnline(guild) {
    try {
        const members = await guild.members.fetch();
        return members.some(member => 
            member.roles.cache.has(TESTER_ROLE_ID) && 
            member.presence && 
            member.presence.status !== 'offline'
        );
    } catch (err) {
        console.error("Error fetching presences:", err);
        return false;
    }
}

// بناء إمبد قائمة الانتظار بناءً على حالة التستر
async function buildQueueEmbed(guild, gamemode) {
    const online = await isTesterOnline(guild);
    const queueList = activeQueues[gamemode] || [];

    if (!online) {
        const offlineEmbed = new EmbedBuilder()
            .setColor('#ff3333')
            .setTitle(`قائمة الانتظار: ${gamemode} 🗡️`)
            .setDescription(`**🔴 أوفلاين**\n\nالقائمة مغلقة حالياً، لا يوجد تستر متاح لهذا الكت.`)
            .setFooter({ text: 'MYTIERS Queue' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`join_q_${gamemode}`).setLabel('دخول القائمة').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId(`leave_q_${gamemode}`).setLabel('خروج').setStyle(ButtonStyle.Danger).setDisabled(true),
            new ButtonBuilder().setCustomId(`refresh_q_${gamemode}`).setLabel('تحديث').setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [offlineEmbed], components: [row] };
    } else {
        let queueText = '';
        for (let i = 1; i <= 20; i++) {
            const userInSlot = queueList[i - 1];
            queueText += `${i}.${userInSlot ? `<@${userInSlot.id}>` : 'فارغ'}\n`;
        }

        const onlineEmbed = new EmbedBuilder()
            .setColor('#33ff33')
            .setTitle(`قائمة الانتظار: ${gamemode} 🗡️️`)
            .setDescription(`**🟢 أونلاين**\n\n${queueText}\n**المنتظرون:** ${queueList.length}/20`)
            .setFooter({ text: 'MYTIERS Queue' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`join_q_${gamemode}`).setLabel('دخول القائمة').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`leave_q_${gamemode}`).setLabel('خروج').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`refresh_q_${gamemode}`).setLabel('تحديث').setStyle(ButtonStyle.Secondary)
        );

        return { embeds: [onlineEmbed], components: [row] };
    }
}

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('setup-queue')
            .setDescription('إرسال لوحة قائمة الانتظار والأزرار (للمسؤولين)')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('register')
            .setDescription('تسجيل حساب ماينكرافت الخاص بك')
            .addStringOption(opt => opt.setName('username').setDescription('اسمك في ماينكرافت').setRequired(true))
            .addStringOption(opt => opt.setName('edition').setDescription('نوع النسخة').setRequired(true).addChoices(
                { name: 'Java Premium', value: 'JAVA' },
                { name: 'Cracked', value: 'CRACKED' },
                { name: 'Bedrock', value: 'BEDROCK' }
            ))
            .addStringOption(opt => opt.setName('region').setDescription('المنطقة').setRequired(true).addChoices(
                { name: 'Middle East (ME)', value: 'ME' },
                { name: 'Europe (EU)', value: 'EU' },
                { name: 'North America (NA)', value: 'NA' },
                { name: 'Asia (AS)', value: 'AS' }
            ))
            .addAttachmentOption(opt => opt.setName('skin_file').setDescription('ملف السكن PNG (اختياري)').setRequired(false)),

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('تعيين تصنيف الكت للاعب (للتسترات فقط)')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
            .addUserOption(opt => opt.setName('player').setDescription('اللاعب').setRequired(true))
            .addStringOption(opt => opt.setName('gamemode').setDescription('الكت / الطور').setRequired(true).addChoices(
                { name: 'Sword 🗡️', value: 'Sword' },
                { name: 'Vanilla 🔮', value: 'Vanilla' },
                { name: 'Pot 🧪', value: 'Pot' },
                { name: 'UHC 💖', value: 'UHC' },
                { name: 'NethOP 🛡️', value: 'NethOP' },
                { name: 'SMP 🟢', value: 'SMP' },
                { name: 'Axe 🪓', value: 'Axe' },
                { name: 'Mace 🔨', value: 'Mace' },
                { name: 'Spearmace 🔱', value: 'SpearMace' }
            ))
            .addStringOption(opt => opt.setName('tier').setDescription('التصنيف').setRequired(true).addChoices(
                { name: 'Unranked (غير مصنف)', value: 'Unranked' },
                { name: 'High Tier 1 (HT1)', value: 'HT1' },
                { name: 'Low Tier 1 (LT1)', value: 'LT1' },
                { name: 'High Tier 2 (HT2)', value: 'HT2' },
                { name: 'Low Tier 2 (LT2)', value: 'LT2' },
                { name: 'High Tier 3 (HT3)', value: 'HT3' },
                { name: 'Low Tier 3 (LT3)', value: 'LT3' },
                { name: 'High Tier 4 (HT4)', value: 'HT4' },
                { name: 'Low Tier 4 (LT4)', value: 'LT4' },
                { name: 'High Tier 5 (HT5)', value: 'HT5' },
                { name: 'Low Tier 5 (LT5)', value: 'LT5' }
            )),

        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('عرض بروفايل اللاعب')
            .addUserOption(opt => opt.setName('user').setDescription('اللاعب').setRequired(false))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    // أمر إنشاء لوحة الأزرار والقوائم
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-queue') {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🧪 MYTIERS - قوائم الاختبار')
            .setDescription('اختر الكت الذي تريد الاختبار فيه من الأزرار بالأسفل لعرض قائمة الانتظار والدخول فيها.\n\n⚠️ **يجب أن تكون مسجلاً عبر `/register` أولاً.**');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('select_mode_Sword').setLabel('Sword').setEmoji('🗡️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_Pot').setLabel('Pot').setEmoji('🧪').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_Vanilla').setLabel('Vanilla').setEmoji('🔮').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_UHC').setLabel('UHC').setEmoji('💖').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_NethOP').setLabel('NethOP').setEmoji('🛡️').setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('select_mode_SMP').setLabel('SMP').setEmoji('🟢').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_Axe').setLabel('Axe').setEmoji('🪓').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_Mace').setLabel('Mace').setEmoji('🔨').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('select_mode_SpearMace').setLabel('Spearmace').setEmoji('🔱').setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row1, row2] });
        return await interaction.reply({ content: '✅ تم إرسال لوحة قوائم الانتظار بنجاح!', ephemeral: true });
    }

    // التفاعلات مع الأزرار
    if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('select_mode_')) {
            const mode = customId.replace('select_mode_', '');
            const queueData = await buildQueueEmbed(interaction.guild, mode);
            return await interaction.reply({ ...queueData, ephemeral: true });
        }

        if (customId.startsWith('join_q_')) {
            const mode = customId.replace('join_q_', '');
            if (!registeredUsers[interaction.user.id]) {
                return await interaction.reply({ content: '❌ يجب أن تكون مسجلاً أولاً باستخدام الأمر `/register`!', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`modal_ip_${mode}`)
                .setTitle(`اختبار كت ${mode} - MYTIERS`);

            const ipInput = new TextInputBuilder()
                .setCustomId('server_ip')
                .setLabel('أدخل آيبي سيرفر الاختبار (Server IP):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('mc.example.com')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(ipInput));
            return await interaction.showModal(modal);
        }

        if (customId.startsWith('leave_q_')) {
            const mode = customId.replace('leave_q_', '');
            activeQueues[mode] = activeQueues[mode].filter(u => u.id !== interaction.user.id);
            const queueData = await buildQueueEmbed(interaction.guild, mode);
            return await interaction.update(queueData);
        }

        if (customId.startsWith('refresh_q_')) {
            const mode = customId.replace('refresh_q_', '');
            const queueData = await buildQueueEmbed(interaction.guild, mode);
            return await interaction.update(queueData);
        }
    }

    // استقبال نموذج الآيبي وإنشاء روم التذكرة
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('modal_ip_')) {
            const mode = interaction.customId.replace('modal_ip_', '');
            const serverIp = interaction.fields.getTextInputValue('server_ip');
            const userData = registeredUsers[interaction.user.id];

            if (!activeQueues[mode].some(u => u.id === interaction.user.id)) {
                activeQueues[mode].push(interaction.user);
            }

            const channelOptions = {
                name: `test-${mode}-${userData.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: TESTER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            };

            if (TICKETS_CATEGORY_ID && TICKETS_CATEGORY_ID.trim() !== '') {
                channelOptions.parent = TICKETS_CATEGORY_ID;
            }

            const ticketChannel = await interaction.guild.channels.create(channelOptions);

            const ticketEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`⚔️ تذكرة اختبار جديدة | MYTIERS`)
                .setThumbnail(userData.skinUrl)
                .addFields(
                    { name: 'اللاعب:', value: `${interaction.user} (\`${userData.username}\`)`, inline: true },
                    { name: 'الكت المطلوب:', value: `\`${mode}\``, inline: true },
                    { name: 'آيبي السيرفر (Server IP):', value: `\`${serverIp}\``, inline: false },
                    { name: 'المنطقة:', value: `\`${userData.region}\``, inline: true }
                )
                .setFooter({ text: 'MYTIERS Ticket System' })
                .setTimestamp();

            await ticketChannel.send({ 
                content: `👋 مرحباً ${interaction.user}! تم فتح التذكرة للاختبار. ينضم <@&${TESTER_ROLE_ID}> قريباً.`, 
                embeds: [ticketEmbed] 
            });

            return await interaction.reply({ 
                content: `✅ تم دخول القائمة بنجاح وفتح تذكرة لك في الروم: ${ticketChannel}`, 
                ephemeral: true 
            });
        }
    }

    // تنفيذ الأوامر
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'register') {
            const userId = interaction.user.id;
            if (registeredUsers[userId]) {
                return await interaction.reply({ content: '❌ أنت مسجل بالفعل!', ephemeral: true });
            }

            const username = interaction.options.getString('username');
            const edition = interaction.options.getString('edition');
            const region = interaction.options.getString('region');
            const skinAttachment = interaction.options.getAttachment('skin_file');

            let skinUrl = skinAttachment 
                ? skinAttachment.url 
                : `https://visage.surgeplay.com/face/160/${encodeURIComponent(username)}`;

            const initialTiers = {};
            GAMEMODES.forEach(mode => initialTiers[mode] = 'Unranked');

            registeredUsers[userId] = { username, edition, region, skinUrl, points: 0, title: 'Rookie', tiers: initialTiers };
            saveData();

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('💎 MYTIERS - Registration Successful')
                .setThumbnail(skinUrl)
                .addFields(
                    { name: 'Username:', value: `\`${username}\``, inline: false },
                    { name: 'Edition:', value: `\`${edition}\``, inline: false },
                    { name: 'Region:', value: `\`${region}\``, inline: false }
                )
                .setFooter({ text: 'MYTIERS Official Network' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } 

        else if (commandName === 'setrank') {
            const targetUser = interaction.options.getUser('player');
            const gamemode = interaction.options.getString('gamemode');
            const tier = interaction.options.getString('tier');

            const userData = registeredUsers[targetUser.id];
            if (!userData) {
                return await interaction.reply({ content: `❌ هذا اللاعب (${targetUser}) غير مسجل!`, ephemeral: true });
            }

            const previousRank = userData.tiers[gamemode] || 'Unranked';
            userData.tiers[gamemode] = tier;
            saveData();

            await interaction.reply({ content: `✅ Successfully set **${tier}** rank for ${targetUser} in **${gamemode}** mode!`, ephemeral: true });

            const resultsChannel = interaction.guild.channels.cache.get(RESULTS_CHANNEL_ID);
            if (resultsChannel) {
                const rankEarnedText = tier === 'Unranked' ? 'Unranked' : `${tier} (${gamemode.toUpperCase()})`;

                const resultEmbed = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle(`${userData.username}'s Test Results 🏆`)
                    .setThumbnail(userData.skinUrl)
                    .addFields(
                        { name: 'Tester:', value: `${interaction.user}`, inline: false },
                        { name: 'Region:', value: `${userData.region}`, inline: false },
                        { name: 'Username:', value: `${userData.username}`, inline: false },
                        { name: 'Previous Rank:', value: `${previousRank}`, inline: false },
                        { name: 'Rank Earned:', value: `**${rankEarnedText}**`, inline: false }
                    )
                    .setFooter({ text: 'MYTIERS Official Results' })
                    .setTimestamp();

                await resultsChannel.send({ embeds: [resultEmbed] });
            }
        }

        else if (commandName === 'profile') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userData = registeredUsers[targetUser.id];

            if (!userData) {
                return await interaction.reply({ content: `❌ هذا اللاعب (${targetUser}) غير مسجل!`, ephemeral: true });
            }

            let tiersList = '';
            for (const [mode, rank] of Object.entries(userData.tiers)) {
                tiersList += `• **${mode}:** \`${rank}\`\n`;
            }

            const profileEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`⚔️ MYTIERS Profile - ${userData.username}`)
                .setThumbnail(userData.skinUrl)
                .addFields(
                    { name: 'المنطقة 🌍', value: `\`${userData.region}\``, inline: false },
                    { name: 'النقاط 🏆', value: `\`${userData.points} pts\``, inline: false },
                    { name: 'اللقب ⭐️', value: `\`${userData.title}\``, inline: false },
                    { name: '📊 تصنيفات الأطوار (Tiers)', value: tiersList, inline: false }
                )
                .setFooter({ text: 'MYTIERS Competitive System' })
                .setTimestamp();

            await interaction.reply({ embeds: [profileEmbed] });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
