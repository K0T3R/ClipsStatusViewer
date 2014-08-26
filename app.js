var express = require('express'),
    http = require('http'),
    path = require('path'),
    bodyParser = require('body-parser'),
    app = express(),
    clipstatus = require('./clipstatus.js'),
    fs = require('fs');

var settingsFile = __dirname + '/settings.json';
var settingsData = fs.readFileSync(settingsFile);
var settings = JSON.parse(settingsData);

app.use(bodyParser());
app.set('views', __dirname + '/templates');
app.set('view engine', 'hjs');
app.use(require('less-middleware')(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));

app.post('/getClips', function (req, res, next) {
    console.info("-----------------");
    console.info("URL POST: /getClips");
    console.info("-----------------");
    console.log(req.body);
    var dirName = req.body.dirName;
    clipstatus.getClips(dirName, function (err, data) {
        if (err == null) {
            res.json(data);
        } else {
            res.send(200, err);
        }
    });
});

app.post('/getTime', function (req, res, next) {
    console.info("-----------------");
    console.info("URL POST: /getTime");
    console.info("-----------------");
    console.log(req.body);
    var dirName = req.body.dirName;
    res.json({
        time: clipstatus.getLastModifiedTime(dirName)
    });
});

app.get('/data', function (req, res, next) {
    console.info("-----------------");
    console.info("URL GET: /data");
    console.log(req.query);
    console.info("-----------------");
    var settings = JSON.parse(settingsData);
    clipstatus.findClipLocations(settings.root, res);
//    var files = clipstatus.findClipLocations(settings.root, res);
//    if (req.query.json) {
//        res.json(files);
//    } else {
//        res.render('list', {
//            partitions: files
//        });
//    }
});



app.get('/view', function (req, res, next) {
    console.info("-----------------");
    console.info("URL POST: /view");
    console.info("-----------------");
    var dirName = req.query.path;
    var partitionName = req.query.name;
    res.render('view', {
        dirName: dirName,
        partitionName: partitionName
    });
});

http.createServer(app).listen(settings.port, function () {
    console.log(
        '\nExpress server listening on port ' + settings.port
    );
});