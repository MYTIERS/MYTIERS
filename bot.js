const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// معرف قناة النتائج (ضع ID القناة الخاصة بك هنا)
const RESULTS_CHANNEL_ID = '123456789012345678'; 

// حفظ بيانات المسجلين (ملاحظة: ينصح باستخدام قاعدة بيانات لاحقاً)
const registeredUsers = new Map();

client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول باسم ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('register')
            .setDescription('تسجيل حساب ماين كرافت الخاص بك')
            .addStringOption(option =>
                option.setName('username')
                    .setDescription('اسم حسابك في ماين كرافت')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('edition')
                    .setDescription('نسخة ماين كرافت (جافا، كراك، بيدروك)')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Java Premium', value: 'JAVA' },
                        { name: 'Cracked', value: 'CRACKED' },
                        { name: 'Bedrock', value: 'BEDROCK' }
                    ))
            .addStringOption(option =>
                option.setName('region')
                    .setDescription('منطقتك')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Middle East (ME)', value: 'ME' },
                        { name: 'Europe (EU)', value: 'EU' },
                        { name: 'North America (NA)', value: 'NA' },
                        { name: 'Asia (AS)', value: 'AS' }
                    ))
            .addAttachmentOption(option =>
                option.setName('skin_file')
                    .setDescription('ملف صورة السكن (مطلوب للكراك والبيدروك)')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('عرض ملفك الشخصي أو ملف لاعب آخر')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('اللاعب المراد عرض ملفه')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('تعيين تير لاعب في نمط لعب معين (للمختبرين فقط)')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles) // صلاحيات المشرفين/التستر
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('اللاعب')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('gamemode')
                    .setDescription('نمط اللعب')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Sword', value: 'Sword' },
                        { name: 'Vanilla', value: 'Vanilla' },
                        { name: 'Pot', value: 'Pot' },
                        { name: 'UHC', value: 'UHC' },
                        { name: 'NethOP', value: 'NethOP' },
                        { name: 'SMP', value: 'SMP' },
                        { name: 'Axe', value: 'Axe' },
                        { name: 'Mace', value: 'Mace' }
                    ))
            .addStringOption(option =>
                option.setName('tier')
                    .setDescription('الرانك المستحق')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('unregister')
            .setDescription('حذف حساب ماين كرافت المرتبط بحساب ديسكورد')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('حساب الديسكورد المراد حذف تسجيله')
                    .setRequired(false))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('جاري تحديث الأوامر في ديسكورد...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('تم تحديث الأوامر بنجاح!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'register') {
        if (registeredUsers.has(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ لقد قمت بالتسجيل مسبقاً! لاستبدال البيانات، استخدم أمر `/unregister` أولاً.',
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        const edition = interaction.options.getString('edition');
        const region = interaction.options.getString('region');
        const skinAttachment = interaction.options.getAttachment('skin_file');

        // التحقق من رفع السكن للكراك
        if ((edition === 'CRACKED' || edition === 'BEDROCK') && !skinAttachment) {
            return await interaction.reply({
                content: '⚠️ يجب عليك رفع ملف السكن الخاص بك بصيغة (PNG) بما أن نسختك مكركة أو بيدروك!',
                ephemeral: true
            });
        }

        let skinUrl = skinAttachment ? skinAttachment.url : `https://mc-heads.net/avatar/${username}/150`;

        registeredUsers.set(interaction.user.id, { 
            username, 
            edition, 
            region, 
            skinUrl,
            points: 0,
            tiers: {
                'Vanilla': 'Unranked',
                'UHC': 'Unranked',
                'Pot': 'Unranked',
                'NethOP': 'Unranked',
                'SMP': 'Unranked',
                'Sword': 'Unranked',
                'Axe': 'Unranked',
                'Mace': 'Unranked',
                'SpearMace': 'Unranked'
            }
        });

        const embed = new EmbedBuilder()
            .setColor('#00ff7f')
            .setTitle('💎 RubyTiers - تم التسجيل بنجاح')
            .setDescription('تم ربط حسابك بنجاح!')
            .setThumbnail(skinUrl)
            .addFields(
                { name: 'الاسم', value: `\`${username}\``, inline: false },
                { name: 'النسخة', value: `\`${edition}\``, inline: false },
                { name: 'المنطقة', value: `\`${region}\``, inline: false }
            )
            .setFooter({ text: 'RubyTiers Official Network' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } 

    else if (commandName === 'setrank') {
        const targetUser = interaction.options.getUser('user');
        const gamemode = interaction.options.getString('gamemode');
        const tier = interaction.options.getString('tier');

        const userData = registeredUsers.get(targetUser.id);
        
        if (!userData) {
            return await interaction.reply({ 
                content: `❌ هذا اللاعب (${targetUser}) غير مسجل في النظام عبر أمر /register!`, 
                ephemeral: true 
            });
        }

        const previousRank = userData.tiers[gamemode] || 'Unranked';
        userData.tiers[gamemode] = tier;

        // إرسال الرد للتستر
        await interaction.reply({ content: `✅ تم تعيين التير **${tier}** لللاعب ${targetUser} بنجاح!`, ephemeral: true });

        // إرسال النتيجة تلقائياً لروم النتائج
        const resultsChannel = interaction.guild.channels.cache.get(RESULTS_CHANNEL_ID);
        if (resultsChannel) {
            const resultEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`${userData.username}'s Test Results 🏆`)
                .setThumbnail(userData.skinUrl)
                .addFields(
                    { name: 'Tester:', value: `${interaction.user}`, inline: false },
                    { name: 'Region:', value: `${userData.region}`, inline: false },
                    { name: 'Username:', value: `${userData.username}`, inline: false },
                    { name: 'Previous Rank:', value: `${previousRank}`, inline: false },
                    { name: 'Rank Earned:', value: `**${tier} (${gamemode.toUpperCase()})**`, inline: false }
                )
                .setFooter({ text: 'RubyTiers Official Results' })
                .setTimestamp();

            await resultsChannel.send({ embeds: [resultEmbed] });
        }
    }

    else if (commandName === 'unregister') {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (!registeredUsers.has(targetUser.id)) {
            return await interaction.reply({ content: `❌ هذا الحساب غير مسجل بالأساس!`, ephemeral: true });
        }

        registeredUsers.delete(targetUser.id);
        await interaction.reply({ content: `🗑 تم إلغاء ربط الحساب بنجاح.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
