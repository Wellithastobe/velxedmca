// Vercel serverless function to get session info
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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId } = req.query;

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        // Get session from memory
        global.sessions = global.sessions || new Map();
        const session = global.sessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session not found or expired' 
            });
        }

        // Check if session is expired
        if (session.expiresAt < Date.now()) {
            global.sessions.delete(sessionId);
            return res.status(410).json({ 
                success: false, 
                error: 'Session expired' 
            });
        }

        // Get Roblox user info
        const userInfo = await getRobloxUserInfo(session.robloxUsername);
        
        res.status(200).json({
            success: true,
            session: {
                sessionId: session.sessionId,
                discordUsername: session.discordUsername,
                robloxUsername: session.robloxUsername,
                bioCode: session.bioCode,
                expiresAt: session.expiresAt,
                verified: session.verified,
                attempts: session.attempts
            },
            robloxUser: userInfo
        });

    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get session' 
        });
    }
}

async function getRobloxUserInfo(username) {
    try {
        // Search for user
        const searchResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: true
            })
        });

        if (!searchResponse.ok) {
            throw new Error('User not found');
        }

        const searchData = await searchResponse.json();
        if (!searchData.data || searchData.data.length === 0) {
            throw new Error('User not found');
        }

        const userData = searchData.data[0];
        const userId = userData.id;

        // Get user details
        const detailsResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (!detailsResponse.ok) {
            throw new Error('Failed to get user details');
        }

        const detailsData = await detailsResponse.json();

        // Get avatar
        const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`);
        let profilePicUrl = 'https://via.placeholder.com/100x100/1f2937/ffffff?text=?';

        if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json();
            if (avatarData.data && avatarData.data.length > 0) {
                profilePicUrl = avatarData.data[0].imageUrl;
            }
        }

        return {
            profilePicUrl,
            displayName: detailsData.displayName || username,
            username: detailsData.name || username,
            description: detailsData.description || '',
            userId: userId
        };

    } catch (error) {
        console.error('Error getting Roblox user info:', error);
        return null;
    }
}
