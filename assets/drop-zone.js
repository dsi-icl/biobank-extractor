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

    let message = null;
    if (arg.progress === undefined) {

        message = `${arg.participants}`;
        document.getElementById('drop-file-scan-participants').innerHTML = message;
        message = `${Math.max(...arg.fields)}`;
        document.getElementById('drop-file-scan-instances').innerHTML = message;
        message = `${arg.distinct}`;
        document.getElementById('drop-file-scan-fields').innerHTML = message;
        message = `${Object.keys(arg.traits).length}`;
        document.getElementById('drop-file-scan-traits').innerHTML = message;
        message = `${arg.filesize[0]}<sup> ${arg.filesize[1]}</sup>`;
        document.getElementById('drop-file-scan-filesize').innerHTML = message;
        document.getElementById('button-summary').click();
        document.querySelector('#drop-modal').classList.remove('is-shown');
        return;
    }

    message = `${arg.progress}`;
    document.getElementById('drop-placeholder').classList.add('hidden');
    document.getElementById('drop-file-scan-progress').innerHTML = message;
    document.getElementById('drop-start-description').innerHTML = 'You have selected a file ! Please wait a moment while we go through it looking for treasures. It you drop another file at this point, it will be ignore until the current on it dealt with.';
    if (arg.progress > 0)
        document.getElementById('drop-fun-message').innerHTML = 'Preparing the shuttle ...';
    if (arg.progress > 10)
        document.getElementById('drop-fun-message').innerHTML = 'Mowing the lawn ...';
    if (arg.progress > 20)
        document.getElementById('drop-fun-message').innerHTML = 'Gathering unicorns ...';
    if (arg.progress > 40)
        document.getElementById('drop-fun-message').innerHTML = 'Checking alignment of planets ...';
    if (arg.progress > 60)
        document.getElementById('drop-fun-message').innerHTML = 'Generating convincing entropy ...';
    if (arg.progress > 80)
        document.getElementById('drop-fun-message').innerHTML = 'Counting cosmic objects ...';
})
