const ipc = require('electron').ipcMain
const liner = require('line-by-line')
const fs = require('fs');
const filesize = require('filesize');
const dict = require('../assets/data/dictionnary.json');

let lr = null;
let result = null;
let perct = 0;
let participants = 0;
let size = 0;
let stats = null;
let total = null;
let duration = 0;
const model = /"(\d*?)-(\d*?)\.(\d*?)"[\t ]*,?[\t ]*/g;

ipc.on('files-received', function (event, arg) {

    if (lr !== null)
        return;

    if (fs.existsSync(arg) === false)
        return;

    perct = 0;
    participants = -1;
    size = 0;
    stats = fs.statSync(arg);
    total = stats.size;
    duration = new Date().getTime();

    lr = new liner(arg);
    lr.on('error', function (err) {
        event.sender.send('files-scan-error', {
            error: err
        })
    });

    lr.on('line', function (line) {
        if (++participants === 0)
            processTraits(line);
        size += line.length;
        if (perct - (size * 100 / total) < 0) {
            perct++;
            event.sender.send('files-scan-progress', {
                progress: perct
            })
        }
    });

    lr.on('end', function () {
        event.sender.send('files-scan-progress', {
            traits: result.traits,
            fields: result.fields,
            distinct: result.distinct,
            filesize: filesize(total, { output: "array" }),
            duration: toNow(),
            participants
        })
        delete lr;
        lr = null;
        deepProcessing(arg)
    });
})

const toNow = function () {
    let laps = new Date().getTime() - duration;
    if (laps < 1000)
        return laps + 'ms'
    let sec = Math.floor(laps / 1000);
    if (sec < 60)
        return sec + 's'
    let min = Math.floor(sec / 60)
    if (min < 60)
        return min + 'm ' + (sec - min * 60) > 0 ? (sec - min * 60) + 's' : ''
    let hrs = Math.floor(min / 60)
    return hrs + 'h ' + (min - hrs * 60) > 0 ? (min - hrs * 60) + 'm' : ''
}

const deepProcessing = function (arg) {
    console.log('Further background processing ...\n')
}

function processTraits(line) {

    let obj = {}
    let match = null;
    let distinct = 0;
    while (match = model.exec(line)) {
        obj[match[1]] = obj[match[1]] || [];
        obj[match[1]][match[2]] = match[3];
        distinct++;
    }

    result = {
        traits: {},
        fields: [],
        distinct
    }

    let stop = dict.ids.fields.length;
    let cursor = -1;
    while (++cursor < stop) {
        if (obj[`${dict.ids.fields[cursor]}`] !== undefined) {
            result.traits[`${dict.ids.fields[cursor]}`] = dict.names.fields[cursor];
            result.fields[`${dict.ids.fields[cursor]}`] = obj[dict.ids.fields[cursor]].length;
        }
    }

    return result;
}

ipc.on('extract-field-search', function (event, arg) {

    const model = new RegExp(arg.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").split(' ').filter((v) => v.length > 0).join('|'), 'ig');
    const temp = {}
    const keys = Object.keys(result.traits)
    keys.map(function (value, index) {
        if (model.test(value) === true) {
            temp[value] = result.traits[value]
        }
    })
    Object.values(result.traits).map(function (value, index) {
        if (model.test(value) === true) {
            temp[keys[index]] = value
        }
    })
    event.sender.send('extract-field-result', {
        results: temp
    })
})
