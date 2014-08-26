var viewModel = {
    layout: ko.observable({}),
    viewPort: ko.observable({}),
    users: ko.observableArray([]),
    selectedUser: ko.observable(""),
    stats: {
        commited: ko.observable(0),
        locked: ko.observable(0),
        unassigned: ko.observable(0),
        totalClips: ko.observable(0),
        visibleClips: ko.observable(0),
    },
    currentClip: ko.observable({
        "Clip": "",
        "Status": "0",
        "Error": "",
        "User": ""
    })
};

var data_rect = {
    "MinX": 0,
    "MinY": 0,
    "MaxX": 0,
    "MaxY": 0
};

var data_time = 0;

var data_clips = crossfilter([]);