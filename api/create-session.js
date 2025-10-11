// Vercel serverless function to generate secure verification session
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { discordUserId, discordUsername, robloxUsername } = req.body;

    if (!discordUserId || !discordUsername || !robloxUsername) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Generate secure session ID and bio code
        const sessionId = generateSecureId();
        const bioCode = generateSecureBioCode();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

        // Store session in memory (in production, use a database)
        const session = {
            sessionId,
            discordUserId,
            discordUsername,
            robloxUsername,
            bioCode,
            expiresAt,
            createdAt: Date.now(),
            verified: false,
            attempts: 0
        };

        // In production, store this in a database like Redis or MongoDB
        // For now, we'll use a simple in-memory store
        global.sessions = global.sessions || new Map();
        global.sessions.set(sessionId, session);

        // Clean up expired sessions
        cleanupExpiredSessions();

        res.status(200).json({
            success: true,
            sessionId,
            bioCode,
            verificationUrl: `https://velxe.com/verify/${sessionId}`,
            expiresIn: 600 // 10 minutes in seconds
        });

    } catch (error) {
        console.error('Error creating verification session:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create verification session' 
        });
    }
}

function generateSecureId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateSecureBioCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function cleanupExpiredSessions() {
    if (!global.sessions) return;
    
    const now = Date.now();
    for (const [sessionId, session] of global.sessions.entries()) {
        if (session.expiresAt < now) {
            global.sessions.delete(sessionId);
        }
    }
}
