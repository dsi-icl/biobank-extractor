const ipc = require('electron').ipcRenderer

const input = document.querySelector('#extract-search-input')
const dest = document.querySelector('#extract-results')
const list = document.querySelector('#extract-selection')
const validate = document.querySelector('#extract-validate')
let selection = {}

const inputAction = function (ev) {
    ev.preventDefault()
    list.classList.add('mute')
    if (input.value.length > 0)
        ipc.send('extract-field-search', input.value);
    else
        dest.innerHTML = ''
}

input.addEventListener('input', inputAction);
input.addEventListener('focus', inputAction);
document.body.addEventListener('click', function (ev) {
    ev.preventDefault()
    if (ev.target !== input) {
        dest.innerHTML = ''
        list.classList.remove('mute')
    }
})

ipc.on('files-extract-error', function (event, arg) {
    console.error(arg);
})

ipc.on('files-scan-progress', function (event, arg) {
    if (arg.progress === undefined) {
        selection = {}
        input.value = ''
        dest.innerHTML = ''
        list.innerHTML = ''
        list.classList.remove('mute')
    }
})

ipc.on('files-extract-progress', function (event, arg) {
    if (arg.progress === undefined) {
        document.getElementById('drop-placeholder').classList.add('hidden');
        document.getElementById('drop-start-description').innerHTML = 'We are working to extract the fields that you have selected to a new file. We are placing it in the same folder as your original for convenience!';
        return;
    }

    document.getElementById('drop-file-scan-progress').innerHTML = `${arg.progress}`;
    document.getElementById('drop-fun-message').innerHTML = `Needing ~${arg.estimatedDuration} extracting ${arg.fields} fields. Output is ${arg.filesize[0]} ${arg.filesize[1]}`;

    if (arg.fields === undefined) {
        document.querySelector('#drop-modal').classList.remove('is-shown');
    }
})

ipc.on('extract-field-result', function (event, arg) {

    dest.innerHTML = ''
    const model = new RegExp(`${input.value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&").split(' ').filter((v) => v.length > 0).join('|')}`, 'ig');
    let total = 0;
    let hidden = 0;

    for (id in arg.results) {
        if (total++ < 5) {
            let item = document.createElement('span')
            item.innerHTML = ''
            let pat = null;
            let pos = 0;
            while (pat = model.exec(id)) {
                item.innerHTML += id.substring(pos, pat.index) + '<em>' + pat[0] + '</em>'
                pos += (pat.index - pos) + pat[0].length
            }
            item.innerHTML += id.substring(pos) + ' : '
            pos = 0;
            let str = arg.results[id];
            while (pat = model.exec(str)) {
                item.innerHTML += str.substring(pos, pat.index) + '<em>' + pat[0] + '</em>'
                pos += (pat.index - pos) + pat[0].length
            }
            item.innerHTML += str.substring(pos)
            item.setAttribute('data-id', id);
            item.setAttribute('data-name', arg.results[id]);
            item.addEventListener('click', function () {
                input.value = ''
                dest.innerHTML = ''
                addResultSelection.apply(this)
            })
            dest.appendChild(item)
        } else {
            hidden++
        }
    }

    if (hidden > 0) {
        item = document.createElement('span')
        item.classList.add('more');
        item.innerHTML = '... and ' + hidden + ' more'
        dest.appendChild(item)
    }
})

const addResultSelection = function () {
    selection[this.getAttribute('data-id')] = this.getAttribute('data-name')
    drawResultSelection()
}

const drawResultSelection = function () {
    list.innerHTML = ''
    for (id in selection) {
        let item = document.createElement('span')
        let del = document.createElement('span')
        del.innerHTML = '<svg><use xlink:href="assets/img/icons.svg#icon-bin"></use></svg>'
        del.classList.add('delete')
        del.setAttribute('data-id', id);
        del.addEventListener('click', function () {
            delete selection[this.getAttribute('data-id')];
            drawResultSelection();
        })
        item.innerText = id + ' : ' + selection[id]
        item.appendChild(del);
        list.appendChild(item);
    }
}

validate.addEventListener('click', function (ev) {
    document.querySelector('#drop-modal').classList.add('is-shown');
    ipc.send('extract-validate', selection);
    ev.preventDefault()
})
