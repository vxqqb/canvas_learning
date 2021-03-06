var stringify = (date) => {
    let H = date.getHours()
    let M = date.getMinutes()
    let S = date.getSeconds()
    let ss = date % 1000
    return `${H}:${M}:${S}.${ss}`
}
var initStart = 1538928000000
var initEnd = 1539014400000 - 1
var initDiff = initEnd - initStart

const TIME_LINE_COUNT = 1000
const HIGH_LIGHT_TIME_LINE_COUNT = 100
var highlightStart = 1538979180000 // Mon Oct 08 2018 14:13:00 GMT+0800 (中国标准时间)
var times = Array.from({length: TIME_LINE_COUNT}).map(() => {
    return parseInt(Math.random() * initDiff) + initStart
})
times.sort((a, b) => {
    return a - b
})
var highLightTimes = times.reduce((acc, current) => {
    if (acc.length < HIGH_LIGHT_TIME_LINE_COUNT && current > highlightStart) {
        return acc.concat(current)
    } else {
        return acc
    }
}, [])


var barHeight = canvas.height
var barWidth = 100 * ratio
var timeBoundStart = initStart
var timeBoundEnd = initEnd
var timeTextWidth = 50 * ratio
var timeLineRatio = 1.1
var TIME_SCALE_STEP = 0.1 // 单步缩放比例
var mouseDown = false
var mouseLastMovePoint
const TIMELINE_SECTION_COUNT = 5 // 整条bar分5段里抽取timeline展示时间刻度
const BLACK = '#000'
const GREY = '#bfbfbf'
const RED = '#ff4d4f'
const BLUE = '#1890ff'
var $tooltip = document.getElementById('tooltip')

document.addEventListener('mousewheel', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target.id === 'can') {
        if (e.wheelDelta > 0) {
            augment(e.offsetY)
        } else {
            // 还能缩，否则停止reduce，减少不必要的redraw
            if (timeBoundStart > initStart || timeBoundEnd < initEnd) {
                reduce(e.offsetY)
            }
        }
    }
})
document.addEventListener('mousedown', (e) => {
    if (e.target.id === 'can') {
        mouseDown = true
        mouseLastMovePoint = {
            x: e.offsetX,
            y: e.offsetY
        }
    }
})
document.addEventListener('mousemove', (e) => {
    if (e.target.id === 'can') {
        let relatedTime = _calculateChangePointTime(e.offsetY)
        clearCanvas()
        showToolTip(e.offsetY)
        draw()
        if (mouseDown) {
            let yDiff = e.offsetY - mouseLastMovePoint.y
            // 还没有滑到头的话触发redraw
            if (yDiff > 0 && timeBoundStart > initStart) {
                move(-yDiff)
            } else if (yDiff < 0 && timeBoundEnd < initEnd) {
                move(-yDiff)
            }
            mouseLastMovePoint = {
                x: e.offsetX,
                y: e.offsetY
            }
        }
    } else {
        mouseDown = false
    }
})
document.addEventListener('mouseup', (e) => {
    mouseDown = false
})
document.addEventListener('mouseover', (e) => {
    if (e.target.id === 'can') {
        // console.log('y' + e.offsetY)
    }
})

// NOTE: canvas.style.height需要比MOUSE_TOLERENCE大
function getMouseHoveredTime (offsetY) {
    const MOUSE_TOLERENCE = 1 // 上下5像素容错范围
    let acceptableHead = _calculateChangePointTime(Math.max(offsetY, MOUSE_TOLERENCE) - MOUSE_TOLERENCE)
    let acceptableBottom = _calculateChangePointTime(Math.min(offsetY, parseInt(canvas.style.height) - MOUSE_TOLERENCE) + MOUSE_TOLERENCE)
    let acceptableTimes = times.filter((time) => {
        return acceptableHead <= time && time <= acceptableBottom
    })
    return acceptableTimes[0] // 只挑在容错范围内的第一条
}

draw()
function move(cssMove) {
    clearCanvas()
    modiTimeBoundsByMove(cssMove)
    console.warn('redraw')
    draw()
}
function _calculateChangePointTime(offsetY) {
    // 计算放大点对应的时间值
    let cssRatio = offsetY / parseInt(canvas.style.height)
    let timeTotalDiff = timeBoundEnd - timeBoundStart
    let timeDiff = timeTotalDiff * cssRatio
    let changePointTime = parseInt(timeDiff + timeBoundStart)
    return changePointTime
}
function augment(offsetY) {
    let changePointTime = _calculateChangePointTime(offsetY)
    // 计算新的时间窗
    let originBoundStart = timeBoundStart
    let originBoundEnd = timeBoundEnd
    let newBoundStart = parseInt((TIME_SCALE_STEP * changePointTime + originBoundStart) / (1 + TIME_SCALE_STEP))
    let newBoundEnd = parseInt((TIME_SCALE_STEP * changePointTime + originBoundEnd) / (1 + TIME_SCALE_STEP))
    var visibleTimeLines = times.filter((ctime) => {
        return ctime >= newBoundStart && ctime <= newBoundEnd
    })
    // 确保新时间窗里还有时间条再绘制
    if (visibleTimeLines.length > 0) {
        clearCanvas()
        timeBoundStart = newBoundStart
        timeBoundEnd = newBoundEnd
        console.warn('redraw')
        draw()
    }
}
function reduce(offsetY) {
    let changePointTime = _calculateChangePointTime(offsetY)
    // 计算新的时间窗
    let originBoundStart = timeBoundStart
    let originBoundEnd = timeBoundEnd
    let newBoundStart = (1 + TIME_SCALE_STEP) * originBoundStart - TIME_SCALE_STEP * changePointTime
    let newBoundEnd = (1 + TIME_SCALE_STEP) * originBoundEnd - TIME_SCALE_STEP * changePointTime
    // 确保新时间窗还在总范围内再绘制，否则无需
    if (newBoundStart < initStart) {
        newBoundStart = initStart
    }
    if (newBoundEnd > initEnd) {
        newBoundEnd = initEnd
    }
    clearCanvas()
    timeBoundStart = newBoundStart
    timeBoundEnd = newBoundEnd
    console.warn('redraw')
    draw()
}
function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height)
}

