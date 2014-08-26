var targetRoi = {
    MinX: 0,
    MinY: 0,
    MaxX: 0,
    MaxY: 0
};

var miniMapRoi = {
    MinX: 0,
    MinY: 0,
    MaxX: 0,
    MaxY: 0
};

var currentLayoutRoi = {

};

var statusCodes = {
    "0": {
        label: 'Unassigned',
        color: '#FF0000'
    },
    "1": {
        label: 'Fetched',
        color: '#FFFF00'
    },
    "2": {
        label: 'Committed',
        color: '#00FF00'
    }
}

var pushStack = [];
var layoutWidth = 1;
var layoutHeight = 1;
var layoutAspectRatio = 1;
var actualTargetWidth = 1;
var actualTargetHeight = 1;
var miniMapWidth = 1;
var miniMapHeight = 1;
var miniMapSelection = null;


function calculateGeometry() {
    layoutWidth = (data_rect.MaxX - data_rect.MinX + 1);
    layoutHeight = (data_rect.MaxY - data_rect.MinY + 1);
    layoutAspectRatio = layoutWidth / layoutHeight;
}

function initData(path) {
    $('.loader').show();
    onLoadInit();
    $.ajax({
        url: '/getClips',
        type: "POST",
        data: {
            dirName: path
        },
        success: function (doc) {
            data_rect = doc.allClips,
            data_clips = crossfilter(doc.clipStatus),
            data_time = doc.time
            afterDataInit();
            $('.loader').hide();
        },
        error: function (xhr, status, error) {
            $('.content').empty();
            $('.content').append('<p>Error loading partition data :(</p>');
            $('.loader').hide();
        }
    });
}


function init() {
    $('.loader').show();
    onLoadInit();
    afterDataInit()
    $('.loader').hide();
}

function afterDataInit() {
    calculateGeometry();
    initTilesCanvas();
    initMiniMap();
    viewModel.selectedUser('*');
    populateUsers();
    currentLayoutRoi = jQuery.extend(true, {}, data_rect);
    viewModel.stats.totalClips(data_clips.size());
    viewModel.layout(currentLayoutRoi);
    viewModel.viewPort(currentLayoutRoi);
    updateMiniMap();
}

function onLoadInit() {
    $('#livepreview_dialog').hide();
    initFilters();
    initPieChart();
    applyBindings();
    resetFilters();
}

function initPieChart() {
    gradPie.draw("cutiepie", getPieData({
        "0": 1,
        "1": 1,
        "2": 1
    }), 140, 140, 120);
    $('#sweetiepie').hide();
}

function initFilters() {
    $('#lstStatus').selectator({
        selectFirstOptionOnSearch: false
    }).change(changeStatus);
    $("#lstUsers").selectator({
        selectFirstOptionOnSearch: false
    }).change(changeUser);
    $("#txtError").keyup(changeError);
}

var tilesStage = null;

function initTilesCanvas() {
    var maxTargetWidth = $('.content').width() - 400;
    var maxTargetHeight = $('.content').height() - 70;

    actualTargetHeight = maxTargetHeight;
    actualTargetWidth = maxTargetHeight * layoutAspectRatio;

    if (actualTargetWidth > maxTargetWidth) {
        actualTargetWidth = maxTargetWidth;
        actualTargetHeight = maxTargetWidth / layoutAspectRatio;
    }
    targetRoi.MaxX = actualTargetWidth - 1;
    targetRoi.MaxY = actualTargetHeight - 1;

    var jTiles = $('#tiles');
    jTiles.attr("width", +actualTargetWidth + "px");
    jTiles.attr("height", +actualTargetHeight + "px");

    $('#tiles').imgAreaSelect({
        handles: true,
        onSelectEnd: handleRegion,
        autoHide: true,
        aspectRatio: layoutWidth + ":" + layoutHeight
    });

    tilesStage = new createjs.Stage('tiles');
}

