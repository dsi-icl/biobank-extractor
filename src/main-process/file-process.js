const ipc = require('electron').ipcMain
const liner = require('line-by-line')
const fs = require('fs');
const path = require('path');
const filesize = require('filesize');
const dict = require('../assets/data/dictionnary.json');

let lr = null;
let source = null;
let result = null;
let perct = 0;
let participants = 0;
let size = 0;
let stats = null;
let total = null;
let duration = 0;
let indexes = [];

ipc.on('files-received', function (event, arg) {

    if (lr !== null)
        return;

    source = arg
    if (fs.existsSync(source) === false)
        return;

    perct = 0;
    participants = -1;
    size = 0;
    stats = fs.statSync(source);
    total = stats.size;
    duration = new Date().getTime();

    lr = new liner(source);
    lr.on('error', function (err) {
        event.sender.send('files-scan-error', {
            error: err
        })
    });

    lr.on('line', function (line) {
        if (++participants === 0) {
            processTraits(line);
            event.sender.send('files-scan-progress', {
                traits: result.traits,
                fields: result.fields,
                distinct: result.distinct,
                filesize: filesize(total, { output: "array" }),
                source: source,
                participants
            })
        }
        size += line.length;
        if (perct - (size * 100 / total) < 0) {
            perct++;
            event.sender.send('files-scan-progress', {
                progress: perct,
                participants
            })
        }
    });

    lr.on('end', function () {
        event.sender.send('files-scan-progress', {
            progress: perct,
            duration: toHumanDuration(new Date().getTime() - duration),
            participants
        })
        delete lr;
        lr = null;
        deepProcessing(arg)
    });
})

const toHumanDuration = function (laps) {
    if (laps < 1000)
        return `${laps}ms`
    let sec = Math.floor(laps / 1000);
    if (sec < 60)
        return `${sec}s`
    let min = Math.floor(sec / 60)
    if (min < 60)
        return `${min}m${(sec - min * 60) > 0 ? (sec - min * 60) + 's' : ''}`
    let hrs = Math.floor(min / 60)
    return `${hrs}h${(min - hrs * 60) > 0 ? (min - hrs * 60) + 'm' : ''}`
}

const deepProcessing = function (arg) {
    // Do further background processing ...
}

function processTraits(line) {

    const model = /"(\d*?)-(\d*?)\.(\d*?)"[\t ]*,?[\t ]*/g;

    let obj = {}
    let match = null;
    let distinct = 0;
    indexes = ['eid'];
    while (match = model.exec(line)) {
        indexes.push(Number.parseInt(match[1]))
        obj[match[1]] = obj[match[1]] || [];
        obj[match[1]][match[2]] = match[3];
        distinct++;
    }

    result = {
        traits: {},
        categories: {},
        fields: [],
        distinct
    }

    let stop = dict.ids.fields.length;
    let cursor = -1;
    let cat_idx = -1;
    while (++cursor < stop) {
        if (obj[`${dict.ids.fields[cursor]}`] !== undefined) {
            result.traits[`${dict.ids.fields[cursor]}`] = dict.names.fields[cursor];
            cat_idx = dict.ids.categories.indexOf(dict.props.fields_category[cursor]);
            cat_step = dict.props.categories_level[cat_idx]
            result.categories[`${dict.props.fields_category[cursor]}`] = dict.names.categories[cat_idx];
            while (cat_idx >= 0) {
                if (dict.props.categories_level[cat_idx] < cat_step) {
                    result.categories[`${dict.ids.categories[cat_idx]}`] = dict.names.categories[cat_idx];
                    cat_step--;
                }
                cat_idx--;
            }
            result.fields[`${dict.ids.fields[cursor]}`] = obj[dict.ids.fields[cursor]].length;
        }
    }

    return result;
}

ipc.on('extract-field-search', function (event, arg) {

    const model = new RegExp(arg.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").split(' ').filter((v) => v.length > 0).join('|'), 'ig');
    const temp = {}
    let keys = Object.keys(result.traits)
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
    keys = Object.keys(result.categories)
    keys.map(function (value, index) {
        if (model.test(value) === true) {
            temp[value] = result.categories[value]
        }
    })
    Object.values(result.categories).map(function (value, index) {
        if (model.test(value) === true) {
            temp[keys[index]] = value
        }
    })
    event.sender.send('extract-field-result', {
        results: temp
    })
})

ipc.on('extract-validate', function (event, arg) {

    if (lr !== null) {
        lr.close()
        delete lr
    }

    let landscape = []
    let picks = [0]
    let pos = -1
    let step = -1

    for (id in arg) {
        id = Number.parseInt(id)
        if ((pos = dict.ids.categories.indexOf(id)) >= 0) {
            step = dict.props.categories_level[pos]
            do {
                dict.props.fields_category.every((element, index) => {
                    if (element === dict.ids.categories[pos]) {
                        landscape.push(dict.ids.fields[index])
                    }
                    return true;
                })
                pos++
            } while (pos < dict.props.categories_level.length && dict.props.categories_level[pos] != step)
        } else {
            landscape.push(id);
        }
    }

    indexes.every((element, index) => {
        if (landscape.includes(element)) {
            picks.push(index)
        }
        return true;
    })

    let destination = path.join(path.dirname(source), `${path.basename(source, '.csv')}_extract_${new Date().getTime()}.csv`);
    let writeStream = fs.createWriteStream(destination);

    lr = new liner(source);
    lr.on('error', function (err) {
        event.sender.send('files-extract-error', {
            error: err
        })
    });

    perct = 0;
    size = 0;
    duration = new Date().getTime()
    let cursor = -1;
    let current = [];
    const model = /(".*?"[\t ]*),?[\t ]*/g;

    lr.on('line', function (line) {
        if (size === 0) {
            event.sender.send('files-extract-progress', {
                fields: picks.length
            })
        }
        current = []
        cursor = -1
        while (match = model.exec(line)) {
            if (picks.includes(++cursor)) {
                current.push(match[1])
            }
        }
        writeStream.write(`${current.join(',')}\n`)
        size += line.length;
        if (perct - (size * 100 / total) < 0) {
            perct++;
            event.sender.send('files-extract-progress', {
                progress: perct,
                fields: picks.length,
                estimatedDuration: toHumanDuration((new Date().getTime() - duration) * (100 - perct)),
                filesize: filesize(writeStream.bytesWritten, { output: "array" }),
            })
            duration = new Date().getTime()
        }
    });

    lr.on('end', function () {
        writeStream.end();
        event.sender.send('files-extract-progress', {
            progress: 100,
            estimatedDuration: '0s',
            filesize: filesize(writeStream.bytesWritten, { output: "array" })
        })
        delete lr;
        lr = null;
    });
})