/**
 * 
 * @param {Int} cssMove 可正负，正表示图片整体向上移动，负反之
 */
function modiTimeBoundsByMove(cssMove) {
    let timeDiff = timeBoundEnd - timeBoundStart
    let cssDiff = parseInt(canvas.style.height)
    let timeMove = parseInt(timeDiff * cssMove / cssDiff)
    if (Math.abs(timeMove) < 1 ) {
        timeMove = cssMove < 0 ? -1 : 1 // 如果timeMove已经很小了，那么最小1毫秒步进
    }
    // 判断移动后的时间没有超过头尾限制
    let newTimeBoundStart = timeBoundStart + timeMove
    let newTimeBoundEnd = timeBoundEnd + timeMove
    if (newTimeBoundStart < initStart) {
        timeBoundStart = initStart
        timeBoundEnd = initStart + timeDiff
    } else if (newTimeBoundEnd > initEnd) {
        timeBoundEnd = initEnd
        timeBoundStart = initEnd - timeDiff
    } else {
        timeBoundStart = timeBoundStart + timeMove
        timeBoundEnd = timeBoundEnd + timeMove
    }
}

function drawTimeLine(width, height, color) {
    drawLine({ x: timeTextWidth, y: height }, { x: timeTextWidth + width, y: height }, color)
}

function drawLine(startPoint, endPoint, color) {
    context.strokeStyle = color || GREY
    context.beginPath()
    context.moveTo(startPoint.x, startPoint.y)
    context.lineTo(endPoint.x, endPoint.y)
    context.stroke()
}

function drawText(text, width, height) {
    context.fillStyle = BLACK
    context.font = '20px serif'
    context.fillText(text, width, height)
}

function drawBoldLine (startPoint, width, height, color) {
    context.fillStyle = color || BLUE
    context.fillRect(startPoint.x, startPoint.y, width, height)
}

function draw() {
    drawLine({ x: timeTextWidth, y: 0 }, { x: timeTextWidth, y: barHeight })
    var dif = timeBoundEnd - timeBoundStart
    // 滤出需要标时间刻度的timeline，在bar的第2，3，4段里分别取一条timeline展示时间刻度
    let timesNeedStamp
    if (dif > TIMELINE_SECTION_COUNT) {
        let timeSectionHeads = Array.from({length: TIMELINE_SECTION_COUNT}).map((noneed, i) => {
            return timeBoundStart + i * (dif / TIMELINE_SECTION_COUNT)
        }) // 获取5段头的time值
        timesNeedStamp = times.reduce((acc, current) => {
            if (acc.length < TIMELINE_SECTION_COUNT - 1) {
                if (current > timeSectionHeads[acc.length + 1]) {
                    return acc.concat(current)
                } else {
                    return acc
                }
            } else {
                return acc
            }
        }, [])
    }
    times.filter((ctime) => {
        return ctime >= timeBoundStart && ctime <= timeBoundEnd
    }).forEach(function(ctime) {
        let color = BLACK
        if (highLightTimes.indexOf(ctime) >= 0) {
            color = RED
        }
        drawTimeLine(50 * ratio, barHeight * ((ctime - timeBoundStart) / dif), color)
        if (timesNeedStamp.indexOf(ctime) >= 0) {
            drawText(stringify(new Date(ctime)), 0, barHeight * ((ctime - timeBoundStart) / dif) + (5 * ratio))
        }
    })
    drawText(stringify(new Date(timeBoundStart)), 0, 10 * ratio)
    drawText(stringify(new Date(timeBoundEnd)), 0, barHeight - (10 * ratio))
}

function showToolTip (offsetY) {
    var timeSelected = getMouseHoveredTime(offsetY)
    if (timeSelected) {
        // 标粗选中的timeline
        var dif = timeBoundEnd - timeBoundStart
        var toolTipY = ((timeSelected - timeBoundStart) / dif) * parseInt(canvas.style.height)
        drawBoldLine({
            x: timeTextWidth,
            y: toolTipY * ratio - 2 * ratio
        }, 50 * ratio, 8, BLUE)
        // 展示tooltip
        $tooltip.innerHTML = '时间: ' + stringify(new Date(timeSelected))
        $tooltip.style.display = 'block'
        $tooltip.style.top = toolTipY
    } else {
        $tooltip.style.display = 'none'
    }
}
