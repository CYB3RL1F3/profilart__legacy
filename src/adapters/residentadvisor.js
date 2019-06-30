import Mapbox from "../lib/mapbox";

export class ResidentAdvisorAdapter {
  constructor() {
    this.mapbox = new Mapbox();
  }

  adapt = async (response, adapt) => {
    switch (adapt) {
      case "events":
        return await this.adaptEvents(response);
      case "charts":
        return this.adaptChart(response);
      case "infos":
        return this.adaptInfos(response);
      default:
        return response;
    }
  };

  adaptChart = ({ charts }) => {
    return charts.map(
      ({ track }) =>
        track[0] &&
        track[0].chartid && {
          id: `${track[0].chartid}`,
          date: `${track[0].chartdate}`,
          rank: `${track[0].rank}`,
          tracks: track.map(t => ({
            id: `${t.trackid}`,
            artist: `${t.artist}`,
            title: `${t.title}`,
            label: `${t.label}`,
            remix: `${t.mix}`,
            cover: `${t.cover}`,
            RA_link: `${t.tracklink}`
          }))
        }
    );
  };

  adaptEvent = async event => {
    const addr = event.address[0] || event.address;
    const location = await this.mapbox.getLocation(addr);
    const time = `${event.time}`.split(" - ");
    return {
      id: `${event.id}`,
      venueId: `${event.venueid}`,
      date: `${event.eventdate}`,
      country: `${event.countryname}`,
      area: `${event.areaname}`,
      areaId: `${event.areaId}`,
      title: `${event.venue}`,
      address: `${addr}`,
      location,
      lineup: `${event.lineup}`.split(", "),
      time: {
        begin: `${time[0]}`,
        end: `${time[1]}`
      },
      cost: `${event.cost}`,
      promoter: `${event.promoter}`,
      links: {
        event: `${event.eventlink}`,
        venue: `${event.venuelink}`
      },
      flyer: `${event.imagelisting}`
    };
  };

  adaptEvents = async response =>
    response.events instanceof Array
      ? await Promise.all(
          response.events[0].event.map(
            async event => await this.adaptEvent(event)
          )
        )
      : [];

  adaptInfos = response => {
    const data = response.artist[0];
    return {
      name: `${data.artistname}`,
      realname: `${data.realname}`,
      country: `${data.countryname}`,
      labels: `${data.labels}`.split(", "),
      website: `${data.website}`,
      RA: `${data.raprofile}`,
      facebook: `https://facebook.com/${data.facebook}`,
      twitter: `https://twitter.com/${data.twitter}`,
      discogs: `https://discogs.com/artist/${data.discogs}`,
      soundcloud: `https://soundcloud.com/${data.soundcloud}`,
      picture: `${data.profileimage}`,
      bio: {
        intro: this.clean(`${data.biointro}`),
        content: this.clean(`${data.bio}`)
      }
    };
  };

  clean = data => {
    data = data.replace(/\&amp\;/g, "&");
    return data;
  };
}

export default ResidentAdvisorAdapter;
