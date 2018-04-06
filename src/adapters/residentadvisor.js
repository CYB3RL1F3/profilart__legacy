import GoogleMaps from '../lib/googleMaps';

export class ResidentAdvisorAdapter {

    constructor () {
      this.googleMaps = new GoogleMaps();
    }

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

    adaptEvent (event) {
      return {
          id: `${event.id}`,
          venueId: `${event.venueid}`,
          date: `${event.eventdate}`,
          country: `${event.countryname}`,
          area: `${event.areaname}`,
          areaId: `${event.areaId}`,
          title: `${event.venue}`,
          address: `${event.address[0] || event.address}`,
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
      }
    }

    adaptEvents (response) {
        return new Promise((resolve, reject) => {
          const events = [];
          const promises = [];
          if (response.events instanceof Array) {
              response.events.forEach((evt) => {
                  const event = evt.event[0];
                  const time = `${event.time}`.split(' - ');
                  const address = event.address[0] || event.address;
                  if (event.address && address) {
                    promises.push(
                      new Promise((resolve, reject) => {
                        this.googleMaps.getLocation(address).then(location => {
                          event.location = location;
                          events.push(event);
                          resolve();
                        }).catch((e) => {
                          events.push(event);
                          resolve();
                        });
                      })
                    )
                  }
              });
          }
          if (promises.length) Promise.all(promises).then(() => {
            resolve(events);
          });
          else resolve(events);
        })

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
