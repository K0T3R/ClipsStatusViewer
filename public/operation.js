function addXFilter(cfObj) {
    cfObj.filterFunction(function (d) {
        return (d.MaxX - d.MinX) / 2
    });
}

function addYFilter(cfObj) {
    cfObj.filterFunction(function (d) {
        return (d.MaxY - d.MinY) / 2
    });
}

function translatePoint(xy, pq, x, y) {
    var p = (x - xy.MinX) * (pq.MaxX - pq.MinX) / (xy.MaxX - xy.MinX) + pq.MinX;
    var q = (y - xy.MaxY) * (pq.MinY - pq.MaxY) / (xy.MaxY - xy.MinY) + pq.MinY;
    return {
        x: p,
        y: q
    };
}

function translateRect(xy, pq, xmin, ymin, xmax, ymax) {
    var minPQ = translatePoint(xy, pq, xmin, ymax);
    var maxPQ = translatePoint(xy, pq, xmax, ymin);
    return {
        MinX: minPQ.x,
        MinY: minPQ.y,
        MaxX: maxPQ.x,
        MaxY: maxPQ.y,
    };
}


function translateST(sourcePlane, targetPlane, sourceX, sourceY) {
    var xm = (targetPlane.MaxX - targetPlane.MinX) / (sourcePlane.MaxX - sourcePlane.MinX);
    var ym = (targetPlane.MaxY - targetPlane.MinY) / (sourcePlane.MinY - sourcePlane.MaxY);
    var targetX = ((sourceX - sourcePlane.MinX) * xm) + targetPlane.MinX;
    var targetY = ((sourceY - sourcePlane.MaxY) * ym) + targetPlane.MinY;
    return {
        x: targetX,
        y: targetY
    };
}

function translateTS(sourcePlane, targetPlane, targetX, targetY) {
    var xm = (sourcePlane.MaxX - sourcePlane.MinX) / (targetPlane.MaxX - targetPlane.MinX);
    var ym = (sourcePlane.MinY - sourcePlane.MaxY) / (targetPlane.MaxY - targetPlane.MinY);
    var sourceX = (xm * (targetX - targetPlane.MinX)) + sourcePlane.MinX;
    var sourceY = (ym * (targetY - targetPlane.MinY)) + sourcePlane.MaxY;
    return {
        x: sourceX,
        y: sourceY
    };
}

function translateRectST(sourcePlane, targetPlane, xmin, ymin, xmax, ymax) {
    var p1 = translateST(sourcePlane, targetPlane, xmin, ymin);
    var p2 = translateST(sourcePlane, targetPlane, xmax, ymax);
    return {
        MinX: p1.x,
        MinY: p2.y,
        MaxX: p2.x,
        MaxY: p1.y 
    }
}


function translateRectTS(sourcePlane, targetPlane, xmin, ymin, xmax, ymax) {
    var p1 = translateTS(sourcePlane, targetPlane, xmin, ymin);
    var p2 = translateTS(sourcePlane, targetPlane, xmax, ymax);
    return {
        MinX: p1.x,
        MinY: p2.y,
        MaxX: p2.x,
        MaxY: p1.y 
    }
}

function getRectWidth(rect){
    return (rect.MaxX - rect.MinX + 1);
}

function getRectHeight(rect){
    return (rect.MaxY - rect.MinY + 1);
}