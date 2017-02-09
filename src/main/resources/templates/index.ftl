<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
</head>
<body>
    <video id="main-video" autoplay muted="muted" style="width: 320px; height: 240; border: 1px solid black;"></video>
    <video id="remote_video" autoplay muted="muted" style="width: 160px; height: 120px; border: 1px solid black;"></video>
</body>
<script type="text/javascript" src="/js/vendor/adapter.js" ></script>
<script type="text/javascript" src="/js/vendor/janus.nojquery.js" ></script>
<script src="/js/vendor/closure-library/closure/goog/base.js"></script>
<script type="text/javascript" src="/js/janus-video.js" ></script>
<script>
    function main() {
        var janusConfig = {
            'janusServer': 'ws://192.168.33.10:8188/janus/',
            'janusServerSSL': null,
            "janusDebug": true,
            "httpsAvailable": true,
            "httpsUrl": null,
            "videoThumbnails": true,
            "joinUnmutedLimit": 3
        }
        var room = janus.video.makeRoom(janusConfig);
    }
    main();
</script>
</html>