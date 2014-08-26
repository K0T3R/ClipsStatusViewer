var path = require('path');
var fs = require('fs');
var fsWalk = require('fs-walk');
var Transform = require('stream').Transform,
    csv = require('csv-streamify'),
    numeral = require('numeral')();
var node_find_files = require("node-find-files");


//var findClipLocations = exports.findClipLocations = function (sourceDirectory) {
//    var directories = [];
//    sourceDirectory.forEach(function (d, i) {
//        fsWalk.dirsSync(d, function (basedir, filename, stat) {
//            if (fs.existsSync(basedir + "/" + filename + "/run/unassigned/bbox.dat") && fs.existsSync(basedir + "/" + filename + '/run/unassigned/clips_status.dat')) {
//                var ctime = Date.parse(fs.statSync(basedir + "/" + filename + "/run/unassigned/bbox.dat").mtime);
//                var mtime = Date.parse(fs.statSync(basedir + "/" + filename + "/run/unassigned/clips_status.dat").mtime);
//                directories.push({
//                    location: basedir + "/" + filename,
//                    name: filename,
//                    ctime: ctime,
//                    mtime: mtime
//                });
//            }
//        });
//    });
//    return directories;
//}


var findClipLocations = exports.findClipLocations = function (sourceDirectories, res) {
    console.log("------------");
    console.log(sourceDirectories);
    console.log("------------");
    var list = [];
    //    sourceDirectory.forEach(function (d) {
    //        findFiles(d, directories);
    //    });
    //return directories;
    findFiles(sourceDirectories, list, res)
}

var regex1 = /\/run\/unassigned\/clips_status.dat$/;

var findFiles = function (directories, list, res) {
    if (directories.length == 0) {
        res.json(
            list
        );
        return;
    }
    console.log("---------------------");
    console.log(directories);
    console.log("---------------------");
    var basedir = directories.pop() ;
    console.log("Using: " + basedir);
    var finder = new node_find_files({
        rootFolder: basedir,
        filterFunction: function (path, stat) {
            var result = path.search(regex1);
            return (result != -1);
        }
    });
    finder.on("match", function (strPath, stat) {
        var baseDir = strPath.replace(regex1, '');
        if (fs.existsSync(baseDir + "/run/unassigned/bbox.dat")) {
            var ctime = Date.parse(fs.statSync(baseDir + "/run/unassigned/bbox.dat").mtime);
            var mtime = Date.parse(stat.mtime);
            list.push({
                location: baseDir,
                name: baseDir,
                ctime: ctime,
                mtime: mtime
            });
        }
    });
    finder.on("complete", function () {
        findFiles(directories, list, res);
    });
    finder.on("patherror", function (err, strPath) {
        console.log("Error for Path " + strPath + " " + err)
    });
    finder.on("error", function (err) {
        console.log("Global Error " + err);
    });
    finder.startSearch();
}

//var findFiles = function (basedir, list) {
//    //console.log("Debug: Traverse " + basedir);
//    var fList = fs.readdirSync(basedir);    
//    fList.forEach(function (filename) {
//        try {
//          //  console.log("Debug: Check " + basedir + "/" + filename);
//            var fStat = fs.statSync(basedir + "/" + filename);
//            if (fStat.isDirectory()) {                
//                if (fs.existsSync(basedir + "/" + filename + "/run/unassigned/bbox.dat") && fs.existsSync(basedir + "/" + filename + '/run/unassigned/clips_status.dat')) {
//                    console.log("Debug: Source " + basedir + "/" + filename);
//                    var ctime = Date.parse(fs.statSync(basedir + "/" + filename + "/run/unassigned/bbox.dat").mtime);
//                    var mtime = Date.parse(fs.statSync(basedir + "/" + filename + "/run/unassigned/clips_status.dat").mtime);
//                    list.push({
//                        location: basedir + "/" + filename,
//                        name: filename,
//                        ctime: ctime,
//                        mtime: mtime
//                    });
//
//                }
//                findFiles(basedir + "/" + filename, list);
//            }
//        } catch (e) {
//            console.log("Error: " + basedir + "/" + filename);
//            console.log(e);
//        }
//    });
//}


var getLastModifiedTime = exports.getLastModifiedTime = function (directory) {
    var ctime = Date.parse(fs.statSync(directory + "/run/unassigned/bbox.dat").mtime);
    var mtime = Date.parse(fs.statSync(directory + "/run/unassigned/clips_status.dat").mtime);
    return {
        ctime: ctime,
        mtime: mtime
    }
}

var getClips = exports.getClips = function (directoryName, callback) {
    var bboxFile = directoryName + "/run/unassigned/bbox.dat";
    var clipsFile = directoryName + "/run/unassigned/clips_status.dat"
    if (fs.existsSync(bboxFile) && fs.existsSync(clipsFile)) {
        var bboxStream = fs.createReadStream(bboxFile);
        var clipStatusStream = fs.createReadStream(clipsFile);

        var clipsStatus = [];
        var bboxClips = {};

        var bBoxTransform = function (data, encoding, done) {
            try {
                var d = {};
                d.rect = data[1].split(":");
                bboxClips[data[0]] = d;
                done();
            } catch (e) {
                var err = "Error Processing bbox.dat, " + e;
                callback(err, null);
            }
        };

        var clipStatusTransform = function (data, encoding, done) {
            try {
                var rect = bboxClips[data[0]].rect;
                var clipStatus = {
                    Clip: data[0],
                    MinX: numeral.unformat(rect[0]),
                    MinY: numeral.unformat(rect[1]),
                    MaxX: numeral.unformat(rect[2]),
                    MaxY: numeral.unformat(rect[3]),
                    Status: data[1],
                    Error: data[2],
                    User: "",
                };
                if (data.length == 4) {
                    clipStatus.User = data[3];
                }
                clipsStatus.push(clipStatus);
                done();
            } catch (e) {
                console.warn("Clip Rect Not Found! " + data);
            }
        };

        var csvParser1 = csv({
            objectMode: true
        });

        var csvParser2 = csv({
            objectMode: true
        });


        var bboxParser = new Transform({
            objectMode: true
        });
        var clipStatusParser = new Transform({
            objectMode: true
        });

        bboxParser._transform = bBoxTransform;
        clipStatusParser._transform = clipStatusTransform;

        bboxStream.pipe(csvParser1).pipe(bboxParser);
        bboxStream.on('end', function () {
            clipStatusStream.pipe(csvParser2).pipe(clipStatusParser);
            clipStatusStream.on('end', function () {
                try {
                    var time = getLastModifiedTime(directoryName);
                    var rect = bboxClips['allclips'].rect;
                    var allClips = {
                        MinX: numeral.unformat(rect[0]),
                        MinY: numeral.unformat(rect[1]),
                        MaxX: numeral.unformat(rect[2]),
                        MaxY: numeral.unformat(rect[3]),
                    };
                    var result = {
                        allClips: allClips,
                        clipStatus: clipsStatus,
                        time: time
                    };
                    callback(null, result);
                } catch (e) {
                    callback("Layout Metadata Unavailable", null);
                }
            });
        });
    } else {
        callback("Unable to find files!", null);
    }

}
