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
const model = /"(\d*?)-(\d*?)\.(\d*?)"[\t ]*,?[\t ]*/g;

ipc.on('files-received', function (event, arg) {

    if (lr !== null)
        return;

    perct = 0;
    participants = -1;
    size = 0;
    stats = fs.statSync(arg);
    total = stats.size;

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
            participants
        })
        delete lr;
        lr = null;
    });
})

function processTraits(line) {

    let obj = [];
    let match = null;
    let distinct = 0;
    while (match = model.exec(line)) {
        obj[match[1]] = obj[match[1]] || [];
        obj[match[1]][match[2]] = match[3];
        distinct++;
    }

    result = {
        traits: [],
        fields: [],
        distinct
    }

    let stop = dict.ids.fields.length;
    let cursor = -1;
    while (++cursor < stop) {
        if (obj[dict.ids.fields[cursor]] !== undefined) {
            result.traits[dict.ids.fields[cursor]] = dict.names.fields[cursor];
            result.fields[dict.ids.fields[cursor]] = obj[dict.ids.fields[cursor]].length;
        }
    }

    return result;
}
