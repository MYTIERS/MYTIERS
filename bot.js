const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// استخدام Map لحفظ بيانات المستخدمين المسجلين (ربط أيدي الديسكورد باسم ماين كرافت)
const registeredUsers = new Map();

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول باسم ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('register')
            .setDescription('تسجيل حساب ماين كرافت الخاص بك (مرة واحدة فقط)')
            .addStringOption(option =>
                option.setName('username')
                    .setDescription('اسم حسابك في ماين كرافت')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('edition')
                    .setDescription('نسخة ماين كرافت (جافا، كراك، بيدروك)')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Java', value: 'JAVA' },
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
                option.setName('skin')
                    .setDescription('ارفع ملف السكن png الخاص بك')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('عرض ملفك الشخصي أو ملف لاعب آخر')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('اللاعب المراد عرض ملفه')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('queuepanel')
            .setDescription('إرسال لوحة الانتظار في هذه القناة'),

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('تعيين تير لاعب في نمط لعب معين')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('اللاعب')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('gamemode')
                    .setDescription('نمط اللعب (Sword, Crystal, etc.)')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('tier')
                    .setDescription('التير (HT1, LT1, etc.)')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('syncroles')
            .setDescription('مزامنة رتب ديسكورد للـ HT / LT لجميع المسجلين'),

        new SlashCommandBuilder()
            .setName('unregister')
            .setDescription('حذف حسابك المسجل عبر كتابة اسمك لإعادة التسجيل')
            .addStringOption(option =>
                option.setName('username')
                    .setDescription('اكتب اسم ماين كرافت الخاص بك لتأكيد الحذف')
                    .setRequired(true))
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
                content: '❌ لقد قمت بالتسجيل مسبقاً! إذا حدث خطأ أو أردت تغيير بياناتك، يرجى حذف تسجيلك أولاً باستخدام أمر `/unregister` مع كتابة اسمك ثم التسجيل من جديد.',
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        const edition = interaction.options.getString('edition');
        const region = interaction.options.getString('region');
        const skinAttachment = interaction.options.getAttachment('skin');

        // حفظ اسم المستخدم المرتبط بأيدي الديسكورد
        registeredUsers.set(interaction.user.id, username);

        const skinAvatar = skinAttachment ? skinAttachment.url : `https://minotar.net/avatar/${username}/150.png`;

        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💎 MYTIERS | نظام التسجيل')
            .setDescription('**تم ربط حسابك بنجاح!**')
            .setThumbnail(skinAvatar)
            .addFields(
                { name: '👤 الاسم', value: `\`${username}\``, inline: true },
                { name: '🎮 النسخة', value: `\`${edition}\``, inline: true },
                { name: '🌍 المنطقة', value: `\`${region}\``, inline: true }
            )
            .setFooter({ text: 'MYTIERS Official Network' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } 
    else if (commandName === 'profile') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle(`👤 ملف اللاعب: ${targetUser.username}`)
            .setDescription('عرض تفاصيل الحساب والتيارات الخاصة باللاعب.')
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'queuepanel') {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('⚔️ MYTIERS | قائمة الانتظار (Queue)')
            .setDescription('اضغط للانضمام إلى طابور المباريات التنافسية.');
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'setrank') {
        const targetUser = interaction.options.getUser('user');
        const gamemode = interaction.options.getString('gamemode');
        const tier = interaction.options.getString('tier');
        await interaction.reply({ content: `✅ تم تعيين التير **${tier}** لللاعب ${targetUser} في نمط **${gamemode}** بنجاح!`, ephemeral: true });
    }
    else if (commandName === 'syncroles') {
        await interaction.reply({ content: '🔄 جاري مزامنة رتب الديسكورد لجميع اللاعبين المسجلين...', ephemeral: true });
    }
    else if (commandName === 'unregister') {
        if (!registeredUsers.has(interaction.user.id)) {
            return await interaction.reply({ content: '❌ أنت غير مسجل أصلاً في النظام!', ephemeral: true });
        }

        const inputUsername = interaction.options.getString('username');
        const savedUsername = registeredUsers.get(interaction.user.id);

        // التحقق من تطابق الاسم المدخل مع الاسم المسجل
        if (inputUsername !== savedUsername) {
            return await interaction.reply({ 
                content: `❌ اسم المستخدم الذي أدخلته غير مطابق لاسمك المسجل (\`${savedUsername}\`). يرجى كتابة اسمك الصحيح لإلغاء التسجيل.`, 
                ephemeral: true 
            });
        }

        registeredUsers.delete(interaction.user.id);
        await interaction.reply({ content: `🗑️ تم إلغاء ربط الحساب (\`${savedUsername}\`) وحذف بياناتك بنجاح. يمكنك الآن استخدام أمر `/register` والتسجيل من جديد.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
