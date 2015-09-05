<?php
error_reporting(0);
header("Content-Type: text/javascript");
$tmpFile = "./ytmp";
$decodeFile = "./ytdecode";
function getContent($content) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (X11; Linux x86_64; rv:40.0) Gecko/20100101 Firefox/40.0");
    curl_setopt($ch, CURLOPT_URL, $content);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FILE, fopen("./ytmp", "w+"));
    $ret = curl_exec($ch);
    if(!$ret) {
        echo curl_error($ch);
        return false;
    }
    return true;
}
function searchInFile($regex,$file) {
    $handle = fopen($file, "r");
    if ($handle) {
        while (($line = fgets($handle)) !== false) {
            if(preg_match($regex, $line, $matches)){
                break;
            }
        }
        fclose($handle);
        return $matches;
    } else {
        return false;
    }    
}
if(!getContent("https://www.youtube.com/watch?v=jNQXAC9IVRw")) die();
$ythtml = file_get_contents("./ytmp");
preg_match('/ytplayer.config = {(.*?)};/',$ythtml,$match);
$ytconfig = json_decode('{'.$match[1].'}');
$js = $ytconfig->assets->js;
preg_match("/html5player-new-.*?-(.*?)\//", $js, $match);
$actual = file_get_contents($decodeFile);
if(preg_match("/".$match[1]."/",$actual)){
    echo $actual;
} else {
    $content =  "// ".$match[1]."\n";
    if(substr($js, 0, 2) === "//") {
        $js = "https:".$js;
    }
    if(!getContent($js)) die();
    $signatureCode = searchInFile("/\(.=(.*)\(.*\),.*=.*\(.*,\"\/signature\/\"\+.*\)\);/",$tmpFile);
    $signatureCode2 = searchInFile("/function ".str_replace("$",'\$',$signatureCode[1])."\((.*)\){(.*)};/",$tmpFile);
    preg_match("/(.*)=?(.*)\.(.*)\(.*,(.*)\)?;/", $signatureCode2[2],$signatureCode3);
    preg_match("/;(.*?)\..*\(.*\)/", $signatureCode3[1],$signatureCode4);
    $signatureCode5 = searchInFile("/var ".str_replace("$",'\$',$signatureCode4[1])."={(.*?)};f/",$tmpFile);
    $content .= "Vanilla.decodeYTHelper={".$signatureCode5[1]."};\n";
    $content .= "Vanilla.decodeYT = function(".$signatureCode2[1]."){".str_replace($signatureCode4[1],"Vanilla.decodeYTHelper",$signatureCode2[2])."};";
    file_put_contents($decodeFile, $content);
    echo $content;
}
file_put_contents($tmpFile, '');
?>