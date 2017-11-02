const ipc = require('electron').ipcRenderer

document.body.addEventListener('dragover', function (ev) {
    ev.preventDefault()
});

document.body.addEventListener('drop', function (ev) {

    if (ev === undefined || ev.dataTransfer === undefined)
        return;

    let files = ev.dataTransfer.files;
    if (files === undefined || files[0] === undefined)
        return;

    document.querySelector('#drop-modal').classList.add('is-shown');
    ipc.send('files-received', files[0].path);
    ev.preventDefault()
});

ipc.on('files-scan-error', function (event, arg) {
    console.error(arg);
})

ipc.on('files-scan-progress', function (event, arg) {

    if (arg.progress === undefined) {
        document.getElementById('drop-placeholder').classList.add('hidden');
        document.getElementById('drop-file-scan-participants').innerHTML = `${arg.participants}`;
        document.getElementById('drop-file-scan-instances').innerHTML = `${Math.max(...arg.fields)}`;
        document.getElementById('drop-file-scan-fields').innerHTML = `${arg.distinct}`;
        document.getElementById('drop-file-scan-traits').innerHTML = `${Object.keys(arg.traits).length}`;
        document.getElementById('drop-file-scan-filesize').innerHTML = `${arg.filesize[0]}<sup> ${arg.filesize[1]}</sup>`;
        document.getElementById('drop-fun-message').innerHTML = 'Gathering unicorns ...';
        document.getElementById('drop-start-description').innerHTML = 'You have selected a file ! Please wait a moment while we go through it looking for treasures. It you drop another file at this point, it will be ignore until the current on it dealt with.';
        document.getElementById('button-summary').click();
        document.querySelector('#drop-modal').classList.remove('is-shown');
        return;
    }

    if (arg.duration === undefined) {
        document.getElementById('drop-file-scan-duration').innerHTML = '--';
        document.getElementById('drop-stats-participants-status').innerHTML = `Number of subjects (${arg.progress}% accounted ...)`;
    } else {
        document.getElementById('drop-file-scan-duration').innerText = arg.duration;
        document.getElementById('drop-stats-participants-status').innerText = 'Number of subjects';
    }
    document.getElementById('drop-file-scan-progress').innerHTML = `${arg.progress}`;
    document.getElementById('drop-file-scan-participants').innerText = `${arg.participants}`;
})