function initMiniMap() {
    var maxMiniMapWidth = 280;
    var maxMiniMapHeight = 280;
    miniMapWidth = maxMiniMapWidth;
    miniMapHeight = maxMiniMapWidth / layoutAspectRatio;
    if (miniMapHeight > maxMiniMapHeight) {
        miniMapWidth = maxMiniMapHeight * layoutAspectRatio;
        miniMapHeight = maxMiniMapHeight;
    }

    miniMapRoi.MaxX = miniMapWidth - 1;
    miniMapRoi.MaxY = miniMapHeight - 1;

    var jMiniMap = $('#miniMap');
    jMiniMap.attr("width", +miniMapWidth + "px");
    jMiniMap.attr("height", +miniMapHeight + "px");

    $('.info').scroll(function () {
        updateMiniMapRoi();
    });
}

function updateMiniMapRoi() {
    var miniMapRect = translateRectST(data_rect, miniMapRoi, currentLayoutRoi.MinX, currentLayoutRoi.MinY, currentLayoutRoi.MaxX, currentLayoutRoi.MaxY);
    $('#miniMap').imgAreaSelect({
        handles: true,
        x1: miniMapRect.MinX,
        y1: miniMapRect.MinY,
        x2: miniMapRect.MaxX + 1,
        y2: miniMapRect.MaxY + 1,
        onSelectEnd: handleMiniRegion,
        autoHide: false,
        aspectRatio: layoutWidth + ":" + layoutHeight
    });
}



function updateMiniMap() {
    var hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.setAttribute("id", "hiddenCanvas");
    //hiddenCanvas.setAttribute("style", "display:none");
    hiddenCanvas.setAttribute("width", actualTargetWidth + "px");
    hiddenCanvas.setAttribute("height", actualTargetHeight + "px");

    document.body.appendChild(hiddenCanvas);
    var hiddenCanvasStage = new createjs.Stage("hiddenCanvas");
    drawData(hiddenCanvasStage, null);
    var pngUrl = document.getElementById('hiddenCanvas').toDataURL();
    hiddenCanvas.parentElement.removeChild(hiddenCanvas);
    $('#miniMap').attr('src', pngUrl);
    updateMiniMapRoi();
}

function applyBindings() {
    ko.applyBindings(viewModel);
    viewModel.viewPort.subscribe(function (newValue) {
        currentLayoutRoi = newValue;
        drawData(tilesStage, drawPieChart);
    });
}

function populateUsers() {
    var data_users = data_clips.dimension(function (d) {
        return d.User;
    });
    var result = data_users.group().all();
    data_users.dispose();
    viewModel.users.removeAll();
    viewModel.users.push({
        key: "All Users",
        value: "*"
    });
    result.forEach(function (element, index) {
        if (element.key !== "") {
            viewModel.users.push({
                key: element.key,
                value: element.key
            });
        }
    });
}

function drawData(stage, next) {
    stage.autoClear = true;
    stage.removeAllEventListeners();
    stage.removeAllChildren();
    stage.clear();
    stage.update();
    stage.enableMouseOver(20);
    var bkShape = new createjs.Shape();
    bkShape.graphics.beginFill("#333333").drawRect(0, 0, targetRoi.MaxX + 1, targetRoi.MaxY + 1);
    var container2 = new createjs.Container();
    container2.x = 0;
    container2.y = 0;
    var d = getRectangles(currentLayoutRoi);
    d.result.forEach(function (element, index, array) {
        var tRect = translateRectST(currentLayoutRoi, targetRoi, element.MinX, element.MinY, element.MaxX, element.MaxY);
        var width = getRectWidth(tRect);
        var height = getRectHeight(tRect);
        var p = {
            x: (tRect.MaxX + tRect.MinX) / 2,
            y: (tRect.MaxY + tRect.MinY) / 2
        };
        if (width > 4 && height > 4) {
            var shape = new createjs.Shape();
            shape.alpha = 0.5;
            shape.graphics.beginStroke("#000").beginFill(statusCodes[element.Status].color).drawRect(tRect.MinX, tRect.MinY, width, height);
            shape.name = JSON.stringify({
                element: element,
                p: p
            });
            shape.addEventListener("mouseover", mouseOver);
            shape.addEventListener("mouseout", mouseOut);
            container2.addChild(shape);
        } else {
            bkShape.graphics.beginFill(statusCodes[element.Status].color).drawCircle(p.x, p.y, 2);
        }

    });
    stage.addChild(bkShape);
    stage.addChild(container2);
    stage.update();
    if (next != null) {
        next(d);
    }
}

