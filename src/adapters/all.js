export class AllAdapters {
    adapt = (data) => ({
        infos: data[0],
        charts: data[1],
        events: {
            forthcoming: data[2],
            previous: data[3]
        },
        releases: data[4]
    })
}

export default AllAdapters;
