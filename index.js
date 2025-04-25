const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const readline = require('readline')

// Utility to get input from terminal
const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((resolve) => rl.question(text, ans => {
        rl.close()
        resolve(ans)
    }))
}

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false
    })

    // Only if not already registered
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Enter your phone number (e.g. 919707135809): ')
        let code = await sock.requestPairingCode(phoneNumber)
        code = code?.match(/.{1,4}/g)?.join('-') || code
        console.log('WhatsApp Pairing Code:', code)
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Connection closed:', lastDisconnect.error, ', Reconnecting:', shouldReconnect)
            if (shouldReconnect) {
                startSock()
            }
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp successfully!')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // Auto reply to messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid

        // Send 3 sequential replies
        await sock.sendMessage(from, { text: "𝚃𝚑𝚊𝚗𝚔𝚜 𝚏𝚘𝚛 𝚖𝚎𝚜𝚜𝚊𝚐𝚒𝚗𝚐 𝚁𝚊𝚔𝚒𝚋𝚞𝚕 ☺️" })
        await sock.sendMessage(from, { text: "𝚁𝚊𝚔𝚒𝚋𝚞𝚕 𝚒𝚜 𝚊 𝚋𝚒𝚝 𝚋𝚞𝚜𝚢 𝚛𝚒𝚐𝚑𝚝 𝚗𝚘𝚠, 𝚙𝚕𝚎𝚊𝚜𝚎 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚊𝚐𝚊𝚒𝚗 𝚊𝚏𝚝𝚎𝚛 𝚜𝚘𝚖𝚎 𝚝𝚒𝚖𝚎 😍" })
        await sock.sendMessage(from, { text: "𝙾𝚔𝚊𝚢 😁" })
    })
}

startSock()


