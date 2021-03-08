const puppeteer = require('puppeteer');
const Xvfb      = require('xvfb');
const os = require('os');
const platform = os.platform();
const { playbackFile } = require('./env');
const child_process = require('child_process');
var disp_num = Math.floor(Math.random() * (200 - 99) + 99);
var xvfb        = new Xvfb({
    displayNum: disp_num,
    silent: true,
    xvfb_args: ["-screen", "0", "1280x800x24", "-ac", "-nolisten", "tcp", "-dpi", "96", "+extension", "RANDR"]
});
var width       = 1280;
var height      = 800;
var screen_size = width + 'x' + height
var options     = {
  headless: false,
  args: [
    '--enable-usermedia-screen-capturing',
    '--allow-http-screen-capture',
    '--auto-select-desktop-capture-source=bbbrecorder',
    '--load-extension=' + __dirname,
    '--disable-extensions-except=' + __dirname,
    '--disable-infobars',
    '--no-sandbox',
    '--shm-size=1gb',
    '--disable-dev-shm-usage',
    '--start-fullscreen',
    '--app=https://www.google.com/',
    `--window-size=${width},${height}`,
  ],
}

if(platform == "linux"){
    options.executablePath = "/usr/bin/google-chrome"
}else if(platform == "darwin"){
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
}

async function main() {
    let browser, page;

    try{
        if(platform == "linux"){
            xvfb.startSync()
        }

        var url = process.argv[2];
        if(!url){
            console.warn('URL undefined!');
            process.exit(1);
        }
        // Verify if recording URL has the correct format
        var urlRegex = new RegExp('^https?:\\/\\/.*\\/playback\\/presentation\\/2\\.0\\/' + playbackFile + '\\?meetingId=[a-z0-9]{40}-[0-9]{13}');
        if(!urlRegex.test(url)){
            console.warn('Invalid recording URL!');
            console.warn(url)
            process.exit(1);
        }

        var exportname = url.split("=")[1]
        var duration = 0
        // If duration isn't defined, set it in 0
        if(!duration){
            duration = 0;
        // Check if duration is a natural number
        }else if(!Number.isInteger(Number(duration)) || duration < 0){
            console.warn('Duration must be a natural number!');
            process.exit(1);
        }

        var convert = process.argv[5]
        if(!convert){
            convert = false
        }else if(convert !== "true" && convert !== "false"){
            console.warn("Invalid convert value!");
            process.exit(1);
        }

        browser = await puppeteer.launch(options)
        const pages = await browser.pages()

        page = pages[0]

        page.on('console', msg => {
            var m = msg.text();
            console.log('PAGE LOG:', m) // uncomment if you need
        });

        await page._client.send('Emulation.clearDeviceMetricsOverride')
        // Catch URL unreachable error
        await page.goto(url, {waitUntil: 'networkidle2'}).catch(e => {
            console.error('Recording URL unreachable!');
            process.exit(2);
        })
        await page.setBypassCSP(true)

        // Check if recording exists (search "Recording not found" message)
        var loadMsg = await page.evaluate(() => {
            return document.getElementById("load-msg").textContent;
        });
        if(loadMsg == "Recording not found"){
            console.warn("Recording not found!");
            process.exit(1);
        }

        // Get recording duration
        var recDuration = await page.evaluate(() => {
            return document.getElementById("video").duration;
        });
        // If duration was set to 0 or is greater than recDuration, use recDuration value
        if(duration == 0 || duration > recDuration){
            duration = recDuration;
        }

        await page.waitForSelector('button[class=acorn-play-button]');
        await page.$eval('#navbar', element => element.style.display = "none");
        await page.$eval('#copyright', element => element.style.display = "none");
        await page.$eval('.acorn-controls', element => element.style.opacity = "0");
        await page.click('button[class=acorn-play-button]', {waitUntil: 'domcontentloaded'});
        console.log(duration)
        console.log(exportname)

        //  Start capturing screen with ffmpeg
        const ls = child_process.spawn('sh',
                ['ffmpeg_cmd.sh',' ',
                `${duration}`,' ',
                `${exportname}`,' ', 
                `${disp_num}`                     
                ],
                {
                    shell: true
                }
                );
        
        ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
    
        ls.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
    
        ls.on('close', (code) => {
            console.log(`child process exited with code ${code}`);});

            await page.waitFor((duration * 1000))


    }catch(err) {
        console.log(err)
    } finally {
        page.close && await page.close()
        browser.close && await browser.close()

        if(platform == "linux"){
            xvfb.stopSync()
        }
    }
}

main()
