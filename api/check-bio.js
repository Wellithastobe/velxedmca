// Vercel serverless function to check Roblox bio
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

    const { userId, code } = req.query;

    if (!userId || !code) {
        return res.status(400).json({ error: 'User ID and code are required' });
    }

    try {
        // Get user details to check bio
        const detailsResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (!detailsResponse.ok) {
            throw new Error('Failed to get user details');
        }

        const detailsData = await detailsResponse.json();
        const description = detailsData.description || '';
        
        const hasCode = description.includes(code);

        res.status(200).json({
            success: true,
            hasCode: hasCode,
            description: description
        });

    } catch (error) {
        console.error('Error checking Roblox bio:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to check bio' 
        });
    }
}
