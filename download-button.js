var url = new URL(window.location.href)
var mp4_url = url.origin + "/recording/" + url.pathname.split("/")[4] + ".mp4"

function if_url_exists(url, callback) {
    let request = new XMLHttpRequest;
    request.open('GET', url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.setRequestHeader('Accept', '*/*');
    request.onprogress = function(event) {
        let status = event.target.status;
        let statusFirstNumber = (status).toString()[0];
        switch (statusFirstNumber) {
            case '2':
                request.abort();
                return callback(true);
            default:
                request.abort();
                return callback(false);
        };
    };
    request.send('');
};

function dowload_button() {
    var element = document.getElementsByClassName("vjs-control-bar");
    var div = document.createElement("div");
    var a = document.createElement("a");
    var span = document.createElement("span")
    a.setAttribute("href", mp4_url)
    a.setAttribute("target", "_blank")
    a.style.cssText = "text-decoration: none;color: white;"
    div.classList = "vjs-remaining-time vjs-time-control vjs-control"
    a.appendChild(document.createTextNode("Download"))
    span.className = ""
    span.appendChild(a)
    div.appendChild(span)
    element[0].appendChild(div)
}

function check_mp4() {
    if_url_exists(mp4_url, function(exists) {
        console.log("MP4 present? :", exists);

        if (exists) {
            dowload_button()
            console.log("Added Download button ")
        }
    });
}

const checkElement = async selector => {
    while (document.querySelector(selector) === null) {
        await new Promise(resolve => requestAnimationFrame(resolve))
    }
    return document.querySelector(selector);
};
checkElement('.vjs-control-bar').then((selector) => {
    console.log(selector);
    console.log("Found \"vjs-control-bar\" \n Adding Download button..")
    check_mp4()
});