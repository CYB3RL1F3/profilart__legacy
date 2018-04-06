export const config = {
    api: {
        residentAdvisor: {
            dj: 'https://www.residentadvisor.net/api/dj.asmx',
            events: 'https://www.residentadvisor.net/api/events.asmx'
        },
        discogs: 'https://api.discogs.com/'
    },
    db: {
        address: process.env.MONGODB_URI // || 'mongodb://localhost:27017/profilart'
    },
    google: {
        api_key: process.env.GOOGLE_API_KEY
    }
};

export default config;