function getPieData(obj) {
    var result = [];
    for (var k in statusCodes) {
        result.push({
            label: statusCodes[k].label,
            value: obj[k] || 0,
            color: statusCodes[k].color
        });
    }
    return result;
}


function drawPieChart(data) {
    if (data.result.length > 0) {
        $('#sweetiepie').show();
        gradPie.transition("cutiepie", getPieData(data.distribution), 100);
    } else {
        $('#sweetiepie').hide();
    }
}


function changeUser() {
    var val = $('#lstUsers').val();
    if (val != "*") {
        userFilter = function (d) {
            var value = val;
            return d.User == value;
        }
    } else {
        userFilter = allFilter;
    }
    drawData(tilesStage, drawPieChart);
}

function changeStatus() {
    var val = $('#lstStatus').val();
    if (val != "*") {

        statusFilter = function (d) {
            var value = val;
            return d.Status == value;
        }
    } else {
        statusFilter = allFilter;
    }
    drawData(tilesStage, drawPieChart);
}

var shown = false;

function changeError() {
    var val = $('#txtError').val();
    if (val != "") {
        errorFilter = function (d) {
            var value = val;
            return d.Error.indexOf(value) > -1;
        }
    } else {
        errorFilter = allFilter;
    }
    drawData(tilesStage, drawPieChart);
    if (!shown) {
        if (val === 'dog') {
            shown = true;
            $('.content').append(0, '<div id="cimage" title="Beagle It Is!"><img id="canvasimage" /></div>');
            $("#cimage").dialog({
                modal: true,
                minWidth: 360,
            });
        }
    }
}

var errorFilter;
var userFilter;
var statusFilter;

var allFilter = function (d) {
    return true;
}


function resetFilters() {
    errorFilter = allFilter;
    userFilter = allFilter;
    statusFilter = allFilter;
}

function getRectangles(layout) {
    updateMiniMapRoi();

    var boundsFilter = function (d) {
        var midX = (d.MaxX + d.MinX) / 2;
        var midY = (d.MaxY + d.MinY) / 2;
        return midX >= layout.MinX && midX < layout.MaxX && midY >= layout.MinY && midY < layout.MaxY;
    };

    var filterFunction = function (d) {
        return statusFilter(d) && userFilter(d) && errorFilter(d) && boundsFilter(d);
    };

    var fObj = data_clips.dimension(function (d) {
        return d;
    });

    var filterData = fObj.filterFunction(filterFunction);
    var result = filterData.top(data_clips.size());
    var distribution = {
        "0": 0,
        "1": 0,
        "2": 0
    };

    result.forEach(function (element, index) {
        distribution[element.Status] = distribution[element.Status] + 1;
    });
    
    viewModel.stats.commited(distribution["2"]);
    viewModel.stats.locked(distribution["1"]);
    viewModel.stats.unassigned(distribution["0"]);

    viewModel.stats.visibleClips(result.length);
    fObj.dispose();
    return {
        region: layout,
        result: result,
        distribution: distribution
    };
}

function handleRegion(img, selection) {
    console.log(selection);
    if (selection.height != 0 && selection.width != 0) {
        var newRegion = translateRectTS(currentLayoutRoi, targetRoi, selection.x1, selection.y1, selection.x2 - 1, selection.y2 - 1);
        viewModel.viewPort(
            newRegion
        );
    }
}

function handleMiniRegion(img, selection) {
    if (selection.height == 0 || selection.width == 0) {
        viewModel.viewPort(data_rect);
    } else {
        var newRegion = translateRectTS(data_rect, miniMapRoi, selection.x1, selection.y1, selection.x2 - 1, selection.y2 - 1);
        viewModel.viewPort(newRegion);
    }
}


function mouseOver(event) {
    console.log(event);
    $('#livepreview_dialog').show();
    var target = JSON.parse(event.currentTarget.name);
    viewModel.currentClip(target.element);
    var canvasPosition = $('#tiles').offset();
    var tilePosition = {
        top: -106 + 1 + canvasPosition.top + target.p.y,
        left: -306 - 23 + 1 + canvasPosition.left + target.p.x,
    }
    $('#livepreview_dialog').css(tilePosition);
}

function mouseOut(event) {
    $('#livepreview_dialog').hide();
}