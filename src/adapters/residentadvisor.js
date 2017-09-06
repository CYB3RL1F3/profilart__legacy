export class ResidentAdvisorAdapter {
    adapt (response, adapt) {
        const adaptedResponse = {};
        switch (adapt) {
            case 'events':
                Object.assign(adaptedResponse, this.adaptEvents(response));
                break;
            case 'charts':
                Object.assign(adaptedResponse, this.adaptChart(response));
                break;
            case 'infos':
                Object.assign(adaptedResponse, this.adaptInfos(response));
                break;
            default:
                Object.assign(adaptedResponse, response);
        }
        return adaptedResponse;
    }

    adaptChart (response) {
        const adaptedResponse = {
            charts: {}
        };
        response.charts.forEach((chart) => {
            if (!adaptedResponse.charts[chart.track[0].chartid]) {
                adaptedResponse.charts[chart.track[0].chartid] = {
                    id: `${chart.track[0].chartid}`,
                    date: `${chart.track[0].chartdate}`,
                    rank: `${chart.track[0].rank}`,
                    tracks: []
                };
            }
            chart.track.forEach((track) => {
                adaptedResponse.charts[chart.track[0].chartid].tracks.push({
                    id: `${track.trackid}`,
                    artist: `${track.artist}`,
                    title: `${track.title}`,
                    label: `${track.label}`,
                    remix: `${track.mix}`,
                    RA_link: `${track.tracklink}`,
                    cover: `${track.cover}`
                })
            })
        })
        return adaptedResponse.charts;
    }

    adaptEvents (response) {
        const events = [];
        if (response.events instanceof Array) {
            response.events.forEach((evt) => {
                const event = evt.event[0];
                const time = `${event.time}`.split(' - ');
                events.push({
                    id: `${event.id}`,
                    venueId: `${event.venueid}`,
                    date: `${event.eventdate}`,
                    country: `${event.countryname}`,
                    area: `${event.areaname}`,
                    areaId: `${event.areaId}`,
                    title: `${event.venue}`,
                    address: `${event.address}`,
                    lineup: `${event.lineup}`.split(', '),
                    time: {
                        begin: time[0],
                        end: time[1]
                    },
                    cost: `${event.cost}`,
                    promoter: `${event.promoter}`,
                    links: {
                        event: `${event.eventlink}`,
                        venue: `${event.venuelink}`,
                    },
                    flyer: `${event.imagelisting}`
                });
            });
        }
        return events;
    }

    adaptInfos (response) {
        const data = response.artist[0];
        const labels = [];
        data.labels.forEach((label) => {
            labels.push(`${label}`);
        });
        return {
            name: `${data.artistname}`,
            realname: `${data.realname}`,
            country: `${data.countryname}`,
            labels: labels,
            website: `${data.website}`,
            RA: `${data.raprofile}`,
            facebook: `${data.facebook}`,
            twitter: `${data.twitter}`,
            discogs: `${data.discogs}`,
            soundcloud: `${data.soundcloud}`,
            picture: `${data.profileimage}`,
            bio: {
                intro: `${data.biointro}`,
                content: `${data.bio}`
            }
        };
    }
};

export default ResidentAdvisorAdapter;
